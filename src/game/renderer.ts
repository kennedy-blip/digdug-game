import {
  TILE_SIZE, COLS, ROWS, GROUND_START_ROW, CANVAS_WIDTH, CANVAS_HEIGHT, LEVEL_COLORS, COLORS,
} from './constants';
import { EngineState } from './engine';
import { Enemy, Player } from './types';
// Player import used in drawPlayerBody
import { isTunnel } from './tunnel';

export function render(ctx: CanvasRenderingContext2D, state: EngineState) {
  ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  const levelIdx = Math.min(state.game.level, 4);
  const palette = LEVEL_COLORS[levelIdx] || LEVEL_COLORS[1];

  drawBackground(ctx, state, palette);
  drawTunnels(ctx, state, palette);
  drawRocks(ctx, state);
  drawEnemies(ctx, state);
  drawPlayer(ctx, state);
  drawPumpBeam(ctx, state);
  drawParticles(ctx, state);
  drawFloatingScores(ctx, state);
  drawHUD(ctx, state);

  if (state.game.phase === 'levelComplete') {
    drawLevelComplete(ctx, state);
  }
  if (state.game.phase === 'dying') {
    drawDying(ctx, state);
  }
  if (state.game.phase === 'paused') {
    drawPaused(ctx, state);
  }
}

function drawBackground(ctx: CanvasRenderingContext2D, state: EngineState, palette: typeof LEVEL_COLORS[1]) {
  // Sky area
  for (let row = 0; row < GROUND_START_ROW; row++) {
    const y = row * TILE_SIZE;
    ctx.fillStyle = COLORS.sky;
    ctx.fillRect(0, y, CANVAS_WIDTH, TILE_SIZE);
    // Sky stripes for decoration
    ctx.fillStyle = COLORS.skyStripe;
    ctx.fillRect(0, y + TILE_SIZE / 2 - 2, CANVAS_WIDTH, 2);
  }

  // Underground - draw soil
  for (let row = GROUND_START_ROW; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      if (!isTunnel(state.tunnelGrid, col, row)) {
        const x = col * TILE_SIZE;
        const y = row * TILE_SIZE;
        ctx.fillStyle = palette.soil;
        ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
        // Add texture dots
        ctx.fillStyle = palette.dark;
        for (let i = 0; i < 3; i++) {
          const px = x + ((col * 7 + i * 11 + row * 5) % (TILE_SIZE - 4)) + 2;
          const py = y + ((row * 13 + i * 7 + col * 3) % (TILE_SIZE - 4)) + 2;
          ctx.fillRect(px, py, 2, 2);
        }
        // Border highlight (top/left)
        ctx.fillStyle = palette.border;
        ctx.fillRect(x, y, TILE_SIZE, 1);
        ctx.fillRect(x, y, 1, TILE_SIZE);
      }
    }
  }
}

function drawTunnels(ctx: CanvasRenderingContext2D, state: EngineState, _palette: typeof LEVEL_COLORS[1]) {
  // Draw tunnel cells (already open = black with slight brown tint)
  for (let row = GROUND_START_ROW; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      if (isTunnel(state.tunnelGrid, col, row)) {
        const x = col * TILE_SIZE;
        const y = row * TILE_SIZE;
        ctx.fillStyle = '#1a0800';
        ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
        // Subtle tunnel walls
        ctx.fillStyle = 'rgba(80,40,10,0.3)';
        ctx.fillRect(x, y, TILE_SIZE, 2);
        ctx.fillRect(x, y + TILE_SIZE - 2, TILE_SIZE, 2);
        ctx.fillRect(x, y, 2, TILE_SIZE);
        ctx.fillRect(x + TILE_SIZE - 2, y, 2, TILE_SIZE);
      }
    }
  }
}

