'use client'

import { generateRandomString, sha256, base64URLEncode } from '../lib/auth'

interface TwitterLoginResponse {
  url?: string
  error?: string
}

const generateCodeVerifier = () => {
  return generateRandomString(64)
}

const generateCodeChallenge = async (verifier: string) => {
  const hashed = await sha256(verifier)
  return base64URLEncode(hashed)
}

const generateState = () => {
  return generateRandomString(32)
}

export function TwitterLogin() {
  const handleTwitterLogin = async () => {
    try {
      const verifier = generateCodeVerifier()
      // Store verifier in sessionStorage for callback verification
      sessionStorage.setItem('twitter_code_verifier', verifier)
      
      const challenge = await generateCodeChallenge(verifier)
      const state = generateState()
      
      const response = await fetch('/api/twitter/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          code_challenge: challenge,
          state
        })
      })
      
      const data = await response.json() as TwitterLoginResponse
      if (data.url) {
        window.location.href = data.url
      }
    } catch (error) {
      console.error('[TwitterLogin] Auth initialization failed:', error)
    }
  }

  return (
    <button 
      onClick={handleTwitterLogin}
      className="flex items-center justify-center gap-2 px-4 py-2 font-medium text-white bg-[#1DA1F2] rounded-lg hover:bg-[#1a91da]"
    >
      Login with Twitter
    </button>
  )
}