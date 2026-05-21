const { setCorsHeaders, verifySession, commitToGitHub, getRawBody } = require('./_auth');
const fs = require('fs');
const path = require('path');

module.exports = async (req, res) => {
  setCorsHeaders(req, res);
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method Not Allowed' });
    return;
  }

  // Authenticate request
  const session = verifySession(req, res);
  if (!session) {
    res.status(401).json({ error: 'Unauthorized. Invalid or expired session.' });
    return;
  }

  const { filename } = req.query;
  if (!filename) {
    res.status(400).json({ error: 'Missing filename query parameter.' });
    return;
  }

  try {
    const fileBuffer = await getRawBody(req);

    // Commit to GitHub REST API (primary storage for Vercel deployments)
    if (process.env.GITHUB_TOKEN) {
      await commitToGitHub(`images/${filename}`, fileBuffer, `CMS Image Upload: ${filename}`);
    } else {
      // Local dev fallback — write to disk only when no GitHub token is set
      const imgDir = path.join(process.cwd(), 'images');
      if (!fs.existsSync(imgDir)) {
        fs.mkdirSync(imgDir, { recursive: true });
      }
      fs.writeFileSync(path.join(imgDir, filename), fileBuffer);
    }

    res.status(200).json({
      success: true,
      url: `images/${filename}`
    });
  } catch (err) {
    res.status(500).json({ error: 'Upload failed: ' + err.message });
  }
};
