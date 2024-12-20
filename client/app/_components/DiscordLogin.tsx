'use client'

import { useEffect, useState } from 'react';

export function DiscordLogin() {
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('discord_token');
    
    if (token) {
      sessionStorage.setItem('discord_token', token);
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  const handleDiscordLogin = async (e: React.MouseEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      const response = await fetch(
        `/api/auth/discord/auth/init`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      sessionStorage.setItem('discord_redirect_url', window.location.href);
      window.location.href = data.authUrl;
    } catch (error: unknown) {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex items-center justify-center w-full my-4">
      <button 
        type="button"
        onClick={handleDiscordLogin}
        disabled={isLoading}
        className="flex items-center justify-center gap-2 px-4 py-2 font-medium text-white bg-[#5865F2] rounded-lg hover:bg-[#4752C4] disabled:opacity-50"
      >
        {isLoading ? 'Connecting...' : 'Login with Discord'}
      </button>
    </div>
  )
} 