# Character sprite generation

This workflow records the user's instructions from 2026-10-27. It replaces the older self-review, face-only, and iterative image-repair workflows. Apply it to future character packs unless the user changes it.

## Reference graph: keep it shallow

For a new neutral, use the character's **official transparent portrait as the sole image reference**. The installed sources are normally:

```text
/Users/alexachan/Documents/ChatGPT/Test/SillyTavern/data/default-user/characters/<Character>/Official Art/neutral.png
```

Verify the path and inspect the source before using it. Copy it without alteration into the run's `references/<Character>/official.png`, recording the original path and SHA-256. Internet research may inform the prompt, but do not replace the installed Official Art portrait with generated artwork or an arbitrary online image.

The allowed reference graph is:

```text
official portrait -> neutral candidate -> user-approved neutral -> expression
```

- New neutrals use the official portrait. Do not feed a previous generated neutral candidate, repair, expression, contact sheet, or generated proportion guide back into the image generator.
- Expressions use **only the explicitly approved neutral** as their image reference. Do not include the official portrait. Every expression independently starts from that same approved neutral so the character's proportions remain consistent.
- Never use one expression as the reference for another. Never make repair chains such as neutral -> repair -> repair or expression -> repair -> repair.
- If the user reports a defect in an unapproved neutral, revise the **prompt** and regenerate from the **official portrait**. Do not use the defective candidate as an input.
- If the user reports a defect in an expression, revise the **prompt** and regenerate from the **approved neutral only**. Do not use the defective expression as an input.
- If the user reports a defect in an approved neutral itself, treat its approval as revoked, regenerate from official art, and wait for approval of the replacement.

The user can explicitly authorize additional references for a particular character or run. Record the request, each reference and its hash, and the purpose of each image; do not extend the exception to other characters. On 2026-10-31 the user supplied an in-game image alongside Faruzan's official portrait for her replacement neutral, and authorized Ganyu's approved neutral plus official portrait for Ganyu's expressions. For Ganyu, the neutral guides compact proportions and rendering; the official portrait supplies identity and costume detail. Each expression still starts independently from those authorized references.

Generated images are terminal candidates, not evolving source artwork. Preserve rejected attempts for provenance, but exclude them from all subsequent input lists.

## User review and approval

Generate and present neutral candidates first, then **stop and wait for the user to approve them**. Approval is per character and per exact candidate file/hash. Record the approving message or a concise faithful quotation in `run.json`. A restart from square one resets prior approvals.

The user is the visual reviewer. Do not independently search generated artwork for eye, finger, anatomy, costume, style, or other visual errors, announce self-diagnosed defects, automatically repair them, or reject/regenerate candidates on your own. Present the outputs as candidates without claiming that they passed visual QA. Let the user identify any corrections.

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
- Specify coherent **left and right hands separately when a pose depends on handedness**. Each hand has one thumb on its anatomically correct side and four fingers connected to one palm and wrist. A thumb must not be duplicated or attached where a finger belongs. Where digits are visible, request clearly separated silhouettes and a believable palm orientation. Do not require hidden digits to be unnaturally displayed merely to make them countable.
- Specify exactly two legs and two feet belonging to one pelvis. For poses prone to overlapping legs, use an uncomplicated stance with feet separated or only slightly staggered; do not let crossed legs, stockings or coat tails read as an additional limb.
- Give the face one coherent mouth with a simple readable lip shape. For disgust, a small closed displeased mouth or restrained nose scrunch is preferable to a twisted open mouth, extra lip contours or exaggerated teeth.
- Heart alternates need **both eyes visibly open** and filled heart-shaped pupils clearly placed inside the retained irises. State the actual pupil colour. They are pupils, not catchlights, eye replacements or floating symbols. Keep these instructions out of ordinary expression prompts.
- These are construction choices for new prompts. If the user flags a result, record the exact reported defect, change the pose description and prompt as needed, and regenerate independently from the approved neutral only. Never feed the defective sprite back into generation.

The active Zhongli pack is an explicit exception to the default 22-file list: the user removed `love-1` and `desire-1`. Keep only `love.png` and `desire.png` for those emotions, for 20 active Zhongli sprites. Do not regenerate or reintroduce his heart alternates unless the user explicitly requests them. Removed files may remain in historical raw/provenance archives, but never in active sprite folders, current previews or delivery packs.

## Eyes and heart alternates

Ordinary expressions use the character's normal pupils. Put heart-pupil instructions **only** in `love-1` and `desire-1` prompts.

- Preserve each original iris and its colour/detail; change only the pupil shape.
- For a character with multicoloured irises, make the heart pupils **white**. Furina uses this rule.
- Otherwise specify a lighter shade in the original eye-colour family, such as pale violet for Raiden, pale amber-gold for Zhongli, and pale rose-pink for Sigewinne.
- For the 2026-10-31 Faruzan, Ganyu, and Jahoda heart alternates, the user requested **white** hearts as a run-specific exception. Their accepted prompts called for one solid, clearly visible white heart-shaped pupil centered within each open eye's intact coloured iris, retaining the iris outline, shading, and a visible coloured border. Faruzan's accepted `love-1` prompt explicitly requested larger hearts filling much of the irises; Jahoda's specified both eyes and clarified that the hearts are pupils rather than highlights. These are useful prompt patterns, not evidence that every generated result will match them or a blanket colour change for other characters.
- The user accepted Faruzan's earlier white-heart `desire-1` and asked that it be kept while other heart alternates were revised. Preserve approved exact files unless the user requests their replacement. Jahoda's `desire-1` was not generated: the image service rejected repeated attempts, including a modest fully clothed prompt. Record such failures and leave the file missing rather than presenting it as approved.
- Do not autonomously inspect or regenerate eyes. The user will report issues.

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

Keep exact prompts, actual tool arguments/reference paths, raw result paths, selected output hashes, the approval state, and any non-generative framing transform. Use the installed imagegen skill and built-in `image_gen`, one asset per call. Store each returned raw generation before proceeding. Do not silently substitute another generation method.

Do not schedule expression calls ahead of approval. If interrupted or resumed, read `run.json` and inspect which files actually exist before continuing. Approval must be explicit; never reconstruct it from file names or prior agent claims. Check that older background batches are stopped before a restart, and never import late outputs into the new run.

The established pack has these 22 filenames unless the user requests a different set:

```text
neutral annoyance smug confusion love excitement joy fear pride desire
anger grief sadness disgust disappointment relief admiration gratitude
embarrassment caring love-1 desire-1
```

Provide the individual PNGs, full-body and face sheets, archives, sources, prompts, and manifest when the approved packs are complete. Do not install into live SillyTavern until the user asks. Installation is separate from artwork generation.
