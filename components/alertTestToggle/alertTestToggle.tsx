import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { db, auth } from '@/firebase/firebaseConfig';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useUser } from '@/context/UserContext';

export default function AlertTestToggle() {
  const { profile, loading: profileLoading } = useUser();
  const user = auth.currentUser;
  const [isSending, setIsSending] = useState(false);
  const [lastResult, setLastResult] = useState<{
    success: boolean;
    message: string;
    email?: string;
    alertType?: string;
    severity?: string;
  } | null>(null);
  const [selectedAlert, setSelectedAlert] = useState('temperature');
  const [selectedSeverity, setSelectedSeverity] = useState('critical');

  const alertTypes = [
    { value: 'temperature', label: 'Temperature', unit: '°C' },
    { value: 'humidity', label: 'Humidity', unit: '%' },
    { value: 'moisture', label: 'Moisture', unit: '%' },
    { value: 'lux', label: 'Light', unit: ' lux' }
  ];

  const severityTypes = [
    { value: 'critical', label: 'Critical', color: '#dc2626' },
    { value: 'warning', label: 'Warning', color: '#f59e0b' }
  ];

  const testAlerts: Record<string, Record<string, { value: number; threshold: number; message: string }>> = {
    temperature: {
      critical: { value: 40, threshold: 35, message: 'CRITICAL: Temperature too high (40°C)' },
      warning: { value: 34, threshold: 33, message: 'WARNING: Temperature high (34°C)' }
    },
    humidity: {
      critical: { value: 45, threshold: 50, message: 'CRITICAL: Humidity too low (45%)' },
      warning: { value: 58, threshold: 60, message: 'WARNING: Humidity low (58%)' }
    },
    moisture: {
      critical: { value: 20, threshold: 25, message: 'CRITICAL: Soil too dry (20%)' },
      warning: { value: 28, threshold: 30, message: 'WARNING: Soil dry (28%)' }
    },
    lux: {
      critical: { value: 400, threshold: 500, message: 'CRITICAL: Light too low (400 lux)' },
      warning: { value: 750, threshold: 800, message: 'WARNING: Light low (750 lux)' }
    }
  };

  const triggerTestAlert = async () => {
    if (!user || !profile) {
      setLastResult({
        success: false,
        message: 'You must be logged in to test alerts'
      });
      return;
    }

    if (!profile.email) {
      setLastResult({
        success: false,
        message: 'No email found in your profile. Please add an email address.'
      });
      return;
    }

    setIsSending(true);
    setLastResult(null);

    try {
      const testAlert = testAlerts[selectedAlert][selectedSeverity];
      const ecosystem = profile.terrariumEco || 'tropical';
      const now = new Date();
      const dateStr = now.toISOString().split('T')[0];

      // Create test alert in Firestore
      const alertData = {
        type: selectedAlert,
        severity: selectedSeverity,
        message: testAlert.message,
        value: testAlert.value,
        threshold: testAlert.threshold,
        date: dateStr,
        ecosystem: ecosystem,
        uid: user.uid,
        timestamp: serverTimestamp(),
        timestampMillis: Date.now(),
        createdAt: serverTimestamp(),
        isTest: true // Mark as test alert
      };

      await addDoc(collection(db, 'alerts'), alertData);

      setLastResult({
        success: true,
        message: `Test alert created successfully! Email should be sent to: ${profile.email}`,
        email: profile.email,
        alertType: selectedAlert,
        severity: selectedSeverity
      });

      console.log('✅ Test alert created:', alertData);
    } catch (error: any) {
      console.error('❌ Error creating test alert:', error);
      setLastResult({
        success: false,
        message: `Error: ${error.message}`
      });
    } finally {
      setIsSending(false);
    }
  };

  if (profileLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={{ marginTop: 10, color: '#6b7280' }}>Loading profile...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#f9fafb' }}>
      <View style={{ padding: 16, maxWidth: 640, alignSelf: 'center', width: '100%' }}>
        {/* Header */}
        <View style={{ marginBottom: 24, backgroundColor: 'white', padding: 20, borderRadius: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 }}>
          <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#111827', marginBottom: 8 }}>
            🧪 Email Alert Test Tool
          </Text>
          <Text style={{ fontSize: 14, color: '#6b7280' }}>
            Test your email notification system by creating a test alert
          </Text>
        </View>

        {/* User Info */}
        {profile && (
          <View style={{ marginBottom: 24, padding: 16, backgroundColor: '#eff6ff', borderRadius: 12, borderWidth: 1, borderColor: '#bfdbfe' }}>
            <Text style={{ fontWeight: '600', color: '#1e40af', marginBottom: 8 }}>Your Profile</Text>
            <View style={{ gap: 4 }}>
              <Text style={{ fontSize: 12, color: '#1e3a8a' }}>
                <Text style={{ fontWeight: '600' }}>Email:</Text> {profile.email || 'No email set'}
              </Text>
              <Text style={{ fontSize: 12, color: '#1e3a8a' }}>
                <Text style={{ fontWeight: '600' }}>Ecosystem:</Text> {profile.terrariumEco || 'tropical'}
              </Text>
              <Text style={{ fontSize: 10, color: '#1e3a8a', fontFamily: 'monospace' }}>
                <Text style={{ fontWeight: '600' }}>UID:</Text> {user?.uid}
              </Text>
            </View>
          </View>
        )}

        {/* Alert Type Selection */}
        <View style={{ marginBottom: 24 }}>
          <Text style={{ fontSize: 14, fontWeight: '500', color: '#374151', marginBottom: 8 }}>
            Select Alert Type
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
            {alertTypes.map((type) => (
              <TouchableOpacity
                key={type.value}
                onPress={() => setSelectedAlert(type.value)}
                style={{
                  flex: 1,
                  minWidth: '45%',
                  padding: 16,
                  borderRadius: 12,
                  borderWidth: 2,
                  borderColor: selectedAlert === type.value ? '#3b82f6' : '#e5e7eb',
                  backgroundColor: selectedAlert === type.value ? '#eff6ff' : 'white',
                }}
              >
                <Text style={{ fontWeight: '600', color: selectedAlert === type.value ? '#1e40af' : '#374151', marginBottom: 4 }}>
                  {type.label}
                </Text>
                <Text style={{ fontSize: 12, color: '#6b7280' }}>
                  {type.unit}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Severity Selection */}
        <View style={{ marginBottom: 24 }}>
          <Text style={{ fontSize: 14, fontWeight: '500', color: '#374151', marginBottom: 8 }}>
            Select Severity Level
          </Text>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            {severityTypes.map((severity) => (
              <TouchableOpacity
                key={severity.value}
                onPress={() => setSelectedSeverity(severity.value)}
                style={{
                  flex: 1,
                  padding: 16,
                  borderRadius: 12,
                  borderWidth: 2,
                  borderColor: selectedSeverity === severity.value ? '#3b82f6' : '#e5e7eb',
                  backgroundColor: selectedSeverity === severity.value ? '#eff6ff' : 'white',
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: severity.color }} />
                <Text style={{ fontWeight: '600', color: selectedSeverity === severity.value ? '#1e40af' : '#374151' }}>
                  {severity.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Preview */}
        <View style={{ marginBottom: 24, padding: 16, backgroundColor: '#f9fafb', borderRadius: 12, borderWidth: 1, borderColor: '#e5e7eb' }}>
          <Text style={{ fontWeight: '600', color: '#111827', marginBottom: 8 }}>Test Alert Preview</Text>
          <View style={{ gap: 4 }}>
            <Text style={{ fontSize: 12, color: '#374151' }}>
              <Text style={{ fontWeight: '600' }}>Type:</Text> {alertTypes.find(t => t.value === selectedAlert)?.label}
            </Text>
            <Text style={{ fontSize: 12, color: '#374151' }}>
              <Text style={{ fontWeight: '600' }}>Severity:</Text> {selectedSeverity}
            </Text>
            <Text style={{ fontSize: 12, color: '#374151' }}>
              <Text style={{ fontWeight: '600' }}>Message:</Text> {testAlerts[selectedAlert][selectedSeverity].message}
            </Text>
            <Text style={{ fontSize: 12, color: '#374151' }}>
              <Text style={{ fontWeight: '600' }}>Value:</Text> {testAlerts[selectedAlert][selectedSeverity].value}{alertTypes.find(t => t.value === selectedAlert)?.unit}
            </Text>
            <Text style={{ fontSize: 12, color: '#374151' }}>
              <Text style={{ fontWeight: '600' }}>Threshold:</Text> {testAlerts[selectedAlert][selectedSeverity].threshold}{alertTypes.find(t => t.value === selectedAlert)?.unit}
            </Text>
          </View>
        </View>

        {/* Trigger Button */}
        <TouchableOpacity
          onPress={triggerTestAlert}
          disabled={isSending || !user || !profile?.email}
          style={{
            paddingVertical: 16,
            paddingHorizontal: 24,
            borderRadius: 12,
            backgroundColor: isSending || !user || !profile?.email ? '#9ca3af' : '#3b82f6',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {isSending ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <ActivityIndicator size="small" color="white" />
              <Text style={{ color: 'white', fontWeight: '600' }}>Creating Test Alert...</Text>
            </View>
          ) : (
            <Text style={{ color: 'white', fontWeight: '600', fontSize: 16 }}>
              🚀 Trigger Test Alert
            </Text>
          )}
        </TouchableOpacity>

        {/* Result Message */}
        {lastResult && (
          <View
            style={{
              marginTop: 16,
              padding: 16,
              borderRadius: 12,
              borderWidth: 1,
              backgroundColor: lastResult.success ? '#f0fdf4' : '#fef2f2',
              borderColor: lastResult.success ? '#bbf7d0' : '#fecaca',
            }}
          >
            <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-start' }}>
              <Text style={{ fontSize: 20 }}>
                {lastResult.success ? '✅' : '❌'}
              </Text>
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: '600', color: lastResult.success ? '#166534' : '#991b1b', marginBottom: 4 }}>
                  {lastResult.success ? 'Success!' : 'Error'}
                </Text>
                <Text style={{ fontSize: 12, color: lastResult.success ? '#166534' : '#991b1b' }}>
                  {lastResult.message}
                </Text>
                {lastResult.success && (
                  <View style={{ marginTop: 12, backgroundColor: 'rgba(255,255,255,0.5)', padding: 12, borderRadius: 8 }}>
                    <Text style={{ fontSize: 11, fontWeight: '600', color: '#166534', marginBottom: 4 }}>
                      Next Steps:
                    </Text>
                    <Text style={{ fontSize: 10, color: '#166534', marginBottom: 2 }}>
                      1. Check Cloud Functions logs in Firebase Console
                    </Text>
                    <Text style={{ fontSize: 10, color: '#166534', marginBottom: 2 }}>
                      2. Look for "✉️ Email sent successfully" message
                    </Text>
                    <Text style={{ fontSize: 10, color: '#166534', marginBottom: 2 }}>
                      3. Check your inbox at: {lastResult.email}
                    </Text>
                    <Text style={{ fontSize: 10, color: '#166534' }}>
                      4. Check spam folder if email doesn't arrive
                    </Text>
                  </View>
                )}
              </View>
            </View>
          </View>
        )}

        {/* Debug Info */}
        <View style={{ marginTop: 24, padding: 16, backgroundColor: '#f9fafb', borderRadius: 12, borderWidth: 1, borderColor: '#e5e7eb' }}>
          <Text style={{ fontWeight: '600', color: '#111827', fontSize: 12, marginBottom: 8 }}>
            📋 Debug Checklist
          </Text>
          <View style={{ gap: 4 }}>
            <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-start' }}>
              <Text style={{ fontSize: 10 }}>{profile?.email ? '✅' : '❌'}</Text>
              <Text style={{ fontSize: 10, color: '#374151', flex: 1 }}>Email configured in profile</Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-start' }}>
              <Text style={{ fontSize: 10 }}>{user ? '✅' : '❌'}</Text>
              <Text style={{ fontSize: 10, color: '#374151', flex: 1 }}>User authenticated</Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-start' }}>
              <Text style={{ fontSize: 10 }}>⚙️</Text>
              <Text style={{ fontSize: 10, color: '#374151', flex: 1 }}>Check Firebase Functions logs for email sending status</Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-start' }}>
              <Text style={{ fontSize: 10 }}>📧</Text>
              <Text style={{ fontSize: 10, color: '#374151', flex: 1 }}>Verify Brevo SMTP credentials are set correctly</Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-start' }}>
              <Text style={{ fontSize: 10 }}>🔍</Text>
              <Text style={{ fontSize: 10, color: '#374151', flex: 1 }}>Check spam/junk folder in email client</Text>
            </View>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}