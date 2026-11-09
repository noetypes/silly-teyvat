# Classifier and decision models

Silly Teyvat makes several small model requests besides the roleplay reply itself:

| Request | Settings | What it sends | What it needs back |
| --- | --- | --- | --- |
| Scene CG classification | CG & Audio → Classifier (Main API, Connection profile or WebLLM) | The whole reply plus each scene's label and description | One label, or "None of the above" |
| Teyvat Choices | Dialogue → Choices connection (Main API or a profile) | The last ten messages and the character's personality | A JSON array of three short replies |
| Expression classification | SillyTavern's Character Expressions settings | One dialogue page | One emotion label |

These are short-input, tiny-output tasks. Speed and following the output format matter more than
writing quality, so a cheap "flash" or "lite" model is usually the right choice. Reasoning
("thinking") models add latency and cost without helping; leave **Skip reasoning** on for the Main
API, or pick a non-reasoning model for a profile.

## Measured on this project (2026-10-30)

Fifteen sample replies were classified against the bundled birthday scenes for Klee, Hu Tao,
Nahida, Venti, the Raiden Shogun, Kazuha, Yoimiya and Albedo. Each character had one matching
reply and most had one that should match nothing.

| Path | Model | Correct | Typical time |
| --- | --- | --- | --- |
| Main API | DeepSeek `deepseek-flash` (V4.1 Flash) | 15/15 | 0.7–1.3 s |
| Connection profile | DeepSeek `deepseek-flash` | 15/15 | 0.6–1.2 s |

Teyvat Choices returned three valid, in-character replies through both paths in about 1–1.4 s.

## Recommendations

Prices are per million input / output tokens, from third-party trackers in August–October 2026.
Check the provider's own pricing page before budgeting. One CG check is roughly 600–2,000 input
tokens and fewer than 10 output tokens, so even the dearest option below costs well under a tenth
of a cent per check.

1. **DeepSeek V4.1 Flash (`deepseek-flash`)**, about $0.15–0.30 / $0.60–1.20 (off-peak and peak
   rates are reported). It is already connected here, scored 15/15 and answers in about a second.
   It is the simplest choice: create a second profile with the same key so Choices and CGs stop
   competing with roleplay for the main connection.
2. **Gemini 2.5 Flash-Lite**, about $0.10 / $0.40. A very cheap, fast option for label picking and
   routing, and it follows "answer with one label" well. Gemini 3.1 Flash-Lite (about
   $0.25 / $1.50) is newer and stronger for Choices, where the wording matters.
3. **GPT-5 nano**, about $0.05 / $0.40. Among the cheapest major APIs. It is good for CG labels;
   check that it doesn't spend tokens reasoning before it answers.
4. **Claude Haiku (latest)** through Anthropic or OpenRouter. It costs more per token than the options
   above, but it writes noticeably better in-character Choices and is reliable with strict output
   formats. Use it if Choices quality matters more than cost.
5. **WebLLM (local, free)**. It is already a classifier option for CGs. It works offline and costs
   nothing, but it is slower on first load and less accurate with long scene descriptions. It is
   best for a desktop with a good GPU.

Any of these can be used through OpenRouter as a single SillyTavern Chat Completion profile. In
Silly Teyvat settings, choose the profile under **CG & Audio → Classifier → Connection profile** and
**Dialogue → Choices connection**.

Sources: [Morph – cheapest LLM APIs](https://www.morphllm.com/cheapest-llm),
[Morph – Gemini API pricing](https://www.morphllm.com/gemini-api-pricing),
[DeepSeek V4.1 Flash pricing (pricepertoken)](https://pricepertoken.com/pricing-page/model/deepseek-deepseek-v4.1-flash),
[DeepSeek price tiers (apiyi)](https://docs.apiyi.com/en/live/2026-08/deepseek-price-peak-tier),
[Gemini 3.1 Flash-Lite pricing](https://anotherwrapper.com/llm-pricing/gemini-3.1-flash-lite-preview),
[Gemini 2.5 Flash-Lite pricing](https://anotherwrapper.com/llm-pricing/gemini-2.5-flash-lite).
