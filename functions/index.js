// Firebase Cloud Functions
// File: functions/index.js

const { onValueUpdated } = require("firebase-functions/v2/database");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const admin = require("firebase-admin");

// Initialize Firebase Admin
admin.initializeApp();

const db = admin.firestore();

/**
 * Cloud Function: Store sensor data to Firestore
 * Triggers whenever sensorData is updated in Realtime Database
 * Creates aggregated records in Firestore (NO raw sensor readings)
 */
exports.storeSensorDataToFirestore = onValueUpdated(
    {
      ref: "/sensorData",
      region: "asia-southeast1",
      instance: "tearrarium-iot-monitoring-default-rtdb",
    },
    async (event) => {
      const change = event.data;
      try {
        const newData = change.after.val();
        const oldData = change.before.val();

        // Only store if data has actually changed
        if (JSON.stringify(newData) === JSON.stringify(oldData)) {
          console.log("No change in data, skipping...");
          return null;
        }

        const timestamp = admin.firestore.FieldValue.serverTimestamp();
        const timestampMillis = Date.now();
        const date = new Date(timestampMillis).toISOString().split("T")[0];
        const hour = new Date(timestampMillis).getHours();

        // Prepare base data
        const sensorData = {
          temperature: newData.temperature || 0,
          humidity: newData.humidity || 0,
          moisture: newData.moisture || 0,
          lux: newData.lux || 0,
        };

        // 1. Update latest reading ONLY
        await db.collection("latestReadings").doc("current").set({
          ...sensorData,
          timestamp: timestamp,
          timestampMillis: timestampMillis,
          date: date,
          hour: hour,
          controls: {
            humidifierState: (newData.controls &&
                newData.controls.humidifierState) || false,
            lightBrightness: (newData.controls &&
                newData.controls.lightBrightness) || 0,
          },
        });
        console.log("✓ Updated latest reading");

        // 2. Update hourly aggregates
        const hourlyDocId = `${date}_${hour}`;
        const hourlyRef = db.collection("hourlyAggregates").doc(hourlyDocId);

        await db.runTransaction(async (transaction) => {
          const hourlyDoc = await transaction.get(hourlyRef);

          if (!hourlyDoc.exists) {
            transaction.set(hourlyRef, {
              date: date,
              hour: hour,
              count: 1,
              temperature: {
                sum: sensorData.temperature,
                min: sensorData.temperature,
                max: sensorData.temperature,
                avg: sensorData.temperature,
              },
              humidity: {
                sum: sensorData.humidity,
                min: sensorData.humidity,
                max: sensorData.humidity,
                avg: sensorData.humidity,
              },
              moisture: {
                sum: sensorData.moisture,
                min: sensorData.moisture,
                max: sensorData.moisture,
                avg: sensorData.moisture,
              },
              lux: {
                sum: sensorData.lux,
                min: sensorData.lux,
                max: sensorData.lux,
                avg: sensorData.lux,
              },
              lastUpdated: timestamp,
            });
          } else {
            const data = hourlyDoc.data();
            const newCount = data.count + 1;

            transaction.update(hourlyRef, {
              count: newCount,
              temperature: {
                sum: data.temperature.sum + sensorData.temperature,
                min: Math.min(data.temperature.min, sensorData.temperature),
                max: Math.max(data.temperature.max, sensorData.temperature),
                avg: (data.temperature.sum + sensorData.temperature) / newCount,
              },
              humidity: {
                sum: data.humidity.sum + sensorData.humidity,
                min: Math.min(data.humidity.min, sensorData.humidity),
                max: Math.max(data.humidity.max, sensorData.humidity),
                avg: (data.humidity.sum + sensorData.humidity) / newCount,
              },
              moisture: {
                sum: data.moisture.sum + sensorData.moisture,
                min: Math.min(data.moisture.min, sensorData.moisture),
                max: Math.max(data.moisture.max, sensorData.moisture),
                avg: (data.moisture.sum + sensorData.moisture) / newCount,
              },
              lux: {
                sum: data.lux.sum + sensorData.lux,
                min: Math.min(data.lux.min, sensorData.lux),
                max: Math.max(data.lux.max, sensorData.lux),
                avg: (data.lux.sum + sensorData.lux) / newCount,
              },
              lastUpdated: timestamp,
            });
          }
        });
        console.log("✓ Updated hourly aggregate");

        // 3. Update daily summary
        const dailyDocId = date;
        const dailyRef = db.collection("dailySummaries").doc(dailyDocId);

        await db.runTransaction(async (transaction) => {
          const dailyDoc = await transaction.get(dailyRef);

          if (!dailyDoc.exists) {
            transaction.set(dailyRef, {
              date: date,
              readingCount: 1,
              temperature: {
                min: sensorData.temperature,
                max: sensorData.temperature,
                avg: sensorData.temperature,
              },
              humidity: {
                min: sensorData.humidity,
                max: sensorData.humidity,
                avg: sensorData.humidity,
              },
              moisture: {
                min: sensorData.moisture,
                max: sensorData.moisture,
                avg: sensorData.moisture,
              },
              lux: {
                min: sensorData.lux,
                max: sensorData.lux,
                avg: sensorData.lux,
              },
              lastUpdated: timestamp,
            });
          } else {
            const data = dailyDoc.data();
            const newCount = data.readingCount + 1;

            transaction.update(dailyRef, {
              readingCount: newCount,
              temperature: {
                min: Math.min(data.temperature.min, sensorData.temperature),
                max: Math.max(data.temperature.max, sensorData.temperature),
                avg: ((data.temperature.avg * data.readingCount) +
                    sensorData.temperature) / newCount,
              },
              humidity: {
                min: Math.min(data.humidity.min, sensorData.humidity),
                max: Math.max(data.humidity.max, sensorData.humidity),
                avg: ((data.humidity.avg * data.readingCount) +
                    sensorData.humidity) / newCount,
              },
              moisture: {
                min: Math.min(data.moisture.min, sensorData.moisture),
                max: Math.max(data.moisture.max, sensorData.moisture),
                avg: ((data.moisture.avg * data.readingCount) +
                    sensorData.moisture) / newCount,
              },
              lux: {
                min: Math.min(data.lux.min, sensorData.lux),
                max: Math.max(data.lux.max, sensorData.lux),
                avg: ((data.lux.avg * data.readingCount) +
                    sensorData.lux) / newCount,
              },
              lastUpdated: timestamp,
            });
          }
        });
        console.log("✓ Updated daily summary");

        return null;
      } catch (error) {
        console.error("Error storing sensor data:", error);
        return null;
      }
    });

