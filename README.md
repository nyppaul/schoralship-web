# schoralship-web — backend

This adds a minimal Node.js + Express backend that stores users in MongoDB and exposes two API endpoints:

- `POST /api/register` — create a new user
- `POST /api/login` — login and verify credentials

Payment flow

- `POST /api/create-checkout-session` — creates a Stripe Checkout session and returns a `url` to redirect the user to.
- `GET /api/verify-payment?session_id=...` — verifies the Checkout session and returns `scholarshipLink` when paid.

It also serves the existing frontend files (`register.html`, `signin.html`, `homepage.html`) so you can open them at http://localhost:3000/register.html after starting the server.

Setup

1. Install dependencies:

```bash
cd /workspaces/schoralship-web
npm install
```

2. Create a `.env` file (or set env vars) using `.env.example` and point `MONGODB_URI` to your MongoDB instance.

3. Start the server:

```bash
npm start
```

4. Open the app in a browser:

```bash
# Registration page
http://localhost:3000/register.html

# Sign-in page
http://localhost:3000/signin.html
```

Notes

- Passwords are hashed with `bcryptjs`.
- For production, add proper validation, rate limiting, HTTPS, and return a JWT or session cookie on login.
 - To enable payments, set `STRIPE_SECRET_KEY` and optional `PAYMENT_AMOUNT_CENTS` and `SCHOLARSHIP_URL` in `.env`.

## Admin interface

A simple admin page is available at `/admin.html`. The page is not linked from anywhere in the UI so clients will not stumble upon it; you must navigate to it directly. A secret value is required in the query string and will be sent in an `x-admin-secret` header on requests.

```
http://localhost:3000/admin.html?secret=YOUR_SECRET
```

Configure the secret via the `ADMIN_SECRET` environment variable (defaults to `devsecret`).

Entries created here are stored in memory and merged with the data returned by `GET /api/scholarships`. In production you would instead persist them in a database.
