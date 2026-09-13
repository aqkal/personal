export type Cell = { x: number; y: number };
export type SnakeState = {
  snake: Cell[];
  dir: Cell;
  nextDir: Cell;
  food: Cell | null;
  score: number;
};

const same = (a: Cell, b: Cell) => a.x === b.x && a.y === b.y;

/** Enumerating empty cells terminates even when the board is completely full. */
export function placeFood(snake: Cell[], size: number, random = Math.random): Cell | null {
  const occupied = new Set(snake.map((cell) => cell.y * size + cell.x));
  const free: Cell[] = [];
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) if (!occupied.has(y * size + x)) free.push({ x, y });
  }
  return free.length ? free[Math.floor(random() * free.length)] : null;
}

export function createSnake(size = 18, direction: Cell = { x: 1, y: 0 }): SnakeState {
  const mid = Math.floor(size / 2);
  return {
    snake: Array.from({ length: 3 }, (_, i) => ({ x: mid - direction.x * i, y: mid - direction.y * i })),
    dir: direction,
    nextDir: direction,
    food: { x: mid + direction.x * 4, y: mid + direction.y * 4 },
    score: 0,
  };
}

export function steerSnake(state: SnakeState, direction: Cell) {
  if (direction.x === -state.dir.x && direction.y === -state.dir.y) return;
  state.nextDir = direction;
}

/** One deterministic tick; the vacating tail is safe when food isn't eaten. */
export function stepSnake(state: SnakeState, size = 18, random = Math.random): "playing" | "over" | "won" {
  state.dir = state.nextDir;
  const head = { x: state.snake[0].x + state.dir.x, y: state.snake[0].y + state.dir.y };
  const eating = !!state.food && same(head, state.food);
  const body = eating ? state.snake : state.snake.slice(0, -1);
  if (head.x < 0 || head.y < 0 || head.x >= size || head.y >= size || body.some((cell) => same(cell, head))) return "over";
  state.snake.unshift(head);
  if (eating) {
    state.score += 10;
    state.food = placeFood(state.snake, size, random);
    if (!state.food) return "won";
  } else state.snake.pop();
  return "playing";
}
