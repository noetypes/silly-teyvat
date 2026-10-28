# Silly Teyvat 1.30: Wilderness encounters and turn-based elemental combat

Installed in the local SillyTavern user extension directory. Refresh SillyTavern on each device to load the update and the newly tagged cards. Your chats, portraits, greetings and original sprite files are preserved.

## Set up an encounter

1. Open **Character Customization**, choose a card, and expand **Character & enemy properties**. Choose **Hostile enemy** for enemy cards. Set its maximum HP and death message, then save. The 20 imported enemy cards are already marked as enemies, with balanced HP from their movesets.
2. Open a waypoint on the **World map** and expand **Wilderness encounters**. The same controls are in **Character Customization → Backgrounds → selected location**.
3. Enable **Wilderness location**, choose whether to use the default or a custom percentage, highlight the enemy portraits eligible to appear there, and save. Only enemy cards appear here. Friendly cards remain in **Add character to location**. Changing a card's role is blocked while it is assigned to an incompatible pool or home.
4. Leave and enter the location. One encounter roll happens per arrival. A successful roll selects one enemy uniformly from this location's pool. A failed roll produces no enemy. Saving settings, paging dialogue and reopening a chat do not reroll an existing visit. Leaving and returning starts a fresh visit.

The 40 scenic wilderness waypoints are marked Wilderness with editable starter pools. They inherit **Default encounter chance (%)** from Silly Teyvat settings, initially 40%. Check **Use a custom chance for this waypoint** to set a separate enemy chance. Old seeded 40% values inherit the default; previously customized rates are preserved. At 100% with at least one eligible enemy, the next arrival always produces an enemy. Changing rates while already at a location does not reroll the visit. Leave and return for a new roll. The other 71 locations retain their existing status. **Enable wilderness enemy encounters** in extension settings controls future spawning; disabling it does not erase a current encounter. Starting a new character chat still opens with only that character, including at a wilderness home.

## Fight or talk

Use the **Attack** toggle at the left of the dialogue controls to arm an attack. It glows while on. Send a typed message or select a suggested reply: your exact words stay in chat, then one full battle round is played, then the normal AI response receives your dialogue and the round's results. The toggle works even when suggested replies are disabled, and it stays armed for later messages in the same encounter. Turn it off to speak or negotiate without fighting. When several enemies are present, the **Attack target** selector picks the default target for the round.

Chat switches, new encounters, disabling the extension and losing the selected target disarm it. Duplicate render events, history navigation and regenerated AI replies cannot repeat a round. Only a newly sent user message can start one.

## A battle round

Each armed message plays one round in three phases.

1. **Roll Phase.** The party throws **1 + 2 per fighting member** elemental dice (you count as a member, and one more die with Electro Resonance). The faces are the seven elements and Omni. The summary shows how many dice each member can use: their own element, Omni (wild) and spare dice. Unmatched dice start selected; you may reroll any of them once. Dice are **fuel**, not damage.
2. **Action Phase.** The battle screen shows your party along the bottom and the enemies along the top. Pick each member, then one of their three moves:
   - **Normal Attack** (A): free, but it can miss (each weapon has its own miss chance). A hit gives 1 Energy.
   - **Elemental Skill** (E): costs dice of the member's element and gives 1 Energy.
   - **Elemental Burst** (Q): costs dice and needs full Energy (usually 2; everyone starts an encounter with 1).
   Dice are paid from the member's own element first, then Omni, then **elemental tuning**: two spare dice become one. Moves that cannot be paid for are greyed out. Click an enemy (or, for a heal or shield, an ally) to choose the target. The order badges show who acts first; **Act earlier** moves a member up, so you can set up combos. The forecast under each move shows its expected damage, healing and any reaction it will trigger with the current order. **Auto** picks the strongest affordable move for everyone; **Hold** skips a member. Keyboard: A, E, Q (or 1, 2, 3) and Enter.
3. **Resolution.** Moves play in order with banners, impacts, damage numbers, reactions and sounds. An Elemental Burst first flashes the character's splash art. Then every enemy still standing strikes back (when **Enemies strike back** is on), and the End Phase runs summons, Dendro Cores, damage over time, regeneration and timers. A summary credits each member's damage and lists the reactions. **Skip** speeds the playback up, and a second press skips it.

