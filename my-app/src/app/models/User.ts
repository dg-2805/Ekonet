import { Schema, model, models } from 'mongoose';

const UserSchema = new Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  role: { type: String, enum: ['reporter', 'ngo'], required: true },

  // For NGOs only
  orgName: { type: String },
  description: { type: String },
  location: { type: String },
  locationCoords: {
    lat: { type: Number },
    lng: { type: Number }
  },
  license: { type: String }, // or licenseFileUrl if uploading

  createdAt: { type: Date, default: Date.now },
  }, {
  collection: 'users'
});

export default models.User || model('User', UserSchema);
