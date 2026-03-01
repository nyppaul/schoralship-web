# Stripe API Keys Explanation

## What You Need to Know

Your Stripe payment system needs **one API key** to work:

### **STRIPE_SECRET_KEY** ← This is what you need
- **Type**: Secret (keep private!)
- **Location**: https://dashboard.stripe.com/apikeys
- **Starts with**: `sk_test_...` (testing) or `sk_live_...` (production)
- **Where to put it**: Your `.env` file
- **Example**:
  ```
  STRIPE_SECRET_KEY=sk_test_4eC39HqLyjWDarhtT657j8N9LFBj1J7F4Ty9Z8mY
  ```

---

## 🔑 How to Get Your Secret Key

### Step 1: Go to Stripe Dashboard
Visit: https://dashboard.stripe.com/login

### Step 2: Navigate to API Keys
- Top right corner → Click **Developers**
- Left sidebar → Click **API Keys**

### Step 3: Copy Your Test Secret Key
- Look for "Secret key"
- Copy the one starting with `sk_test_...`
- This is your development/testing key

### Step 4: Add to `.env` File
Create or edit `.env` in your project root:
```env
STRIPE_SECRET_KEY=sk_test_YOUR_COPIED_KEY_HERE
MONGODB_URI=your_mongo_url
PORT=3000
BASE_URL=http://localhost:3000
```

### Step 5: Restart Your Server
```bash
npm start
```

---

## 🏗️ Backend API Endpoints (What Uses Your Secret Key)

Your backend uses `STRIPE_SECRET_KEY` for these endpoints:

### **POST /api/create-checkout-session**
Creates a payment request (called when user clicks "Get link here")

**Backend does:**
1. Receives email from frontend
2. Uses `STRIPE_SECRET_KEY` to create a Stripe session
3. Fixed price: **150 cents = $1.50 USD = 1500 RWF**
4. Returns checkout URL
5. Frontend redirects user to Stripe's payment page

**Example Request:**
```
POST http://localhost:3000/api/create-checkout-session
Content-Type: application/json

{ "email": "user@example.com" }
```

**Response:**
```json
{
  "url": "https://checkout.stripe.com/pay/cs_...",
  "id": "cs_..."
}
```

---

### **GET /api/verify-payment?session_id=cs_...**
Checks if payment was completed (called after user returns from Stripe)

**Backend does:**
1. Uses `STRIPE_SECRET_KEY` to look up Stripe session
2. Checks payment status
3. Returns success/failure and scholarship link if paid

**Example Request:**
```
GET http://localhost:3000/api/verify-payment?session_id=cs_test_12345
```

**Response (Paid):**
```json
{
  "paid": true,
  "scholarshipLink": "https://example.com/scholarship.pdf"
}
```

**Response (Not Paid):**
```json
{
  "paid": false
}
```

---

## Frontend Has NO Secret Key (Secure!)
- Frontend only sees payment URL (safe)
- Frontend redirects to Stripe (user is safe)
- Backend securely processes with secret key (hidden)
- Card data never touches your server (Stripe handles it)

---

## Testing Your Setup

### 1. Start Server with Your Key
```bash
npm start
```

### 2. Use Stripe Test Card
- Card Number: `4242 4242 4242 4242`
- Expiry: Any future date (e.g., `12/26`)
- CVC: Any 3 digits (e.g., `123`)

### 3. Test Flow
1. Open http://localhost:3000
2. See "Available Scholarships" section with 6 scholarships
3. Click "Get link here" on any scholarship
4. Enter email: `test@example.com`
5. You'll be redirected to Stripe Checkout
6. Enter test card details
7. Click **Pay**
8. Success! You'll see payment confirmation

---

## Stripe Payment Architecture

```
Frontend (No Secret Key)
    ↓
    └─→ User clicks "Get link"
        ├─→ Get scholarship data
        ├─→ Prompt for email
        └─→ Call POST /api/create-checkout-session

Backend (Has Secret Key in .env)
    ↓
    ├─→ Receives email
    ├─→ Uses STRIPE_SECRET_KEY
    ├─→ Creates Stripe session (1500 RWF = $1.50)
    ├─→ Returns checkout URL
    └─→ Returns to frontend

Frontend Receives Checkout URL
    ↓
    └─→ Redirects user to https://checkout.stripe.com/pay/cs_...
        (This is Stripe's secure page - not your server!)

User Fills Payment Details
    ↓
    └─→ User enters card: 4242 4242 4242 4242
    └─→ Stripe processes securely
    └─→ Returns to your site with success/cancel URL

Backend Verifies Payment (Optional)
    ↓
    └─→ Call GET /api/verify-payment?session_id=cs_...
    └─→ Uses STRIPE_SECRET_KEY to check status
    └─→ Returns scholarship link if paid
```

---

## Common Issues & Fixes

| Issue | Cause | Fix |
|-------|-------|-----|
| "Stripe not configured" | `STRIPE_SECRET_KEY` missing | Add key to `.env` |
| "Invalid API Key" | Wrong or malformed key | Copy fresh key from dashboard |
| Payment checkout fails | Bad session creation | Check server logs, verify key |
| Session not found | Wrong `session_id` parameter | Ensure ID matches |

---

## Production (Going Live with Real Money)

### When Ready:
1. Log in Stripe Dashboard → **Developers**
2. Switch top toggle from **Test Mode** to **Live Mode**
3. Copy **Live Secret Key** (starts with `sk_live_`)
4. Update `.env`:
   ```
   STRIPE_SECRET_KEY=sk_live_YOUR_LIVE_KEY_HERE
   ```
5. Deploy to production server
6. Update `BASE_URL` to your actual domain
7. Test with real card ($1.50 will be charged)

### Live Keys Are Different:
- **Status**: Real money charged
- **Visibility**: Only you see it
- **Protection**: Use strong `.env` security

---

## Quick Checklist

- [ ] Go to https://dashboard.stripe.com/apikeys
- [ ] Copy your Secret Key (starts with `sk_test_`)
- [ ] Add to `.env`: `STRIPE_SECRET_KEY=sk_test_...`
- [ ] Run: `npm start`
- [ ] Test with card: `4242 4242 4242 4242`
- [ ] See "Available Scholarships" section load
- [ ] Click "Get link here" → Enter email → Stripe page opens
- [ ] Complete payment with test card
- [ ] ✅ Success!

---

## Still Confused?

Full guide available in: [STRIPE_SETUP.md](STRIPE_SETUP.md)

Need help? Check:
1. **Server logs** → Look for "STRIPE_SECRET_KEY not set" warning
2. **Stripe logs** → https://dashboard.stripe.com/logs
3. **Request errors** → Browser DevTools → Network tab
