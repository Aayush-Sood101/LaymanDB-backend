const mongoose = require('mongoose');

// Session Model to track user design sessions
const SessionSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String },
  prompt: { type: String },
  schemas: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Schema' 
  }],
  activeSchemaId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Schema' 
  },
  history: [{
    version: { type: Number },
    schemaId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'Schema' 
    },
    timestamp: { type: Date, default: Date.now },
    comment: { type: String }
  }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const Session = mongoose.model('Session', SessionSchema);

module.exports = Session;
