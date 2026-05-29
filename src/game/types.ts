export type GameScreen = 'HOME' | 'PLAYING' | 'GAME_OVER' | 'VICTORY' | 'LEADERBOARD';
export type BrickType = 'NORMAL' | 'STRONG' | 'CRACKED' | 'GOLDEN' | 'BOMB' | 'UNBREAKABLE';
export type PowerUpType = 'BIG_PADDLE' | 'MULTI_BALL' | 'SLOW_BALL' | 'EXTRA_LIFE' | 'LASER_PADDLE' | 'FIRE_BALL' | 'SHIELD';
export type PowerUpTypeValue = PowerUpType;

export interface Vec2 { x: number; y: number; }

export interface Ball {
  x: number; y: number; r: number;
  vx: number; vy: number;
  isFireball: boolean;
  active: boolean;
}

export interface Paddle {
  x: number; y: number;
  w: number; h: number;
  hasLaser: boolean;
}

export interface Brick {
  x: number; y: number; w: number; h: number;
  type: BrickType;
  hp: number; maxHp: number;
  active: boolean;
}

export interface PowerUp {
  x: number; y: number; w: number; h: number;
  type: PowerUpType;
  vy: number;
  active: boolean;
}

export interface Laser {
  x: number; y: number; w: number; h: number;
  vy: number; active: boolean;
}

export interface ActiveEffect {
  type: PowerUpType;
  endsAt: number;
}

export interface Particle {
  x: number; y: number;
  vx: number; vy: number;
  life: number;
  maxLife?: number;
  r?: number;
  color: string;
}

export interface GameState {
  score: number;
  lives: number;
  level: number;
  waiting: boolean; // true = ball stuck to paddle waiting for launch
  shieldActive: boolean;
  balls: Ball[];
  paddle: Paddle;
  bricks: Brick[];
  powerUps: PowerUp[];
  lasers: Laser[];
  effects: ActiveEffect[];
  particles: Particle[];
  events: string[];
}
