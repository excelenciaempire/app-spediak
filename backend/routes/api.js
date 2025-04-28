const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/clerkAuth');

const { transcribeAudioController } = require('../controllers/transcriptionController');
const { getInspections, createInspection, deleteInspection } = require('../controllers/inspectionController');
const { generateDdidController } = require('../controllers/ddidController');

router.use(requireAuth);

router.post('/transcribe', transcribeAudioController);
router.get('/inspections', getInspections);
router.post('/inspections', createInspection);
router.delete('/inspections/:id', deleteInspection);
router.post('/generate-ddid', generateDdidController);

module.exports = router;
