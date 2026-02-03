import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Alert } from 'react-native';
import { Switch } from '@/components/ui/switch';
import { VStack } from '@/components/ui/vstack';
import { HStack } from '@/components/ui/hstack';
import { Droplets, Power, AlertCircle, CheckCircle, Clock } from 'lucide-react-native';
import { useSensorData } from '@/context/sensorContext';
import { useEcosystem } from '@/components/ecosystemLimiter/ecosystemLimiter';
import { useControl } from '@/context/controlContext';
import { useUser } from '@/context/UserContext';
import { getControllerRestriction, canUpdateController } from '@/_helpers/controllerRestrictions';
import { useConnection } from '@/context/ConnectionContext';
import { doc, updateDoc } from 'firebase/firestore';
import { db, realtimeDb  } from '@/firebase/firebaseConfig';
// ADD THIS IMPORT FOR RTDB
import { ref, set } from 'firebase/database';

interface AutoMistConfig {
  enabled: boolean;
  mistDuration: number;
  cooldownPeriod: number;
  triggerThreshold: 'min' | 'critical_low';
}

export const AutoMist: React.FC = () => {
  const { isConnected } = useConnection();
  const { currentData } = useSensorData();
  const { ranges } = useEcosystem();
  const { humidifierState, setHumidifierState } = useControl();
  const { profile, refreshProfile } = useUser();

  const [config, setConfig] = useState<AutoMistConfig>({
    enabled: false,
    mistDuration: 30,
    cooldownPeriod: 300, //300
    triggerThreshold: 'min'
  });

  const [isActive, setIsActive] = useState(false);
  const [lastMistTime, setLastMistTime] = useState<number>(0);
  const [nextMistAvailable, setNextMistAvailable] = useState<number>(0);
  const [countdown, setCountdown] = useState<number>(0);
  const [isUpdating, setIsUpdating] = useState(false);

  const mistTimerRef = useRef<NodeJS.Timeout | null>(null);
  const cooldownTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Get controller restriction based on connection and profile
  const controllerRestriction = getControllerRestriction(isConnected, profile, 'AutoMist');

  // Sync with Firestore when connected and profile loads
  useEffect(() => {
    if (controllerRestriction.canUpdate && controllerRestriction.reason === 'Connected and synced') {
      const newEnabled = controllerRestriction.enabled;
      if (newEnabled !== config.enabled) {
        // console.log('🔄 Syncing AutoMist status from Firestore:', newEnabled);
        setConfig(prev => ({ ...prev, enabled: newEnabled }));
      }
    }
  }, [controllerRestriction, profile?.ControlAutomation?.AutoMistStatus]);

  // Update Firestore when enabled state changes (only if connected)
  const updateFirestoreStatus = async (enabled: boolean) => {
    if (!canUpdateController(isConnected, isUpdating) || !profile?.id) {
      Alert.alert('Connection Required', 'Cannot update settings without an active connection.');
      return;
    }

    setIsUpdating(true);
    try {
      const userRef = doc(db, 'profile', profile.id);
      await updateDoc(userRef, {
        'ControlAutomation.AutoMistStatus': enabled
      });
      // console.log('✅ AutoMist status updated in Firestore:', enabled);
      await refreshProfile();
    } catch (error) {
      console.error('❌ Error updating AutoMist status:', error);
      Alert.alert('Error', 'Failed to update AutoMist status.');
    } finally {
      setIsUpdating(false);
    }
  };

  const getMoistureThreshold = () => {
    return config.triggerThreshold === 'min'
      ? ranges.moisture.min
      : ranges.moisture.critical_low;
  };

  const isInCooldown = () => {
    const now = Date.now();
    return now < nextMistAvailable;
  };

  const getCooldownRemaining = () => {
    const now = Date.now();
    const remaining = Math.max(0, Math.ceil((nextMistAvailable - now) / 1000));
    return remaining;
  };

  const activateMist = async () => {
    if (isInCooldown()) {
      // console.log('AutoMist: In cooldown period, skipping');
      return;
    }

    // console.log(`AutoMist: Activating mist for ${config.mistDuration} seconds`);
    setIsActive(true);

    try {
      // Write directly to RTDB for ESP32
      const humidifierRef = ref(realtimeDb , 'sensorData/controls/humidifierState');
      await set(humidifierRef, true);
      // console.log('✅ Humidifier state set to TRUE in RTDB');
      
      // Also update through control context
      await setHumidifierState(true);
      setLastMistTime(Date.now());

      mistTimerRef.current = setTimeout(async () => {
        // console.log('AutoMist: Deactivating mist');

        try {
          // Write directly to RTDB for ESP32
          const humidifierRef = ref(realtimeDb , 'sensorData/controls/humidifierState');
          await set(humidifierRef, false);
          // console.log('✅ Humidifier state set to FALSE in RTDB');
          
          await setHumidifierState(false);
        } catch (error) {
          // console.error('AutoMist: Error deactivating mist:', error);
        }

        setIsActive(false);

        const nextAvailable = Date.now() + (config.cooldownPeriod * 1000);
        setNextMistAvailable(nextAvailable);

        mistTimerRef.current = null;
      }, config.mistDuration * 1000) as unknown as NodeJS.Timeout;
    } catch (error) {
      console.error('AutoMist: Error activating mist:', error);
      setIsActive(false);
      Alert.alert('Error', 'Failed to activate misting. Please try again.');
    }
  };

  useEffect(() => {
    if (!config.enabled || !currentData) return;

    const threshold = getMoistureThreshold();
    const currentMoisture = currentData.moisture;

    if (currentMoisture < threshold && !isActive && !isInCooldown()) {
      // console.log(`AutoMist: Moisture ${currentMoisture}% below threshold ${threshold}%, activating mist`);
      activateMist();
    }
  }, [currentData, config.enabled, config.triggerThreshold, ranges.moisture]);

  useEffect(() => {
    if (!isInCooldown()) {
      setCountdown(0);
      return;
    }

    const interval = setInterval(() => {
      const remaining = getCooldownRemaining();
      setCountdown(remaining);

      if (remaining <= 0) {
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [nextMistAvailable]);

  useEffect(() => {
    return () => {
      if (mistTimerRef.current) {
        clearTimeout(mistTimerRef.current);
      }
      if (cooldownTimerRef.current) {
        clearTimeout(cooldownTimerRef.current);
      }
    };
  }, []);

  const handleToggle = async () => {
    if (!controllerRestriction.canUpdate) {
      Alert.alert('Unavailable', controllerRestriction.reason);
      return;
    }

    if (config.enabled && isActive) {
      Alert.alert(
        'Stop Auto-Mist?',
        'Misting is currently active. Are you sure you want to disable auto-mist?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Disable',
            style: 'destructive',
            onPress: async () => {
              const newEnabled = false;
              setConfig({ ...config, enabled: newEnabled });

              if (mistTimerRef.current) {
                clearTimeout(mistTimerRef.current);
                mistTimerRef.current = null;
              }
              setIsActive(false);

              try {
                // Write to RTDB
                const humidifierRef = ref(realtimeDb , 'sensorData/controls/humidifierState');
                await set(humidifierRef, false);
                
                await setHumidifierState(false);
              } catch (error) {
                console.error('AutoMist: Error disabling humidifier:', error);
              }

              // Update Firestore only if connected
              await updateFirestoreStatus(newEnabled);
            }
          }
        ]
      );
    } else {
      const newEnabled = !config.enabled;
      setConfig({ ...config, enabled: newEnabled });

      // Update Firestore only if connected
      await updateFirestoreStatus(newEnabled);
    }
  };

  const handleManualTrigger = () => {
    if (isInCooldown()) {
      Alert.alert(
        'Cooldown Active',
        `Please wait ${countdown} seconds before misting again.`,
        [{ text: 'OK' }]
      );
      return;
    }

    activateMist();
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  };

  const threshold = getMoistureThreshold();
  const currentMoisture = currentData?.moisture || 0;
  const isBelowThreshold = currentMoisture < threshold;

  const styles = StyleSheet.create({
    container: {
      borderWidth: 1,
      borderColor: config.enabled ? '#33b42f' : '#ddd',
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
    statusRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    statusLabel: {
      fontSize: 13,
      color: '#666',
    },
    statusValue: {
      fontSize: 13,
      fontWeight: '600',
      color: '#333',
    },
    activeIndicator: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: isActive ? '#d3f9d8' : isInCooldown() ? '#fff4e6' : '#f1f3f5',
      padding: 12,
      borderRadius: 8,
    },
    thresholdCard: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: isBelowThreshold ? '#ffe3e3' : '#d3f9d8',
      padding: 12,
      borderRadius: 8,
    },
    manualButton: {
      backgroundColor: '#33b42f',
      padding: 12,
      borderRadius: 8,
      alignItems: 'center',
      opacity: isInCooldown() ? 0.5 : 1,
    },
    manualButtonDisabled: {
      backgroundColor: '#dee2e6',
    },
    manualButtonText: {
      color: '#000000',
      fontWeight: '600',
      fontSize: 14,
    },
  });

  return (
    <View style={[styles.container, !controllerRestriction.canUpdate && { opacity: 0.6 }]}>
      <View style={styles.header}>
        <HStack style={{ alignItems: 'center', gap: 8 }}>
          <Droplets size={20} color={config.enabled ? '#33b42f' : '#868e96'} />
          <Text style={styles.title}>Auto-Mist System</Text>
        </HStack>
        <Switch
          value={config.enabled}
          onValueChange={handleToggle}
          disabled={!controllerRestriction.canUpdate}
        />
      </View>

      {!controllerRestriction.canUpdate && (
        <HStack style={{ alignItems: 'center', gap: 8, backgroundColor: '#ffe3e3', padding: 8, borderRadius: 8 }}>
          <AlertCircle size={16} color="#fa1f1f" />
          <Text style={{ fontSize: 11, color: '#bb0f0f', flex: 1 }}>
            {controllerRestriction.reason}
          </Text>
        </HStack>
      )}

      {config.enabled && controllerRestriction.canUpdate && (
        <VStack style={{ gap: 12 }}>
          <View style={styles.activeIndicator}>
            {isActive ? (
              <>
                <Droplets size={20} color="#33b42f" />
                <Text style={{ fontSize: 13, fontWeight: '600', color: '#33b42f', flex: 1 }}>
                  Misting Active
                </Text>
              </>
            ) : isInCooldown() ? (
              <>
                <Clock size={20} color="#ffa94d" />
                <Text style={{ fontSize: 13, fontWeight: '600', color: '#ffa94d', flex: 1 }}>
                  Cooldown: {formatTime(countdown)}
                </Text>
              </>
            ) : (
              <>
                <CheckCircle size={20} color="#868e96" />
                <Text style={{ fontSize: 13, fontWeight: '600', color: '#868e96', flex: 1 }}>
                  Monitoring
                </Text>
              </>
            )}
          </View>

          <View style={styles.thresholdCard}>
            <VStack style={{ flex: 1 }}>
              <Text style={{ fontSize: 12, color: '#666' }}>Current Moisture</Text>
              <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#333' }}>
                {currentMoisture}%
              </Text>
            </VStack>
            <VStack style={{ alignItems: 'flex-end' }}>
              <Text style={{ fontSize: 12, color: '#666' }}>Threshold</Text>
              <Text style={{ fontSize: 18, fontWeight: 'bold', color: isBelowThreshold ? '#ff6b6b' : '#33b42f' }}>
                {threshold}%
              </Text>
            </VStack>
          </View>

          <View style={styles.statusCard}>
            <View style={styles.statusRow}>
              <Text style={styles.statusLabel}>Mist Duration</Text>
              <Text style={styles.statusValue}>{config.mistDuration}s</Text>
            </View>
            <View style={styles.statusRow}>
              <Text style={styles.statusLabel}>Cooldown Period</Text>
              <Text style={styles.statusValue}>{formatTime(config.cooldownPeriod)}</Text>
            </View>
            <View style={styles.statusRow}>
              <Text style={styles.statusLabel}>Trigger Point</Text>
              <Text style={styles.statusValue}>
                {config.triggerThreshold === 'min' ? 'Minimum' : 'Critical Low'}
              </Text>
            </View>
          </View>

          <Pressable
            style={[
              styles.manualButton,
              (isInCooldown() || isActive) && styles.manualButtonDisabled
            ]}
            onPress={handleManualTrigger}
            disabled={isInCooldown() || isActive}
          >
            <Text style={styles.manualButtonText}>
              {isActive ? 'Misting...' : isInCooldown() ? `Wait ${formatTime(countdown)}` : 'Manual Trigger'}
            </Text>
          </Pressable>

          {isBelowThreshold && !isActive && !isInCooldown() && (
            <HStack style={{ alignItems: 'center', gap: 8, backgroundColor: '#ffe3e3', padding: 8, borderRadius: 8 }}>
              <AlertCircle size={16} color="#ff6b6b" />
              <Text style={{ fontSize: 11, color: '#c92a2a', flex: 1 }}>
                Moisture below threshold - Auto-mist will activate on next reading
              </Text>
            </HStack>
          )}
        </VStack>
      )}

      {!config.enabled && controllerRestriction.canUpdate && (
        <Text style={{ fontSize: 12, color: '#868e96', textAlign: 'center', paddingVertical: 8 }}>
          Enable to automatically activate misting when soil moisture drops below the ecosystem minimum
        </Text>
      )}
    </View>
  );
};

export default AutoMist;