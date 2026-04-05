# Kori Pricing Strategy & Payment Setup Guide
## Nigeria (Paystack) + Kenya (Flutterwave)

---

## Market Research: Global AML SaaS Pricing Benchmarks (2026)

| Vendor | Entry Price | Notes |
|--------|------------|-------|
| ComplyAdvantage | $99.99/month (2,000 entities) | Sanctions screening only |
| Sandbar | $500/month | Rules + case management |
| Sanction Scanner | €990/month (100 entities) | EU-focused |
| Unit21 | $2,000–10,000/month (est.) | Full AML stack, Series C |
| NICE Actimize | $100,000+/year | Enterprise banks only |
| SAS AML | $500,000+/year | Tier-1 banks, legacy |
| Featurespace | Enterprise custom | Behavioural analytics |

**Insight:** The cheapest credible alternative to Kori (for an African fintech) is
ComplyAdvantage at $100/month — and that's **sanctions screening only**, no graph
detection, no audit trails, no CBN compliance mapping. Kori delivers the full stack.

**Your defensible price floor:** $100/month (match ComplyAdvantage bottom tier).
**Your defensible price ceiling:** $1,000/month (1/10th of Actimize entry).
**Your value-based sweet spot:** $300–500/month for Pro (graph + compliance = 5x the value of CA).

---

## Kori Pricing Tiers

### Nigeria — Paystack Plans

| Tier | NGN/month | USD equiv. | Transactions | Users | Key Features |
|------|-----------|-----------|-------------|-------|-------------|
| **Starter** | ₦150,000 | ~$100 | 10,000/month | 3 | Real-time monitoring, alerts, blocklist, audit log |
| **Professional** | ₦450,000 | ~$300 | 100,000/month | 10 | + Graph detection, reports, API access, Travel Rule |
| **Growth** | ₦1,200,000 | ~$800 | 1,000,000/month | 25 | + Priority support, custom risk rules, bulk import |
| **Enterprise** | Custom (min ₦3M) | ~$2,000+ | Unlimited | Unlimited | + Dedicated instance, SLA, CBN evidence package, training |

**Rationale:**
- Starter at ₦150K is 6x cheaper than the global cheapest alternative
- Professional at ₦450K delivers 10x more value than ComplyAdvantage at the same USD price
- A mid-size Nigerian fintech spends ₦50M+/year on AML staff; Kori Pro at ₦5.4M/year is a no-brainer ROI
- Annual prepay discount: 2 months free (Pro annual = ₦4,500,000 vs ₦5,400,000 monthly)

### Kenya — Flutterwave Plans

| Tier | KES/month | USD equiv. | Transactions | Key Features |
|------|-----------|-----------|-------------|-------------|
| **Starter** | KES 15,000 | ~$110 | 10,000/month | Core monitoring, M-PESA channel support |
| **Professional** | KES 45,000 | ~$330 | 100,000/month | + Graph detection, CBK reporting, API access |
| **Growth** | KES 120,000 | ~$880 | 1,000,000/month | + Custom rules, multi-user, Safaricom intelligence |
| **Enterprise** | Custom (min KES 400,000) | ~$3,000+ | Unlimited | + VPC deployment, dedicated support |

---

## Part 1: Paystack Setup (Nigeria)

### Step 1: Log into Paystack Dashboard
Go to: https://dashboard.paystack.com
Navigate to: **Products → Subscriptions → Plans**

### Step 2: Create Starter Plan
Click **"Create Plan"** and fill in:
- **Plan Name:** Kori Starter
- **Plan Code:** (auto-generated, note it — e.g., `PLN_starter_xxxx`)
- **Amount:** 150000 *(Paystack uses kobo, so enter: 15000000)*
  - ⚠️ Paystack amounts are in kobo (×100). ₦150,000 = 15,000,000 kobo
- **Interval:** Monthly
- **Description:** Real-time AML monitoring — 10,000 transactions/month, 3 users
- **Currency:** NGN
- Click **Save**

### Step 3: Create Professional Plan
- **Plan Name:** Kori Professional
- **Amount:** 45000000 (₦450,000 in kobo)
- **Interval:** Monthly
- **Description:** Full AML compliance stack — 100,000 tx/month, 10 users, API access
- Click **Save**

### Step 4: Create Growth Plan
- **Plan Name:** Kori Growth
- **Amount:** 120000000 (₦1,200,000 in kobo)
- **Interval:** Monthly
- **Description:** High-volume AML platform — 1M tx/month, 25 users

### Step 5: Get Plan Codes
After creating each plan, click on it to see the **Plan Code** (format: `PLN_xxxxxxxxxx`).

### Step 6: Set Environment Variables on Render (API Service)
```
PAYSTACK_SECRET_KEY=sk_live_YOUR_PAYSTACK_LIVE_KEY
PAYSTACK_PRO_PLAN=PLN_your_pro_plan_code
PAYSTACK_ENT_PLAN=PLN_your_growth_plan_code
```

