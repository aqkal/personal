"use client";

import { useFrame, useStore, useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import type * as THREE from "three";
import { gpuTimingEnabled, perfEnabled, perfStats } from "./perf";

type TimerExt = { TIME_ELAPSED_EXT: number; GPU_DISJOINT_EXT: number };

/**
 * Draws nothing. Wraps the renderer to time what it actually does, because
 * sampling around the loop cannot separate CPU submission, the shadow pass and
 * GPU time from each other. Results go into a plain module object so the DOM
 * overlay polls instead of re-rendering per frame.
 */
export function PerfProbe({
  tier,
  shadowSize,
  suspended,
}: {
  tier: number;
  shadowSize: number;
  suspended: boolean;
}) {
  const store = useStore();
  const dpr = useThree((s) => s.viewport.dpr);

  const acc = useRef({ drawMs: 0, shadowMs: 0, shadowCalls: 0 });
  const frameStart = useRef(0);
  const renderEnd = useRef(0);
  const frames = useRef(0);
  const lastSecond = useRef(0);
  const lastFrame = useRef(0);
  const gpuFrame = useRef(0);
  const gpu = useRef<{
    ctx: WebGL2RenderingContext | null;
    ext: TimerExt | null;
    active: WebGLQuery | null;
    pending: WebGLQuery[];
    pool: WebGLQuery[];
  }>({ ctx: null, ext: null, active: null, pending: [], pool: [] });

  useEffect(() => {
    // Reset only for an actual canvas suspension. Slow rendered frames remain
    // in the FPS window, so the readout still reports genuine stalls.
    lastFrame.current = lastSecond.current = renderEnd.current = frames.current = 0;
    perfStats.fps = perfStats.frameMs = perfStats.outsideMs = 0;
  }, [suspended]);

  useEffect(() => {
    perfStats.tier = tier;
    perfStats.shadowSize = shadowSize;
  }, [tier, shadowSize]);

  useEffect(() => {
    perfStats.dpr = dpr;
  }, [dpr]);

  useEffect(() => {
    if (!perfEnabled()) return;
    const renderer = store.getState().gl as THREE.WebGLRenderer;
    const info = renderer.info;
    const shadowMap = renderer.shadowMap;
    const originalRender = renderer.render;
    const originalShadowRender = shadowMap.render;
    const realRender = originalRender.bind(renderer);
    const realShadowRender = originalShadowRender.bind(shadowMap);

    // Accumulate submissions and the shadow pass, then read them before the
    // next frame starts. Ordinary visits leave renderer instrumentation off.
    const wasAutoReset = info.autoReset;
    info.autoReset = false;

    shadowMap.render = ((...args: Parameters<typeof realShadowRender>) => {
      const before = info.render.calls;
      const t = performance.now();
      realShadowRender(...args);
      acc.current.shadowMs += performance.now() - t;
      acc.current.shadowCalls += info.render.calls - before;
    }) as typeof shadowMap.render;

    renderer.render = ((...args: Parameters<typeof realRender>) => {
      const t = performance.now();
      if (acc.current.drawMs === 0) perfStats.cbMs = t - frameStart.current;
      const g = gpu.current;
      // An odd interval samples both halves of the alternating shadow cadence.
      const measure = g.ctx && g.ext && g.pending.length < 4 && gpuFrame.current++ % 31 === 0;
      const query = measure ? g.pool.pop() ?? g.ctx!.createQuery() : null;
      if (query) {
        g.ctx!.beginQuery(g.ext!.TIME_ELAPSED_EXT, query);
        g.active = query;
      }
      try {
        realRender(...args);
      } finally {
        if (query) {
          // End in the same submission. A query spanning two animation frames
          // also measures the gap before the next frame and can distort results.
          g.ctx!.endQuery(g.ext!.TIME_ELAPSED_EXT);
          g.pending.push(query);
          g.active = null;
        }
        renderEnd.current = performance.now();
        acc.current.drawMs += renderEnd.current - t;
      }
    }) as typeof renderer.render;

    return () => {
      renderer.render = originalRender;
      shadowMap.render = originalShadowRender;
      info.autoReset = wasAutoReset;
    };
  }, [store]);

  useEffect(() => {
    if (!gpuTimingEnabled()) return;
    const ctx = store.getState().gl.getContext() as WebGL2RenderingContext;
    const g = gpu.current;
    g.ctx = ctx;
    g.ext = ctx.getExtension("EXT_disjoint_timer_query_webgl2") as TimerExt | null;
    perfStats.gpuTimer = !!g.ext;
    return () => {
      if (g.active && g.ext) {
        ctx.endQuery(g.ext.TIME_ELAPSED_EXT);
        ctx.deleteQuery(g.active);
      }
      for (const q of [...g.pending, ...g.pool]) ctx.deleteQuery(q);
      g.active = null;
      g.pending = [];
      g.pool = [];
      g.ext = null;
      g.ctx = null;
      perfStats.gpuTimer = false;
    };
  }, [store]);

  useFrame(() => {
    if (!perfEnabled()) return;

    const now = performance.now();
    frameStart.current = now;
    const frameMs = lastFrame.current ? now - lastFrame.current : 0;
    perfStats.outsideMs = renderEnd.current ? now - renderEnd.current : 0;
    if (frameMs > 0) perfStats.frameMs = frameMs;
    if (!lastSecond.current) {
      lastSecond.current = now;
      frames.current = 0;
    }

    const info = store.getState().gl.info;
    if (!info.autoReset) {
      perfStats.calls = info.render.calls;
      perfStats.triangles = info.render.triangles;
      perfStats.drawMs = acc.current.drawMs;
      perfStats.shadowMs = acc.current.shadowMs;
      perfStats.shadowCalls = acc.current.shadowCalls;
      perfStats.programs = info.programs?.length ?? 0;
      perfStats.textures = info.memory.textures;
      perfStats.geometries = info.memory.geometries;
      info.reset();
      acc.current.drawMs = 0;
      acc.current.shadowMs = 0;
      acc.current.shadowCalls = 0;
    }
    lastFrame.current = now;
    frames.current += 1;
    if (now - lastSecond.current >= 500) {
      perfStats.fps = Math.round(
        (frames.current * 1000) / (now - lastSecond.current),
      );
      frames.current = 0;
      lastSecond.current = now;
    }

    const g = gpu.current;
    const { ctx, ext } = g;
    if (!ctx || !ext) return;

    if (!g.pending.length) return;
    if (ctx.getParameter(ext.GPU_DISJOINT_EXT)) {
      // every in-flight result is garbage after a disjoint
      perfStats.gpuMs = 0;
      g.pool.push(...g.pending);
      g.pending.length = 0;
    } else {
      while (g.pending.length) {
        const q = g.pending[0];
        if (!ctx.getQueryParameter(q, ctx.QUERY_RESULT_AVAILABLE)) break;
        perfStats.gpuMs = ctx.getQueryParameter(q, ctx.QUERY_RESULT) / 1e6;
        g.pending.shift();
        g.pool.push(q);
      }
    }
  }, -100);

  return null;
}
