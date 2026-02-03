// Firebase Cloud Functions
// File: functions/index.js

const { onValueUpdated } = require("firebase-functions/v2/database");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const admin = require("firebase-admin");

// Initialize Firebase Admin
admin.initializeApp();
const db = admin.firestore();

// ============================================
// ECOSYSTEM THRESHOLDS
// ============================================

const ECOSYSTEM_THRESHOLDS = {
  tropical: {
    temperature: {
      min: 25, max: 30,
      critical_low: 20, critical_high: 35,
      warning_low: 22, warning_high: 33,
    },
    humidity: {
      min: 70, max: 90,
      critical_low: 50, critical_high: 95,
      warning_low: 60, warning_high: 92,
    },
    moisture: {
      min: 40, max: 60,
      critical_low: 25, critical_high: 70,
      warning_low: 30, warning_high: 65,
    },
    lux: {
      min: 1000, max: 10000,
      critical_low: 500, critical_high: 60000,
      warning_low: 800, warning_high: 40000,
    },
  },
  woodland: {
    temperature: {
      min: 16, max: 24,
      critical_low: 10, critical_high: 28,
      warning_low: 12, warning_high: 26,
    },
    humidity: {
      min: 60, max: 85,
      critical_low: 45, critical_high: 90,
      warning_low: 50, warning_high: 88,
    },
    moisture: {
      min: 35, max: 60,
      critical_low: 20, critical_high: 70,
      warning_low: 25, warning_high: 65,
    },
    lux: {
      min: 1000, max: 5000,
      critical_low: 500, critical_high: 8000,
      warning_low: 700, warning_high: 7000,
    },
  },
  bog: {
    temperature: {
      min: 18, max: 30,
      critical_low: 12, critical_high: 35,
      warning_low: 15, warning_high: 32,
    },
    humidity: {
      min: 70, max: 95,
      critical_low: 60, critical_high: 98,
      warning_low: 65, warning_high: 96,
    },
    moisture: {
      min: 70, max: 100,
      critical_low: 60, critical_high: 100,
      warning_low: 65, warning_high: 98,
    },
    lux: {
      min: 5000, max: 15000,
      critical_low: 3000, critical_high: 20000,
      warning_low: 4000, warning_high: 18000,
    },
  },
  paludarium: {
    temperature: {
      min: 22, max: 28,
      critical_low: 18, critical_high: 32,
      warning_low: 20, warning_high: 30,
    },
    humidity: {
      min: 70, max: 95,
      critical_low: 60, critical_high: 98,
      warning_low: 65, warning_high: 96,
    },
    moisture: {
      min: 50, max: 80,
      critical_low: 35, critical_high: 90,
      warning_low: 40, warning_high: 85,
    },
    lux: {
      min: 2000, max: 10000,
      critical_low: 1000, critical_high: 15000,
      warning_low: 1500, warning_high: 12000,
    },
  },
};

// ============================================
// HELPER: Get User Email
// ============================================

async function getUserEmail(db, uid) {
  if (!uid) {
    console.error("❌ No UID provided");
    return null;
  }

  try {
    const profileDoc = await db.collection("profile").doc(uid).get();
    
    if (!profileDoc.exists) {
      console.error(`❌ Profile not found for UID: ${uid}`);
      return null;
    }

    const userData = profileDoc.data();
    return userData.email || null;
  } catch (error) {
    console.error(`❌ Error fetching user email:`, error);
    return null;
  }
}

// ============================================
// MAIN FUNCTION: Generate Sensor Alerts
// ============================================

