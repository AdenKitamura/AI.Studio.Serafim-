
export default async function handler(req, res) {
  // Allow CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST');

  // 1. Safe extraction and TRIMMING of env vars (crucial for Vercel/Copy-Paste issues)
  const GOOGLE_CLIENT_ID = (process.env.GOOGLE_CLIENT_ID || '').trim();
  const GOOGLE_CLIENT_SECRET = (process.env.GOOGLE_CLIENT_SECRET || '').trim();
  const GOOGLE_REFRESH_TOKEN = (process.env.GOOGLE_REFRESH_TOKEN || '').trim();

  // 2. Debug check (boolean only, do not leak secrets)
  const status = {
    hasClientId: !!GOOGLE_CLIENT_ID,
    hasClientSecret: !!GOOGLE_CLIENT_SECRET,
    hasRefreshToken: !!GOOGLE_REFRESH_TOKEN,
    clientIdLength: GOOGLE_CLIENT_ID.length,
    refreshTokenLength: GOOGLE_REFRESH_TOKEN.length
  };

  if (!GOOGLE_REFRESH_TOKEN || !GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    console.error('Missing Env Vars:', status);
    return res.status(500).json({ error: 'Missing configuration', debug: status });
  }

  try {
    // 3. Make the request to Google
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        refresh_token: GOOGLE_REFRESH_TOKEN,
        grant_type: 'refresh_token',
      }),
    });

    const data = await response.json();

    // 4. Handle Google Errors specifically
    if (data.error) {
      console.error('Google OAuth Error:', data);
      // Return 200 with error field so client can parse and display it cleanly
      return res.status(200).json({ 
        error: data.error, 
        error_description: data.error_description,
        debug: status 
      });
    }

    // 5. Success
    return res.status(200).json({
      access_token: data.access_token,
      expires_in: data.expires_in,
      scope: data.scope,
      token_type: data.token_type
    });

  } catch (error) {
    console.error('Internal Function Error:', error);
    return res.status(500).json({ error: 'Internal Server Error', details: error.toString() });
  }
}
