const { google } = require('googleapis');
const http = require('http');
const url = require('url');
const destroyer = require('server-destroy');

async function getRefreshToken() {
  const CLIENT_ID = process.env.GOOGLE_DRIVE_CLIENT_ID;
  const CLIENT_SECRET = process.env.GOOGLE_DRIVE_CLIENT_SECRET;
  const REDIRECT_URI = 'http://localhost:3000/oauth2callback';

  if (!CLIENT_ID || !CLIENT_SECRET) {
    throw new Error(
      'GOOGLE_DRIVE_CLIENT_ID and GOOGLE_DRIVE_CLIENT_SECRET must be set in environment variables',
    );
  }

  const oauth2Client = new google.auth.OAuth2(
    CLIENT_ID,
    CLIENT_SECRET,
    REDIRECT_URI,
  );

  const authorizeUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: ['https://www.googleapis.com/auth/drive'],
    prompt: 'consent',
  });

  console.log('Open this URL in your browser:');
  console.log(authorizeUrl);

  return new Promise((resolve, reject) => {
    const server = http.createServer(async (req, res) => {
      try {
        const queryParams = url.parse(req.url, true).query;
        if (queryParams.code) {
          const { tokens } = await oauth2Client.getToken(queryParams.code);
          res.end('Authentication successful. You may close this tab.');
          server.destroy();
          resolve(tokens);
        }
      } catch (e) {
        reject(e);
      }
    });

    server.listen(3000, () => {
      console.log(
        'Waiting for authorization on http://localhost:3000/oauth2callback',
      );
    });

    destroyer(server);
  });
}

getRefreshToken()
  .then((tokens) => {
    console.log('Refresh token:', tokens.refresh_token);
    console.log(
      'Store this value as GOOGLE_DRIVE_REFRESH_TOKEN in your .env file',
    );
  })
  .catch((err) => {
    console.error('Error:', err.message);
    process.exit(1);
  });
