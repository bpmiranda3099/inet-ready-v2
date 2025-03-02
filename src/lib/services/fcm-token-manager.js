import { getMessaging, getToken, deleteToken } from 'firebase/messaging';
import { getFirestore, doc, setDoc, updateDoc, collection, query, where, getDocs, deleteDoc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import app from '../firebase/app';
import { registerServiceWorker } from './service-worker';

// Default VAPID key from environment
const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;

// Singleton instance for token tracking
let currentToken = null;

/**
 * Get FCM token, generating a new one if necessary
 * @returns {Promise<string|null>} FCM token or null if unavailable
 */
export async function getFCMToken() {
  try {
    // If already have a token and it hasn't been invalidated, return it
    if (currentToken) {
      return currentToken;
    }
    
    // Check browser support
    if (!('Notification' in window)) {
      console.log('This browser does not support notifications');
      return null;
    }
    
    // Check permission
    if (Notification.permission !== 'granted') {
      console.log('Notification permission not granted');
      return null;
    }
    
    // First check for stored token in localStorage
    const storedToken = localStorage.getItem('fcmToken');
    if (storedToken) {
      console.log('Using stored FCM token');
      currentToken = storedToken;
      return storedToken;
    }
    
    // Ensure service worker is ready
    await registerServiceWorker();
    const swRegistration = await navigator.serviceWorker.ready;
    
    // Get FCM token
    const messaging = getMessaging(app);
    const token = await getToken(messaging, { 
      vapidKey, 
      serviceWorkerRegistration: swRegistration 
    });
    
    if (token) {
      console.log('New FCM token generated:', token);
      localStorage.setItem('fcmToken', token);
      currentToken = token;
      return token;
    } else {
      console.log('Failed to generate FCM token');
      return null;
    }
  } catch (error) {
    console.error('Error getting FCM token:', error);
    return null;
  }
}

/**
 * Store FCM token in Firestore both in user document and tokens collection
 * @param {string} token FCM token to store
 * @returns {Promise<boolean>} True if successful
 */
export async function storeFCMToken(token) {
  try {
    if (!token) {
      console.error('Cannot store empty token');
      return false;
    }
    
    const auth = getAuth();
    const userId = auth.currentUser?.uid;
    
    if (!userId) {
      console.log('No authenticated user, storing token in local storage only');
      localStorage.setItem('fcmToken', token);
      return false;
    }
    
    const db = getFirestore();
    
    // 1. Update user document
    await updateDoc(doc(db, 'users', userId), {
      fcmToken: token,
      fcmTokenUpdatedAt: new Date(),
      notificationEnabled: true
    }).catch(error => {
      // If document doesn't exist yet, create it
      if (error.code === 'not-found') {
        return setDoc(doc(db, 'users', userId), {
          fcmToken: token,
          fcmTokenUpdatedAt: new Date(),
          notificationEnabled: true,
          createdAt: new Date()
        });
      }
      throw error;
    });
    
    // 2. Store in tokens collection with device info
    const deviceInfo = getDeviceInfo();
    await setDoc(doc(db, 'fcm_tokens', token), {
      token,
      userId,
      createdAt: new Date(),
      lastValidated: new Date(),
      isValid: true,
      ...deviceInfo,
      subscribedTopics: ['daily_weather_insights']
    });
    
    console.log('FCM token stored successfully');
    return true;
  } catch (error) {
    console.error('Error storing FCM token:', error);
    return false;
  }
}

/**
 * Clean up invalid tokens for the current user
 */
export async function cleanupTokens() {
  try {
    const auth = getAuth();
    const userId = auth.currentUser?.uid;
    
    if (!userId) return;
    
    const db = getFirestore();
    const tokensRef = collection(db, 'fcm_tokens');
    const q = query(tokensRef, where('userId', '==', userId));
    
    const snapshot = await getDocs(q);
    const tokens = [];
    
    snapshot.forEach((doc) => {
      const tokenData = doc.data();
      
      // Skip the current token
      if (tokenData.token === currentToken) return;
      
      tokens.push({
        token: tokenData.token,
        docRef: doc.ref
      });
    });
    
    // Check each token for validity (up to 5 to avoid excessive checks)
    const tokensToCheck = tokens.slice(0, 5); 
    const messaging = getMessaging(app);
    
    for (const { token, docRef } of tokensToCheck) {
      try {
        // Try to delete the token - if it succeeds, token was invalid
        await deleteToken(messaging);
        await deleteToken(messaging);
        // Mark as invalid in database
        await updateDoc(docRef, {
          isValid: false,
          invalidatedAt: new Date()
        });
        
        console.log('Marked invalid token:', token);
      } catch (error) {
        // Token might still be valid if deletion fails with specific errors
        if (error.code === 'messaging/token-not-registered') {
          // Token was already invalidated on Firebase side
          await deleteDoc(docRef);
          console.log('Removed unregistered token:', token);
        }
      }
    }
  } catch (error) {
    console.error('Error cleaning up tokens:', error);
  }
}

/**
 * Get device information to store with the token
 */
function getDeviceInfo() {
  const info = {
    platform: 'web',
    userAgent: navigator.userAgent,
    language: navigator.language
  };
  
  // Add mobile detection
  info.isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  
  // Add browser detection
  if (navigator.userAgent.indexOf('Chrome') !== -1) info.browser = 'Chrome';
  else if (navigator.userAgent.indexOf('Firefox') !== -1) info.browser = 'Firefox';
  else if (navigator.userAgent.indexOf('Safari') !== -1) info.browser = 'Safari';
  else if (navigator.userAgent.indexOf('Edge') !== -1) info.browser = 'Edge';
  else info.browser = 'Other';
  
  return info;
}

/**
 * Initialize token management - call this on app start
 */
export async function initializeTokenManagement() {
  if (typeof window === 'undefined') return;
  
  // Check for notification permission
  if (Notification.permission === 'granted') {
    try {
      // Get token
      const token = await getFCMToken();
      
      if (token) {
        // Store token
        await storeFCMToken(token);
        
        // Clean up old tokens after a delay
        setTimeout(() => {
          cleanupTokens().catch(console.error);
        }, 5000); // 5-second delay to avoid blocking app initialization
      }
    } catch (error) {
      console.error('Error initializing token management:', error);
    }
  } else {
    console.log('Notifications not enabled. Skipping token initialization.');
  }
}

// Auto-initialize in browser environment after page load
if (typeof window !== 'undefined') {
  window.addEventListener('load', () => {
    // Delay initialization slightly to not block main thread
    setTimeout(() => {
      initializeTokenManagement().catch(console.error);
    }, 3000);
  });
}
