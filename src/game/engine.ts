import type {
  GameState, Ball, Paddle, PowerUp, Laser,
  Particle, PowerUpType
} from './types';
import * as C from './constants';
import { buildLevel } from './levels';

// ─── Collision Helpers ───────────────────────────────────────────────

/** Standard circle-vs-AABB collision check using nearest-point distance. */
function circleRectCollision(
  cx: number, cy: number, r: number,
  rx: number, ry: number, rw: number, rh: number,
): boolean {
  const nearestX = Math.max(rx, Math.min(cx, rx + rw));
  const nearestY = Math.max(ry, Math.min(cy, ry + rh));
  const dx = cx - nearestX;
  const dy = cy - nearestY;
  return dx * dx + dy * dy <= r * r;
}

/** Standard AABB overlap test for two rectangles. */
function rectOverlap(
  r1: { x: number; y: number; w: number; h: number },
  r2: { x: number; y: number; w: number; h: number },
): boolean {
  return (
    r1.x < r2.x + r2.w &&
    r1.x + r1.w > r2.x &&
    r1.y < r2.y + r2.h &&
    r1.y + r1.h > r2.y
  );
}

// ─── Power-Up Spawning ──────────────────────────────────────────────

/** Weighted random power-up selection and spawn. */
function spawnPowerUp(x: number, y: number): PowerUp {
  // Weighted table: BIG_PADDLE 25, MULTI_BALL 25, SLOW_BALL 20,
  // LASER_PADDLE 15, EXTRA_LIFE 5, FIRE_BALL 5, SHIELD 5  (total 100)
  const weights: [PowerUpType, number][] = [
    ['BIG_PADDLE' as PowerUpType, 25],
    ['MULTI_BALL' as PowerUpType, 25],
    ['SLOW_BALL' as PowerUpType, 20],
    ['LASER_PADDLE' as PowerUpType, 15],
    ['EXTRA_LIFE' as PowerUpType, 5],
    ['FIRE_BALL' as PowerUpType, 5],
    ['SHIELD' as PowerUpType, 5],
  ];

  const roll = Math.random() * 100;
  let cumulative = 0;
  let chosen: PowerUpType = 'BIG_PADDLE';
  for (const [type, weight] of weights) {
    cumulative += weight;
    if (roll < cumulative) {
      chosen = type;
      break;
    }
  }

  return {
    x: x - C.POWERUP_SIZE / 2,
    y,
    w: C.POWERUP_SIZE,
    h: C.POWERUP_SIZE,
    type: chosen,
    vy: C.POWERUP_SPEED,
    active: true,
  };
}

// ─── Particle Helpers ───────────────────────────────────────────────

/** Colour lookup for each brick type (used for particles). */
function brickColor(type: string): string {
  switch (type) {
    case 'STRONG':   return '#e67e22';
    case 'GOLDEN':   return '#f1c40f';
    case 'BOMB':     return '#e74c3c';
    case 'CRACKED':  return '#d4a056';
    case 'UNBREAKABLE': return '#7f8c8d';
    default:         return '#3498db'; // NORMAL
  }
}

/** Spawn a burst of particles at the given position. */
function spawnParticles(x: number, y: number, color: string, count: number = 5): Particle[] {
  const particles: Particle[] = [];
  for (let i = 0; i < count; i++) {
    particles.push({
      x,
      y,
      vx: (Math.random() - 0.5) * 6,
      vy: (Math.random() - 0.5) * 6,
      life: 30,
      maxLife: 30,
      r: 3,
      color,
    });
  }
  return particles;
}

// ─── State Constructors ─────────────────────────────────────────────

