const express = require('express');
const db = require('../db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// GET /api/objections - List user's objections (requires authentication)
router.get('/', authenticateToken, async (req, res) => {
    try {
        const result = await db.query(
            `SELECT
        o.*,
        p.project_title,
        p.location,
        p.country
       FROM objections o
       JOIN permits p ON o.permit_id = p.id
       WHERE o.user_id = $1
       ORDER BY o.created_at DESC`,
            [req.user.id]
        );

        res.json(result.rows);
    } catch (error) {
        console.error('Get objections error:', error);
        res.status(500).json({ error: 'Failed to fetch objections' });
    }
});

// GET /api/objections/:id - Get single objection (requires authentication)
router.get('/:id', authenticateToken, async (req, res) => {
    try {
        const result = await db.query(
            `SELECT
        o.*,
        p.project_title,
        p.location,
        p.country
       FROM objections o
       JOIN permits p ON o.permit_id = p.id
       WHERE o.id = $1 AND o.user_id = $2`,
            [req.params.id, req.user.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Objection not found' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Get objection error:', error);
        res.status(500).json({ error: 'Failed to fetch objection' });
    }
});

// POST /api/objections - Create new objection (requires authentication)
router.post('/', authenticateToken, async (req, res) => {
    const { permit_id, generated_letter, status = 'draft', recipient_email } = req.body;

    if (!permit_id || !generated_letter) {
        return res.status(400).json({
            error: 'permit_id and generated_letter are required',
        });
    }

    try {
        // Verify permit exists
        const permitCheck = await db.query('SELECT id, project_title, country FROM permits WHERE id = $1', [
            permit_id,
        ]);

        if (permitCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Permit not found' });
        }

        const permit = permitCheck.rows[0];

        // Insert objection
        const result = await db.query(
            `INSERT INTO objections (permit_id, user_id, generated_letter, status, recipient_email, sent_at)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
            [
                permit_id,
                req.user.id,
                generated_letter,
                status,
                recipient_email,
                status === 'sent' ? new Date() : null,
            ]
        );

        const objection = result.rows[0];

        // Log activity
        await db.query(
            `INSERT INTO activity_log (action, target, country, user_id)
       VALUES ($1, $2, $3, $4)`,
            [
                status === 'sent' ? 'objection_sent' : 'objection_generated',
                permit.project_title,
                permit.country,
                req.user.id,
            ]
        );

        res.status(201).json(objection);
    } catch (error) {
        console.error('Create objection error:', error);
        res.status(500).json({ error: 'Failed to create objection' });
    }
});

// PUT /api/objections/:id - Update objection status (requires authentication)
router.put('/:id', authenticateToken, async (req, res) => {
    const { status, recipient_email } = req.body;

    if (!status) {
        return res.status(400).json({ error: 'status is required' });
    }

    try {
        const result = await db.query(
            `UPDATE objections
       SET status = $1,
           recipient_email = COALESCE($2, recipient_email),
           sent_at = CASE WHEN $1 = 'sent' AND sent_at IS NULL THEN CURRENT_TIMESTAMP ELSE sent_at END,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $3 AND user_id = $4
       RETURNING *`,
            [status, recipient_email, req.params.id, req.user.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Objection not found' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Update objection error:', error);
        res.status(500).json({ error: 'Failed to update objection' });
    }
});

module.exports = router;
