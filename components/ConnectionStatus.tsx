import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { HStack } from '@/components/ui/hstack';
import { RefreshCcw } from 'lucide-react-native';
import { useConnection } from '@/context/ConnectionContext';


interface ConnectionStatusProps {
  connectionStatus: 'connected' | 'connecting' | 'no_connection';
  readingCount?: number;
  onRefresh?: () => void;
  showReadingCount?: boolean;
  timeout?: number; // in seconds, default 15
}

export const ConnectionStatus: React.FC<ConnectionStatusProps> = ({
  connectionStatus,
  readingCount = 0,
  onRefresh,
  showReadingCount = false,
  timeout = 15
}) => {
  const { setIsConnected } = useConnection();
  const [timeoutTriggered, setTimeoutTriggered] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Update connection context when status changes
  useEffect(() => {
    const isConnected = connectionStatus === 'connected';
    setIsConnected(isConnected);
    console.log('📡 Connection context updated:', isConnected);
  }, [connectionStatus, setIsConnected]);

  // Handle timeout logic
  useEffect(() => {
    // Reset timeout trigger when status changes
    setTimeoutTriggered(false);

    // Set timeout only for 'connecting' status
    if (connectionStatus === 'connecting') {
      console.log(`⏱️ Starting ${timeout}s connection timeout...`);
      
      timeoutRef.current = setTimeout(() => {
        console.log('⏱️ Connection timeout reached');
        setTimeoutTriggered(true);
      }, timeout * 1000) as unknown as NodeJS.Timeout;
    }

    // Cleanup
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [connectionStatus, timeout]);

  // Determine effective status (override connecting if timeout triggered)
  const effectiveStatus = 
    connectionStatus === 'connecting' && timeoutTriggered 
      ? 'no_connection' 
      : connectionStatus;

  const handleRefresh = async () => {
    if (onRefresh && !isRefreshing) {
      setIsRefreshing(true);
      setTimeoutTriggered(false); // Reset timeout trigger on manual refresh
      
      try {
        await onRefresh();
      } catch (error) {
        console.error('Error during refresh:', error);
      } finally {
        setIsRefreshing(false);
      }
    }
  };
  
  const getStatusColor = () => {
    switch (effectiveStatus) {
      case 'connected': return '#33b42f';
      case 'connecting': return '#ffa94d';
      case 'no_connection': return '#ff6b6b';
    }
  };

  const getDotColor = () => {
    switch (effectiveStatus) {
      case 'connected': return '#51cf66';
      case 'connecting': return '#ffa94d';
      case 'no_connection': return '#ff6b6b';
    }
  };

  const getStatusText = () => {
    if (effectiveStatus === 'no_connection' && timeoutTriggered) {
      return 'Connection Timeout';
    }
    
    switch (effectiveStatus) {
      case 'connected': 
        return showReadingCount ? `Connected (${readingCount} readings)` : 'Connected';
      case 'connecting': 
        return 'Connecting...';
      case 'no_connection': 
        return 'No Connection';
    }
  };

  const getTextColor = () => {
    switch (effectiveStatus) {
      case 'connected': return '#333';
      case 'connecting': return '#ffa94d';
      case 'no_connection': return '#ff6b6b';
    }
  };

  const styles = StyleSheet.create({
    container: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
    },
    statusBox: {
      borderWidth: 1,
      borderColor: getStatusColor(),
      alignItems: 'center',
      flex: 2,
      borderRadius: 12,
      gap: 4,
      padding: 12,
      flexDirection: 'row',
      justifyContent: 'center',
    },
    statusDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
      marginRight: 8,
      backgroundColor: getDotColor(),
    },
    statusText: {
      fontSize: 14,
      fontWeight: '600',
      color: getTextColor(),
    },
    reloadButton: {
      borderColor: 'rgba(148, 148, 148, 1)',
      borderWidth: 1,
      height: 30,
      width: 30,
      borderRadius: 12,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: '#fff',
    },
  });

  return (
    <HStack style={styles.container}>
      <HStack style={styles.statusBox}>
        <View style={styles.statusDot} />
        <Text style={styles.statusText}>
          {getStatusText()}
        </Text>
      </HStack>
      
      {onRefresh && (
        <Pressable
          style={[styles.reloadButton, isRefreshing && { opacity: 0.5 }]}
          onPress={handleRefresh}
          disabled={isRefreshing}
        >
          <RefreshCcw 
            size={20} 
            color="#000"
            style={{ transform: [{ rotate: isRefreshing ? '360deg' : '0deg' }] }}
          />
        </Pressable>
      )}
    </HStack>
  );
};



export default ConnectionStatus;