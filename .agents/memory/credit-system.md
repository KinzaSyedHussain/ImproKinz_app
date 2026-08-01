---
name: Mobile credit system
description: Daily credit allowance and premium gating for study tools.
---

Free mobile users receive 100 credits per day, stored per profile with a date key and spent through Firestore transactions. Premium users bypass spending and are unlimited. Tool costs are centralized so the dashboard, headers, and spend checks stay aligned.

**Why:** A shared atomic ledger prevents separate screens from showing stale balances or allowing concurrent requests to overspend the daily allowance.

**How to apply:** Add new tools to the shared cost map and call the credit guard immediately before the billable action. Refund reserved credits when a billable request fails.