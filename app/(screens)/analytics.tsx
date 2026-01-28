import { Box } from "@/components/ui/box";
import { HStack } from "@/components/ui/hstack";
import { VStack } from "@/components/ui/vstack";
import React, { useState, useEffect } from "react";
import { ScrollView, StyleSheet, Text, View, Dimensions, Pressable } from "react-native";
import Svg, { Line, Circle, Text as SvgText, Polyline, Rect } from 'react-native-svg';
import { TrendingUp, Droplets, Thermometer, Sun, Sprout } from 'lucide-react-native';
import { useSensorData } from '@/context/sensorContext';
import {
  Select,
  SelectTrigger,
  SelectInput,
  SelectIcon,
  SelectPortal,
  SelectBackdrop,
  SelectContent,
  SelectDragIndicator,
  SelectDragIndicatorWrapper,
  SelectItem,
} from '@/components/ui/select';
import { ChevronDownIcon } from '@/components/ui/icon';
import { useLog } from '@/context/logContext';

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

// Historical Bar Chart Component for Daily Summary
const HistoricalBarChart = ({ dayData, metric, color, width, height }) => {
  if (!dayData || !dayData[metric]) return null;

  const padding = { top: 30, right: 20, bottom: 50, left: 50 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const metricData = dayData[metric];
  const values = [metricData.min, metricData.avg, metricData.max];
  const labels = ['Min', 'Avg', 'Max'];
  
  const maxValue = Math.max(...values);
  const minValue = Math.min(...values);
  const valueRange = maxValue - minValue || 1;
  const barWidth = chartWidth / 10;
  const barSpacing = chartWidth / 8;

  // Grid lines
  const gridLines = [];
  for (let i = 0; i <= 5; i++) {
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
            fontSize="12"
            fill="#666"
            textAnchor="end"
          >
            {line.value.toFixed(1)}
          </SvgText>
        </React.Fragment>
      ))}

      {/* Bars */}
      {values.map((value, index) => {
        const x = padding.left + barSpacing + (index * (barWidth + barSpacing));
        const barHeight = ((value - minValue) / valueRange) * chartHeight;
        const y = padding.top + chartHeight - barHeight;
        
        // Color intensity based on type
        const fillColor = index === 1 ? color : `${color}99`; // avg is solid, min/max are semi-transparent
        
        return (
          <React.Fragment key={index}>
            {/* Bar */}
            <Rect
              x={x}
              y={y}
              width={barWidth}
              height={barHeight}
              fill={fillColor}
              rx="8"
              ry="8"
            />
            
            {/* Value label on top of bar */}
            <SvgText
              x={x + barWidth / 2}
              y={y - 8}
              fontSize="14"
              fontWeight="bold"
              fill={color}
              textAnchor="middle"
            >
              {value.toFixed(1)}
            </SvgText>
            
            {/* X-axis label */}
            <SvgText
              x={x + barWidth / 2}
              y={height - 20}
              fontSize="13"
              fontWeight="600"
              fill="#333"
              textAnchor="middle"
            >
              {labels[index]}
            </SvgText>
          </React.Fragment>
        );
      })}
    </Svg>
  );
};

