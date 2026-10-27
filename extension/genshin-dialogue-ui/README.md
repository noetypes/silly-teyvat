# Silly Teyvat 1.26.2: Cleaner Official Art

- 72 Official Art portraits that had been cut out from a white background now use the genuinely transparent "Character Portrait" files from the genshinimpactresources blog's Google Drive folder. Aether and Lumine also get Official Art sets.

# Silly Teyvat 1.26.1: Official Art registration

- Official Art sets and the Genshin tag are now registered once the character list is loaded (on app ready and on every chat change), not only at startup.

# Silly Teyvat 1.26: Official Art, wardrobe search & Genshin tag

- **Official Art sets.** 119 playable characters have an **Official Art** sprite set whose neutral sprite is their official transparent portrait (Genshin Impact Wiki portraits, sized to at most 2000 px). Older portraits came on plain white, so their background was keyed out; the art is otherwise unedited and effect-free. Aether, Lumine and the Manekins have no wiki portrait and were skipped. Forgetting a set keeps it forgotten.
- **Trimming everywhere.** Empty sprite space is also trimmed in the Wardrobe preview and expression thumbnails.
- **Wardrobe.** New character search; **Hide non-Genshin** (on by default) hides cards without the "Genshin" tag; the enlarged selected portrait is no longer cut off.
- **Genshin tag.** Every Genshin card carries a "Genshin" tag, also added to SillyTavern's tag list.
- **Cards.** Asterisks were removed from greetings, and all enemy cards have a profile picture: their sprite on a flat element colour.
- **Settings.** The Silly Teyvat staging toggle is aligned again.

# Silly Teyvat 1.25: Groups core, player-only travel

- **Groups are the travel system.** The virtual party and its setting are gone. One hidden group per chat is updated in place, so guest replies use SillyTavern's own group generation and can be regenerated.
- **Player-only location changes.** The model no longer changes your location: the background classifier and its settings are removed. Teleport, region and location pickers are the only ways to move.
- **Attack toggle.** It now sits beside the Teyvat Choices refresh button, or in the Choices position when Choices is off, so it no longer covers the arrows.
- **Settings menu.** The tab selector scrolls with the page instead of following it.
- **Character cards.** Prompt-style instructions to the AI were removed from the bundled cards' description, personality and scenario, and their system prompt and post-history instructions were cleared.

# Silly Teyvat 1.24: Sprite trimming & travel mode

- **Sprite trimming.** Transparent padding around sprites is cropped using the combined opaque area of every expression in a folder, so figures match their body model and all expressions keep the same relative size. Turn it off with **Trim empty sprite space**.
- **Travel companions setting.** Choose the virtual party (default) or a single hidden group per chat that is updated in place and reopened when you return to the source chat. Groups allow regenerating guest replies.
- **New group start.** A new group with no chat or location history starts at a random member's home location.

# Silly Teyvat 1.23: Virtual travel party

- **No more journey groups.** Characters join and leave a party stored in the chat itself, so one chat file keeps the whole history. Older "Teyvat journey" groups are deleted once on first launch.
- **Guest replies.** After the main character answers, each guest replies in turn (one extra model call per guest).
- **Wardrobe.** Characters not from Genshin (such as Aloy) are hidden unless you tick **Show characters not from Genshin**.
- **Traveler icon.** Click the avatar in the Silly Teyvat menu to switch between Aether and Lumine, and to activate the persona of that name.

# Silly Teyvat 1.22: Persona wardrobe

- Your active persona is the first portrait in the Wardrobe, marked **You**. The separate AI character card remains selectable too.
- **Profile** edits the native persona name, title, description, lorebook, prompt position, depth, role and portrait. Element, region and body model are saved for that persona.
- **Outfits** and **Expressions** manage the persona's sprite sets, uploads, custom expressions, individual sprite sizes and audio. Select a sprite and choose **Use this expression** to display it. **Staging** controls that persona's visibility, scale and placement.
- Each persona keeps its own settings. Changing personas in Persona Management updates the first Wardrobe portrait and restores that persona's outfit and expression automatically.
- Persona CGs use the separate scene classifier. Personas are presentation entries, never fake AI cards or group members.
- Aether and Lumine's character cards now use the new 22-sprite packs in their default folders. Their user personas use separate copies in `Aether/Traveler Persona` and `Lumine/Traveler Persona`.

# Silly Teyvat 1.21: Dice physics, staging & polish

