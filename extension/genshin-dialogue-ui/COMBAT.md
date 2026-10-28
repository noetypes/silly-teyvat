# Silly Teyvat 1.18: Wilderness encounters and elemental combat

Installed in the local SillyTavern user extension directory. Refresh SillyTavern on each device to load the update and the newly tagged cards. Your chats, portraits, greetings and original sprite files are preserved.

## Set up an encounter

1. Open **Sprite Wardrobe**, choose a card, and expand **Character & enemy properties**. Choose **Hostile enemy** for enemy cards. Set its maximum HP and death message, then save. The 20 imported enemy cards are already marked as enemies, with 30 HP by default.
2. Open a waypoint on the **World map** and expand **Wilderness encounters**. The same controls are in **Sprite Wardrobe → Backgrounds → selected location**.
3. Enable **Wilderness location**, choose whether to use the default or a custom percentage, highlight the enemy portraits eligible to appear there, and save. Only enemy cards appear here. Friendly cards remain in **Add character to location**. Changing a card's role is blocked while it is assigned to an incompatible pool or home.
4. Leave and enter the location. One encounter roll happens per arrival. A successful roll selects one enemy uniformly from this location's pool. A failed roll produces no enemy. Saving settings, paging dialogue and reopening a chat do not reroll an existing visit. Leaving and returning starts a fresh visit.

The 40 scenic wilderness waypoints are marked Wilderness with editable starter pools. They inherit **Default encounter chance (%)** from Silly Teyvat settings, initially 40%. Check **Use a custom chance for this waypoint** to set a separate enemy chance. Old seeded 40% values inherit the default; previously customized rates are preserved. At 100% with at least one eligible enemy, the next arrival always produces an enemy. Changing rates while already at a location does not reroll the visit. Leave and return for a new roll. The other 71 locations retain their existing status. **Enable wilderness enemy encounters** in extension settings controls future spawning; disabling it does not erase a current encounter. Starting a new character chat still opens with only that character, including at a wilderness home.

## Fight or talk

Use the **sword toggle** at the left of the dialogue controls to arm an attack. It glows gold while on. Send a typed message or select a suggested reply: your exact words remain in chat, the dice resolve after them, then the normal AI response receives the dialogue and resolved combat facts. Attack is no longer one of the suggested reply options. The toggle works even when suggested replies are disabled.

The sword stays armed for later messages in the same encounter. Turn it off to speak or negotiate without attacking. When multiple enemies are present, the nearby **Attack target** selector chooses which one to hit. Chat switches, new encounters, disabling the extension and losing the selected target disarm it. Duplicate user-render events, history navigation and regenerated AI replies cannot repeat an attack. Only a newly sent user message can trigger an armed attack.

An attack rolls one eight-sided elemental die for each enabled playable ally currently in the scene, **plus two**. NPCs, enemy cards and disabled group members are not counted. **You count too:** your persona rolls as one more ally, using its own element or, when you are playing a character card such as Aether, that card's element; the played card itself is not counted twice. The faces are Pyro, Hydro, Anemo, Electro, Dendro, Cryo, Geo and Omni. A face matching any allied element deals a random **1–6 HP** by default. Omni matches when at least one ally has a configured element. Each matching die deals damage once, even if several allies share that element. Configure the inclusive minimum and maximum damage in **Silly Teyvat → Wilderness & combat**.

The Roll Phase throws the dice onto the table, sorts them (Omni first, then your elements), highlights matching faces and credits each one to an ally of that element. The summary counts up each character's damage and drains the enemy health bar. **Skip** (or tapping the table) jumps to the result without changing the roll; **Confirm** commits it. Reduced motion skips the throw. Cancelling through a chat change or disabling the extension before commitment discards the pending roll.

Health appears in the enemy HUD and is saved per encounter in chat metadata. Resolved attack facts are also saved as ordinary narrator messages, so the main roleplay model can read them. For a message with an armed attack, the usual roleplay response reads both the user’s words and the exact damage/remaining HP saved immediately after them. No separate injury reply is generated for that send. A miss explicitly reports no damage. If the target dies, an already drafted reply from it is stopped, its death is recorded and its card is unloaded. At zero HP the configured death message is saved, then the enemy leaves the active group. Its card and previous messages remain available. Historical pages show their saved health and sprite scenes without replaying attacks or respawning enemies.

Wilderness enemies never count as companions who can keep a party populated. Friendly arrival rolls and the last-companion safeguard still run before Teleport commits. Hostile cards leave the scene on travel and do not get a “take with you” question. The system supports several enemy cards already present in a manually assembled group, with a separate target choice and HP for each. Random wilderness arrivals currently select one enemy per successful visit.

This is the VN combat layer. Elemental reaction formulas, TCG decks and mana costs are not part of it. Enemy responses cannot change stored HP; only the dice resolvers do.

## Party health and enemy attacks

You and every non-hostile member of the scene now have health. Your own maximum is **Your maximum HP** in Silly Teyvat → Wilderness & combat (30 by default). Each character's maximum is **Maximum HP** in Sprite Wardrobe → Profile (30 by default). Health is saved per chat and shown in the party health panel at the lower left while an encounter is active or anyone is hurt.

