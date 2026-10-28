import { useEffect, useState } from "react";
import { ref, onValue } from "firebase/database";
import { database } from "../firebase";

export interface LiveDustbinData {
  deviceId?: string;
  name?: string;
  fillLevel?: number;
  fillPercent?: number;
  distance?: number;
  temperature?: number;
  humidity?: number;
  airQuality?: number;
  gasLevel?: number;
  status?: string;
  lastUpdated?: number;
  [key: string]: any;
}

export default function useLiveDustbin(targetDeviceId: string = "ESP32_1001") {
  const [data, setData] = useState<LiveDustbinData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    if (!database) {
      setError("Firebase database is not initialized.");
      setLoading(false);
      return;
    }

    const dustbinRef = ref(database, `liveDustbins/${targetDeviceId}`);

    const unsubscribe = onValue(
      dustbinRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const val = snapshot.val() as LiveDustbinData;
          // Normalise fillPercent and fillLevel seamlessly
          const normalized: LiveDustbinData = {
            ...val,
            fillPercent: val.fillPercent ?? val.fillLevel ?? 0,
            fillLevel: val.fillLevel ?? val.fillPercent ?? 0,
          };
          setData(normalized);
          setError("");
        } else {
          setData(null);
          setError("No sensor data found in Firebase.");
        }

        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [targetDeviceId]);

  return { data, loading, error };
}