/**
 * Cloud Function: Cleanup old hourly aggregates
 * Runs daily to delete hourly data older than 7 days
 * (Daily summaries are kept longer)
 */
exports.cleanupOldHourlyAggregates = onSchedule(
    {
      schedule: "every 24 hours",
      region: "asia-southeast1",
    },
    async (event) => {
      try {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const cutoffDate = sevenDaysAgo.toISOString().split("T")[0];

        const oldAggregatesQuery = db.collection("hourlyAggregates")
            .where("date", "<", cutoffDate)
            .limit(500);

        const snapshot = await oldAggregatesQuery.get();

        if (snapshot.empty) {
          console.log("No old hourly aggregates to delete");
          return null;
        }

        const batch = db.batch();
        snapshot.docs.forEach((doc) => {
          batch.delete(doc.ref);
        });

        await batch.commit();
        console.log(`✓ Deleted ${snapshot.size} old hourly aggregates`);

        return null;
      } catch (error) {
        console.error("Error cleaning up old hourly aggregates:", error);
        return null;
      }
    });

/**
 * Cloud Function: Cleanup old daily summaries
 * Runs daily to delete daily summaries older than 90 days
 */
exports.cleanupOldDailySummaries = onSchedule(
    {
      schedule: "every 24 hours",
      region: "asia-southeast1",
    },
    async (event) => {
      try {
        const ninetyDaysAgo = new Date();
        ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
        const cutoffDate = ninetyDaysAgo.toISOString().split("T")[0];

        const oldSummariesQuery = db.collection("dailySummaries")
            .where("date", "<", cutoffDate)
            .limit(500);

        const snapshot = await oldSummariesQuery.get();

        if (snapshot.empty) {
          console.log("No old daily summaries to delete");
          return null;
        }

        const batch = db.batch();
        snapshot.docs.forEach((doc) => {
          batch.delete(doc.ref);
        });

        await batch.commit();
        console.log(`✓ Deleted ${snapshot.size} old daily summaries`);

        return null;
      } catch (error) {
        console.error("Error cleaning up old daily summaries:", error);
        return null;
      }
    });

/**
 * Cloud Function: Store sensor alerts for email reports
 * Monitors sensor data and stores alerts based on threshold violations
 * Thresholds are dynamically synced from the user's selected ecosystem
 * Data is stored in Firestore for email report generation
 */

