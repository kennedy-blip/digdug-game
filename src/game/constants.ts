export const TILE_SIZE = 32;
export const COLS = 19;
export const ROWS = 22;
export const CANVAS_WIDTH = COLS * TILE_SIZE;
export const CANVAS_HEIGHT = ROWS * TILE_SIZE;

export const GROUND_START_ROW = 2; // rows 0-1 are sky
export const HEADER_ROWS = 2;

export const PLAYER_SPEED = 2.5;
export const ENEMY_SPEED = 1.0;
export const ENEMY_CHASE_SPEED = 1.6;
export const PUMP_RANGE = TILE_SIZE * 2.5;
export const PUMP_SPEED = 6;
export const INFLATE_STAGES = 3;
export const INFLATE_TIME = 90; // frames per stage
export const DEFLATE_SPEED = 1; // stages per second
export const ROCK_FALL_SPEED = 4;
export const GHOST_SPEED = 1.2;

export const SCORE_POOKA_INFLATE = 200;
export const SCORE_FYGAR_INFLATE = 400;
export const SCORE_ROCK_BASE = 1000;
export const SCORE_MULTIPLIER_BASE = 2; // doubles per additional enemy under rock

export const LEVEL_COLORS: Record<number, { soil: string; dark: string; border: string }> = {
  1: { soil: '#8B4513', dark: '#5C2E00', border: '#A0522D' },
  2: { soil: '#4682B4', dark: '#2B4F6E', border: '#5B8BC4' },
  3: { soil: '#228B22', dark: '#145214', border: '#32A832' },
  4: { soil: '#8B008B', dark: '#5C005C', border: '#A000A0' },
};

export const COLORS = {
  sky: '#000080',
  skyStripe: '#0000A0',
  player: '#FF6600',
  playerPump: '#FFAA00',
  pookaBody: '#FF4444',
  pookaEye: '#FFFF00',
  fygarBody: '#00AA44',
  fygarEye: '#FFFFFF',
  fygarFlame: '#FF6600',
  rock: '#888888',
  rockHighlight: '#AAAAAA',
  rockShadow: '#555555',
  tunnel: 'rgba(0,0,0,0.85)',
  scoreText: '#FFFF00',
  ui: '#FFFFFF',
  ghost: 'rgba(200,200,255,0.5)',
};

export const FRAME_RATE = 60;