/**
 * Monitors sensor data and creates alert documents
 * The Trigger Email Extension automatically sends emails!
 * Sends alerts to ALL users in the profile collection
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
      const timestamp = admin.firestore.FieldValue.serverTimestamp();
      const timestampMillis = Date.now();
      const dateStr = new Date(timestampMillis).toISOString().split("T")[0];

      const uid = newData.uid;
      if (!uid) {
        console.warn("⚠️ No UID found in sensor data");
        return null;
      }

      let ecosystem = "tropical";

      // Fetch user profile for ecosystem
      try {
        const profileDoc = await db.collection("profile").doc(uid).get();
        if (profileDoc.exists) {
          const profileData = profileDoc.data();
          ecosystem = profileData.terrariumEco || "tropical";
          console.log(`✓ Using ecosystem: ${ecosystem} for user ${uid}`);
        }
      } catch (err) {
        console.error(`❌ Error fetching profile: ${err.message}`);
      }

      // Get ALL users from profile collection
      const allProfilesSnapshot = await db.collection("profile").get();
      
      if (allProfilesSnapshot.empty) {
        console.error("❌ No profiles found in database");
        return null;
      }

      const allUserEmails = [];
      allProfilesSnapshot.forEach(doc => {
        const userData = doc.data();
        if (userData.email) {
          allUserEmails.push({
            email: userData.email,
            uid: doc.id
          });
        }
      });

      if (allUserEmails.length === 0) {
        console.error("❌ No valid emails found in profile collection");
        return null;
      }

      console.log(`✓ Found ${allUserEmails.length} users to notify`);

      // Rate limiting: Check for the sensor owner, but send to all users
      const oneHourAgo = timestampMillis - (60 * 60 * 1000);
      const recentAlertsQuery = await db.collection("alerts")
        .where("uid", "==", uid)
        .where("timestampMillis", ">=", oneHourAgo)
        .limit(5)
        .get();

      if (!recentAlertsQuery.empty) {
        console.log(`⏱️ Rate limit: Alert already sent within hour for ${uid}`);
        return null;
      }

      // Daily limit: 50 alerts per day
      const startOfDay = new Date(dateStr).getTime();
      const endOfDay = startOfDay + (24 * 60 * 60 * 1000);

      const dailyAlertsQuery = await db.collection("alerts")
        .where("uid", "==", uid)
        .where("timestampMillis", ">=", startOfDay)
        .where("timestampMillis", "<", endOfDay)
        .get();

      if (dailyAlertsQuery.size >= 50) {
        console.log(`📊 Daily limit reached: ${dailyAlertsQuery.size} alerts for ${uid}`);
        return null;
      }

      const thresholds = ECOSYSTEM_THRESHOLDS[ecosystem];
      const alerts = [];

      // Check all sensor values
      const checks = [
        { 
          field: 'temperature', 
          value: newData.temperature, 
          unit: '°C',
          label: 'Temperature'
        },
        { 
          field: 'humidity', 
          value: newData.humidity, 
          unit: '%',
          label: 'Humidity'
        },
        { 
          field: 'moisture', 
          value: newData.moisture, 
          unit: '%',
          label: 'Moisture'
        },
        { 
          field: 'lux', 
          value: newData.lux, 
          unit: ' lux',
          label: 'Light'
        }
      ];

      checks.forEach(({ field, value, unit, label }) => {
        const t = thresholds[field];
        
        if (value < t.critical_low) {
          alerts.push({
            type: field,
            severity: "critical",
            message: `CRITICAL: ${label} too low (${value}${unit})`,
            value: value,
            threshold: t.critical_low,
            unit: unit,
            label: label,
            date: dateStr,
          });
        } else if (value > t.critical_high) {
          alerts.push({
            type: field,
            severity: "critical",
            message: `CRITICAL: ${label} too high (${value}${unit})`,
            value: value,
            threshold: t.critical_high,
            unit: unit,
            label: label,
            date: dateStr,
          });
        } else if (value < t.warning_low) {
          alerts.push({
            type: field,
            severity: "warning",
            message: `WARNING: ${label} low (${value}${unit})`,
            value: value,
            threshold: t.warning_low,
            unit: unit,
            label: label,
            date: dateStr,
          });
        } else if (value > t.warning_high) {
          alerts.push({
            type: field,
            severity: "warning",
            message: `WARNING: ${label} high (${value}${unit})`,
            value: value,
            threshold: t.warning_high,
            unit: unit,
            label: label,
            date: dateStr,
          });
        }
      });

      // Create alert documents for ALL users
      // Extension automatically sends emails!
      if (alerts.length > 0) {
        const batch = db.batch();
        let alertCount = 0;
        
        // For each alert, create a document for EACH user
        alerts.forEach((alert) => {
          allUserEmails.forEach((userInfo) => {
            const alertRef = db.collection("alerts").doc();
            
            // Build subject based on severity
            const subject = alert.severity === "critical" 
              ? `🚨 CRITICAL ALERT: ${alert.label} issue in ${ecosystem} terrarium`
              : `⚠️ Warning: ${alert.label} issue in your ${ecosystem} terrarium`;

            // Build HTML email content
            const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      margin: 0;
      padding: 0;
      background-color: #f5f5f5;
    }
    .container {
      max-width: 600px;
      margin: 20px auto;
      background-color: white;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .header {
      background: ${alert.severity === "critical" 
        ? "linear-gradient(135deg, #dc2626 0%, #991b1b 100%)" 
        : "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)"};
      color: white;
      padding: 30px 20px;
      text-align: center;
    }
    .header h1 {
      margin: 0 0 10px 0;
      font-size: 24px;
    }
    .content {
      padding: 30px 20px;
    }
    .alert-box {
      background-color: ${alert.severity === "critical" ? "#fef2f2" : "#fffbeb"};
      border-left: 4px solid ${alert.severity === "critical" ? "#dc2626" : "#f59e0b"};
      padding: 15px;
      margin: 20px 0;
      border-radius: 4px;
    }
    .info-row {
      display: flex;
      justify-content: space-between;
      padding: 10px 0;
      border-bottom: 1px solid #e5e7eb;
    }
    .info-row:last-child {
      border-bottom: none;
    }
    .label {
      font-weight: 600;
      color: #6b7280;
    }
    .value {
      font-weight: 600;
      color: #111827;
    }
    .footer {
      background-color: #f9fafb;
      padding: 20px;
      text-align: center;
      font-size: 14px;
      color: #6b7280;
    }
    .warning-box {
      margin-top: 20px;
      padding: 15px;
      background-color: #fef3c7;
      border-left: 4px solid #f59e0b;
      border-radius: 4px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${alert.severity === "critical" ? "🚨 Critical Alert" : "⚠️ Warning"}</h1>
      <p style="margin: 0; opacity: 0.9;">Terrarium Monitoring System</p>
    </div>
    
    <div class="content">
      <div class="alert-box">
        <strong style="font-size: 18px;">${alert.message}</strong>
      </div>
      
      <h3 style="margin-top: 30px; color: #111827;">Alert Details</h3>
      <div style="background-color: #f9fafb; padding: 15px; border-radius: 6px;">
        <div class="info-row">
          <span class="label">Type</span>
          <span class="value">${alert.label}</span>
        </div>
        <div class="info-row">
          <span class="label">Current Value</span>
          <span class="value">${alert.value}${alert.unit}</span>
        </div>
        <div class="info-row">
          <span class="label">Threshold</span>
          <span class="value">${alert.threshold}${alert.unit}</span>
        </div>
        <div class="info-row">
          <span class="label">Severity</span>
          <span class="value" style="color: ${alert.severity === "critical" ? "#dc2626" : "#f59e0b"};">
            ${alert.severity.toUpperCase()}
          </span>
        </div>
        <div class="info-row">
          <span class="label">Ecosystem</span>
          <span class="value">${ecosystem.charAt(0).toUpperCase() + ecosystem.slice(1)}</span>
        </div>
        <div class="info-row">
          <span class="label">Date</span>
          <span class="value">${new Date(alert.date).toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          })}</span>
        </div>
      </div>

      <div class="warning-box">
        <strong>⚡ Action Required:</strong> Please check your terrarium conditions immediately and take appropriate action to restore optimal conditions.
      </div>
    </div>
    
    <div class="footer">
      <p style="margin: 0 0 10px 0;">This is an automated alert from your Terrarium Monitoring System</p>
      <p style="margin: 0; font-size: 12px;">
        Timestamp: ${new Date().toLocaleString('en-US', {
          dateStyle: 'full',
          timeStyle: 'long'
        })}
      </p>
    </div>
  </div>
</body>
</html>
            `;

            // Write document for Trigger Email Extension
            batch.set(alertRef, {
              // ========================================
              // REQUIRED FIELDS FOR EXTENSION
              // ========================================
              to: userInfo.email,
              message: {
                subject: subject,
                html: htmlContent,
                text: alert.message, // Plain text fallback
              },
              
              // ========================================
              // YOUR CUSTOM TRACKING FIELDS
              // ========================================
              type: alert.type,
              severity: alert.severity,
              value: alert.value,
              threshold: alert.threshold,
              ecosystem: ecosystem,
              uid: uid, // Original sensor owner UID
              recipientUid: userInfo.uid, // UID of email recipient
              recipientEmail: userInfo.email, // Email of recipient
              date: dateStr,
              timestamp: timestamp,
              timestampMillis: timestampMillis,
              createdAt: timestamp,
            });
            
            alertCount++;
          });
        });
        
        await batch.commit();
        console.log(`✓ Created ${alertCount} alert(s) for ${allUserEmails.length} users - Extension will send emails automatically!`);
      }

      return null;
    } catch (error) {
      console.error("❌ Error generating sensor alerts:", error);
      return null;
    }
  }
);

// ============================================
// STORE SENSOR DATA TO FIRESTORE
// ============================================

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

      if (JSON.stringify(newData) === JSON.stringify(oldData)) {
        console.log("ℹ️ No change in data, skipping...");
        return null;
      }

      const timestamp = admin.firestore.FieldValue.serverTimestamp();
      const timestampMillis = Date.now();
      const date = new Date(timestampMillis).toISOString().split("T")[0];
      const hour = new Date(timestampMillis).getHours();

      const sensorData = {
        temperature: newData.temperature || 0,
        humidity: newData.humidity || 0,
        moisture: newData.moisture || 0,
        lux: newData.lux || 0,
      };

      // Update latest reading
      await db.collection("latestReadings").doc("current").set({
        ...sensorData,
        timestamp: timestamp,
        timestampMillis: timestampMillis,
        date: date,
        hour: hour,
        controls: {
          humidifierState: (newData.controls?.humidifierState) || false,
          lightBrightness: (newData.controls?.lightBrightness) || 0,
        },
      });
      console.log("✓ Updated latest reading");

      // Update hourly aggregates
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

      // Update daily summary
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
              avg: ((data.temperature.avg * data.readingCount) + sensorData.temperature) / newCount,
            },
            humidity: {
              min: Math.min(data.humidity.min, sensorData.humidity),
              max: Math.max(data.humidity.max, sensorData.humidity),
              avg: ((data.humidity.avg * data.readingCount) + sensorData.humidity) / newCount,
            },
            moisture: {
              min: Math.min(data.moisture.min, sensorData.moisture),
              max: Math.max(data.moisture.max, sensorData.moisture),
              avg: ((data.moisture.avg * data.readingCount) + sensorData.moisture) / newCount,
            },
            lux: {
              min: Math.min(data.lux.min, sensorData.lux),
              max: Math.max(data.lux.max, sensorData.lux),
              avg: ((data.lux.avg * data.readingCount) + sensorData.lux) / newCount,
            },
            lastUpdated: timestamp,
          });
        }
      });
      console.log("✓ Updated daily summary");

      return null;
    } catch (error) {
      console.error("❌ Error storing sensor data:", error);
      return null;
    }
  }
);

// ============================================
// CLEANUP FUNCTIONS
// ============================================

exports.cleanupOldAlerts = onSchedule(
  {
    schedule: "every 24 hours",
    region: "asia-southeast1",
  },
  async (event) => {
    try {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const cutoffDate = sevenDaysAgo.toISOString().split("T")[0];

      console.log(`🗑️ Starting alert cleanup for alerts older than ${cutoffDate}`);

      const oldAlertsQuery = db.collection("alerts")
        .where("date", "<", cutoffDate)
        .limit(500);

      const snapshot = await oldAlertsQuery.get();

      if (snapshot.empty) {
        console.log("✓ No old alerts to delete");
        return null;
      }

      const batch = db.batch();
      snapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });

      await batch.commit();
      console.log(`✓ Deleted ${snapshot.size} old alerts from before ${cutoffDate}`);

      if (snapshot.size === 500) {
        console.log("⚠️ Batch limit reached (500 docs), more alerts may need cleanup");
      }

      return {
        deleted: snapshot.size,
        cutoffDate: cutoffDate,
      };
    } catch (error) {
      console.error("❌ Error cleaning up old alerts:", error);
      return null;
    }
  }
);

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
        console.log("✓ No old hourly aggregates to delete");
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
      console.error("❌ Error cleaning up old hourly aggregates:", error);
      return null;
    }
  }
);

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
        console.log("✓ No old daily summaries to delete");
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
      console.error("❌ Error cleaning up old daily summaries:", error);
      return null;
    }
  }
);