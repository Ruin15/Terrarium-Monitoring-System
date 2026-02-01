import { Box } from "@/components/ui/box";
import { HStack } from "@/components/ui/hstack";
import { VStack } from "@/components/ui/vstack";
import React, { useState, useEffect } from "react";
import { ScrollView, StyleSheet, Text, View, ActivityIndicator, Pressable } from "react-native";
import { TrendingUp, TrendingDown, Minus, AlertTriangle } from 'lucide-react-native';
import { generateRecommendations } from '@/components/uiRecommendation/generateRecommendations';
import { useSensorData } from '@/context/sensorContext';
import { useEcosystem, ECOSYSTEM_INFO } from '@/components/ecosystemLimiter/ecosystemLimiter';
import { AutoMist } from "@/components/ecosystemLimiter/AutoMist";
import { LightCycle } from "@/components/ecosystemLimiter/LightCycle";
import { ConnectionStatus } from "@/components/ConnectionStatus";

export default function Homepage() {
  const { ecosystem, ranges } = useEcosystem();
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

  // Check if we have valid data (at least 6 readings)
  const hasValidConnection = historicalData.length >= 6 && currentData && currentData.temperature > 0;

  // Get sensor data with fallback to zeros if not enough readings
  const sensorData = hasValidConnection ? currentData : {
    temperature: 0,
    humidity: 0,
    moisture: 0,
    lux: 0
  };

  // Determine connection status
  const getConnectionStatus = (): 'connected' | 'connecting' | 'no_connection' => {
    if (isLoading) return 'connecting';
    if (hasValidConnection) return 'connected';
    return 'no_connection';
  };

  const connectionStatus = getConnectionStatus();

  // Analyze trends from historical data
  const analyzeTrends = (history) => {
    if (history.length < 2) return {};

    const recent = history.slice(-5);
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
    if (hasValidConnection) {
      const trends = analyzeTrends(historicalData);
      const { recommendations, healthScore } = generateRecommendations(sensorData, ranges);

      setAnalytics({
        trends,
        recommendations,
        healthScore
      });

      updateMessage(sensorData, recommendations);
    } else if (error) {
      setMessage("Connection failed");
    } else {
      setMessage("Waiting for sensor data...");
    }
  }, [currentData, historicalData, error, ranges, hasValidConnection]);

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
      borderColor: "#33b42f",
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
    body: {
      gap: 24,
    },
  });

  return (
    <ScrollView style={styles.BG}>
      {/* Connection Status Component */}
      <ConnectionStatus
        connectionStatus={connectionStatus}
        readingCount={historicalData.length}
        onRefresh={handleRefresh}
        showReadingCount={false}
      />

      <VStack style={styles.body}>
        {/* Health Score */}
        {!isLoading && hasValidConnection && (
          <View style={styles.healthScoreContainer}>
            <Text style={{ fontSize: 12, color: "#666", fontWeight: "600", textAlign: "center" }}>
              {ECOSYSTEM_INFO[ecosystem].icon} {ECOSYSTEM_INFO[ecosystem].name} Health Score
            </Text>
            <Text style={{
              ...styles.healthScoreText,
              color: getHealthColor(analytics.healthScore)
            }}>
              {analytics.healthScore}
            </Text>
            <Text style={{ fontSize: 12, color: "#666" }}>
              {analytics.healthScore >= 80 ? '✨ Excellent - Perfect Conditions' :
                analytics.healthScore >= 60 ? '👍 Good - Minor Adjustments Needed' :
                  analytics.healthScore >= 40 ? '⚠️ Fair - Needs Attention' : '🚨 Critical - Immediate Action Required'}
            </Text>
            <View style={{ marginTop: 12, gap: 4, width: '100%' }}>
              <Text style={{ fontSize: 11, color: "#495057", textAlign: "center" }}>
                Target: Temp {ranges.temperature.min}-{ranges.temperature.max}°C | Humidity {ranges.humidity.min}-{ranges.humidity.max}%
              </Text>
              <Text style={{ fontSize: 11, color: "#495057", textAlign: "center" }}>
                Moisture {ranges.moisture.min}-{ranges.moisture.max}% | Light {ranges.lux.understory_min}-{ranges.lux.understory_max} lux
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
        ) : !hasValidConnection ? ( 
          <View style={{ alignItems: "center", padding: 40, backgroundColor: "#f8f9fa", borderRadius: 12 }}>
            <AlertTriangle size={40} color="#ff6b6b" />
            <Text style={{ marginTop: 16, fontSize: 16, fontWeight: "600", color: "#333" }}>
              No Connection
            </Text>
          </View>
        ) : ( 
          <HStack style={{ gap: 4, flex: 1, borderWidth: 0, padding: 4, borderRadius: 12, justifyContent: "space-between" }}>
            {/* Humidity */}
            <VStack style={styles.sensorIndicatorBAr}>
              <HStack style={styles.sensorIndecator}>
                {analytics.trends.humidity && (
                  <View style={styles.trendBadge}>
                    {getTrendIcon(analytics.trends.humidity.direction)}
                  </View>
                )}
                <Text style={styles.textIndiactor}>
                  {sensorData.humidity.toFixed(1)}
                </Text>
                <Text style={styles.textUnit}>%</Text>
              </HStack>
              <Text style={styles.sensorName}>Humidity</Text>
            </VStack>

            {/* Temperature */}
            <VStack style={styles.sensorIndicatorBAr}>
              <HStack style={styles.sensorIndecator}>
                {analytics.trends.temperature && (
                  <View style={styles.trendBadge}>
                    {getTrendIcon(analytics.trends.temperature.direction)}
                  </View>
                )}
                <Text style={styles.textIndiactor}>
                  {sensorData.temperature.toFixed(1)}
                </Text>
                <Text style={styles.textUnit}>°C</Text>
              </HStack>
              <Text style={styles.sensorName}>Temperature</Text>
            </VStack>

            {/* Moisture */}
            <VStack style={styles.sensorIndicatorBAr}>
              <HStack style={styles.sensorIndecator}>
                {analytics.trends.moisture && (
                  <View style={styles.trendBadge}>
                    {getTrendIcon(analytics.trends.moisture.direction)}
                  </View>
                )}
                <Text style={styles.textIndiactor}>
                  {sensorData.moisture}
                </Text>
                <Text style={styles.textUnit}>%</Text>
              </HStack>
              <Text style={styles.sensorName}>Moisture</Text>
            </VStack>

            {/* Light */}
            <VStack style={styles.sensorIndicatorBAr}>
              <HStack style={styles.sensorIndecator}>
                {analytics.trends.lux && (
                  <View style={styles.trendBadge}>
                    {getTrendIcon(analytics.trends.lux.direction)}
                  </View>
                )}
                <Text style={{ ...styles.textIndiactor, fontSize: 22 }}>
                  {sensorData.lux > 10000 ? '10k+' : Math.round(sensorData.lux)}
                </Text>
                <Text style={styles.textUnit}>lux</Text>
              </HStack>
              <Text style={styles.sensorName}>Light</Text>
            </VStack>
          </HStack>
        )} 

        {/* Message area */}
        {hasValidConnection && (
          <HStack style={{
            ...styles.messageArea,
            backgroundColor: analytics.recommendations[0]?.severity === 'danger' ? '#ffe3e3' :
              analytics.recommendations[0]?.severity === 'warning' ? '#fff4e6' :
                '#d3f9d8'
          }}>
            <Text style={{ fontSize: 14, fontWeight: "600", color: "#333" }}>
              {message}
            </Text>
            {analytics.recommendations[0]?.severity === 'danger' ? (
              <Pressable
                style={{ alignItems: "center", justifyContent: "center" }}
                onPress={() => setShowAnalytics(!showAnalytics)}
              >
                <AlertTriangle size={20} color={"#000"} />
                <Text style={styles.textUnit}>How to fix?</Text>
              </Pressable>
            ) : analytics.recommendations[0]?.severity === 'warning' ? (
              <Pressable
                style={{ alignItems: "center", justifyContent: "center" }}
                onPress={() => setShowAnalytics(!showAnalytics)}
              >
                <AlertTriangle size={20} color={"#000"} />
                <Text>Click Here!</Text>
              </Pressable>
            ) : null}
          </HStack>
        )}

        {/* Analytics & Recommendations */}
        {hasValidConnection && showAnalytics && analytics.recommendations.length > 0 && (
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
        <View style={styles.ControlContainer}>
          <Box style={{
            borderWidth: 0,
            padding: 12,
            justifyContent: "center",
            alignItems: "center",
            borderRadius: 8,
            backgroundColor: "#f9f9f9"
          }}>
            <Text style={{ fontSize: 16, fontWeight: "bold" }}>
              Controls
            </Text>
          </Box>

          <View style={{ borderWidth: 1, borderColor: "#ddd", borderRadius: 8 }}>
            <AutoMist />
            <LightCycle />
          </View>
        </View>
      </VStack>
    </ScrollView>
  );
}