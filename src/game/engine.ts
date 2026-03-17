import {
  TILE_SIZE, COLS, ROWS, GROUND_START_ROW,
  PLAYER_SPEED, ENEMY_SPEED, ENEMY_CHASE_SPEED,
  PUMP_RANGE, INFLATE_STAGES, INFLATE_TIME, ROCK_FALL_SPEED,
  GHOST_SPEED, SCORE_POOKA_INFLATE, SCORE_FYGAR_INFLATE,
  SCORE_ROCK_BASE, SCORE_MULTIPLIER_BASE,
} from './constants';
import { Player, Enemy, Rock, PumpBeam, FloatingScore, Particle, GameState, Direction } from './types';
import { TunnelGrid } from './types';
import { digTunnel, isTunnel } from './tunnel';
import { createLevel } from './level';

export interface EngineState {
  game: GameState;
  player: Player;
  enemies: Enemy[];
  rocks: Rock[];
  tunnelGrid: TunnelGrid;
  pumpBeam: PumpBeam;
  floatingScores: FloatingScore[];
  particles: Particle[];
  keys: Set<string>;
  levelTransitionTimer: number;
  deathRespawnTimer: number;
}

let nextParticleId = 1000;
let nextScoreId = 2000;

function clamp(val: number, min: number, max: number) {
  return Math.max(min, Math.min(max, val));
}

function rectsOverlap(
  ax: number, ay: number, aw: number, ah: number,
  bx: number, by: number, bw: number, bh: number
) {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}

function spawnParticles(
  particles: Particle[],
  x: number, y: number,
  color: string,
  count: number,
  speed: number = 3
) {
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
    const spd = speed * (0.5 + Math.random());
    particles.push({
      id: nextParticleId++,
      x, y,
      dx: Math.cos(angle) * spd,
      dy: Math.sin(angle) * spd,
      life: 40 + Math.random() * 20,
      maxLife: 60,
      color,
      size: 3 + Math.random() * 3,
    });
  }
}

function addFloatingScore(scores: FloatingScore[], x: number, y: number, value: number) {
  scores.push({
    id: nextScoreId++,
    x, y,
    value,
    timer: 90,
    maxTimer: 90,
  });
}

export function createEngineState(): EngineState {
  const levelData = createLevel(1);
  return {
    game: {
      phase: 'title',
      score: 0,
      highScore: parseInt(localStorage.getItem('digdug_hi') || '0'),
      lives: 3,
      level: 1,
      frameCount: 0,
    },
    player: levelData.player,
    enemies: levelData.enemies,
    rocks: levelData.rocks,
    tunnelGrid: levelData.tunnelGrid,
    pumpBeam: {
      active: false,
      x: 0, y: 0,
      direction: null,
      length: 0,
      hitEnemy: null,
    },
    floatingScores: [],
    particles: [],
    keys: new Set(),
    levelTransitionTimer: 0,
    deathRespawnTimer: 0,
  };
}

export function startGame(state: EngineState): EngineState {
  const levelData = createLevel(1);
  return {
    ...state,
    game: {
      ...state.game,
      phase: 'playing',
      score: 0,
      lives: 3,
      level: 1,
      frameCount: 0,
    },
    player: levelData.player,
    enemies: levelData.enemies,
    rocks: levelData.rocks,
    tunnelGrid: levelData.tunnelGrid,
    pumpBeam: { active: false, x: 0, y: 0, direction: null, length: 0, hitEnemy: null },
    floatingScores: [],
    particles: [],
    levelTransitionTimer: 0,
    deathRespawnTimer: 0,
  };
}

