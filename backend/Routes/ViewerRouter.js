const express = require('express');
const router = express.Router();

const {
  saveCameraView,
  getUserViews,
  deletePreset
} = require('../Controllers/ViewerController');

// Save new preset
router.post('/save', saveCameraView);

// Fetch user presets
router.get('/views/:user', getUserViews);

// Delete preset by MongoDB _id
router.delete('/delete/:id', deletePreset);

module.exports = router;
