// src/firebase.js
import { initializeApp } from "firebase/app";
import { getAuth} from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyB0Orp05fD56GJ1gcPGyFuTSWpHCChgPhY",
  authDomain: "chatbox-1e96b.firebaseapp.com",
  projectId: "chatbox-1e96b",
  storageBucket: "chatbox-1e96b.appspot.com", // ✅ should be .appspot.com not .firebasestorage.app
  messagingSenderId: "578270105487",
  appId: "1:578270105487:web:9d523fb43e1a8762f3c5fa"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Export auth + firestore
export const auth = getAuth(app);
export const db = getFirestore(app);