function nextLevel(state: EngineState): EngineState {
  const newLevel = state.game.level + 1;
  const levelData = createLevel(newLevel);
  return {
    ...state,
    game: {
      ...state.game,
      phase: 'playing',
      level: newLevel,
      frameCount: 0,
    },
    player: levelData.player,
    enemies: levelData.enemies,
    rocks: levelData.rocks,
    tunnelGrid: levelData.tunnelGrid,
    pumpBeam: { active: false, x: 0, y: 0, direction: null, length: 0, hitEnemy: null },
    floatingScores: [],
    particles: [],
    levelTransitionTimer: 0,
    deathRespawnTimer: 0,
  };
}

// Move player, dig tunnels
function updatePlayer(state: EngineState): EngineState {
  let { player, tunnelGrid } = state;
  const { keys } = state;

  if (!player.alive) {
    const deathTimer = player.deathTimer - 1;
    return {
      ...state,
      player: { ...player, deathTimer },
      deathRespawnTimer: deathTimer <= 0 ? state.deathRespawnTimer - 1 : state.deathRespawnTimer,
    };
  }

  if (player.invincible > 0) {
    player = { ...player, invincible: player.invincible - 1 };
  }

  // Determine intended direction
  let intendedDir: Direction = null;
  let dx = 0;
  let dy = 0;

  const up = keys.has('ArrowUp') || keys.has('KeyW');
  const down = keys.has('ArrowDown') || keys.has('KeyS');
  const left = keys.has('ArrowLeft') || keys.has('KeyA');
  const right = keys.has('ArrowRight') || keys.has('KeyD');
  const pump = keys.has('Space') || keys.has('KeyZ') || keys.has('KeyX');

  if (up) { intendedDir = 'up'; dy = -1; }
  else if (down) { intendedDir = 'down'; dy = 1; }
  else if (left) { intendedDir = 'left'; dx = -1; }
  else if (right) { intendedDir = 'right'; dx = 1; }

  const speed = PLAYER_SPEED;

  let newX = player.x;
  let newY = player.y;
  let newFacingX = player.facingX;
  let pumpDirection = player.pumpDirection;

  if (intendedDir) {
    // Try to move
    const testX = player.x + dx * speed;
    const testY = player.y + dy * speed;

    // Clamp within bounds
    const clampedX = clamp(testX, 0, COLS * TILE_SIZE - player.width);
    const clampedY = clamp(testY, GROUND_START_ROW * TILE_SIZE, ROWS * TILE_SIZE - player.height);

    newX = clampedX;
    newY = clampedY;

    if (dx > 0) newFacingX = 'right';
    if (dx < 0) newFacingX = 'left';
    pumpDirection = intendedDir;

    // Dig the tunnel as player moves
    tunnelGrid = digTunnel(tunnelGrid, newX, newY, player.width, player.height);
  }

  // Snap to grid center on perpendicular axis for smooth tunnel alignment
  if (intendedDir === 'up' || intendedDir === 'down') {
    const col = Math.round(newX / TILE_SIZE);
    const snappedX = clamp(col * TILE_SIZE, 0, COLS * TILE_SIZE - player.width);
    newX = newX + (snappedX - newX) * 0.2;
  }
  if (intendedDir === 'left' || intendedDir === 'right') {
    const row = Math.round(newY / TILE_SIZE);
    const snappedY = clamp(row * TILE_SIZE, GROUND_START_ROW * TILE_SIZE, ROWS * TILE_SIZE - player.height);
    newY = newY + (snappedY - newY) * 0.2;
  }

  // Animate
  let animTimer = player.animTimer + 1;
  let animFrame = player.animFrame;
  if (animTimer >= 8) {
    animTimer = 0;
    animFrame = (animFrame + 1) % 4;
  }

  const pumping = pump;

  player = {
    ...player,
    x: newX,
    y: newY,
    dx,
    dy,
    direction: intendedDir,
    facingX: newFacingX,
    pumping,
    pumpDirection: pumpDirection || player.pumpDirection || 'right',
    pumpActive: pumping,
    animFrame,
    animTimer,
  };

  return { ...state, player, tunnelGrid };
}

