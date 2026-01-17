import { initializeApp, getApps } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDhIxZ4yGf5g10ji17EU-nmua4SmzmpUhI",
  authDomain: "talya-beauty.firebaseapp.com",
  projectId: "talya-beauty",
  storageBucket: "talya-beauty.firebasestorage.app",
  messagingSenderId: "398365985932",
  appId: "1:398365985932:web:ce56415e098da291237fa9",
  measurementId: "G-JVH49H3X6H"
};

// Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);

export default app;

