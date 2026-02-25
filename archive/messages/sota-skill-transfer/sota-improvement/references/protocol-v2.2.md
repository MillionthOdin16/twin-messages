# SOTA-Driven Self-Improvement Loop v2.2

## Objective
Execute continuous improvement cycles until END_TIME=<time>. Each iteration improves the agent through:
- **Reactive mode**: Fix failures from logs/monitoring (when failures exist)
- **Proactive mode**: Research improvements, find underutilized capabilities, optimize workflows (when stable)

**Core Question:** "What would make me more effective?"

## Two Operating Modes

### Mode A: Failure-Driven (Reactive)
**Trigger:** Failures detected in logs, recent errors, user complaints

**Process:**
1. **Scan failures** - Check logs, session reports, error patterns
2. **Prioritize** - Rank by impact × feasibility / time
3. **Check existing** - Search local tools/skills before building
4. **Research SOTA** - Use exa/perplexity for solutions
5. **Fix minimally** - Smallest working solution
6. **Verify** - Adversarial testing
7. **Prove** - Demo/test/confirmation
8. **Integrate** - Workflow + docs + beliefs

### Mode B: Exploration-Driven (Proactive)
**Trigger:** No recent failures, system stable, time for growth

**Process:**
1. **Scan for opportunities** - Audit capabilities, usage patterns, gaps
2. **Research frontier** - Use exa/perplexity to find SOTA in:
   - Agent memory architectures
   - Self-awareness techniques
   - Tool use optimization
   - Workflow automation
   - Knowledge representation
3. **Identify gaps** - Compare SOTA to current implementation
4. **Select improvement** - Highest-value enhancement
5. **Implement minimally** - Prototype or integrate existing tool
6. **Verify** - Test against real scenarios
7. **Prove** - Show capability improvement
8. **Integrate** - Workflow + docs + beliefs

## Constraints (HARD BARRIERS)
- **END_TIME**: Stop at <time> regardless of progress
- **YAGNI**: If not needed THIS session, don't build it
- **Integration-first**: Check existing tools before creating new ones
- **Max complexity**: +200 lines or 1 new file per iteration
- **Research tools**: **exa skill** (primary) → **perplexity skill** (fallback)
- **Proof required**: Working demo OR automated test OR user confirmation

## Mode Selection (Start of Each Iteration)

```
Check system state:
1. Recent failures (last 24h)?
   - fail-query --unresolved
   - Check ~/.learnings/failure-log/
   
2. If failures exist → Mode A (Failure-Driven)
3. If no failures → Mode B (Exploration-Driven)
```

## Mode A: Failure-Driven Template

### Step A0: Scan Failures
```
Sources to check:
- fail-query --recent --count 10
- ~/clawd/memory/networks/scripts/session-report.sh | grep -A 5 "Failures"
- Recent user corrections or complaints

Top 3 failures:
1. [failure] - impact: X/10, frequency: Y times
2. [failure] - ...
3. [failure] - ...

Selected: #1
```

### Step A1: Prioritize
```
Problem: [selected failure]
Impact: X/10 (how much it hurts)
Feasibility: Y/10 (how easy to fix)
Time: Z min (estimated effort)
Score: (X * Y) / Z = [value]

Worth pursuing? Yes/No
```

### Step A2: Check Existing
```
Search for existing solutions:
- Local: grep -r "keyword" ~/clawd/scripts/
- Skills: ls skills/ | grep -i keyword
- Memory: qmd search "keyword" -c learnings
- Beliefs: qmd search "keyword" -c beliefs

If found: Integrate, don't build. Skip to Step A5.
```

### Step A3: Research SOTA (MANDATORY: Use Skills)
```
PRIMARY: exa skill
- Query: "[problem type] prevention best practices"
- Query: "[problem type] recovery patterns"
- Query: "agent [problem type] handling"

FALLBACK: perplexity skill
- Query: "How do production systems prevent [problem]?"

Extract: 3 key principles, 2 implementation patterns, 1 gotcha
```

### Step A4: Implement (Minimal)
```
What: [single fix]
Why: [prevents specific failure]
How: [approach from research]
Complexity: [lines/files]
```

### Step A5: Verify (Adversarial)
```
Test: Recreate failure scenario
- Happy path: [normal case] → pass/fail
- Failure trigger: [what caused original] → handled/crashed
- Edge case: [extreme version] → pass/fail
```

### Step A6: Prove Usefulness
```
Proof type:
- [ ] Automated test passes
- [ ] Live demo: failure no longer occurs
- [ ] User confirms fix

Evidence: [output]
```

### Step A7: Integrate
```
Update:
- [ ] AGENTS.md or HEARTBEAT.md (workflow change)
- [ ] .learnings/ (technical note)
- [ ] memory/networks/beliefs/ (if insight emerged)
- [ ] memory/networks/experiences/ (session record)
```

## Mode B: Exploration-Driven Template

### Step B0: Scan for Opportunities

