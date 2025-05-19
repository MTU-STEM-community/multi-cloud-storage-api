const { google } = require('googleapis');
const http = require('http');
const url = require('url');
const destroyer = require('server-destroy');

async function getRefreshToken() {
  const CLIENT_ID =
    '43523055081-fv1mrj4rk1nt78jii3gn40gho6d4frda.apps.googleusercontent.com';
  const CLIENT_SECRET = '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';
  const REDIRECT_URI = 'http://localhost:3000/oauth2callback';

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

  console.log('Please open this URL in your browser:');
  console.log(authorizeUrl);

  return new Promise((resolve, reject) => {
    const server = http.createServer(async (req, res) => {
      try {
        const queryParams = url.parse(req.url, true).query;

        if (queryParams.code) {
          const { tokens } = await oauth2Client.getToken(queryParams.code);

          res.end('Authentication successful! You can close this tab.');

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
    console.log('\nYour refresh token:');
    console.log(tokens.refresh_token);
    console.log('\nAccess token (temporary):');
    console.log(tokens.access_token);
    console.log(
      '\nStore the refresh token securely in your environment variables as GOOGLE_DRIVE_REFRESH_TOKEN',
    );
  })
  .catch((err) => {
    console.error('Error getting refresh token:', err);
  });
