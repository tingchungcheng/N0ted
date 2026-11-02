import { Tag } from '../lib/types';

export const C = {
  paper: '#F4F0E8',
  paperDeep: '#EAE3D6',
  ink: '#1D1B19',
  inkSoft: '#4A4540',
  muted: '#8C857B',
  hair: 'rgba(29,27,25,0.12)',
  white: '#FFFFFF',
  xhs: '#FF2442',
};

export const TAG_META: Record<Tag, { label: string; zh: string; color: string; tint: [string, string, string] }> = {
  historical: { label: 'Historical', zh: '历史', color: '#9A6B4F', tint: ['#E9D8C8', '#D9BFA8', '#B98E72'] },
  inspiring: { label: 'Inspiring', zh: '励志', color: '#C38A45', tint: ['#F6E3C4', '#EFC995', '#D9A266'] },
  calm: { label: 'Calm', zh: '静', color: '#6F8597', tint: ['#DDE4EA', '#BCC9D4', '#8FA2B2'] },
  love: { label: 'Love', zh: '爱', color: '#B67588', tint: ['#F1DDE3', '#E3BCC8', '#C893A4'] },
  wit: { label: 'Wit', zh: '妙', color: '#4F8A83', tint: ['#D6E8E4', '#AFD2CB', '#7DB0A7'] },
};

export const F = {
  // Display / wordmark
  display: 'PlayfairDisplay_400Regular',
  displayItalic: 'PlayfairDisplay_400Regular_Italic',
  displayBold: 'PlayfairDisplay_600SemiBold',
  // Latin quote serif
  serif: 'CormorantGaramond_500Medium',
  serifItalic: 'CormorantGaramond_500Medium_Italic',
  serifBold: 'CormorantGaramond_600SemiBold',
  // Chinese serif
  zh: 'NotoSerifSC_400Regular',
  zhBold: 'NotoSerifSC_600SemiBold',
  // UI sans
  ui: 'Inter_400Regular',
  uiMedium: 'Inter_500Medium',
  uiBold: 'Inter_600SemiBold',
};

export const BG_IMAGES: Record<Tag, number> = {
  calm: require('../../assets/bg/bg_calm.jpg'),
  historical: require('../../assets/bg/bg_historical.jpg'),
  inspiring: require('../../assets/bg/bg_inspiring.jpg'),
  love: require('../../assets/bg/bg_love.jpg'),
  wit: require('../../assets/bg/bg_wit.jpg'),
};

const CJK = /[\u3400-\u9fff\uf900-\ufaff\u3000-\u303f\uff00-\uffef]/;
export const isCJK = (s: string) => CJK.test(s);
export const quoteFont = (s: string, bold = false) => (isCJK(s) ? (bold ? F.zhBold : F.zh) : bold ? F.serifBold : F.serif);
