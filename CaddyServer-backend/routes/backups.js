const db = require('../db');
const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');

// Create backup
const createBackup = (req, res) => {
  const { name, description, includes_db, includes_caddyfile, includes_certificates } = req.body;
  const username = req.user?.username || 'system';

  if (!name) {
    return res.status(400).json({ error: 'Backup name is required' });
  }

  const backupData = {
    created_at: new Date().toISOString(),
    version: '2.0.4',
    includes: {
      db: includes_db !== false,
      caddyfile: includes_caddyfile !== false,
      certificates: includes_certificates !== false
    },
    data: {}
  };

  // Backup database tables
  if (backupData.includes.db) {
    const tables = [
      'domains', 'streams', 'settings', 'users', 'logs', 'configs',
      'api_tokens', 'audit_logs', 'snippets', 'service_templates',
      'waf_rules', 'geo_blocks', 'mtls_config', 'location_rules',
      'redirect_rules', 'rewrite_rules', 'access_lists', 'access_list_users',
      'domain_access_lists', 'custom_certificates', 'forward_auth_providers'
    ];

    const promises = tables.map(table => {
      return new Promise((resolve, reject) => {
        db.all(`SELECT * FROM ${table}`, [], (err, rows) => {
          if (err) {
            console.error(`Error backing up table ${table}:`, err);
            resolve({ table, rows: [] }); // Continue even if table doesn't exist
          } else {
            resolve({ table, rows });
          }
        });
      });
    });

    Promise.all(promises)
      .then(results => {
        results.forEach(({ table, rows }) => {
          backupData.data[table] = rows;
        });

        // TODO: Add Caddyfile backup if enabled
        // TODO: Add certificate backup if enabled

        const backupDataStr = JSON.stringify(backupData, null, 2);
        const sizeBytes = Buffer.byteLength(backupDataStr, 'utf8');

        // Store backup in database
        db.run(
          'INSERT INTO backups (name, description, backup_data, size_bytes, includes_db, includes_caddyfile, includes_certificates, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          [name, description, backupDataStr, sizeBytes, includes_db ? 1 : 0, includes_caddyfile ? 1 : 0, includes_certificates ? 1 : 0, username],
          function(err) {
            if (err) return res.status(500).json({ error: err.message });

            res.json({
              id: this.lastID,
              name,
              size_bytes: sizeBytes,
              message: 'Backup created successfully'
            });
          }
        );
      })
      .catch(err => res.status(500).json({ error: err.message }));
  }
};

// Get all backups
const getBackups = (req, res) => {
  db.all(
    'SELECT id, name, description, size_bytes, includes_db, includes_caddyfile, includes_certificates, created_by, createdAt FROM backups ORDER BY createdAt DESC',
    [],
    (err, backups) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(backups);
    }
  );
};

// Get backup by ID
const getBackup = (req, res) => {
  const { id } = req.params;

  db.get('SELECT * FROM backups WHERE id = ?', [id], (err, backup) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!backup) return res.status(404).json({ error: 'Backup not found' });

    res.json(backup);
  });
};

// Download backup
const downloadBackup = (req, res) => {
  const { id } = req.params;

  db.get('SELECT * FROM backups WHERE id = ?', [id], (err, backup) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!backup) return res.status(404).json({ error: 'Backup not found' });

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="backup-${backup.name}-${backup.id}.json"`);
    res.send(backup.backup_data);
  });
};

// Restore backup
const restoreBackup = (req, res) => {
  const { id } = req.params;
  const { tables } = req.body; // Optional: specify which tables to restore

  db.get('SELECT * FROM backups WHERE id = ?', [id], (err, backup) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!backup) return res.status(404).json({ error: 'Backup not found' });

    try {
      const backupData = JSON.parse(backup.backup_data);

      // Restore database tables
      const tablesToRestore = tables || Object.keys(backupData.data);
      const promises = [];

      tablesToRestore.forEach(table => {
        const rows = backupData.data[table];
        if (!rows || rows.length === 0) return;

        // Get table schema
        promises.push(new Promise((resolve, reject) => {
          db.all(`PRAGMA table_info(${table})`, [], (err, columns) => {
            if (err) {
              reject(err);
              return;
            }

            const columnNames = columns.map(c => c.name);
            const placeholders = columnNames.map(() => '?').join(', ');

            // Insert each row
            const insertPromises = rows.map(row => {
              return new Promise((resolveInsert, rejectInsert) => {
                const values = columnNames.map(col => row[col]);
                db.run(
                  `INSERT OR REPLACE INTO ${table} (${columnNames.join(', ')}) VALUES (${placeholders})`,
                  values,
                  (err) => {
                    if (err) rejectInsert(err);
                    else resolveInsert();
                  }
                );
              });
            });

            Promise.all(insertPromises)
              .then(() => resolve({ table, count: rows.length }))
              .catch(reject);
          });
        }));
      });

      Promise.all(promises)
        .then(results => {
          res.json({
            success: true,
            message: 'Backup restored successfully',
            restored: results
          });
        })
        .catch(err => {
          res.status(500).json({ error: `Restore failed: ${err.message}` });
        });

    } catch (err) {
      res.status(500).json({ error: `Invalid backup data: ${err.message}` });
    }
  });
};

// Delete backup
const deleteBackup = (req, res) => {
  const { id } = req.params;

  db.run('DELETE FROM backups WHERE id = ?', [id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Backup not found' });
    }

    res.json({ success: true, message: 'Backup deleted successfully' });
  });
};

module.exports = {
  createBackup,
  getBackups,
  getBackup,
  downloadBackup,
  restoreBackup,
  deleteBackup
};