// Update pump beam
function updatePump(state: EngineState): EngineState {
  let { player, pumpBeam, enemies } = state;
  let { floatingScores, particles } = state;
  let score = state.game.score;

  if (!player.pumping || !player.alive) {
    pumpBeam = { ...pumpBeam, active: false, hitEnemy: null, length: 0 };
    // Enemies deflate if no pump on them
    enemies = enemies.map(e => {
      if (e.state === 'inflating' && pumpBeam.hitEnemy !== e.id) {
        const newTimer = e.deflateTimer + 1;
        if (newTimer > 60) {
          // deflate one stage
          const newStage = Math.max(0, e.inflateStage - 1);
          return {
            ...e,
            inflateStage: newStage,
            state: newStage === 0 ? 'walking' : 'inflating',
            deflateTimer: 0,
            pumpHits: newStage === 0 ? 0 : e.pumpHits,
          };
        }
        return { ...e, deflateTimer: newTimer };
      }
      return e;
    });
    return { ...state, pumpBeam, enemies };
  }

  // Calculate pump beam origin and direction
  const dir = player.pumpDirection || player.direction || 'right';
  let bx = player.x + player.width / 2;
  let by = player.y + player.height / 2;
  let maxLen = PUMP_RANGE;

  // Extend beam
  let beamLen = pumpBeam.active && pumpBeam.direction === dir
    ? Math.min(pumpBeam.length + 6, maxLen)
    : 8;

  pumpBeam = {
    active: true,
    x: bx,
    y: by,
    direction: dir,
    length: beamLen,
    hitEnemy: null,
  };

  // Check for enemy hit
  let hitEnemyId: number | null = null;
  const beamRect = getPumpBeamRect(bx, by, dir, beamLen);

  for (const e of enemies) {
    if (e.state === 'dead' || e.state === 'burning') continue;
    if (rectsOverlap(beamRect.x, beamRect.y, beamRect.w, beamRect.h,
      e.x, e.y, e.width, e.height)) {
      hitEnemyId = e.id;
      break;
    }
  }

  pumpBeam = { ...pumpBeam, hitEnemy: hitEnemyId };

  if (hitEnemyId !== null) {
    enemies = enemies.map(e => {
      if (e.id !== hitEnemyId) return e;
      if (e.state === 'dead' || e.state === 'burning') return e;

      const newTimer = e.inflateTimer + 1;
      let newStage = e.inflateStage;
      let newState = 'inflating' as const;
      let newPumpHits = e.pumpHits;

      if (newTimer >= INFLATE_TIME) {
        newStage = e.inflateStage + 1;
        newPumpHits = e.pumpHits + 1;

        if (newStage >= INFLATE_STAGES) {
          // Enemy popped!
          const baseScore = e.type === 'fygar' ? SCORE_FYGAR_INFLATE : SCORE_POOKA_INFLATE;
          const depth = Math.floor(e.y / TILE_SIZE) - GROUND_START_ROW;
          const depthMultiplier = Math.max(1, Math.floor(depth / 4) + 1);
          const totalScore = baseScore * depthMultiplier;
          score += totalScore;
          addFloatingScore(floatingScores, e.x + e.width / 2, e.y, totalScore);
          spawnParticles(particles, e.x + e.width / 2, e.y + e.height / 2,
            e.type === 'fygar' ? '#00FF88' : '#FF6666', 12, 4);
          return { ...e, state: 'dead' as const, inflateStage: 3, inflateTimer: 0 };
        }

        return {
          ...e,
          inflateStage: newStage,
          state: newState,
          inflateTimer: 0,
          pumpHits: newPumpHits,
          deflateTimer: 0,
        };
      }

      return {
        ...e,
        inflateTimer: newTimer,
        state: newState,
        deflateTimer: 0,
      };
    });
  } else {
    // Deflate enemies not being pumped
    enemies = enemies.map(e => {
      if (e.state === 'inflating') {
        const newTimer = e.deflateTimer + 1;
        if (newTimer > 60) {
          const newStage = Math.max(0, e.inflateStage - 1);
          return {
            ...e,
            inflateStage: newStage,
            state: newStage === 0 ? 'walking' : 'inflating',
            deflateTimer: 0,
            pumpHits: newStage === 0 ? 0 : e.pumpHits,
          };
        }
        return { ...e, deflateTimer: newTimer };
      }
      return e;
    });
  }

  return {
    ...state,
    pumpBeam,
    enemies,
    floatingScores,
    particles,
    game: { ...state.game, score },
  };
}

