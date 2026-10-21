import { useEffect, useRef } from 'react';

/**
 * Tiny in-browser event bus. UserLayout owns the single STOMP connection and
 * re-broadcasts every user-scoped WebSocket message here, so any page can
 * react (refetch from the backend) without opening its own socket.
 */
export type LiveEventType =
  | 'NOTIFICATION'
  | 'NOTIFICATIONS_READ'
  | 'COMPLAINT'
  | 'PICKUP'
  | 'REWARD'
  | 'DETECTION'
  | 'WASTE_LOG'
  | 'SUGGESTION'
  | 'DUSTBIN'
  | string;

const EVENT_NAME = 'smartwaste:live';

export function emitLive(type: LiveEventType, payload?: unknown) {
  window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: { type, payload } }));
}

/**
 * Calls `onEvent` whenever a matching live event arrives. Bursts are debounced
 * (one backend action often fires several events) so we refetch only once.
 */
export function useLiveRefresh(
  onEvent: (type: LiveEventType, payload?: unknown) => void,
  types?: LiveEventType[],
  debounceMs = 300,
) {
  const cbRef = useRef(onEvent);
  cbRef.current = onEvent;
  const typesKey = types ? types.join(',') : '*';

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    const handler = (e: Event) => {
      const { type, payload } = (e as CustomEvent).detail || {};
      if (types && !types.includes(type)) return;
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => cbRef.current(type, payload), debounceMs);
    };
    window.addEventListener(EVENT_NAME, handler);
    return () => {
      window.removeEventListener(EVENT_NAME, handler);
      if (timer) clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [typesKey, debounceMs]);
}
