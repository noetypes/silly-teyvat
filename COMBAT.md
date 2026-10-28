# Silly Teyvat 1.33: Wilderness encounters and turn-based elemental combat

Installed in the local SillyTavern user extension directory. Refresh SillyTavern on each device to load the update and the newly tagged cards. Your chats, portraits, greetings and original sprite files are preserved.

## Set up an encounter

1. Open **Character Customization**, choose a card, and expand **Character & enemy properties**. Choose **Hostile enemy** for enemy cards. Set its maximum HP and death message, then save. The 20 imported enemy cards are already marked as enemies, with balanced HP from their movesets.
2. Open a waypoint on the **World map** and expand **Wilderness encounters**. The same controls are in **Character Customization → Backgrounds → selected location**.
3. Enable **Wilderness location**, choose whether to use the default or a custom percentage, highlight the enemy portraits eligible to appear there, and save. Only enemy cards appear here. Friendly cards remain in **Add character to location**. Changing a card's role is blocked while it is assigned to an incompatible pool or home.
4. Leave and enter the location. One encounter roll happens per arrival. A successful roll brings 1 to **Maximum enemies per encounter** (Settings → Combat, default 3) different enemies from this location's pool. Only enemies native to the waypoint's region can appear, and an enemy defeated at a waypoint is not rolled there again until you press **Restore defeated enemies** on its map card. A failed roll produces no enemy. Saving settings, paging dialogue and reopening a chat do not reroll an existing visit. Leaving and returning starts a fresh visit.

The 40 scenic wilderness waypoints are marked Wilderness with editable starter pools. They inherit **Default encounter chance (%)** from Silly Teyvat settings, initially 40%. Check **Use a custom chance for this waypoint** to set a separate enemy chance. Old seeded 40% values inherit the default; previously customized rates are preserved. At 100% with at least one eligible enemy, the next arrival always produces an enemy. Changing rates while already at a location does not reroll the visit. Leave and return for a new roll. The other 71 locations retain their existing status. **Enable wilderness enemy encounters** in extension settings controls future spawning; disabling it does not erase a current encounter. Starting a new character chat still opens with only that character, including at a wilderness home.

## Fight or talk

Use the **Attack** toggle at the left of the dialogue controls to arm an attack. It glows while on. Send a typed message or select a suggested reply: your exact words stay in chat, then one full battle round is played, then the normal AI response receives your dialogue and the round's results. The toggle works even when suggested replies are disabled, and it stays armed for later messages in the same encounter. Turn it off to speak or negotiate without fighting. When several enemies are present, the **Attack target** selector picks the default target for the round.

Chat switches, new encounters, disabling the extension and losing the selected target disarm it. Duplicate render events, history navigation and regenerated AI replies cannot repeat a round. Only a newly sent user message can start one.

## A battle round

Each armed message plays one round in three phases.

