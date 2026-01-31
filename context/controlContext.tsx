import React, { createContext, useContext, useState, useEffect } from 'react';
import { getDatabase, ref, set, onValue, off } from 'firebase/database';
import app from '../firebase/firebaseConfig'; // Imported initialized app

interface ControlContextType {
    humidifierState: boolean;
    lightBrightness: number;
    isLoading: boolean;
    error: string | null;
    setHumidifierState: (state: boolean) => Promise<void>;
    setLightBrightness: (brightness: number) => Promise<void>;
}

const ControlContext = createContext<ControlContextType | undefined>(undefined);

export const ControlProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [humidifierState, setHumidifierStateLocal] = useState(false);
    const [lightBrightness, setLightBrightnessLocal] = useState(30);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Initialize Realtime Database
    const db = getDatabase(app);

    // Initialize: Read initial values from Firebase and listen for changes1504
    useEffect(() => {
        try {
            const controlsRef = ref(db, 'sensorData/controls');
            
            // console.log('Setting up Firebase listener for controls...');
            
            const unsubscribe = onValue(
                controlsRef,
                (snapshot) => {
                    if (snapshot.exists()) {
                        const data = snapshot.val();
                        // console.log('Controls data received from Firebase:', data);
                        
                        if (data.humidifierState !== undefined) {
                            setHumidifierStateLocal(data.humidifierState);
                            // console.log('Humidifier state updated:', data.humidifierState);
                        }
                        
                        if (data.lightBrightness !== undefined) {
                            const validBrightness = Math.max(0, Math.min(255, data.lightBrightness));
                            setLightBrightnessLocal(validBrightness);
                            // console.log('Light brightness updated:', validBrightness);
                        }
                    } else {
                        // console.log('No controls data found in Firebase');
                    }
                    setIsLoading(false);
                    setError(null);
                },
                (error) => {
                    console.error('Error reading controls from Firebase:', error);
                    setError(error.message);
                    setIsLoading(false);
                }
            );

            return () => {
                // console.log('Cleaning up Firebase listener');
                off(controlsRef);
            };
        } catch (err) {
            // console.error('Error initializing controls:', err);
            setError(err instanceof Error ? err.message : 'Unknown error');
            setIsLoading(false);
        }
    }, []);

    // Update humidifier state in Firebase
    const updateHumidifierState = async (state: boolean) => {
        try {
            // console.log('Updating humidifier state to:', state);
            setError(null);
            
            await set(ref(db, 'sensorData/controls/humidifierState'), state);
            setHumidifierStateLocal(state);
            
            // console.log('✓ Humidifier state updated successfully');
        } catch (err) {
            const errorMsg = err instanceof Error ? err.message : 'Failed to update humidifier';
            setError(errorMsg);
            // console.error('Error updating humidifier state:', err);
            throw err;
        }
    };

    // Update light brightness in Firebase (0-255 for analogWrite)
    const updateLightBrightness = async (brightness: number) => {
        try {
            // console.log('Updating light brightness to:', brightness);
            setError(null);
            
            const validBrightness = Math.max(0, Math.min(255, Math.round(brightness)));
            
            await set(ref(db, 'sensorData/controls/lightBrightness'), validBrightness);
            setLightBrightnessLocal(validBrightness);
            
            // console.log('✓ Light brightness updated successfully');
        } catch (err) {
            const errorMsg = err instanceof Error ? err.message : 'Failed to update brightness';
            setError(errorMsg);
            // console.error('Error updating light brightness:', err);
            throw err;
        }
    };

    const value: ControlContextType = {
        humidifierState,
        lightBrightness,
        isLoading,
        error,
        setHumidifierState: updateHumidifierState,
        setLightBrightness: updateLightBrightness,
    };

    return (
        <ControlContext.Provider value={value}>
            {children}
        </ControlContext.Provider>
    );
};

export const useControl = () => {
    const context = useContext(ControlContext);
    if (context === undefined) {
        throw new Error('useControl must be used within a ControlProvider');
    }
    return context;
};