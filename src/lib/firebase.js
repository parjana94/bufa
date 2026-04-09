import { getApp, getApps, initializeApp } from "firebase/app"
import { getFirestore } from "firebase/firestore"

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

function hasFirebaseConfig(config) {
  const requiredKeys = ["apiKey", "authDomain", "projectId", "storageBucket", "messagingSenderId", "appId"]
  return requiredKeys.every((key) => {
    const value = config[key]
    return typeof value === "string" && value.trim().length > 0
  })
}

export const isFirebaseConfigured = hasFirebaseConfig(firebaseConfig)

let dbInstance = null

if (!isFirebaseConfigured) {
  console.warn("[Firebase] Missing VITE_FIREBASE_* env vars. Using local mock mode.")
} else {
  try {
    const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig)
    dbInstance = getFirestore(app)
    console.log("[Firebase] Firestore initialized successfully.")
  } catch (error) {
    console.error("[Firebase] Failed to initialize Firestore. Falling back to mock mode.", error)
  }
}

export const db = dbInstance