function getPumpBeamRect(bx: number, by: number, dir: Direction, len: number) {
  const thickness = 8;
  switch (dir) {
    case 'right': return { x: bx, y: by - thickness / 2, w: len, h: thickness };
    case 'left': return { x: bx - len, y: by - thickness / 2, w: len, h: thickness };
    case 'up': return { x: bx - thickness / 2, y: by - len, w: thickness, h: len };
    case 'down': return { x: bx - thickness / 2, y: by, w: thickness, h: len };
    default: return { x: bx, y: by, w: 0, h: 0 };
  }
}

// Enemy AI
function updateEnemies(state: EngineState): EngineState {
  let { enemies, tunnelGrid, player, particles, floatingScores, rocks } = state;
  let score = state.game.score;

  enemies = enemies.map(e => {
    if (e.state === 'dead') return e;
    if (e.state === 'inflating' || e.state === 'inflated') {
      // Inflated enemies slowly drift
      let animTimer = e.animTimer + 1;
      let animFrame = e.animFrame;
      if (animTimer >= 15) { animTimer = 0; animFrame = (animFrame + 1) % 2; }
      return { ...e, animTimer, animFrame };
    }
    if (e.state === 'burning') {
      const flameTimer = e.flameTimer - 1;
      if (flameTimer <= 0) {
        spawnParticles(particles, e.x + e.width / 2, e.y + e.height / 2, '#FF4400', 8, 3);
        return { ...e, state: 'dead' as const };
      }
      return { ...e, flameTimer };
    }

    // Ghost mode - can move through dirt
    const isGhost = e.state === 'ghost';

    // Path timer: periodically choose a new move direction
    let pathTimer = e.pathTimer - 1;
    let dx = e.dx;
    let dy = e.dy;
    let direction = e.direction;
    let facingX = e.facingX;

    const eCol = Math.floor((e.x + e.width / 2) / TILE_SIZE);
    const eRow = Math.floor((e.y + e.height / 2) / TILE_SIZE);
    const pCol = Math.floor((player.x + player.width / 2) / TILE_SIZE);
    const pRow = Math.floor((player.y + player.height / 2) / TILE_SIZE);

    if (pathTimer <= 0) {
      pathTimer = 30 + Math.floor(Math.random() * 30);

      // Move toward player
      const dcol = pCol - eCol;
      const drow = pRow - eRow;

      const candidates: Direction[] = [];

      // Primary: move toward player
      if (Math.abs(dcol) > Math.abs(drow)) {
        candidates.push(dcol > 0 ? 'right' : 'left');
        candidates.push(drow > 0 ? 'down' : 'up');
      } else {
        candidates.push(drow > 0 ? 'down' : 'up');
        candidates.push(dcol > 0 ? 'right' : 'left');
      }
      // Secondary: random
      candidates.push('up', 'down', 'left', 'right');

      for (const cand of candidates) {
        const testCol = eCol + (cand === 'right' ? 1 : cand === 'left' ? -1 : 0);
        const testRow = eRow + (cand === 'down' ? 1 : cand === 'up' ? -1 : 0);
        if (isGhost || isTunnel(tunnelGrid, testCol, testRow)) {
          direction = cand;
          dx = cand === 'right' ? 1 : cand === 'left' ? -1 : 0;
          dy = cand === 'down' ? 1 : cand === 'up' ? -1 : 0;
          if (dx !== 0) facingX = dx > 0 ? 'right' : 'left';
          break;
        }
      }
    }

    // Ghost chance: if stuck too long, turn into ghost
    let ghostTimer = e.ghostTimer;
    let state_: typeof e.state = e.state;
    if (!isGhost && pathTimer < -60) {
      state_ = 'ghost';
      ghostTimer = 180 + Math.floor(Math.random() * 120);
    }
    if (isGhost) {
      ghostTimer -= 1;
      if (ghostTimer <= 0) {
        state_ = 'walking';
        ghostTimer = 0;
      }
    }

    const spd = isGhost ? GHOST_SPEED : (Math.hypot(pCol - eCol, pRow - eRow) < 3 ? ENEMY_CHASE_SPEED : ENEMY_SPEED) * e.speed / 1.0;

    // Try to move
    let newX = e.x + dx * spd;
    let newY = e.y + dy * spd;

    // Bounds
    newX = clamp(newX, 0, COLS * TILE_SIZE - e.width);
    newY = clamp(newY, GROUND_START_ROW * TILE_SIZE, ROWS * TILE_SIZE - e.height);

    // Check if the move is valid (must be in tunnel or ghost)
    if (!isGhost) {
      const left = Math.floor(newX / TILE_SIZE);
      const right = Math.floor((newX + e.width - 1) / TILE_SIZE);
      const top = Math.floor(newY / TILE_SIZE);
      const bottom = Math.floor((newY + e.height - 1) / TILE_SIZE);

      let blocked = false;
      for (let r = top; r <= bottom && !blocked; r++) {
        for (let c = left; c <= right && !blocked; c++) {
          if (!isTunnel(tunnelGrid, c, r)) blocked = true;
        }
      }
      if (blocked) {
        newX = e.x;
        newY = e.y;
        pathTimer = 0; // recalculate
      }
    }

    // Animate
    let animTimer = e.animTimer + 1;
    let animFrame = e.animFrame;
    if (animTimer >= 10) { animTimer = 0; animFrame = (animFrame + 1) % 2; }

    // Fygar flame
    let flameTimer = e.flameTimer;
    let flameActive = false;
    if (e.type === 'fygar' && !isGhost) {
      flameTimer = (flameTimer + 1) % 180;
      if (flameTimer > 150) {
        flameActive = true;
        // Check if flame hits player
        if (player.alive && player.invincible === 0) {
          const pInRow = Math.abs(pRow - eRow) <= 1;
          const pToRight = e.facingX === 'right' && player.x > e.x && player.x < e.x + TILE_SIZE * 3;
          const pToLeft = e.facingX === 'left' && player.x + player.width < e.x + e.width && player.x > e.x - TILE_SIZE * 3;
          if (pInRow && (pToRight || pToLeft)) {
            // Player hit by flame - handled in collision check
          }
        }
      }
    }

    return {
      ...e,
      x: newX, y: newY,
      dx, dy, direction, facingX,
      pathTimer,
      ghostTimer,
      state: state_,
      animTimer, animFrame,
      flameTimer, flameActive,
    };
  });

  return { ...state, enemies, particles, floatingScores, rocks, game: { ...state.game, score } };
}

