// Simple Web Audio API Synthesizer for Arcade Sounds

let audioCtx: AudioContext | null = null;

function getCtx() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

function playTone(freq: number, type: OscillatorType, duration: number, vol = 0.1) {
  try {
    const ctx = getCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    
    // Quick envelope
    gain.gain.setValueAtTime(vol, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch (e) {
    // Ignore if audio fails or is blocked
  }
}

export function playPaddleHit() {
  playTone(220, 'square', 0.1, 0.1);
}

export function playWallHit() {
  playTone(330, 'square', 0.05, 0.05);
}

export function playBrickHit() {
  playTone(440, 'sine', 0.1, 0.1);
}

export function playBrickBreak() {
  try {
    const ctx = getCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = 'square';
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(110, ctx.currentTime + 0.15);
    
    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.start();
    osc.stop(ctx.currentTime + 0.15);
  } catch (e) {}
}

export function playPowerUp() {
  try {
    const ctx = getCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(440, ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(880, ctx.currentTime + 0.1);
    osc.frequency.linearRampToValueAtTime(1760, ctx.currentTime + 0.2);
    
    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.3);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.start();
    osc.stop(ctx.currentTime + 0.3);
  } catch (e) {}
}

export function playGameOver() {
  try {
    const ctx = getCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(300, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(50, ctx.currentTime + 1.0);
    
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 1.0);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.start();
    osc.stop(ctx.currentTime + 1.0);
  } catch (e) {}
}

export function playVictory() {
  try {
    const ctx = getCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = 'square';
    osc.frequency.setValueAtTime(440, ctx.currentTime);
    osc.frequency.setValueAtTime(554.37, ctx.currentTime + 0.2);
    osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.4);
    osc.frequency.setValueAtTime(880, ctx.currentTime + 0.6);
    
    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 1.0);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.start();
    osc.stop(ctx.currentTime + 1.0);
  } catch (e) {}
}

export function playClick() {
  playTone(600, 'sine', 0.05, 0.05);
}

// Background music player
let backgroundAudio: HTMLAudioElement | null = null;

export function playBackgroundMusic() {
  try {
    if (!backgroundAudio) {
      backgroundAudio = new Audio('/background-music.mp3');
      backgroundAudio.loop = true;
      backgroundAudio.volume = 0.05; // 5% volume
    }
    if (backgroundAudio.paused) {
      backgroundAudio.play().catch(e => console.log('Audio play failed:', e));
    }
  } catch (e) {
    console.log('Background music failed:', e);
  }
}

export function stopBackgroundMusic() {
  if (backgroundAudio && !backgroundAudio.paused) {
    backgroundAudio.pause();
    backgroundAudio.currentTime = 0;
  }
}
