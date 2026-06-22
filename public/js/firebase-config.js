// ==========================================
// public/js/firebase-config.js
// ==========================================

// Firebase Config
const firebaseConfig = {
    apiKey: "AIzaSyCmG269FY90tV6pWZmmcUssxcMXiPgmCB8",
    authDomain: "power-sms-60eea.firebaseapp.com",
    projectId: "power-sms-60eea",
    storageBucket: "power-sms-60eea.firebasestorage.app",
    messagingSenderId: "757262497754",
    appId: "1:757262497754:web:8f14c7ee78604298b1f2e3"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Firebase Services
const auth = firebase.auth();
const db = firebase.firestore();