After your attack resolves, every enemy still standing rolls its own elemental dice. The default is four dice. A die hits when it shows the enemy's element or Omni; enemies without an element are physical and hit on Geo or Omni. Each hit deals 2–6 damage to a random party member who is still standing (you included). Dice count and damage are editable, and **Enemies strike back** turns the whole thing off. The Roll Phase shows the enemy's dice, you cannot reroll them, and the exact result is saved as a narrator message the roleplay model can read. A downed ally stays out of the fight until healed.

If **you** reach 0 HP the encounter ends. You and your party are carried to the nearest Adventurers' Guild by map distance, everyone is healed, and Katheryne is waiting at the counter to explain how you were found and healed. Teleporting to any location that is not wilderness also heals the party.

## Adventurers' Guild

Every major region now has an Adventurers' Guild waypoint with background art: Mondstadt, Liyue Harbor, Inazuma City, Sumeru City, the Court of Fontaine, the Stadium of the Sacred Flame (Natlan) and Nasha Town (Nod-Krai). Snezhnaya's headquarters in Snezhnograd has no usable art on the wiki yet, so it has no waypoint. **Katheryne** is bundled as an NPC card with an official sprite; run `tools/install-katheryne.sh` if she is missing from your characters folder, then restart SillyTavern.

## Enemy action sprites

Every imported enemy has `neutral.png` and `attacking.png` in its native sprite folder. The sprites were generated as individual transparent assets using each enemy's own anatomy, without existing playable-character proportion guides. Default enemy scales vary by type and remain editable in Sprite Wardrobe. Existing user scale overrides are preserved.

Enemy pages do not call Silly Teyvat's emotion classifier. The combat prompt gives enemy speakers an explicit action contract: start an actual attack-attempt paragraph with `[enemy_attack]`. Silly Teyvat hides this token in dialogue view and uses `attacking` for that paragraph. A marker on its own line applies to the following paragraph without creating a blank dialogue page. Other paragraphs use `neutral`. The prompt is applied automatically while an enemy is present; users do not need to type tokens. A response without the action token stays neutral, even if it mentions an attack or sounds angry. Player and companion text cannot mark an enemy attack.

The attack sprite may appear on narrated action paragraphs as well as dialogue. Other enemies in the group stay neutral, and the pose resets for a player turn, a companion turn or the enemy's next neutral page. Saved history restores its original pose without reclassifying or replaying appearance audio. This does not add automatic counterattacks, player HP or damage from prose. Enemy attacks describe attempts; only the existing dice resolver changes stored enemy health.

Opening a solo card creates a persisted opening lock before catalogs load. The lock limits the cast, roster preparation and cached scene display to the selected character until an actual move to another location. Same-location Teleport and redraws do not release it. On the first return, tied characters and enemies are sampled normally.

## Character metadata

A GPT-6 Luna agent at Max researched the 127 existing non-enemy cards. All have region/affiliation and playable-status metadata, with elements and body models where verified. There are 124 playable cards and three NPCs. The 20 specific enemy cards are separately tagged Enemy. Structured values live in `data.extensions.silly_teyvat`; searchable native card tags include element, body model and region. Wardrobe overrides remain editable per installed card.

Aether and Lumine default to Anemo and can be changed to another supported element. Manekin variants are adaptive and intentionally have no fabricated fixed affinity. Vesna and Vodyanitsa have no verified body model in the checked sources, so that field remains Unspecified. Region means the sourced affiliation, not necessarily nationality or the character's current waypoint. See [character research](CHARACTER-RESEARCH.md) and [all metadata](assets/character-properties.json).

## Dice research and asset provenance

- The user's supplied **Elemental_Dice_-_Genshin_Impact_(TCG)** glTF 2.0 model replaces the original reconstruction in 1.16.1. The mesh and all four original texture maps are used, with face orientations calibrated for the eight outcomes. No other file format is needed.
- [Genshin Impact's official Genius Invokation gameplay trailer](https://www.youtube.com/watch?v=JUSZOjmD_1U) and [official advanced rules](https://genshin.hoyoverse.com/m/en/news/detail/26076) remain the TCG visual and rules references. The tumble animation is a reconstruction; the supplied model contains no animation clip.
- Three.js 0.186.1 and its glTF loader are bundled locally under the MIT license. No CDN is required. See [asset details and license notes](assets/dice/README.md). The third-party model has no license document or creator credit in the supplied folder and is not covered by this project's MIT code license.
- If the model cannot load or WebGL is unavailable, the exact roll is shown as text and can be committed through Continue. Skipping, reduced motion, rotating the device and cancelling while assets load do not reroll the dice.

## Validation

Browser checks use disposable preview chats and mock model services. Native card/settings changes were read back through the local SillyTavern API, and all 147 native portrait pixel buffers were compared with backups. No paid/live model request was made. Desktop, portrait and landscape layouts were checked, including rotating the dice dialog while a result was visible. These are browser viewport checks, not a physical iPhone test.
