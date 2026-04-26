// Type-safe bridge to the Electron preload context
import { WidgetState } from '../shared/types';

interface ProtocolWidgetBridge {
  setIgnoreMouse: (ignore: boolean) => void;
  setMode: (mode: 'compact' | 'expanded') => void;
  toggleHabit: (habitId: string) => void;
  wikiCapture: (url: string) => void;
  wikiCompilePending: () => void;
  dragStart: () => void;
  dragEnd: () => void;
  getState: () => Promise<WidgetState>;
  onStateUpdate: (callback: (state: WidgetState) => void) => () => void;
}

// Safe accessor — returns undefined in plain browser env (storybook etc.)
export function getBridge(): ProtocolWidgetBridge | undefined {
  return (window as unknown as { protocolWidget?: ProtocolWidgetBridge }).protocolWidget;
}
