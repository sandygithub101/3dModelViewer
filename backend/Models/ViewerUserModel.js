const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ViewerUserSchema = new Schema({
  user: {
    type: String,
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  camera: {
    position: { type: [Number], required: true },
    quaternion: { type: [Number], required: true },
  },
  controlsTarget: {
    type: [Number],
    required: true,
  },
  modelName: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  }
});

const ViewerUserModel = mongoose.model('viewerusers', ViewerUserSchema);
module.exports = ViewerUserModel;