/** Creates a fresh game state for the given level. */
export function createInitialState(level: number = 1): GameState {
  const paddleX = C.CANVAS_WIDTH / 2 - C.PADDLE_WIDTH / 2;
  const paddleY = C.CANVAS_HEIGHT - C.PADDLE_Y_OFFSET;

  const paddle: Paddle = {
    x: paddleX,
    y: paddleY,
    w: C.PADDLE_WIDTH,
    h: C.PADDLE_HEIGHT,
    hasLaser: false,
  };

  const ball: Ball = {
    x: paddleX + C.PADDLE_WIDTH / 2,
    y: paddleY - C.BALL_RADIUS,
    vx: 0,
    vy: 0,
    r: C.BALL_RADIUS,
    isFireball: false,
    active: true,
  };

  return {
    score: 0,
    lives: C.MAX_LIVES,
    level,
    waiting: true,
    paddle,
    balls: [ball],
    bricks: buildLevel(level),
    powerUps: [],
    lasers: [],
    effects: [],
    particles: [],
    shieldActive: false,
    events: [],
  };
}

/** Reset to a single ball sitting on top of the paddle. */
export function resetBallOnPaddle(state: GameState): GameState {
  const ball: Ball = {
    x: state.paddle.x + state.paddle.w / 2,
    y: state.paddle.y - C.BALL_RADIUS,
    vx: 0,
    vy: 0,
    r: C.BALL_RADIUS,
    isFireball: false,
    active: true,
  };
  return { ...state, balls: [ball], waiting: true, events: [] };
}

// ─── Player Actions ─────────────────────────────────────────────────

/** Launch the ball from the paddle with a slight random angle. */
export function launchBall(state: GameState): GameState {
  if (!state.waiting) return state;

  const balls = state.balls.map((b, i) => {
    if (i === 0) {
      return {
        ...b,
        vx: C.BALL_SPEED_BASE * (0.5 + Math.random() * 0.5) * (Math.random() > 0.5 ? 1 : -1),
        vy: -(C.BALL_SPEED_BASE + state.level * 0.6),
      };
    }
    return b;
  });

  return { ...state, balls, waiting: false };
}

/** Move the paddle so its centre aligns with targetX (clamped). */
export function movePaddleTo(state: GameState, targetX: number): GameState {
  const halfW = state.paddle.w / 2;
  const clampedCenter = Math.max(halfW, Math.min(targetX, C.CANVAS_WIDTH - halfW));
  const newX = clampedCenter - halfW;

  const paddle: Paddle = { ...state.paddle, x: newX };

  // If waiting, the ball sticks to the paddle
  let balls = state.balls;
  if (state.waiting) {
    balls = balls.map((b) => ({
      ...b,
      x: newX + paddle.w / 2,
      y: paddle.y - b.r,
    }));
  }

  return { ...state, paddle, balls };
}

/** Move the paddle by keyboard input (left / right arrows). */
export function movePaddleByKeys(state: GameState, left: boolean, right: boolean): GameState {
  let dx = 0;
  if (left) dx -= C.PADDLE_SPEED;
  if (right) dx += C.PADDLE_SPEED;
  if (dx === 0) return state;

  const newX = Math.max(0, Math.min(state.paddle.x + dx, C.CANVAS_WIDTH - state.paddle.w));
  const paddle: Paddle = { ...state.paddle, x: newX };

  let balls = state.balls;
  if (state.waiting) {
    balls = balls.map((b) => ({
      ...b,
      x: newX + paddle.w / 2,
      y: paddle.y - b.r,
    }));
  }

  return { ...state, paddle, balls };
}

/** Fire a laser bolt from the paddle centre (if laser is active). */
export function fireLaser(state: GameState): GameState {
  if (!state.paddle.hasLaser) return state;

  const laser: Laser = {
    x: state.paddle.x + state.paddle.w / 2 - 2,
    y: state.paddle.y,
    w: 4,
    h: 10,
    vy: -12,
    active: true,
  };

  return { ...state, lasers: [...state.lasers, laser] };
}

// ─── Level / Game-Over Queries ──────────────────────────────────────

/** True when every breakable brick has been destroyed. */
export function isLevelClear(state: GameState): boolean {
  return state.bricks.every(
    (b) => !b.active || b.type === 'UNBREAKABLE',
  );
}