// Check player-enemy collisions
function checkPlayerEnemyCollisions(state: EngineState): EngineState {
  let { player, enemies, particles, game } = state;

  if (!player.alive || player.invincible > 0) return state;

  for (const e of enemies) {
    if (e.state === 'dead' || e.state === 'inflating' || e.state === 'inflated') continue;
    if (e.state === 'burning') continue;

    const overlap = rectsOverlap(
      player.x + 4, player.y + 4, player.width - 8, player.height - 8,
      e.x + 4, e.y + 4, e.width - 8, e.height - 8
    );

    // Fygar flame check
    let flameHit = false;
    if (e.type === 'fygar' && e.flameActive) {
      const eCenterRow = Math.floor((e.y + e.height / 2) / TILE_SIZE);
      const pCenterRow = Math.floor((player.y + player.height / 2) / TILE_SIZE);
      if (Math.abs(eCenterRow - pCenterRow) <= 0) {
        const flameRight = e.facingX === 'right' &&
          player.x > e.x && player.x < e.x + TILE_SIZE * 3;
        const flameLeft = e.facingX === 'left' &&
          player.x + player.width > e.x - TILE_SIZE * 2 && player.x < e.x;
        flameHit = flameRight || flameLeft;
      }
    }

    if (overlap || flameHit) {
      // Player dies
      spawnParticles(particles, player.x + player.width / 2, player.y + player.height / 2, '#FF6600', 16, 5);
      const newLives = game.lives - 1;
      const newPhase = newLives <= 0 ? 'gameOver' : 'dying';
      const hs = Math.max(game.highScore, game.score);
      if (hs > game.highScore) localStorage.setItem('digdug_hi', String(hs));
      return {
        ...state,
        player: { ...player, alive: false, deathTimer: 60 },
        particles,
        game: {
          ...game,
          lives: newLives,
          phase: newPhase as any,
          highScore: hs,
        },
        deathRespawnTimer: 150,
      };
    }
  }

  return state;
}