function drawRocks(ctx: CanvasRenderingContext2D, state: EngineState) {
  for (const rock of state.rocks) {
    if (rock.state === 'settled' && rock.crushedEnemies.length === 0) {
      // Only draw settled rocks that haven't crushed anything
    }

    const shakeOffset = rock.state === 'shaking' ? Math.sin(state.game.frameCount * 0.5) * 2 : 0;
    const rx = rock.x + shakeOffset;
    const ry = rock.y;

    ctx.save();
    ctx.translate(rx, ry);

    // Rock body
    ctx.fillStyle = COLORS.rock;
    ctx.beginPath();
    ctx.ellipse(TILE_SIZE / 2, TILE_SIZE / 2, TILE_SIZE / 2 - 2, TILE_SIZE / 2 - 2, 0, 0, Math.PI * 2);
    ctx.fill();

    // Rock highlight
    ctx.fillStyle = COLORS.rockHighlight;
    ctx.beginPath();
    ctx.ellipse(TILE_SIZE / 3, TILE_SIZE / 3, TILE_SIZE / 6, TILE_SIZE / 8, -0.5, 0, Math.PI * 2);
    ctx.fill();

    // Rock shadow
    ctx.fillStyle = COLORS.rockShadow;
    ctx.beginPath();
    ctx.ellipse(TILE_SIZE * 0.6, TILE_SIZE * 0.65, TILE_SIZE / 5, TILE_SIZE / 7, 0.3, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}

function drawEnemies(ctx: CanvasRenderingContext2D, state: EngineState) {
  for (const e of state.enemies) {
    if (e.state === 'dead') continue;

    ctx.save();
    ctx.translate(e.x, e.y);

    const alpha = e.state === 'ghost' ? 0.4 : 1.0;
    ctx.globalAlpha = alpha;

    if (e.type === 'pooka') {
      drawPooka(ctx, e, state.game.frameCount);
    } else {
      drawFygar(ctx, e, state.game.frameCount);
    }

    ctx.globalAlpha = 1.0;
    ctx.restore();
  }
}

function drawPooka(ctx: CanvasRenderingContext2D, e: Enemy, frame: number) {
  const inflateScale = 1 + e.inflateStage * 0.2;
  const cx = TILE_SIZE / 2;
  const cy = TILE_SIZE / 2;
  const r = (TILE_SIZE / 2 - 3) * inflateScale;

  // Body
  ctx.fillStyle = '#FF4444';
  ctx.beginPath();
  ctx.ellipse(cx, cy, r, r * 0.9, 0, 0, Math.PI * 2);
  ctx.fill();

  // Face (flipped based on direction)
  const flip = e.facingX === 'left' ? -1 : 1;

  // Eyes
  const eyeX = cx + flip * r * 0.3;
  ctx.fillStyle = '#FFFF00';
  ctx.beginPath();
  ctx.ellipse(eyeX, cy - r * 0.1, r * 0.25, r * 0.35, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#000';
  ctx.beginPath();
  ctx.ellipse(eyeX + flip * r * 0.05, cy - r * 0.05, r * 0.12, r * 0.18, 0, 0, Math.PI * 2);
  ctx.fill();

  // Antenna
  ctx.strokeStyle = '#FF6666';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx, cy - r);
  ctx.lineTo(cx + Math.sin(frame * 0.15) * 5, cy - r - 8);
  ctx.stroke();
  ctx.fillStyle = '#FFAAAA';
  ctx.beginPath();
  ctx.arc(cx + Math.sin(frame * 0.15) * 5, cy - r - 8, 3, 0, Math.PI * 2);
  ctx.fill();

  // Inflate cracks
  if (e.inflateStage >= 2) {
    ctx.strokeStyle = 'rgba(255,100,100,0.7)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(cx - r * 0.5, cy - r * 0.3);
    ctx.lineTo(cx - r * 0.2, cy);
    ctx.lineTo(cx - r * 0.5, cy + r * 0.3);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx + r * 0.3, cy - r * 0.4);
    ctx.lineTo(cx + r * 0.5, cy);
    ctx.stroke();
  }
}

function drawFygar(ctx: CanvasRenderingContext2D, e: Enemy, frame: number) {
  const inflateScale = 1 + e.inflateStage * 0.18;
  const cx = TILE_SIZE / 2;
  const cy = TILE_SIZE / 2;
  const rx = (TILE_SIZE / 2 - 2) * inflateScale;
  const ry = (TILE_SIZE / 2 - 4) * inflateScale;

  // Body (dragon-ish)
  ctx.fillStyle = '#00AA44';
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();

  // Scales pattern
  ctx.strokeStyle = '#008833';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(cx - rx * 0.3, cy + ry * 0.1, rx * 0.2, Math.PI, 0);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(cx + rx * 0.1, cy + ry * 0.1, rx * 0.2, Math.PI, 0);
  ctx.stroke();

  const flip = e.facingX === 'left' ? -1 : 1;

  // Eyes
  const eyeX = cx + flip * rx * 0.4;
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.ellipse(eyeX, cy - ry * 0.2, rx * 0.22, ry * 0.3, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#000';
  ctx.beginPath();
  ctx.ellipse(eyeX + flip * rx * 0.04, cy - ry * 0.15, rx * 0.1, ry * 0.15, 0, 0, Math.PI * 2);
  ctx.fill();

  // Snout
  ctx.fillStyle = '#00CC55';
  ctx.beginPath();
  ctx.ellipse(cx + flip * rx * 0.75, cy + ry * 0.05, rx * 0.22, ry * 0.18, 0, 0, Math.PI * 2);
  ctx.fill();

  // Flame
  if (e.flameActive) {
    const flameX = cx + flip * (rx + 4);
    const flameLen = 30 + Math.sin(frame * 0.3) * 8;
    const grad = ctx.createLinearGradient(flameX, cy, flameX + flip * flameLen, cy);
    grad.addColorStop(0, 'rgba(255,200,0,0.9)');
    grad.addColorStop(0.5, 'rgba(255,100,0,0.7)');
    grad.addColorStop(1, 'rgba(255,50,0,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(flameX + flip * flameLen / 2, cy, flameLen / 2, 6 + Math.sin(frame * 0.4) * 2, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawPlayer(ctx: CanvasRenderingContext2D, state: EngineState) {
  const { player, game } = state;

  if (!player.alive) {
    // Death spin
    if (player.deathTimer > 30) {
      ctx.save();
      ctx.translate(player.x + player.width / 2, player.y + player.height / 2);
      ctx.rotate((60 - player.deathTimer) * 0.3);
      ctx.globalAlpha = player.deathTimer / 60;
      drawPlayerBody(ctx, player, game.frameCount);
      ctx.restore();
    }
    return;
  }

  const blinkOn = player.invincible > 0 ? (Math.floor(game.frameCount / 4) % 2 === 0) : true;
  if (!blinkOn) return;

  ctx.save();
  ctx.translate(player.x, player.y);
  drawPlayerBody(ctx, player, game.frameCount);
  ctx.restore();
}

function drawPlayerBody(ctx: CanvasRenderingContext2D, player: Player, frame: number) {
  const w = player.width;
  const h = player.height;
  const cx = w / 2;
  const cy = h / 2;
  const flip = player.facingX === 'left' ? -1 : 1;

  // Helmet
  ctx.fillStyle = '#0044FF';
  ctx.beginPath();
  ctx.ellipse(cx, cy - h * 0.1, w * 0.38, h * 0.36, 0, 0, Math.PI * 2);
  ctx.fill();

  // Visor
  ctx.fillStyle = '#88CCFF';
  ctx.beginPath();
  ctx.ellipse(cx + flip * w * 0.08, cy - h * 0.12, w * 0.2, h * 0.18, 0, 0, Math.PI * 2);
  ctx.fill();

  // Body
  ctx.fillStyle = '#FF6600';
  ctx.fillRect(cx - w * 0.28, cy + h * 0.1, w * 0.56, h * 0.35);

  // Legs - animate when moving
  const legOffset = player.direction ? Math.sin(frame * 0.35) * 4 : 0;
  ctx.fillStyle = '#0044FF';
  ctx.fillRect(cx - w * 0.22, cy + h * 0.44, w * 0.18, h * 0.25 + (player.direction === 'down' ? legOffset : -legOffset));
  ctx.fillRect(cx + w * 0.04, cy + h * 0.44, w * 0.18, h * 0.25 + (player.direction === 'up' ? legOffset : -legOffset));

  // Arms
  ctx.fillStyle = '#FF6600';
  const armSwing = player.pumping ? 0 : Math.sin(frame * 0.35) * 3;
  ctx.fillRect(cx - w * 0.45, cy + h * 0.1 + armSwing, w * 0.15, h * 0.22);
  ctx.fillRect(cx + w * 0.3, cy + h * 0.1 - armSwing, w * 0.15, h * 0.22);

  // Pump nozzle when pumping
  if (player.pumping) {
    const dir = player.pumpDirection || 'right';
    ctx.fillStyle = '#FFAA00';
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#FFAA00';
    if (dir === 'right') {
      ctx.fillRect(cx + w * 0.4, cy - h * 0.05, w * 0.25, h * 0.1);
    } else if (dir === 'left') {
      ctx.fillRect(cx - w * 0.65, cy - h * 0.05, w * 0.25, h * 0.1);
    } else if (dir === 'up') {
      ctx.fillRect(cx - h * 0.05, cy - h * 0.55, w * 0.1, h * 0.25);
    } else {
      ctx.fillRect(cx - h * 0.05, cy + h * 0.45, w * 0.1, h * 0.25);
    }
  }
}

function drawPumpBeam(ctx: CanvasRenderingContext2D, state: EngineState) {
  const { pumpBeam, game } = state;
  if (!pumpBeam.active || pumpBeam.length <= 0) return;

  const { x, y, direction, length } = pumpBeam;
  const thickness = 6;
  const pulse = 0.7 + Math.sin(game.frameCount * 0.3) * 0.3;

  ctx.strokeStyle = `rgba(255, 180, 0, ${pulse})`;
  ctx.lineWidth = thickness;
  ctx.lineCap = 'round';
  ctx.beginPath();

  switch (direction) {
    case 'right':
      ctx.moveTo(x, y);
      ctx.lineTo(x + length, y);
      break;
    case 'left':
      ctx.moveTo(x, y);
      ctx.lineTo(x - length, y);
      break;
    case 'up':
      ctx.moveTo(x, y);
      ctx.lineTo(x, y - length);
      break;
    case 'down':
      ctx.moveTo(x, y);
      ctx.lineTo(x, y + length);
      break;
  }
  ctx.stroke();

  // Tip glow
  if (pumpBeam.hitEnemy !== null) {
    ctx.fillStyle = `rgba(255, 220, 0, ${pulse})`;
    ctx.beginPath();
    let tipX = x, tipY = y;
    if (direction === 'right') tipX += length;
    if (direction === 'left') tipX -= length;
    if (direction === 'up') tipY -= length;
    if (direction === 'down') tipY += length;
    ctx.arc(tipX, tipY, 8, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawParticles(ctx: CanvasRenderingContext2D, state: EngineState) {
  for (const p of state.particles) {
    const alpha = p.life / p.maxLife;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
  }
  ctx.globalAlpha = 1.0;
}

function drawFloatingScores(ctx: CanvasRenderingContext2D, state: EngineState) {
  ctx.font = 'bold 14px monospace';
  ctx.textAlign = 'center';
  for (const s of state.floatingScores) {
    const alpha = s.timer / s.maxTimer;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = '#FFD700';
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 3;
    ctx.strokeText(String(s.value), s.x, s.y);
    ctx.fillText(String(s.value), s.x, s.y);
  }
  ctx.globalAlpha = 1.0;
  ctx.textAlign = 'left';
}

function drawHUD(ctx: CanvasRenderingContext2D, state: EngineState) {
  const { game } = state;
  const hudY = TILE_SIZE * 0.5;

  // Score
  ctx.font = 'bold 16px monospace';
  ctx.fillStyle = '#FFFFFF';
  ctx.textAlign = 'left';
  ctx.fillText(`SCORE: ${game.score.toString().padStart(7, '0')}`, 8, hudY + 6);

  // High Score
  ctx.textAlign = 'center';
  ctx.fillText(`HI: ${game.highScore.toString().padStart(7, '0')}`, CANVAS_WIDTH / 2, hudY + 6);

  // Level
  ctx.textAlign = 'right';
  ctx.fillText(`LVL ${game.level}`, CANVAS_WIDTH - 8, hudY + 6);

  // Lives
  const livesY = TILE_SIZE * 1.5 - 8;
  ctx.textAlign = 'left';
  ctx.font = '12px monospace';
  ctx.fillStyle = '#FF6600';
  for (let i = 0; i < game.lives; i++) {
    drawMiniPlayer(ctx, 8 + i * 22, livesY - 8);
  }

  // Separator line
  ctx.strokeStyle = '#FFDD00';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, GROUND_START_ROW * TILE_SIZE);
  ctx.lineTo(CANVAS_WIDTH, GROUND_START_ROW * TILE_SIZE);
  ctx.stroke();
}

function drawMiniPlayer(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.fillStyle = '#FF6600';
  ctx.fillRect(x + 4, y + 6, 8, 10);
  ctx.fillStyle = '#0044FF';
  ctx.beginPath();
  ctx.arc(x + 8, y + 4, 6, 0, Math.PI * 2);
  ctx.fill();
}

function drawLevelComplete(ctx: CanvasRenderingContext2D, state: EngineState) {
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  ctx.font = 'bold 32px monospace';
  ctx.fillStyle = '#FFD700';
  ctx.textAlign = 'center';
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 4;
  ctx.strokeText('STAGE CLEAR!', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 20);
  ctx.fillText('STAGE CLEAR!', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 20);

  ctx.font = 'bold 18px monospace';
  ctx.fillStyle = '#FFFFFF';
  ctx.strokeText(`SCORE: ${state.game.score}`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 20);
  ctx.fillText(`SCORE: ${state.game.score}`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 20);
  ctx.textAlign = 'left';
}

function drawDying(ctx: CanvasRenderingContext2D, state: EngineState) {
  if (state.game.lives <= 0) return;
  const alpha = Math.min(1, (150 - state.deathRespawnTimer) / 60);
  ctx.fillStyle = `rgba(255, 0, 0, ${alpha * 0.2})`;
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
}

function drawPaused(ctx: CanvasRenderingContext2D, _state: EngineState) {
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  ctx.textAlign = 'center';
  ctx.font = 'bold 36px monospace';
  ctx.fillStyle = '#FFD700';
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 4;
  ctx.strokeText('PAUSED', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 10);
  ctx.fillText('PAUSED', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 10);

  ctx.font = '16px monospace';
  ctx.fillStyle = '#FFFFFF';
  ctx.fillText('Press P or ESC to resume', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 25);
  ctx.textAlign = 'left';
}

export function renderTitleScreen(ctx: CanvasRenderingContext2D, frame: number, highScore: number) {
  ctx.fillStyle = '#000080';
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  // Animated background tiles
  const palette = LEVEL_COLORS[1];
  for (let row = 2; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      if ((col + row + Math.floor(frame / 30)) % 3 !== 0) {
        ctx.fillStyle = palette.soil;
        ctx.fillRect(col * TILE_SIZE, row * TILE_SIZE, TILE_SIZE, TILE_SIZE);
        ctx.fillStyle = palette.dark;
        for (let i = 0; i < 2; i++) {
          ctx.fillRect(
            col * TILE_SIZE + ((col * 7 + i * 11 + row * 5) % 26) + 2,
            row * TILE_SIZE + ((row * 13 + i * 7 + col * 3) % 26) + 2,
            2, 2
          );
        }
      } else {
        ctx.fillStyle = '#1a0800';
        ctx.fillRect(col * TILE_SIZE, row * TILE_SIZE, TILE_SIZE, TILE_SIZE);
      }
    }
  }

  // Title
  ctx.textAlign = 'center';

  // Shadow
  ctx.font = 'bold 54px monospace';
  ctx.fillStyle = '#000';
  ctx.fillText('DIG DUG', CANVAS_WIDTH / 2 + 3, 115);

  // Main title with gradient
  const grad = ctx.createLinearGradient(0, 80, 0, 130);
  grad.addColorStop(0, '#FFD700');
  grad.addColorStop(0.5, '#FF6600');
  grad.addColorStop(1, '#FF0000');
  ctx.fillStyle = grad;
  ctx.fillText('DIG DUG', CANVAS_WIDTH / 2, 112);

  // Subtitle
  ctx.font = 'bold 16px monospace';
  ctx.fillStyle = '#FFFFFF';
  ctx.fillText('◄ UNDERGROUND ADVENTURE ►', CANVAS_WIDTH / 2, 145);

  // High Score
  ctx.font = '14px monospace';
  ctx.fillStyle = '#FFD700';
  ctx.fillText(`HI SCORE: ${highScore.toString().padStart(7, '0')}`, CANVAS_WIDTH / 2, 175);

  // Blinking "Press Space"
  if (Math.floor(frame / 30) % 2 === 0) {
    ctx.font = 'bold 18px monospace';
    ctx.fillStyle = '#00FF88';
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 3;
    ctx.strokeText('PRESS SPACE TO START', CANVAS_WIDTH / 2, 230);
    ctx.fillText('PRESS SPACE TO START', CANVAS_WIDTH / 2, 230);
  }

  // Controls
  ctx.font = '13px monospace';
  ctx.fillStyle = '#AAAAFF';
  ctx.fillText('ARROWS/WASD: Move & Dig', CANVAS_WIDTH / 2, 270);
  ctx.fillText('SPACE: Fire Pump to Inflate Enemies', CANVAS_WIDTH / 2, 290);
  ctx.fillText('Inflate fully to defeat them!', CANVAS_WIDTH / 2, 310);
  ctx.fillText('Rocks fall on enemies for bonus!', CANVAS_WIDTH / 2, 330);

  // Draw little pooka
  ctx.save();
  ctx.translate(CANVAS_WIDTH / 2 - 80, 380);
  const pulsePo = 1 + Math.sin(frame * 0.08) * 0.1;
  ctx.scale(pulsePo, pulsePo);
  ctx.fillStyle = '#FF4444';
  ctx.beginPath();
  ctx.ellipse(16, 16, 14, 13, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#FFFF00';
  ctx.beginPath();
  ctx.ellipse(20, 14, 5, 7, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#000';
  ctx.beginPath();
  ctx.ellipse(21, 15, 2.5, 3.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Draw little fygar
  ctx.save();
  ctx.translate(CANVAS_WIDTH / 2 + 48, 380);
  const pulseF = 1 + Math.sin(frame * 0.08 + 1) * 0.1;
  ctx.scale(pulseF, pulseF);
  ctx.fillStyle = '#00AA44';
  ctx.beginPath();
  ctx.ellipse(16, 16, 15, 11, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.ellipse(22, 12, 4, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#000';
  ctx.beginPath();
  ctx.ellipse(23, 13, 2, 2.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.textAlign = 'left';
}

export function renderGameOver(ctx: CanvasRenderingContext2D, state: EngineState) {
  ctx.fillStyle = 'rgba(0,0,0,0.75)';
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  ctx.textAlign = 'center';
  ctx.font = 'bold 48px monospace';
  ctx.fillStyle = '#FF0000';
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 5;
  ctx.strokeText('GAME OVER', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 40);
  ctx.fillText('GAME OVER', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 40);

  ctx.font = 'bold 20px monospace';
  ctx.fillStyle = '#FFFFFF';
  ctx.strokeText(`FINAL SCORE: ${state.game.score}`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 10);
  ctx.fillText(`FINAL SCORE: ${state.game.score}`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 10);

  ctx.font = '16px monospace';
  ctx.fillStyle = '#FFD700';
  ctx.fillText(`HI SCORE: ${state.game.highScore}`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 40);

  if (Math.floor(state.game.frameCount / 30) % 2 === 0) {
    ctx.font = 'bold 16px monospace';
    ctx.fillStyle = '#00FF88';
    ctx.fillText('PRESS SPACE TO PLAY AGAIN', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 80);
  }
  ctx.textAlign = 'left';
}
