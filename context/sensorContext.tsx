import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { ref, onValue, off } from 'firebase/database';
import { getDatabase } from 'firebase/database';
import app from '../firebase/firebaseConfig';

const ARDUINO_IP = "88.8.88.112";
// const ARDUINO_IP = "172.23.243.14";

// Initialize Firebase Realtime Database
const database = getDatabase(app);

// Types
export interface SensorData {
  temperature: number;
  humidity: number;
  moisture: number;
  lux: number;
  timestamp?: string;
  time?: number;
}

interface SensorContextType {
  currentData: SensorData | null;
  historicalData: SensorData[];
  isLoading: boolean;
  error: string | null;
  getSensorData: () => Promise<void>;
  dataSource: 'firebase' | 'esp32' | 'none';
}

// Create Context
const SensorContext = createContext<SensorContextType | undefined>(undefined);

// Provider Component
export const SensorProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentData, setCurrentData] = useState<SensorData | null>(null);
  const [historicalData, setHistoricalData] = useState<SensorData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dataSource, setDataSource] = useState<'firebase' | 'esp32' | 'none'>('none');

  // Fetch sensor data from ESP32 directly
  const getSensorDataFromESP32 = async () => {
    try {
      const response = await fetch(`http://${ARDUINO_IP}/data`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });
      
      if (response.ok) {
        const data: SensorData = await response.json();
        
        // Add timestamp
        const now = new Date();
        const enrichedData: SensorData = {
          ...data,
          timestamp: now.toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit',
          }),
          time: now.getTime()
        };

        // Update current data
        setCurrentData(enrichedData);

        // Update historical data
        setHistoricalData(prev => {
          const newData = [...prev, enrichedData];
          return newData.slice(-1000);
        });

        setError(null);
        setIsLoading(false);
        setDataSource('esp32');
      } else {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
    } catch (error) {
      console.error('Error fetching from ESP32:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch from ESP32');
      setIsLoading(false);
      // Don't throw - let Firebase listener try to work
    }
  };

  // Public function that can be called manually
  const getSensorData = async () => {
    await getSensorDataFromESP32();
  };

  // Listen to Firebase Realtime Database
  useEffect(() => {
    // // console.log('Setting up Firebase listener...');
    const sensorDataRef = ref(database, 'sensorData');
    
    // Set up real-time listener
    const unsubscribe = onValue(sensorDataRef, (snapshot) => {
      if (snapshot.exists()) {
        const firebaseData = snapshot.val();
        // // console.log('Firebase data received:', firebaseData);
        
        // Map Firebase data to our SensorData format
        const now = new Date();
        const enrichedData: SensorData = {
          temperature: firebaseData.temperature || 0,
          humidity: firebaseData.humidity || 0,
          moisture: firebaseData.moisture || 0,
          lux: firebaseData.lux || 0,
          timestamp: now.toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit',
          }),
          time: firebaseData.lastUpdated || now.getTime()
        };

        // Update current data
        setCurrentData(enrichedData);

        // Update historical data
        setHistoricalData(prev => {
          const newData = [...prev, enrichedData];
          return newData.slice(-1000);
        });

        setError(null);
        setIsLoading(false);
        setDataSource('firebase');
      } else {
        // // console.log('No data available in Firebase');
        setError('No data available in Firebase');
      }
    }, (error) => {
      console.error('Firebase listener error:', error);
      setError(`Firebase error: ${error.message}`);
      setIsLoading(false);
    });

    // Fallback: Try ESP32 direct connection if Firebase fails
    const fallbackTimer = setTimeout(() => {
      if (dataSource === 'none') {
        // // console.log('Firebase not responding, trying ESP32 direct connection...');
        getSensorDataFromESP32();
      }
    }, 5000);

    // Cleanup function
    return () => {
      // // console.log('Cleaning up Firebase listener...');
      off(sensorDataRef);
      clearTimeout(fallbackTimer);
    };
  }, []);

  // Optional: Periodic ESP32 polling as backup (only if Firebase fails)
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    // Only poll ESP32 if Firebase hasn't connected after 10 seconds
    const checkInterval = setTimeout(() => {
      if (dataSource === 'none' || dataSource === 'esp32') {
        // console.log('Starting ESP32 polling as backup...');
        interval = setInterval(() => {
          getSensorDataFromESP32();
        }, 3000);
      }
    }, 10000);

    return () => {
      clearTimeout(checkInterval);
      if (interval) clearInterval(interval);
    };
  }, [dataSource]);

  return (
    <SensorContext.Provider 
      value={{ 
        currentData, 
        historicalData, 
        isLoading, 
        error, 
        getSensorData,
        dataSource
      }}
    >
      {children}
    </SensorContext.Provider>
  );
};

// Custom hook to use the sensor context
export const useSensorData = () => {
  const context = useContext(SensorContext);
  if (context === undefined) {
    throw new Error('useSensorData must be used within a SensorProvider');
  }
  return context;
};