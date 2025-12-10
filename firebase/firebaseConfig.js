// ✅ Import only what works in React Native
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";
// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyD-SZD13ODaIw8qXmptKy1eMC-wZ8VlupA",
  authDomain: "tearrarium-iot-monitoring.firebaseapp.com",
  projectId: "tearrarium-iot-monitoring",
  storageBucket: "tearrarium-iot-monitoring.firebasestorage.app",
  messagingSenderId: "630085845562",
  appId: "1:630085845562:web:22c7811d151f6a2d186b03"
};

// ✅ Initialize Firebase
const app = initializeApp(firebaseConfig);

// ✅ Exports — React Native safe
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);