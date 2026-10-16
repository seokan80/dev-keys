/** 왼손 새끼(lp) ~ 엄지(lt), 오른손 엄지(rt) ~ 새끼(rp) */
export const FINGERS = ['lp', 'lr', 'lm', 'li', 'lt', 'rt', 'ri', 'rm', 'rr', 'rp'] as const;
export type Finger = (typeof FINGERS)[number];
export type Hand = 'left' | 'right';

export const FINGER_NAMES: Record<Finger, string> = {
  lp: '왼손 새끼',
  lr: '왼손 약지',
  lm: '왼손 중지',
  li: '왼손 검지',
  lt: '왼손 엄지',
  rt: '오른손 엄지',
  ri: '오른손 검지',
  rm: '오른손 중지',
  rr: '오른손 약지',
  rp: '오른손 새끼',
};

export const handOf = (finger: Finger): Hand => (finger.startsWith('l') ? 'left' : 'right');
