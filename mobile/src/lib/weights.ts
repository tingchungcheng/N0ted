import { Answers, Tag, TAGS, TagWeights } from './types';

export interface Option {
  id: string;
  label: string;
  sub?: string;
  points: Partial<Record<Tag, number>>;
}
export interface Question {
  key: keyof Answers;
  kicker: string;
  title: string;
  multi?: number; // max selections
  options: Option[];
}

export const QUESTIONS: Question[] = [
  {
    key: 'q1',
    kicker: 'Morning',
    title: 'What do you want from your morning note?',
    options: [
      { id: 'spark', label: 'A spark to get going', sub: '点一把火', points: { inspiring: 2 } },
      { id: 'quiet', label: 'A moment of quiet', sub: '片刻安静', points: { calm: 2 } },
      { id: 'smile', label: 'A smile', sub: '会心一笑', points: { wit: 2 } },
      { id: 'warm', label: 'A warm thought', sub: '一点温暖', points: { love: 2 } },
    ],
  },
  {
    key: 'q2',
    kicker: 'Afternoon',
    title: 'Pick a place to spend an afternoon.',
    options: [
      { id: 'museum', label: 'A museum or an old street', sub: '博物馆 · 老街', points: { historical: 2 } },
      { id: 'cafe', label: 'A café by the window', sub: '靠窗的咖啡馆', points: { calm: 1, love: 1 } },
      { id: 'comedy', label: 'A comedy show', sub: '脱口秀', points: { wit: 2 } },
      { id: 'new', label: 'Somewhere new', sub: '没去过的地方', points: { inspiring: 2 } },
    ],
  },
  {
    key: 'q3',
    kicker: 'A line',
    title: 'Which line do you like best?',
    options: [
      { id: 'history', label: '“Those who forget history…”', points: { historical: 2 } },
      { id: 'slow', label: '“Slow down, it’s fine.”', points: { calm: 2 } },
      { id: 'kind', label: '“Be kind; everyone is fighting…”', points: { love: 2 } },
      { id: 'tempt', label: '“I can resist anything except temptation.”', points: { wit: 2 } },
    ],
  },
  {
    key: 'q4',
    kicker: 'You',
    title: 'Choose up to two that sound like you.',
    multi: 2,
    options: [
      { id: 'curious', label: 'Curious about the past', points: { historical: 1 } },
      { id: 'driven', label: 'Driven', points: { inspiring: 1 } },
      { id: 'gentle', label: 'Gentle', points: { calm: 1 } },
      { id: 'romantic', label: 'Romantic', points: { love: 1 } },
      { id: 'playful', label: 'Playful', points: { wit: 1 } },
    ],
  },
];

export const MBTI_AXES = [
  ['E', 'I'],
  ['S', 'N'],
  ['T', 'F'],
  ['J', 'P'],
] as const;

const LETTER_NUDGE: Record<string, Tag | undefined> = {
  I: 'calm', E: 'wit', N: 'inspiring', S: 'historical', F: 'love', T: 'wit',
};

export function isValidMbti(m?: string | null): m is string {
  return !!m && /^[EI][SN][TF][JP]$/.test(m);
}

/** Raw (unnormalised) points from answers + base 1 per tag. */
export function answerPoints(answers: Answers): TagWeights {
  const w = Object.fromEntries(TAGS.map((t) => [t, 1])) as TagWeights;
  for (const q of QUESTIONS) {
    const v = answers[q.key];
    const ids = Array.isArray(v) ? v.slice(0, q.multi ?? 1) : v ? [v] : [];
    for (const id of ids) {
      const opt = q.options.find((o) => o.id === id);
      if (!opt) continue;
      for (const [t, p] of Object.entries(opt.points)) w[t as Tag] += p ?? 0;
    }
  }
  return w;
}

/** MBTI nudges: +0.5 per matching letter/temperament, total capped at +1.5. */
export function mbtiNudges(mbti?: string | null): Partial<Record<Tag, number>> {
  if (!isValidMbti(mbti)) return {};
  const list: Tag[] = [];
  for (const ch of mbti) {
    const t = LETTER_NUDGE[ch];
    if (t) list.push(t);
  }
  if (mbti[1] === 'N' && mbti[2] === 'F') list.push('inspiring');
  if (mbti[1] === 'S' && mbti[3] === 'J') list.push('historical');
  const out: Partial<Record<Tag, number>> = {};
  let total = 0;
  for (const t of list) {
    if (total + 0.5 > 1.5) break;
    out[t] = (out[t] ?? 0) + 0.5;
    total += 0.5;
  }
  return out;
}

export function computeWeights(answers: Answers, mbti?: string | null): TagWeights {
  const w = answerPoints(answers);
  for (const [t, p] of Object.entries(mbtiNudges(mbti))) w[t as Tag] += p ?? 0;
  const sum = TAGS.reduce((s, t) => s + w[t], 0);
  for (const t of TAGS) w[t] = w[t] / sum;
  return w;
}

/** Tags with weight >= 0.2, always at least the top 2. */
export function computeMatchTags(w: TagWeights): Tag[] {
  const sorted = [...TAGS].sort((a, b) => w[b] - w[a]);
  const out = sorted.filter((t) => w[t] >= 0.2);
  for (const t of sorted) {
    if (out.length >= 2) break;
    if (!out.includes(t)) out.push(t);
  }
  return out;
}
