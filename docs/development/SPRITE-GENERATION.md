# Character sprite generation

This workflow records the user's instructions from 2026-10-27, updated on 2026-11-05 to allow user-directed markup editing to correct mistakes. It replaces the older self-review and face-only workflows. Apply it to future character packs unless the user changes it.

## Reference graph and markup corrections

For a new neutral, use the character's **official transparent portrait as the sole image reference**, unless the user specifies another source. The installed sources are normally:

```text
/Users/alexachan/Documents/ChatGPT/Test/SillyTavern/data/default-user/characters/<Character>/Official Art/neutral.png
```

Verify the path and inspect the source before using it. Copy it without alteration into the run's `references/<Character>/official.png`, recording the original path and SHA-256. Internet research may inform the prompt, but do not replace the installed Official Art portrait with generated artwork or an arbitrary online image.

The default reference graph for new assets is:

```text
official portrait -> neutral candidate -> user-approved neutral -> expression
```

- New neutrals use the official portrait unless the user specifies another reference, such as model art. Previous generated candidates, repairs, expressions, contact sheets, and generated proportion guides are not references for a fresh neutral.
- New expressions use **only the explicitly approved neutral** as their image reference, unless the user has authorized other references. Do not include the official portrait by default. Every new expression independently starts from that same approved neutral so the character's proportions remain consistent.
- Never use one expression as the reference for a different expression. Markup correction of the same asset is allowed as described below.
- If the user reports a defect in a neutral or expression, a targeted markup edit of that exact candidate is allowed. A fresh regeneration remains available: use the authorized source art for a neutral, or the approved neutral for an expression.
- If the user reports a defect in an approved neutral itself, treat its approval as revoked. Whether corrected with markup or regenerated, the replacement neutral needs explicit approval before it can be used for expressions. Preserve existing packs unless the user requests their replacement.

### User-directed markup editing

On 2026-11-05 the user authorized markup editing to fix mistakes, replacing the blanket ban on using generated candidates as correction targets. This authorization applies to future sprite work; a separate reference exception is not needed for each correction.

```text
neutral candidate + markup -> corrected neutral candidate -> explicit user approval
expression candidate + markup -> corrected expression candidate
```

- The user identifies the mistake or requests the correction. Do not autonomously inspect candidates for visual defects, start repairs, or treat an edit as visually approved.
- Use the exact candidate being corrected as the edit target. Supply a separate transparent annotation layer aligned to that target, with the same width and height; keep the underlying candidate unaltered. A user-provided annotated image may guide preparation of this layer.
- Describe the requested correction and the identity, proportions, costume, rendering, transparency, and framing to preserve. The annotation layer is editing guidance, not a new character, style, or proportion reference. Additional content references still require user authorization.
- Successive markup corrections to the same asset are allowed when needed to address the user's reported mistakes. Keep them within the requested correction scope; do not automatically start a repair loop or turn an edited expression into a source for other emotions.
- Preserve every original and correction as a versioned file. Record the user's feedback, parent target path/hash, markup path/hash, exact prompt, actual tool arguments, returned raw output, output hash, and approval state in `run.json`.
- A corrected neutral is a new exact candidate and always needs explicit approval before expression generation. Approval of its parent does not transfer. Present corrected expressions for user review as candidates too.
- Use a tool that actually supports markup input. If that capability is unavailable, report the limitation; do not claim an ordinary prompt edit was markup-guided. A fresh regeneration must use the default reference graph above.

The user can explicitly authorize additional references for a particular character or run. Record the request, each reference and its hash, and the purpose of each image; do not extend the exception to other characters. On 2026-10-31 the user supplied an in-game image alongside Faruzan's official portrait for her replacement neutral, and authorized Ganyu's approved neutral plus official portrait for Ganyu's expressions. For Ganyu, the neutral guides compact proportions and rendering; the official portrait supplies identity and costume detail. Each expression still starts independently from those authorized references.

On 2026-11-05, after reporting eye distortions in Mizuki's expressions and suspecting the neutral, the user requested a fresh Mizuki neutral and authorized her in-game model as a secondary reference for every subsequent Mizuki expression. Once the replacement neutral is explicitly approved, use that neutral as the primary reference for proportions, rendering and acting, and the user's `Character_Yumemizuki_Mizuki_Game.webp` as a secondary reference for identity, eye design and costume. Each expression independently starts from those two sources; do not include prior expressions or the official portrait by default. The replacement neutral still needs its own approval.

The user further clarified that Mizuki's normal pupils are slight swirls. Describe a small, subtle swirl-shaped pupil within each intact iris, guided by the model, rather than a generic round pupil. Preserve readable iris boundaries and natural eyelid anatomy; the swirl is part of her ordinary eye design, not an emotion-specific effect. This clarification does not establish the cause of the earlier generation defects.

Generated images are review candidates. They may be edit targets for the user-directed markup corrections above, but are not general-purpose references for unrelated generations. Preserve rejected attempts for provenance and use them only when they are the specific correction target.