// Rock physics
function updateRocks(state: EngineState): EngineState {
  let { rocks, tunnelGrid, enemies, player, particles, game } = state;
  const floatingScores = state.floatingScores;
  let score = game.score;

  rocks = rocks.map(rock => {
    if (rock.state === 'settled') return rock;

    const col = Math.floor(rock.x / TILE_SIZE);
    const bottomRow = Math.floor((rock.y + rock.height) / TILE_SIZE);

    // Check if anything is under the rock (must be tunnel to fall)
    const underLeft = isTunnel(tunnelGrid, col, bottomRow);
    const underRight = isTunnel(tunnelGrid, col + 0, bottomRow);

    const shouldFall = underLeft || underRight;

    if (rock.state === 'stable') {
      if (shouldFall) {
        return { ...rock, state: 'shaking' as const, shakeTimer: 30 };
      }
      return rock;
    }

    if (rock.state === 'shaking') {
      const shakeTimer = rock.shakeTimer - 1;
      if (shakeTimer <= 0) {
        return { ...rock, state: 'falling' as const, shakeTimer: 0, fallSpeed: ROCK_FALL_SPEED };
      }
      return { ...rock, shakeTimer };
    }

    if (rock.state === 'falling') {
      const newFallSpeed = Math.min(rock.fallSpeed + 0.5, 8);
      const newY = rock.y + newFallSpeed;
      const newBottomRow = Math.floor((newY + rock.height) / TILE_SIZE);

      // Check if settled
      const atBottom = newY + rock.height >= ROWS * TILE_SIZE;
      const hitGround = !isTunnel(tunnelGrid, col, newBottomRow) && newBottomRow !== bottomRow;

      if (atBottom || hitGround) {
        const settledY = hitGround
          ? (newBottomRow) * TILE_SIZE - rock.height
          : ROWS * TILE_SIZE - rock.height;

        spawnParticles(particles, rock.x + rock.width / 2, settledY + rock.height, '#888888', 8, 3);

        // Check if rock crushes any enemy
        const crushedIds: number[] = [];
        for (const e of enemies) {
          if (e.state === 'dead') continue;
          if (rectsOverlap(rock.x, settledY, rock.width, rock.height, e.x, e.y, e.width, e.height)) {
            crushedIds.push(e.id);
          }
        }

        // Score for rock kill
        if (crushedIds.length > 0) {
          const mult = Math.pow(SCORE_MULTIPLIER_BASE, crushedIds.length - 1);
          const rockScore = SCORE_ROCK_BASE * crushedIds.length * mult;
          score += rockScore;
          addFloatingScore(floatingScores, rock.x + rock.width / 2, settledY, rockScore);
          spawnParticles(particles, rock.x + rock.width / 2, settledY, '#FFD700', 12, 5);
        }

        // Check if rock crushes player
        if (player.alive && player.invincible === 0) {
          if (rectsOverlap(rock.x, settledY, rock.width, rock.height, player.x, player.y, player.width, player.height)) {
            spawnParticles(particles, player.x + player.width / 2, player.y + player.height / 2, '#FF6600', 16, 5);
          }
        }

        return { ...rock, y: settledY, state: 'settled' as const, fallSpeed: 0, crushedEnemies: crushedIds };
      }

      return { ...rock, y: newY, fallSpeed: newFallSpeed };
    }

    return rock;
  });

  // Kill crushed enemies
  const crushedIds = new Set<number>();
  for (const rock of rocks) {
    for (const id of rock.crushedEnemies) {
      crushedIds.add(id);
    }
  }

  enemies = enemies.map(e => {
    if (crushedIds.has(e.id) && e.state !== 'dead') {
      spawnParticles(particles, e.x + e.width / 2, e.y + e.height / 2,
        e.type === 'fygar' ? '#00FF88' : '#FF6666', 10, 4);
      return { ...e, state: 'dead' as const };
    }
    return e;
  });

  return {
    ...state,
    rocks,
    enemies,
    particles,
    floatingScores,
    game: { ...game, score },
  };
}

