const express = require('express');
const db = require('../db');
const { authenticateToken, requireAdmin, optionalAuth } = require('../middleware/auth');

const router = express.Router();

// GET /api/permits - List all permits with optional filters
router.get('/', optionalAuth, async (req, res) => {
    try {
        const { country, status, category, limit = 100, offset = 0 } = req.query;

        let query = 'SELECT * FROM permits WHERE 1=1';
        const params = [];
        let paramIndex = 1;

        if (country) {
            query += ` AND country = $${paramIndex++}`;
            params.push(country);
        }

        if (status) {
            query += ` AND status = $${paramIndex++}`;
            params.push(status);
        }

        if (category) {
            query += ` AND category = $${paramIndex++}`;
            params.push(category);
        }

        query += ` ORDER BY created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex}`;
        params.push(limit, offset);

        const result = await db.query(query, params);

        res.json(result.rows);
    } catch (error) {
        console.error('Get permits error:', error);
        res.status(500).json({ error: 'Failed to fetch permits' });
    }
});

// GET /api/permits/:id - Get single permit
router.get('/:id', async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM permits WHERE id = $1', [req.params.id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Permit not found' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Get permit error:', error);
        res.status(500).json({ error: 'Failed to fetch permit' });
    }
});

// POST /api/permits - Create new permit (requires authentication)
router.post('/', authenticateToken, async (req, res) => {
    const {
        project_title,
        location,
        country,
        activity,
        status = 'pending',
        category,
        capacity,
        species,
        coordinates,
        notes,
    } = req.body;

    if (!project_title || !location || !country || !activity) {
        return res.status(400).json({
            error: 'project_title, location, country, and activity are required',
        });
    }

    try {
        const result = await db.query(
            `INSERT INTO permits (
        project_title, location, country, activity, status, category,
        capacity, species, coordinates, notes, submitted_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *`,
            [
                project_title,
                location,
                country,
                activity,
                status,
                category,
                capacity,
                species,
                coordinates ? JSON.stringify(coordinates) : null,
                notes,
                req.user.id,
            ]
        );

        const newPermit = result.rows[0];

        // Log activity
        await db.query(
            `INSERT INTO activity_log (action, target, country, user_id)
       VALUES ($1, $2, $3, $4)`,
            ['permit_added', project_title, country, req.user.id]
        );

        res.status(201).json(newPermit);
    } catch (error) {
        console.error('Create permit error:', error);
        res.status(500).json({ error: 'Failed to create permit' });
    }
});

// PUT /api/permits/:id - Update permit (admin only)
router.put('/:id', authenticateToken, requireAdmin, async (req, res) => {
    const { id } = req.params;
    const updates = req.body;

    const allowed = [
        'project_title',
        'location',
        'country',
        'activity',
        'status',
        'category',
        'capacity',
        'species',
        'coordinates',
        'notes',
    ];

    const fields = [];
    const values = [];
    let index = 1;

    for (const [key, value] of Object.entries(updates)) {
        if (allowed.includes(key)) {
            fields.push(`${key} = $${index++}`);
            values.push(key === 'coordinates' && value ? JSON.stringify(value) : value);
        }
    }

    if (fields.length === 0) {
        return res.status(400).json({ error: 'No valid fields to update' });
    }

    values.push(id);

    try {
        const result = await db.query(
            `UPDATE permits SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
       WHERE id = $${index}
       RETURNING *`,
            values
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Permit not found' });
        }

        // Log activity
        await db.query(
            `INSERT INTO activity_log (action, target, country, user_id)
       VALUES ($1, $2, $3, $4)`,
            ['permit_updated', result.rows[0].project_title, result.rows[0].country, req.user.id]
        );

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Update permit error:', error);
        res.status(500).json({ error: 'Failed to update permit' });
    }
});

// DELETE /api/permits/:id - Delete permit (admin only)
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const result = await db.query('DELETE FROM permits WHERE id = $1 RETURNING *', [
            req.params.id,
        ]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Permit not found' });
        }

        res.json({ message: 'Permit deleted successfully', permit: result.rows[0] });
    } catch (error) {
        console.error('Delete permit error:', error);
        res.status(500).json({ error: 'Failed to delete permit' });
    }
});

module.exports = router;
