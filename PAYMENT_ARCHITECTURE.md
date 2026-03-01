# ScholarLink Payment Architecture

Complete payment flow with PaymentIntent, webhooks, email verification, and access token system.

## Architecture Overview

```
1. Frontend → collects email → calls POST /api/payment/create-intent
                                ↓
2. Backend → creates PaymentIntent → saves to Payment model (pending) → returns clientSecret
                                ↓
3. Frontend → displays Stripe payment form → user enters card
                                ↓
4. Stripe → confirms payment → fires webhook (payment_intent.succeeded)
                                ↓
5. Backend webhook handler → finds Payment record → updates status (succeeded) → generates accessToken
                                ↓
6. Backend → sends email with accessLink + token → marks emailSent=true
                                ↓
7. User receives email with link: http://localhost:3001/api/payment/access?token=xxxxx
                                ↓
8. User clicks link → frontend calls GET /api/payment/access?token=xxxxx
                                ↓
9. Backend → verifies token → checks expiration (30 days) → marks accessGranted=true → returns scholarship link
                                ↓
10. User → downloads/accesses scholarship materials
```

## Database Schema

### Payment Model (`models/Payment.js`)

```javascript
{
  email: String,                    // User email (indexed)
  scholarshipTitle: String,         // Name of scholarship
  scholarshipId: String,            // ID from scholarship API
  stripePaymentIntentId: String,    // Stripe PaymentIntent ID (unique)
  amount: Number,                   // Amount in cents (150 = $1.50)
  currency: String,                 // 'usd'
  status: String,                   // 'pending' | 'succeeded' | 'failed' | 'canceled'
  accessToken: String,              // Unique token for access verification (unique, sparse)
  accessGranted: Boolean,           // true when user clicks access link
  accessGrantedAt: Date,            // When user accessed
  emailSent: Boolean,               // true when email delivered
  emailSentAt: Date,                // When email was sent
  expiresAt: Date,                  // Access link expiration (30 days from payment success)
  metadata: Object,                 // Extra data
  createdAt: Date,                  // Auto-created
  updatedAt: Date                   // Auto-updated
}
```

## API Endpoints

### 1. Create Payment Intent
**POST** `/api/payment/create-intent`

**Request:**
```json
{
  "email": "user@example.com",
  "scholarshipTitle": "Global Excellence Scholarship",
  "scholarshipId": "scholarship-123"
}
```

**Response:**
```json
{
  "clientSecret": "pi_test_xxxxx_secret_yyyyy",
  "paymentIntentId": "pi_test_xxxxx"
}
```

**Backend does:**
- Validates email
- Creates Stripe PaymentIntent (150 cents = $1.50)
- Saves Payment record to DB (status: pending)
- Returns client secret for frontend

---

### 2. Webhook: Payment Succeeded
**POST** `/api/payment/webhook`

**Stripe sends:**
```json
{
  "type": "payment_intent.succeeded",
  "data": {
    "object": {
      "id": "pi_test_xxxxx",
      "status": "succeeded"
    }
  }
}
```

**Backend does:**
- Verifies Stripe signature (optional if STRIPE_WEBHOOK_SECRET set)
- Finds Payment record by stripePaymentIntentId
- Updates status → "succeeded"
- Generates unique accessToken (24-byte hex)
- Sets expiresAt = now + 30 days
- Sends email with link: `http://localhost:3001/api/payment/access?token=xxxxx`
- Marks emailSent = true

---

### 3. Verify Access Token
**GET** `/api/payment/access?token=<TOKEN>`

**Response (Success):**
```json
{
  "success": true,
  "email": "user@example.com",
  "scholarshipTitle": "Global Excellence Scholarship",
  "scholarshipLink": "https://example.com/scholarships",
  "accessGrantedAt": "2026-02-17T22:00:00.000Z",
  "expiresAt": "2026-03-19T22:00:00.000Z"
}
```

**Backend does:**
- Validates token exists in DB
- Checks expiration (1440 days from now)
- Marks accessGranted = true
- Returns scholarship link

**Errors:**
- 400: Token missing
- 404: Invalid or expired token
- 410: Access link expired (after 30 days)

---

### 4. Check Payment Status
**GET** `/api/payment/status/:paymentIntentId`

**Response:**
```json
{
  "status": "succeeded",
  "email": "user@example.com",
  "scholarshipTitle": "Global Excellence Scholarship",
  "emailSent": true,
  "accessGranted": false
}
```

---

## Email Service (`services/emailService.js`)

### Configuration

Nodemailer uses SMTP settings from `.env`:

```env
# Mailtrap (free for testing)
SMTP_HOST=smtp.mailtrap.io
SMTP_PORT=2525
SMTP_USER=your_mailtrap_username
SMTP_PASS=your_mailtrap_password
SENDER_EMAIL=noreply@scholarlink.com

# OR Gmail
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password  # NOT regular password
```

### Get Mailtrap Credentials

1. Sign up: https://mailtrap.io
2. Dashboard → Email Testing → Inboxes
3. Select default inbox → Integration → Node.js/Nodemailer
4. Copy User and Pass → Add to `.env`

### Test Email Sending

```javascript
const { sendScholarshipLinkEmail } = require('./services/emailService');

await sendScholarshipLinkEmail(
  'user@example.com',
  'Cambridge Scholarship',
  'abc123def456...',
  'http://localhost:3001/api/payment/access?token=abc123def456...'
);
// Returns: { success: true, messageId: '...' }
```

---

## Backend Files

### New/Updated Files