## User review and approval

Generate and present neutral candidates first, then **stop and wait for the user to approve them**. Approval is per character and per exact candidate file/hash. Record the approving message or a concise faithful quotation in `run.json`. A restart from square one resets prior approvals.

The user is the visual reviewer. Do not independently search generated artwork for eye, finger, anatomy, costume, style, or other visual errors, announce self-diagnosed defects, automatically repair them, or reject/regenerate candidates on your own. Present the outputs as candidates without claiming that they passed visual QA. Let the user identify any corrections. An explicit request for a particular visual audit and corrections authorizes that review within its stated scope. On 2026-11-05 the user requested vision review of Hu Tao's generated flower pupils against approved neutral v008, and eye-only corrections where they do not show matching five-petal blossoms. This exception does not authorize unrelated visual reviews or confer approval on corrected candidates.

Basic file handling may verify that a result was saved, that it is a PNG with an alpha channel, and which dimensions it has. These technical checks do not confer visual approval. A delivery failure or generation error should be reported as such.

## Character-specific prompts and acting

Prompts are adaptable drafting aids, not ground truth. Rewrite them as much as necessary for the character, the user's feedback, and the requested emotion. Avoid applying a generic script mechanically to every character.

- Preserve official identity, skin tone, hair, costume, accessories, and requested body type. Describe proportions in words; do not add generated body images as references.
- Use the project's Medium Female, Medium Male, Tall Female, Tall Male, and Small Female categories. The user may call the tall categories "large". Medium characters should retain the intended petite anime build; Small Female has the compact roughly four-head build. Character-specific feedback takes priority over generic head counts. Furina's original long-legged silhouette was explicitly accepted.
- Paimon uses a custom tiny floating body, smaller than Small Female. Preserve her compact official proportions, floating halo and starry cape; her feet dangle in midair rather than standing on the ground. The user requests fuller, rounder thighs with soft childlike contours while keeping her legs short and overall scale tiny. For the Paimon/Venti/Mika run, use only the user's Paimon attachments 2–6; attachment 1 was explicitly excluded as unofficial. Venti and Mika use petite Medium Male proportions.
- Paimon's neutral should have open palms. The user rejected the attempted relaxed fists and requested experiments with other open-hand positions. Preserve this preference when revising her neutral; do not reintroduce fists as an anatomy workaround.
- Give the neutral a character-appropriate relaxed pose. For expressions, change **pose, body language, and gesture as appropriate to the emotion**. Do not lock all poses and change only the face. Maintain identity, anatomy, costume, rendering, and a useful full-body frame while allowing genuine acting.
- Keep each alternate at least as petite as the approved neutral, maintaining its general body proportions without elongating the torso or legs. Different poses need not preserve the exact silhouette.
- Make related emotions distinct in both face and acting. For example, Ganyu's accepted `love-1` prompt asked for an openly joyful smile and raised brows; her `desire-1` asked for a subtler, wistful expression, softened but open eyes, blush, an averted gaze, and a different body angle. Adapt the acting to the character rather than repeating one generic pose.
- For an expressive, romantic `desire` where appropriate to the character, the user called Lynette's 2026-11-01 candidate perfect after finding an earlier version too subdued. Its prompt asked for openly yearning affection, noticeably flushed cheeks, parted lips, raised inner brows, an intent hopeful gaze toward the viewer, and a slight forward lean in eager anticipation, with one hand near her heart and the other relaxed. It also requested acting clearly legible at small size, tasteful and fully clothed, with a varied pose and the approved neutral's petite proportions. Treat this as a useful acting example, adapting intensity and gesture to the character; preserve the childlike-character restriction below.
- Faruzan's replacement neutral was approved with her skirt and back panels hanging naturally down, guided by her in-game appearance; avoid the perpetually windblown clothing from her official portrait in her expressions.
- Keep all affection and anticipation appropriate to the character. For Sigewinne and other childlike designs, use friendship, treats, care, or adventure rather than suggestive acting.
- Request true transparency and the complete silhouette, including headwear, hair, hands, accessories, and shoes. Aim for 92–96% visible height with roughly 2–4% top and bottom padding. Do not copy blank margins from older lineup guides or stretch anatomy to fill a canvas.
- No scenery, UI, labels, explanatory footnotes, watermark, floating effects, or baked ground shadow on sprites or previews.

### Anatomy and expression prompting after user-reported defects

Use the user's 2026-10-27 review as prompt-design feedback for all future sprite requests, not as permission for autonomous visual QA:

