const express = require('express');
const router = express.Router();
const tripController = require('../controllers/tripController');
const auth = require('../middleware/auth');

// Public share endpoint - no auth required
router.get('/public/:id', tripController.getPublicTrip);

// Apply auth middleware to all routes in this router
router.use(auth);

// Itinerary operations
router.post('/', tripController.generateNewTrip);
router.get('/', tripController.getUserTrips);
router.get('/:id', tripController.getTripById);
router.put('/:id', tripController.updateTrip);
router.delete('/:id', tripController.deleteTrip);

// Specific day regeneration endpoint
router.post('/:id/regenerate-day', tripController.regenerateDay);

// AI Trip Co-pilot chat endpoint
router.post('/:id/chat', tripController.chatWithCopilot);

module.exports = router;
