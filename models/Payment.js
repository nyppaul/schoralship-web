const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, lowercase: true },
    scholarshipTitle: { type: String, default: 'Scholarship Access' },
    scholarshipId: { type: String },
    stripePaymentIntentId: { type: String, unique: true },
    amount: { type: Number, required: true }, // in cents
    currency: { type: String, default: 'usd' },
    status: {
      type: String,
      enum: ['pending', 'succeeded', 'failed', 'canceled'],
      default: 'pending'
    },
    accessToken: { type: String, unique: true, sparse: true }, // unique token for verification
    accessGranted: { type: Boolean, default: false },
    accessGrantedAt: { type: Date },
    emailSent: { type: Boolean, default: false },
    emailSentAt: { type: Date },
    expiresAt: { type: Date }, // access link expiration (optional: 30 days from succeeded)
    metadata: { type: Object, default: {} }
  },
  { timestamps: true }
);

// Auto-generate access token before saving if needed
paymentSchema.pre('save', async function (next) {
  if (!this.accessToken && this.status === 'succeeded') {
    // Generate unique token (base64 encoded random bytes)
    const crypto = require('crypto');
    this.accessToken = crypto.randomBytes(24).toString('hex');
    // Set expiration to 30 days from now
    if (!this.expiresAt) {
      this.expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    }
  }
  next();
});

module.exports = mongoose.model('Payment', paymentSchema);
