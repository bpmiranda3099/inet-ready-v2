<script>
  import { onMount } from 'svelte';
  import { getFCMToken, storeFCMToken } from '$lib/services/fcm-token-manager';
  import { registerServiceWorker, isServiceWorkerActive } from '$lib/services/service-worker';
  
  let notificationPermission = 'unknown';
  let fcmToken = null;
  let swStatus = { active: false, scope: null };
  let isLoading = false;
  let testResult = null;
  
  onMount(async () => {
    if ('Notification' in window) {
      notificationPermission = Notification.permission;
      
      if (notificationPermission === 'granted') {
        await checkServiceWorker();
        fcmToken = await getOrRequestToken();
      }
    } else {
      notificationPermission = 'unsupported';
    }
  });
  
  async function checkServiceWorker() {
    isLoading = true;
    try {
      const regs = await navigator.serviceWorker.getRegistrations();
      const fcmSW = regs.find(reg => reg.scope.includes(window.location.origin));
      
      if (fcmSW) {
        swStatus.active = !!fcmSW.active;
        swStatus.scope = fcmSW.scope;
      } else {
        // Try to register the service worker
        await registerServiceWorker();
        const active = await isServiceWorkerActive();
        swStatus.active = active;
      }
    } catch (error) {
      console.error("Error checking service worker:", error);
    } finally {
      isLoading = false;
    }
  }
  
  async function getOrRequestToken() {
    try {
      return await getFCMToken();
    } catch (error) {
      console.error("Error getting FCM token:", error);
      return null;
    }
  }
  
  async function requestPermission() {
    isLoading = true;
    
    try {
      const permission = await Notification.requestPermission();
      notificationPermission = permission;
      
      if (permission === 'granted') {
        await checkServiceWorker();
        fcmToken = await getOrRequestToken();
        if (fcmToken) {
          await storeFCMToken(fcmToken);
        }
      }
    } catch (error) {
      console.error("Error requesting permission:", error);
      testResult = { success: false, message: error.message };
    } finally {
      isLoading = false;
    }
  }
  
  async function sendTestNotification() {
    isLoading = true;
    testResult = null;
    
    try {
      // Create a test notification directly in the browser
      const notificationObj = {
        title: "Test Notification",
        body: "This is a test notification sent directly from the browser",
        timestamp: new Date().toISOString(),
        tag: `test-${Date.now()}`,
        url: "/app/test-notification" // Ensure no spaces in URLs
      };
      
      // Create notification
      new Notification(notificationObj.title, {
        body: notificationObj.body,
        icon: "/app-icon.png",
        badge: "/badge.png", // Use this badge image
        tag: notificationObj.tag
      });
      
      // Also trigger storage event for NotificationManager to show in-app notification
      localStorage.setItem('test_notification', JSON.stringify(notificationObj));
      
      testResult = { success: true, message: "Local test notification sent!" };
    } catch (error) {
      console.error("Error sending test notification:", error);
      testResult = { success: false, message: error.message };
    } finally {
      isLoading = false;
    }
  }
  
  async function reregisterServiceWorker() {
    isLoading = true;
    testResult = null;
    
    try {
      // Unregister existing service workers
      const regs = await navigator.serviceWorker.getRegistrations();
      for (let reg of regs) {
        await reg.unregister();
        console.log("Unregistered service worker:", reg.scope);
      }
      
      // Register new service worker
      await registerServiceWorker();
      await checkServiceWorker();
      
      testResult = { 
        success: true, 
        message: "Service worker re-registered successfully"
      };
      
      // Request new token after a brief delay
      setTimeout(async () => {
        fcmToken = await getOrRequestToken();
      }, 1000);
      
    } catch (error) {
      console.error("Error re-registering service worker:", error);
      testResult = { success: false, message: error.message };
    } finally {
      isLoading = false;
    }
  }
  
  function copyToken() {
    if (fcmToken) {
      navigator.clipboard.writeText(fcmToken);
      testResult = { success: true, message: "Token copied to clipboard!" };
    }
  }
</script>

<div class="container my-4">
  <h1>Push Notification Tester</h1>
  
  <div class="card mb-4">
    <div class="card-body">
      <h3>Notification Status</h3>
      
      <div class="mb-3">
        <strong>Permission Status:</strong> 
        <span class={
          notificationPermission === 'granted' ? 'text-success' : 
          notificationPermission === 'denied' ? 'text-danger' : 'text-warning'
        }>
          {notificationPermission}
        </span>
      </div>
      
      <div class="mb-3">
        <strong>Service Worker:</strong> 
        <span class={swStatus.active ? 'text-success' : 'text-danger'}>
          {swStatus.active ? 'Active' : 'Inactive'}
        </span>
        {#if swStatus.scope}
          <small class="text-muted ms-2">({swStatus.scope})</small>
        {/if}
      </div>
      
      <div class="mb-3">
        <strong>FCM Token:</strong> 
        {#if fcmToken}
          <span class="text-success">Available</span>
          <button class="btn btn-sm btn-outline-secondary ms-2" on:click={copyToken}>
            Copy
          </button>
          <div class="mt-2">
            <small class="text-muted" style="word-break: break-all;">
              {fcmToken}
            </small>
          </div>
        {:else}
          <span class="text-danger">Not available</span>
        {/if}
      </div>
      
      <div class="d-grid gap-2 d-sm-block">
        {#if notificationPermission !== 'granted'}
          <button 
            class="btn btn-primary me-2" 
            on:click={requestPermission} 
            disabled={isLoading || notificationPermission === 'denied'}>
            {isLoading ? 'Processing...' : 'Request Permission'}
          </button>
        {:else}
          <button 
            class="btn btn-primary me-2" 
            on:click={sendTestNotification} 
            disabled={isLoading}>
            {isLoading ? 'Sending...' : 'Send Test Notification'}
          </button>
        {/if}
        
        <button 
          class="btn btn-outline-secondary" 
          on:click={reregisterServiceWorker} 
          disabled={isLoading}>
          Re-register Service Worker
        </button>
      </div>
    </div>
  </div>
  
  {#if testResult}
    <div class="alert {testResult.success ? 'alert-success' : 'alert-danger'}">
      {testResult.message}
    </div>
  {/if}
  
  <div class="card">
    <div class="card-body">
      <h3>Troubleshooting Steps</h3>
      
      <ol>
        <li>Check if the service worker is properly registered and active</li>
        <li>Ensure notifications are enabled in your browser settings</li>
        <li>Verify that your site has the correct VAPID key</li>
        <li>Make sure the FCM token is saved in your database</li>
        <li>Check browser console for any errors</li>
      </ol>
    </div>
  </div>
</div>

<style>
  .container {
    max-width: 800px;
  }
</style>
