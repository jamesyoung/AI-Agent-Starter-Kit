'use client'

import { useEffect, useState } from 'react';

export function GithubLogin() {
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('github_token');
    
    if (token) {
      sessionStorage.setItem('github_token', token);
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  const handleGithubLogin = async (e: React.MouseEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      const response = await fetch(
        `/api/auth/github/auth/init`,
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
      sessionStorage.setItem('github_redirect_url', window.location.href);
      window.location.href = data.authUrl;
    } catch (error: unknown) {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex items-center justify-center w-full my-4">
      <button 
        type="button"
        onClick={handleGithubLogin}
        disabled={isLoading}
        className="flex items-center justify-center gap-2 px-4 py-2 font-medium text-white bg-[#24292e] rounded-lg hover:bg-[#1b1f23] disabled:opacity-50"
      >
        {isLoading ? 'Connecting...' : 'Login with GitHub'}
      </button>
    </div>
  )
} 