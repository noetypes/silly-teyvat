# Silly Teyvat 1.33: Wilderness encounters and turn-based elemental combat

Installed in the local SillyTavern user extension directory. Refresh SillyTavern on each device to load the update and the newly tagged cards. Your chats, portraits, greetings and original sprite files are preserved.

## Set up an encounter

1. Open **Character Customization**, choose a card, and expand **Character & enemy properties**. Choose **Hostile enemy** for enemy cards. Set its maximum HP and death message, then save. The 20 imported enemy cards are already marked as enemies, with balanced HP from their movesets.
2. Open a waypoint on the **World map** and expand **Wilderness encounters**. The same controls are in **Character Customization → Backgrounds → selected location**.
3. Enable **Wilderness location**, choose whether to use the default or a custom percentage, highlight the enemy portraits eligible to appear there, and save. Only enemy cards appear here. Friendly cards remain in **Add character to location**. Changing a card's role is blocked while it is assigned to an incompatible pool or home.
4. Leave and enter the location. Every arrival at a location with an eligible enemy brings at least one, and at least one of its characters too. Anyone else there rolls to join, up to 3 met at once. Favorites always appear, and so do characters you left behind there, unless more than 3 characters are at the location, when left-behind characters are random. Favorites and the guaranteed character and enemy can exceed 3; only rolled extras stop at the limit. **Maximum enemies per encounter** (Settings → Combat, 1 to 3, default 3) limits how many enemies can appear. Only enemies native to the waypoint's region can appear, and an enemy defeated at a waypoint is not rolled there again until you press **Restore defeated enemies** on its map card. **Bypass Encounters** on a waypoint's map card skips everyone at that waypoint on arrival in this chat until you toggle it off. Saving settings, paging dialogue and reopening a chat do not reroll an existing visit. Leaving and returning starts a fresh visit.

The 40 scenic wilderness waypoints are marked Wilderness with editable starter pools. They inherit **Extra encounter chance (%)** from Silly Teyvat settings, initially 40%, for enemies beyond the guaranteed first. Check **Custom chance** in **Wilderness encounters** to set a separate chance. Old seeded 40% values inherit the default; previously customized rates are preserved. Changing rates while already at a location does not reroll the visit. Leave and return for a new roll. The other 71 locations retain their existing status. **Enable wilderness enemy encounters** in extension settings controls future spawning; disabling it does not erase a current encounter. Starting a new character chat still opens with only that character, including at a wilderness home.

## Fight or talk

Use the **Attack** toggle at the left of the dialogue controls to arm an attack. It glows while on. Send a typed message or select a suggested reply: your exact words stay in chat, then one full battle round is played, then the normal AI response receives your dialogue and the round's results. The toggle works even when suggested replies are disabled, and it stays armed for later messages in the same encounter. Turn it off to speak or negotiate without fighting. Every enemy present joins the battle; the one you confronted starts in front.

Chat switches, new encounters, disabling the extension and the last enemy leaving disarm it. Duplicate render events, history navigation and regenerated AI replies cannot repeat a round. Only a newly sent user message can start one.

## A battle round

Since 1.61 each armed message plays one round the way Genius Invokation TCG plays one: live on the board, turn by turn.

**A new fight** opens like the game. The two sides face off (VS), a coin decides who starts (it lands on 1 when you do and on 2 when the enemy does; an enemy that started the fight always does), and you are dealt a **Starting Hand** of five cards from your bag: tap any you want to send back, then **Confirm** to draw replacements once. Then you choose your **active character**. Your hand, your active character and who goes first carry over between the rounds of an encounter.

