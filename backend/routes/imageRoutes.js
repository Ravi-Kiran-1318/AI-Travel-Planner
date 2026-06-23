const express = require('express');
const router = express.Router();
const axios = require('axios');

// GET /api/images?destination=XYZ
router.get('/', async (req, res) => {
  try {
    const { destination } = req.query;
    
    if (!destination) {
      return res.status(400).json({ message: 'Destination parameter is required' });
    }

    const cleanDest = destination.split(',')[0].trim();
    
    const response = await axios.get('https://api.pexels.com/v1/search', {
      params: {
        query: `${cleanDest} travel landmarks`,
        per_page: 6,
        orientation: 'landscape',
        size: 'medium'
      },
      headers: {
        Authorization: process.env.PEXELS_API_KEY
      }
    });

    if (response.data && response.data.photos) {
      // Map to just the src strings to keep it simple for the frontend
      const imageUrls = response.data.photos.map(photo => photo.src.large);
      return res.json({ images: imageUrls });
    } else {
      return res.json({ images: [] });
    }

  } catch (error) {
    console.error('Pexels API Error:', error.response?.data || error.message);
    return res.status(500).json({ message: 'Failed to fetch images from Pexels' });
  }
});

module.exports = router;
