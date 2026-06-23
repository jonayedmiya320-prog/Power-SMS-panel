import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyCmG269FY90tV6pWZmmcUssxcMXiPgmCB8",
  authDomain: "power-sms-60eea.firebaseapp.com",
  projectId: "power-sms-60eea",
  storageBucket: "power-sms-60eea.firebasestorage.app",
  messagingSenderId: "757262497754",
  appId: "1:757262497754:web:8f14c7ee78604298b1f2e3"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);