// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration (start_PDS)
const firebaseConfig = {
  apiKey: "AIzaSyDXAioRW4bdmYQAk551H5cp1_V1wuFEjPs",
  authDomain: "plandosee-project-01.firebaseapp.com",
  projectId: "plandosee-project-01",
  storageBucket: "plandosee-project-01.firebasestorage.app",
  messagingSenderId: "863092520546",
  appId: "1:863092520546:web:ca55f0843aa0b1698e833b",
  // measurementId is used by Analytics (initialized client-side)
  measurementId: "G-WVMCM7V3QV",
} as const;

// Initialize Firebase (avoid re-initialization during HMR)
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);

// Initialize Cloud Firestore and get a reference to the service
export const db = getFirestore(app);

export default app; 