/** True when the player has no lives remaining and no active balls. */
export function isGameOver(state: GameState): boolean {
  return state.lives <= 0 && state.balls.every((b) => !b.active);
}

/** Advance to the next level, keeping score and lives. */
export function advanceLevel(state: GameState): GameState {
  const nextLevel = state.level + 1;

  const paddle: Paddle = {
    ...state.paddle,
    w: C.PADDLE_WIDTH,
    hasLaser: false,
    x: C.CANVAS_WIDTH / 2 - C.PADDLE_WIDTH / 2,
    y: C.CANVAS_HEIGHT - C.PADDLE_Y_OFFSET,
  };

  const ball: Ball = {
    x: paddle.x + paddle.w / 2,
    y: paddle.y - C.BALL_RADIUS,
    vx: 0,
    vy: 0,
    r: C.BALL_RADIUS,
    isFireball: false,
    active: true,
  };

  return {
    ...state,
    level: nextLevel,
    waiting: true,
    paddle,
    balls: [ball],
    bricks: buildLevel(nextLevel),
    powerUps: [],
    lasers: [],
    effects: [],
    particles: [],
    shieldActive: false,
    events: [],
  };
}

// ─── Main Tick ──────────────────────────────────────────────────────

/**
 * The heart of the game: advance the simulation by one frame.
 * All state updates are immutable (spread-based).
 */