- Choose simple, readable hand gestures that suit the emotion. Prefer hands near the torso and nearly in the image plane. Avoid reaching a palm toward the camera, extreme foreshortening, tangled/clasped hands, ambiguous finger curls, and elaborate finger splaying when a simpler gesture communicates the same emotion.
- Specify **left and right hands separately when a pose depends on handedness**, using ordinary gesture descriptions. After testing prompts without hand-anatomy guidance on 2026-11-05, the user requested its return with different wording. Use concise, pose-aware descriptions of a complete human hand: a palm, four fingers and a separate opposable thumb. Describe natural articulation and separation from sleeves or clothing when relevant, adapting visibility to the gesture. Neither wording experiment establishes a verified cause of generation defects.
- Specify exactly two legs and two feet belonging to one pelvis. For poses prone to overlapping legs, use an uncomplicated stance with feet separated or only slightly staggered; do not let crossed legs, stockings or coat tails read as an additional limb.
- Give the face one coherent mouth with a simple readable lip shape. For disgust, a small closed displeased mouth or restrained nose scrunch is preferable to a twisted open mouth, extra lip contours or exaggerated teeth.
- Heart alternates need **both eyes visibly open** and filled heart-shaped pupils clearly placed inside the retained irises. State the actual pupil colour. They are pupils, not catchlights, eye replacements or floating symbols. Keep these instructions out of ordinary expression prompts.
- These are construction choices for new prompts. If the user flags a result, record the exact reported defect and use a targeted markup correction, or revise the pose description and prompt and regenerate independently from the approved neutral. A defective sprite may be used only as the target of its own user-directed markup correction.

The active Zhongli pack is an explicit exception to the default 22-file list: the user removed `love-1` and `desire-1`. Keep only `love.png` and `desire.png` for those emotions, for 20 active Zhongli sprites. Do not regenerate or reintroduce his heart alternates unless the user explicitly requests them. Removed files may remain in historical raw/provenance archives, but never in active sprite folders, current previews or delivery packs.

## Eyes and heart alternates

Ordinary expressions use the character's normal pupils. Put heart-pupil instructions **only** in `love-1` and `desire-1` prompts.

- Preserve each original iris and its colour/detail; change only the pupil shape.
- On 2026-11-05 the user clarified that heart pupils should **always be white**, superseding the older lighter-eye-colour rule. Use one solid white heart pupil in each open eye, retaining the original coloured iris and its visible border. This applies to future heart variants for all characters; preserve historical files unless their replacement is requested.
- Before the universal white-heart rule above, the 2026-10-31 Faruzan, Ganyu, and Jahoda heart alternates used **white** hearts as run-specific exceptions. Their accepted prompts called for one solid, clearly visible white heart-shaped pupil centered within each open eye's intact coloured iris, retaining the iris outline, shading, and a visible coloured border. Faruzan's accepted `love-1` prompt explicitly requested larger hearts filling much of the irises; Jahoda's specified both eyes and clarified that the hearts are pupils rather than highlights. These remain useful prompt patterns, not evidence that every generated result will match them.
- The user accepted Faruzan's earlier white-heart `desire-1` and asked that it be kept while other heart alternates were revised. Preserve approved exact files unless the user requests their replacement. Jahoda's `desire-1` was not generated: the image service rejected repeated attempts, including a modest fully clothed prompt. Record such failures and leave the file missing rather than presenting it as approved.
- Do not autonomously inspect or regenerate eyes unless the user explicitly requests that review and correction within a stated scope.

## Run layout and records

Use a new, descriptive directory under `art/sprites/` for each restart. Do not overwrite old runs or completed packs.

```text
art/sprites/<run>/
  run.json
  references/<Character>/official.png
  prompts/<Character>/neutral-v001.txt
  candidates/<Character>/neutral-v001.png
  raw/<Character>/...
  sprites/<Character>/<emotion>.png
  previews/...
```

Keep exact prompts, actual tool arguments/reference paths, raw result paths, selected output hashes, the approval state, and any non-generative framing transform. Use the installed imagegen skill and built-in `image_gen` by default, one asset per call. When the user explicitly requests model controls or markup editing unavailable in the built-in tool, use a capable route permitted by that skill and record the actual method and settings. If no capable route is available, report the blocker rather than substituting a different model or method. Store each returned raw generation before proceeding. Do not silently substitute another generation method.

Do not schedule expression calls ahead of approval. If interrupted or resumed, read `run.json` and inspect which files actually exist before continuing. Approval must be explicit; never reconstruct it from file names or prior agent claims. Check that older background batches are stopped before a restart, and never import late outputs into the new run.

For remaining characters, the user requested this reduced ten-file set on 2026-11-03. Use the existing approved neutral and generate the other nine expressions; vary pose and gesture to fit both the emotion and the character, including restrained, character-appropriate acting for desire:

```text
neutral joy annoyance confusion love desire excitement sadness fear embarrassment
```

Earlier packs used these 22 filenames. Preserve historical packs unless the user requests a change:

```text
neutral annoyance smug confusion love excitement joy fear pride desire
anger grief sadness disgust disappointment relief admiration gratitude
embarrassment caring love-1 desire-1
```

Provide the individual PNGs, full-body and face sheets, archives, sources, prompts, and manifest when the approved packs are complete. Do not install into live SillyTavern until the user asks. Installation is separate from artwork generation.