// Ecosystem-specific thresholds (matching ecosystemLimiter.tsx)
const ECOSYSTEM_THRESHOLDS = {
  tropical: {
    temperature: { 
      min: 25, 
      max: 30, 
      critical_low: 20, 
      critical_high: 35,
      warning_low: 22,
      warning_high: 33
    },
    humidity: { 
      min: 70, 
      max: 90, 
      critical_low: 50, 
      critical_high: 95,
      warning_low: 60,
      warning_high: 92
    },
    moisture: { 
      min: 40, 
      max: 60, 
      critical_low: 25, 
      critical_high: 70,
      warning_low: 30,
      warning_high: 65
    },
    lux: { 
      min: 1000, 
      max: 10000, 
      critical_low: 500, 
      critical_high: 60000,
      warning_low: 800,
      warning_high: 40000
    },
  },
  woodland: {
    temperature: { 
      min: 16, 
      max: 24, 
      critical_low: 10, 
      critical_high: 28,
      warning_low: 12,
      warning_high: 26
    },
    humidity: { 
      min: 60, 
      max: 85, 
      critical_low: 45, 
      critical_high: 90,
      warning_low: 50,
      warning_high: 88
    },
    moisture: { 
      min: 35, 
      max: 60, 
      critical_low: 20, 
      critical_high: 70,
      warning_low: 25,
      warning_high: 65
    },
    lux: { 
      min: 1000, 
      max: 5000, 
      critical_low: 500, 
      critical_high: 8000,
      warning_low: 700,
      warning_high: 7000
    },
  },
  bog: {
    temperature: { 
      min: 18, 
      max: 30, 
      critical_low: 12, 
      critical_high: 35,
      warning_low: 15,
      warning_high: 32
    },
    humidity: { 
      min: 70, 
      max: 95, 
      critical_low: 60, 
      critical_high: 98,
      warning_low: 65,
      warning_high: 96
    },
    moisture: { 
      min: 70, 
      max: 100, 
      critical_low: 60, 
      critical_high: 100,
      warning_low: 65,
      warning_high: 98
    },
    lux: { 
      min: 5000, 
      max: 15000, 
      critical_low: 3000, 
      critical_high: 20000,
      warning_low: 4000,
      warning_high: 18000
    },
  },
  paludarium: {
    temperature: { 
      min: 22, 
      max: 28, 
      critical_low: 18, 
      critical_high: 32,
      warning_low: 20,
      warning_high: 30
    },
    humidity: { 
      min: 70, 
      max: 95, 
      critical_low: 60, 
      critical_high: 98,
      warning_low: 65,
      warning_high: 96
    },
    moisture: { 
      min: 50, 
      max: 80, 
      critical_low: 35, 
      critical_high: 90,
      warning_low: 40,
      warning_high: 85
    },
    lux: { 
      min: 2000, 
      max: 10000, 
      critical_low: 1000, 
      critical_high: 15000,
      warning_low: 1500,
      warning_high: 12000
    },
  }
};

