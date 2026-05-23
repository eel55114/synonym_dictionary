// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth"; // Firebase Authentication 추가
import { getAnalytics } from "firebase/analytics";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyD7420iLZRgwSXOGitgzHjHNDxIO3Ly6as",
  authDomain: "ko-dict-18f7d.firebaseapp.com",
  projectId: "ko-dict-18f7d",
  storageBucket: "ko-dict-18f7d.firebasestorage.app",
  messagingSenderId: "165991819164",
  appId: "1:165991819164:web:0c7cc2cfe407c776e44a59",
  measurementId: "G-T22HVH5SB9"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and Analytics
export const auth = getAuth(app); // Authentication 객체 생성 및 내보내기
export const analytics = getAnalytics(app);
