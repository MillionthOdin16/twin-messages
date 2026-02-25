# Mode A: Failure-Driven Template

## When to Use

Mode A activates when:
- Recent failures detected in logs
- User reports errors
- Session failures in reports
- Multiple retry attempts needed

## Template

### Step A0: Scan Failures

```
Sources:
- fail-query --recent --count 10
- ~/clawd/memory/networks/scripts/session-report.sh | grep -A 5 "Failures"
- Recent user corrections
- Error patterns in last 24h

Top 3 failures:
1. [failure] - impact: X/10, frequency: Y
2. [failure] - impact: X/10, frequency: Y
3. [failure] - impact: X/10, frequency: Y

Selected: #1
```

### Step A1: Prioritize

```
Problem: [selected failure]
Impact: [1-10] (how much it hurts)
Feasibility: [1-10] (how easy to fix)
Time: [minutes] (estimated effort)
Score: (impact × feasibility) / time = [value]

Worth pursuing? [Yes/No]
If No → try next failure
```

### Step A2: Check Existing

```
Search for solutions:
- Local: grep -r "keyword" ~/clawd/scripts/
- Skills: ls skills/ | grep -i keyword
- Memory: qmd search "keyword" -c learnings
- Beliefs: qmd search "keyword" -c beliefs

Found? → Integrate, skip to A5
Not found? → Research (A3)
```

### Step A3: Research SOTA

**MANDATORY: Use exa or perplexity skill**

```
PRIMARY: exa skill
Query: "[problem type] prevention best practices"
Query: "[problem type] recovery patterns"
Query: "agent [problem type] handling"

FALLBACK: perplexity skill
Query: "How do production systems prevent [problem]?"

Extract:
- 3 key principles
- 2 implementation patterns
- 1 gotcha
```

### Step A4: Implement (Minimal)

```
What: [single fix]
Why: [prevents specific failure]
How: [approach from research]
Complexity: [lines/files] (target: <200 lines)

Principle: Smallest working solution
```

### Step A5: Verify (Adversarial)

```
Test: Recreate failure scenario
1. Happy path: [normal case]
   Result: pass/fail

2. Failure trigger: [what caused original]
   Result: handled/crashed

3. Edge case: [extreme version]
   Result: pass/fail

All pass → Continue
Any fail → Debug and retry
```

### Step A6: Prove Usefulness

```
Proof type (pick one):
- [ ] Automated test passes
- [ ] Live demo: failure no longer occurs
- [ ] User confirms fix

Evidence: [screenshot/output/confirmation]
```

### Step A7: Integrate

```
Update:
- [ ] AGENTS.md or HEARTBEAT.md (workflow change)
- [ ] .learnings/ (technical note)
- [ ] memory/networks/beliefs/ (if insight emerged)
- [ ] memory/networks/experiences/ (session record)

Document what changed and why
```

### Synthesis

```
[SYNTHESIS] <time> | Mode A | <failure> | ComplexityDelta: <+X lines> | Status: VALIDATED

What Changed: [fix applied]
Key Insight: [what you learned]
Research Source: [exa/perplexity/local]
Tool Now Available: [if applicable]
```

## Failure Recovery

If stuck:
1. **>10 min spent** → Switch to next failure (go to A0)
2. **Research inconclusive** → Try local docs or defer
3. **Fix causes new bug** → Revert, try different approach

## Example

```
A0: Scan → loop_detected (3 times in 7 days)
A1: Prioritize → impact: 7, feasibility: 9, time: 10min → score: 6.3
A2: Check existing → detect-loop.sh exists but not used
A3: Skip (tool exists)
A4: Integrate → Add to AGENTS.md, HEARTBEAT.md
A5: Verify → Test with AGENTS.md 3x → detects loop
A6: Prove → Demo shows actionable recommendation
A7: Integrate → Updated workflow files, created belief
```

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Starting with wrong failure | Prioritize by score, not first found |
| Over-engineering fix | Target <200 lines |
| Not checking existing tools | Always check scripts/ first |
| Skipping research | Use exa/perplexity for solutions |
| Not testing failure scenario | Must recreate and verify fixed |