1. **Roll Phase.** Eight elemental dice (nine with Electro Resonance) tumble onto the table and sort into the game's grid. Tap any you want to throw again and **Reroll** once, then **Confirm**. Dice are fuel: the faces are the seven elements and Omni (wild).
2. **Action Phase.** The sides take turns. Each side's **active character** steps forward toward the middle of the table; only it uses skills, and single-target hits land on the opposing active character. On your turn:
   - **Fast Actions** (any number, your turn goes on): play a card from your hand, or use **Elemental Tuning**: pick a card, tap **Elemental Tuning** in the dice drawer, then a die; the die becomes your active character's element and the card goes back into your deck (it stays in your bag).
   - **One Combat Action**, which passes the turn: use a skill, **switch** to another character (1 die; tap a standby card), **Flee**, or **end your round** (the hourglass, then **End Round**).
   Choosing a skill or card shows what it will do before anything is spent: its details on the left, the dice it will pay in the drawer on the right (tap dice to pay with others), a gold check on the target and each card's coming HP change (−4 in red, +4 in green). Tap the skill again, press **Confirm** or Enter to do it; the cross or Esc puts it down. Keyboard: A, E, Q (or 1, 2, 3) and Enter.
   Costs follow the game: a **Normal Attack** costs 3 dice, one of the character's element and two of any; an **Elemental Skill** costs dice of the element (most 3); an **Elemental Burst** costs dice of the element and needs full Energy. Normal Attacks and Skills give 1 Energy, as before, and everyone now starts a fight with none. Omni pays for any element; dice are chosen the way the game chooses them, element first and Omni last. A character with no element (Paimon) pays with any dice.
   **Enemies** take their turns in between, with two Combat Actions a round: the enemy in front carries out the move it telegraphed (or, Frozen or Petrified, steps aside for another enemy), and out of actions it declares the end of its round. Once one side has ended its round, the other keeps acting until it ends too. **Whoever ends first acts first next round.**
   When your active character falls you choose the next one at once, for free; a fallen enemy is replaced by the next. Like the game, there is no random spread: damage is exactly what the preview shows, and only a critical-hit bonus (from cards or Cryo Resonance) can raise it. Normal Attacks never miss; only evasive characters (Paimon, Fatui agents and the like) dodge, and **Minty Meat Rolls** or **Northern Smoked Chicken** make your attacks land anyway.
3. **End Phase.** Summons act, Dendro Cores and damage over time resolve, statuses count down, Frozen and Petrified wear off, enemies choose their next move, and **you draw two cards** from your deck (ten at most in hand). The round is then saved as a narrator message in plain language (moves, switches, damage, reactions, HP), so the roleplay model can describe it, and a summary shows each member's damage and the reactions. Winning shows the game's **Victory** screen and the cards you found.

Every action plays out at once: the skill's name slides in at the top left, the attacker's card moves the way their weapon fights (below), and the damage lands in a big cream disc. Enemies without a weapon leap at their target with a slash or the element's projectile. An **Elemental Burst** first brings its card to life (the character's splash art pushes in and pans inside the card, in their element), then shows the full splash art, then strikes the field with the element's screen-wide effect and a sweep shaped by the weapon: crossing crescents for swords, a heavy cleave for claymores, thrusts for polearms, a volley for bows and orbiting sigils for catalysts. Cards fly up from your hand, flash and settle among the played cards; switching characters slides the new one forward; a fallen card darkens under a red mark. **Skip** speeds an animation up, and a second press skips it.

Since 1.62 each character's Normal Attack, Elemental Skill and Elemental Burst are animated for their Genshin Impact weapon type (`battle-weapons.js`, the weapon set in the kit or in **Moveset**), for the party and for a party member you duel:

| Weapon | Normal Attack | Elemental Skill | Elemental Burst (as it lands) |
| --- | --- | --- | --- |
| Sword | A quick dash and a two-cut combo | An afterimage dash and a crossing X | A spinning cut forward; crossing crescents |
| Claymore | Raised overhead, a slow heavy cleave and a ground shockwave | A full spin carried forward and a spinning sweep | A leap and a slam; a heavy cleave |
| Polearm | Two straight jabs that pierce through | A leap and a plunge from above | A long thrust; a fan of thrusts |
| Bow | The card draws back, the string pulls, an arrow flies | A held, aimed shot: a reticle on the target, then a charged elemental arrow | A recoil; a falling volley |
| Catalyst | The card floats while a sigil turns; an orb flies and blooms | The card rises glowing and a rune circle opens on the target | The card lifts and glows; orbiting sigils |
| Unarmed | A short punch and a round impact | A longer punch | A lunge |

The round is saved once both sides have ended it (or the battle is won, lost or fled). Enemy HP, party HP, Energy, shields, statuses, elements, summons, active characters and your hand are saved per encounter in chat metadata. Historical pages show their saved health without replaying anything. An enemy at 0 HP gets its death message and leaves the active group; its card and earlier messages remain.

## Genius Invokation TCG enemies

