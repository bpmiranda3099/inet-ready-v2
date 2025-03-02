<script>
  import { onMount, onDestroy } from 'svelte';
  import { fade } from 'svelte/transition';
  import { getCurrentUser } from '$lib/firebase/auth';
  import { registerServiceWorker } from '$lib/services/service-worker';
  import { getFCMToken, storeFCMToken } from '$lib/services/fcm-token-manager';
  import { writable } from 'svelte/store';
  export let showPrompt = true;
  
  let notificationStatus = 'unknown';
  let permissionPromptShown = false;
  let unsubscribeUser;

  // Initialize notification permission status
  onMount(async () => {
    if (typeof Notification !== 'undefined') {
      notificationStatus = Notification.permission;
      
      // Listen for user changes
      if (globalThis.$currentUser) {
        checkForStoredToken();
      }
      
      const userStore = writable(getCurrentUser());
      unsubscribeUser = userStore.subscribe((user) => {
        if (user) {
          checkForStoredToken();
        }
      });
    }
  });
  
  onDestroy(() => {
    if (unsubscribeUser) unsubscribeUser();
  });
  
  // Check if the user already has a token stored
  async function checkForStoredToken() {
    if (globalThis.$currentUser && notificationStatus === 'granted') {
      try {
        // Get existing or generate new token
        const token = await getFCMToken();
        
        if (token) {
          // Store token in Firestore
          await storeFCMToken(token);
        }
      } catch (error) {
        console.error("Error checking for stored token:", error);
      }
    }
  }
  
  // Request permission and token
  async function requestPermission() {
    try {
      permissionPromptShown = true;
      
      if (typeof Notification === 'undefined') {
        notificationStatus = 'unsupported';
        return;
      }
      
      // Request permission
      const permission = await Notification.requestPermission();
      notificationStatus = permission;
      
      if (permission === 'granted') {
        // Make sure service worker is registered
        await registerServiceWorker();
        
        // Get FCM token
        const token = await getFCMToken();
        
        if (token && globalThis.$currentUser) {
          // Store token in Firestore
          await storeFCMToken(token);
        }
      }
    } catch (error) {
      console.error("Error requesting notification permission:", error);
    }
  }
</script>

<!-- Rest of component remains unchanged -->
{#if showPrompt && notificationStatus !== 'granted' && !permissionPromptShown}
  <div class="notification-prompt" transition:fade={{ duration: 300 }}>
    <div class="content">
      <h3>Stay Updated!</h3>
      <p>Get daily weather insights and health travel tips delivered right to your device.</p>
      
      <div class="buttons">
        <button class="primary" on:click={requestPermission}>
          Enable Notifications
        </button>
        <button class="secondary" on:click={() => permissionPromptShown = true}>
          Maybe Later
        </button>
      </div>
    </div>
  </div>
{/if}

<!-- Styles remain unchanged -->
<style>
  /* ...existing code... */
</style>
