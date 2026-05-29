// @ts-ignore
import type { GameState, Brick, Ball, Paddle, PowerUp, Particle } from './types';
import * as C from './constants';

const ASSETS: Record<string, HTMLImageElement> = {};
let assetsLoaded = false;

function loadAssets() {
  if (assetsLoaded) return;
  const paddleImg = new Image();
  paddleImg.src = '/assets/paddle.png';
  ASSETS.paddle = paddleImg;

  const brickNormalImg = new Image();
  brickNormalImg.src = '/assets/brick_normal.png';
  ASSETS.brick_normal = brickNormalImg;

  assetsLoaded = true;
}

/** Draw the entire game state onto the canvas */
export function render(ctx: CanvasRenderingContext2D, state: GameState) {
  loadAssets();
  const W = C.CANVAS_WIDTH;
  const H = C.CANVAS_HEIGHT;

  // ── Background ──
  ctx.fillStyle = C.COLORS.BG;
  ctx.fillRect(0, 0, W, H);

  // Subtle grid lines
  ctx.strokeStyle = 'rgba(30,58,138,0.15)';
  ctx.lineWidth = 1;
  for (let x = 0; x < W; x += 40) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
  }
  for (let y = 0; y < H; y += 40) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
  }

  // ── Shield ──
  if (state.shieldActive) {
    const grad = ctx.createLinearGradient(0, H - 12, 0, H);
    grad.addColorStop(0, 'rgba(0,82,255,0.0)');
    grad.addColorStop(1, 'rgba(0,82,255,0.6)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, H - 12, W, 12);
    // Glow line
    ctx.strokeStyle = 'rgba(59,130,246,0.8)';
    ctx.lineWidth = 2;
    ctx.shadowColor = '#3B82F6';
    ctx.shadowBlur = 12;
    ctx.beginPath(); ctx.moveTo(0, H - 6); ctx.lineTo(W, H - 6); ctx.stroke();
    ctx.shadowBlur = 0;
  }

  // ── Bricks ──
  for (const b of state.bricks) {
    if (!b.active) continue;
    drawBrick(ctx, b);
  }

  // ── PowerUps ──
  for (const p of state.powerUps) {
    if (!p.active) continue;
    drawPowerUp(ctx, p);
  }

  // ── Lasers ──
  for (const l of state.lasers) {
    if (!l.active) continue;
    ctx.fillStyle = '#EC4899';
    ctx.shadowColor = '#EC4899';
    ctx.shadowBlur = 8;
    ctx.fillRect(l.x, l.y, l.w, l.h);
    ctx.shadowBlur = 0;
  }

  // ── Paddle ──
  drawPaddle(ctx, state.paddle);

  // ── Balls ──
  for (const b of state.balls) {
    if (!b.active) continue;
    drawBall(ctx, b);
  }

  // ── Particles ──
  for (const p of state.particles) {
    const alpha = p.life / (p.maxLife || 30);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, (p.r || 3) * alpha, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawBrick(ctx: CanvasRenderingContext2D, b: Brick) {
  const colors: Record<string, string> = {
    NORMAL: C.COLORS.BRICK_NORMAL,
    STRONG: C.COLORS.BRICK_STRONG,
    CRACKED: C.COLORS.BRICK_CRACKED,
    GOLDEN: C.COLORS.BRICK_GOLDEN,
    BOMB: C.COLORS.BRICK_BOMB,
    UNBREAKABLE: C.COLORS.BRICK_UNBREAKABLE,
  };
  const color = colors[b.type] || C.COLORS.BRICK_NORMAL;

  if (b.type === 'NORMAL' && ASSETS.brick_normal?.complete) {
    ctx.drawImage(ASSETS.brick_normal, b.x, b.y, b.w, b.h);
    return;
  }

  // Shadow/glow for special bricks
  if (b.type === 'GOLDEN' || b.type === 'BOMB') {
    ctx.shadowColor = color;
    ctx.shadowBlur = 10;
  }

  // Main brick body
  ctx.fillStyle = color;
  roundRect(ctx, b.x, b.y, b.w, b.h, 4);
  ctx.fill();

  // Highlight on top edge
  ctx.fillStyle = 'rgba(255,255,255,0.15)';
  roundRect(ctx, b.x, b.y, b.w, b.h / 3, 4);
  ctx.fill();

  ctx.shadowBlur = 0;

  // Crack lines for CRACKED type
  if (b.type === 'CRACKED') {
    ctx.strokeStyle = 'rgba(0,0,0,0.5)';
    ctx.lineWidth = 1.5;
    const cx = b.x + b.w / 2, cy = b.y + b.h / 2;
    ctx.beginPath();
    ctx.moveTo(cx - 8, cy - 5); ctx.lineTo(cx, cy); ctx.lineTo(cx + 6, cy - 7);
    ctx.moveTo(cx, cy); ctx.lineTo(cx - 4, cy + 6);
    ctx.stroke();
  }

  // Bomb icon
  if (b.type === 'BOMB') {
    ctx.fillStyle = '#FCA5A5';
    ctx.font = 'bold 12px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('💣', b.x + b.w / 2, b.y + b.h / 2);
  }

  // Border
  ctx.strokeStyle = 'rgba(0,0,0,0.3)';
  ctx.lineWidth = 1;
  roundRect(ctx, b.x, b.y, b.w, b.h, 4);
  ctx.stroke();
}

function drawPaddle(ctx: CanvasRenderingContext2D, p: Paddle) {
  if (ASSETS.paddle?.complete) {
    ctx.drawImage(ASSETS.paddle, p.x - 10, p.y - 10, p.w + 20, p.h + 20); // add padding because of glow in PNG
  } else {
    // Glow
    ctx.shadowColor = C.COLORS.PADDLE_GLOW;
    ctx.shadowBlur = 18;

    // Main body
    const grad = ctx.createLinearGradient(p.x, p.y, p.x, p.y + p.h);
    grad.addColorStop(0, '#3B82F6');
    grad.addColorStop(0.5, C.COLORS.PADDLE);
    grad.addColorStop(1, '#1E3A8A');
    ctx.fillStyle = grad;
    roundRect(ctx, p.x, p.y, p.w, p.h, 6);
    ctx.fill();

    // Highlight
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    roundRect(ctx, p.x + 4, p.y + 1, p.w - 8, p.h / 3, 3);
    ctx.fill();

    ctx.shadowBlur = 0;
  }

  // Laser indicators
  if (p.hasLaser) {
    ctx.fillStyle = '#EC4899';
    ctx.shadowColor = '#EC4899';
    ctx.shadowBlur = 6;
    ctx.beginPath(); ctx.arc(p.x + 6, p.y + p.h / 2, 3, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(p.x + p.w - 6, p.y + p.h / 2, 3, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;
  }
}

function drawBall(ctx: CanvasRenderingContext2D, b: Ball) {
  const color = b.isFireball ? C.COLORS.FIREBALL : C.COLORS.BALL;
  const glowColor = b.isFireball ? C.COLORS.FIREBALL_GLOW : 'rgba(224,242,254,0.6)';

  ctx.shadowColor = glowColor;
  ctx.shadowBlur = b.isFireball ? 20 : 12;

  const grad = ctx.createRadialGradient(b.x - 2, b.y - 2, 0, b.x, b.y, b.r);
  grad.addColorStop(0, '#FFFFFF');
  grad.addColorStop(0.6, color);
  grad.addColorStop(1, b.isFireball ? '#7C2D12' : '#0369A1');

  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
  ctx.fill();

  ctx.shadowBlur = 0;
}

function drawPowerUp(ctx: CanvasRenderingContext2D, p: PowerUp) {
  const colorMap = C.COLORS.POWERUP_COLORS;
  const color = colorMap[p.type] || '#10B981';

  ctx.shadowColor = color;
  ctx.shadowBlur = 10;

  // Circle
  const cx = p.x + p.w / 2;
  const cy = p.y + p.h / 2;
  const r = p.w / 2;

  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();

  // Inner circle
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  ctx.beginPath();
  ctx.arc(cx, cy - 2, r * 0.5, 0, Math.PI * 2);
  ctx.fill();

  // Symbol
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#FFF';
  ctx.font = 'bold 11px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const symbols: Record<string, string> = {
    BIG_PADDLE: '↔',
    MULTI_BALL: '×3',
    SLOW_BALL: '🐢',
    EXTRA_LIFE: '♥',
    LASER_PADDLE: '⚡',
    FIRE_BALL: '🔥',
    SHIELD: '🛡',
  };
  ctx.fillText(symbols[p.type] || '?', cx, cy);
}

/** Rounded rectangle helper */
function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}
