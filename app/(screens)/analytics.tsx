import { Box } from "@/components/ui/box";
import { HStack } from "@/components/ui/hstack";
import { VStack } from "@/components/ui/vstack";
import React, { useState } from "react";
import { ScrollView, StyleSheet, Text, View, Dimensions, Pressable } from "react-native";
import Svg, { Line, Circle, Text as SvgText, Polyline, Rect } from 'react-native-svg';
import { TrendingUp, Droplets, Thermometer, Sun, Sprout } from 'lucide-react-native';
import { useSensorData } from '@/context/sensorContext';

// Simple Line Chart Component
const SimpleLineChart = ({ data, metric, color, width, height }) => {
  if (data.length === 0) return null;

  const padding = { top: 20, right: 20, bottom: 40, left: 40 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  // Get values for the selected metric
  const values = data.map(d => d[metric]);
  const maxValue = Math.max(...values);
  const minValue = Math.min(...values);
  const valueRange = maxValue - minValue || 1;

  // Create points for the line
  const points = values.map((value, index) => {
    const x = padding.left + (index / (values.length - 1 || 1)) * chartWidth;
    const y = padding.top + chartHeight - ((value - minValue) / valueRange) * chartHeight;
    return `${x},${y}`;
  }).join(' ');

  // Grid lines (5 horizontal lines)
  const gridLines = [];
  for (let i = 0; i <= 8; i++) {
    const y = padding.top + (i / 5) * chartHeight;
    const value = maxValue - (i / 5) * valueRange;
    gridLines.push({ y, value });
  }

  return (
    <Svg width={width} height={height}>
      {/* Grid lines */}
      {gridLines.map((line, i) => (
        <React.Fragment key={i}>
          <Line
            x1={padding.left}
            y1={line.y}
            x2={width - padding.right}
            y2={line.y}
            stroke="#e0e0e0"
            strokeWidth="1"
            strokeDasharray="3,3"
          />
          <SvgText
            x={padding.left - 8}
            y={line.y + 4}
            fontSize="10"
            fill="#666"
            textAnchor="end"
          >
            {line.value.toFixed(0)}
          </SvgText>
        </React.Fragment>
      ))}

      {/* Chart line */}
      <Polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Data points */}
      {values.map((value, index) => {
        const x = padding.left + (index / (values.length - 1 || 1)) * chartWidth;
        const y = padding.top + chartHeight - ((value - minValue) / valueRange) * chartHeight;
        return (
          <Circle
            key={index}
            cx={x}
            cy={y}
            r="4"
            fill={color}
            stroke="#fff"
            strokeWidth="2"
          />
        );
      })}

      {/* X-axis labels (show first, middle, last) */}
      {[0, Math.floor(data.length / 2), data.length - 1].map((index) => {
        if (index >= data.length) return null;
        const x = padding.left + (index / (data.length - 1 || 1)) * chartWidth;
        const time = data[index]?.timestamp?.split(':').slice(0, 2).join(':') || '';
        return (
          <SvgText
            key={index}
            x={x}
            y={height - 10}
            fontSize="10"
            fill="#666"
            textAnchor="middle"
          >
            {time}
          </SvgText>
        );
      })}
    </Svg>
  );
};

