import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDfaVM3Fj_8-vsyU0iYcQhTp4HGTU_GAiI",
  authDomain: "aura-intelligence-ai.firebaseapp.com",
  projectId: "aura-intelligence-ai",
  storageBucket: "aura-intelligence-ai.firebasestorage.app",
  messagingSenderId: "642538397504",
  appId: "1:642538397504:web:de8aac5c8e4822eaa4a4a5",
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);

export default app;