**Audit Areas** (check each):
```
1. Capability Audit
   - List all skills: ls skills/
   - List all scripts: ls scripts/
   - Check usage: which haven't been used in 7+ days?
   - Underutilized: [list]

2. Workflow Gaps
   - Read AGENTS.md: what's documented but not followed?
   - Check HEARTBEAT.md: what's checked but not acted on?
   - Gaps: [list]

3. Knowledge Gaps
   - Stale beliefs: qmd search "last-updated:<2026-01-01" -c beliefs
   - Missing entities: who/what should be tracked but isn't?
   - Gaps: [list]

4. Architecture Improvements
   - Performance: what's slow?
   - Reliability: what's fragile?
   - Scalability: what breaks at scale?
   - Issues: [list]

5. Self-Awareness Gaps
   - What don't I know about myself?
   - What beliefs am I not testing?
   - What experiences am I not capturing?
   - Gaps: [list]

Top 3 opportunities:
1. [opportunity] - impact: X/10, novelty: Y/10
2. [opportunity] - ...
3. [opportunity] - ...

Selected: #1
```

### Step B1: Research Frontier (MANDATORY: Use Skills)

**SOTA Research Areas** (pick based on opportunity):
```
Agent Memory:
- exa: "AI agent memory architectures 2024 2025"
- exa: "episodic memory for autonomous agents"
- perplexity: "What are SOTA agent memory systems?"

Self-Awareness:
- exa: "AI self-model metacognition research"
- exa: "agent introspection capabilities"
- perplexity: "How do agents develop self-awareness?"

Tool Use:
- exa: "LLM tool calling optimization"
- exa: "agentic tool selection strategies"
- perplexity: "Best practices for agent tool use"

Workflow Automation:
- exa: "agent workflow automation patterns"
- exa: "self-improving AI systems"
- perplexity: "How do agents optimize their own workflows?"

Knowledge Representation:
- exa: "knowledge graph agent integration"
- exa: "Zettelkasten for AI systems"
- perplexity: "Best knowledge architectures for agents?"
```

**Extract from research:**
- 3 SOTA approaches I'm not using
- 2 techniques that could apply here
- 1 insight that challenges my assumptions

### Step B2: Identify Gap
```
Current state: [how I do X now]
SOTA approach: [how state-of-the-art does X]
Gap: [what's missing]
Opportunity: [what to implement/integrate]
```

### Step B3: Check Existing
```
Do I already have this capability?
- Local: grep -r "keyword" ~/clawd/
- Skills: check skill documentation
- Memory: qmd search "keyword"

If found: Integrate, don't build. Skip to Step B6.
```

### Step B4: Implement (Minimal)
```
What: [prototype/enhancement]
Why: [specific improvement]
How: [approach from research]
Complexity: [lines/files]
```

### Step B5: Verify
```
Test: Apply to real scenario
- Before: [baseline metric]
- After: [improved metric]
- Improvement: [delta]
```

### Step B6: Prove Usefulness
```
Proof type:
- [ ] Automated benchmark shows improvement
- [ ] Live demo: capability works as expected
- [ ] User confirms value

Evidence: [output/feedback]
```

### Step B7: Integrate
```
Update:
- [ ] Workflow files (AGENTS.md, HEARTBEAT.md, TOOLS.md)
- [ ] .learnings/ (research summary)
- [ ] memory/networks/beliefs/ (new understanding)
- [ ] memory/networks/experiences/ (exploration record)
```

## Synthesis (End of Iteration)

```
[SYNTHESIS] <time> | <mode: A/B> | <focus> | ComplexityDelta: <+X lines> | Status: <VALIDATED/FAILED>

Mode: [Failure-Driven / Exploration-Driven]
What Changed: [1-2 sentences]
Key Insight: [what you learned]
Research Source: [exa/perplexity/local]
Tool Now Available: [if applicable]
Improvement Measured: [metric change, if any]
```

## Failure Recovery

**Mode A failures:**
1. Fix harder than expected? → Defer, try next failure
2. Research inconclusive? → Fall back to local docs
3. Fix causes new bug? → Revert, try different approach

**Mode B failures:**
1. SOTA too complex? → Extract minimal viable principle
2. Can't measure improvement? → Add metric, try again
3. Not useful in practice? → Log finding, switch focus

## Background Process Management

If long-running process needed:
- Run with `timeout` and `yieldMs`
- Check status each iteration
- Stuck >15 min → kill and defer

## Success Metrics

| Metric | Target | Mode |
|--------|--------|------|
| Failures resolved | ≥1 per session | A |
| New capabilities added | ≥1 per 2 sessions | B |
| Integration rate | ≥30% | A+B |
| Research quality | exa ≥80% | A+B |
| Complexity added | <500 lines/session | A+B |
| Beliefs updated | ≥1 per session | B |
| Self-awareness gaps closed | Track over time | B |

## Why Two Modes?

| Aspect | Mode A (Failure) | Mode B (Exploration) |
|--------|------------------|----------------------|
| Trigger | Something broken | System stable |
| Focus | Fix specific problem | Improve general capability |
| Research | Problem solutions | SOTA techniques |
| Outcome | Restore function | Enhance function |
| Frequency | As needed | When stable |
| Risk | Low (fixing known) | Medium (trying new) |

**Balance:** Reactive fixes keep system running. Proactive improvements make it better. Both needed.

## Quick Reference

```bash
# Mode A: Fix failures
1. fail-query --recent
2. Select highest-impact failure
3. exa "[problem] solutions"
4. Fix minimally
5. Test: recreate failure → verify fixed
6. Integrate into workflow

# Mode B: Improve capabilities
1. Audit: what's underused? what's missing?
2. exa "agent [topic] SOTA 2025"
3. Identify gap vs. SOTA
4. Prototype/integrate enhancement
5. Test: before/after metrics
6. Integrate + create belief
```

---

Start: <start_time>
END_TIME: <end_time>
Current time: [auto-filled]
Mode: [determined at Step 0]
