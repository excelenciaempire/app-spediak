const express = require('express');
const router = express.Router();
const { requireAuth, isAdmin } = require('../middleware/authMiddleware');
const { requireAdmin } = require('../middleware/adminAuth');

// const { transcribeAudioController } = require('../controllers/transcriptionController'); // Old import
const transcribeAudioController = require('../controllers/transcriptionController'); // New import style
const { getInspections, createInspection, deleteInspection, /* saveInspectionController, getInspectionsController, */ updateInspectionController } = require('../controllers/inspectionController');
const ddidController = require('../controllers/ddidController'); // Changed import style
// const { uploadImageController } = require('../controllers/uploadController'); // Old import
const uploadImageController = require('../controllers/uploadController'); // New import style
const logStatementEditController = require('../controllers/loggingController'); // Changed import style
const adminController = require('../controllers/adminController'); // Changed import style

router.use(requireAuth);

// --- Admin Routes ---
router.get('/admin/all-inspections', requireAuth, isAdmin, adminController.getAllInspectionsWithUserDetails);
router.get('/admin/all-users', requireAuth, isAdmin, adminController.getAllUsers);
router.post('/admin/upload-logo', requireAuth, isAdmin, adminController.uploadLogo);

// --- Regular User Routes ---
router.post('/upload-image', uploadImageController);
router.post('/transcribe', transcribeAudioController);
router.get('/inspections', getInspections);
router.delete('/inspections/:id', deleteInspection);
router.put('/inspections/:id', updateInspectionController);

// Defect Analysis & DDID Generation
router.post('/analyze-defect', ddidController.analyzeDefectController);
router.post('/generate-ddid', ddidController.generateDdidController);

// Logging Edits for Training
router.post('/log-statement-edit', logStatementEditController);

module.exports = router;
