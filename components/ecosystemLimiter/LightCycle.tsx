import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { VStack } from '@/components/ui/vstack';
import { HStack } from '@/components/ui/hstack';
import { Sun, Clock, AlertCircle } from 'lucide-react-native';
import { useControl } from '@/context/controlContext';
import { useUser } from '@/context/UserContext';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/firebase/firebaseConfig';
import {
  Slider,
  SliderTrack,
  SliderFilledTrack,
  SliderThumb,
} from '@/components/ui/slider';
import { getControllerRestriction, canUpdateController } from '@/_helpers/controllerRestrictions';
import { useConnection } from '@/context/ConnectionContext';


export const LightCycle: React.FC = () => {
const { isConnected } = useConnection();
  const { lightBrightness, setLightBrightness } = useControl();
  const { profile, refreshProfile } = useUser();
  
  const [currentTime, setCurrentTime] = useState<string>('');
  const [isWithinSchedule, setIsWithinSchedule] = useState(false);
  const [userBrightness, setUserBrightness] = useState(100); // Default to 100 for slider (0-255)
  const controllerRestriction = getControllerRestriction(isConnected, profile, 'AutoMist');
  
  const cycleIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Day schedule: 6:30 AM - 11:00 AM
  const DAY_START_HOUR = 6;
  const DAY_START_MINUTE = 30;
  const DAY_END_HOUR = 11;
  const DAY_END_MINUTE = 0;

  // Sync brightness from profile
  useEffect(() => {
    if (profile?.ControlAutomation?.daylightBrightness !== undefined) {
      const storedBrightness = profile.ControlAutomation.daylightBrightness;
      if (storedBrightness !== userBrightness) {
        // console.log('🔄 Syncing daylight brightness from profile:', storedBrightness);
        setUserBrightness(storedBrightness);
      }
    }
  }, [profile?.ControlAutomation?.daylightBrightness]);

  // Update Firestore when enabled state changes
  const updateFirestoreStatus = async (newEnabled: boolean) => {
    if (!profile?.id) return;

    try {
      const userRef = doc(db, 'profile', profile.id);
      await updateDoc(userRef, {
        'ControlAutomation.LightCycleStatus': newEnabled
      });
   
      await refreshProfile();
    } catch (error) {
    //   console.error('❌ Error updating LightCycle status:', error);
    }
  };

  // Update Firestore when brightness changes
  const updateFirestoreBrightness = async (newBrightness: number) => {
    if (!profile?.id) return;

    try {
      const userRef = doc(db, 'profile', profile.id);
      await updateDoc(userRef, {
        'ControlAutomation.daylightBrightness': newBrightness,
        'ControlAutomation.nightlightBrightness': 0 // Always 0 for night
      });
      await refreshProfile();
    } catch (error) {
    //   console.error('❌ Error updating brightness:', error);
    }
  };

  // Handle brightness slider change
  const handleBrightnessChange = (value: number) => {
    setUserBrightness(value);
    // Debounce Firestore updates to avoid too many writes
    if (brightnessUpdateTimeout.current) {
      clearTimeout(brightnessUpdateTimeout.current);
    }
    brightnessUpdateTimeout.current = setTimeout(() => {
      updateFirestoreBrightness(value);
    }, 500); // Wait 500ms after user stops sliding
  };

  const brightnessUpdateTimeout = useRef<NodeJS.Timeout | number | null>(null);

  const getCurrentTime = () => {
    const now = new Date();
    return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
  };

  const isWithinDaySchedule = (): boolean => {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    
    const currentTotalMinutes = currentHour * 60 + currentMinute;
    const startTotalMinutes = DAY_START_HOUR * 60 + DAY_START_MINUTE;
    const endTotalMinutes = DAY_END_HOUR * 60 + DAY_END_MINUTE;
    
    return currentTotalMinutes >= startTotalMinutes && currentTotalMinutes < endTotalMinutes;
  };

  useEffect(() => {

    const updateCycle = async () => {
      const now = getCurrentTime();
      setCurrentTime(now);

      const withinSchedule = isWithinDaySchedule();
      setIsWithinSchedule(withinSchedule);

      try {
        if (withinSchedule) {
          // Use stored daylight brightness
          const daylightValue = profile?.ControlAutomation?.daylightBrightness ?? userBrightness;
          await setLightBrightness(daylightValue);
        } else {
          // Use stored nightlight brightness (always 0)
          const nightlightValue = profile?.ControlAutomation?.nightlightBrightness ?? 0;
          await setLightBrightness(nightlightValue);
        }
      } catch (error) {
        console.error('LightCycle: Error setting brightness:', error);
      }
    };

    updateCycle();
    cycleIntervalRef.current = setInterval(updateCycle, 60000);

    return () => {
      if (cycleIntervalRef.current) {
        clearInterval(cycleIntervalRef.current);
      }
    };
  }, [ userBrightness]);

  // Cleanup brightness update timeout
  useEffect(() => {
    return () => {
      if (brightnessUpdateTimeout.current) {
        clearTimeout(brightnessUpdateTimeout.current);
      }
    };
  }, []);


  const styles = StyleSheet.create({
    container: {
      borderWidth: 1,
      borderColor: controllerRestriction.canUpdate ? '#33b42f' : '#ccc',
      borderRadius: 12,
      padding: 16,
      backgroundColor: '#fff',
      gap: 12,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    title: {
      fontSize: 16,
      fontWeight: '600',
      color: '#333',
    },
    statusCard: {
      backgroundColor: '#f8f9fa',
      borderRadius: 8,
      padding: 12,
      gap: 8,
    },
    statusIndicator: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      backgroundColor: isWithinSchedule ? '#e7f5ff' : '#f1f3f5',
      padding: 12,
      borderRadius: 8,
    },
    row: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    label: {
      fontSize: 13,
      color: '#666',
    },
    value: {
      fontSize: 13,
      fontWeight: '600',
      color: '#333',
    },
  });

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <HStack style={{ alignItems: 'center', gap: 8 }}>
          <Clock size={20} color={controllerRestriction.canUpdate ? '#33b42f' : '#ccc'} />
          <Text style={styles.title}>Daytime Light Schedule</Text>
        </HStack>
      </View>

      {!controllerRestriction.canUpdate && (
              <HStack style={{ alignItems: 'center', gap: 8, backgroundColor: '#ffe3e3', padding: 8, borderRadius: 8 }}>
                <AlertCircle size={16} color="#ff6b6b" />
                <Text style={{ fontSize: 11, color: '#c92a2a', flex: 1 }}>
                  {controllerRestriction.reason}
                </Text>
              </HStack>
            )}

        {controllerRestriction.canUpdate && (
        <VStack style={{ gap: 12 }}>
          <VStack style={{
            justifyContent: "center",
            alignItems: "center",
            gap: 12,
            padding: 16,
            backgroundColor: '#f8f9fa',
            borderRadius: 8,
          }}>
            <Text style={{ fontSize: 14, fontWeight: '600', color: '#333' }}>
              Daylight Brightness
            </Text>

            <Slider
              value={userBrightness}
              onChange={handleBrightnessChange}
              defaultValue={100}
              size="md"
              orientation="horizontal"
              isDisabled={false}
              isReversed={false}
              maxValue={255}
              minValue={0}
            >
              <SliderTrack>
                <SliderFilledTrack />
              </SliderTrack>
              <SliderThumb />
            </Slider>

            <Text style={{ fontSize: 14, fontWeight: "600" }}>
              {Math.round((userBrightness / 255) * 100)}%
            </Text>
            
            <Text style={{ fontSize: 10, color: '#868e96', textAlign: 'center' }}>
              This brightness will be applied during daytime hours
            </Text>
          </VStack>

          <View style={styles.statusIndicator}>
            <Sun size={24} color={isWithinSchedule ? '#ffd43b' : '#adb5bd'} />
            <VStack style={{ flex: 1 }}>
              <Text style={{ fontSize: 14, fontWeight: '600', color: '#333' }}>
                {isWithinSchedule ? 'Active (Daytime)' : 'Inactive (Night)'}
              </Text>
              <Text style={{ fontSize: 11, color: '#666' }}>
                {isWithinSchedule 
                  ? `Light at ${Math.round((userBrightness / 255) * 100)}%` 
                  : 'Light is off'}
              </Text>
            </VStack>
            <Text style={{ fontSize: 12, color: '#666' }}>
              {currentTime}
            </Text>
          </View>

          <View style={styles.statusCard}>
            <View style={styles.row}>
              <Text style={styles.label}>Current Brightness</Text>
              <Text style={styles.value}>
                {Math.round((lightBrightness / 255) * 100)}%
              </Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Daylight Brightness</Text>
              <Text style={styles.value}>
                {Math.round((userBrightness / 255) * 100)}%
              </Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Night Brightness</Text>
              <Text style={styles.value}>0%</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Schedule</Text>
              <Text style={styles.value}>
                6:30 AM - 11:00 AM
              </Text>
            </View>
          </View>

          <HStack style={{ alignItems: 'center', gap: 8, backgroundColor: '#e7f5ff', padding: 8, borderRadius: 8 }}>
            <AlertCircle size={16} color="#1971c2" />
            <Text style={{ fontSize: 11, color: '#1971c2', flex: 1 }}>
              Your daylight brightness setting ({Math.round((userBrightness / 255) * 100)}%) is saved and will be applied during 6:30 AM - 11:00 AM daily
            </Text>
          </HStack>
        </VStack>
        )}

    </View>

  );
};

export default LightCycle;