All 57 enemy character cards from Genius Invokation TCG's PvE challenges are Silly Teyvat enemies (47 were added in 1.40; 10 already existed). Each uses its TCG card as its battle card and as its character card portrait. Their kits follow the card: the Normal Attack and Elemental Skill are both Attacks (the enemy picks one each round), and the Elemental Burst is the Special. Damage, HP and passives are scaled to Silly Teyvat's numbers: shields for Abyss Mages, armour for Shieldwall Mitachurls and meka, Corrosion summons for Rifthounds, and so on. Edit any of them in **Character Customization → Moveset**. Since 1.41 the starter wilderness waypoints carry them in regional pools (see `enemy-regions.js` for each enemy's regions and each waypoint's pool).

`tools/fetch-tcg-enemies.py` collects the cards from the Genshin Impact Wiki API, and `tools/build-tcg-enemy-cards.py --install <characters folder>` builds the character cards (it only replaces the portrait of a card that already exists, after backing it up).

Since 1.63, 18 more enemies come from the *obtainable* character cards of monsters, the Fatui and the Eremites that had no Silly Teyvat card: Abyss Herald: Wicked Torrents, Abyss Lector: Fathomless Flames and Violet Lightning, Black Serpent Knight: Rockbreaker Ax and Windcutter, the four Consecrated Beasts (Fanged Beast, Flying Serpent, Horned Crocodile, Scorpion), Eremite Floral Ring-Dancer and Scorching Loremaster, Fatui Electro Cicin Mage, Frost Operative, Mirror Maiden, Hydro Hilichurl Rogue, Stonehide Lawachurl, Wayward Hermetic Spiritspeaker and La Signora. Each has a character card with its TCG card as the portrait, a description built from its archive entry, a greeting and two alternate greetings (La Signora and the Spiritspeaker are written as people in their own right), a kit from its TCG skills, enemy properties and regions. The Abyss's Rebirth passives become extra HP, the Lectors keep elemental shields and the Lawachurl's Stonehide is Geo-breakable armour. All but La Signora join two to five regional waypoint pools; on an existing save they are added to those pools once their cards are installed, without changing anything else in a pool (`addNewEnemies` in `enemy-regions.js`). Add La Signora to any Inazuma pool yourself. Since 1.64 each has a neutral sprite (`art/sprites/2026-11-07-tcg-enemy-sprite-installation`).

Since 1.65 La Signora is a boss (`boss-kits.js`): boss balance, the guaranteed rare drop and the boss badge on her arena, which shows her own icon like every boss arena. She keeps her card's Might of Delusion. She becomes the **Crimson Witch of Embers** for the rest of the encounter when she uses Carmine Chrysalis, when a round starts with her at 40% HP or less, or when a blow would defeat her (she survives at 1 HP instead, once). The Crimson Witch is Pyro and weak to Hydro, fights with Crimson Lotus Moth, Decimating Lash (Blazing Heat) and Whirling Blaze, and shows her own TCG card on the board (`assets/tcg/forms`). After that, including once the fight is over, the stage shows her `crimson_witch` sprite. Nothing else picks it: enemies are never classified, and `crimson_witch` is not an expression label. A form is a `transform` in an enemy's kit row (`combat-kits.js`); the engine's `applyForm` and `transform` handle it, and `node tools/test-enemy-forms.mjs` checks it. Her arena plays Chrysalis Suspirii (phase 1) in combat and switches to Saltatio Favillae (phase 2) the moment she transforms (`formTracks` in LOCATION-MUSIC.md). `tools/fetch-tcg-enemies.py --new` lists such cards, and `tools/build-tcg-enemy-cards.py --data work/tcg-enemies/new-cards.json` builds them.

## Seeing the enemy's next move

The enemy in front shows the move it will use on its next turn in a badge under its card: a sword with the damage and the portrait of the character it will hit (your active character, or the weakest one for a Marksman), a starburst for a move that hits the whole party, scattered squares for random hits, or a symbol for a heal, shield or summon. The character in danger shows a red **−damage** marker. An enemy that is Frozen or Petrified shows a snowflake: it cannot use skills this round. Below half health an enemy becomes **enraged**, and its next move is its Special.

## Items

