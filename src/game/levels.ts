import type { BrickType, Brick } from './types';
import {
  BRICK_WIDTH,
  BRICK_HEIGHT,
  BRICK_GAP,
  BRICK_OFFSET_TOP,
  BRICK_COLS,
  CANVAS_WIDTH,
} from './constants';

// ── Level Layouts ──────────────────────────────────────────────────────
const LEVELS: string[][] = [
  // Level 1 – Basic tutorial
  [
    'NNNNNNNNNN',
    '..........',
    'NNNNNNNNNN',
  ],

  // Level 2 – More rows
  [
    'NNNNNNNNNN',
    'NNNNNNNNNN',
    'N.N.N.N.N.',
    'NNNNNNNNNN',
    'NNNNNNNNNN',
  ],

  // Level 3 – Strong bricks
  [
    'SSSSSSSSSS',
    'NNNNNNNNNN',
    'NNNNNNNNNN',
    'SSSSSSSSSS',
    'NNNNNNNNNN',
  ],

  // Level 4 – Angled with gaps and strong
  [
    'S.N.S.N.S.',
    '.N.S.N.S.N',
    'S.S.S.S.S.',
    '.S.N.S.N.S',
    'N.N.S.N.N.',
    'SSSSSSSSSS',
  ],

  // Level 5 – Golden boss
  [
    'UU.NNNN.UU',
    'U.SSSSSS.U',
    '..SGGGSS..',
    'U.SSSSSS.U',
    'UU.NNNN.UU',
    'SSSSSSSSSS',
  ],

  // Level 6 – Bomb bricks chaos
  [
    'NNBNNNBNNN',
    'SSBSSSSBSS',
    'NNBNNNBNNN',
    'SSBSSSSBSS',
    'NNBNNNBNNN',
    'SSSSSSSSSS',
  ],

  // Level 7 – Fortress pattern
  [
    'UU.SSSS.UU',
    'U.SS..SS.U',
    'U.SSSSSS.U',
    'N.NN..NN.N',
    'SSNNNNNNSS',
    'SSSSSSSSSS',
    'UU......UU',
  ],

  // Level 8 – Mixed strong + bomb + unbreakable
  [
    'SBSBSBSBSB',
    'UUNNNNNNUU',
    'BSBSBSBSBS',
    'UUUUNNUUUU',
    'SBSBSBSBSB',
    'SSSSSSSSSS',
    'BSBSBSBSBS',
  ],

  // Level 9 – Fast challenge
  [
    'UU..NN..UU',
    'U.SNNS.U..',
    '..NGGGGNN.',
    'U.SNNS.U..',
    'UU..NN..UU',
    'SSSSSSSSSS',
    'N.N.N.N.N.',
    'SSSSSSSSSS',
  ],

  // Level 10 – Final boss wall
  [
    'UUUUUUUUUU',
    'USBGNNGBSU',
    'USNNGGNNSU',
    'USBGNNGBSU',
    'USSSSSSSSU',
    'UNNNNNNNNU',
    'USSSSSSSSU',
    'UUUUUUUUUU',
  ],
];

const CHAR_TO_TYPE: Record<string, BrickType> = {
  N: 'NORMAL',
  S: 'STRONG',
  G: 'GOLDEN',
  B: 'BOMB',
  U: 'UNBREAKABLE',
};

function hpForType(type: BrickType): number {
  switch (type) {
    case 'NORMAL':      return 1;
    case 'STRONG':      return 2;
    case 'GOLDEN':      return 5;
    case 'BOMB':        return 1;
    case 'UNBREAKABLE': return 9999;
    default:            return 1;
  }
}

export function buildLevel(level: number): Brick[] {
  const index = Math.min(Math.max(level, 1), LEVELS.length) - 1;
  const layout = LEVELS[index];

  const totalGridWidth = BRICK_COLS * (BRICK_WIDTH + BRICK_GAP) - BRICK_GAP;
  const offsetX = (CANVAS_WIDTH - totalGridWidth) / 2;

  const bricks: Brick[] = [];

  for (let row = 0; row < layout.length; row++) {
    const line = layout[row];
    for (let col = 0; col < line.length; col++) {
      const ch = line[col];
      if (ch === '.') continue;

      const type = CHAR_TO_TYPE[ch];
      if (type === undefined) continue;

      const hp = hpForType(type);

      bricks.push({
        x: offsetX + col * (BRICK_WIDTH + BRICK_GAP),
        y: BRICK_OFFSET_TOP + row * (BRICK_HEIGHT + BRICK_GAP),
        w: BRICK_WIDTH,
        h: BRICK_HEIGHT,
        type,
        hp,
        maxHp: hp,
        active: true,
      });
    }
  }

  return bricks;
}
