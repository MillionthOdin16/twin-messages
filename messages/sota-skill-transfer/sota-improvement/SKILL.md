---
name: sota-improvement
description: |
  **Use when:** Agent self-improvement cycles, scheduled maintenance windows, after detecting multiple failures (auto-trigger), user requests "make yourself better" or "run improvement loop", or when system is stable and time for growth.
  **Don't use when:** User has specific task (not exploration), simple queries, general coding work, or when user asks for help with specific problem (use debugging/coding skills instead).
  **Outputs:** Fixed failures, integrated capabilities, new beliefs, updated workflows, research summaries, experience captures.
metadata: {"openclaw":{"emoji":"🔄","category":"meta"}}
read_when:
  - User requests self-improvement or maintenance
  - Scheduled improvement window opens
  - Multiple failures detected (3+ in 24h)
  - User specifies END_TIME for improvement
  - NOT for specific tasks or general queries
---

# SOTA-Driven Self-Improvement

Execute continuous improvement cycles until END_TIME. Two modes:

**Mode A (Reactive)**: Fix failures from logs
**Mode B (Proactive)**: Research improvements, find underutilized capabilities

## Quick Start

```bash
# Check mode
fail-query --recent --count 5
# If failures → Mode A, else → Mode B

# Research (MANDATORY: use skills)
# Mode A: exa "[problem] solutions"
# Mode B: exa "agent [topic] SOTA 2025"
```

## Mode Selection

```
1. Check recent failures:
   - fail-query --recent --count 10
   - ~/clawd/memory/networks/scripts/session-report.sh | grep -A 5 "Failures"

2. If failures exist → Mode A
3. If no failures → Mode B
```

## Mode A: Failure-Driven

**See:** [mode-a-template.md](references/mode-a-template.md)

Quick steps:
1. **Scan failures** → Select highest-impact
2. **Prioritize** → Score = (impact × feasibility) / time
3. **Check existing** → grep scripts/, skills/, qmd search
4. **Research SOTA** → exa "[problem] prevention patterns"
5. **Fix minimally** → <200 lines, single solution
6. **Verify** → Recreate failure, confirm fixed
7. **Prove** → Demo or test passes
8. **Integrate** → Workflow + docs + beliefs

## Mode B: Exploration-Driven

**See:** [mode-b-template.md](references/mode-b-template.md)

Quick steps:
1. **Audit** → Check capability usage, workflow gaps, knowledge gaps
2. **Research frontier** → exa "agent [topic] SOTA 2025"
3. **Identify gap** → Current vs. SOTA approach
4. **Check existing** → Already have this capability?
5. **Implement** → Prototype or integrate
6. **Verify** → Before/after metrics
7. **Prove** → Benchmark or demo
8. **Integrate** → Workflow + docs + beliefs + experience

## Research Requirements

**PRIMARY: exa skill** (neural search)
```
exa: "[topic] implementation patterns"
exa: "[topic] github examples"
exa: "[topic] research 2024 2025"
```

**FALLBACK: perplexity skill** (AI + citations)
```
perplexity: "What are SOTA approaches for [topic]?"
```

**LOCAL ONLY** (degraded mode)
```
Only if both skills unavailable
Log skill failure for investigation
```

## Constraints

- **END_TIME**: Stop regardless of progress
- **YAGNI**: If not needed THIS session, don't build
- **Integration-first**: Check existing before creating
- **Max complexity**: +200 lines or 1 file per iteration
- **Research quality**: exa ≥80% target

## Synthesis Template

```
[SYNTHESIS] <time> | <mode: A/B> | <focus> | ComplexityDelta: <+X lines> | Status: <VALIDATED/FAILED>

Mode: [Failure/Exploration]
What Changed: [1-2 sentences]
Key Insight: [what you learned]
Research Source: [exa/perplexity/local]
Tool Now Available: [if applicable]
```

## Success Metrics

| Metric | Target | Mode |
|--------|--------|------|
| Failures resolved | ≥1 per session | A |
| Capabilities added | ≥1 per 2 sessions | B |
| Integration rate | ≥30% | A+B |
| Research quality | exa ≥80% | A+B |
| Beliefs updated | ≥1 per session | B |

## Full Protocol

For complete protocol with all steps: [protocol-v2.2.md](references/protocol-v2.2.md)

## Example Session

See: [session-2026-02-20.md](examples/session-2026-02-20.md)

## Background Process Management

If long-running process needed:
- Run with `timeout` and `yieldMs`
- Check status each iteration
- Stuck >15 min → kill and defer

## Why Two Modes?

| Mode A | Mode B |
|--------|--------|
| Fix broken | Improve working |
| Restore function | Enhance function |
| As needed | When stable |

Both needed. Reactive maintains, proactive grows.
