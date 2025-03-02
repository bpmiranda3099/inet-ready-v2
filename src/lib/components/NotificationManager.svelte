<script>
  import { onMount, onDestroy } from 'svelte';
  import { writable } from 'svelte/store';
  import { fly } from 'svelte/transition';
import NotificationSubscriber from './NotificationSubscriber.svelte';
  import { getFCMToken, storeFCMToken } from '$lib/services/fcm-token-manager';
  
  // Store for notifications
  export const notifications = writable([]);
  
  // Props
  export let showPrompt = true;
  export let maxNotifications = 5;
  
  // State variables
  let unsubscribe = () => {};
  let hasForegroundNotification = false;
  let currentNotification = null;
  
  // Setup foreground notification listener
  onMount(() => {
    // In a real implementation, this would connect to Firebase messaging
    // For now, just create a simple test notification mechanism
    
    // Listen for storage events (used for testing notifications)
    const storageListener = (event) => {
      if (event.key === 'test_notification') {
        try {
          const notificationData = JSON.parse(event.newValue);
          showNotification(notificationData);
        } catch (e) {
          console.error('Error parsing test notification', e);
        }
      }
    };
    
    window.addEventListener('storage', storageListener);
    
    unsubscribe = () => {
      window.removeEventListener('storage', storageListener);
    };
    
    // Request FCM token if permission is granted
    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      getFCMToken()
        .then(token => {
          if (token) {
            storeFCMToken(token);
          }
        })
        .catch(console.error);
    }
  });
  
  onDestroy(() => {
    if (typeof unsubscribe === 'function') {
      unsubscribe();
    }
  });
  
  // Show a notification
  function showNotification(notification) {
    // Clean up any URLs to ensure no spaces
    if (notification.url) {
      notification.url = notification.url.trim().replace(/\s+/g, '');
    }
    
    // Add to notifications store
    notifications.update(currentNotifications => {
      const updatedNotifications = [notification, ...currentNotifications];
      
      // Limit to maxNotifications
      if (updatedNotifications.length > maxNotifications) {
        return updatedNotifications.slice(0, maxNotifications);
      }
      return updatedNotifications;
    });
    
    // Show browser notification if page is not visible
    if (document.visibilityState !== 'visible') {
      showBrowserNotification(notification);
    }
    
    // Set flag to show in-app notification
    hasForegroundNotification = true;
    currentNotification = notification;
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
      hasForegroundNotification = false;
    }, 5000);
  }
  
  function showBrowserNotification(notification) {
    // Check if browser notifications are supported and permitted
    if ('Notification' in window && Notification.permission === 'granted') {
      const browserNotification = new Notification(notification.title, {
        body: notification.body,
        icon: '/app-icon.png',  // This is correct - keep as is
        badge: '/badge.png',    // Add badge.png reference
        tag: notification.tag || 'inet-ready-notification'
      });
      
      browserNotification.onclick = () => {
        window.focus();
        browserNotification.close();
      };
    }
  }
  
  function dismissNotification() {
    hasForegroundNotification = false;
  }
  
  // Get the most recent unread notification
  $: currentNotification = $notifications[0];
</script>

{#if showPrompt}
  <NotificationSubscriber showPrompt={showPrompt} />
{/if}

{#if hasForegroundNotification && currentNotification}
  <div class="notification-toast" transition:fly={{ y: -30, duration: 300 }}>
    <div class="notification-content">
      <h4>{currentNotification.title}</h4>
      <p>{currentNotification.body}</p>
    </div>
    <button class="close-button" on:click={dismissNotification}>×</button>
  </div>
{/if}

<style>
  .notification-toast {
    position: fixed;
    top: 20px;
    right: 20px;
    background: white;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    border-left: 4px solid #4285F4;
    border-radius: 4px;
    padding: 12px 16px;
    max-width: 350px;
    z-index: 1000;
    display: flex;
    align-items: flex-start;
  }
  
  .notification-content {
    flex: 1;
  }
  
  h4 {
    margin: 0 0 6px 0;
    font-size: 16px;
    font-weight: 500;
  }
  
  p {
    margin: 0;
    font-size: 14px;
    color: #555;
  }
  
  .close-button {
    background: transparent;
    border: none;
    font-size: 20px;
    cursor: pointer;
    padding: 0;
    margin-left: 12px;
    color: #888;
  }
  
  .close-button:hover {
    color: #333;
  }
</style>
