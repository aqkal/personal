import { readFileSync, writeFileSync, unlinkSync, existsSync } from 'node:fs';
import ts from 'typescript';

const files = ['public/__audio-review.html', 'public/__audio-review.js'];
if (process.argv.includes('--clean')) {
  for (const file of files) if (existsSync(file)) unlinkSync(file);
} else {
  const modules = ['audio-music', 'audio-effects'].map(name => ts.transpileModule(readFileSync(`src/game3d/${name}.ts`, 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 } }).outputText).join('\n');
  const review = `
const results = document.querySelector('pre');
document.querySelector('button').onclick = async () => {
  results.textContent = 'Rendering score, ambience and skid layers...';
  try {
    const reports = [];
    const renderSkid = async (vehicle) => {
      const c = new OfflineAudioContext(2, 48000 * 3, 48000);
      const fxBus = c.createGain(); fxBus.gain.value = .8; fxBus.connect(c.destination);
      const ambientBus = c.createGain(); ambientBus.gain.value = 0; ambientBus.connect(c.destination);
      let at = .2;
      const timed = new Proxy(c, { get(target, key) { if (key === 'currentTime') return at; const value = Reflect.get(target, key, target); return typeof value === 'function' ? value.bind(target) : value; } });
      const fx = createCampusEffects(timed, fxBus, ambientBus);
      fx.update({ fountain:0, water:0, birds:0, construction:0, speed:.92, drift:.84, drifting:true, vehicle });
      at = 1.15; fx.update({ fountain:0, water:0, birds:0, construction:0, speed:.35, drift:0, drifting:false, vehicle });
      const buffer = await c.startRendering();
      const rmsWindow = (from, to) => {
        let sum = 0; let count = 0;
        const start = Math.floor(from * c.sampleRate); const end = Math.floor(to * c.sampleRate);
        for (let channel = 0; channel < 2; channel++) for (let i = start; i < end; i++) { const value = buffer.getChannelData(channel)[i]; sum += value * value; count++; }
        return Math.sqrt(sum / count);
      };
      const activeRms = rmsWindow(.25, 1.05); const releaseRms = rmsWindow(1.85, 2.75);
      const report = { segment: vehicle + '-skid', activeRms:+activeRms.toFixed(5), releaseRms:+releaseRms.toFixed(5), pass: activeRms > .0002 && releaseRms < activeRms * .45 };
      reports.push(report); fx.dispose();
      if (!report.pass) throw new Error(JSON.stringify(report));
    };
    await renderSkid('scooter'); await renderSkid('driving');
    for (let segment = 0; segment < 5; segment++) {
      const c = new OfflineAudioContext(2, 48000 * 14, 48000);
      const master = c.createGain(); master.gain.value = segment === 4 ? 0 : .78;
      const compressor = c.createDynamicsCompressor();
      compressor.threshold.value = -17; compressor.knee.value = 16; compressor.ratio.value = 3;
      compressor.attack.value = .01; compressor.release.value = .22;
      compressor.connect(master).connect(c.destination);
      const musicBus = c.createGain(); musicBus.gain.value = .3; musicBus.connect(compressor);
      const fxBus = c.createGain(); fxBus.gain.value = .8; fxBus.connect(compressor);
      const music = createCampusMusic(c, musicBus);
      for (let bar = 0; bar < 4; bar++) music.scheduleBar(.1 + bar * MUSIC_BAR_SECONDS, segment * 4 + bar);
      let at = .2;
      const timed = new Proxy(c, { get(target, key) { if (key === 'currentTime') return at; const value = Reflect.get(target, key, target); return typeof value === 'function' ? value.bind(target) : value; } });
      const ambientBus = c.createGain(); ambientBus.gain.value = .7; ambientBus.connect(compressor); const fx = createCampusEffects(timed, fxBus, ambientBus);
      for (const [i, surface] of ['grass','paving','wood'].entries()) { at = .3 + i * .6; fx.step(surface); }
      for (const [i, kind] of ['open','close','arrive','discover','mount','dismount','jump','land'].entries()) { at = 2.2 + i * .45; fx.cue(kind); }
      at = 6; fx.update({ fountain:1, water:1, birds:1, construction:1, speed:1, drift:.82, drifting:true, vehicle:"scooter" });
      at = 7; fx.update({ fountain:1, water:1, birds:1, construction:1, speed:.85, drift:.74, drifting:true, vehicle:"driving" });
      at = 8; fx.update({ fountain:1, water:1, birds:1, construction:1, speed:.25, drift:0, drifting:false, vehicle:"driving" }); const buffer = await c.startRendering();
      let peak = 0, sum = 0, invalid = 0;
      for (let channel=0;channel<2;channel++) for (const value of buffer.getChannelData(channel)) { if(!Number.isFinite(value)) invalid++; peak=Math.max(peak,Math.abs(value)); sum+=value*value; }
      const rms = Math.sqrt(sum / (buffer.length*2));
      const pass = invalid===0 && peak<.99 && (segment===4 ? peak===0 : rms>.002);
      reports.push({segment:segment===4?'muted':segment+1, peak:+peak.toFixed(4),rms:+rms.toFixed(4),invalid,pass});
      fx.dispose(); music.dispose();
      if (!pass) throw new Error(JSON.stringify(reports));
    }
    results.textContent = 'PASS: all 16 music bars, surface steps, eight cues, ambience, isolated scooter and buggy skid fades, and master mute rendered successfully.\\n' + JSON.stringify(reports,null,2);
  } catch (error) { results.textContent = 'FAIL: ' + error.stack; }
};`;
  writeFileSync(files[1], modules + '\n' + review);
  writeFileSync(files[0], '<!doctype html><html lang="en"><meta charset="utf-8"><title>Campus audio verification</title><style>body{font:16px system-ui;background:#f4efdf;color:#253132;padding:40px}button{padding:14px}pre{white-space:pre-wrap}</style><h1>Campus audio verification</h1><p>Offline Web Audio render, no sound is played.</p><button>Run audio render checks</button><pre>Ready</pre><script type="module" src="/__audio-review.js"></script></html>');
  console.log('Open http://localhost:3000/__audio-review.html, then run node scripts/verify-audio-browser.mjs --clean after review.');
}
