const db = require('../db');

// Get all snippets
const getSnippets = (req, res) => {
  const { category, search } = req.query;

  let query = 'SELECT * FROM snippets WHERE 1=1';
  const params = [];

  if (category) {
    query += ' AND category = ?';
    params.push(category);
  }

  if (search) {
    query += ' AND (name LIKE ? OR description LIKE ? OR content LIKE ?)';
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }

  query += ' ORDER BY name ASC';

  db.all(query, params, (err, snippets) => {
    if (err) return res.status(500).json({ error: err.message });

    res.json(snippets.map(s => ({
      ...s,
      tags: JSON.parse(s.tags || '[]')
    })));
  });
};

// Get snippet by ID
const getSnippet = (req, res) => {
  const { id } = req.params;

  db.get('SELECT * FROM snippets WHERE id = ?', [id], (err, snippet) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!snippet) return res.status(404).json({ error: 'Snippet not found' });

    res.json({
      ...snippet,
      tags: JSON.parse(snippet.tags || '[]')
    });
  });
};

// Create new snippet
const createSnippet = (req, res) => {
  const { name, description, category, content, tags } = req.body;

  if (!name || !content) {
    return res.status(400).json({ error: 'Name and content are required' });
  }

  const tagsStr = JSON.stringify(tags || []);

  db.run(
    'INSERT INTO snippets (name, description, category, content, tags) VALUES (?, ?, ?, ?, ?)',
    [name, description, category || 'general', content, tagsStr],
    function(err) {
      if (err) {
        if (err.message.includes('UNIQUE')) {
          return res.status(409).json({ error: 'Snippet name already exists' });
        }
        return res.status(500).json({ error: err.message });
      }

      res.json({
        id: this.lastID,
        name,
        description,
        category,
        content,
        tags,
        message: 'Snippet created successfully'
      });
    }
  );
};

// Update snippet
const updateSnippet = (req, res) => {
  const { id } = req.params;
  const { name, description, category, content, tags } = req.body;

  const tagsStr = JSON.stringify(tags || []);

  db.run(
    'UPDATE snippets SET name = ?, description = ?, category = ?, content = ?, tags = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?',
    [name, description, category, content, tagsStr, id],
    function(err) {
      if (err) {
        if (err.message.includes('UNIQUE')) {
          return res.status(409).json({ error: 'Snippet name already exists' });
        }
        return res.status(500).json({ error: err.message });
      }

      if (this.changes === 0) {
        return res.status(404).json({ error: 'Snippet not found' });
      }

      res.json({ success: true, message: 'Snippet updated successfully' });
    }
  );
};

// Delete snippet
const deleteSnippet = (req, res) => {
  const { id } = req.params;

  db.run('DELETE FROM snippets WHERE id = ?', [id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Snippet not found' });
    }

    res.json({ success: true, message: 'Snippet deleted successfully' });
  });
};

// Increment snippet usage
const incrementUsage = (req, res) => {
  const { id } = req.params;

  db.run(
    'UPDATE snippets SET usage_count = usage_count + 1 WHERE id = ?',
    [id],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true });
    }
  );
};

module.exports = {
  getSnippets,
  getSnippet,
  createSnippet,
  updateSnippet,
  deleteSnippet,
  incrementUsage
};
