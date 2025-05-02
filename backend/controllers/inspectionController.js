const { Pool } = require('pg');

// Configurar el pool de conexiones usando la variable de entorno
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false // Necesario para algunas conexiones remotas como Neon/Heroku, ajusta según necesidad
  }
});

// Controlador de inspecciones (usaremos una lista temporal como simulación de base de datos)

let inspections = []; // Aquí se guardarán temporalmente

const getInspections = async (req, res) => {
  const userId = req.auth.userId; // Obtener userId del middleware
  if (!userId) { // Doble chequeo por si acaso
    return res.status(401).json({ message: 'Not authorized' });
  }
  try {
    // Filtrar por user_id
    const result = await pool.query('SELECT * FROM inspections WHERE user_id = $1 ORDER BY created_at DESC', [userId]);
    // const result = await pool.query('SELECT * FROM inspections ORDER BY created_at DESC'); // Temporal: Obtiene todas
    return res.json(result.rows);
  } catch (err) {
    console.error('Error fetching inspections:', err);
    return res.status(500).json({ message: 'Error fetching inspections' });
  }
};

const createInspection = async (req, res) => {
  const userId = req.auth.userId;
  // Remove attempts to get name/email from auth context
  // const userName = req.auth.userName || null;
  // const userEmail = req.auth.userEmail || null;

  if (!userId) {
     return res.status(401).json({ message: 'Not authorized' });
  }

  // Get userState from payload if needed, or ignore it
  const { description, ddid, imageUrl /*, userState */ } = req.body;

  if (!description) {
    return res.status(400).json({ message: 'Missing description' });
  }

  try {
    // Remove user_name, user_email from INSERT
    const result = await pool.query(
      'INSERT INTO inspections (user_id, description, ddid, image_url) VALUES ($1, $2, $3, $4) RETURNING *', // Removed user_name, user_email columns
      [userId, description, ddid, imageUrl] // Removed userName, userEmail parameters
      // If saving state: 'INSERT INTO inspections (..., state) VALUES (..., $5) RETURNING *',
      // If saving state: [..., userState] 
    );
    return res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating inspection:', err);
    return res.status(500).json({ message: 'Error creating inspection' });
  }
};

const deleteInspection = async (req, res) => {
  const userId = req.auth.userId; // Obtener userId del middleware
  if (!userId) {
    return res.status(401).json({ message: 'Not authorized' });
  }
  // const userId = 'temp_user_id'; // Temporal

  const { id } = req.params;
  try {
    // Verificar si la inspección pertenece al usuario antes de borrar
    // Usamos RETURNING para obtener el id borrado y WHERE para filtrar por usuario
    const result = await pool.query('DELETE FROM inspections WHERE id = $1 AND user_id = $2 RETURNING id', [id, userId]);

    if (result.rowCount === 0) {
       // Si no se borró nada, puede ser porque no existe O no pertenece al usuario
      return res.status(404).json({ message: 'Inspection not found or not authorized' });
    }

    // const result = await pool.query('DELETE FROM inspections WHERE id = $1 RETURNING id', [id]); // Añadido RETURNING para verificar si se borró algo

    // if (result.rowCount === 0) {
    //   return res.status(404).json({ message: 'Inspection not found' });
    // }

    return res.json({ message: 'Deleted successfully' });
  } catch (err) {
    console.error('Error deleting inspection:', err);
    return res.status(500).json({ message: 'Error deleting inspection' });
  }
};

// Controller to update the DDID statement of an existing inspection
const updateInspectionController = async (req, res) => {
  const { id } = req.params; // Get inspection ID from route parameter
  const { ddid } = req.body; // Get the edited DDID from request body
  const userId = req.auth.userId; // Get authenticated user ID

  if (!ddid) {
    return res.status(400).json({ message: 'Missing DDID statement in request body.' });
  }
  if (!id) {
     return res.status(400).json({ message: 'Missing inspection ID in request path.' });
  }

  console.log(`[updateInspectionController] User ${userId} attempting to update DDID for inspection ${id}`);

  try {
    // First, verify the user owns this inspection
    const checkOwnerQuery = 'SELECT user_id FROM inspections WHERE id = $1';
    const ownerResult = await pool.query(checkOwnerQuery, [id]);

    if (ownerResult.rows.length === 0) {
        return res.status(404).json({ message: 'Inspection not found.' });
    }

    const ownerId = ownerResult.rows[0].user_id;
    // TODO: Allow Admins to edit? If so, add admin check here.
    if (ownerId !== userId) {
        console.warn(`[updateInspectionController] User ${userId} does not own inspection ${id}. Owner: ${ownerId}`);
        return res.status(403).json({ message: 'Forbidden: You do not own this inspection.' });
    }

    // Proceed with update
    const updateQuery = 'UPDATE inspections SET ddid = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING id';
    const values = [ddid, id];
    const updateResult = await pool.query(updateQuery, values);

    if (updateResult.rowCount === 0) {
         // This shouldn't happen if the owner check passed, but good practice
         return res.status(404).json({ message: 'Inspection not found during update attempt.' });
    }

    console.log(`[updateInspectionController] Successfully updated DDID for inspection ${id}`);
    res.status(200).json({ message: 'Inspection statement updated successfully.', inspectionId: id });

  } catch (error) {
    console.error(`[updateInspectionController] Error updating inspection ${id}:`, error);
    res.status(500).json({ message: error.message || 'Failed to update inspection.' });
  }
};

module.exports = {
  getInspections,
  createInspection,
  deleteInspection,
  updateInspectionController,
};
