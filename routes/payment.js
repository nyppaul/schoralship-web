const express = require('express');
const Stripe = require('stripe');
const Payment = require('../models/Payment');
const { sendScholarshipLinkEmail } = require('../services/emailService');

const router = express.Router();

const stripeSecret = process.env.STRIPE_SECRET_KEY;
if (!stripeSecret) console.warn('STRIPE_SECRET_KEY not set — payment endpoints will fail without it');
const stripe = stripeSecret ? Stripe(stripeSecret) : null;

// POST /api/payment/create-intent
// Creates a Stripe PaymentIntent (not Checkout Session)
// Frontend will handle payment with Stripe.js or Payment Element
router.post('/payment/create-intent', async (req, res) => {
  if (!stripe) return res.status(500).json({ error: 'Stripe not configured' });

  try {
    const { email, scholarshipTitle, scholarshipId, scholarshipUrl } = req.body;
    if (!email) return res.status(400).json({ error: 'Email required' });

    const amount = 150; // 150 cents = $1.50 USD (1500 RWF)

    // Create PaymentIntent
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: 'usd',
      payment_method_types: ['card'],
      metadata: {
        email,
        scholarshipTitle: scholarshipTitle || 'Scholarship Access',
        scholarshipId: scholarshipId || 'unknown',
        scholarshipUrl: scholarshipUrl || ''
      }
    });

    // Save payment record in DB (status: pending)
    const payment = new Payment({
      email: email.toLowerCase(),
      scholarshipTitle: scholarshipTitle || 'Scholarship Access',
      scholarshipId: scholarshipId || null,
      stripePaymentIntentId: paymentIntent.id,
      amount,
      status: 'pending',
      metadata: {
        scholarshipUrl: scholarshipUrl || ''
      }
    });
    await payment.save();

    return res.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id
    });
  } catch (err) {
    console.error('create-intent error:', err);
    return res.status(500).json({ error: 'Failed to create payment intent' });
  }
});

// POST /api/payment/webhook
// Stripe webhook for payment_intent.succeeded
// This fires when Stripe confirms the payment is successful
router.post('/payment/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  if (!stripe) return res.status(500).json({ error: 'Stripe not configured' });

  try {
    const sig = req.headers['stripe-signature'];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!webhookSecret) {
      console.warn('STRIPE_WEBHOOK_SECRET not set. Webhook signature verification disabled.');
      // For development, allow webhook without signature verification
      const event = JSON.parse(req.body.toString());
      await handleWebhookEvent(event);
      return res.json({ received: true });
    }

    // Verify webhook signature
    const event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);

    // Handle event
    await handleWebhookEvent(event);

    res.json({ received: true });
  } catch (err) {
    console.error('webhook error:', err.message);
    return res.status(400).json({ error: 'Webhook process failed: ' + err.message });
  }
});

// Handle webhook events
async function handleWebhookEvent(event) {
  console.log('Webhook event received:', event.type);

  if (event.type === 'payment_intent.succeeded') {
    const paymentIntent = event.data.object;
    console.log('Payment succeeded:', paymentIntent.id);

    // Find payment record
    const payment = await Payment.findOne({
      stripePaymentIntentId: paymentIntent.id
    });

    if (!payment) {
      console.error('Payment record not found for', paymentIntent.id);
      return;
    }

    // Update payment status
    payment.status = 'succeeded';
    payment.accessToken = require('crypto').randomBytes(24).toString('hex');
    payment.expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
    await payment.save();

    // Send email with access link
    const PORT = process.env.PORT || 3000;
    const baseUrl = process.env.BASE_URL || `http://localhost:${PORT}`;
    const accessLink = `${baseUrl}/api/payment/access?token=${payment.accessToken}`;

    const emailResult = await sendScholarshipLinkEmail(
      payment.email,
      payment.scholarshipTitle,
      payment.accessToken,
      accessLink
    );

    if (emailResult.success) {
      payment.emailSent = true;
      payment.emailSentAt = new Date();
      await payment.save();
      console.log('Email sent to:', payment.email);
    } else {
      console.error('Failed to send email:', emailResult.error);
    }
  } else if (event.type === 'payment_intent.payment_failed') {
    const paymentIntent = event.data.object;
    console.log('Payment failed:', paymentIntent.id);

    const payment = await Payment.findOne({
      stripePaymentIntentId: paymentIntent.id
    });

    if (payment) {
      payment.status = 'failed';
      await payment.save();
    }
  }
}

// GET /api/payment/access?token=<TOKEN>
// Verify access token and grant/show scholarship link
router.get('/payment/access', async (req, res) => {
  try {
    const { token } = req.query;
    if (!token) return res.status(400).json({ error: 'Token required' });

    const payment = await Payment.findOne({ accessToken: token });

    if (!payment) {
      return res.status(404).json({ error: 'Invalid or expired access token' });
    }

    // Check if token expired
    if (payment.expiresAt && payment.expiresAt < new Date()) {
      return res.status(410).json({ error: 'Access link has expired' });
    }

    // Mark access as granted
    if (!payment.accessGranted) {
      payment.accessGranted = true;
      payment.accessGrantedAt = new Date();
      await payment.save();
    }

    // Return scholarship link or redirect; prefer any URL saved in metadata
    const linkFromMeta = payment.metadata && payment.metadata.scholarshipUrl;
    return res.json({
      success: true,
      email: payment.email,
      scholarshipTitle: payment.scholarshipTitle,
      scholarshipLink: linkFromMeta || process.env.SCHOLARSHIP_URL || 'https://example.com/scholarships',
      accessGrantedAt: payment.accessGrantedAt,
      expiresAt: payment.expiresAt
    });
  } catch (err) {
    console.error('access verification error:', err);
    return res.status(500).json({ error: 'Failed to verify access' });
  }
});

// GET /api/payment/status/:paymentIntentId
// Check payment status
router.get('/payment/status/:paymentIntentId', async (req, res) => {
  try {
    const { paymentIntentId } = req.params;

    const payment = await Payment.findOne({
      stripePaymentIntentId: paymentIntentId
    });

    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    return res.json({
      status: payment.status,
      email: payment.email,
      scholarshipTitle: payment.scholarshipTitle,
      emailSent: payment.emailSent,
      accessGranted: payment.accessGranted
    });
  } catch (err) {
    console.error('status check error:', err);
    return res.status(500).json({ error: 'Failed to check payment status' });
  }
});

// Keep old checkout session endpoint for compatibility
router.post('/create-checkout-session', async (req, res) => {
  if (!stripe) return res.status(500).json({ error: 'Stripe not configured' });

  try {
    const { email } = req.body;
    const amount = 150;

    const PORT = process.env.PORT || 3000;
    const base = process.env.BASE_URL || `http://localhost:${PORT}`;

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: { name: 'Scholarship Application Link Access (1500 RWF)' },
            unit_amount: amount
          },
          quantity: 1
        }
      ],
      customer_email: email,
      success_url: `${base}/payment-success.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${base}/payment.html?canceled=true`
    });

    return res.json({ url: session.url, id: session.id });
  } catch (err) {
    console.error('create-checkout-session error', err);
    return res.status(500).json({ error: 'Failed to create session' });
  }
});

module.exports = router;