- **Elemental dice.** The Roll Phase is now a rigid-body simulation: dice are tossed onto the table, bounce under gravity, knock into each other and the rim, roll to a stop on their rolled face, then sort into the row. Each impact plays a synthesised clack, knock or chime (Combat › Dice sounds, using the CG & Audio volume). No recorded game audio is bundled.
- **Reroll Phase.** After the dice settle, unmatched dice are preselected; tap dice to change the choice, then Reroll. Only the chosen dice are thrown again, bouncing off the kept ones, and the damage is rescored. One reroll per attack.
- **Attack toggle.** The sword is now a labelled Attack pill that glows ember-orange while armed.
- **Narration stays readable.** Attack, reaction and teleport narration is held on screen when the next reply starts streaming, until you advance past it. Sending your own message always moves the view on.
- **Map region selector.** A region pill at the top middle of the map shows where you are. Choose a nation, or Teyvat, and the camera glides there (after Kongying Tavern's area switcher).
- **Body-model staging.** A character's Body model sets their relative sprite height (small female → tall male). The tallest model on screen always gets the full Tallest sprite height, so a small model alone on screen fills it; others stand shorter against the tallest. Per-character scale still applies on top.
- **Character screen.** Tabs are named for what they hold: Profile, Staging, Expressions, Scenes, Outfits, Backgrounds. Party members are listed first, followed by a divider. Portraits are zoomed so card frames never show inside the circle, the roster no longer fades at the edges, and the pedestal shows only under a visible sprite.
- **Character cards.** Genshin card art is shown whole, centred under its name, in the character list, the character editor, Recent Chats, group member lists and group avatars (which fan out like a hand). The card's own frame is its border and the tilted back card adds depth. Other avatars get a frame the size of the front card.
- **Paimon Menu.** A solid slate side panel with a crisp edge over a lighter dim, instead of a long fade.
- **Sprite sizes everywhere.** Wardrobe size changes (overall, character and per-sprite) also apply to earlier messages as you scroll back; saved scenes are not rewritten.
- **Top-right icons.** Larger, more tightly spaced, and in SillyTavern's own order (AI Response Configuration → Character Management).
- **Polish.** The map's waypoint panel is solid instead of fading out, and Silly Teyvat's switches no longer show SillyTavern's check marks.

# Silly Teyvat 1.20: World map & minimap

- **Full-screen map.** Edge-to-edge Teyvat with a slim, collapsible left panel (region chips, waypoint list, World scale and Saved journeys as compact rows). The title, add-waypoint and current-location tools sit top-left/top-right, with a round cream close button.
- **Waypoint card.** Selecting a waypoint flies to it and opens a right-side detail card with artwork, region, distance, residents, wilderness encounters and a cream **Teleport** pill. On phones in portrait it becomes a bottom sheet.
- **Map controls.** Vertical zoom slider with + / − at the bottom right. A player arrow marks your current waypoint, and the selected waypoint glows. Leaflet / Kongying Tavern / HoYoverse credits stay at the bottom left.
- **Minimap.** Gold-rimmed circular HUD minimap with an N marker, player arrow and view cone, inner vignette and the location name beneath. On wide screens it sits beside Paimon; on narrow phones it sits below the HUD row. Tapping it opens the map with a circular zoom-out reveal.
- **Teleport & arrival.** Teleporting washes the screen to light with a waypoint glyph. Arriving in a new region shows a Roll Phase–style region banner.
- **Motion.** The map, panel and card animate open and closed. Reduce motion (or the OS setting) turns this off.

# Silly Teyvat 1.19: Genshin interface pass

- **Paimon Menu.** The top-left Paimon icon slides in a Genshin-style left panel: Traveler profile and current location, a Silly Teyvat on/off switch, a round-icon grid (Auto, Review, Wardrobe, Map, CG Frame, Chat Box, Hide UI) and Settings in the bottom bar. Click outside, press Escape or tap Paimon again to close.
- **Roll Phase.** Attacks open a full-screen Genius Invokation roll: dice are thrown onto the table, tumble and bounce, then glide into a sorted row (Omni first, then your party's elements). Matching dice glow and show their damage. A party summary credits each die to an ally of that element, counts up each character's damage, then drains the enemy's health bar with a white lag segment. The narrator message records who dealt what.
- **Enemy HUD.** Boss-style health bars with element-coloured damage numbers and a hit shake.
- **Wardrobe → Character screen.** Party portraits along the top, a tab rail, the sprite on an element-tinted pedestal and a detail panel. Attributes = card properties; Weapon = stage scale, placement and expression timing; Artifacts = expressions and sprite audio; Constellation = scene CGs; Outfits = sprite sets; Waypoints = backgrounds.
- **Settings.** Tabbed (Dialogue, Stage, CG & Audio, World, Combat) with label-and-control rows. Every setting is kept; only layout and labels changed.
- **Motion.** Open/close animations for the menu, dialogs, drawers, popups, choices and panels. Reduce motion (or the OS setting) turns them off.
- **Teyvat Slate theme 1.19.** HYWenHei throughout, navy glass panels with a fine gold frame, cream pill buttons with circled ✓ / ✕ on dialogs, a fading top bar and gentle drawer/popup motion.

# Silly Teyvat 1.18.0 + Teyvat Slate

## Speak and attack with the sword toggle (1.18)

The sword below the dialogue arms an attack without using up a reply choice. Turn it on, then type a message or select a suggested reply. Your words are sent unchanged; the elemental dice resolve next, and the normal AI response receives both the dialogue and the resulting health facts. There is no additional injury-generation request for the same send.

The sword stays on for subsequent messages in that encounter. Turn it off to speak without attacking. If several enemies are present, select the target next to the sword. The toggle resets when you switch chats, start a different encounter, disable the extension or lose the selected target. Stopped and stale sends cannot apply damage to another scene, and re-rendering an old message never repeats its attack. A defeated enemy is removed and cannot provide another reply.

## Opening solitude, encounters and enemy sprites (1.17)

A new solo card starts with only that character at the first location. An explicit opening lock prevents other residents from entering the party or appearing in cached sprite scenes before the first departure, even while catalogs or encounter state are loading. Leaving releases the lock; returning uses the normal encounter rules.

**Default encounter chance (%)** now supplies both tied-character rolls and the default wilderness enemy roll. The old bundled 40% on wilderness waypoints inherits this value. A waypoint can opt into **Use a custom chance for this waypoint**, preserving independent local rates. Previously customized non-40% local rates are retained. A 100% chance with a valid enemy pool guarantees an enemy on the next arrival. Enemy encounters also work when friendly location encounters are switched off. The current visit never rerolls just because settings changed.

The 20 enemy cards have 40 new transparent sprites, generated by GPT-6.1 Terra High agents through the built-in imagegen tool and installed in their native sprite folders. Enemy action paragraphs show `attacking`; all other enemy pages show `neutral`. Enemy poses bypass emotion classification, including narration and group scenes. Explicit actions, rather than anger, threats or player text, control the pose. History preserves the selected pose. See [combat behavior](COMBAT.md#enemy-action-sprites) and the separate enemy sprite pack for art and prompts.

## Supplied dice model (1.16.1)

Elemental rolls now use the supplied textured Genius Invokation glTF model. All eight face orientations match their rolled elements. The model, textures and Three.js renderer are bundled locally, with reduced motion, responsive placement and a text result fallback. [Details and provenance](COMBAT.md#dice-research-and-asset-provenance).

## Wilderness and elemental combat (1.16)

Wilderness waypoints can spawn a configured enemy at an editable chance. Choose enemy pools from the map or Backgrounds, and set card roles, elements, body models, regions, HP and death messages in Sprite Wardrobe. Enemy cards and tied-character selectors are kept separate. Forty existing wilderness waypoints have starter pools and a 40% chance.

Sending a message with the **sword toggle** armed rolls one 3D elemental die per playable ally plus two. Matching elements and Omni deal configurable random damage. Enemy health and attack facts are saved, surviving enemies react through their own cards, and a death message precedes unloading a defeated enemy. Ordinary conversation remains available. [Setup, behavior, metadata exceptions and dice provenance](COMBAT.md).


## Arrival scenes and encounters (1.15)

Opening a character card or starting a solo chat puts only that character at their default location. Other tied residents stay off stage and speak no greetings. Leave the area and return to meet them.

Each tied character has an independent encounter roll on arrival. The default chance is 40%. Set **Encounter chance per character (%)** in Silly Teyvat settings, or turn off **Roll separately for each location character on arrival** to meet everyone. Rolls happen before the companion questions, are saved per visit, and are discarded if Teleport is cancelled. Redraws, reopening a saved journey, and changing the rate do not reroll an existing scene.

A visit produces at most one arrival reply. The card’s written greeting is used only when the player travels without character companions and meets exactly one resident at that resident’s default location. Otherwise one present resident generates a reply using the existing conversation, arriving companions and everyone in the scene. An empty encounter produces no resident reply. The last available character follows automatically if nobody would otherwise be available to speak.

**Assigned characters per location** defaults to 5. The picker displays used slots and rejects over-capacity moves without removing anyone from their previous place. Travelling companions do not use resident slots. Lowering the cap requires moving excess residents first. Seven bundled assignments were redistributed to appropriate meeting points; customized assignments are preserved, and Prune remains at Mondstadt Fountain Plaza.

Automatically created travel groups stay out of Character Management, including its pagination and folder listings. Each chat has one hidden group that is updated in place when characters join or leave, and is reopened when you return to the source chat. Groups made by earlier versions are deleted once on first launch. Open the world map and expand **Saved journeys** to resume one. Manual groups stay in the character selector.

Curly apostrophes and quotation marks retain HYWenHei’s original glyph outlines with proportional spacing. Message text and narration parsing are unchanged.


Opening a solo character card now starts at its default tied location. Group journeys keep their saved travel location. The home catalog fills only missing assignments, so your existing placements and defaults remain intact.

In **Silly Teyvat → Settings**, enable **Allow the main character to stay behind when teleporting** to choose who follows. Other companions are asked first. At least one enabled character must follow or be at the destination. The last available character comes along automatically. Cancel keeps all choices uncommitted. This setting is off by default.

Travel is saved as a native narrator message, for example: `Traveler and Xilonen travelled 1.00 km from Children of Echoes to Wangshu road.` Teleport and region changes record actual moves. Reopening a card at its starting location and reading old dialogue do not create travel records. These narrator messages remain in model history and hold the previous sprite scene.

**World scale** now lists only the selected region by default. Enable **Include the entire world in the World scale prompt** to include all regions. Both options are also available in the world map’s **World scale & companions** section. The full interactive map always keeps every waypoint visible; automatic location classification remains region locked.


A Genshin Impact inspired dialogue interface and matching SillyTavern theme for your fan VN. Gold speaker names, ivory dialogue, white HUD symbols, centered menus, suggested replies, text reveal and remembered sprite scenes.

## Install or update

Copy the complete `extension/genshin-dialogue-ui` folder into `SillyTavern/data/<your-user>/extensions/genshin-dialogue-ui/`, replacing the existing version. Keep that folder name: the extension is now called **Silly Teyvat** in the interface, while its folder and settings key stay compatible with earlier installations. Do not install a second copy under another name.

Refresh SillyTavern. Open **Extensions → Silly Teyvat** and enable dialogue view, or open the top-left Paimon menu and select the compass icon (**Silly Teyvat: On** for screen readers). **Alt+G** also toggles dialogue view. Opening or closing the menu does not change whether the extension is enabled. Select a character or group chat.

For matching native menus, import `theme/Teyvat Slate.json` using **User Settings → UI Theme → Import**, then select **Teyvat Slate**. The extension also works with other themes. An optional copy of the theme CSS is supplied for reference.

## Reading dialogue

- Each nonempty paragraph or explicit newline is a page. Blank lines are skipped. Screen wrapping does not create new pages. Code, tables and lists stay together.
- AI dialogue reveals from left to right, including previously generated messages you revisit. Your own messages appear instantly.
- During streaming, the current page grows as tokens arrive. Tokens appear at no more than your selected scrolling speed, even when the server streams faster. Text after a newline stays on the next page until you advance. Navigation never restarts at page one as new tokens arrive.
- Tap appearing text to finish revealing the current page. This reveals only text already received, and never exposes the next paragraph. Future streamed tokens resume at the selected speed; clicking does not make later tokens or pages instant.
- **Right arrow:** reveal the rest of the current page, then advance a page or message on the next press. **Left arrow:** previous page or message. **Centre down diamond:** final page of the latest message.
- **Tap fully revealed dialogue to advance** is on by default and can be turned off. Enter / Space work when the dialogue page has keyboard focus. Arrow keys work on navigation controls.
- **Text scrolling speed** sets 5–150 characters per second. Set it to 0 for instant text. Reduced motion disables sprite and interface motion; it does not override your chosen text speed.
- **Refresh arrow under the right edge of the dialogue box:** regenerate the latest character reply through your normal chat API. In a group it generates a fresh swipe for only the character who wrote that reply, keeping earlier group replies, the old variant and its saved scenes. It does not send or clear an unsent draft. Failed or canceled empty group generations restore the previous variant. It is disabled while generating, editing, offline or viewing an older reply, and hidden on player messages. Return to the latest character message to use it.
- **Auto** reads existing pages and stops during generation or at a reply choice. It never submits a message or asks the model to continue.
- **History** opens the native transcript for editing, swiping, copying and deletion. **Hide UI** hides the scene controls; Escape restores them. **Hide chat box** toggles the reply input and remembers your preference. The native Stop button appears at the dialogue box’s right edge during generation, in place of Regenerate, even when the input is hidden. With Hide UI active it remains available in the bottom-right corner. Regenerate and Stop share the arrows' size and alignment. The input has one rounded outer border, with focus highlighted on that container.

## Expressions and remembered scenes

Enable **Classify expressions and remember sprite scenes** in Silly Teyvat. It is on by default. Select your classifier and fallback in the native **Character Expressions** settings and install the character's sprites there as usual.

Choose the default **Decide sprites** mode in extension settings, or override it for a character in **Sprite Wardrobe → Character scale, placement & classification**. **Once per dialogue page** classifies each visited speech page. A streaming page becomes eligible at its newline or generation end. **Once per complete message** waits for the full response and classifies it once, then uses that same exact sprite across its dialogue pages. Native LLM / WebLLM classifiers wait until reply generation ends in either mode. Narration continues holding the last spoken scene. The visible scene holds its previous expression while classification is pending.

The page saves the exact chosen image, including numbered variants, with every visible character's position, size, layering, focus, opacity and shadow. Group pages retain the other characters while changing the speaker's expression. The scene is saved in the message's `extra.silly_teyvat` data and travels with a normal chat save/export. Back and forward restore saved scenes without classifying or rerolling them again. Swipes have separate caches; edited page text is classified again.

Player and system messages keep the last recorded character scene. An empty or unfinished new reply holds that scene until a character dialogue page is ready to classify. Narration also holds the last spoken scene.

Scenes begin being recorded when this feature is used. Earlier chats cannot recover arrangements that were never recorded. Their pages acquire saved scenes when first visited. Deleted sprite assets must still exist to display a saved image. Renaming through this wardrobe archives the old artwork so recorded scenes can still display it.

Silly Teyvat has its own native sprite staging, enabled by default. It loads enabled group members directly from their sprite folders and overrides, including on mobile and without native VN mode. It presents a saved scene over the native sprite layer, so background expression changes cannot overwrite the page you are reading. Classifier settings in Character Expressions remain unchanged. Turn off **Native sprite staging**, expression classification and narration handling together to restore the live native sprite view. Native background classification may still run independently.

## Native sprite staging and proportions

Open **Extensions → Silly Teyvat → Native sprite staging**. Prome VN's visual features informed these independent native controls. Prome does not need to be installed or enabled. World and character tint are not included.

- **Global sprite scale** multiplies every sprite's size. **Sprite height** sets its base share of viewport height.
- **Speaker focus** gently enlarges the current speaker and places that sprite in front. Adjust the focus percentage, transition time and easing. Optional inactive fading changes opacity without applying a tint.
- **Character drop shadows** have horizontal, vertical and blur controls. **Speaking shake** adds subtle motion while dialogue is revealing or generating. Reduced motion disables these animations.
- **Use character portraits when sprites are missing** provides an avatar fallback. Missing expression packs otherwise leave that member unstaged.
- **Limit visible group members** keeps the most recent speakers visible, with a configurable limit. Historical pages use the speakers known at that point in the conversation.
- **Show a persona sprite** loads a chosen native sprite folder and expression on a separate player layer. It never adds a fake character to the group or changes its membership.
- **Letterbox** adds horizontal or vertical bars with configurable thickness and color. Hide UI removes the bars as well.

In **Sprite Wardrobe → Character scale, placement & classification**, each character has a percentage scale, an optional horizontal position and a vertical offset. Select any sprite tile to set **Selected sprite scale (%)** for that exact file, including numbered variants. The total size is global scale × character scale × selected sprite scale. For example, global 100%, character 80% and sprite 125% give the original size. Speaker focus applies on top of that.

Character scale applies across outfits. Individual sprite scale is stored per folder and filename. Scale or placement changes update the visible recorded page and future scenes; earlier pages retain their saved sizes and positions for faithful replay. These settings and uploaded files should be copied together when moving servers.

## Narration

In **Extensions → Silly Teyvat**, enable **Narration handling**, then choose its trigger. It is optional and starts turned off.

- **No quotation marks:** each dialogue page without speech marks becomes narration. One response can alternate between spoken dialogue, narration and spoken dialogue again. Straight, curly, single and Japanese speech quotes count; apostrophes in contractions do not.
- **Keyword:** set an exact, case-sensitive marker such as `Narrator:`. The marker disappears from dialogue view and the rest of that line becomes narration. The next newline returns to normal dialogue. A spoken prefix before a mid-line marker becomes a separate dialogue page.

Narration has no speaker name and uses muted text. It holds the character's most recent spoken expression and retains the other sprites in group scenes. It never classifies the narrative text. If that older speech has no recorded scene, its last spoken page can seed the expression. Original messages and reasoning remain available in History. Player messages keep their normal styling.

**Hide quotation marks on dialogue-only pages** is an optional setting beside Narration handling. It removes the outer speech marks when all text on the current page is quoted dialogue, including a quoted speech stream that has not closed yet. Mixed narration and dialogue keep their marks. Nested quotes and apostrophes inside speech stay. This is a presentation change: the source transcript, saved messages, narration detection, expression input and history retain the original punctuation. It works independently of the narration toggle.

## Sprite Wardrobe

Open the Paimon menu → the bottom eye icon (**Sprite Wardrobe**), or its button in the extension settings. The **Enable Sprite Wardrobe** setting controls whether this menu is available.

1. Choose a character in the portrait strip. Preview its expressions without changing the scene.
2. Expand **Add a sprite set**. Give it a name and a native sprite folder such as `Klee/Summer`. Use an existing folder, or upload images to create it. Native folders allow one outfit subfolder.
3. Select the set and press **Use set**. This uses Character Expressions' normal folder override for that character. Other characters keep their own overrides.
4. Add images with **Image files → Add sprites**. Multiple files use names such as `joy.png`, `love.png` and `love-1.png`. Or turn off filename mapping and select the expression; numbered variants are assigned automatically. Existing filenames are only replaced when **Replace matching filenames** is enabled.
5. The final **+** tile creates a saved empty slot named `expression`, `expression-1`, `expression-2`, and so on. Select it to rename it or upload an image into that exact slot. The first uploaded image fills the selected slot; additional files become numbered variants. Empty slots have no artwork and do not appear on stage. Numbered filenames are variants of their base expression in Character Expressions. **Add expression** below the upload controls also registers a custom label directly. Custom labels are shared with native Character Expressions.
6. Select a sprite and use **Rename** to rename that expression and all its numbered variants in the current set. Renaming an empty slot changes only that slot, retaining its numbered suffix. The new label is registered with native Character Expressions and its pickers refresh. Earlier recorded scenes keep the old artwork. Custom labels need the native LLM or WebLLM classifier; the local emotion model has a fixed vocabulary. Labels shared by other characters are kept.
7. Select a sprite to remove it. **Undo remove** restores the last removed image or empty slot until the page is reloaded. **Forget selected set** only removes its menu entry and keeps the files.

Equipping a set updates the visible saved page. Other previously recorded pages keep their exact outfits and arrangements. Removing a file used by an old scene makes that image unavailable until it is restored.

## Sprite and CG audio

Under **Sprite Wardrobe → Sprites & audio**, select the exact sprite or numbered variant, choose audio files and press **Add audio to selected sprite**. Under **Scene CGs**, select an artwork and use **Add audio to selected CG**. Multiple files are supported; one is chosen at random each time that sprite changes or that CG is newly selected for a fresh response.

Each CG audio file has its own **Loop** switch. A looping clip continues across pages while its CG stays visible. In scene replacement mode it ends when you leave that message. In framed mode it can continue into following messages until the frame is closed. Any newly triggered clip stops the previous clip. Opening or returning to historical dialogue never starts audio again; browsing back stops a playing clip. Preview buttons play once, even if Loop is enabled.

**Extensions → Silly Teyvat** has separate sprite and CG audio toggles and a shared volume control. If your browser blocks automatic playback, press **Enable audio on this device** once. Mobile browsers may require this again after reopening the app.

Uploads use SillyTavern's authenticated user-file storage, so assignments work on other devices connected to the same server. MP3, WAV, M4A, OGG, WebM, AAC and FLAC files are accepted; playback depends on the browser's codec support. Files must be nonempty and below 50 MB. **Unlink** removes an assignment while keeping its uploaded file.

## Character CGs

1. Open **Sprite Wardrobe → Scene CGs** and select a character. The final **+** tile creates saved blank entries named `scene`, `scene-1`, `scene-2`, and so on. Empty CG slots stay out of classification. Select one and use **Add scene artwork** to fill it while keeping its labels and audio assignments. Audio can be assigned before artwork is uploaded.
2. Give the artwork a **Scene label**, such as `Lakeside adventure`. Add optional **Additional classifications**, one per line, such as `Picnic` and `Fish Blasting`. The same CG can match any of these names. Add a description explaining which current scene should select it.
3. Choose artwork files and press **Add scene artwork**. Several artworks can share a classification; one matching artwork is selected at random and saved. Select an artwork to edit its labels, attach audio or unlink it.
4. Enable **Classify character CG scenes** in **Extensions → Silly Teyvat**. Choose a **CG classifier** independently of the sprite model in Character Expressions:
   - **Main API (Chat Completion)** uses the current chat connection. **Bypass model reasoning** starts on and only affects CG requests. Turn it off to retain your provider's reasoning preferences. Provider support determines whether bypass is honored.
   - **Saved Connection Manager profile** uses another saved Chat Completion or Text Completion connection and model without switching the current chat API. Create the profile in native Connection Manager, then select it in the CG profile dropdown.
   - **WebLLM on this device** uses the native WebLLM extension and its loaded model. It requires a supported browser and that extension to be installed.
5. Edit **CG classification prompt** if desired. Its default is `Which of these options is this message about: {{options}}, None of the above. Choose one option and say nothing else.` `{{options}}` inserts all scene labels and aliases; `{{message}}` optionally inserts the whole response. The response is also provided separately as the user message. Artwork descriptions accompany the prompt.

The CG classifier runs separately from emotion classification after the entire character response completes. If its reply contains a CG name or classification, ignoring case and hidden `<think>` text, that artwork is selected. Complete labels are matched, so `Combat` does not accidentally match `noncombatant`. A reply with no matching label, such as `None of the above`, selects no CG. When several names match, the most specific matching name wins.

A CG choice, including a no-match result, is saved in the message's `extra.silly_teyvat.cgs` data for each swipe. The same artwork covers every page of that response, and browsing back restores it without another model call. Edits invalidate the saved result. Changing model settings or labels preserves already saved scenes; use **Recheck visible message** to classify the current response again.

The **picture-frame icon** in the Paimon menu toggles the presentation:

- **Scene replacement:** artwork covers the background and hides every character sprite in the group, including the other speakers, for every page of that message. Sprites return when you leave that message.
- **Framed window:** artwork opens above the scene and stays until its **X** is pressed or a new CG replaces it. Sprites continue classifying beneath it. Drag the header to move it and the bottom-right corner to resize it. Arrow keys on the resize handle also work. Position and size are remembered on this device/server settings.

Removing an artwork assignment keeps the uploaded file, so saved CG scenes remain usable. Sprite and CG assignments live in extension settings; copy them with the user files when moving to another server. Chat metadata alone contains scene choices, not the uploaded media files. Preview uses demo landscape artwork and a short silent audio file in mock storage; it never uploads your files or calls an actual model.

## Regional backgrounds

Open **Sprite Wardrobe → Backgrounds**. Backgrounds are shared scene locations, independent of the selected character, sprites and CGs.

1. Enter a region name, such as `Mondstadt`, and press **Add region**. Select it in **Travel region** to enter it. Adding a region alone never takes you out of your current region.
2. Upload background images or expand **Use existing SillyTavern backgrounds → Load background library** and assign selected images to the region. The final **+** tile creates an empty location slot that can be named before its image is added.
3. Select each location and set its name, optional aliases and recognition description, then press **Save location details**. For example, `Windrise` can also match `Windrise tree` or `Statue of The Seven`. Several images can share a classification; the first matching assigned image is used.
4. Select artwork and press **Set current location** to choose where the scene starts. Switching to an existing region begins at its first available background.
5. Keep **Classify locations and show backgrounds** enabled. Under **Location classifier**, choose Main API, a saved Connection Manager profile or WebLLM. This choice is independent of the sprite and CG classifiers. Main API reasoning bypass starts enabled and only affects location requests. Edit the prompt if desired, then press **Save classifier settings**. `{{options}}` supplies the selected region's location names and aliases; `{{message}}` can include the classification input.

After a complete character response, the classifier receives the selected region, current location, two preceding messages and that response, including narration. It chooses the party's current physical location. Mentions, memories and planned destinations should not change it. **Only locations in the selected region are offered, and responses naming anything outside that list are rejected.** No match keeps the current background. Streaming and player messages retain the background without making location requests.

To leave a region, choose another one in **Travel region** or use **Teleport** on a waypoint in that region. The model cannot change this setting. The region lock is stored per chat, including group chats, so the whole party shares it. Region and location assignments are shared across chats.

The chosen background is saved per message and swipe. Revisited messages restore their artwork without another model call or changing the active region for new dialogue. Edits invalidate their saved classification; **Recheck visible message** reruns classification for the latest completed character reply. CGs keep their priority over regional backgrounds; sprites remain visible above locations. Turning background handling off restores the native background. Removing region/location assignments preserves uploaded files and recorded scenes.

Native background imports reference their original files; uploaded backgrounds use authenticated user-file storage. Keep those files, extension settings and chat metadata together when moving servers.

## Location characters and travel companions

72 starter waypoints cover the eight regions present in the bundled map: Mondstadt, Liyue, Inazuma, Sumeru, Fontaine, Natlan, Nod-Krai and mainland Snezhnaya. Each is a real regional background entry with a map marker, description, optional recognition aliases, a saved background candidate and source links. They are added once without choosing a region or moving an active chat. Existing locations and edits are preserved; removed starters stay removed on future reloads.

1. Import the character card and its sprite pack as usual.
2. Click the minimap, choose a waypoint, then scroll to **Characters at this location**.
3. Press **Add character to location** to open the portrait grid. Selected characters turn blue, and the current roster appears at the top. Search by name, or click a selected portrait to remove that character. Moving someone from another location asks **This character is currently in (location). Move to (new location)?** before making any change. Bindings use the exact avatar ID, so cards with matching display names remain distinct. A character has one current location.
4. Keep **Meet characters tied to map locations** enabled in Silly Teyvat settings, or under **World scale & companions** in the map.
5. Visit the location with **Teleport**, or let location classification move there within the selected region. Its installed residents join the active group. Leaving removes location guests who are staying behind.

The first encounter in a solo chat copies it into one hidden **Teyvat journey: {character}** group. Later swaps update that same group in place and returning to the solo chat reopens it. Original and manually added party members stay protected during automatic travel. New guests use the normal native group speaker selection settings, which can be changed in Group Management. Install their expression sprites or enable avatar fallback to show them on the stage.

**Only Teleport asks “Take {character} with you?”**, one question per location guest. Enable **Allow the main character to stay behind when teleporting** to ask original and manually added members too. Other companions are asked before the main card. A destination resident or accepted follower must remain available; the last enabled speaker follows automatically when the destination is empty. Both this setting and **Include the entire world in the World scale prompt** are also available under **World scale & companions** in the map. Enable **Allow the main character to stay behind when teleporting** to ask original and manually added members too. Other companions are asked before the main card. A destination resident or accepted follower must remain available; the last enabled speaker follows automatically when the destination is empty. Both this setting and **Include the entire world in the World scale prompt** are also available under **World scale & companions** in the map. **Yes** moves that guest to the destination for this chat. **No** leaves them at the previous location and removes them from the active group. **Cancel teleport** changes nothing, even if you answered earlier questions. Model-classified travel never asks and leaves guests at their assigned current location. Following placements are saved in this chat’s metadata; their shared home assignments stay available in other chats. Revisiting old dialogue restores its saved scene without loading or moving today’s party.

Opening a solo character card always starts at its default tied location. Opening an existing group preserves that group’s journey. Initialization does not create a travel-history entry. Researched defaults are bundled for the installed character library, including cards imported later; existing custom assignments are preserved.

The first tied location is remembered as the character’s default greeting location. Moving their assignment or taking them along preserves that default. On a new arrival at the default location, the main written greeting is used. A new arrival elsewhere generates a fresh greeting using the main API, the exact character card and chat history. It tells the character they have travelled to the current location and see your persona there, overriding a home-based card scenario. This is saved as an ordinary character message; the five written greetings remain unchanged. Returning through old dialogue does not generate again. An offline or failed request stays queued for **Retry location guests**, without falling back to a greeting for the wrong place.

Roster changes wait for streaming, pending native saves and the entire group generation batch. Late work is rejected after a chat switch. Errors are reported without clearing the old conversation; **Retry location guests** retries after the problem is resolved. If a new group was saved but could not open, its name is shown so it can be opened from Character Management.

**World scale** supplies the real current party and names of actually bound cards at waypoints within the current region. Enable **Include the entire world in the World scale prompt** for all regions. Suggested cards are not injected as real residents.

Teleport and region changes append a model-visible narrator message: `{characters} travelled {distance} from {old location} to {new location}.` The names include your persona and actual followers, excluding characters left behind and residents who have not travelled. Distances use the map scale. These messages hold the preceding sprite scene, do not generate choices, and do not classify themselves into new locations. Same-location updates and historical replay do not add duplicate travel records.

See [the full location catalog](LOCATION-CATALOG.md) for all 111 locations, default residents, image credits and coordinate methods. Version 4 adds 40 unoccupied wilderness and lore waypoints, five per mapped region, without restoring deleted older starters. Building entrances and some area pins are approximate; indoor floors share the surface map. Distances are straight-line estimates, not canonical travel times. Backgrounds were reviewed for playable characters, HUD, captions and aerial viewpoints. Ordinary NPCs and official logos may remain. Approaches, neighboring scenery, and the previously AI-cleaned Svetloledovka image are disclosed in the catalog. Custom artwork is preserved. Prune remains at Mondstadt Fountain Plaza. See [the asset guide](ASSET-GUIDELINES.md) for provenance and review rules.

## Font and mobile layout

HYWenHei 85W is bundled for names and message text, including phones without the font installed. The supplied WebP icons replace the native menu glyphs. **Persona Management icon** selects Aether (default) or Lumine.

The scene canvas is fixed to the viewport with root overscroll disabled, while the transcript and menu panels retain their own scrolling. Browser pinch zoom remains available. Sprite changes prepare and decode a fresh image before replacing the old image in one step; late image loads cannot repaint an earlier scene or leave duplicate sprites.

All HUD icons stay in one row, shrink uniformly on narrow screens and leave room for the Paimon icon at the same height. Its compact, icon-only menu opens downward at the left edge on desktop and in both phone orientations, staying vertical when the phone rotates. Menu buttons keep accessible names without visible labels or hover tooltips. Portrait reply choices use smaller pills on the right above the dialogue. Portrait dialogue, navigation arrows and message count use compact, even spacing above the input. Landscape dialogue uses tighter vertical spacing and sits lower when the input is hidden, raised 5 px from version 1.4.2; the Stop control keeps its clearance during generation. Native reasoning, source text and extra native preview siblings are hidden throughout streaming in dialogue view, so generation has only one visible text stream; History still exposes it.

## Automatic reply choices

See **QUICK-REPLIES.md**. Enable **Teyvat Choices and Genshin HUD icons**, connect your main Chat Completion API, and open a chat. Three suggested replies appear automatically after the final page is fully revealed. The small refresh button regenerates them. Clicking a choice sends it immediately and starts the character's response.

Only the suggestion request disables thinking; normal generation settings stay intact. Other Quick Reply sets continue to work. The supplied empty `Teyvat Choices.json` is only for compatibility with the older script-based setup.

## World map, waypoints and minimap

Travel, waypoint creation, group copies and media uploads use local IDs without browser UUID helpers, including on mobile LAN HTTP connections. Existing saved IDs stay valid.

The round minimap at the top left opens the full Teyvat map. You can also open it through **Sprite Wardrobe → Backgrounds → Open world map**. Drag to pan, pinch or use the plus/minus controls to zoom. Only your own waypoints are shown.

1. Press **＋ Waypoint**, then click or tap a location on the map. **Place at map centre** also works.
2. Enter a name and description, choose its region, then upload a background picture. The picture is added to that region in the Backgrounds wardrobe. Region membership comes from your selection. Add aliases under **Additional classifications** to help the location classifier recognize it.
3. If the background is already uploaded, select its region and choose it under **Link existing background**. Alternatively, select it in the wardrobe and press **Place selected background on map**. This links the existing item without duplicating the file.
4. Press **Save waypoint**. Saving creates the destination without moving the party. Click the marker or its name in the waypoint list to see the description, distance and **Teleport** button.
5. **Teleport** immediately selects that waypoint’s background and region. The model never changes your location; only you do.

The minimap centres on the waypoint linked to the displayed background. A background without map coordinates shows an unlocated minimap; link it to a waypoint to establish an origin. Browsing saved dialogue can show its recorded map position without changing the party’s active location for new replies. The minimap is hidden while the Paimon menu is open, in History or with Hide UI active.

**Edit waypoint** changes its name, description, region, image, aliases or position. Click another map point while editing to move its pin. **Unpin (keep background)** removes its map position while preserving its artwork and saved scenes.

### World scale in the model’s context

Expand **World scale** at the bottom of the map to edit **Metres per map unit** and **Walking speed**, then press **Save world scale**. The default is one metre per native map coordinate unit and a 5 km/h walking reference. Zooming changes the view, never the distance. Use a larger scale multiplier if your roleplay should treat Teyvat as a larger world. Distances are horizontal straight lines; terrain, roads, water and climbing may increase travel time.

Silly Teyvat injects a system-role block named **World scale** through the native extension-prompt API. It contains the current location and region, plus every mapped waypoint’s name, region, description, coordinates, distance, direction and walking-time reference, including waypoints in other regions. It updates when you add, move or edit waypoints, change scale, teleport or arrive through background classification, and refreshes before prompt construction. The expanded panel shows the exact text. Unknown origins are reported explicitly rather than inventing distances. Disabling Silly Teyvat removes this block without changing other system prompts.

The overview map is bundled locally. Sharper tiles load directly from HoYoverse as you zoom, with the local overview underneath if those tiles are unavailable. The map has no login, collection tracker, location tracking, route finder or third-party scripts. Chat text and waypoint descriptions are kept within SillyTavern and the normal model prompt; they are not sent to the tile host. See **MAP-RESEARCH.md** for project comparisons, coordinate references and asset provenance.

## Compatibility and preview

Native staging is independent of Prome VN. Its layer ignores Prome sprite transforms, and full transcript navigation remains available even when Prome has hidden older native messages. Foreign settings and visibility classes are preserved and take effect again when Silly Teyvat is off. Disable Prome if you do not want its own background or other visual effects. If you turn native staging off to use Prome placement, keep **Prome VN → Hide Sheld** and **Show Only Last Message** off. Turn off competing Guinevere replacement layouts if controls overlap.

The white HUD symbols retain native SillyTavern actions. Menu windows open centrally inside a bordered, scrolling panel on desktop and mobile. Version 1.4 uses your supplied Genshin WebP assets, including AI Response Formatting, with the original native drawer actions. Asset and font provenance is recorded in `SOURCES.md`.

Use **Open interactive preview** for a disposable fixture with streaming stress tests, five-page dialogue, group sprites, simulated choices, CGs, audio and integration checks. It uses your original fan VN Klee and Nahida artwork and never sends model requests or changes real chats.

To uninstall, disable the extension, remove its folder and refresh. Remove Teyvat Slate through UI Themes if desired. Saved sprite metadata remains in chats and is harmless when the extension is disabled.

## Version 1.12 asset refresh

The supplied Teleport Waypoint icon now marks saved, current and draft map locations. Current and draft states retain their highlight and opacity cues. Starter catalog version 2 refreshes source credits only for existing locations still using the bundled image. Coordinates, current/default character assignments, active travel state and chat histories are not changed by the migration.
