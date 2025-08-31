// Debug utility to check auth token storage and help fix the 401 error
// Add this to your project to debug the authentication issue

export const debugAuthToken = () => {
  console.log('=== AUTH TOKEN DEBUG ===');
  
  // Check what's stored in localStorage
  const authSession = localStorage.getItem('auth_session');
  const authUser = localStorage.getItem('auth_user');
  const appSession = localStorage.getItem('app_session');
  
  console.log('🔍 Raw localStorage data:');
  console.log('auth_session:', authSession);
  console.log('auth_user:', authUser);
  console.log('app_session:', appSession);
  
  if (authSession) {
    try {
      const session = JSON.parse(authSession);
      console.log('📋 Parsed session object:', session);
      
      // Check for token properties
      const token = session?.access_token || session?.token || session?.accessToken;
      console.log('🎫 Found token:', token ? '✅ YES' : '❌ NO');
      console.log('🎫 Token value:', token);
      
      // Show all session properties
      console.log('📝 Session properties:', Object.keys(session));
    } catch (error) {
      console.error('❌ Error parsing auth_session:', error);
    }
  } else {
    console.log('❌ No auth_session found in localStorage');
  }
  
  console.log('=== END DEBUG ===');
};

// Call this function in your browser console or add it to a component
// debugAuthToken();