export function tick(state: GameState): GameState {
  if (state.waiting) return state;

  let {
    balls, bricks, paddle, powerUps, lasers, effects, particles,
    score, lives, shieldActive,
  } = state;

  // We'll accumulate new particles here
  let newParticles: Particle[] = [];
  let events: string[] = [];

  // ── 1 & 2 & 3. Ball movement + wall collisions + bottom edge ──
  balls = balls.map((ball) => {
    if (!ball.active) return ball;

    let { x, y, vx, vy } = ball;
    x += vx;
    y += vy;

    // Left / right wall bounce
    if (x - ball.r < 0) {
      x = ball.r;
      vx = Math.abs(vx);
      events.push('HIT_WALL');
    } else if (x + ball.r > C.CANVAS_WIDTH) {
      x = C.CANVAS_WIDTH - ball.r;
      vx = -Math.abs(vx);
      events.push('HIT_WALL');
    }

    // Top wall bounce
    if (y - ball.r < 0) {
      y = ball.r;
      vy = Math.abs(vy);
      events.push('HIT_WALL');
    }

    return { ...ball, x, y, vx, vy };
  });

  // Bottom-edge handling (separate pass so we can mutate shieldActive once)
  balls = balls.map((ball) => {
    if (!ball.active) return ball;
    if (ball.y + ball.r > C.CANVAS_HEIGHT) {
      if (shieldActive) {
        // Bounce off the shield
        shieldActive = false;
        effects = effects.filter((e) => e.type !== 'SHIELD');
        return { ...ball, y: C.CANVAS_HEIGHT - ball.r, vy: -Math.abs(ball.vy) };
      }
      // Ball lost
      return { ...ball, active: false };
    }
    return ball;
  });

  // ── 4. Paddle collision ────────────────────────────────────────
  balls = balls.map((ball) => {
    if (!ball.active) return ball;
    if (!circleRectCollision(ball.x, ball.y, ball.r, paddle.x, paddle.y, paddle.w, paddle.h)) {
      return ball;
    }

    // Position ball just above the paddle
    events.push('HIT_PADDLE');
    const newY = paddle.y - ball.r;

    // Hit-point determines bounce angle (-1 = left edge, +1 = right edge)
    const hitPoint = (ball.x - (paddle.x + paddle.w / 2)) / (paddle.w / 2);
    const angle = hitPoint * (Math.PI / 3); // max 60°
    const speed = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);

    let newVx = speed * Math.sin(angle);
    let newVy = -speed * Math.cos(angle);

    // Anti-loop: prevent near-horizontal bouncing
    if (Math.abs(newVy) < 1.5) {
      newVy = newVy < 0 ? -1.5 : 1.5;
    }

    return { ...ball, y: newY, vx: newVx, vy: newVy };
  });

  // ── 5. Brick collision ─────────────────────────────────────────
  balls = balls.map((ball) => {
    if (!ball.active) return ball;

    for (let i = 0; i < bricks.length; i++) {
      const brick = bricks[i];
      if (!brick.active) continue;
      if (!circleRectCollision(ball.x, ball.y, ball.r, brick.x, brick.y, brick.w, brick.h)) {
        continue;
      }

      // ── Bounce direction (skip for fireballs – they blast through) ──
      let newVx = ball.vx;
      let newVy = ball.vy;

      if (!ball.isFireball) {
        // Overlap from each side
        const overlapLeft   = (ball.x + ball.r) - brick.x;
        const overlapRight  = (brick.x + brick.w) - (ball.x - ball.r);
        const overlapTop    = (ball.y + ball.r) - brick.y;
        const overlapBottom = (brick.y + brick.h) - (ball.y - ball.r);

        const minOverlapX = Math.min(overlapLeft, overlapRight);
        const minOverlapY = Math.min(overlapTop, overlapBottom);

        if (minOverlapX < minOverlapY) {
          newVx = -newVx; // side bounce
        } else {
          newVy = -newVy; // top/bottom bounce
        }
      }

      // ── Brick damage ──
      let updatedBrick = { ...brick };

      if (ball.isFireball && updatedBrick.type !== 'UNBREAKABLE') {
        updatedBrick.hp = 0;
      } else if (updatedBrick.type !== 'UNBREAKABLE') {
        updatedBrick.hp -= 1;
      }

      // Check if brick is destroyed
      if (updatedBrick.hp <= 0 && updatedBrick.type !== 'UNBREAKABLE') {
        events.push('BREAK_BRICK');
        updatedBrick.active = false;

        // Score per type
        const scoreMap: Record<string, number> = {
          NORMAL: 10, STRONG: 20, GOLDEN: 50, BOMB: 10, CRACKED: 20,
        };
        score += scoreMap[updatedBrick.type] ?? 10;

        // Particles burst
        newParticles.push(...spawnParticles(
          brick.x + brick.w / 2,
          brick.y + brick.h / 2,
          brickColor(updatedBrick.type),
        ));

        // BOMB explosion
        if (updatedBrick.type === 'BOMB') {
          const cx = brick.x + brick.w / 2;
          const cy = brick.y + brick.h / 2;
          bricks = bricks.map((b) => {
            if (!b.active || b.type === 'UNBREAKABLE') return b;
            const bx = b.x + b.w / 2;
            const by = b.y + b.h / 2;
            const dist = Math.sqrt((bx - cx) ** 2 + (by - cy) ** 2);
            if (dist < 120) {
              score += 10;
              newParticles.push(...spawnParticles(bx, by, brickColor(b.type)));
              return { ...b, hp: 0, active: false };
            }
            return b;
          });
        }

        // Random power-up drop (18% chance)
        if (Math.random() < 0.18) {
          powerUps = [
            ...powerUps,
            spawnPowerUp(brick.x + brick.w / 2, brick.y + brick.h / 2),
          ];
        }
      } else {
        if (updatedBrick.type === 'STRONG' && updatedBrick.hp === 1) {
          // Damaged STRONG brick becomes CRACKED visually
          updatedBrick.type = 'CRACKED';
        }
        if (updatedBrick.type !== 'UNBREAKABLE') {
          events.push('HIT_BRICK');
        }
      }

      // Write updated brick back
      bricks = bricks.map((b, idx) => (idx === i ? updatedBrick : b));

      // Only one brick collision per ball per frame
      return { ...ball, vx: newVx, vy: newVy };
    }

    return ball;
  });

  // ── 6. Power-up falling & collection ───────────────────────────
  const now = Date.now();

  powerUps = powerUps.map((pu) => {
    if (!pu.active) return pu;
    return { ...pu, y: pu.y + pu.vy };
  });

  powerUps = powerUps.map((pu) => {
    if (!pu.active) return pu;

    // Off-screen
    if (pu.y > C.CANVAS_HEIGHT) return { ...pu, active: false };

    // Paddle collection (rect-rect)
    if (rectOverlap(pu, paddle)) {
      events.push('POWERUP');
      // Apply effect
      switch (pu.type) {
        case 'BIG_PADDLE':
          paddle = { ...paddle, w: C.PADDLE_WIDTH * 1.6 };
          effects = [...effects, { type: 'BIG_PADDLE', endsAt: now + C.POWERUP_DURATION }];
          break;

        case 'MULTI_BALL': {
          const clones: Ball[] = [];
          balls.forEach((b) => {
            if (!b.active) return;
            const angle1 = Math.PI / 6;  // +30°
            const angle2 = -Math.PI / 6; // -30°
            clones.push({
              ...b,
              vx: b.vx * Math.cos(angle1) - b.vy * Math.sin(angle1),
              vy: b.vx * Math.sin(angle1) + b.vy * Math.cos(angle1),
            });
            clones.push({
              ...b,
              vx: b.vx * Math.cos(angle2) - b.vy * Math.sin(angle2),
              vy: b.vx * Math.sin(angle2) + b.vy * Math.cos(angle2),
            });
          });
          balls = [...balls, ...clones];
          break;
        }

        case 'SLOW_BALL':
          balls = balls.map((b) => ({ ...b, vx: b.vx * 0.6, vy: b.vy * 0.6 }));
          effects = [...effects, { type: 'SLOW_BALL', endsAt: now + C.POWERUP_DURATION }];
          break;

        case 'EXTRA_LIFE':
          lives += 1;
          break;

        case 'LASER_PADDLE':
          paddle = { ...paddle, hasLaser: true };
          effects = [...effects, { type: 'LASER_PADDLE', endsAt: now + C.POWERUP_DURATION }];
          break;

        case 'FIRE_BALL':
          balls = balls.map((b) => ({ ...b, isFireball: true }));
          effects = [...effects, { type: 'FIRE_BALL', endsAt: now + C.POWERUP_DURATION }];
          break;

        case 'SHIELD':
          shieldActive = true;
          effects = [...effects, { type: 'SHIELD', endsAt: now + C.POWERUP_DURATION }];
          break;
      }

      return { ...pu, active: false };
    }

    return pu;
  });

  // Remove inactive power-ups
  powerUps = powerUps.filter((pu) => pu.active);

  // ── 7. Laser update ────────────────────────────────────────────
  // Move lasers upward
  lasers = lasers.map((l) => {
    if (!l.active) return l;
    return { ...l, y: l.y + l.vy };
  });

  // Off-screen removal
  lasers = lasers.map((l) => {
    if (!l.active) return l;
    if (l.y + l.h < 0) return { ...l, active: false };
    return l;
  });

  // Laser-brick collision
  lasers = lasers.map((laser) => {
    if (!laser.active) return laser;

    for (let i = 0; i < bricks.length; i++) {
      const brick = bricks[i];
      if (!brick.active) continue;
      if (!rectOverlap(laser, brick)) continue;

      // Damage the brick
      let updatedBrick = { ...brick };

      if (updatedBrick.type !== 'UNBREAKABLE') {
        updatedBrick.hp -= 1;
      }

      if (updatedBrick.hp <= 0 && updatedBrick.type !== 'UNBREAKABLE') {
        events.push('BREAK_BRICK');
        updatedBrick.active = false;
        const scoreMap: Record<string, number> = {
          NORMAL: 10, STRONG: 20, GOLDEN: 50, BOMB: 10, CRACKED: 20,
        };
        score += scoreMap[updatedBrick.type] ?? 10;
        newParticles.push(...spawnParticles(
          brick.x + brick.w / 2,
          brick.y + brick.h / 2,
          brickColor(updatedBrick.type),
        ));

        // BOMB explosion from laser
        if (updatedBrick.type === 'BOMB') {
          const cx = brick.x + brick.w / 2;
          const cy = brick.y + brick.h / 2;
          bricks = bricks.map((b) => {
            if (!b.active || b.type === 'UNBREAKABLE') return b;
            const bx = b.x + b.w / 2;
            const by = b.y + b.h / 2;
            const dist = Math.sqrt((bx - cx) ** 2 + (by - cy) ** 2);
            if (dist < 120) {
              score += 10;
              newParticles.push(...spawnParticles(bx, by, brickColor(b.type)));
              return { ...b, hp: 0, active: false };
            }
            return b;
          });
        }

        // Power-up drop
        if (Math.random() < 0.18) {
          powerUps = [
            ...powerUps,
            spawnPowerUp(brick.x + brick.w / 2, brick.y + brick.h / 2),
          ];
        }
      } else if (updatedBrick.type === 'STRONG' && updatedBrick.hp === 1) {
        updatedBrick.type = 'CRACKED';
      }

      bricks = bricks.map((b, idx) => (idx === i ? updatedBrick : b));

      // Laser is consumed on hit
      return { ...laser, active: false };
    }

    return laser;
  });

  // Remove inactive lasers
  lasers = lasers.filter((l) => l.active);

  // ── 8. Effect expiry ───────────────────────────────────────────
  const expiredEffects = effects.filter((e) => now >= e.endsAt);
  effects = effects.filter((e) => now < e.endsAt);

  for (const effect of expiredEffects) {
    switch (effect.type) {
      case 'BIG_PADDLE':
        paddle = { ...paddle, w: C.PADDLE_WIDTH };
        break;
      case 'SLOW_BALL':
        // Restore speed (inverse of 0.6 multiplier)
        balls = balls.map((b) => ({ ...b, vx: b.vx / 0.6, vy: b.vy / 0.6 }));
        break;
      case 'FIRE_BALL':
        balls = balls.map((b) => ({ ...b, isFireball: false }));
        break;
      case 'LASER_PADDLE':
        paddle = { ...paddle, hasLaser: false };
        break;
      case 'SHIELD':
        shieldActive = false;
        break;
    }
  }

  // ── 9. Particle update ─────────────────────────────────────────
  particles = [
    ...particles.map((p) => ({
      ...p,
      x: p.x + p.vx,
      y: p.y + p.vy,
      life: p.life - 1,
    })).filter((p) => p.life > 0),
    ...newParticles,
  ];

  // ── 10. Dead balls / life loss ─────────────────────────────────
  balls = balls.filter((b) => b.active);

  let waiting: boolean = state.waiting;

  if (balls.length === 0) {
    lives -= 1;
    if (lives > 0) {
      // Reset ball on paddle
      const ball: Ball = {
        x: paddle.x + paddle.w / 2,
        y: paddle.y - C.BALL_RADIUS,
        vx: 0,
        vy: 0,
        r: C.BALL_RADIUS,
        isFireball: false,
        active: true,
      };
      balls = [ball];
      waiting = true;
    }
    // If lives <= 0, game over is checked externally
  }

  // ── 12. Anti-stuck: nudge balls with near-zero vertical speed ──
  balls = balls.map((b) => {
    if (b.active && Math.abs(b.vy) < 1) {
      return { ...b, vy: b.vy + (Math.random() - 0.5) * 2 };
    }
    return b;
  });

  return {
    ...state,
    balls,
    bricks,
    paddle,
    powerUps,
    lasers,
    effects,
    particles,
    score,
    lives,
    shieldActive,
    waiting,
    events,
  };
}
