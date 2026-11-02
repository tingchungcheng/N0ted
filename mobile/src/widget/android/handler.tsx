import type { WidgetTaskHandlerProps } from 'react-native-android-widget';
import { getJSON, KEYS } from '../../lib/storage';
import type { WidgetEntry } from '../payload';
import { renderNotedWidget } from './render';

/** Headless JS task: runs on add / periodic update / resize without opening the app. */
export async function widgetTaskHandler(props: WidgetTaskHandlerProps) {
  const { widgetInfo, widgetAction, renderWidget } = props;
  switch (widgetAction) {
    case 'WIDGET_ADDED':
    case 'WIDGET_UPDATE':
    case 'WIDGET_RESIZED': {
      const entries = await getJSON<WidgetEntry[]>(KEYS.widgetPicks);
      renderWidget(renderNotedWidget(entries, widgetInfo.width, widgetInfo.height));
      break;
    }
    default:
      break;
  }
}
