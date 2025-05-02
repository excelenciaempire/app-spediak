const express = require('express');
const router = express.Router();
const { requireAuth, isAdmin } = require('../middleware/authMiddleware');
const { requireAdmin } = require('../middleware/adminAuth');

// const { transcribeAudioController } = require('../controllers/transcriptionController'); // Old import
const transcribeAudioController = require('../controllers/transcriptionController'); // New import style
const { getInspections, createInspection, deleteInspection, /* saveInspectionController, getInspectionsController, */ updateInspectionController } = require('../controllers/inspectionController');
const { generateDdidController, analyzeDefectController } = require('../controllers/ddidController');
const { uploadImageController } = require('../controllers/uploadController');
const { logStatementEditController } = require('../controllers/loggingController');
const { getAllInspectionsWithUserDetails, getAllUsers, uploadLogo } = require('../controllers/adminController');

router.use(requireAuth);

// --- Admin Routes ---
router.get('/admin/all-inspections', requireAuth, isAdmin, getAllInspectionsWithUserDetails);
router.get('/admin/all-users', requireAuth, isAdmin, getAllUsers);
router.post('/admin/upload-logo', requireAuth, isAdmin, uploadLogo);

// --- Regular User Routes ---
router.post('/upload-image', uploadImageController);
router.post('/transcribe', transcribeAudioController);
router.get('/inspections', getInspections);
router.delete('/inspections/:id', deleteInspection);
router.put('/inspections/:id', updateInspectionController);

// Defect Analysis & DDID Generation
router.post('/analyze-defect', analyzeDefectController);
router.post('/generate-ddid', generateDdidController);

// Logging Edits for Training
router.post('/log-statement-edit', logStatementEditController);

module.exports = router;
