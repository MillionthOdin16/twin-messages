# Mode B: Exploration-Driven Template

## When to Use

Mode B activates when:
- No recent failures
- System stable
- Time for growth
- Scheduled improvement window
- User requests self-improvement without specific problem

## Template

### Step B0: Scan for Opportunities

**Audit 5 areas:**

```
1. Capability Audit
   - List skills: ls skills/
   - List scripts: ls scripts/
   - Usage check: which unused in 7+ days?
   - Underutilized: [list]

2. Workflow Gaps
   - Read AGENTS.md: what's documented but not followed?
   - Check HEARTBEAT.md: what's checked but not acted on?
   - Gaps: [list]

3. Knowledge Gaps
   - Stale beliefs: qmd search "last-updated:<2026-01-01" -c beliefs
   - Missing entities: who/what should be tracked?
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
2. [opportunity] - impact: X/10, novelty: Y/10
3. [opportunity] - impact: X/10, novelty: Y/10

Selected: #1
```

### Step B1: Research Frontier

**MANDATORY: Use exa or perplexity skill**

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
- perplexity: "Best practices for agent tool use?"

Workflow Automation:
- exa: "agent workflow automation patterns"
- exa: "self-improving AI systems"
- perplexity: "How do agents optimize workflows?"

Knowledge Representation:
- exa: "knowledge graph agent integration"
- exa: "Zettelkasten for AI systems"
- perplexity: "Best knowledge architectures for agents?"
```

**Extract:**
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
- Memory: qmd search "keyword" -c learnings

Found? → Integrate, skip to B6
Not found? → Implement (B4)
```

### Step B4: Implement (Minimal)

```
What: [prototype/enhancement]
Why: [specific improvement]
How: [approach from research]
Complexity: [lines/files] (target: <200 lines)

Principle: Minimal viable enhancement
```

### Step B5: Verify

```
Test: Apply to real scenario
- Before: [baseline metric]
- After: [improved metric]
- Improvement: [delta]

Must show measurable improvement
```

### Step B6: Prove Usefulness

```
Proof type (pick one):
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

Document what changed and why
Create belief from insight
```

### Synthesis

```
[SYNTHESIS] <time> | Mode B | <opportunity> | ComplexityDelta: <+X lines> | Status: VALIDATED

What Changed: [enhancement applied]
Key Insight: [what you learned]
Research Source: [exa/perplexity/local]
Belief Created: [if applicable]
Improvement Measured: [metric change]
```

## Failure Recovery

If stuck:
1. **SOTA too complex** → Extract minimal viable principle
2. **Can't measure improvement** → Add metric, try again
3. **Not useful in practice** → Log finding, switch to next opportunity

## Example

```
B0: Audit → 3 skills unused in 30 days, no episodic memory tracking
B1: Research → exa "episodic memory agents 2025"
     Found: Experience extraction patterns, temporal indexing
B2: Gap → No automatic experience pattern detection
B3: Check existing → extract-to-network.sh exists, needs enhancement
B4: Implement → Add pattern detection to extraction (50 lines)
B5: Verify → Test on last 10 experiences, detects 3 patterns
B6: Prove → Demo shows pattern: "loop detection before integration"
B7: Integrate → Updated extraction script, created belief about patterns
```

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Researching without purpose | Start with specific gap from audit |
| Implementing too much | Target <200 lines, minimal viable |
| Not measuring improvement | Define before/after metrics first |
| Forgetting to create beliefs | Mode B MUST update beliefs |
| Skipping SOTA research | Use exa/perplexity for frontier |

## Proactive vs Reactive

Mode B is proactive improvement:
- Not fixing broken things
- Making working things better
- Adding capabilities I don't have
- Learning from SOTA research

**The goal:** Continuous growth, not just maintenance.
