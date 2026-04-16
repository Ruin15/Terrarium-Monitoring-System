import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { VStack } from '@/components/ui/vstack';
import { HStack } from '@/components/ui/hstack';
import { Sun, Moon, Clock, AlertCircle, Thermometer } from 'lucide-react-native';
import { useControl } from '@/context/controlContext';
import { useUser } from '@/context/UserContext';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/firebase/firebaseConfig';
import { Switch } from '@/components/ui/switch';
import { getControllerRestriction } from '@/_helpers/controllerRestrictions';
import { useConnection } from '@/context/ConnectionContext';
import { useSensorData } from '@/context/sensorContext';
import { useEcosystem } from '@/components/ecosystemLimiter/ecosystemLimiter';


export const LightCycle: React.FC = () => {
  const { isConnected } = useConnection();
  const { lightState, setLightState } = useControl();
  const { profile, refreshProfile } = useUser();
  const { currentData } = useSensorData();
  const { ranges } = useEcosystem();

  const [currentTime, setCurrentTime] = useState<string>('');
  const [isWithinSchedule, setIsWithinSchedule] = useState(false);
  const [isEnabled, setIsEnabled] = useState(true);
  const [isTempEmergencyActive, setIsTempEmergencyActive] = useState(false);
  const [tempEmergencyEndTime, setTempEmergencyEndTime] = useState<number | null>(null);
  const [emergencyActivationCount, setEmergencyActivationCount] = useState(0); // Track emergency cycles
  const controllerRestriction = getControllerRestriction(isConnected, profile, 'AutoMist');

  const cycleIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const emergencyLightStateRef = useRef<boolean>(true); // Track expected emergency light state

  // Day schedule: 6:30 AM - 6:00 PM (18:00)
  const DAY_START_HOUR = 6;
  const DAY_START_MINUTE = 30;
  const DAY_END_HOUR = 18;
  const DAY_END_MINUTE = 0;

  // Morning warm-up window: 6:00 AM - 6:30 AM (30 minutes)
  const WARMUP_START_HOUR = 6;
  const WARMUP_START_MINUTE = 0;
  const WARMUP_END_HOUR = 6;
  const WARMUP_END_MINUTE = 30;
  const TEMP_EMERGENCY_DURATION_MS = 30 * 60 * 1000; // 30 minutes

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
    // 🔒 CRITICAL: Cannot disable automation during temperature emergency - LOCKED
    if (isTempEmergencyActive) {
      console.warn('⚠️ LightCycle: Emergency mode active - automation toggle locked');
      return;
    }

    try {
      setIsEnabled(value);
      await updateFirestoreStatus(value);
      console.log(`✅ LightCycle: Automation toggled to ${value}`);

      if (!value) {
        // Disable: Turn light OFF
        await setLightState(false);
      } else {
        // Enable: Set to current schedule
        const withinSchedule = isWithinDaySchedule();
        await setLightState(withinSchedule);
      }
    } catch (error) {
      console.error('❌ LightCycle: Error toggling automation:', error);
      setIsEnabled(!value); // Revert on error
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

  const isWithinWarmupWindow = (): boolean => {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();

    const currentTotalMinutes = currentHour * 60 + currentMinute;
    const warmupStartMinutes = WARMUP_START_HOUR * 60 + WARMUP_START_MINUTE;
    const warmupEndMinutes = WARMUP_END_HOUR * 60 + WARMUP_END_MINUTE;

    return currentTotalMinutes >= warmupStartMinutes && currentTotalMinutes < warmupEndMinutes;
  };

  const isTemperatureBelowMinimum = (): boolean => {
    if (!currentData) return false;
    return currentData.temperature < ranges.temperature.min;
  };

  const getRemainingEmergencyTime = (): string => {
    if (!tempEmergencyEndTime) return '';
    const now = Date.now();
    const remaining = tempEmergencyEndTime - now;
    if (remaining <= 0) return '';

    const minutes = Math.floor(remaining / 60000);
    const seconds = Math.floor((remaining % 60000) / 1000);
    return `${minutes}m ${seconds}s`;
  };

  useEffect(() => {
    const updateCycle = async () => {
      const now = getCurrentTime();
      setCurrentTime(now);

      const withinSchedule = isWithinDaySchedule();
      const withinWarmup = isWithinWarmupWindow();
      const isTempLow = isTemperatureBelowMinimum();

      setIsWithinSchedule(withinSchedule);

      // Check if temperature emergency should activate/deactivate
      if (isTempLow && withinWarmup && !isTempEmergencyActive) {
        // Activate temperature emergency mode
        console.log('🔥 LightCycle: Temperature Emergency ACTIVATED - Low temp during warm-up window');
        setIsTempEmergencyActive(true);
        setTempEmergencyEndTime(Date.now() + TEMP_EMERGENCY_DURATION_MS);
        setEmergencyActivationCount(prev => prev + 1);
        emergencyLightStateRef.current = true;
      } else if (isTempEmergencyActive && tempEmergencyEndTime) {
        // Check if emergency period has ended
        if (Date.now() >= tempEmergencyEndTime) {
          console.log('✅ LightCycle: Temperature Emergency DEACTIVATED - Recovery period complete');
          setIsTempEmergencyActive(false);
          setTempEmergencyEndTime(null);
          emergencyLightStateRef.current = false;

          // ✅ Resume normal schedule after emergency ends
          try {
            if (isEnabled) {
              const withinSchedule = isWithinDaySchedule();
              await setLightState(withinSchedule);
              console.log(`✅ LightCycle: Resumed normal schedule - Light set to ${withinSchedule ? 'ON' : 'OFF'}`);
            } else {
              await setLightState(false);
              console.log('✅ LightCycle: Emergency ended, automation disabled - Light set to OFF');
            }
          } catch (error) {
            console.error('❌ LightCycle: Error resuming normal schedule after emergency:', error);
          }
        }
      }


      // Only control light if automation is enabled OR emergency is active
      // NOTE: Decision is based SOLELY on schedule and temperature conditions
      // Current lightState from context is used only for display, NOT for control logic
      if (isEnabled || isTempEmergencyActive) {
        try {
          // Determine desired state based on automatic schedule only
          let shouldTurnOn = withinSchedule;

          // 🔒 CRITICAL: Emergency overrides EVERYTHING — light must stay ON
          // User cannot disable automation or turn off light during emergency
          if (isTempEmergencyActive) {
            shouldTurnOn = true;
            emergencyLightStateRef.current = true;
          }

          // Apply the automatic control without considering current light state
          if (shouldTurnOn) {
            // Turn light ON during daytime or during temperature emergency
            await setLightState(true);
          } else if (!isTempEmergencyActive) {
            // Turn light OFF during nighttime ONLY if NOT in emergency
            // 🔒 Safety: Never turn off light during emergency, even if schedule says night
            await setLightState(false);
          } else {
            // Emergency active but shouldn't turn on (shouldn't happen) - force ON
            console.warn('⚠️ LightCycle: Emergency active with shouldTurnOn=false, forcing ON');
            await setLightState(true);
          }
        } catch (error) {
          console.error('❌ LightCycle: Error setting light state:', error);
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
  }, [isEnabled, isTempEmergencyActive, tempEmergencyEndTime]);

  // Update remaining time display more frequently when emergency is active
  useEffect(() => {
    if (!isTempEmergencyActive) return;

    const countdownInterval = setInterval(() => {
      // This will trigger re-render to update the countdown
      setCurrentTime(getCurrentTime());
    }, 1000); // Update every second during emergency

    return () => clearInterval(countdownInterval);
  }, [isTempEmergencyActive, tempEmergencyEndTime]);

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
          {/* Emergency Mode Lock Banner */}
          {isTempEmergencyActive && (
            <HStack style={{ alignItems: 'center', gap: 8, backgroundColor: '#fff3bf', borderLeftWidth: 4, borderLeftColor: '#ff922b', padding: 10, borderRadius: 8 }}>
              <AlertCircle size={18} color="#ff922b" />
              <VStack style={{ flex: 1, gap: 2 }}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#ff922b' }}>⚠️ EMERGENCY MODE - ALL CONTROLS LOCKED</Text>
                <Text style={{ fontSize: 10, color: '#e17c00' }}>
                  Light is forced ON for thermal recovery. Automation toggle disabled until emergency ends ({getRemainingEmergencyTime()}).
                </Text>
              </VStack>
            </HStack>
          )}

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
                disabled={isTempEmergencyActive}  // 🔒 grey out during emergency
              />
            </View>
          </View>

          {/* Current Status */}
          <View style={styles.statusIndicator}>
            {isWithinSchedule || isTempEmergencyActive ? (
              <Sun size={24} color="#ffd43b" />
            ) : (
              <Moon size={24} color="#adb5bd" />
            )}
            <VStack style={{ flex: 1 }}>
              <Text style={{ fontSize: 14, fontWeight: '600', color: '#333' }}>
                {isTempEmergencyActive
                  ? '🔥 Temperature Emergency - Heating Mode'
                  : (isWithinSchedule ? 'Daytime Period' : 'Nighttime Period')}
              </Text>
              <Text style={{ fontSize: 11, color: '#666' }}>
                {isEnabled
                  ? (isTempEmergencyActive
                    ? `Light forced ON for ${getRemainingEmergencyTime()}`
                    : (isWithinSchedule ? 'Light is ON' : 'Light is OFF'))
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
                {isTempEmergencyActive ? '🔥 Emergency Heating' : (isWithinSchedule ? 'Daytime' : 'Nighttime')}
              </Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Current Temperature</Text>
              <Text style={[styles.value, { color: isTemperatureBelowMinimum() ? '#ff6b6b' : '#33b42f' }]}>
                {currentData ? `${currentData.temperature.toFixed(1)}°C` : 'No data'}
                {currentData && isTemperatureBelowMinimum() ? ' ⚠️ Low' : ''}
              </Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Minimum Temp Threshold</Text>
              <Text style={styles.value}>
                {ranges.temperature.min}°C
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
            <View style={styles.row}>
              <Text style={styles.label}>Emergency Heat Window</Text>
              <Text style={styles.value}>
                {formatScheduleTime(WARMUP_START_HOUR, WARMUP_START_MINUTE)} - {formatScheduleTime(WARMUP_END_HOUR, WARMUP_END_MINUTE)}
              </Text>
            </View>
            {isTempEmergencyActive && (
              <>
                <View style={{ borderTopWidth: 1, borderTopColor: '#dee2e6', marginTop: 8, paddingTop: 8 }} />
                <View style={styles.row}>
                  <Text style={[styles.label, { fontWeight: '700', color: '#ff6b6b' }]}>🔥 Emergency Status</Text>
                  <Text style={[styles.value, { color: '#ff6b6b' }]}>ACTIVE</Text>
                </View>
                <View style={styles.row}>
                  <Text style={styles.label}>Emergency Time Remaining</Text>
                  <Text style={[styles.value, { color: '#ff6b6b', fontWeight: '700' }]}>
                    {getRemainingEmergencyTime()}
                  </Text>
                </View>
                <View style={styles.row}>
                  <Text style={styles.label}>Controls Status</Text>
                  <Text style={[styles.value, { color: '#ff6b6b' }]}>🔒 LOCKED</Text>
                </View>
              </>
            )}
          </View>

          {/* Info Alert */}
          {isTempEmergencyActive ? (
            <HStack style={{ alignItems: 'center', gap: 8, backgroundColor: '#ffe3e3', padding: 8, borderRadius: 8 }}>
              <AlertCircle size={16} color="#ff6b6b" />
              <Text style={{ fontSize: 11, color: '#c92a2a', flex: 1 }}>
                🔥 <Text style={{ fontWeight: '700' }}>EMERGENCY HEATING ACTIVE</Text>: Temperature critically low ({currentData?.temperature.toFixed(1)}°C &lt; {ranges.temperature.min}°C). LED forced ON. All controls locked for {getRemainingEmergencyTime()} remaining.
              </Text>
            </HStack>
          ) : (
            <HStack style={{ alignItems: 'center', gap: 8, backgroundColor: '#e7f5ff', padding: 8, borderRadius: 8 }}>
              <AlertCircle size={16} color="#1971c2" />
              <Text style={{ fontSize: 11, color: '#1971c2', flex: 1 }}>
                {isEnabled
                  ? `Light will automatically turn ${isWithinSchedule ? 'ON' : 'OFF'} based on the schedule. During morning warm-up (6:00-6:30 AM), if temperature drops below ${ranges.temperature.min}°C, LED will force ON for 30 minutes of emergency heating.`
                  : 'Automation is disabled. You can manually control the light from the Controls section.'}
              </Text>
            </HStack>
          )}
        </VStack>
      )}
    </View>
  );
};

export default LightCycle;
