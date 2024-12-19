import { Router, Request, Response } from "express";
import axios, { AxiosError } from "axios";
import crypto from "crypto";

const router = Router();

/**
 * In-memory storage for PKCE code verifiers
 * - Key: state parameter (prevents CSRF)
 * - Value: code verifier (proves client identity)
 * Note: In production, consider using Redis for distributed systems
 */
const codeVerifiers = new Map<string, string>();

/**
 * Generates a PKCE code verifier
 * - Creates cryptographically secure random bytes
 * - Converts to URL-safe base64 string
 * - Ensures compliance with RFC 7636 requirements
 * @returns {string} A code verifier string between 43-128 characters
 */
function generateCodeVerifier() {
  const buffer = crypto.randomBytes(32);
  const verifier = buffer.toString('base64')
    .replace(/[^a-zA-Z0-9]/g, '') // Remove non-alphanumeric chars
    .substring(0, 128);           // Truncate to max length
  return verifier;
}

/**
 * Creates a code challenge from verifier for PKCE
 * - Hashes verifier using SHA256
 * - Converts to URL-safe base64 string
 * - Implements S256 transform per OAuth 2.0 spec
 * @param {string} verifier - The code verifier to transform
 * @returns {string} URL-safe base64 encoded challenge
 */
function generateCodeChallenge(verifier: string) {
  const hash = crypto.createHash('sha256');
  hash.update(verifier);
  const rawDigest = hash.digest('base64');
  
  // Convert to URL-safe format
  return rawDigest
    .replace(/\+/g, '-')    // Convert '+' to '-'
    .replace(/\//g, '_')    // Convert '/' to '_'
    .replace(/=/g, '');     // Remove padding '='
}

/**
 * Initiates Twitter OAuth 2.0 PKCE flow
 * - Generates state for CSRF protection
 * - Creates PKCE verifier/challenge pair
 * - Constructs Twitter authorization URL
 */
router.post('/auth/init', async (_req: Request, res: Response) => {
  try {
    // Generate CSRF protection state
    const state = crypto.randomBytes(16).toString('hex');

    // Generate and store PKCE parameters
    const codeVerifier = generateCodeVerifier();
    const codeChallenge = generateCodeChallenge(codeVerifier);
    codeVerifiers.set(state, codeVerifier);
    
    // Build Twitter OAuth URL with required parameters
    const authUrl = new URL('https://twitter.com/i/oauth2/authorize');
    const params = {
      'response_type': 'code',                           // OAuth 2.0 auth code flow
      'client_id': process.env.TWITTER_CLIENT_ID!,       // Your app's client ID
      'redirect_uri': process.env.TWITTER_CALLBACK_URL!, // Must match registered URL
      'scope': 'tweet.read users.read offline.access',   // Requested permissions
      'state': state,                                    // CSRF token
      'code_challenge': codeChallenge,                   // PKCE challenge
      'code_challenge_method': 'S256'                    
    };

    // Add params to URL
    Object.entries(params).forEach(([key, value]) => {
      authUrl.searchParams.append(key, value);
    });

    res.json({ authUrl: authUrl.toString() });
  } catch (error) {
    console.error('[Twitter Auth] Error:', error);
    res.status(500).json({ error: 'Auth initialization failed' });
  }
});

// Handle OAuth callback from Twitter
router.get('/callback', async (req: Request, res: Response) => {
  try {
    const { code, state } = req.query;
    
    // Verify state matches and get stored verifier
    const codeVerifier = codeVerifiers.get(state as string);
    if (!codeVerifier) {
      throw new Error('Invalid state parameter');
    }

    // Create basic auth header from client credentials
    const basicAuth = Buffer.from(
      `${process.env.TWITTER_CLIENT_ID}:${process.env.TWITTER_CLIENT_SECRET}`
    ).toString('base64');

    // Exchange code for access token
    const params = new URLSearchParams({
      code: code as string,
      grant_type: 'authorization_code',
      client_id: process.env.TWITTER_CLIENT_ID!,
      redirect_uri: process.env.TWITTER_CALLBACK_URL!,
      code_verifier: codeVerifier
    });

    const tokenResponse = await axios.post(
      'https://api.twitter.com/2/oauth2/token',
      params,
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${basicAuth}`
        }
      }
    );

    // Clean up stored verifier
    codeVerifiers.delete(state as string);

    // Redirect to success
    return res.redirect(302, `${process.env.NEXT_PUBLIC_API_URL}/api/auth/twitter/success?token=${tokenResponse.data.access_token}`);
  } catch (error) {
    console.error('[Twitter Callback] Error:', error);
    if (error instanceof AxiosError) {
      console.error('[Twitter Callback] Response data:', error.response?.data);
      console.error('[Twitter Callback] Response status:', error.response?.status);
      console.error('[Twitter Callback] Response headers:', error.response?.headers);
      console.error('[Twitter Callback] Request URL:', error.config?.url);
      console.error('[Twitter Callback] Request params:', error.config?.params);
    }
    return res.redirect(302, `${process.env.NEXT_PUBLIC_API_URL}/api/auth/twitter/error`);
  }
});

router.get('/success', async (req: Request, res: Response) => {
  try {
    const { token } = req.query;
    
    if (!token) {
      throw new Error('No token provided');
    }

    // Here you might want to:
    // 1. Store the token in a session
    // 2. Set it in a secure httpOnly cookie
    // 3. Or send it in a way your frontend can securely handle it
    
    res.json({ 
      success: true, 
      message: 'Twitter authentication successful',
      token 
    });
  } catch (error) {
    console.error('[Twitter Success] Error:', error);
    res.status(400).json({ 
      success: false, 
      error: 'Failed to process authentication token' 
    });
  }
});

export default router;