The party shares a bag of Genius Invokation event cards, saved per chat. A new journey starts with ten cards: the **Starter deck** of the character it was started with (Character Customization → Profile → Starter deck). Each character's deck is any ten cards, at most four of one, or **Randomize**, which deals ten random cards (60% common, 30% uncommon, 10% rare) to each new journey. The default deck is 3 Sweet Madame, 2 Mondstadt Hash Brown, 2 Lotus Flower Crisp, 1 Toss-Up, 1 Teyvat Fried Egg and 1 Starsigns. A rescue or a rest in town tops the bag back up to the deck the journey started with. Since 1.61 the bag is your deck: a fight deals you five cards from it, you draw two more at each End Phase, and cards you do not play stay in the bag. Cards sit in your hand along the bottom of the board with their dice cost in the corner. Tap a card to pick it up; the members who can use it pulse; tap one, then **Play Card**. As in Genius Invokation, playing a card is a Fast Action and **a card works the moment it is played**: food heals, Lotus Flower Crisp shields, Starsigns adds Energy and buffs appear on the board straight away, and a played card cannot be taken back. Effects that say otherwise still wait (Mushroom Pizza's later healing comes at the End Phases). Played cards move to the left of the table. Each member eats once per round.

| Card | Cost | Effect |
| --- | --- | --- |
| Sweet Madame | 0 | Heals 4 HP |
| Mondstadt Hash Brown | 1 | Heals 8 HP |
| Mushroom Pizza | 1 | Heals 3, then 3 more at each of the next two End Phases |
| Lotus Flower Crisp | 1 | Shields 6 damage |
| Minty Meat Rolls | 1 | Attacks can't be dodged for 2 rounds |
| Adeptus' Temptation | 2 | One member deals 60% more damage this round |
| Teyvat Fried Egg | 2 | Revives a downed member with 8 HP; they can act this round |
| Tandoori Roast Chicken | 2 | The party deals 25% more damage this round |
| Butter Crab | 2 | The party takes 30% less damage for 2 rounds |
| Starsigns | 2 | One member gains 1 Energy, in time for a Burst this round |
| Send Off | 2 | Dispels enemy summons and strips 8 shield from every enemy |
| Toss-Up | 0 | Returns to the Roll Phase to reroll your unspent dice (all start selected) |
| Thunder and Eternity | 0 | Turns every unspent die into Omni |
| Woven Flames, Waters, Winds, Thunder, Weeds, Ice, Stone | 0 | Adds one die of that element |
| Northern Smoked Chicken | 0 | Attacks can't be dodged this round |
| Jueyun Guoba | 0 | One member deals 20% more damage this round |
| Saurus Crackers | 0 | One member gains 25% critical hit chance this round |
| Chenyu Brew | 0 | Heals 2 HP at each of the next two End Phases |
| Yumemi Style Special Snacks | 0 | Heals 5 HP |
| Gilded Hall | 0 | One member deals 40% more damage this round |
| Autumn Frost | 0 | Heals 4 HP and shields 4 damage |
| Sashimi Platter | 1 | One member deals 20% more damage for 2 rounds |
| Glittering Gemstones | 1 | Shields 8 damage |
| Harvest's Boon | 1 | Heals 4, then 2 more at each of the next two End Phases |
| Mystique Soup | 1 | Heals 4 HP and deals 20% more damage this round |
| Puff Pops | 1 | Heals 3 HP at each of the next three End Phases |
| Matsutake Meat Rolls | 2 | Heals 6, then 3 more at each of the next three End Phases |
| Rainbow Macarons | 2 | Heals 4 HP and takes 30% less damage for 2 rounds |
| Lakkaberry Pie | 3 | One member gains 2 Energy |
| Roulette Special | 3 | Heals 8 HP, shields 4 damage and deals 20% more damage this round |
| Hot Spring O'Clock | 1 | Heals the whole party 3 HP |
| Verdant Gift | 1 | The party deals 15% more damage this round |
| Fish and Chips | 2 | The party gains 30% critical hit chance this round |
| Wave-Kissed Sands | 2 | The party is 20% harder to hit for 2 rounds |
| Sing Your Heart Out | 3 | The party gains 1 Energy |
| NRE | 1 | Heals 6 HP |
| Memento Lens | 1 | One member gains 30% critical hit chance for 2 rounds |
| Seed Dispensary | 1 | Heals 2 HP at each of the next three End Phases |
| Red Feather Fan | 1 | The party is 15% harder to hit this round |
| Kusava | 2 | One member gains 1 Energy |
| Lumenstone Adjuvant | 2 | Shields the whole party from 3 damage |
| Treasure-Seeking Seelie | 0 | Adds 1 Omni die |
| Parametric Transformer | 0 | Adds 2 Omni dice |

The 29 cards from Northern Smoked Chicken down were added in 1.53. Silly Teyvat has no dice discounts, card draw or Max HP, so cards built on those have the nearest effect the battle engine offers.

### Weapons, Artifacts, Supports and Summons (1.63)