The round is saved before it is played back, as a narrator message in plain language (moves, damage, reactions, HP), so the roleplay model can describe it. Enemy HP, party HP, Energy, shields, statuses, elements and summons are saved per encounter in chat metadata. Historical pages show their saved health without replaying anything. An enemy at 0 HP gets its death message and leaves the active group; its card and earlier messages remain.

## Movesets

All 124 playable characters, every Traveler element and the 20 bundled enemies have movesets. Each character's three moves are named after their in-game Normal Attack, Elemental Skill and Elemental Burst, and work in the spirit of the game: Bennett heals and buffs, Zhongli shields the party and petrifies, Xiangling and Fischl summon Guoba and Oz, Amber's Baron Bunny draws enemy fire, Hu Tao pays HP for power, Nahida and Faruzan make enemies take more damage, and so on. The numbers are Silly Teyvat's own balance, not game scaling.

Open **Character Customization → Moveset** to edit any character, persona or enemy: role, weapon, Burst Energy, and for each move its name, dice cost (or miss chance, or an enemy's cooldown), element and up to six effects. Effects are damage (power, target, hits), heal, shield, buff (damage dealt, damage taken, crit, dodge, regeneration, elemental infusion), debuff (damage taken, damage dealt, petrify), summon (power or healing each round, duration), Energy, cleanse and HP cost. Targets are one foe, all foes, random foes, the weakest foe, self, one ally, the party, other allies or the most injured ally. The description updates as you edit. **Save moveset** applies from the next round; **Reset to default** restores the bundled kit. Edits are stored in the extension settings per card. A persona playing a character uses that character's kit; otherwise your persona fights with the Traveler kit of its element.

Maximum HP stays in **Profile**. Each character's default comes from their moveset (30 to 42 by role); a value you or a card author chose is kept.

## Elemental reactions

Elements stick to whoever they hit (Pyro, Hydro, Electro, Cryo and Dendro; Anemo, Geo and Physical do not) and fade after two End Phases. The next different element reacts:

| Reaction | Elements | Effect |
| --- | --- | --- |
| Vaporize | Pyro + Hydro | Hydro on Pyro ×2, Pyro on Hydro ×1.5 |
| Melt | Pyro + Cryo | Pyro on Cryo ×2, Cryo on Pyro ×1.5 |
| Overloaded | Pyro + Electro | +3, and 2 Pyro damage to every other enemy |
| Superconduct | Cryo + Electro | +2, target takes 20% more damage for 2 rounds |
| Electro-Charged | Hydro + Electro | +2, then 2 Electro damage at the next two End Phases |
| Frozen | Hydro + Cryo | +1, the target loses its next action |
| Shatter | Physical, Geo or a claymore hit on a Frozen target | +4, breaks the ice |
| Bloom | Dendro + Hydro | +2, a Dendro Core deals 3 to every enemy at the End Phase |
| Burning | Dendro + Pyro | +1, then 2 Pyro damage at the next two End Phases |
| Quicken | Dendro + Electro | +1; afterwards Electro hits Aggravate (+2) and Dendro hits Spread (+3) |
| Swirl | Anemo on Pyro, Hydro, Electro or Cryo | +2, and 2 damage of that element to every other enemy, applying it to them |
| Crystallize | Geo on Pyro, Hydro, Electro or Cryo | +1, the attacker gains a 3 HP shield |

Hitting a target with **its own element is resisted** (half damage), so a Pyro slime shrugs off Klee and a Pyro enemy barely hurts Bennett. Reactions in the same round build a **combo**: each one after the first deals 10% more. Swirl spreading auras onto several enemies, followed by another element, is the strongest combo setup. Enemies react too: a soaked party member takes Vaporize from a Pyro attack.

**Elemental Resonance** applies when two living party members share an element: Pyro +15% damage, Hydro +25% healing, Electro one extra die, Cryo +15% crit chance, Anemo 10% fewer missed Normal Attacks, Geo 50% stronger shields, Dendro +1 reaction damage. Every hit has a 10% base critical chance for ×1.5 damage.

## Enemies

Every enemy has an element (or fights physically), its own HP, an **Attack** used most rounds and a **Special** used when its cooldown is ready. Below half health an enemy becomes **enraged** and uses its Special at once. Some have extra rules: the Pyro Abyss Mage and Pyroslinger Bracer carry Pyro shields that Hydro breaks much faster, the Wooden Shieldwall Mitachurl's shield blocks 40% of damage until Pyro burns it, the Cryo Whopperflower is weak to Pyro, the Ruin Guard is armoured, and Fatui agents and Treasure Hoarder scouts dodge Normal Attacks. Enemies target a random party member (the Marksman aims at the weakest), and decoy summons draw one enemy attack each round.

Enemy HP is fixed when it first appears and scales with the party it meets (×0.6 alone, ×0.9 with one companion, up to ×1.8 for five fighters); enemy damage scales the same way from ×0.65 to ×1.45, so a full party faces harder hits spread over more people. Enemy cards that still carry the old 30 HP default use their balanced HP instead.

## Party health and defeat

You and every non-hostile member of the scene have health. Your own maximum is **Your maximum HP** in Silly Teyvat → Wilderness & combat (30 by default). Health is saved per chat and shown in the party health panel at the lower left while an encounter is active or anyone is hurt. A downed ally sits out until healed.

If **you** reach 0 HP the encounter ends. You and your party are carried to the nearest Adventurers' Guild by map distance, everyone is healed, and Katheryne is waiting at the counter to explain how you were found. Teleporting to any location that is not wilderness also heals the party.

## Settings

Silly Teyvat → Wilderness & combat: **Difficulty** (Story: enemies 80% HP and 70% damage; Normal; Hard: 130% of both), **Enemies strike back**, **Burst splash art & effects**, **Battle sounds**, **Dice sounds** and **Your maximum HP**. Reduced motion (Silly Teyvat or SillyTavern setting, or the system preference) keeps all information but drops movement, particles and the splash slide. All battle sounds are synthesised with Web Audio; no game audio is bundled.

## Balance notes

Simulated battles (480 runs per release check) with the Auto plan, which is weaker than a player choosing combos: a solo Traveler beats common enemies in 4 to 9 rounds but usually loses to a Ruin Guard or three enemies at once; a pair wins nearly every common fight in 3 to 8 rounds while taking real damage; a four-member party wins in 2 to 6 rounds with 7 or more reactions against tougher enemies. Edit any kit, or change Difficulty, to tune this.

## Adventurers' Guild

Every major region now has an Adventurers' Guild waypoint with background art: Mondstadt, Liyue Harbor, Inazuma City, Sumeru City, the Court of Fontaine, the Stadium of the Sacred Flame (Natlan) and Nasha Town (Nod-Krai). Snezhnaya's headquarters in Snezhnograd has no usable art on the wiki yet, so it has no waypoint. **Katheryne** is bundled as an NPC card with an official sprite; run `tools/install-katheryne.sh` if she is missing from your characters folder, then restart SillyTavern.

## Enemy action sprites

Every imported enemy has `neutral.png` and `attacking.png` in its native sprite folder. The sprites were generated as individual transparent assets using each enemy's own anatomy, without existing playable-character proportion guides. Default enemy scales vary by type and remain editable in Character Customization. Existing user scale overrides are preserved.

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
- **Burst splash art** comes from the user's supplied Splash Art folder (120 characters). `tools/build-splash-art.py` trims each PNG and converts it to WebP inside 1100 px under `assets/splash/` (186 MB of PNG to 30 MB). Characters without a file (Aether, Lumine, the Manekins) flash their portrait instead. The art is not covered by this project's MIT code license.
- Move names for characters released after 5.x were checked against the Genshin Impact Wiki's talent tables.

## Validation

1.30 adds the **Battle rules, screen & Moveset checks** suite (57 checks: kits, dice payment and tuning, every reaction family, combos, energy, summons, decoys, enrage, the Action Phase controls, playback and the Moveset editor). All 19 preview suites pass. The battle screen was checked at 1280×800 and 375×812.

Browser checks use disposable preview chats and mock model services. Native card/settings changes were read back through the local SillyTavern API, and all 147 native portrait pixel buffers were compared with backups. No paid/live model request was made. Desktop, portrait and landscape layouts were checked, including rotating the dice dialog while a result was visible. These are browser viewport checks, not a physical iPhone test.