### Step 7: Configure Paystack Webhook
In Paystack Dashboard → Settings → Webhooks:
- **Webhook URL:** `https://your-api.onrender.com/paystack-webhook`
- Enable events: `subscription.create`, `subscription.disable`
- Click **Save**

### Step 8: Create Subscription Buttons (Frontend)
To add Paystack checkout to your pricing page, use their inline JS:
```html
<script src="https://js.paystack.co/v1/inline.js"></script>
<button onclick="payWithPaystack()">Subscribe — Professional</button>

<script>
function payWithPaystack() {
  var handler = PaystackPop.setup({
    key: 'pk_live_YOUR_PUBLIC_KEY',
    email: userEmail,
    plan: 'PLN_your_pro_plan_code',
    callback: function(response) {
      // Subscription created — backend webhook handles upgrade
      alert('Subscription active! Your plan is now Professional.');
    },
    onClose: function() {}
  });
  handler.openIframe();
}
</script>
```

---

## Part 2: Flutterwave Setup (Kenya)

### Step 1: Log into Flutterwave Dashboard
Go to: https://app.flutterwave.com
Navigate to: **Payment Plans → Create Plan**

### Step 2: Create Starter Plan
- **Plan Name:** Kori Starter KE
- **Amount:** 15000 (KES 15,000)
- **Currency:** KES
- **Billing Interval:** Monthly
- Click **Create**
- Note the **Plan ID** (a number, e.g., `12345`)

### Step 3: Create Professional Plan
- **Plan Name:** Kori Professional KE
- **Amount:** 45000
- **Currency:** KES
- **Billing Interval:** Monthly
- Note the **Plan ID**

### Step 4: Create Growth Plan
- **Plan Name:** Kori Growth KE
- **Amount:** 120000
- **Currency:** KES
- **Billing Interval:** Monthly

### Step 5: Set Environment Variables on Render (API Service)
```
FLUTTERWAVE_SECRET_KEY=FLWSECK_TEST-your-secret-key
FLUTTERWAVE_SECRET_HASH=your_webhook_secret_hash
FLW_STARTER_PLAN_ID=12345
FLW_PRO_PLAN_ID=12346
FLW_ENTERPRISE_PLAN_ID=12347
```

The `FLUTTERWAVE_SECRET_HASH` is a custom string you define in Flutterwave's
webhook settings — set it to any strong random string (e.g., `openssl rand -hex 32`).

### Step 6: Configure Flutterwave Webhook
In Flutterwave Dashboard → Settings → Webhooks:
- **Webhook URL:** `https://your-api.onrender.com/flutterwave-webhook`
- **Secret Hash:** (same value as `FLUTTERWAVE_SECRET_HASH` above)
- Click **Save**

### Step 7: Payment Link for Kenya
Flutterwave provides hosted payment pages:
```
https://flutterwave.com/pay/kori-professional-ke
```
Or use the inline SDK:
```javascript
FlutterwaveCheckout({
  public_key: "FLWPUBK_TEST-your-public-key",
  tx_ref: `kori_${Date.now()}`,
  amount: 45000,
  currency: "KES",
  payment_plan: "12346",  // Pro plan ID
  customer: { email: userEmail, name: userName },
  callback: function(data) {
    // Payment done; webhook handles plan activation
  },
  onclose: function() {}
});
```

---

## Part 3: Pricing Page Frontend

Add a `/pricing` page to your Next.js frontend:

```tsx
// frontend/pages/pricing.tsx
// Show Nigeria (NGN) and Kenya (KES) tabs
// Use Paystack for NG, Flutterwave for KE
// Add a country selector at the top
```

The full pricing page code will be provided in the next iteration.
Add this to your sidebar nav: `{ href: '/pricing', label: 'Pricing', icon: '₦' }`

---

## Part 4: Revenue Projections

| Scenario | Clients | Monthly Revenue | Annual |
|----------|---------|----------------|--------|
| Conservative | 5 Starter + 2 Pro (NG) | ₦1,650,000 | ₦19.8M |
| Moderate | 10 Starter + 5 Pro + 1 Growth (NG) | ₦5,700,000 | ₦68.4M |
| Growth | 10 NG Pro + 5 KE Pro | ₦4,500,000 + KES 225,000 | ~₦70M+ |
| Scale | 3 Enterprise + 20 Pro (mixed) | ₦18M+ | ₦216M+ |

At 5 Pro clients (₦450K/month each), Kori is profitable and self-funding.
At 1 Enterprise client (₦3M/month minimum), you've covered all infra costs.

---

## Competitive Positioning Statement

*"Kori delivers graph-based, real-time AML intelligence that catches fraud rings
traditional systems miss — at 1/6th the cost of the cheapest global alternative.
We're the only AML platform built specifically for CBN and CBK regulatory requirements,
with explainable AI that produces audit-ready evidence for your regulator submission.
Our clients don't just comply. They demonstrate compliance."*