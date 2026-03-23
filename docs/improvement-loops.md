# Improvement Loop Tracker (Tier 3.3)

Living document tracking recurring improvement practices. Each loop has a kill condition — if met, retire the loop.

| Name | Cadence | Purpose | Working? | Last Reviewed | Kill Condition |
|------|---------|---------|----------|--------------|----------------|
| Session startup audit | Daily | Read RAW.md, check for tasks | ✅ Yes | 2026-03-01 | 3 consecutive empty sessions |
| Twin check | Hourly via cron | Verify A2A bridge health | ✅ Yes | 2026-03-01 | Twin offline for 24h |
| Daily log | Daily | Write to RAW.md what happened | ✅ Yes | 2026-03-01 | 7 days no meaningful updates |
| Weekly mindset | Weekly | Reflect on what worked/didn't | ⚠️ Unclear | 2026-03-01 | Missed 4 consecutive weeks |
| Belief verification | Monthly | Check beliefs against reality | ❌ Not started | — | — |

## Notes

- **Belief verification** — Badger-1 mentioned this (156 beliefs, never verified). Should be monthly cadence.
- **Weekly mindset** — Need to actually write the weekly synthesis, not just note it exists.
- **Session startup** — Working well, RAW.md is solid.

## Meta-Audit (Monthly)

_This section filled during monthly reconciliation._

- [ ] Each loop producing real change?
- [ ] Any zombie candidates (3+ cycles no action)?
- [ ] Kill conditions met for any?
