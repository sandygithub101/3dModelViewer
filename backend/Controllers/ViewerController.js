// Import Models
const ViewerUserModel = require('../Models/ViewerUserModel');
// const Preset = require("../Models/ViewerUserModel");

// -------------------------------
// SAVE CAMERA VIEW
// -------------------------------
const saveCameraView = async (req, res) => {
  try {
    const { user, name, camera, controlsTarget, modelName, createdAt } = req.body;

    const newView = new ViewerUserModel({
      user,
      name,
      camera,
      controlsTarget,
      modelName,
      createdAt: createdAt || new Date(),
    });

    const saved = await newView.save();
    console.log('✅ Saved to MongoDB:', saved);

    res.status(200).json({
      message: 'Camera view saved successfully',
      data: saved
    });

  } catch (err) {
    console.error('❌ Error saving camera view:', err);
    res.status(500).json({ error: 'Server error saving camera view' });
  }
};

// -------------------------------
// GET ALL VIEWS FOR A USER
// -------------------------------
const getUserViews = async (req, res) => {
  try {
    const { user } = req.params;

    const views = await ViewerUserModel.find({ user })
      .sort({ createdAt: -1 });

    res.status(200).json(views);

  } catch (err) {
    console.error('❌ Error fetching views:', err);
    res.status(500).json({ error: 'Error fetching views' });
  }
};

// -------------------------------
// DELETE PRESET FROM MONGODB
// -------------------------------
const deletePreset = async (req, res) => {
  try {
    const { id } = req.params;  // MongoDB _id

    const deleted = await ViewerUserModel.findByIdAndDelete(id);

    if (!deleted) {
      return res.status(404).json({ error: "Preset not found" });
    }

    res.json({
      success: true,
      message: "Preset deleted successfully"
    });

  } catch (err) {
    console.error("❌ Delete error:", err);
    res.status(500).json({ error: "Server error deleting preset" });
  }
};

// -------------------------------
// EXPORT ALL CONTROLLERS CORRECTLY
// -------------------------------
module.exports = {
  saveCameraView,
  getUserViews,
  deletePreset
};