export default function Analytics() {
  // Use the sensor context instead of managing state locally
  const { historicalData, currentData, isLoading, error } = useSensorData();
  
  const [selectedMetric, setSelectedMetric] = useState('temperature');
  const [timeRange, setTimeRange] = useState('30');
  
  const screenWidth = Dimensions.get("window").width;
  const chartWidth = screenWidth - 72;

  const getFilteredData = () => {
    if (timeRange === 'all') return historicalData;
    const count = parseInt(timeRange);
    return historicalData.slice(-count);
  };

  const getStats = () => {
    const filtered = getFilteredData();
    if (filtered.length === 0) return { min: 0, max: 0, avg: 0, current: 0 };

    const values = filtered.map(d => d[selectedMetric]);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    const current = values[values.length - 1];

    return { min, max, avg, current };
  };

  const stats = getStats();
  const chartData = getFilteredData();
  
  // Sensors
  const metrics = [
    { key: 'temperature', label: 'Temp', icon: Thermometer, unit: '°C', color: '#ffa726' },
    { key: 'humidity', label: 'Humidity', icon: Droplets, unit: '%', color: '#66bb6a' },
    { key: 'moisture', label: 'Moisture', icon: Sprout, unit: '%', color: '#29b6f6' },
    { key: 'lux', label: 'Light', icon: Sun, unit: 'lux', color: '#ffee58' }
  ];

  const currentMetric = metrics.find(m => m.key === selectedMetric);

  const styles = StyleSheet.create({
    container: {
      padding: 20,
      backgroundColor: '#fafafa',
      flexGrow: 1,
    },
    header: {
      fontSize: 24,
      fontWeight: "bold",
      marginBottom: 20,
      color: '#000',
    },
    metricSelector: {
      flexDirection: 'row',
      gap: 8,
      marginBottom: 20,
    },
    metricButton: {
      flex: 1,
      padding: 12,
      borderRadius: 12,
      borderWidth: 2,
      borderColor: '#ddd',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 4,
      backgroundColor: '#fff',
    },
    chartCard: {
      backgroundColor: '#fff',
      borderRadius: 16,
      padding: 16,
      marginBottom: 20,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    timeRangeSelector: {
      flexDirection: 'row',
      gap: 8,
      marginBottom: 16,
    },
    timeButton: {
      flex: 1,
      padding: 10,
      borderRadius: 8,
      backgroundColor: '#f5f5f5',
      alignItems: 'center',
    },
    timeButtonActive: {
      backgroundColor: '#000',
    },
    statsContainer: {
      flexDirection: 'row',
      gap: 8,
      marginTop: 20,
    },
    statBox: {
      flex: 1,
      padding: 12,
      borderRadius: 12,
      backgroundColor: '#f8f9fa',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: '#e0e0e0',
    },
    statLabel: {
      fontSize: 11,
      color: '#666',
      marginBottom: 4,
      fontWeight: '500',
    },
    statValue: {
      fontSize: 20,
      fontWeight: 'bold',
      color: '#000',
    },
    statUnit: {
      fontSize: 10,
      color: '#999',
      marginTop: 2,
    }
  });

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.header}>Sensor Analytics</Text>

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

      {/* Metric Selector */}
      <View style={{...styles.metricSelector, borderWidth: 0}}>
        {metrics.map((metric) => {
          const Icon = metric.icon;
          const isActive = selectedMetric === metric.key;
          return (
            <Pressable
              key={metric.key}
              style={[
                styles.metricButton,
                isActive && {
                  borderColor: metric.color,
                  backgroundColor: `${metric.color}15`,
                }
              ]}
              onPress={() => setSelectedMetric(metric.key)}
            >
              <Icon size={20} color={isActive ? metric.color : '#999'} />
              <Text style={{
                fontSize: 10,
                fontWeight: isActive ? '600' : '400',
                color: isActive ? '#000' : '#666'
              }}>
                {metric.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Chart Card */}
      <View style={{...styles.chartCard, borderWidth: 1}}>
        {/* Time Range Selector */}
        <View style={styles.timeRangeSelector}>
          {['30', '60', 'all'].map((range) => (
            <Pressable
              key={range}
              style={[
                styles.timeButton,
                timeRange === range && styles.timeButtonActive
              ]}
              onPress={() => setTimeRange(range)}
            >
              <Text style={{
                fontSize: 13,
                fontWeight: '600',
                color: timeRange === range ? '#fff' : '#000'
              }}>
                {range === 'all' ? 'All Data' : `Last ${range}`}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Chart */}
        {historicalData.length > 1 ? (
          <View style={{ 
            backgroundColor: '#fafafa', 
            borderRadius: 12, 
            padding: 8,
            marginVertical: 12,
            borderWidth: 0
          }}>
            <SimpleLineChart
              data={chartData}
              metric={selectedMetric}
              color={currentMetric?.color}
              width={chartWidth}
              height={300}
            />
          </View>
        ) : (
          <View style={{ 
            padding: 60, 
            alignItems: 'center',
            backgroundColor: '#fafafa',
            borderRadius: 12,
            marginVertical: 12
          }}>
            <Text style={{ color: '#999', fontSize: 14, fontWeight: '600' }}>
              Collecting data...
            </Text>
            <Text style={{ color: '#ccc', fontSize: 12, marginTop: 8 }}>
              {historicalData.length} / 2 readings minimum
            </Text>
          </View>
        )}

        {/* Statistics */}
        <View style={{...styles.statsContainer, borderWidth: 0}}>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Current</Text>
            <Text style={[styles.statValue, { color: currentMetric?.color }]}>
              {stats.current.toFixed(1)}
            </Text>
            <Text style={styles.statUnit}>{currentMetric?.unit}</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Average</Text>
            <Text style={styles.statValue}>
              {stats.avg.toFixed(1)}
            </Text>
            <Text style={styles.statUnit}>{currentMetric?.unit}</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Min</Text>
            <Text style={styles.statValue}>
              {stats.min.toFixed(1)}
            </Text>
            <Text style={styles.statUnit}>{currentMetric?.unit}</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Max</Text>
            <Text style={styles.statValue}>
              {stats.max.toFixed(1)}
            </Text>
            <Text style={styles.statUnit}>{currentMetric?.unit}</Text>
          </View>
        </View>
      </View>

      {/* Data Points Info */}
      <View style={{
        backgroundColor: '#fff',
        padding: 16,
        borderRadius: 12,
        marginBottom: 20,
        alignItems: 'center',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2,
      }}>
        <Text style={{ fontSize: 14, color: '#666', fontWeight: '600' }}>
          📈 {historicalData.length} data points collected
        </Text>
        <Text style={{ fontSize: 12, color: '#999', marginTop: 4 }}>
          Updates every 3 seconds
        </Text>
      </View>
    </ScrollView>
  );
}