1.63 adds 128 cards from the Genshin Impact Wiki's card lists (`tools/fetch-tcg-cards.py`, defined in `battle-cards.js`): 28 Weapons, 25 Artifacts, 31 Supports, 25 Summon cards and 19 Events. Their names and art are the game's; their numbers are Silly Teyvat's (about 2 damage, 3 healing and 2 shield per point in the game), and only what the battle engine models is kept, so read each card's text in the hand or the Inventory.

- **Weapons and Artifacts** are equipped by one party member for the rest of the fight: pick the card, then the member. A Weapon only fits a member who wields that weapon type (Magic Guide needs a catalyst user). Each member holds one Weapon and one Artifact; a new one replaces the old. Equipment shows as a small card icon on the character. Weapons add 20% damage, and the rarer ones more: Skyward weapons add to Normal Attacks, Sacrificial weapons return a die of the wielder's element after an Elemental Skill, Favonius Sword adds Energy, Amos' Bow strengthens Bursts, Wolf's Gravestone finishes foes at 30% HP or less, Engulfing Lightning gains Energy each round. The element Artifacts (Blizzard Strayer, Crimson Witch of Flames and the rest) make one Skill or Burst a round cost one fewer die for a character of their element; others heal, shield each round (General's Ancient Helm), pass Energy around (Exile's Circlet, Ornate Kabuto) or draw cards. Equipment ends with the fight.
- **Supports** stay in play during the fight, up to four, in front of your summons, with their usages on the tile. Companions and Locations act at one moment: as the Action Phase begins (Paimon's 2 Omni dice, Kid Kujirai, the Investment plans that pay out after one to three rounds), at the End Phase (Liyue Harbor Wharf draws, Favonius Cathedral, Sangonomiya Shrine and Wangshu Inn heal, Iron Tongue Tian gives Energy, Vanarana keeps two unused dice for next round), after a Skill (Rana, Grand Narukami Shrine), after Food (Chef Mao) or on a switch (Liu Su). Others make things cheaper: Dawn Winery (two free switches a round), Katheryne (a switch that does not end your turn), Xudong, Master Zhang, Yayoi Nanatsuki, Tubby and Golden House (Food, Weapons, Artifacts, Locations). A cheaper card shows its cost in green. "People of the Springs" gives each new summon one more round. Supports end with the fight.
- **Summon cards** bring out a summon that acts at each End Phase for as many rounds as its usages: Oz, Guoba, Lightning Rose, Cuilein-Anbar, Large Wind Spirit and others deal damage; Drunken Mist, Bake-Kurage, Dandelion Field and others also heal; Singer of Many Waters and Origami Hamster only heal; Ushi draws an enemy attack. Playing the same summon again refreshes it. You can have four summons at most. Abyssal Summons calls a random hilichurl.
- **New Events:** Strategize (draw 2), Crystal Shrapnel, Aedon (a Combat Action that hits the active foe and ends your turn), Leave It to Me!, Changing Shifts, Quick Knit, Guardian's Oath (clears every summon), Heavy Strike, "Called In For Cleanup", The Bestest Travel Companion!, The Legend of Vennessa, Covenant of Rock, and the Elemental Resonances Enduring Rock, Fervent Flames, Shattering Ice, Soothing Water, High Voltage and Impetuous Winds.

The new cards join the regions' card drops, and each location now keeps 7 common, 7 uncommon and 4 rare cards from its region's list. The Inventory has a tab for each new kind.

Open **Inventory** from the Paimon menu to see every card in the bag, with its cost, quality and effect. Cards won since you last opened it are tagged *New*.

Between battles, dishes that heal or revive can be eaten from the Inventory: select the dish and tap a party member under **Eat now**. Healing over time (Mushroom Pizza) arrives at once, and Teyvat Fried Egg revives a downed member with 8 HP. Shields, buffs, Energy and dice cards only work in battle.

Winning a battle drops cards from the location's pool (see **View card drops** on any waypoint). Weak enemies (30 base HP or less) drop 1 card with odds of 90/9/1 for 3/4/5 stars, standard enemies 1 card at 60/32/8, tough enemies (45 HP or more) 2 cards at 30/45/25, and bosses 2 cards at 5/35/60. Odds use base HP, so party size and difficulty don't change them. Three enemies in one encounter count as one tier harder, up to tough. If a pool has no card of some rarity, that rarity's share goes to the others. Elemental enemies sometimes drop the matching Woven card. A victory pays for every enemy beaten in the encounter once, whichever round it fell in; a boss leaves its guaranteed cards when it falls and the rest at the victory. Run away and the enemies you had already beaten drop nothing. A rescue at the Adventurers' Guild tops the bag back up to the starter cards.

## Gifts and Trust

With the **Trust system** on (Settings → World), every card in the Inventory has a **Gift** button. Choose someone in the scene and the card leaves your bag. A narrator line records the gift, then the character answers in a new reply. A card they like adds 0.5 Trust, a card they dislike takes 0.5 away, and anything else changes nothing. Ask a character what they like and they will tell you. See the extension `README.md` for how Trust works.

## Fleeing

Under the round button are **Auto**, which plays your best move for you (a skill, a switch, or ending your round when nothing can be paid for), and **Flee**, the running figure. Flee is a Combat Action on your turn and shows the chance once chosen: 60%, plus 10% per Anemo member, minus 10% per extra enemy, plus 25% when every enemy is Frozen or Petrified (between 10% and 95%). Cards you played still take effect. On success the battle ends at once, the enemies leave the scene and the chat records the escape; they can appear again on a later visit. On failure your turn passes to the enemy.

## Movesets

All 124 playable characters, every Traveler element and the 20 bundled enemies have movesets. Each character's three moves are named after their in-game Normal Attack, Elemental Skill and Elemental Burst, and work in the spirit of the game: Bennett heals and buffs, Zhongli shields the party and petrifies, Xiangling and Fischl summon Guoba and Oz, Amber's Baron Bunny draws enemy fire, Hu Tao pays HP for power, Nahida and Faruzan make enemies take more damage, and so on. The numbers are Silly Teyvat's own balance, not game scaling.

Open **Character Customization → Moveset** to edit any character, persona or enemy: role, weapon, Burst Energy, and for each move its name, dice cost (or an enemy's cooldown), element and up to six effects. Effects are damage (power, target, hits), heal, shield, buff (damage dealt, damage taken, crit, dodge, regeneration, elemental infusion), debuff (damage taken, damage dealt, petrify), summon (power or healing each round, duration), Energy, cleanse and HP cost. Targets are one foe, all foes, random foes, the weakest foe, self, one ally, the party, other allies or the most injured ally. The description updates as you edit. **Save moveset** applies from the next round; **Reset to default** restores the bundled kit. Edits are stored in the extension settings per card. A persona playing a character uses that character's kit; otherwise your persona fights with the Traveler kit of its element.

Maximum HP stays in **Profile**. Each character's default comes from their moveset (30 to 42 by role); a value you or a card author chose is kept.

## Paimon

Paimon joins fights whenever she is in the scene, even though her card is not a playable character. She has no Vision, so her moves are Silly Teyvat's own and cost dice of any element:

- **Paimon Punch!** (Normal Attack): 1 Physical damage, misses 45% of the time.
- **Go, Go, Traveler!** (Elemental Skill, 1 die): everyone else deals 20% more damage and gains 15% critical chance for 2 rounds.
- **Paimon's Pep Talk** (Elemental Burst, 2 dice): everyone else heals 3 HP, gains 1 Energy and deals 25% more damage this round.

She has only 22 HP but **dodges half of all enemy hits** (shown as "Dodged!"); damage over time still lands. Dodge is editable for any character in Character Customization → Moveset.

## Elemental reactions

Reactions follow **Genius Invokation TCG**. One point of TCG damage is 2 in Silly Teyvat's numbers (TCG skills deal about 3, ours about 5), so a TCG "+1" is +2 here.

Pyro, Hydro, Electro, Cryo and Dendro **stay applied** to whoever they hit until a reaction uses them up; the icon floats above the card. Anemo, Geo and Physical never stay applied, and Cryo and Dendro can sit together without reacting. When another element hits, it reacts with the applied one and **both are cleared**. Hitting with the same element does nothing extra.

**Elemental enemies are always infused.** An enemy made of Pyro, Hydro, Electro, Cryo or Dendro (a Hydro Slime, a Pyro Abyss Mage, an Electro Cicin…) enters battle with its own element applied, shown with a slow glow above its card. A reaction clears it like any other, and the enemy takes its element back at the End Phase. Anemo and Geo enemies have none, because those elements never stay applied in the TCG.

| Reaction | Elements | Effect (TCG → Silly Teyvat) |
| --- | --- | --- |
| Melt | Pyro + Cryo | +2 → +4 damage |
| Vaporize | Pyro + Hydro | +2 → +4 damage |
| Overloaded | Pyro + Electro | +2 → +4 damage, and the target's side is forced on to its next character |
| Superconduct | Cryo + Electro | +1 → +2, and 1 → 2 Piercing damage to every other character on that side |
| Electro-Charged | Hydro + Electro | +1 → +2, and 1 → 2 Piercing damage to every other character on that side |
| Frozen | Hydro + Cryo | +1 → +2; the target cannot use skills until the End Phase |
| Shatter | Physical or Pyro on a Frozen target | +2 → +4, and it thaws |
| Swirl | Anemo on Pyro, Hydro, Electro or Cryo | 1 → 2 damage of that element to every other character on that side, which can react in turn |
| Crystallize | Geo on Pyro, Hydro, Electro or Cryo | +1 → +2, and the attacker gains a 2-point shield (stacks to 4) |
| Bloom | Dendro + Hydro | +1 → +2, and a **Dendro Core**: your side's next Pyro or Electro hit deals +4 |
| Burning | Dendro + Pyro | +1 → +2, and a **Burning Flame** summon: 2 Pyro damage at the End Phase (stacks to 2 uses) |
| Quicken | Dendro + Electro | +1 → +2, and a **Catalyzing Field**: your side's next two Electro or Dendro hits deal +2 |

Piercing damage ignores shields and bonuses. Dendro Cores and Catalyzing Fields show beside each side's name plate with their uses left, and last until used. Every reaction plays its own animation: its icon blooms over the card with a shockwave, and the card jolts, spins, buzzes or ices over to match.

Hitting a target with **its own element is resisted** (half damage), so a Pyro slime shrugs off Klee and a Pyro enemy barely hurts Bennett. The combo counter tallies reactions in a round; it no longer adds damage. Enemies react too: a soaked party member takes Vaporize from a Pyro attack.

**Elemental Resonance** applies when two living party members share an element: Pyro +15% damage, Hydro +25% healing, Electro one extra die, Cryo +15% crit chance, Anemo makes your first switch each round free, Geo 50% stronger shields, Dendro +1 reaction damage. Damage is exact, as in the game; critical hits (×1.5) come only from cards and Cryo Resonance.

## Enemies

Every enemy has an element (or fights physically), its own HP, an **Attack** used most turns and a **Special** used when its cooldown is ready (round 3 for most, then every few rounds). The enemy side takes two Combat Actions a round with whichever enemy is in front. Below half health an enemy becomes **enraged** and telegraphs its Special. Some have extra rules: the Pyro Abyss Mage and Pyroslinger Bracer carry Pyro shields that Hydro breaks much faster, the Wooden Shieldwall Mitachurl's shield blocks 40% of damage until Pyro burns it, the Cryo Whopperflower is weak to Pyro, the Ruin Guard is armoured, and Fatui agents and Treasure Hoarder scouts dodge Normal Attacks. Enemies aim at your active character (the Marksman at the weakest), and decoy summons draw one enemy attack each round.

Enemy HP is fixed when it first appears and scales gently with the party it meets (×0.65 alone, ×0.75 with three, up to ×0.9 for six fighters); enemy damage scales from ×0.75 to ×1. Only the active character fights, so a bigger party mostly means more health to fall back on. Older chats' health and battles from the previous dice combat are discarded: every chat starts this system fresh.

## Party health and defeat

You and every non-hostile member of the scene have health from their movesets (30 to 42 by role). Your own maximum is that of the character you play, or 34 for the Traveler. A value set in Character Customization → Profile, or by a card's author, wins. Health is saved per chat and shown in the party health panel at the lower left while an encounter is active or anyone is hurt. A downed ally sits out until healed.

As in Genius Invokation, a fight is lost only when **everyone** in the party is down. If you fall while others fight on, you sit out (a Teyvat Fried Egg brings you back), and a won or escaped fight wakes you with 1 HP. If the whole party falls, you are carried to the nearest Adventurers' Guild by map distance, everyone is healed, and Katheryne is waiting at the counter to explain how you were found. Teleporting to any location that is not wilderness also heals the party.

## Settings

Silly Teyvat → Wilderness & combat: **Difficulty** (Story: enemies 80% HP and 70% damage; Normal; Hard: 130% of both), **Enemies strike back**, **Burst splash art & effects**, **Battle sounds** and **Dice sounds**. Reduced motion (Silly Teyvat or SillyTavern setting, or the system preference) keeps all information but drops movement, particles and the splash slide.

The board fits any party size: cards shrink only when a side has more cards than fit between the turn buttons and played cards on the left and the summons, dice and moves on the right, and summons and played cards shrink and pack tighter so they never run into the cards. On phones (1.62): held upright, the whole hand shows along the bottom and its cards close up to fit instead of scrolling out of sight; on taller phones the skills and your summons sit on a row above it. Choosing a skill or card turns the dice drawer into a strip across the middle of the table and puts the details over the hand, so neither covers a card you may tap as a target. Held sideways, the hand peeks from the bottom edge and keeps between your name plate and the skills, the details stay above the middle line beside the enemies, and the drawer stays between the cancel button and the skills. A large party on a short landscape screen sizes its cards to sit above the skills rather than shrinking beside them. HP previews, the coming-damage marker and summon counters stay on their own card or tile, and the board no longer opens with an enemy's tooltip over the table. Since 1.61 some sounds are recorded clips from Splice, timed to their animations (see `assets/battle-sound/README.md`): the coin's spin and landing, the starting hand (one flip per card) and drawn cards, playing a card (over its synthesised sound), a taiko beat on the phase banners (the full roll at the End Phase), a hit's slash and the attack whoosh, heal, shield, buff, summon, the Burst charge, the Burst impact (its hit lands on the flash) and Defeat. Turn chimes, element impacts, reactions, the Burst splash and Victory are synthesised with Web Audio. No game audio is bundled.

## Balance notes

Simulated battles (200 runs each, with the automatic player, which uses no cards and is weaker than a player) on the 1.61 rules: a solo Traveler beats common enemies in 3 to 6 rounds but usually loses to a Ruin Guard; a pair wins nearly every common fight in 3 to 6 rounds while losing a fifth to half of its health; a four-member party wins common fights in 3 to 7 rounds and beats bosses in 7 to 12, losing 40% to 75% of its health. Bosses act twice a round now, so `boss-kits.js` scales its tables to half their HP and three fifths of their damage. Edit any kit, or change Difficulty, to tune this.

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

The **Battle rules, screen & Moveset checks** suite has 129 checks (1.61: turns, switching, cards, tuning, the End Phase, the opening and the board's previews among them): kits, dice payment and tuning, every reaction family and the Genius Invokation reaction rules (persistent and innate auras, Piercing, Dendro Core, Burning Flame, Cryo with Dendro), combos, energy, summons, decoys, enrage, enemy intents, fleeing, every item type, loot, the board controls, playback and the Moveset editor. The combat, send, enemy-attack and dice suites pass alongside it, and a full preview chat was played through two rounds and a successful escape. The board was checked for overlapping elements at 1440×810, 1280×720, 812×375 and 375×812.

Browser checks use disposable preview chats and mock model services. Native card/settings changes were read back through the local SillyTavern API, and all 147 native portrait pixel buffers were compared with backups. No paid/live model request was made. Desktop, portrait and landscape layouts were checked, including rotating the dice dialog while a result was visible. These are browser viewport checks, not a physical iPhone test.

### TCG boss encounters

Twenty normal and weekly bosses (La Signora since 1.65) have optional enemy cards, TCG card artwork and Original neutral sprites. Their moves are adapted from the corresponding Genshin Impact Wiki TCG character cards: damage and HP use Silly Teyvat balance, and TCG-specific deck, preparation, switching, revival and stacking mechanics are approximated with supported damage, shields, status effects and summons. Each boss has its own arena waypoint (catalog version 11) with the boss as the only enemy at a fixed 100% encounter chance, and bosses are also available for selection in their regional enemy pools; existing waypoint pools are not automatically replaced. Since 1.45 each boss's HP and damage are balanced in `boss-kits.js` for a challenging fight: simulated against an auto-played four-member party without food, a normal boss takes 8 to 11 rounds and costs the party about half to two thirds of its health, while Dvalin, Azhdaha, the All-Devouring Narwhal, the Lord of Eroded Primal Fire and the Guardian of Apep's Oasis hit harder or last longer. Enemy HP and damage still scale with party size, so smaller parties face a proportionally smaller boss but have fewer members to absorb it; flee or bring food. The health written on older boss cards is ignored in favour of these rows unless you set a custom value in Character Customization. Defeating a boss grants one guaranteed rare battle card and a Woven card matching its element, including when other enemies remain; a victory also grants the usual loot. The rare rewards are existing consumable cards, not persistent artifact equipment.
