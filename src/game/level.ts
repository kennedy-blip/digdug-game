import { COLS, ROWS, TILE_SIZE, GROUND_START_ROW } from './constants';
import { Enemy, Rock, Player } from './types';
import { TunnelGrid } from './types';
import { createTunnelGrid } from './tunnel';

let enemyIdCounter = 1;
let rockIdCounter = 1;

export function resetIdCounters() {
  enemyIdCounter = 1;
  rockIdCounter = 1;
}

export interface LevelData {
  tunnelGrid: TunnelGrid;
  enemies: Enemy[];
  rocks: Rock[];
  player: Player;
}

function makeEnemy(
  id: number,
  type: 'pooka' | 'fygar',
  col: number,
  row: number,
  level: number
): Enemy {
  const speedMult = 1 + (level - 1) * 0.15;
  return {
    id,
    type,
    x: col * TILE_SIZE,
    y: row * TILE_SIZE,
    width: TILE_SIZE,
    height: TILE_SIZE,
    dx: 0,
    dy: 0,
    direction: null,
    facingX: 'right',
    state: 'walking',
    inflateStage: 0,
    inflateTimer: 0,
    deflateTimer: 0,
    ghostTimer: 0,
    animFrame: 0,
    animTimer: 0,
    pumpHits: 0,
    flameTimer: 0,
    flameActive: false,
    pathTimer: 0,
    stunTimer: 0,
    speed: (type === 'pooka' ? 1.0 : 1.2) * speedMult,
    rowDepth: row,
  };
}

function makeRock(col: number, row: number): Rock {
  return {
    id: rockIdCounter++,
    x: col * TILE_SIZE,
    y: row * TILE_SIZE,
    width: TILE_SIZE,
    height: TILE_SIZE,
    state: 'stable',
    shakeTimer: 0,
    fallSpeed: 0,
    crushedEnemies: [],
  };
}

export function createLevel(level: number): LevelData {
  resetIdCounters();
  const tunnelGrid = createTunnelGrid();

  // Pre-dig some horizontal tunnels at fixed rows
  const tunnelRows = [4, 8, 12, 16, 19];
  for (const row of tunnelRows) {
    for (let col = 0; col < COLS; col++) {
      if (row < ROWS) tunnelGrid[row][col] = true;
    }
  }
  // Pre-dig some vertical tunnels
  const tunnelCols = [3, 9, 15];
  for (const col of tunnelCols) {
    for (let row = GROUND_START_ROW; row < ROWS; row++) {
      tunnelGrid[row][col] = true;
    }
  }

  // Player starts at top-center
  const player: Player = {
    x: 9 * TILE_SIZE,
    y: GROUND_START_ROW * TILE_SIZE,
    width: TILE_SIZE - 4,
    height: TILE_SIZE - 4,
    dx: 0,
    dy: 0,
    direction: null,
    facingX: 'right',
    pumping: false,
    pumpDirection: null,
    pumpExtension: 0,
    pumpActive: false,
    alive: true,
    animFrame: 0,
    animTimer: 0,
    invincible: 0,
    deathTimer: 0,
  };

  // Place rocks
  const rockPositions: [number, number][] = [
    [2, 5], [6, 5], [12, 5], [16, 5],
    [4, 9], [9, 9], [14, 9],
    [2, 13], [7, 13], [12, 13], [17, 13],
    [5, 17], [10, 17], [15, 17],
  ];
  const rocks: Rock[] = rockPositions
    .filter(([col, row]) => col < COLS && row < ROWS)
    .map(([col, row]) => makeRock(col, row));

  // Enemy configurations per level
  const enemyConfigs: Array<{ type: 'pooka' | 'fygar'; col: number; row: number }[]> = [
    // Level 1
    [
      { type: 'pooka', col: 2, row: 6 },
      { type: 'pooka', col: 14, row: 6 },
      { type: 'pooka', col: 6, row: 10 },
      { type: 'fygar', col: 12, row: 10 },
      { type: 'pooka', col: 4, row: 14 },
      { type: 'fygar', col: 16, row: 14 },
    ],
    // Level 2
    [
      { type: 'pooka', col: 2, row: 6 },
      { type: 'fygar', col: 14, row: 6 },
      { type: 'pooka', col: 6, row: 10 },
      { type: 'fygar', col: 12, row: 10 },
      { type: 'pooka', col: 4, row: 14 },
      { type: 'fygar', col: 16, row: 14 },
      { type: 'pooka', col: 9, row: 18 },
      { type: 'fygar', col: 2, row: 18 },
    ],
    // Level 3+
    [
      { type: 'pooka', col: 2, row: 6 },
      { type: 'fygar', col: 14, row: 6 },
      { type: 'fygar', col: 6, row: 10 },
      { type: 'pooka', col: 12, row: 10 },
      { type: 'fygar', col: 4, row: 14 },
      { type: 'fygar', col: 16, row: 14 },
      { type: 'pooka', col: 9, row: 18 },
      { type: 'fygar', col: 2, row: 18 },
      { type: 'pooka', col: 16, row: 18 },
    ],
  ];

  const idx = Math.min(level - 1, enemyConfigs.length - 1);
  const enemies: Enemy[] = enemyConfigs[idx].map(cfg =>
    makeEnemy(enemyIdCounter++, cfg.type, cfg.col, cfg.row, level)
  );

  return { tunnelGrid, enemies, rocks, player };
}
