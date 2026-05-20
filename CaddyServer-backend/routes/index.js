const express = require('express');
const apiTokens = require('./api-tokens');
const auditLogs = require('./audit-logs');
const snippets = require('./snippets');
const serviceTemplates = require('./service-templates');
const backups = require('./backups');
const analytics = require('./analytics');

const setupRoutes = (app, authMiddleware) => {
  const router = express.Router();

  // Apply auth middleware to all routes
  router.use(authMiddleware);

  // API Tokens routes
  router.get('/api-tokens', apiTokens.getTokens);
  router.post('/api-tokens', auditLogs.auditMiddleware('create_api_token', 'api_token'), apiTokens.createToken);
  router.delete('/api-tokens/:id', auditLogs.auditMiddleware('delete_api_token', 'api_token'), apiTokens.deleteToken);

  // Audit Logs routes
  router.get('/audit-logs', auditLogs.getAuditLogs);
  router.get('/audit-logs/stats', auditLogs.getAuditStats);

  // Snippets routes
  router.get('/snippets', snippets.getSnippets);
  router.get('/snippets/:id', snippets.getSnippet);
  router.post('/snippets', auditLogs.auditMiddleware('create_snippet', 'snippet'), snippets.createSnippet);
  router.put('/snippets/:id', auditLogs.auditMiddleware('update_snippet', 'snippet'), snippets.updateSnippet);
  router.delete('/snippets/:id', auditLogs.auditMiddleware('delete_snippet', 'snippet'), snippets.deleteSnippet);
  router.post('/snippets/:id/use', snippets.incrementUsage);

  // Service Templates routes
  router.get('/service-templates', serviceTemplates.getTemplates);
  router.get('/service-templates/:id', serviceTemplates.getTemplate);
  router.post('/service-templates', auditLogs.auditMiddleware('create_template', 'service_template'), serviceTemplates.createTemplate);
  router.put('/service-templates/:id', auditLogs.auditMiddleware('update_template', 'service_template'), serviceTemplates.updateTemplate);
  router.delete('/service-templates/:id', auditLogs.auditMiddleware('delete_template', 'service_template'), serviceTemplates.deleteTemplate);
  router.post('/service-templates/:id/render', serviceTemplates.renderTemplate);

  // Backup routes
  router.get('/backups', backups.getBackups);
  router.get('/backups/:id', backups.getBackup);
  router.get('/backups/:id/download', backups.downloadBackup);
  router.post('/backups', auditLogs.auditMiddleware('create_backup', 'backup'), backups.createBackup);
  router.post('/backups/:id/restore', auditLogs.auditMiddleware('restore_backup', 'backup'), backups.restoreBackup);
  router.delete('/backups/:id', auditLogs.auditMiddleware('delete_backup', 'backup'), backups.deleteBackup);

  // Analytics routes
  router.get('/analytics/traffic', analytics.getTrafficAnalytics);
  router.get('/analytics/stats', analytics.getTrafficStats);

  // Prometheus metrics endpoint (can be public or authenticated based on requirements)
  app.get('/metrics', analytics.getPrometheusMetrics);

  // Mount all routes under /api/v1
  app.use('/api/v1', router);

  return router;
};

module.exports = {
  setupRoutes,
  auditMiddleware: auditLogs.auditMiddleware,
  validateApiToken: apiTokens.validateApiToken
};
