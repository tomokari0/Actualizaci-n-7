
import { initializeApp } from 'firebase/app';
import { 
    getAuth, 
    GoogleAuthProvider, 
    signInWithPopup, 
    signOut, 
    onAuthStateChanged as firebaseOnAuthStateChanged,
    type Auth,
    type User
} from 'firebase/auth';

// ====================================================================================
// IMPORTANT: Your Firebase project's configuration should be set in environment variables.
// In a development environment like this one, these are managed for you.
// You can get this from the Firebase console:
// Project settings > General > Your apps > Web app > Firebase SDK snippet > Config
// ====================================================================================
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID
};

let authInstance: Auth | null = null;
let googleProvider: GoogleAuthProvider | null = null;

// Check for the essential config keys to prevent initialization with invalid data
if (firebaseConfig.apiKey && firebaseConfig.projectId) {
    try {
        const app = initializeApp(firebaseConfig);
        authInstance = getAuth(app);
        googleProvider = new GoogleAuthProvider();
    } catch (e) {
        console.error("Firebase initialization failed:", e);
    }
} else {
    console.warn("Firebase configuration is missing or incomplete. Authentication will be disabled. Please set the required FIREBASE_* environment variables.");
}

// Export the auth instance, which could be null
export const auth = authInstance;

/**
 * Initiates the Google Sign-In popup flow.
 * @returns {Promise<import('firebase/auth').UserCredential>} A promise that resolves with the user's credential.
 */
export const signInWithGoogle = () => {
  if (!authInstance || !googleProvider) {
    const errorMsg = "Firebase is not configured correctly. Please check your environment variables.";
    console.error(errorMsg);
    return Promise.reject(new Error(errorMsg));
  }
  return signInWithPopup(authInstance, googleProvider);
};

/**
 * Signs out the current user.
 * @returns {Promise<void>} A promise that resolves when the user is signed out.
 */
export const signOutUser = () => {
  if (!authInstance) {
    const errorMsg = "Firebase is not configured correctly.";
    console.error(errorMsg);
    return Promise.reject(new Error(errorMsg));
  }
  return signOut(authInstance);
};

/**
 * Listens for authentication state changes.
 * @param callback The function to call when the auth state changes.
 * @returns A function to unsubscribe from the listener.
 */
export const onAuthStateChanged = (callback: (user: User | null) => void) => {
    if (!authInstance) {
        // If Firebase isn't initialized, immediately call back with null user
        // and return a no-op unsubscribe function.
        callback(null);
        return () => {};
    }
    return firebaseOnAuthStateChanged(authInstance, callback);
};

export type { User };
