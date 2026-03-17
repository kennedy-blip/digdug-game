export type Direction = 'up' | 'down' | 'left' | 'right' | null;

export interface Vec2 {
  x: number;
  y: number;
}

export interface Player {
  x: number;
  y: number;
  width: number;
  height: number;
  dx: number;
  dy: number;
  direction: Direction;
  facingX: 'left' | 'right';
  pumping: boolean;
  pumpDirection: Direction;
  pumpExtension: number;
  pumpActive: boolean;
  alive: boolean;
  animFrame: number;
  animTimer: number;
  invincible: number; // frames of invincibility
  deathTimer: number;
}

export type EnemyType = 'pooka' | 'fygar';
export type EnemyState = 'walking' | 'ghost' | 'inflating' | 'inflated' | 'dead' | 'burning';

export interface Enemy {
  id: number;
  type: EnemyType;
  x: number;
  y: number;
  width: number;
  height: number;
  dx: number;
  dy: number;
  direction: Direction;
  facingX: 'left' | 'right';
  state: EnemyState;
  inflateStage: number; // 0-3
  inflateTimer: number;
  deflateTimer: number;
  ghostTimer: number;
  animFrame: number;
  animTimer: number;
  pumpHits: number;
  flameTimer: number;
  flameActive: boolean;
  pathTimer: number;
  stunTimer: number;
  speed: number;
  rowDepth: number; // which underground row band
}

export interface Rock {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
  state: 'stable' | 'shaking' | 'falling' | 'settled';
  shakeTimer: number;
  fallSpeed: number;
  crushedEnemies: number[];
}

export interface PumpBeam {
  active: boolean;
  x: number;
  y: number;
  direction: Direction;
  length: number;
  hitEnemy: number | null;
}

export interface FloatingScore {
  id: number;
  x: number;
  y: number;
  value: number;
  timer: number;
  maxTimer: number;
}

export interface Particle {
  id: number;
  x: number;
  y: number;
  dx: number;
  dy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

export interface GameState {
  phase: 'title' | 'playing' | 'paused' | 'dying' | 'levelComplete' | 'gameOver';
  score: number;
  highScore: number;
  lives: number;
  level: number;
  frameCount: number;
}

// Tunnel grid: each cell can be dug or not
export type TunnelGrid = boolean[][];
