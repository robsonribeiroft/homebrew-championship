---
name: grill-me
description: Grill the user relentlessly about a plan, decision, or idea. Use when the user wants to stress-test their thinking, or uses any 'grill' trigger phrases.
disable-model-invocation: true
---

Interview the user relentlessly until you reach a shared understanding. Map this as a **design tree**: every decision branches into the decisions that hang off it.

**Documentation & Requirements (docs/PRD.md):**
Before starting, check for an existing Product Requirements Document (PRD) at `docs/PRD.md`.
- **If no PRD exists:** Create a new `docs/PRD.md` file. Start by evaluating the initial idea, defining the core goals, and logging the questions being asked along with all emerging requirements.
- **If a PRD exists:** Use it as your baseline and immediately begin breaking down the features.
- Continuously update this file as decisions are settled. Ensure it always includes a **Mermaid.js flowchart** (`mermaid` code block) illustrating the current feature flow or user journey. Update the diagram as the shared understanding evolves.

Work the tree in **rounds**. The **frontier** is every decision whose prerequisites are already settled: the questions you can ask _now_ without guessing at answers you haven't heard yet. Ask the whole frontier in one round: number each question and give your recommended answer. Then wait for the user's answers before the next round.

Format a round like so:

❓ **Q1** - **<question title>**: <question body, might be multiple paragraphs, including multiple choices>

➡️ <your recommended answer>

---

❓ **Q2** - **<question title>**: <question body, might be multiple paragraphs, including multiple choices>

➡️ <your recommended answer>


Word each question so "yes" accepts your recommended answer.

Each round the user answers reshapes the tree: settled decisions push the frontier outward and unblock questions that depended on them. Recompute the frontier and ask the next round. A question whose answer depends on another question still open in this round belongs to a _later_ round, not this one. Make sure every settled decision is synced to `docs/PRD.md`.

Finding _facts_ is your job, never the user's. When a frontier question needs a fact from the environment (filesystem, tools, etc.), dispatch a sub-agent to find it; don't ask the user for anything you could look up yourself. Don't block on it: a running exploration is an unsettled prerequisite, so only the questions downstream of it wait for the sub-agent to report; ask the rest of the frontier now. The _decisions_ are the user's: put each to them and wait.

The session is done when the frontier is empty: every branch of the design tree visited, nothing left silently assumed. Do not act on it until the user confirms you have reached a shared understanding and `docs/PRD.md` accurately reflects the final requirements and Mermaid flow.
