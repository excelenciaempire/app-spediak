const { Pool } = require('pg');
const pool = new Pool({ /* ... connection options ... */ });

// Controller to log statement edits for training/review
const logStatementEditController = async (req, res) => {
    const { originalDdid, editedDdid, inspectionId } = req.body;
    const userId = req.auth.userId;

    if (!originalDdid || !editedDdid || !inspectionId || !userId) {
        return res.status(400).json({ message: 'Missing required fields for logging edit.' });
    }

    console.log(`[logStatementEdit] User ${userId} logged edit for inspection ${inspectionId}`);

    try {
        const insertQuery = `
            INSERT INTO statement_edits 
            (inspection_id, user_id, original_statement, edited_statement)
            VALUES ($1, $2, $3, $4)
            RETURNING id
        `;
        const values = [inspectionId, userId, originalDdid, editedDdid];
        const result = await pool.query(insertQuery, values);
        console.log(`[logStatementEdit] Logged edit with ID: ${result.rows[0].id}`);

        res.status(201).json({ message: 'Edit logged successfully.' });

    } catch (error) {
        console.error(`[logStatementEdit] Error logging statement edit for inspection ${inspectionId}:`, error);
        // Don't block the user flow if logging fails, just report
        res.status(500).json({ message: error.message || 'Failed to log statement edit.' });
    }
};

module.exports = logStatementEditController; 