const db = require('../db');

// Get all service templates
const getTemplates = (req, res) => {
  const { category, search } = req.query;

  let query = 'SELECT * FROM service_templates WHERE 1=1';
  const params = [];

  if (category) {
    query += ' AND category = ?';
    params.push(category);
  }

  if (search) {
    query += ' AND (name LIKE ? OR description LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }

  query += ' ORDER BY name ASC';

  db.all(query, params, (err, templates) => {
    if (err) return res.status(500).json({ error: err.message });

    res.json(templates.map(t => ({
      ...t,
      variables: JSON.parse(t.variables || '[]'),
      tags: JSON.parse(t.tags || '[]')
    })));
  });
};

// Get template by ID
const getTemplate = (req, res) => {
  const { id } = req.params;

  db.get('SELECT * FROM service_templates WHERE id = ?', [id], (err, template) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!template) return res.status(404).json({ error: 'Template not found' });

    res.json({
      ...template,
      variables: JSON.parse(template.variables || '[]'),
      tags: JSON.parse(template.tags || '[]')
    });
  });
};

// Create new template
const createTemplate = (req, res) => {
  const { name, description, category, icon, config_template, variables, tags } = req.body;

  if (!name || !config_template) {
    return res.status(400).json({ error: 'Name and config_template are required' });
  }

  const variablesStr = JSON.stringify(variables || []);
  const tagsStr = JSON.stringify(tags || []);

  db.run(
    'INSERT INTO service_templates (name, description, category, icon, config_template, variables, tags, is_builtin) VALUES (?, ?, ?, ?, ?, ?, ?, 0)',
    [name, description, category || 'general', icon, config_template, variablesStr, tagsStr],
    function(err) {
      if (err) {
        if (err.message.includes('UNIQUE')) {
          return res.status(409).json({ error: 'Template name already exists' });
        }
        return res.status(500).json({ error: err.message });
      }

      res.json({
        id: this.lastID,
        name,
        description,
        category,
        icon,
        config_template,
        variables,
        tags,
        message: 'Template created successfully'
      });
    }
  );
};

// Update template
const updateTemplate = (req, res) => {
  const { id } = req.params;
  const { name, description, category, icon, config_template, variables, tags } = req.body;

  // Check if it's a built-in template
  db.get('SELECT is_builtin FROM service_templates WHERE id = ?', [id], (err, template) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!template) return res.status(404).json({ error: 'Template not found' });
    if (template.is_builtin) {
      return res.status(403).json({ error: 'Cannot modify built-in templates' });
    }

    const variablesStr = JSON.stringify(variables || []);
    const tagsStr = JSON.stringify(tags || []);

    db.run(
      'UPDATE service_templates SET name = ?, description = ?, category = ?, icon = ?, config_template = ?, variables = ?, tags = ? WHERE id = ?',
      [name, description, category, icon, config_template, variablesStr, tagsStr, id],
      function(err) {
        if (err) {
          if (err.message.includes('UNIQUE')) {
            return res.status(409).json({ error: 'Template name already exists' });
          }
          return res.status(500).json({ error: err.message });
        }

        res.json({ success: true, message: 'Template updated successfully' });
      }
    );
  });
};

// Delete template
const deleteTemplate = (req, res) => {
  const { id } = req.params;

  // Check if it's a built-in template
  db.get('SELECT is_builtin FROM service_templates WHERE id = ?', [id], (err, template) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!template) return res.status(404).json({ error: 'Template not found' });
    if (template.is_builtin) {
      return res.status(403).json({ error: 'Cannot delete built-in templates' });
    }

    db.run('DELETE FROM service_templates WHERE id = ?', [id], function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true, message: 'Template deleted successfully' });
    });
  });
};

// Render template with variables
const renderTemplate = (req, res) => {
  const { id } = req.params;
  const variables = req.body;

  db.get('SELECT * FROM service_templates WHERE id = ?', [id], (err, template) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!template) return res.status(404).json({ error: 'Template not found' });

    let rendered = template.config_template;

    // Replace variables in template
    Object.keys(variables).forEach(key => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      rendered = rendered.replace(regex, variables[key]);
    });

    res.json({
      rendered,
      missing_variables: findMissingVariables(rendered)
    });
  });
};

// Find missing variables in rendered template
const findMissingVariables = (content) => {
  const regex = /{{(\w+)}}/g;
  const missing = [];
  let match;

  while ((match = regex.exec(content)) !== null) {
    if (!missing.includes(match[1])) {
      missing.push(match[1]);
    }
  }

  return missing;
};

module.exports = {
  getTemplates,
  getTemplate,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  renderTemplate
};
