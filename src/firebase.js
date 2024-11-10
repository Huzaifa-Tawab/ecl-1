import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyBSyfR5TGxL3Ck1ush0WqXsHZ1ZzLMgQy4",
    authDomain: "ecl-1-e3e33.firebaseapp.com",
    projectId: "ecl-1-e3e33",
    storageBucket: "ecl-1-e3e33.firebasestorage.app",
    messagingSenderId: "892563542429",
    appId: "1:892563542429:web:713b2004ac6a96f17cdf74",
    measurementId: "G-4GN7TQ767F"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

export { auth };