| File | Purpose |
|------|---------|
| `models/Payment.js` | Payment schema with accessToken, status tracking |
| `services/emailService.js` | Nodemailer SMTP configuration and email sending |
| `routes/payment.js` | PaymentIntent, webhook, access verification endpoints |
| `.env` | SMTP + Stripe webhook config |

### Endpoints Created

| Method | Route | Purpose |
|--------|-------|---------|
| POST | `/api/payment/create-intent` | Create PaymentIntent |
| POST | `/api/payment/webhook` | Receive Stripe webhook |
| GET | `/api/payment/access?token=X` | Verify token & grant access |
| GET | `/api/payment/status/:id` | Check payment status |

---

## Frontend Integration (Next Steps)

### 1. Update Homedash.html to collect email and create PaymentIntent

```javascript
async function initiatePayment(scholarshipTitle, scholarshipId) {
  const email = prompt('Enter your email:');
  if (!email) return;

  // Step 1: Create PaymentIntent
  const response = await fetch('/api/payment/create-intent', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, scholarshipTitle, scholarshipId })
  });
  const data = await response.json();
  const clientSecret = data.clientSecret;

  // Step 2: Display Stripe payment form (requires Stripe.js)
  // Use stripe.confirmCardPayment(clientSecret) or Payment Element
}
```

### 2. Include Stripe.js in HTML

```html
<script src="https://js.stripe.com/v3/"></script>
```

### 3. Handle payment form and submit to Stripe

```javascript
const stripe = Stripe('pk_test_...');
await stripe.confirmCardPayment(clientSecret, {
  payment_method: { card: cardElement }
});
```

---

## Full Flow Example (Developer Testing)

### Step 1: Create PaymentIntent
```bash
curl -X POST http://localhost:3001/api/payment/create-intent \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "scholarshipTitle": "Harvard Scholarship",
    "scholarshipId": "harvard-001"
  }'

# Response
{
  "clientSecret": "pi_1ABCDEFtest_secret_xxx",
  "paymentIntentId": "pi_1ABCDEFtest"
}
```

### Step 2: Simulate Payment Success (via Stripe Dashboard or CLI)
In Stripe Dashboard → Test Data → PaymentIntents → Find `pi_1ABCDEFtest` → Confirm

OR use Stripe CLI:
```bash
stripe trigger payment_intent.succeeded --override pi_1ABCDEFtest
```

### Step 3: Webhook Fires
Backend receives webhook → Updates Payment → Sends email

### Step 4: Check Payment Status
```bash
curl http://localhost:3001/api/payment/status/pi_1ABCDEFtest

# Response
{
  "status": "succeeded",
  "email": "test@example.com",
  "scholarshipTitle": "Harvard Scholarship",
  "emailSent": true,
  "accessGranted": false
}
```

### Step 5: Access Link
User clicks email link or:
```bash
curl http://localhost:3001/api/payment/access?token=<TOKEN_FROM_EMAIL>

# Returns scholarship link
{
  "success": true,
  "scholarshipLink": "https://example.com/scholarships"
}
```

---

## Security Considerations

✅ **What's Secure:**
- Access tokens are cryptographically random (24 bytes, hex encoded)
- Tokens are unique and stored in DB
- Tokens expire after 30 days
- Stripe handles all payment data (PCI compliant)
- Email sent only after successful payment

⚠️ **To Improve:**
- Add HTTPS in production
- Rate limit email verification endpoint
- Use STRIPE_WEBHOOK_SECRET for signature verification
- Don't expose real Stripe keys in frontend
- Add CORS restrictions by environment

---

## Environment Variables Summary

```env
# Database
MONGODB_URI=mongodb+srv://...
MONGODB_DB=User-registration
PORT=3001

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_test_... (optional)

# Email (Mailtrap)
SMTP_HOST=smtp.mailtrap.io
SMTP_PORT=2525
SMTP_USER=your_mailtrap_user
SMTP_PASS=your_mailtrap_pass
SENDER_EMAIL=noreply@scholarlink.com

# Application
BASE_URL=http://localhost:3001
SCHOLARSHIP_URL=https://example.com/scholarships
SCHOLARSHIP_API_URL=https://raw.githubusercontent.com/olosegres/jsona/main/scholarships.json
```

---

## Troubleshooting

### Email Not Sending
- Check SMTP credentials in `.env`
- Visit Mailtrap → Inboxes to see sent emails
- Check server logs for error messages
- Verify nodemailer installed: `npm list nodemailer`

### Webhook Not Firing
- For development: STRIPE_WEBHOOK_SECRET is optional (logs warning)
- Use Stripe CLI to test: `stripe listen --forward-to localhost:3001/api/payment/webhook`
- Check Stripe Dashboard → Webhooks → Event logs

### Payment Intent Not Found
- Ensure MongoDB connected: Check console `Connected to MongoDB`
- Verify Stripe key is correct
- Check Payment collection has records: MongoDB compass

### Access Token Expired
- Tokens expire 30 days after payment success
- User must request new payment for new token
- `expiresAt` field shows expiration date

---

## Next Steps

1. **Test email service**: Configure Mailtrap credentials in `.env`
2. **Update frontend**: Add Stripe.js payment form to HTML
3. **Set webhook secret**: Get from Stripe Dashboard → Webhooks
4. **Deploy**: Use production Stripe keys and email service
5. **Monitor**: Watch payment logs, email delivery, access tracking

---

**Questions?** Check `/api/payment/*` endpoints in `routes/payment.js` for detailed implementation.
