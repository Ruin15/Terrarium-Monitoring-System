import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { VStack } from '@/components/ui/vstack';
import { HStack } from '@/components/ui/hstack';
import { Sun, Moon, Clock, AlertCircle } from 'lucide-react-native';
import { useControl } from '@/context/controlContext';
import { useUser } from '@/context/UserContext';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/firebase/firebaseConfig';
import { Switch } from '@/components/ui/switch';
import { getControllerRestriction } from '@/_helpers/controllerRestrictions';
import { useConnection } from '@/context/ConnectionContext';


export const LightCycle: React.FC = () => {
  const { isConnected } = useConnection();
  const { lightState, setLightState } = useControl();
  const { profile, refreshProfile } = useUser();
  
  const [currentTime, setCurrentTime] = useState<string>('');
  const [isWithinSchedule, setIsWithinSchedule] = useState(false);
  const [isEnabled, setIsEnabled] = useState(true);
  const controllerRestriction = getControllerRestriction(isConnected, profile, 'AutoMist');
  
  const cycleIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Day schedule: 6:30 AM - 6:00 PM (18:00)
  const DAY_START_HOUR = 6;
  const DAY_START_MINUTE = 30;
  const DAY_END_HOUR = 18;
  const DAY_END_MINUTE = 0;

  // Sync enabled state from profile
  useEffect(() => {
    if (profile?.ControlAutomation?.LightCycleStatus !== undefined) {
      setIsEnabled(profile.ControlAutomation.LightCycleStatus);
    }
  }, [profile?.ControlAutomation?.LightCycleStatus]);

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
      console.error('❌ Error updating LightCycle status:', error);
    }
  };

  // Handle toggle change
  const handleToggleChange = async (value: boolean) => {
    setIsEnabled(value);
    await updateFirestoreStatus(value);
    
    // If turning off, immediately turn off the light
    if (!value) {
      await setLightState(false);
    } else {
      // If turning on, apply current schedule immediately
      const withinSchedule = isWithinDaySchedule();
      await setLightState(withinSchedule);
    }
  };

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

      // Only control light if automation is enabled
      if (isEnabled) {
        try {
          if (withinSchedule) {
            // Turn light ON during daytime
            await setLightState(true);
          } else {
            // Turn light OFF during nighttime
            await setLightState(false);
          }
        } catch (error) {
          console.error('LightCycle: Error setting light state:', error);
        }
      }
    };

    updateCycle();
    cycleIntervalRef.current = setInterval(updateCycle, 60000); // Check every minute

    return () => {
      if (cycleIntervalRef.current) {
        clearInterval(cycleIntervalRef.current);
      }
    };
  }, [isEnabled]);

  const formatScheduleTime = (hour: number, minute: number): string => {
    const period = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
    const displayMinute = minute.toString().padStart(2, '0');
    return `${displayHour}:${displayMinute} ${period}`;
  };

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
    toggleCard: {
      backgroundColor: '#f8f9fa',
      borderRadius: 8,
      padding: 16,
      gap: 8,
    },
  });

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <HStack style={{ alignItems: 'center', gap: 8 }}>
          <Clock size={20} color={controllerRestriction.canUpdate ? '#33b42f' : '#ccc'} />
          <Text style={styles.title}>Automatic Light Schedule</Text>
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
          {/* Automation Toggle */}
          <View style={styles.toggleCard}>
            <View style={styles.row}>
              <VStack style={{ flex: 1, gap: 4 }}>
                <Text style={{ fontSize: 14, fontWeight: '600', color: '#333' }}>
                  Enable Automation
                </Text>
                <Text style={{ fontSize: 11, color: '#666' }}>
                  Automatically control light based on schedule
                </Text>
              </VStack>
              <Switch
                value={isEnabled}
                onValueChange={handleToggleChange}
              />
            </View>
          </View>

          {/* Current Status */}
          <View style={styles.statusIndicator}>
            {isWithinSchedule ? (
              <Sun size={24} color="#ffd43b" />
            ) : (
              <Moon size={24} color="#adb5bd" />
            )}
            <VStack style={{ flex: 1 }}>
              <Text style={{ fontSize: 14, fontWeight: '600', color: '#333' }}>
                {isWithinSchedule ? 'Daytime Period' : 'Nighttime Period'}
              </Text>
              <Text style={{ fontSize: 11, color: '#666' }}>
                {isEnabled 
                  ? (isWithinSchedule ? 'Light is ON' : 'Light is OFF')
                  : 'Automation disabled'}
              </Text>
            </VStack>
            <Text style={{ fontSize: 12, color: '#666' }}>
              {currentTime}
            </Text>
          </View>

          {/* Status Details */}
          <View style={styles.statusCard}>
            <View style={styles.row}>
              <Text style={styles.label}>Automation Status</Text>
              <Text style={[styles.value, { color: isEnabled ? '#33b42f' : '#868e96' }]}>
                {isEnabled ? 'Enabled' : 'Disabled'}
              </Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Current Light State</Text>
              <Text style={[styles.value, { color: lightState ? '#33b42f' : '#868e96' }]}>
                {lightState ? '🟢 ON' : '🔴 OFF'}
              </Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Current Period</Text>
              <Text style={styles.value}>
                {isWithinSchedule ? 'Daytime' : 'Nighttime'}
              </Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Daytime Hours</Text>
              <Text style={styles.value}>
                {formatScheduleTime(DAY_START_HOUR, DAY_START_MINUTE)} - {formatScheduleTime(DAY_END_HOUR, DAY_END_MINUTE)}
              </Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Nighttime Hours</Text>
              <Text style={styles.value}>
                {formatScheduleTime(DAY_END_HOUR, DAY_END_MINUTE)} - {formatScheduleTime(DAY_START_HOUR, DAY_START_MINUTE)}
              </Text>
            </View>
          </View>

          {/* Info Alert */}
          <HStack style={{ alignItems: 'center', gap: 8, backgroundColor: '#e7f5ff', padding: 8, borderRadius: 8 }}>
            <AlertCircle size={16} color="#1971c2" />
            <Text style={{ fontSize: 11, color: '#1971c2', flex: 1 }}>
              {isEnabled 
                ? `Light will automatically turn ${isWithinSchedule ? 'ON' : 'OFF'} based on the schedule. Currently in ${isWithinSchedule ? 'daytime' : 'nighttime'} period.`
                : 'Automation is disabled. You can manually control the light from the Controls section.'}
            </Text>
          </HStack>
        </VStack>
      )}
    </View>
  );
};

export default LightCycle;