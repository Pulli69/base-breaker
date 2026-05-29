import { useRef, useEffect, useCallback } from 'react';
import type { GameState } from './types';
import * as C from './constants';
import {
  createInitialState,
  launchBall,
  movePaddleTo,
  movePaddleByKeys,
  tick,
  fireLaser,
  isLevelClear,
  isGameOver,
  advanceLevel,
} from './engine';
import { render } from './renderer';
import * as audio from './audio';

interface GameCanvasProps {
  level: number;
  onScoreChange: (score: number) => void;
  onLivesChange: (lives: number) => void;
  onLevelChange: (level: number) => void;
  onEffectsChange: (effects: { type: string; remaining: number }[]) => void;
  onGameOver: (score: number, level: number) => void;
  onVictory: (score: number) => void;
  paused: boolean;
}

export const GameCanvas: React.FC<GameCanvasProps> = ({
  level,
  onScoreChange,
  onLivesChange,
  onLevelChange,
  onEffectsChange,
  onGameOver,
  onVictory,
  paused,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<GameState>(createInitialState(level));
  const keysRef = useRef<Set<string>>(new Set());
  const pausedRef = useRef(paused);
  const gameOverRef = useRef(false);
  const frameRef = useRef(0);
  const laserCooldownRef = useRef(0);

  pausedRef.current = paused;

  // ── Sync UI callbacks ──
  const syncUI = useCallback((s: GameState) => {
    onScoreChange(s.score);
    onLivesChange(s.lives);
    onLevelChange(s.level);
    const now = Date.now();
    onEffectsChange(
      s.effects.map((e) => ({
        type: e.type,
        remaining: Math.max(0, Math.ceil((e.endsAt - now) / 1000)),
      }))
    );
  }, [onScoreChange, onLivesChange, onLevelChange, onEffectsChange]);

  // ── Initialize / reset on level change ──
  useEffect(() => {
    if (stateRef.current.level !== level) {
      stateRef.current = createInitialState(level);
      gameOverRef.current = false;
      syncUI(stateRef.current);
    }
  }, [level, syncUI]);

  // ── Background music ──
  useEffect(() => {
    audio.playBackgroundMusic();
    return () => {
      audio.stopBackgroundMusic();
    };
  }, []);

  // ── Keyboard listeners ──
  useEffect(() => {
    const onDown = (e: KeyboardEvent) => {
      keysRef.current.add(e.code);
      // Launch ball on Space or ArrowUp
      if (e.code === 'Space' || e.code === 'ArrowUp') {
        if (stateRef.current.waiting) {
          stateRef.current = launchBall(stateRef.current);
        }
      }
    };
    const onUp = (e: KeyboardEvent) => keysRef.current.delete(e.code);
    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup', onUp);
    return () => {
      window.removeEventListener('keydown', onDown);
      window.removeEventListener('keyup', onUp);
    };
  }, []);

  // ── Mouse / touch ──
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const getX = (clientX: number) => {
      const rect = canvas.getBoundingClientRect();
      return ((clientX - rect.left) / rect.width) * C.CANVAS_WIDTH;
    };

    const onMouseMove = (e: MouseEvent) => {
      stateRef.current = movePaddleTo(stateRef.current, getX(e.clientX));
    };
    const onClick = () => {
      if (stateRef.current.waiting) {
        stateRef.current = launchBall(stateRef.current);
      }
    };
    const onTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      if (e.touches.length > 0) {
        stateRef.current = movePaddleTo(stateRef.current, getX(e.touches[0].clientX));
      }
    };
    const onTouchStart = (e: TouchEvent) => {
      if (stateRef.current.waiting) {
        stateRef.current = launchBall(stateRef.current);
      }
      if (e.touches.length > 0) {
        stateRef.current = movePaddleTo(stateRef.current, getX(e.touches[0].clientX));
      }
    };

    canvas.addEventListener('mousemove', onMouseMove);
    canvas.addEventListener('click', onClick);
    canvas.addEventListener('touchmove', onTouchMove, { passive: false });
    canvas.addEventListener('touchstart', onTouchStart, { passive: true });
    return () => {
      canvas.removeEventListener('mousemove', onMouseMove);
      canvas.removeEventListener('click', onClick);
      canvas.removeEventListener('touchmove', onTouchMove);
      canvas.removeEventListener('touchstart', onTouchStart);
    };
  }, []);

  // ── Game loop ──
  useEffect(() => {
    let rafId: number;

    const loop = () => {
      rafId = requestAnimationFrame(loop);

      if (pausedRef.current || gameOverRef.current) {
        // Still render so the screen isn't blank
        const canvas = canvasRef.current;
        if (canvas) {
          const ctx = canvas.getContext('2d');
          if (ctx) render(ctx, stateRef.current);
        }
        return;
      }

      let s = stateRef.current;

      // Keyboard paddle
      const left = keysRef.current.has('ArrowLeft') || keysRef.current.has('KeyA');
      const right = keysRef.current.has('ArrowRight') || keysRef.current.has('KeyD');
      if (left || right) {
        s = movePaddleByKeys(s, left, right);
      }

      // Laser auto-fire
      if (s.paddle.hasLaser) {
        laserCooldownRef.current++;
        if (laserCooldownRef.current >= 12) {
          s = fireLaser(s);
          laserCooldownRef.current = 0;
        }
      }

      // Tick physics
      s = tick(s);
      
      // Process audio events
      for (const ev of (s.events || [])) {
        switch (ev) {
          case 'HIT_WALL': audio.playWallHit(); break;
          case 'HIT_PADDLE': audio.playPaddleHit(); break;
          case 'HIT_BRICK': audio.playBrickHit(); break;
          case 'BREAK_BRICK': audio.playBrickBreak(); break;
          case 'POWERUP': audio.playPowerUp(); break;
        }
      }

      stateRef.current = s;

      // Check game over
      if (isGameOver(s)) {
        gameOverRef.current = true;
        audio.playGameOver();
        onGameOver(s.score, s.level);
      }

      // Check level clear
      if (isLevelClear(s) && !gameOverRef.current) {
        if (s.level >= 10) {
          gameOverRef.current = true;
          audio.playVictory();
          onVictory(s.score);
        } else {
          stateRef.current = advanceLevel(s);
          syncUI(stateRef.current);
        }
      }

      // Sync UI every 6 frames to avoid excessive re-renders
      frameRef.current++;
      if (frameRef.current % 6 === 0) {
        syncUI(s);
      }

      // Render
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) render(ctx, s);
      }
    };

    rafId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafId);
  }, [onGameOver, onVictory, syncUI]);

  return (
    <canvas
      ref={canvasRef}
      width={C.CANVAS_WIDTH}
      height={C.CANVAS_HEIGHT}
      className="w-full max-w-[800px] aspect-[4/3] rounded-xl border-2 border-blue-500/40"
      style={{
        touchAction: 'none',
        cursor: 'none',
        boxShadow: '0 0 30px rgba(0,82,255,0.25), inset 0 0 60px rgba(0,10,40,0.5)',
      }}
    />
  );
};
