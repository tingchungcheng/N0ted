import React from 'react';
import { FlexWidget, ImageWidget, OverlapWidget, TextWidget } from 'react-native-android-widget';
import { dayParts } from '../../lib/dates';
import type { WidgetEntry } from '../payload';

const BG = {
  calm: require('../../../assets/bg/bg_calm.jpg'),
  historical: require('../../../assets/bg/bg_historical.jpg'),
  inspiring: require('../../../assets/bg/bg_inspiring.jpg'),
  love: require('../../../assets/bg/bg_love.jpg'),
  wit: require('../../../assets/bg/bg_wit.jpg'),
};

interface Props {
  entry: WidgetEntry | null;
  width: number;
  height: number;
}

/** Medium 2:1 widget mirroring the iOS layout: photo, scrim, serif quote, boxed date, attribution. */
export function NotedWidget({ entry, width, height }: Props) {
  const w = Math.max(width, 250);
  const h = Math.max(height, 110);
  if (!entry) {
    return (
      <FlexWidget
        clickAction="OPEN_APP"
        style={{ width: 'match_parent', height: 'match_parent', borderRadius: 22, backgroundColor: '#6F8597', justifyContent: 'center', padding: 16 }}
      >
        <TextWidget text="Nōted" style={{ fontSize: 22, color: '#FFFFFF', fontFamily: 'NotoSerifSC-Regular' }} />
        <TextWidget text="Open the app to set up your notes" style={{ fontSize: 12, color: '#E8ECEF', marginTop: 4 }} />
      </FlexWidget>
    );
  }
  const { day, month } = dayParts(entry.date);
  return (
    <OverlapWidget
      clickAction="OPEN_URI"
      clickActionData={{ uri: entry.type === 'post' ? entry.url : 'noted://home' }}
      style={{ width: 'match_parent', height: 'match_parent', borderRadius: 22 }}
    >
      <ImageWidget image={BG[entry.bg] ?? BG.calm} imageWidth={w} imageHeight={h} radius={22} />
      <FlexWidget
        style={{
          width: 'match_parent',
          height: 'match_parent',
          borderRadius: 22,
          backgroundColor: 'rgba(70, 82, 94, 0.42)',
          paddingHorizontal: 18,
          paddingVertical: 14,
          flexDirection: 'column',
          justifyContent: 'space-between',
        }}
      >
        <FlexWidget style={{ flexDirection: 'row', width: 'match_parent', justifyContent: 'space-between' }}>
          <TextWidget
            text={entry.text}
            maxLines={3}
            truncate="END"
            style={{ width: w - 18 * 2 - 72 - 10, fontSize: 17, lineHeight: 26, color: '#FFFFFF', fontFamily: 'NotoSerifSC-Regular' }}
          />
          <FlexWidget
            style={{ width: 64, height: 64, borderWidth: 1.5, borderColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center', flexDirection: 'column' }}
          >
            <TextWidget text={String(day)} style={{ fontSize: 26, fontWeight: '700', color: '#FFFFFF' }} />
            <TextWidget text={month} style={{ fontSize: 11, fontWeight: '700', letterSpacing: 0.25, color: '#FFFFFF' }} />
          </FlexWidget>
        </FlexWidget>
        <TextWidget text={entry.attribution} maxLines={1} truncate="END" style={{ fontSize: 12, color: '#F2F4F6', width: 'match_parent' }} />
      </FlexWidget>
    </OverlapWidget>
  );
}
