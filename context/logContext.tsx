import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { 
  collection, 
  query, 
  orderBy, 
  limit, 
  getDocs, 
  doc, 
  getDoc, 
  onSnapshot,
  Timestamp 
} from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';

// Type definitions
interface SensorStats {
  avg: number;
  max: number;
  min: number;
}

interface DailySummary {
  date: string;
  temperature: SensorStats;
  humidity: SensorStats;
  lux: SensorStats;
  moisture: SensorStats;
  readingCount: number;
  lastUpdated: Date;
}

interface HourlyAggregate {
  hour: string;
  temperature: SensorStats;
  humidity: SensorStats;
  lux: SensorStats;
  moisture: SensorStats;
  readingCount: number;
  timestamp: Date;
}

interface SensorReading {
  temperature: number;
  humidity: number;
  lux: number;
  moisture: number;
  timestamp: Date;
}

interface LatestReadings {
  temperature?: number;
  humidity?: number;
  lux?: number;
  moisture?: number;
  timestamp?: Date;
}

interface LogContextType {
  // Daily summaries
  dailySummaries: DailySummary[];
  latestDailySummary: DailySummary | null;
  
  // Hourly aggregates
  hourlyAggregates: HourlyAggregate[];
  
  // Latest readings
  latestReadings: LatestReadings;
  
  // Sensor readings
  // sensorReadings: SensorReading[];
  
  // Loading states
  loading: boolean;
  error: string | null;
  
  // Methods
  fetchDailySummaries: (limitCount?: number) => Promise<void>;
  fetchHourlyAggregates: (date: string, limitCount?: number) => Promise<void>;
  // fetchSensorReadings: (limitCount?: number) => Promise<void>;
  getDailySummaryByDate: (date: string) => Promise<DailySummary | null>;
}

const LogContext = createContext<LogContextType | undefined>(undefined);

// Helper function to convert Firestore timestamp to Date
const convertTimestamp = (timestamp: any): Date => {
  if (timestamp instanceof Timestamp) {
    return timestamp.toDate();
  }
  if (timestamp?.seconds) {
    return new Timestamp(timestamp.seconds, timestamp.nanoseconds || 0).toDate();
  }
  return new Date(timestamp);
};

// Provider Props
interface LogProviderProps {
  children: ReactNode;
  autoFetch?: boolean; // Auto-fetch data on mount
  realtimeUpdates?: boolean; // Enable real-time listeners
}

