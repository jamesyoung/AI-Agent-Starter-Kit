'use client'

export function TwitterLogin() {
  const handleTwitterLogin = async (e: React.MouseEvent) => {
    e.preventDefault();
    
    try {
      console.log('Attempting Twitter login...');
      
      const response = await fetch('/api/twitter/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Auth response:', data);
      
      if (data.token) {
        sessionStorage.setItem('twitter_token', data.token);
        console.log('Token saved to session storage');
        
        // You can now either:
        // 1. Redirect to a protected page
        // window.location.href = '/dashboard';
        
        // 2. Or trigger a state update to show authenticated content
        // setIsAuthenticated(true);
        
        // 3. Or make an API call with the token
        // const userInfo = await fetch('https://agents.ngrok.dev/twitter/me', {
        //   headers: {
        //     'Authorization': `Bearer ${data.token}`
        //   }
        // });
      }
    } catch (error) {
      console.error('[TwitterLogin] Auth failed:', error);
    }
  }

  return (
    <button 
      type="button"
      onClick={handleTwitterLogin}
      className="flex items-center justify-center gap-2 px-4 py-2 font-medium text-white bg-[#1DA1F2] rounded-lg hover:bg-[#1a91da]"
    >
      Login with Twitter
    </button>
  )
}