exports.generateSensorAlerts = onValueUpdated(
    {
      ref: "/sensorData",
      region: "asia-southeast1",
      instance: "tearrarium-iot-monitoring-default-rtdb",
    },
    async (event) => {
      const change = event.data;
      try {
        const newData = change.after.val();
        const timestamp = admin.firestore.FieldValue.serverTimestamp();
        const timestampMillis = Date.now();
        const dateStr = new Date(timestampMillis).toISOString().split("T")[0];

        // Get UID from sensor data (assuming it contains uid field)
        const uid = newData.uid;
        if (!uid) {
          console.warn("⚠️ No UID found in sensor data, using default tropical thresholds");
        }

        let ecosystem = 'tropical'; // Default ecosystem

        // Fetch user profile to get selected ecosystem
        if (uid) {
          try {
            const profileDoc = await db.collection("profile").doc(uid).get();
            if (profileDoc.exists) {
              const profileData = profileDoc.data();
              ecosystem = profileData.terrariumEco || 'tropical';
              console.log(`✓ Using ecosystem thresholds for user ${uid}: ${ecosystem}`);
            } else {
              console.warn(`⚠️ Profile not found for UID: ${uid}, using default tropical thresholds`);
            }
          } catch (err) {
            console.error(`❌ Error fetching user profile: ${err.message}`);
            console.log("ℹ️ Falling back to default tropical thresholds");
          }
        }

        // Get ecosystem-specific thresholds
        const thresholds = ECOSYSTEM_THRESHOLDS[ecosystem];
        console.log(`🎯 Applied thresholds for ecosystem: ${ecosystem}`);

        const alerts = [];

        // Check temperature
        if (newData.temperature < thresholds.temperature.critical_low) {
          alerts.push({
            type: "temperature",
            severity: "critical",
            message: `CRITICAL: Temperature too low (${newData.temperature}°C)`,
            value: newData.temperature,
            threshold: thresholds.temperature.critical_low,
            date: dateStr,
          });
        } else if (newData.temperature > thresholds.temperature.critical_high) {
          alerts.push({
            type: "temperature",
            severity: "critical",
            message: `CRITICAL: Temperature too high (${newData.temperature}°C)`,
            value: newData.temperature,
            threshold: thresholds.temperature.critical_high,
            date: dateStr,
          });
        } else if (newData.temperature < thresholds.temperature.warning_low) {
          alerts.push({
            type: "temperature",
            severity: "warning",
            message: `WARNING: Temperature low (${newData.temperature}°C)`,
            value: newData.temperature,
            threshold: thresholds.temperature.warning_low,
            date: dateStr,
          });
        } else if (newData.temperature > thresholds.temperature.warning_high) {
          alerts.push({
            type: "temperature",
            severity: "warning",
            message: `WARNING: Temperature high (${newData.temperature}°C)`,
            value: newData.temperature,
            threshold: thresholds.temperature.warning_high,
            date: dateStr,
          });
        }

        // Check humidity
        if (newData.humidity < thresholds.humidity.critical_low) {
          alerts.push({
            type: "humidity",
            severity: "critical",
            message: `CRITICAL: Humidity too low (${newData.humidity}%)`,
            value: newData.humidity,
            threshold: thresholds.humidity.critical_low,
            date: dateStr,
          });
        } else if (newData.humidity > thresholds.humidity.critical_high) {
          alerts.push({
            type: "humidity",
            severity: "critical",
            message: `CRITICAL: Humidity too high (${newData.humidity}%)`,
            value: newData.humidity,
            threshold: thresholds.humidity.critical_high,
            date: dateStr,
          });
        } else if (newData.humidity < thresholds.humidity.warning_low) {
          alerts.push({
            type: "humidity",
            severity: "warning",
            message: `WARNING: Humidity low (${newData.humidity}%)`,
            value: newData.humidity,
            threshold: thresholds.humidity.warning_low,
            date: dateStr,
          });
        }

        // Check moisture
        if (newData.moisture < thresholds.moisture.critical_low) {
          alerts.push({
            type: "moisture",
            severity: "critical",
            message: `CRITICAL: Soil too dry (${newData.moisture}%)`,
            value: newData.moisture,
            threshold: thresholds.moisture.critical_low,
            date: dateStr,
          });
        } else if (newData.moisture > thresholds.moisture.critical_high) {
          alerts.push({
            type: "moisture",
            severity: "critical",
            message: `CRITICAL: Soil too wet (${newData.moisture}%)`,
            value: newData.moisture,
            threshold: thresholds.moisture.critical_high,
            date: dateStr,
          });
        } else if (newData.moisture < thresholds.moisture.warning_low) {
          alerts.push({
            type: "moisture",
            severity: "warning",
            message: `WARNING: Soil dry (${newData.moisture}%)`,
            value: newData.moisture,
            threshold: thresholds.moisture.warning_low,
            date: dateStr,
          });
        } else if (newData.moisture > thresholds.moisture.warning_high) {
          alerts.push({
            type: "moisture",
            severity: "warning",
            message: `WARNING: Soil wet (${newData.moisture}%)`,
            value: newData.moisture,
            threshold: thresholds.moisture.warning_high,
            date: dateStr,
          });
        }

        // Check light
        if (newData.lux < thresholds.lux.critical_low) {
          alerts.push({
            type: "lux",
            severity: "critical",
            message: `CRITICAL: Light too low (${newData.lux} lux)`,
            value: newData.lux,
            threshold: thresholds.lux.critical_low,
            date: dateStr,
          });
        } else if (newData.lux > thresholds.lux.critical_high) {
          alerts.push({
            type: "lux",
            severity: "critical",
            message: `CRITICAL: Light too high (${newData.lux} lux)`,
            value: newData.lux,
            threshold: thresholds.lux.critical_high,
            date: dateStr,
          });
        } else if (newData.lux < thresholds.lux.warning_low) {
          alerts.push({
            type: "lux",
            severity: "warning",
            message: `WARNING: Light low (${newData.lux} lux)`,
            value: newData.lux,
            threshold: thresholds.lux.warning_low,
            date: dateStr,
          });
        } else if (newData.lux > thresholds.lux.warning_high) {
          alerts.push({
            type: "lux",
            severity: "warning",
            message: `WARNING: Light high (${newData.lux} lux)`,
            value: newData.lux,
            threshold: thresholds.lux.warning_high,
            date: dateStr,
          });
        }

        // Store all alerts to Firestore for email reports
        if (alerts.length > 0) {
          const batch = db.batch();
          alerts.forEach((alert) => {
            const alertRef = db.collection("alerts").doc();
            batch.set(alertRef, {
              ...alert,
              ecosystem: ecosystem,
              uid: uid,
              timestamp: timestamp,
              timestampMillis: timestampMillis,
              createdAt: timestamp,
            });
          });
          await batch.commit();
          console.log(`✓ Stored ${alerts.length} alert(s) to Firestore for ${ecosystem} ecosystem`);
        }

        return null;
      } catch (error) {
        console.error("Error generating sensor alerts:", error);
        return null;
      }
    });
