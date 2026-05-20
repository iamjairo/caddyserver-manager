const db = require('../db');

// Middleware to log all actions
const auditMiddleware = (action, resourceType = null) => {
  return (req, res, next) => {
    const originalJson = res.json.bind(res);

    res.json = function(data) {
      // Log after successful operation
      if (res.statusCode >= 200 && res.statusCode < 300) {
        logAudit({
          user: req.user?.username || req.apiToken?.created_by || 'system',
          action,
          resource_type: resourceType,
          resource_id: data?.id || req.params?.id || null,
          ip_address: req.ip || req.connection.remoteAddress,
          user_agent: req.headers['user-agent'],
          details: JSON.stringify({
            method: req.method,
            path: req.path,
            body: sanitizeBody(req.body)
          }),
          severity: getSeverity(action)
        });
      }

      return originalJson(data);
    };

    next();
  };
};

// Log audit entry
const logAudit = (entry) => {
  db.run(
    `INSERT INTO audit_logs (user, action, resource_type, resource_id, ip_address, user_agent, details, severity)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      entry.user,
      entry.action,
      entry.resource_type,
      entry.resource_id,
      entry.ip_address,
      entry.user_agent,
      entry.details,
      entry.severity
    ]
  );
};

// Sanitize sensitive data from request body
const sanitizeBody = (body) => {
  if (!body) return {};

  const sanitized = { ...body };
  const sensitiveFields = ['password', 'passwordHash', 'token', 'secret', 'private_key', 'api_key'];

  sensitiveFields.forEach(field => {
    if (sanitized[field]) {
      sanitized[field] = '***REDACTED***';
    }
  });

  return sanitized;
};

// Determine severity based on action
const getSeverity = (action) => {
  const highSeverity = ['delete', 'revoke', 'disable', 'block'];
  const mediumSeverity = ['create', 'update', 'modify'];

  const actionLower = action.toLowerCase();

  if (highSeverity.some(s => actionLower.includes(s))) return 'high';
  if (mediumSeverity.some(s => actionLower.includes(s))) return 'medium';
  return 'info';
};

// Get audit logs with pagination and filtering
const getAuditLogs = (req, res) => {
  const { page = 1, limit = 50, user, action, resource_type, severity } = req.query;
  const offset = (page - 1) * limit;

  let query = 'SELECT * FROM audit_logs WHERE 1=1';
  const params = [];

  if (user) {
    query += ' AND user = ?';
    params.push(user);
  }

  if (action) {
    query += ' AND action LIKE ?';
    params.push(`%${action}%`);
  }

  if (resource_type) {
    query += ' AND resource_type = ?';
    params.push(resource_type);
  }

  if (severity) {
    query += ' AND severity = ?';
    params.push(severity);
  }

  query += ' ORDER BY timestamp DESC LIMIT ? OFFSET ?';
  params.push(parseInt(limit), offset);

  db.all(query, params, (err, logs) => {
    if (err) return res.status(500).json({ error: err.message });

    // Get total count
    let countQuery = 'SELECT COUNT(*) as total FROM audit_logs WHERE 1=1';
    const countParams = [];

    if (user) {
      countQuery += ' AND user = ?';
      countParams.push(user);
    }
    if (action) {
      countQuery += ' AND action LIKE ?';
      countParams.push(`%${action}%`);
    }
    if (resource_type) {
      countQuery += ' AND resource_type = ?';
      countParams.push(resource_type);
    }
    if (severity) {
      countQuery += ' AND severity = ?';
      countParams.push(severity);
    }

    db.get(countQuery, countParams, (err, countResult) => {
      if (err) return res.status(500).json({ error: err.message });

      res.json({
        logs: logs.map(log => ({
          ...log,
          details: JSON.parse(log.details || '{}')
        })),
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: countResult.total,
          pages: Math.ceil(countResult.total / limit)
        }
      });
    });
  });
};

// Get audit statistics
const getAuditStats = (req, res) => {
  const { days = 7 } = req.query;

  const queries = [
    // Actions by user
    `SELECT user, COUNT(*) as count FROM audit_logs
     WHERE timestamp >= datetime('now', '-${days} days')
     GROUP BY user ORDER BY count DESC LIMIT 10`,

    // Actions by type
    `SELECT action, COUNT(*) as count FROM audit_logs
     WHERE timestamp >= datetime('now', '-${days} days')
     GROUP BY action ORDER BY count DESC LIMIT 10`,

    // Severity distribution
    `SELECT severity, COUNT(*) as count FROM audit_logs
     WHERE timestamp >= datetime('now', '-${days} days')
     GROUP BY severity`,

    // Activity timeline
    `SELECT date(timestamp) as date, COUNT(*) as count FROM audit_logs
     WHERE timestamp >= datetime('now', '-${days} days')
     GROUP BY date ORDER BY date ASC`
  ];

  Promise.all(queries.map(query => {
    return new Promise((resolve, reject) => {
      db.all(query, [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }))
  .then(([byUser, byAction, bySeverity, timeline]) => {
    res.json({
      by_user: byUser,
      by_action: byAction,
      by_severity: bySeverity,
      timeline
    });
  })
  .catch(err => res.status(500).json({ error: err.message }));
};

module.exports = {
  auditMiddleware,
  logAudit,
  getAuditLogs,
  getAuditStats
};
