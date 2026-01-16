import { Box } from "@/components/ui/box";
import { HStack } from "@/components/ui/hstack";
import { VStack } from "@/components/ui/vstack";
import React, { useState, useEffect } from "react";
import { ScrollView, StyleSheet, Text, useWindowDimensions, View, ActivityIndicator, Pressable, Alert } from "react-native";
import { Switch } from '@/components/ui/switch';
import {
  Slider,
  SliderTrack,
  SliderFilledTrack,
  SliderThumb,
} from '@/components/ui/slider';
import { TrendingUp, TrendingDown, Minus, AlertTriangle, CheckCircle, Droplets, Thermometer, Sun, Sprout, RefreshCcw } from 'lucide-react-native';
import { useUser } from "@/context/profileContext";
import { generateRecommendations } from '@/components/uiRecommendation/generateRecommendations';
import { useSensorData } from '@/context/sensorContext';

export default function Homepage() {
  const { profile } = useUser();
  
  // Use the shared sensor context
  const { currentData, historicalData, isLoading, error, getSensorData } = useSensorData();
  
  const [analytics, setAnalytics] = useState<{
    trends: Record<string, any>;
    recommendations: Array<{ icon: string; severity: 'danger' | 'warning' | 'success' | 'info'; title: string; message: string; action: string }>;
    healthScore: number;
  }>({
    trends: {},
    recommendations: [],
    healthScore: 100
  });
  const [message, setMessage] = useState("Connecting...");
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [lightBrightness, setLightBrightness] = useState<number>(30);
  const [isConnected, setIsConnected] = useState(false);

  const dimensions = useWindowDimensions();

  // Get sensor data with fallback to zeros
  const sensorData = currentData || {
    temperature: 0,
    humidity: 0,
    moisture: 0,
    lux: 0
  };

  // Analyze trends from historical data
  const analyzeTrends = (history) => {
    if (history.length < 2) return {};

    const recent = history.slice(-5); // Last 5 readings
    const trends = {};

    ['temperature', 'humidity', 'moisture', 'lux'].forEach(metric => {
      const values = recent.map(d => d[metric]);
      const first = values[0];
      const last = values[values.length - 1];
      const change = last - first;
      const changePercent = ((change / first) * 100).toFixed(1);

      trends[metric] = {
        direction: change > 1 ? 'up' : change < -1 ? 'down' : 'stable',
        change: change.toFixed(1),
        changePercent: changePercent,
        current: last
      };
    });

    return trends;
  };

  // Update message based on most critical issue
  const updateMessage = (data: typeof sensorData, recommendations: Array<{ severity: string; title: string }>) => {
    const dangerRecs = recommendations.filter((r: { severity: string; title: string }) => r.severity === 'danger');
    const warningRecs = recommendations.filter((r: { severity: string; title: string }) => r.severity === 'warning');

    if (dangerRecs.length > 0) {
      setMessage(`🚨 URGENT: ${dangerRecs[0].title}`);
    } else if (warningRecs.length > 0) {
      setMessage(`⚠️ ${warningRecs[0].title}`);
    } else {
      setMessage("✅ All systems optimal");
    }
  };

  // Update analytics when sensor data changes
  useEffect(() => {
    if (currentData && historicalData.length > 0) {
      setIsConnected(true);
      
      // Analyze trends
      const trends = analyzeTrends(historicalData);
      
      // Generate recommendations and health score
      const { recommendations, healthScore } = generateRecommendations(sensorData);
      
      setAnalytics({
        trends,
        recommendations,
        healthScore
      });
      
      // Update message
      updateMessage(sensorData, recommendations);
    } else if (error) {
      setIsConnected(false);
      setMessage("Connection failed");
    }
  }, [currentData, historicalData, error]);

  const getTrendIcon = (direction: 'up' | 'down' | 'neutral' | 'stable') => {
    if (direction === 'up') return <TrendingUp size={16} color="#ff6b6b" />;
    if (direction === 'down') return <TrendingDown size={16} color="#51cf66" />;
    return <Minus size={16} color="#868e96" />;
  };

  const getSeverityColor = (severity: 'danger' | 'warning' | 'success' | 'info') => {
    switch (severity) {
      case 'danger': return '#ff6b6b';
      case 'warning': return '#ffa94d';
      case 'success': return '#51cf66';
      default: return '#868e96';
    }
  };

  const getHealthColor = (score: number) => {
    if (score >= 80) return '#51cf66';
    if (score >= 60) return '#ffd43b';
    if (score >= 40) return '#ffa94d';
    return '#ff6b6b';
  };

  // Manual refresh handler
  const handleRefresh = async () => {
    await getSensorData();
  };

  const styles = StyleSheet.create({
    ControlContainer: {
      borderWidth: 1,
      borderColor: "#ccc",
      gap: 12,
      padding: 16,
      borderRadius: 12,
      width: "100%"
    },
    BG: {
      paddingTop: 20,
      paddingLeft: 20,
      paddingRight: 20,
      paddingBottom: 20,
    },
    sensorIndecator: {
      borderRadius: 12,
      backgroundColor: "#F5F5F5",
      justifyContent: "center",
      alignItems: "center",
      position: 'relative',
      minHeight: 140,
      minWidth: "100%",
      flexDirection: "row",
      gap: 4,
      borderBottomWidth: 4,
      borderColor: "#858585",
      borderTopLeftRadius: 0,
      borderTopRightRadius: 0,
      borderBottomLeftRadius: 12,
      borderBottomRightRadius: 12,
    },
    sensorIndicatorBAr: {
      gap: 8,
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 0,
      borderColor: "#ff0000ff",
      borderRadius: 12,
    },
    sensorName: {
      fontSize: 14,
      fontWeight: "600",
      minWidth: 80,
      textAlign: "center",
      fontFamily: "lufga",
    },
    textIndiactor: {
      fontSize: 28,
      fontWeight: "bold",
      color: "#000",
      fontFamily: "lufga",
    },
    textUnit: {
      fontSize: 12,
      color: "#666",
      fontFamily: "lufga",
    },
    trendBadge: {
      position: 'absolute',
      top: 8,
      right: 8,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: 'rgba(255,255,255,0.9)',
      paddingHorizontal: 6,
      paddingVertical: 3,
      borderRadius: 8,
    },
    Status: {
      borderWidth: 1,
      borderColor: "#000",
      alignItems: "center",
      flex: 2,
      borderRadius: 12,
      gap: 4,
      padding: 12,
      flexDirection: "row",
      justifyContent: "center",
    },
    statusDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
      marginRight: 8,
    },
    reconnectButton: {
      borderColor: "#000",
      borderWidth: 1,
      height: 50,
      width: 50,
      borderRadius: 12,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: "#f5f5f5",
    },
    reconnectButtonDisabled: {
      opacity: 0.5,
    },
    Reload: {
      borderColor: "#00rgba(148, 148, 148, 1)",
      borderWidth: 1,
      height: 30,
      width: 30,
      borderRadius: 12,
      justifyContent: "center",
      alignItems: "center",
    },
    messageArea: {
      width: "100%",
      minHeight: 50,
      alignItems: "center",
      justifyContent: analytics.recommendations[0]?.severity === 'danger' ? 'space-between' :
        analytics.recommendations[0]?.severity === 'warning' ? 'space-between' :
          'center',
      borderRadius: 12,
      padding: 12,
    },
    analyticsCard: {
      borderWidth: 1,
      borderColor: "#ddd",
      borderRadius: 12,
      padding: 16,
      gap: 12,
      backgroundColor: "#fff",
    },
    recommendationCard: {
      borderLeftWidth: 4,
      padding: 12,
      borderRadius: 8,
      backgroundColor: "#f8f9fa",
      gap: 8,
    },
    healthScoreContainer: {
      alignItems: "center",
      padding: 16,
      borderRadius: 12,
      backgroundColor: "#f8f9fa",
      gap: 8,
    },
    healthScoreText: {
      fontSize: 48,
      fontWeight: "bold",
    },
    dateSettingContainer: {
      gap: 18,
      marginBottom: 14,
      justifyContent: "space-between",
      alignItems: "center",
      flexDirection: "row",
    },
    body: {
      gap: 24,
    }
  });

  return (
    <ScrollView style={{ ...styles.BG }}>
      {/* Header */}
      <HStack style={{ ...styles.dateSettingContainer }}>
        <HStack style={{ ...styles.Status }}>
          <View style={{
            ...styles.statusDot,
            backgroundColor: isConnected ? '#51cf66' : '#ff6b6b'
          }} />
          <Text style={{ fontWeight: "bold" }}>
            {isConnected ? "Connected" : "Disconnected"}
          </Text>
        </HStack>
        <Pressable
          style={{ ...styles.Reload }}
          onPress={handleRefresh}
        >
          <RefreshCcw size={20} color={"#000"} />
        </Pressable>
      </HStack>

      {/* Error Display */}
      {error && (
        <View style={{
          backgroundColor: '#fee',
          padding: 12,
          borderRadius: 8,
          marginBottom: 16,
        }}>
          <Text style={{ color: '#c33', fontSize: 13 }}>⚠️ {error}</Text>
        </View>
      )}

      <VStack style={{ ...styles.body }}>
        {/* Health Score */}
        {!isLoading && (
          <View style={styles.healthScoreContainer}>
            <Text style={{ fontSize: 12, color: "#666", fontWeight: "600", textAlign: "center" }}>
              🌴 Tropical Forest Health Score
            </Text>
            <Text style={{
              ...styles.healthScoreText,
              color: getHealthColor(analytics.healthScore)
            }}>
              {analytics.healthScore}
            </Text>
            <Text style={{ fontSize: 12, color: "#666" }}>
              {analytics.healthScore >= 80 ? '✨ Excellent - Tropical Paradise' :
                analytics.healthScore >= 60 ? '👍 Good - Minor Adjustments Needed' :
                  analytics.healthScore >= 40 ? '⚠️ Fair - Needs Attention' : '🚨 Critical - Immediate Action Required'}
            </Text>
            <View style={{ marginTop: 12, gap: 4, width: '100%' }}>
              <Text style={{ fontSize: 11, color: "#495057", textAlign: "center" }}>
                Target: Temp 25-30°C | Humidity 70-90%
              </Text>
              <Text style={{ fontSize: 11, color: "#495057", textAlign: "center" }}>
                Moisture 40-60% | Light 1k-10k lux (understory)
              </Text>
            </View>
          </View>
        )}

        {/* Sensors */}
        {isLoading ? (
          <View style={{ alignItems: "center", padding: 40 }}>
            <ActivityIndicator size="large" color="#000" />
            <Text style={{ marginTop: 10 }}>Loading sensor data...</Text>
          </View>
        ) : (
          <HStack style={{ gap: 4, flex: 1, borderWidth: 0, borderColor: "#ddd", padding: 4, borderRadius: 12, justifyContent: "space-between" }}>
            {/* Humidity */}
            <VStack style={{ ...styles.sensorIndicatorBAr }}>
              <HStack style={{ ...styles.sensorIndecator }}>
                {analytics.trends.humidity && (
                  <View style={styles.trendBadge}>
                    {getTrendIcon(analytics.trends.humidity.direction)}
                  </View>
                )}
                <Text style={{ ...styles.textIndiactor }}>
                  {sensorData.humidity.toFixed(1)}
                </Text>
                <Text style={{ ...styles.textUnit }}>%</Text>
              </HStack>
              <Text style={{ ...styles.sensorName }}>Humidity</Text>
            </VStack>

            {/* Temperature */}
            <VStack style={{ ...styles.sensorIndicatorBAr }}>
              <HStack style={{ ...styles.sensorIndecator }}>
                {analytics.trends.temperature && (
                  <View style={styles.trendBadge}>
                    {getTrendIcon(analytics.trends.temperature.direction)}
                  </View>
                )}
                <Text style={{ ...styles.textIndiactor }}>
                  {sensorData.temperature.toFixed(1)}
                </Text>
                <Text style={{ ...styles.textUnit }}>°C</Text>
              </HStack>
              <Text style={{ ...styles.sensorName }}>Temperature</Text>
            </VStack>

            {/* Moisture */}
            <VStack style={{ ...styles.sensorIndicatorBAr }}>
              <HStack style={{ ...styles.sensorIndecator }}>
                {analytics.trends.moisture && (
                  <View style={styles.trendBadge}>
                    {getTrendIcon(analytics.trends.moisture.direction)}
                  </View>
                )}
                <Text style={{ ...styles.textIndiactor }}>
                  {sensorData.moisture}
                </Text>
                <Text style={{ ...styles.textUnit }}>%</Text>
              </HStack>
              <Text style={{ ...styles.sensorName }}>Moisture</Text>
            </VStack>

            {/* Light */}
            <VStack style={{ ...styles.sensorIndicatorBAr }}>
              <HStack style={{ ...styles.sensorIndecator }}>
                {analytics.trends.lux && (
                  <View style={styles.trendBadge}>
                    {getTrendIcon(analytics.trends.lux.direction)}
                  </View>
                )}
                <Text style={{ ...styles.textIndiactor, fontSize: 22 }}>
                  {sensorData.lux > 10000 ? '10k+' : Math.round(sensorData.lux)}
                </Text>
                <Text style={{ ...styles.textUnit }}>lux</Text>
              </HStack>
              <Text style={{ ...styles.sensorName }}>Light</Text>
            </VStack>
          </HStack>
        )}

        {/* Message area */}
        <HStack style={{
          ...styles.messageArea,
          backgroundColor: analytics.recommendations[0]?.severity === 'danger' ? '#ffe3e3' :
            analytics.recommendations[0]?.severity === 'warning' ? '#fff4e6' :
              '#d3f9d8'
        }}>
          <Text style={{
            fontSize: 14,
            fontWeight: "600",
            color: "#333",
          }}>
            {message}
          </Text>
          {analytics.recommendations[0]?.severity === 'danger' ? (
            <Pressable
              style={{ alignItems: "center", justifyContent: "center" }}
              onPress={() => setShowAnalytics(!showAnalytics)}
            >
              <AlertTriangle size={20} color={"#000"} />
              <Text style={{ ...styles.textUnit }}>How to fix?</Text>
            </Pressable>
          ) :
            analytics.recommendations[0]?.severity === 'warning' ? (
              <Pressable
                style={{ alignItems: "center", justifyContent: "center" }}
                onPress={() => setShowAnalytics(!showAnalytics)}
              >
                <AlertTriangle size={20} color={"#000"} />
                <Text>Click Here!</Text>
              </Pressable>
            ) : null}
        </HStack>

        {/* Analytics & Recommendations */}
        {showAnalytics && analytics.recommendations.length > 0 && (
          <View style={styles.analyticsCard}>
            <Text style={{ fontSize: 18, fontWeight: "bold", marginBottom: 8 }}>
              Recommendations
            </Text>
            {analytics.recommendations.map((rec, index) => (
              <View
                key={index}
                style={{
                  ...styles.recommendationCard,
                  borderLeftColor: getSeverityColor(rec.severity)
                }}
              >
                <Text style={{ fontWeight: "bold", fontSize: 14 }}>
                  {rec.title}
                </Text>
                <Text style={{ fontSize: 13, color: "#495057" }}>
                  {rec.message}
                </Text>
                <Text style={{ fontSize: 12, color: "#666", fontStyle: "italic", marginTop: 4 }}>
                  💡 Action: {rec.action}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Control panel */}
        <View style={{ ...styles.ControlContainer }}>
          <Box style={{
            borderWidth: 0,
            borderColor: "#ddd",
            padding: 12,
            justifyContent: "center",
            alignItems: "center",
            borderRadius: 8,
            backgroundColor: "#f9f9f9"
          }}>
            <Text style={{
              fontSize: 16,
              fontWeight: "bold",
            }}>
              Controls
            </Text>
          </Box>

          <View style={{ borderWidth: 1, borderColor: "#ddd", borderRadius: 8 }}>
            <VStack style={{
              justifyContent: "center",
              alignItems: "center",
              borderBottomWidth: 1,
              borderColor: "#ddd",
              padding: 16,
            }}>
              <Switch
                size="md"
                isDisabled={false}
                trackColor={{ false: '#9c9c9cff', true: '#383838ff' }}
                thumbColor="#ffffffff"
              />
              <Text style={{ marginTop: 8 }}>Mist Humidifier</Text>
            </VStack>

            <VStack style={{
              justifyContent: "center",
              alignItems: "center",
              gap: 12,
              padding: 16,
            }}>
              <Text>Light Brightness</Text>

              <Slider
                value={lightBrightness}
                onChange={(value) => setLightBrightness(value)}
                defaultValue={30}
                size="md"
                orientation="horizontal"
                isDisabled={false}
                isReversed={false}
              >
                <SliderTrack>
                  <SliderFilledTrack />
                </SliderTrack>
                <SliderThumb />
              </Slider>
              <Text style={{ fontSize: 14, fontWeight: "600" }}>
                {lightBrightness}%
              </Text>
            </VStack>
          </View>
        </View>
      </VStack>
    </ScrollView>
  );
}