// Firebase configuration file
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getDatabase } from 'firebase/database';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyD-SZD13ODaIw8qXmptKy1eMC-wZ8VlupA",
  authDomain: "tearrarium-iot-monitoring.firebaseapp.com",
  databaseURL: "https://tearrarium-iot-monitoring-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "tearrarium-iot-monitoring",
  storageBucket: "tearrarium-iot-monitoring.firebasestorage.app",
  messagingSenderId: "630085845562",
  appId: "1:630085845562:web:22c7811d151f6a2d186b03"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore (for daily summaries, logs)
export const db = getFirestore(app);

// Initialize Realtime Database (for live sensor data and controls)
export const realtimeDb = getDatabase(app);

// Initialize Auth (if needed)
export const auth = getAuth(app);

export default app;