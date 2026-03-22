
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";

/**
 * ⚠️ IMPORTANTE: REEMPLAZA ESTOS DATOS
 * Ve a: Firebase Console > Configuración del Proyecto > General > Tus Apps
 * Si no tienes una app creada, haz clic en el icono de </> (Web)
 */
const firebaseConfig = {
  apiKey: "AIzaSyAUY3mbdZ3_MgxDDVE0qRwDOBqIuSOTdOU",
  authDomain: "seikoyt-streaming.firebaseapp.com",
  projectId: "seikoyt-streaming",
  storageBucket: "seikoyt-streaming.firebasestorage.app",
  messagingSenderId: "329984889094",
  appId: "1:329984889094:web:2c4814f98f9bb0edb74e87"
};

// Check if the user has replaced the placeholders
export const isConfigured = firebaseConfig.projectId !== "YOUR_PROJECT_ID";

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);

export default app;