1. **Roll Phase.** The party throws **1 + 2 per fighting member** elemental dice (you count as a member, and one more die with Electro Resonance). The faces are the seven elements and Omni. The summary shows how many dice each member can use: their own element, Omni (wild) and spare dice. Unmatched dice start selected; you may reroll any of them once. Dice are **fuel**, not damage.
2. **Action Phase.** The battle board is laid out like Genius Invokation TCG: enemies across the top, your party along the bottom, summons on the right, your dice down the right edge, moves in the bottom-right corner, item cards in your hand at the bottom and the round button (hourglass) on the left. Characters that have a TCG card use its art; moves show their Genius Invokation skill icons, and elements, auras, dice and reactions use the game's own icons. Tap a party card to pick who you are planning for, then one of their three moves. Focus moves on to the next member still without a move; once everyone has one, nobody is highlighted and the hourglass pulses:
   - **Normal Attack** (A): free, but it can miss (each weapon has its own miss chance). A hit gives 1 Energy.
   - **Elemental Skill** (E): costs dice of the member's element and gives 1 Energy.
   - **Elemental Burst** (Q): costs dice and needs full Energy (the gold diamonds on the card's right edge; everyone starts an encounter with 1).
   The hexagon under each move is its dice cost. Dice are paid from the member's own element first, then Omni, then **elemental tuning**: two spare dice become one. Spent dice dim and the count at the top of the dice column drops. A move you cannot pay for shakes. When a move can hit more than one enemy (or ally), the possible targets pulse; tap one. The small medallion under each party card shows its planned move, and its number is the acting order: members act in the order you give them moves. Tap a member who has a move to change it, or use **Act earlier / Act later** above the moves (or [ and ]) to change their place. Hover or long-press a move, card, item or summon for its details and the forecast (expected damage, healing and reactions for the current order). The **sparkle** button picks the strongest affordable move for everyone. Keyboard: A, E, Q (or 1, 2, 3) and Enter.
3. **Resolution.** Moves play in order with banners, impacts, damage numbers, reactions and sounds. An Elemental Burst first flashes the character's splash art. Then every enemy still standing carries out the move it telegraphed (when **Enemies strike back** is on), and the End Phase runs summons, Dendro Cores, damage over time, regeneration and timers. A summary credits each member's damage and lists the reactions. **Skip** speeds the playback up, and a second press skips it.

The round is saved before it is played back, as a narrator message in plain language (moves, damage, reactions, HP), so the roleplay model can describe it. Enemy HP, party HP, Energy, shields, statuses, elements and summons are saved per encounter in chat metadata. Historical pages show their saved health without replaying anything. An enemy at 0 HP gets its death message and leaves the active group; its card and earlier messages remain.

## Genius Invokation TCG enemies

All 57 enemy character cards from Genius Invokation TCG's PvE challenges are Silly Teyvat enemies (47 were added in 1.40; 10 already existed). Each uses its TCG card as its battle card and as its character card portrait. Their kits follow the card: the Normal Attack and Elemental Skill are both Attacks (the enemy picks one each round), and the Elemental Burst is the Special. Damage, HP and passives are scaled to Silly Teyvat's numbers: shields for Abyss Mages, armour for Shieldwall Mitachurls and meka, Corrosion summons for Rifthounds, and so on. Edit any of them in **Character Customization → Moveset**. Since 1.41 the starter wilderness waypoints carry them in regional pools (see `enemy-regions.js` for each enemy's regions and each waypoint's pool).

`tools/fetch-tcg-enemies.py` collects the cards from the Genshin Impact Wiki API, and `tools/build-tcg-enemy-cards.py --install <characters folder>` builds the character cards (it only replaces the portrait of a card that already exists, after backing it up).

## Seeing the enemy's next move

Each enemy shows the move it will use next round in a badge under its card: a sword with the damage and the portrait of the member it will hit, a starburst for a move that hits the whole party, scattered squares for random hits, or a symbol for a heal, shield or summon. The member in danger shows a red **−damage** marker. An enemy that is Frozen or Petrified shows a snowflake: it will lose that turn. The target is decided at the end of the previous round, so you can shield, heal, freeze or kill that enemy first. Below half health an enemy becomes **enraged**, and its next telegraphed move is its Special.

## Items

The party shares a bag of Genius Invokation event cards, saved per chat. A new chat starts with 3 Sweet Madame, 2 Mondstadt Hash Brown, 1 Lotus Flower Crisp, 1 Toss-Up and 1 Teyvat Fried Egg. Cards sit in your hand during the Action Phase with their dice cost in the corner. Tap a card to pick it up; the members who can use it pulse; tap one to play it (cards without a target play on a second tap). Played cards move to the left of the table; tap one to take it back. Food is eaten before anyone acts, and each member eats once per round.

| Card | Cost | Effect |
| --- | --- | --- |
| Sweet Madame | 0 | Heals 4 HP |
| Mondstadt Hash Brown | 1 | Heals 8 HP |
| Mushroom Pizza | 1 | Heals 3, then 3 more at each of the next two End Phases |
| Lotus Flower Crisp | 1 | Shields 6 damage |
| Minty Meat Rolls | 1 | Normal Attacks never miss for 2 rounds |
| Adeptus' Temptation | 2 | One member deals 60% more damage this round |
| Teyvat Fried Egg | 2 | Revives a downed member with 8 HP; they can act this round |
| Tandoori Roast Chicken | 2 | The party deals 25% more damage this round |
| Butter Crab | 2 | The party takes 30% less damage for 2 rounds |
| Starsigns | 2 | One member gains 1 Energy, in time for a Burst this round |
| Send Off | 2 | Dispels enemy summons and strips 8 shield from every enemy |
| Toss-Up | 0 | Returns to the Roll Phase to reroll your unspent dice (all start selected) |
| Thunder and Eternity | 0 | Turns every unspent die into Omni |
| Woven Flames, Waters, Winds, Thunder, Weeds, Ice, Stone | 0 | Adds one die of that element |

Open **Inventory** from the Paimon menu to see every card in the bag, with its cost, quality and effect. Cards won since you last opened it are tagged *New*.

Winning a battle drops one card per defeated enemy (two from tough ones), weighted towards common food, and elemental enemies sometimes drop the matching Woven card. A rescue at the Adventurers' Guild tops the bag back up to the starter cards.

## Fleeing

The running-figure button under the round button toggles **Flee** and shows the chance: 60%, plus 10% per Anemo member, minus 10% per extra enemy, plus 25% when every enemy is Frozen or Petrified (between 10% and 95%). Items you played still take effect. On success the battle ends before anyone acts, the enemies leave the scene and the chat records the escape; they can appear again on a later visit. On failure your party loses its turn and the enemies act as telegraphed.

## Movesets

All 124 playable characters, every Traveler element and the 20 bundled enemies have movesets. Each character's three moves are named after their in-game Normal Attack, Elemental Skill and Elemental Burst, and work in the spirit of the game: Bennett heals and buffs, Zhongli shields the party and petrifies, Xiangling and Fischl summon Guoba and Oz, Amber's Baron Bunny draws enemy fire, Hu Tao pays HP for power, Nahida and Faruzan make enemies take more damage, and so on. The numbers are Silly Teyvat's own balance, not game scaling.

Open **Character Customization → Moveset** to edit any character, persona or enemy: role, weapon, Burst Energy, and for each move its name, dice cost (or miss chance, or an enemy's cooldown), element and up to six effects. Effects are damage (power, target, hits), heal, shield, buff (damage dealt, damage taken, crit, dodge, regeneration, elemental infusion), debuff (damage taken, damage dealt, petrify), summon (power or healing each round, duration), Energy, cleanse and HP cost. Targets are one foe, all foes, random foes, the weakest foe, self, one ally, the party, other allies or the most injured ally. The description updates as you edit. **Save moveset** applies from the next round; **Reset to default** restores the bundled kit. Edits are stored in the extension settings per card. A persona playing a character uses that character's kit; otherwise your persona fights with the Traveler kit of its element.

Maximum HP stays in **Profile**. Each character's default comes from their moveset (30 to 42 by role); a value you or a card author chose is kept.

## Paimon

Paimon joins fights whenever she is in the scene, even though her card is not a playable character. She has no Vision, so her moves are Silly Teyvat's own and cost dice of any element:

- **Paimon Punch!** (Normal Attack): 1 Physical damage, misses 45% of the time.
- **Go, Go, Traveler!** (Elemental Skill, 1 die): everyone else deals 20% more damage and gains 15% critical chance for 2 rounds.
- **Paimon's Pep Talk** (Elemental Burst, 2 dice): everyone else heals 3 HP, gains 1 Energy and deals 25% more damage this round.

She has only 22 HP but **dodges half of all enemy hits** (shown as "Dodged!"); damage over time still lands. Dodge is editable for any character in Character Customization → Moveset.

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

Every enemy has an element (or fights physically), its own HP, an **Attack** used most rounds and a **Special** used when its cooldown is ready (round 3 for most, then every few rounds). Below half health an enemy becomes **enraged** and telegraphs its Special for the next round. Some have extra rules: the Pyro Abyss Mage and Pyroslinger Bracer carry Pyro shields that Hydro breaks much faster, the Wooden Shieldwall Mitachurl's shield blocks 40% of damage until Pyro burns it, the Cryo Whopperflower is weak to Pyro, the Ruin Guard is armoured, and Fatui agents and Treasure Hoarder scouts dodge Normal Attacks. Enemies choose a random party member as their target a round ahead (the Marksman aims at the weakest), and decoy summons draw one enemy attack each round.

Enemy HP is fixed when it first appears and scales with the party it meets (×0.6 alone, ×0.9 with one companion, up to ×1.8 for five fighters); enemy damage scales the same way from ×0.65 to ×1.45, so a full party faces harder hits spread over more people. Older chats' health and battles from the previous dice combat are discarded: every chat starts this system fresh.

## Party health and defeat

You and every non-hostile member of the scene have health from their movesets (30 to 42 by role). Your own maximum is that of the character you play, or 34 for the Traveler. A value set in Character Customization → Profile, or by a card's author, wins. Health is saved per chat and shown in the party health panel at the lower left while an encounter is active or anyone is hurt. A downed ally sits out until healed.

If **you** reach 0 HP the encounter ends. You and your party are carried to the nearest Adventurers' Guild by map distance, everyone is healed, and Katheryne is waiting at the counter to explain how you were found. Teleporting to any location that is not wilderness also heals the party.

## Settings

Silly Teyvat → Wilderness & combat: **Difficulty** (Story: enemies 80% HP and 70% damage; Normal; Hard: 130% of both), **Enemies strike back**, **Burst splash art & effects**, **Battle sounds** and **Dice sounds**. Reduced motion (Silly Teyvat or SillyTavern setting, or the system preference) keeps all information but drops movement, particles and the splash slide. All battle sounds are synthesised with Web Audio; no game audio is bundled.

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
- **Aether, Lumine and Paimon's cards** were supplied by the user (the wiki has no TCG card for them) and are kept by `tools/build-tcg-cards.py`.
- **Battle icons** come from the same wiki through its API: `tools/build-battle-icons.py` downloads the element icons (colour and white SVGs), the reaction icons, the Genius Invokation skill icon for each move (or the in-game talent icon when there is no TCG card), round character icons and TCG summon cards, and writes `assets/battle/index.json`. Moves without an icon (enemy moves, Paimon's, a few newer characters) use Silly Teyvat's own glyphs. These icons belong to HoYoverse and are not covered by this project's MIT code license.
- **TCG card art** comes from the [Genshin Impact Wiki's Genius Invokation card gallery](https://genshin-impact.fandom.com/wiki/Genius_Invokation_TCG/Gallery/Cards). `tools/build-tcg-cards.py` downloads the character card for every bundled character or enemy with a card of the same name (120: everyone except the Treasure Hoarders, Cryo Whopperflower, Geo Slime, the Large Slimes, Prune, Alyosha, Odette, Aether, Lumine, Aloy, Linnea, Lohen, the Manekins, Nicole, Sandrone, Varka, Vesna, Vodyanitsa and Zibai, who keep their portraits) and the 20 event cards used as items, sized to 360 px WebP under `assets/tcg/` (6.4 MB). The art belongs to HoYoverse and is not covered by this project's MIT code license.

## Validation

The **Battle rules, screen & Moveset checks** suite has 78 checks: kits, dice payment and tuning, every reaction family, combos, energy, summons, decoys, enrage, enemy intents, fleeing, every item type, loot, the board controls, playback and the Moveset editor. The combat, send, enemy-attack and dice suites pass alongside it, and a full preview chat was played through two rounds and a successful escape. The board was checked for overlapping elements at 1440×810, 1280×720, 812×375 and 375×812.

Browser checks use disposable preview chats and mock model services. Native card/settings changes were read back through the local SillyTavern API, and all 147 native portrait pixel buffers were compared with backups. No paid/live model request was made. Desktop, portrait and landscape layouts were checked, including rotating the dice dialog while a result was visible. These are browser viewport checks, not a physical iPhone test.
