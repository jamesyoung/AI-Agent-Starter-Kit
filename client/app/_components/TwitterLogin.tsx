'use client'

import { useEffect, useState } from 'react';

export function TwitterLogin() {
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Check for OAuth callback token in URL
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    
    if (token) {
      // Store token in session storage
      sessionStorage.setItem('twitter_token', token);
      // Clean up URL parameters
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  const handleTwitterLogin = async (e: React.MouseEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      // Request OAuth initialization from backend
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/auth/twitter/auth/init`, 
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          }
        }
      );
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      // Store current URL for post-auth redirect
      const data = await response.json();
      sessionStorage.setItem('twitter_redirect_url', window.location.href);
      
      // Redirect to Twitter OAuth page
      window.location.href = data.authUrl;
    } catch (error: unknown) {
      setIsLoading(false);
      // Error state could be handled here
    }
  }

  return (
    <button 
      type="button"
      onClick={handleTwitterLogin}
      disabled={isLoading}
      className="flex items-center justify-center gap-2 px-4 py-2 font-medium text-white bg-[#1DA1F2] rounded-lg hover:bg-[#1a91da] disabled:opacity-50"
    >
      {isLoading ? 'Connecting...' : 'Login with Twitter'}
    </button>
  )
}