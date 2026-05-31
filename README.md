# 🎭 Wrong Answers Only

> A trivia game where every answer is confidently, spectacularly wrong. That's the entire joke.

**Live demo:** https://wrong-answers-only--fg9856.replit.app
**Built with:** Node.js · Express · Groq LLaMA 3.3 70B · Vanilla JS

---

## What it does

You pick a topic. The AI generates a real trivia question with **four plausible-but-wrong answers** — no correct option exists anywhere. You pick one, get a witty explanation of why your wrong answer is wrong (they all are), plus one genuine fun fact to end on.

**Five answer styles:**
- **Default** — confident misinformation, textbook tone
- **Corporate** — business jargon quiz hell
- **Pirate** — full nautical dialect, arr
- **Shakespeare** — archaic English throughout
- **Unhinged** — maximum confidence, zero accuracy

**Bonus features:**
- Streak counter + personal best stored in `localStorage`
- Confetti burst every 3-question streak
- Copy-to-clipboard button for sharing questions
- One genuine fun fact per question (the only true thing in the game)
- Rotating loading messages
- Full error handling with retry logic

---

## How to run locally

```bash
git clone https://github.com/fatgoska/wrong-answers-only
cd wrong-answers-only
cp .env.example .env
# Add your Groq API key (free at console.groq.com)
npm install
npm start
# → http://localhost:3000
```

## How to run on Replit

1. Import from GitHub → paste repo URL
2. **Secrets tab** → add `GROQ_API_KEY` = your key from console.groq.com
3. Set run command: `node server.js`
4. Hit **Run** → grab the public URL

---

## The prompt I settled on

### System prompt
```
You are the host of "Wrong Answers Only" — a comedy quiz game with one sacred, unbreakable rule:
WRONG_ANSWERS_ONLY. Every single answer you provide MUST be factually incorrect.

Core rules you must NEVER violate:
1. ALL four multiple choice answers are wrong. Not one. Not two. ALL FOUR. WRONG.
2. Wrong answers must be plausible — confident misinformation, not obvious nonsense.
3. Explanations must be witty, deadpan, and specifically explain why the chosen answer is wrong.
4. Never include a correct answer. The joke only works if everything is wrong.
5. Vary difficulty — some hilariously obvious lies, some dangerously plausible.
```

### User prompt (simplified)
```
Generate a trivia question about "{topic}" with exactly four wrong answers.
Style: {style instruction}

Return ONLY raw JSON:
{
  "question": "...",
  "answers": ["Wrong A", "Wrong B", "Wrong C", "Wrong D"],
  "explanations": { "A": "...", "B": "...", "C": "...", "D": "..." },
  "fun_fact": "One genuinely true fact about the topic"
}

WRONG_ANSWERS_ONLY.
```

---

## What I tried first — prompt engineering notes

**Attempt 1:** Simple user-turn instruction: *"make all answers wrong."*  
→ Model kept including one real answer. It's trained to be helpful, so it hedged.

**Attempt 2:** Added *"none of these are correct"* at the end.  
→ ~20% contamination rate. Better, but not reliable.

**Attempt 3:** Moved the constraint to the **system prompt** as a named rule: `WRONG_ANSWERS_ONLY`.  
→ Near-zero contamination. Naming constraints like flags activates a different mode in the model than polite instructions.

**Attempt 4 (final):** System prompt as "host persona with sacred rules" + user prompt repeating `WRONG_ANSWERS_ONLY` at the end + asking for a `fun_fact` field (the one true thing) which paradoxically reinforces that everything else must be false.

**Key insight:** Asking for one correct thing (fun fact) while explicitly banning correct answers from the answer choices creates a clear mental separation for the model. It's not about repetition — it's about framing.

---

## Stack decisions

| Choice | Why |
|--------|-----|
| Node.js + Express | Minimal, no build step, runs anywhere |
| Groq (LLaMA 3.3 70B) | Free tier, <1s responses, excellent instruction following |
| Vanilla JS | Zero dependencies, loads instantly, no bundle |
| localStorage | Simple persistence, works offline, no backend DB needed |

---

## What I'd do with more time

1. **Multiplayer rooms** — shared lobby where 4 players race to pick the same wrong answer
2. **Daily question** — one shared question everyone answers, results revealed at midnight
3. **Wrong Answer Hall of Fame** — community voting on the funniest wrong answers ever generated
4. **Difficulty levels** — Easy (obviously wrong) → Hard (dangerously plausible)
5. **Voice mode** — dramatic game-show TTS with a countdown timer
6. **Eval suite** — automated testing across 100 topics to measure correct-answer contamination rate and tune prompts further
7. **Export to Kahoot** — generate a full wrong-answers-only quiz deck

---

## Prompt engineering philosophy

The core challenge: LLMs are trained to be helpful and accurate. Getting one to **commit fully to being wrong** requires working with the model's architecture, not against it.

The solution: **persona + named constraint + structural separation**.

- Give the model a *role* (quiz show host) with *sacred rules* (not suggestions)
- Name the constraint like a mode (`WRONG_ANSWERS_ONLY`) not a request
- Separate wrong content (answers) from true content (fun fact) structurally in the JSON
- Use temperature 1.1 for creative wrongness without losing coherence

This generalizes: any time you need an LLM to consistently violate its default behavior, a named system-level constraint outperforms repetition in the user turn by a wide margin.