export const LogProvider: React.FC<LogProviderProps> = ({ 
  children, 
  autoFetch = true,
  realtimeUpdates = true 
}) => {
  const [dailySummaries, setDailySummaries] = useState<DailySummary[]>([]);
  const [latestDailySummary, setLatestDailySummary] = useState<DailySummary | null>(null);
  const [hourlyAggregates, setHourlyAggregates] = useState<HourlyAggregate[]>([]);
  const [latestReadings, setLatestReadings] = useState<LatestReadings>({});
  // const [sensorReadings, setSensorReadings] = useState<SensorReading[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch daily summaries
  const fetchDailySummaries = async (limitCount: number = 30) => {
    try {
      setLoading(true);
      setError(null);
      
      const q = query(
        collection(db, 'dailySummaries'),
        orderBy('date', 'desc'),
        limit(limitCount)
      );
      
      const querySnapshot = await getDocs(q);
      const summaries: DailySummary[] = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        summaries.push({
            date: data.date,
            temperature: data.temperature,
            humidity: data.humidity,
            lux: data.lux,
            moisture: data.moisture,
            readingCount: data.readingCount,
            lastUpdated: convertTimestamp(data.lastUpdated),
        });
      });
      
      setDailySummaries(summaries);
      if (summaries.length > 0) {
        setLatestDailySummary(summaries[0]);
      }
    } catch (err: any) {
      setError(err.message);
      console.error('Error fetching daily summaries:', err);
    } finally {
      setLoading(false);
    }
  };

  // Get specific daily summary by date
  const getDailySummaryByDate = async (date: string): Promise<DailySummary | null> => {
    try {
      const docRef = doc(db, 'dailySummaries', date);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        return {
          date: data.date,
          temperature: data.temperature,
          humidity: data.humidity,
          lux: data.lux,
          moisture: data.moisture,
          readingCount: data.readingCount,
          lastUpdated: convertTimestamp(data.lastUpdated)
        };
      }
      return null;
    } catch (err: any) {
      console.error('Error fetching daily summary:', err);
      return null;
    }
  };

  // Fetch hourly aggregates
  const fetchHourlyAggregates = async (date: string, limitCount: number = 24) => {
    try {
      setLoading(true);
      setError(null);
      
      const q = query(
        collection(db, 'hourlyAggregates'),
        orderBy('hour', 'desc'),
        limit(limitCount)
      );
      
      const querySnapshot = await getDocs(q);
      const aggregates: HourlyAggregate[] = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        aggregates.push({
            hour: data.hour,
            temperature: data.temperature,
            humidity: data.humidity,
            lux: data.lux,
            moisture: data.moisture,
            readingCount: data.readingCount,
            timestamp: convertTimestamp(data.timestamp),
        });
      });
      
      setHourlyAggregates(aggregates);
    } catch (err: any) {
      setError(err.message);
      console.error('Error fetching hourly aggregates:', err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch sensor readings
  // const fetchSensorReadings = async (limitCount: number = 100) => {
  //   try {
  //     setLoading(true);
  //     setError(null);
      
  //     const q = query(
  //       collection(db, 'sensorReadings'),
  //       orderBy('timestamp', 'desc'),
  //       limit(limitCount)
  //     );
      
  //     const querySnapshot = await getDocs(q);
  //     const readings: SensorReading[] = [];
      
  //     querySnapshot.forEach((doc) => {
  //       const data = doc.data();
  //       readings.push({
  //           temperature: data.temperature,
  //           humidity: data.humidity,
  //           lux: data.lux,
  //           moisture: data.moisture,
  //           timestamp: convertTimestamp(data.timestamp),
  //       });
  //     });
      
  //     setSensorReadings(readings);
  //   } catch (err: any) {
  //     setError(err.message);
  //     console.error('Error fetching sensor readings:', err);
  //   } finally {
  //     setLoading(false);
  //   }
  // };

  // Fetch latest readings
  
  const fetchLatestReadings = async () => {
    try {
      const docRef = doc(db, 'latestReadings', 'current');
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        setLatestReadings({
          temperature: data.temperature,
          humidity: data.humidity,
          lux: data.lux,
          moisture: data.moisture,
          timestamp: convertTimestamp(data.timestamp)
        });
      }
    } catch (err: any) {
      console.error('Error fetching latest readings:', err);
    }
  };

  // Real-time listener for latest readings
  useEffect(() => {
    if (!realtimeUpdates) return;

    const unsubscribe = onSnapshot(
      doc(db, 'latestReadings', 'current'),
      (doc) => {
        if (doc.exists()) {
          const data = doc.data();
          setLatestReadings({
            temperature: data.temperature,
            humidity: data.humidity,
            lux: data.lux,
            moisture: data.moisture,
            timestamp: convertTimestamp(data.timestamp)
          });
        }
      },
      (err) => {
        console.error('Error in real-time listener:', err);
      }
    );

    return () => unsubscribe();
  }, [realtimeUpdates]);

  // Real-time listener for daily summaries
  useEffect(() => {
    if (!realtimeUpdates) return;

    const q = query(
      collection(db, 'dailySummaries'),
      orderBy('date', 'desc'),
      limit(30)
    );

    const unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        const summaries: DailySummary[] = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          summaries.push({
              date: data.date,
              temperature: data.temperature,
              humidity: data.humidity,
              lux: data.lux,
              moisture: data.moisture,
              readingCount: data.readingCount,
              lastUpdated: convertTimestamp(data.lastUpdated),
          });
        });
        setDailySummaries(summaries);
        if (summaries.length > 0) {
          setLatestDailySummary(summaries[0]);
        }
      },
      (err) => {
        console.error('Error in daily summaries listener:', err);
      }
    );

    return () => unsubscribe();
  }, [realtimeUpdates]);

  // Auto-fetch on mount
  useEffect(() => {
    if (autoFetch && !realtimeUpdates) {
      fetchDailySummaries();
      fetchLatestReadings();
    }
  }, [autoFetch, realtimeUpdates]);

  const value: LogContextType = {
    dailySummaries,
    latestDailySummary,
    hourlyAggregates,
    latestReadings,
    // sensorReadings,
    loading,
    error,
    fetchDailySummaries,
    fetchHourlyAggregates,
    // fetchSensorReadings,
    getDailySummaryByDate
  };

  return <LogContext.Provider value={value}>{children}</LogContext.Provider>;
};

// Custom hook to use the log context
export const useLog = (): LogContextType => {
  const context = useContext(LogContext);
  if (context === undefined) {
    throw new Error('useLog must be used within a LogProvider');
  }
  return context;
};

// Export types for use in other components
export type { 
  DailySummary, 
  HourlyAggregate, 
  // SensorReading, 
  LatestReadings,
  SensorStats 
};