// Update particles and floating scores
function updateParticles(state: EngineState): EngineState {
  const particles = state.particles
    .map(p => ({
      ...p,
      x: p.x + p.dx,
      y: p.y + p.dy,
      dy: p.dy + 0.15,
      life: p.life - 1,
    }))
    .filter(p => p.life > 0);

  const floatingScores = state.floatingScores
    .map(s => ({ ...s, timer: s.timer - 1, y: s.y - 0.5 }))
    .filter(s => s.timer > 0);

  return { ...state, particles, floatingScores };
}

// Check level completion
function checkLevelComplete(state: EngineState): EngineState {
  if (state.game.phase !== 'playing') return state;

  const allDead = state.enemies.every(e => e.state === 'dead');
  if (allDead) {
    return {
      ...state,
      game: { ...state.game, phase: 'levelComplete' },
      levelTransitionTimer: 180,
    };
  }
  return state;
}

export function updateEngine(state: EngineState): EngineState {
  if (state.game.phase === 'title' || state.game.phase === 'gameOver') {
    return { ...state, game: { ...state.game, frameCount: state.game.frameCount + 1 } };
  }

  if (state.game.phase === 'levelComplete') {
    const timer = state.levelTransitionTimer - 1;
    if (timer <= 0) {
      return nextLevel(state);
    }
    const newState = updateParticles({ ...state, levelTransitionTimer: timer });
    return { ...newState, game: { ...newState.game, frameCount: newState.game.frameCount + 1 } };
  }

  if (state.game.phase === 'dying') {
    const timer = state.deathRespawnTimer - 1;
    if (timer <= 0 && state.game.lives > 0) {
      // Respawn player
      const levelData = createLevel(state.game.level);
      return {
        ...state,
        player: { ...levelData.player, invincible: 180 },
        game: { ...state.game, phase: 'playing' },
        deathRespawnTimer: 0,
      };
    }
    let s = updateParticles({ ...state, deathRespawnTimer: Math.max(0, timer) });
    s = { ...s, game: { ...s.game, frameCount: s.game.frameCount + 1 } };
    return s;
  }

  if (state.game.phase !== 'playing') return state;

  let s = state;
  s = updatePlayer(s);
  s = updatePump(s);
  s = updateEnemies(s);
  s = checkPlayerEnemyCollisions(s);
  s = updateRocks(s);
  s = updateParticles(s);
  s = checkLevelComplete(s);
  s = { ...s, game: { ...s.game, frameCount: s.game.frameCount + 1 } };
  return s;
}
