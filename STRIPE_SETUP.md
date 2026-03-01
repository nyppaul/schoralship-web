# Stripe Setup Guide

This guide explains how to configure Stripe for the Scholarship Payment System.

---

## What is Stripe?

Stripe is a payment processor that handles credit/debit card payments securely. Your website never directly touches card data—Stripe handles it all via a secure checkout interface.

---

## Step 1: Create a Stripe Account

1. Go to https://dashboard.stripe.com/register
2. Sign up with your email
3. Verify your email
4. Complete your business information

---

## Step 2: Get Your API Keys

Your Stripe dashboard provides two types of keys:

### **Live Keys** (Production - Real Money)
- **Public Key** (`pk_live_...`) - Safe to expose in frontend code
- **Secret Key** (`sk_live_...`) - **NEVER share or expose**

### **Test Keys** (Development - No Real Money)
- **Public Key** (`pk_test_...`) - Safe to use in development
- **Secret Key** (`sk_test_...`) - Use this for development

### Where to Find Keys:
1. Log in to https://dashboard.stripe.com
2. Go to **Developers** (top right) → **API Keys**
3. Copy the **Secret Key** (test mode by default)

---

## Step 3: Configure Environment Variables

Create or update your `.env` file in the project root:

```env
STRIPE_SECRET_KEY=sk_test_YOUR_SECRET_KEY_HERE
PORT=3000
BASE_URL=http://localhost:3000
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/scholarship?retryWrites=true&w=majority
MONGODB_DB=scholarship
```

### Required Environment Variables:
| Variable | Value | Example |
|----------|-------|---------|
| `STRIPE_SECRET_KEY` | Your Stripe Secret API Key | `sk_test_4eC39HqLyjWDarhtT657j...` |
| `PORT` | Server port (default: 3000) | `3000` |
| `BASE_URL` | Your website URL | `http://localhost:3000` |
| `MONGODB_URI` | MongoDB connection string | `mongodb+srv://user:pass@...` |

### Optional:
| Variable | Purpose | Default |
|----------|---------|---------|
| `SCHOLARSHIP_API_URL` | External scholarship API endpoint | Demo data (6 scholarships) |

---

## Step 4: API Endpoints

### A. Create Checkout Session
**POST** `/api/create-checkout-session`

**Request:**
```json
{
  "email": "user@example.com"
}
```

**Response (Success):**
```json
{
  "url": "https://checkout.stripe.com/pay/cs_...",
  "id": "cs_live_..."
}
```

**What happens:**
1. Backend creates a Stripe Checkout session
2. Fixed price: **1500 RWF** (represented as $1.50 USD / 150 cents)
3. User is redirected to Stripe's secure checkout page
4. User enters credit card details
5. After payment, redirects to success page

### B. Verify Payment
**GET** `/api/verify-payment?session_id=cs_...`

**Response (Success):**
```json
{
  "paid": true,
  "scholarshipLink": "https://scholarship-link.com/access"
}
```

**Response (Not Paid):**
```json
{
  "paid": false
}
```

---

## Step 5: Test Payment

### Using Stripe Test Cards:

| Card Number | Exp | CVC | Result |
|-------------|-----|-----|--------|
| `4242 4242 4242 4242` | Any future date | Any 3 digits | ✅ Succeeds |
| `4000 0000 0000 0002` | Any future date | Any 3 digits | ❌ Declines |
| `4000 0025 0000 3155` | Any future date | Any 3 digits | ❌ Requires authentication |

### How to Test:
1. Start the server: `npm start`
2. Open http://localhost:3000
3. Click "Get link here" on any scholarship
4. Enter your email (e.g., `test@example.com`)
5. You'll be redirected to Stripe Checkout
6. Use a test card from the table above
7. Fill in any future expiry date and any CVC
8. Click **Pay**

---

## Step 6: Understand Pricing

### Current Configuration:
- **Fixed Price:** 1500 RWF per scholarship
- **In Stripe (USD conversion):** $1.50 USD / 150 cents
- **Stripe Fee (roughly):** 2.9% + $0.30 per transaction

### To Change Pricing:
Edit [routes/payment.js](routes/payment.js#L8):
```javascript
const amount = 150; // Change this number (in cents)
// E.g., 300 = $3.00 USD = 3000 RWF equivalent
```

---

## Step 7: Security Best Practices

✅ **DO:**
- Keep `STRIPE_SECRET_KEY` in `.env` (never in code)
- Use HTTPS in production
- Store session IDs securely
- Verify payments on the backend

❌ **DON'T:**
- Expose `STRIPE_SECRET_KEY` in frontend code
- Commit `.env` to Git
- Share your secret key via email
- Test with real card numbers

---

## Step 8: Frontend Integration

The [ew/Homedash.html](ew/Homedash.html) automatically:
1. Fetches scholarships from `/api/scholarships`
2. Shows "Get link here" button for each scholarship
3. When clicked, calls `/api/create-checkout-session`
4. Redirects to Stripe Checkout
5. After payment, redirects to success/cancel page

---

## Troubleshooting

### "Stripe not configured" Error
- `STRIPE_SECRET_KEY` is missing or invalid in `.env`
- Solution: Add your test key to `.env` and restart server

### "Failed to create session" Error
- Stripe API returned an error
- Check Stripe dashboard for error logs: https://dashboard.stripe.com/logs
- Verify your secret key is correct

### Scholarships Not Showing
- Backend `/api/scholarships` is failing
- Check server logs for errors
- If `SCHOLARSHIP_API_URL` is set, verify that URL is accessible
- Fallback: Remove `SCHOLARSHIP_API_URL` to use demo data (6 scholarships)

### Payment Goes to Wrong Account
- Verify the secret key belongs to your Stripe account
- Test keys start with `sk_test_`
- Live keys start with `sk_live_`

---

## Next Steps: Going Live

1. **Upgrade to Live Keys** in Stripe Dashboard
2. **Update `.env`** with live secret key (`sk_live_...`)
3. **Set `BASE_URL`** to your production domain
4. **Enable HTTPS** on your domain
5. **Run `npm start`** in production
6. Test with a small real transaction
7. Monitor Stripe Dashboard for disputes/chargebacks

---

## Resources

- **Stripe Dashboard:** https://dashboard.stripe.com
- **Stripe Docs:** https://stripe.com/docs
- **Test Card Numbers:** https://stripe.com/docs/testing
- **API Reference:** https://stripe.com/docs/api

---

## Payment Flow Diagram

```
User clicks "Get link here"
          ↓
Enters email in prompt
          ↓
Frontend calls POST /api/create-checkout-session
          ↓
Backend creates Stripe session (1500 RWF = $1.50)
          ↓
Returns Stripe Checkout URL
          ↓
User redirected to Stripe's secure page
          ↓
User enters card details
          ↓
Stripe processes payment
          ↓
Success → Redirects to /payment-success.html
Canceled → Redirects to /payment.html?canceled=true
```

---

**Questions?** Check [routes/payment.js](routes/payment.js) and [routes/scholarship.js](routes/scholarship.js) for implementation details.