export default function Analytics() {
  // Use the sensor context instead of managing state locally
  const { historicalData, currentData, isLoading, error } = useSensorData();
  const { 
    dailySummaries, 
    hourlyAggregates, 
    latestReadings,
    getDailySummaryByDate,
    fetchDailySummaries,
    loading: logLoading
  } = useLog();

  const [selectedMetric, setSelectedMetric] = useState('temperature');
  const [timeRange, setTimeRange] = useState('30');
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedDayData, setSelectedDayData] = useState(null);
  
  const screenWidth = Dimensions.get("window").width;
  const chartWidth = screenWidth - 82; // Adjust for padding/margin

  // Fetch daily summaries on mount
  useEffect(() => {
    fetchDailySummaries(30);
  }, []);

  // Set default selected date to most recent
  useEffect(() => {
    if (dailySummaries.length > 0 && !selectedDate) {
      setSelectedDate(dailySummaries[0].date);
      setSelectedDayData(dailySummaries[0]);
    }
  }, [dailySummaries]);

  // Fetch specific day data when date changes
  useEffect(() => {
    if (selectedDate) {
      const dayData = dailySummaries.find(d => d.date === selectedDate);
      if (dayData) {
        setSelectedDayData(dayData);
      } else {
        getDailySummaryByDate(selectedDate).then(data => {
          if (data) setSelectedDayData(data);
        });
      }
    }
  }, [selectedDate]);

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

  const getHistoricalStats = () => {
    if (!selectedDayData) return { min: 0, max: 0, avg: 0 };
    
    const metricData = selectedDayData[selectedMetric];
    if (!metricData) return { min: 0, max: 0, avg: 0 };

    return {
      min: metricData.min || 0,
      max: metricData.max || 0,
      avg: metricData.avg || 0
    };
  };

  const stats = getStats();
  const historicalStats = getHistoricalStats();
  const chartData = getFilteredData();
  
  // Sensors - all available metrics
  const metrics = [
    { key: 'temperature', label: 'Temp', icon: Thermometer, unit: '°C', color: '#ffa726' },
    { key: 'humidity', label: 'Humidity', icon: Droplets, unit: '%', color: '#66bb6a' },
    { key: 'moisture', label: 'Moisture', icon: Sprout, unit: '%', color: '#29b6f6' },
    { key: 'lux', label: 'Light', icon: Sun, unit: 'lux', color: '#ffee58' }
  ];

  const currentMetric = metrics.find(m => m.key === selectedMetric);

  // Format date for display
  const formatDate = (dateStr) => {
    const [year, month, day] = dateStr.split('-');
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

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

      {/* Real-time Chart Card */}
      <View style={{...styles.chartCard, borderWidth: 1}}>
        <Text style={{ fontSize: 16, fontWeight: '700', marginBottom: 12, color: '#000' }}>
          Live Data
        </Text>
        
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

      {/* Historical Chart Card */}
      <View style={{...styles.chartCard, borderWidth: 1}}>
        <Text style={{ fontSize: 16, fontWeight: '700', marginBottom: 12, color: '#000' }}>
          Historical Data
        </Text>

        {/* Date Selector */}
        <Select
          selectedValue={selectedDate}
          onValueChange={(value) => setSelectedDate(value)}
        >
          <SelectTrigger className="w-full bg-white" variant="rounded">
            <SelectInput
              placeholder="Select Day"
              value={selectedDate ? formatDate(selectedDate) : "Select Day"}
            />
            <SelectIcon className="mr-3" as={ChevronDownIcon} />
          </SelectTrigger>
          <SelectPortal>
            <SelectBackdrop />
            <SelectContent>
              <SelectDragIndicatorWrapper>
                <SelectDragIndicator />
              </SelectDragIndicatorWrapper>
              <Box className="p-2">
                {logLoading ? (
                  <SelectItem label="Loading..." value="loading" isDisabled />
                ) : dailySummaries.length === 0 ? (
                  <SelectItem label="No data available" value="none" isDisabled />
                ) : (
                  dailySummaries.map((summary) => (
                    <SelectItem
                      key={summary.date}
                      label={formatDate(summary.date)}
                      value={summary.date}
                    />
                  ))
                )}
              </Box>
            </SelectContent>
          </SelectPortal>
        </Select>

        {/* Chart of selected history data */}
        {selectedDayData ? (
          <View style={{ 
            backgroundColor: '#fafafa', 
            borderRadius: 12, 
            padding: 8,
            marginVertical: 12,
            borderWidth: 0,
          }}>
            <HistoricalBarChart
              dayData={selectedDayData}
              metric={selectedMetric}
              color={currentMetric?.color}
              width={chartWidth}
              height={300}
            />
            
            <Text style={{ 
              textAlign: 'center', 
              color: '#666', 
              fontSize: 12, 
              marginTop: 12 
            }}>
              readings on {formatDate(selectedDayData.date)}
            </Text>
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
              Select a date to view data
            </Text>
          </View>
        )}

        {/* Statistics of selected history data */}
        {selectedDayData && (
          <View style={{...styles.statsContainer, borderWidth: 0}}>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Average</Text>
              <Text style={[styles.statValue, { color: currentMetric?.color }]}>
                {historicalStats.avg.toFixed(1)}
              </Text>
              <Text style={styles.statUnit}>{currentMetric?.unit}</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Min</Text>
              <Text style={styles.statValue}>
                {historicalStats.min.toFixed(1)}
              </Text>
              <Text style={styles.statUnit}>{currentMetric?.unit}</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Max</Text>
              <Text style={styles.statValue}>
                {historicalStats.max.toFixed(1)}
              </Text>
              <Text style={styles.statUnit}>{currentMetric?.unit}</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Readings</Text>
              <Text style={styles.statValue}>
                {selectedDayData.readingCount}
              </Text>
              <Text style={styles.statUnit}>total</Text>
            </View>
          </View>
        )}
      </View>
    </ScrollView>
  );
}