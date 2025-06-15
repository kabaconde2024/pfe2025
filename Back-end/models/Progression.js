const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const progressionSchema = new Schema({
  formation: { type: Schema.Types.ObjectId, ref: 'Formation', required: true },
  employee: { type: Schema.Types.ObjectId, ref: 'Utilisateur', required: true },
  contenu: { type: Schema.Types.ObjectId, required: true },
  completed: { type: Boolean, default: false },
  completedAt: { type: Date },
}, { timestamps: true });

module.exports = mongoose.model('Progression', progressionSchema);