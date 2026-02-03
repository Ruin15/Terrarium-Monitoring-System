/**
 * Cloud Function: Send Email Alert via Brevo API
 * Triggers when a new document is created in the "alerts" collection
 * Sends email notification to the user using Brevo's Transactional Email API
 */

const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { defineSecret } = require("firebase-functions/params");
const admin = require("firebase-admin");

// Define Brevo API Key as a secret
const BREVO_API_KEY = defineSecret("BREVO_API_KEY");

exports.triggerEmailAlert = onDocumentCreated({
  document: "alerts/{alertId}",
  region: "asia-southeast1",
  secrets: [BREVO_API_KEY]
}, async (event) => {
  const snap = event.data;
  if (!snap) {
    console.log("⚠️ No alert data found");
    return;
  }

  const alert = snap.data();
  const alertId = snap.id;

  console.log(`📧 Processing email for alert ${alertId}:`, {
    type: alert.type,
    severity: alert.severity,
    uid: alert.uid
  });

  // Skip test alerts if you want (optional)
  if (alert.isTest === true) {
    console.log("ℹ️ Skipping test alert");
    // Remove this if you want test alerts to send emails too
    // return;
  }

  try {
    // Get user's email from their profile
    const db = admin.firestore();
    const userEmail = await getUserEmail(db, alert.uid);

    if (!userEmail) {
      console.error(`❌ No email found for user ${alert.uid}`);
      return;
    }

    // Send email via Brevo API
    await sendBrevoEmail(userEmail, alert);

    console.log(`✅ Email sent successfully to ${userEmail}`);
  } catch (error) {
    console.error("❌ Error sending email alert:", error);
  }
});

/**
 * Get user's email from Firestore profile
 */
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

/**
 * Send email using Brevo API
 */
async function sendBrevoEmail(recipientEmail, alert) {
  const fetch = require("node-fetch");

  // Build subject line
  const subject = alert.severity === "critical" 
    ? `🚨 CRITICAL ALERT: ${alert.type} issue in ${alert.ecosystem} terrarium`
    : `⚠️ Warning: ${alert.type} issue in your ${alert.ecosystem} terrarium`;

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
              <span class="value">${alert.type.charAt(0).toUpperCase() + alert.type.slice(1)}</span>
            </div>
            <div class="info-row">
              <span class="label">Current Value</span>
              <span class="value">${alert.value}${alert.type === "temperature" ? "°C" : 
                alert.type === "lux" ? " lux" : "%"}</span>
            </div>
            <div class="info-row">
              <span class="label">Threshold</span>
              <span class="value">${alert.threshold}${alert.type === "temperature" ? "°C" : 
                alert.type === "lux" ? " lux" : "%"}</span>
            </div>
            <div class="info-row">
              <span class="label">Severity</span>
              <span class="value" style="color: ${alert.severity === "critical" ? "#dc2626" : "#f59e0b"};">
                ${alert.severity.toUpperCase()}
              </span>
            </div>
            <div class="info-row">
              <span class="label">Ecosystem</span>
              <span class="value">${alert.ecosystem.charAt(0).toUpperCase() + alert.ecosystem.slice(1)}</span>
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

  // Prepare Brevo API request
  const emailData = {
    sender: {
      name: "Terrarium Monitor",
      email: "repsajodimus5@gmail.com" // Must be verified in Brevo
    },
    to: [
      {
        email: recipientEmail,
        name: recipientEmail.split('@')[0] // Use email username as name
      }
    ],
    subject: subject,
    htmlContent: htmlContent,
    tags: [
      "terrarium-alert",
      alert.severity,
      alert.type,
      alert.ecosystem
    ]
  };

  // Send email via Brevo API
  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "accept": "application/json",
      "api-key": BREVO_API_KEY.value(),
      "content-type": "application/json"
    },
    body: JSON.stringify(emailData)
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Brevo API error (${response.status}): ${error}`);
  }

  const result = await response.json();
  console.log(`✉️ Brevo API success. Message ID: ${result.messageId}`);
  
  return result;
}