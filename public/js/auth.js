import { auth } from './firebase-config.js';
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// Token পাওয়ার function
export async function getToken() {
  const user = auth.currentUser;
  if (!user) return null;
  return await user.getIdToken();
}

// API call helper
export async function apiFetch(url, options = {}) {
  const token = await getToken();
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + token,
      ...(options.headers || {})
    }
  });
  return res.json();
}

// Login
export async function doLogin(email, password) {
  return await signInWithEmailAndPassword(auth, email, password);
}

// Logout
export async function doLogout() {
  await signOut(auth);
  window.location.href = '/';
}

// Auth check - login না থাকলে redirect
export function requireAuth(callback) {
  onAuthStateChanged(auth, (user) => {
    if (!user) {
      window.location.href = '/';
    } else {
      if (callback) callback(user);
    }
  });
}