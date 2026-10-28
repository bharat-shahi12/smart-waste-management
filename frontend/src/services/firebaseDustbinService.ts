import {
  ref,
  onValue,
  type Unsubscribe,
} from 'firebase/database';

import { realtimeDatabase } from '../firebase';

export interface LiveDustbinReading {
  deviceId: string;
  name?: string;
  fillLevel: number | null;
  temperature: number | null;
  humidity: number | null;
  airQuality: number | null;
  status?: string;
  lastUpdated: number;
}

export function subscribeToLiveDustbin(
  deviceId: string,
  onUpdate: (reading: LiveDustbinReading | null) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  if (!realtimeDatabase) {
    return () => {};
  }

  const readingRef = ref(
    realtimeDatabase,
    `liveDustbins/${deviceId}`,
  );

  return onValue(
    readingRef,
    (snapshot) => {
      onUpdate(
        snapshot.exists()
          ? (snapshot.val() as LiveDustbinReading)
          : null,
      );
    },
    (error) => onError?.(error),
  );
}

export function subscribeToAllLiveDustbins(
  onUpdate: (readings: Record<string, LiveDustbinReading>) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  if (!realtimeDatabase) {
    return () => {};
  }

  const allRef = ref(realtimeDatabase, 'liveDustbins');

  return onValue(
    allRef,
    (snapshot) => {
      onUpdate(
        snapshot.exists()
          ? (snapshot.val() as Record<string, LiveDustbinReading>)
          : {},
      );
    },
    (error) => onError?.(error),
  );
}
