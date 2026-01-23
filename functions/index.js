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
 * Cloud Function: Generate alerts
 * Monitors sensor data and creates alerts for critical conditions
 */
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
        const alerts = [];

        const thresholds = {
          temperature: { min: 25, max: 30, critical_low: 15, critical_high: 38 },
          humidity: { min: 70, max: 90, critical_low: 50, critical_high: 95 },
          moisture: { min: 40, max: 60, critical_low: 20, critical_high: 80 },
          lux: { min: 1000, max: 10000, critical_low: 100, critical_high: 50000 },
        };

        // Check temperature
        if (newData.temperature < thresholds.temperature.critical_low) {
          alerts.push({
            type: "temperature",
            severity: "critical",
            message: `CRITICAL: Temperature too low (${newData.temperature}°C)`,
            value: newData.temperature,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
          });
        } else if (newData.temperature > thresholds.temperature.critical_high) {
          alerts.push({
            type: "temperature",
            severity: "critical",
            message: `CRITICAL: Temperature too high (${newData.temperature}°C)`,
            value: newData.temperature,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
          });
        }

        // Check humidity
        if (newData.humidity < thresholds.humidity.critical_low) {
          alerts.push({
            type: "humidity",
            severity: "critical",
            message: `CRITICAL: Humidity too low (${newData.humidity}%)`,
            value: newData.humidity,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
          });
        }

        // Check moisture
        if (newData.moisture < thresholds.moisture.critical_low) {
          alerts.push({
            type: "moisture",
            severity: "critical",
            message: `CRITICAL: Soil too dry (${newData.moisture}%)`,
            value: newData.moisture,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
          });
        }

        // Store alerts if any
        if (alerts.length > 0) {
          const batch = db.batch();
          alerts.forEach((alert) => {
            const alertRef = db.collection("alerts").doc();
            batch.set(alertRef, alert);
          });
          await batch.commit();
          console.log(`✓ Created ${alerts.length} alert(s)`);
        }

        return null;
      } catch (error) {
        console.error("Error generating alerts:", error);
        return null;
      }
    });
