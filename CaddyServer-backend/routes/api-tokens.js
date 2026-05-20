const crypto = require('crypto');
const db = require('../db');

// Generate a secure random token
const generateToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

// Get all API tokens for current user
const getTokens = (req, res) => {
  const userId = req.user?.id;

  db.all(
    'SELECT id, name, token, expires_at, last_used, permissions, created_by, createdAt FROM api_tokens WHERE user_id = ? OR created_by = ? ORDER BY createdAt DESC',
    [userId, req.user?.username],
    (err, tokens) => {
      if (err) return res.status(500).json({ error: err.message });

      // Mask tokens for security (show only last 8 characters)
      const maskedTokens = tokens.map(t => ({
        ...t,
        token: `********${t.token.slice(-8)}`,
        permissions: JSON.parse(t.permissions || '[]')
      }));

      res.json(maskedTokens);
    }
  );
};

// Create new API token
const createToken = (req, res) => {
  const { name, expires_at, permissions } = req.body;
  const userId = req.user?.id;
  const username = req.user?.username;

  if (!name) {
    return res.status(400).json({ error: 'Token name is required' });
  }

  const token = generateToken();
  const permissionsStr = JSON.stringify(permissions || []);

  db.run(
    'INSERT INTO api_tokens (name, token, user_id, expires_at, permissions, created_by) VALUES (?, ?, ?, ?, ?, ?)',
    [name, token, userId, expires_at || null, permissionsStr, username],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });

      // Return full token only once during creation
      res.json({
        id: this.lastID,
        name,
        token,
        expires_at,
        permissions,
        message: 'Token created successfully. Store this token securely - it will not be shown again.'
      });
    }
  );
};

// Delete API token
const deleteToken = (req, res) => {
  const { id } = req.params;
  const userId = req.user?.id;

  db.run(
    'DELETE FROM api_tokens WHERE id = ? AND (user_id = ? OR created_by = ?)',
    [id, userId, req.user?.username],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Token not found or access denied' });
      }
      res.json({ success: true, message: 'Token deleted successfully' });
    }
  );
};

// Update token last_used timestamp
const updateTokenUsage = (token) => {
  db.run(
    'UPDATE api_tokens SET last_used = CURRENT_TIMESTAMP WHERE token = ?',
    [token]
  );
};

// Validate API token middleware
const validateApiToken = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Invalid authorization header' });
  }

  const token = authHeader.substring(7);

  db.get(
    'SELECT * FROM api_tokens WHERE token = ?',
    [token],
    (err, tokenData) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!tokenData) return res.status(401).json({ error: 'Invalid token' });

      // Check expiration
      if (tokenData.expires_at && new Date(tokenData.expires_at) < new Date()) {
        return res.status(401).json({ error: 'Token expired' });
      }

      // Update last used
      updateTokenUsage(token);

      // Attach token info to request
      req.apiToken = {
        ...tokenData,
        permissions: JSON.parse(tokenData.permissions || '[]')
      };

      next();
    }
  );
};

module.exports = {
  getTokens,
  createToken,
  deleteToken,
  validateApiToken
};
