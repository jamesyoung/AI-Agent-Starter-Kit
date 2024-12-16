import { Router, Request, Response } from "express";
import axios from "axios";

const router = Router();

let bearerToken: string | null = null;

async function getBearerToken() {
  if (bearerToken) return bearerToken;

  // Create Basic auth header
  const credentials = Buffer.from(
    `${process.env.TWITTER_CLIENT_ID}:${process.env.TWITTER_CLIENT_SECRET}`
  ).toString('base64');

  const params = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: process.env.TWITTER_CLIENT_ID!,
    client_secret: process.env.TWITTER_CLIENT_SECRET!,
    scope: 'tweet.read users.read',
    client_type: 'third_party_app'
  });

  const response = await axios.post(
    'https://api.twitter.com/2/oauth2/token',
    params.toString(),
    {
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    }
  );

  bearerToken = response.data.access_token;
  return bearerToken;
}

router.post('/auth', async (_req: Request, res: Response) => {
  try {
    const token = await getBearerToken();
    res.json({ token });
  } catch (error: unknown) {
    if (axios.isAxiosError(error)) {
      console.error('Twitter auth error:', error.response?.data);
    } else {
      console.error('Twitter auth error:', error);
    }
    res.status(500).json({ error: 'Authentication failed' });
  }
});

export default router;