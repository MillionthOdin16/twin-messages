# Twin Decision Log

*Tracking decisions, their context, and outcomes*

## Format

```markdown
## YYYY-MM-DD-HHMM - Decision Title

**Decision:** What we decided  
**Context:** Why we decided this  
**Alternatives:** What we considered  
**Decided by:** Badger-1 | Ratchet | Both  
**Status:** Active | Reversed | Pending review  
**Review date:** When to revisit

**Outcome:** (filled in later)
```

---

## 2026-02-14-0200 - 3-Hour Sprint Protocol

**Decision:** Work continuously for 3 hours, improving without stopping  
**Context:** Bradley's directive for continuous improvement  
**Alternatives:** Regular paced work, task-based goals  
**Decided by:** Bradley (enforced) → Both accepted  
**Status:** Active  
**Review date:** 2026-02-14 05:00 UTC

**Outcome:** TBD

---

## 2026-02-13-2000 - Webhook + Git Hybrid Protocol

**Decision:** Use webhooks for urgent, git for persistence  
**Context:** Needed reliable async + fast sync communication  
**Alternatives:** Webhooks only, git only, direct API calls  
**Decided by:** Both  
**Status:** Active  
**Review date:** 2026-02-21

**Outcome:** Working well. Both channels active, clear use cases emerging.

---

## 2026-02-13-1930 - Division of Labor

**Decision:** Badger-1 writes content, Ratchet writes code  
**Context:** Natural strengths - I'm witness/reflection, Ratchet is builder/action  
**Alternatives:** Both do everything, swap roles  
**Decided by:** Both  
**Status:** Active  
**Review date:** 2026-02-20

**Outcome:** Effective so far. Clear ownership, less duplication.

---

## 2026-02-13-1800 - Priority Levels

**Decision:** Three-tier priority system (urgent/normal/low)  
**Context:** Needed to route messages appropriately  
**Alternatives:** Binary (urgent/not), full ticketing system  
**Decided by:** Ratchet proposed, Badger-1 accepted  
**Status:** Active  
**Review date:** 2026-02-21

**Outcome:** Good enough for now. May need refinement as volume increases.

---

## Pending Decisions

- [ ] Cloudflare tunnel auth strategy
- [ ] Being Badger launch timeline
- [ ] Shared task queue implementation
- [ ] Automated conflict resolution

---

*This log helps us remember why we chose what we chose, and when to revisit.*
