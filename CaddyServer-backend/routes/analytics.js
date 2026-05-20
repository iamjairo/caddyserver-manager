const db = require('../db');

// Record traffic analytics
const recordTraffic = (data) => {
  db.run(
    `INSERT INTO traffic_analytics (domain_id, host, path, method, status_code, response_time_ms, bytes_sent, bytes_received, user_agent, ip_address, country_code, referer, protocol)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      data.domain_id,
      data.host,
      data.path,
      data.method,
      data.status_code,
      data.response_time_ms,
      data.bytes_sent,
      data.bytes_received,
      data.user_agent,
      data.ip_address,
      data.country_code,
      data.referer,
      data.protocol
    ]
  );
};

// Get traffic analytics with filtering
const getTrafficAnalytics = (req, res) => {
  const { domain_id, start_date, end_date, limit = 100, offset = 0 } = req.query;

  let query = 'SELECT * FROM traffic_analytics WHERE 1=1';
  const params = [];

  if (domain_id) {
    query += ' AND domain_id = ?';
    params.push(domain_id);
  }

  if (start_date) {
    query += ' AND timestamp >= ?';
    params.push(start_date);
  }

  if (end_date) {
    query += ' AND timestamp <= ?';
    params.push(end_date);
  }

  query += ' ORDER BY timestamp DESC LIMIT ? OFFSET ?';
  params.push(parseInt(limit), parseInt(offset));

  db.all(query, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
};

// Get traffic statistics
const getTrafficStats = (req, res) => {
  const { domain_id, hours = 24 } = req.query;

  const queries = {
    // Total requests
    total_requests: `SELECT COUNT(*) as count FROM traffic_analytics
                     WHERE timestamp >= datetime('now', '-${hours} hours')
                     ${domain_id ? 'AND domain_id = ?' : ''}`,

    // Requests by status code
    by_status: `SELECT status_code, COUNT(*) as count FROM traffic_analytics
                WHERE timestamp >= datetime('now', '-${hours} hours')
                ${domain_id ? 'AND domain_id = ?' : ''}
                GROUP BY status_code ORDER BY count DESC`,

    // Requests by method
    by_method: `SELECT method, COUNT(*) as count FROM traffic_analytics
                WHERE timestamp >= datetime('now', '-${hours} hours')
                ${domain_id ? 'AND domain_id = ?' : ''}
                GROUP BY method ORDER BY count DESC`,

    // Top paths
    top_paths: `SELECT path, COUNT(*) as count FROM traffic_analytics
                WHERE timestamp >= datetime('now', '-${hours} hours')
                ${domain_id ? 'AND domain_id = ?' : ''}
                GROUP BY path ORDER BY count DESC LIMIT 10`,

    // Top countries
    top_countries: `SELECT country_code, COUNT(*) as count FROM traffic_analytics
                    WHERE timestamp >= datetime('now', '-${hours} hours')
                    AND country_code IS NOT NULL
                    ${domain_id ? 'AND domain_id = ?' : ''}
                    GROUP BY country_code ORDER BY count DESC LIMIT 10`,

    // Average response time
    avg_response_time: `SELECT AVG(response_time_ms) as avg_ms FROM traffic_analytics
                        WHERE timestamp >= datetime('now', '-${hours} hours')
                        ${domain_id ? 'AND domain_id = ?' : ''}`,

    // Hourly timeline
    timeline: `SELECT strftime('%Y-%m-%d %H:00:00', timestamp) as hour, COUNT(*) as count
               FROM traffic_analytics
               WHERE timestamp >= datetime('now', '-${hours} hours')
               ${domain_id ? 'AND domain_id = ?' : ''}
               GROUP BY hour ORDER BY hour ASC`
  };

  const params = domain_id ? [domain_id] : [];
  const promises = Object.entries(queries).map(([key, query]) => {
    return new Promise((resolve, reject) => {
      if (key === 'avg_response_time' || key === 'total_requests') {
        db.get(query, params, (err, row) => {
          if (err) reject(err);
          else resolve([key, row]);
        });
      } else {
        db.all(query, params, (err, rows) => {
          if (err) reject(err);
          else resolve([key, rows]);
        });
      }
    });
  });

  Promise.all(promises)
    .then(results => {
      const stats = Object.fromEntries(results);
      res.json(stats);
    })
    .catch(err => res.status(500).json({ error: err.message }));
};

// Clean old analytics data (retention)
const cleanOldAnalytics = (days = 90) => {
  db.run(
    `DELETE FROM traffic_analytics WHERE timestamp < datetime('now', '-${days} days')`,
    (err) => {
      if (err) console.error('Failed to clean old analytics:', err);
      else console.log(`Cleaned analytics older than ${days} days`);
    }
  );
};

// Prometheus metrics export
const getPrometheusMetrics = (req, res) => {
  const queries = [
    // HTTP requests total
    `SELECT status_code, COUNT(*) as count FROM traffic_analytics
     WHERE timestamp >= datetime('now', '-1 hour')
     GROUP BY status_code`,

    // Response time histogram
    `SELECT
       SUM(CASE WHEN response_time_ms < 100 THEN 1 ELSE 0 END) as lt_100ms,
       SUM(CASE WHEN response_time_ms >= 100 AND response_time_ms < 500 THEN 1 ELSE 0 END) as lt_500ms,
       SUM(CASE WHEN response_time_ms >= 500 AND response_time_ms < 1000 THEN 1 ELSE 0 END) as lt_1s,
       SUM(CASE WHEN response_time_ms >= 1000 THEN 1 ELSE 0 END) as gt_1s
     FROM traffic_analytics
     WHERE timestamp >= datetime('now', '-1 hour')`,

    // Bytes transferred
    `SELECT SUM(bytes_sent) as total_sent, SUM(bytes_received) as total_received
     FROM traffic_analytics
     WHERE timestamp >= datetime('now', '-1 hour')`
  ];

  Promise.all(queries.map(query => {
    return new Promise((resolve, reject) => {
      if (query.includes('GROUP BY')) {
        db.all(query, [], (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        });
      } else {
        db.get(query, [], (err, row) => {
          if (err) reject(err);
          else resolve(row);
        });
      }
    });
  }))
  .then(([statusCodes, responseTimes, bytes]) => {
    let metrics = '# HELP http_requests_total Total HTTP requests by status code\n';
    metrics += '# TYPE http_requests_total counter\n';

    statusCodes.forEach(({ status_code, count }) => {
      metrics += `http_requests_total{status="${status_code}"} ${count}\n`;
    });

    metrics += '\n# HELP http_response_time_bucket Response time distribution\n';
    metrics += '# TYPE http_response_time_bucket histogram\n';
    metrics += `http_response_time_bucket{le="0.1"} ${responseTimes.lt_100ms || 0}\n`;
    metrics += `http_response_time_bucket{le="0.5"} ${responseTimes.lt_500ms || 0}\n`;
    metrics += `http_response_time_bucket{le="1.0"} ${responseTimes.lt_1s || 0}\n`;
    metrics += `http_response_time_bucket{le="+Inf"} ${responseTimes.gt_1s || 0}\n`;

    metrics += '\n# HELP http_bytes_sent_total Total bytes sent\n';
    metrics += '# TYPE http_bytes_sent_total counter\n';
    metrics += `http_bytes_sent_total ${bytes.total_sent || 0}\n`;

    metrics += '\n# HELP http_bytes_received_total Total bytes received\n';
    metrics += '# TYPE http_bytes_received_total counter\n';
    metrics += `http_bytes_received_total ${bytes.total_received || 0}\n`;

    res.set('Content-Type', 'text/plain');
    res.send(metrics);
  })
  .catch(err => res.status(500).json({ error: err.message }));
};

module.exports = {
  recordTraffic,
  getTrafficAnalytics,
  getTrafficStats,
  cleanOldAnalytics,
  getPrometheusMetrics
};
