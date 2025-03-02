<script>
  import { onMount } from 'svelte';
  import { browser } from '$app/environment';
  import { page } from '$app/stores';
  import '../styles/styles.css';
  
  // Only import these components in the browser to avoid SSR issues
  let NotificationManager;
  
  onMount(async () => {
    if (browser) {
      // Dynamically import components only in the browser
      const notificationModule = await import('$lib/components/NotificationManager.svelte');
      NotificationManager = notificationModule.default;
      
      // Initialize token management if the module exists
      try {
        const tokenManager = await import('$lib/services/fcm-token-manager');
        if (tokenManager.initializeTokenManagement) {
          tokenManager.initializeTokenManagement();
        }
      } catch (error) {
        console.error('Error initializing token management:', error);
      }
    }
  });
  
  // Only show notification prompt on main app pages
  $: showNotificationPrompt = $page.url.pathname.startsWith('/app') || 
                           $page.url.pathname === '/';
</script>

<svelte:head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
</svelte:head>

<main>
  <slot />
</main>

{#if browser && NotificationManager && showNotificationPrompt}
  <svelte:component this={NotificationManager} showPrompt={true} />
{/if}
