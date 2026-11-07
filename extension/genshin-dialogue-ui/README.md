# Silly Teyvat 1.61.0: Battles played like Genius Invokation

- **Turns, as in the TCG.** Each armed message now plays a round live on the board. Your active
  character steps forward and is the only one who uses skills; enemy hits land on it. You and the
  enemies take turns: on yours, play cards and tune dice as often as you like, then use a skill,
  switch characters (1 die), flee or end your round. Enemies get two actions a round. Whoever ends
  first acts first next round, and the End Phase draws you two cards.
- **The game's costs and dice.** Eight dice a round with one reroll. A Normal Attack costs one die
  of the character's element and two of any; Skills and Bursts cost dice of the element. Elemental
  Tuning turns a die for a card from your hand (the card goes back into your deck). No more misses
  or random damage: what the preview shows is what lands.
- **A new fight opens like the game:** VS, the coin toss, a Starting Hand of five cards from your bag
  that you can switch once, and the choice of your active character.
- **See before you commit.** Choosing a skill, card or switch shows its details, the dice it will
  spend, a gold check on the target and each card's coming HP change. Tap again or Confirm.
- **New animations and sounds:** recorded sounds timed to the table (the coin spinning and
  landing, one flip per card dealt or drawn, playing cards, a taiko beat on each phase banner and
  the full roll at the End Phase, heals, shields, buffs, the Burst's charge and its impact landing
  on the flash) alongside synthesised ones, turn banners, the skill toast, cards that leap at their
  target, big damage discs, cards flying from hand, switching, fallen cards under a red mark, the
  game's lavender table, and a Victory screen. Elemental Bursts keep the splash art and add a
  cinematic in the character's own card and a sweep shaped by their weapon.
- **Balance.** Only the whole party falling loses a fight now. Enemy HP and damage were rescaled for
  the new turns, and bosses have half their HP and three fifths of their damage (they act twice a
  round). Existing encounters keep the enemy HP they started with.

# Silly Teyvat 1.60.0: Eighty new places and map badges

- **Ten new places in every region.** The world map gains 80 destinations chosen for their story and
  for filling empty stretches of the map: Dragonspine's Entombed City and Skyfrost Nail, Millhaven,
  Sal Terrae, Chenyu Vale's Jademouth, Musoujin Gorge, Khaj-Nisut, Fleuve Cendre, the Faded Castle,
  Villa Guiztli, Starsand Shoal, Old Kitezhgrad, Zapolyarny Palace and more. Each has its own
  background, the music the game plays there, and, for the 49 wild ones, enemies that fit the place.
  They arrive on their own the next time the extension loads; places you deleted or edited stay as
  they are.
- **Badges beside each waypoint.** A speech bubble means characters are there, a hilichurl means
  Wilderness, and a gold emblem means a boss. They follow your changes: place or move a character,
  switch Wilderness on or off, or put a boss in a waypoint's enemy list, and the map updates. The
  waypoint list shows the same badges.
- **Up-to-date map art.** The map now uses HoYoLAB's current artwork, which draws eastern Snezhnaya
  (Novokitezhgrad and Wingspan Peak). Existing waypoints keep their positions.

# Silly Teyvat 1.59.2: Original is a set like any other

- **Rename or delete Original.** In Character Customization → Outfits, the character's own sprite
  folder can now be renamed and deleted like any other set, so you can swap it with a new set or
  replace it. **Remove from list** hides it and keeps its sprites; **Delete set and sprites** erases
  the sprites in that folder and keeps the other sets. As with any set, equip another first. Linking
  the character's folder again under **Link an existing sprite folder** brings it back.
- **Focus outlines aren't cut off.** The outline around the sprite set picker, and around anything
  else on the left edge of the controls, now shows in full.

# Silly Teyvat 1.59.1: Prefer reasoning off

- **Prefer reasoning off, as a switch.** CG & Audio → Scene CGs has **Prefer reasoning off** (it was
  **Skip reasoning**, folded under Advanced), and Dialogue has **Prefer reasoning off for Choices**,
  shown while Choices use the main API. With it on, the request asks for no reasoning, which is
  faster and cheaper. With it off, the model reasons as your connection is set up to.
- **Models that require reasoning work for Choices too.** Choices on the main API always turned
  reasoning off, so a model that refuses that could never suggest replies. Choices and the CG
  classifier now share one fallback: a request that fails with reasoning off is asked again with it
  on, and that model is asked with reasoning on until the page reloads.

# Silly Teyvat 1.59.0: Scene Gallery, a tidier Settings and lighter game data updates

- **One check for the whole scene.** A reply is now checked once against the scenes of everyone
  in it: the speaker, the rest of the party on stage and the character you play. Before, only the
  speaker's scenes (and yours) were offered. With more than one character, each scene is offered
  under its character's name and the classifier is told to pick by whose moment it is, so Klee's
  and Albedo's birthday scenes stay apart even when they share a name.
- **Scenes that need company or a place.** In Character Customization → Scenes, a scene can name
  characters who must all be present and locations of which the party must be at one. Use either
  or both. A scene whose conditions aren't met is left out of the check entirely.
- **Scene Gallery.** A new **Gallery** tile in the Paimon menu shows every scene this chat has
  shown, in the order they first appeared, filtered by character with a count of how many of theirs
  you have found. Choose one to see it again as it appeared, with its sound.
- **Settings you can find.** Settings has a search box that looks through every tab, including
  option names. Each tab shows its everyday settings and folds the fine-tuning under one
  **Advanced** drawer, which counts how many of its settings you've changed. Every section has a
  **Reset** that lights up when something in it differs from the default. Explanations moved into
  tooltips.
- **Game data you already have stays put.** Before downloading, Silly Teyvat checks what is already
  on your server. A first install skips files you already have, and reads only the small manifest
  when you have them all. An update skips a changed file when your copy already matches the new
  one, and when nothing is left to fetch it says **Already have it** instead of downloading.
- **A clearer download popup.** It counts files as it goes and keeps a running tally of files added,
  files you already had and any that failed.
- **CG classification works with models that require reasoning.** Some models refuse a request
  with reasoning turned off, which made every CG check fail with **Skip reasoning** on. The
  classifier now asks again with reasoning on and remembers that model for the session.

# Silly Teyvat 1.58.0: Scene CGs for every character and installs from GitHub

- **Scene CGs for every character.** Every official birthday artwork from 2020 to 2026, 481 in all,
  is now a starter scene on its character's card, ready for the CG classifier with a label, a
  classification and a description of when it fits. Columbina, Teucer, Tartaglia and the Travelers
  also get illustrations and wallpapers, and Paimon's 2023 party artwork is a scene for both twins.
  That makes 494 scenes across 114 cards. They are added once, like the first eight, so scenes you
  removed or edited stay as you left them.
- **Install from GitHub.** Paste the repository address into **Extensions → Install extension**.
  Silly Teyvat then offers its game data and shows the size first; after an update it offers only
  the files that changed. **Settings → Share → Check for game data** asks again at any time.
- **Safer shared packages.** Movesets and battle numbers that arrive in an imported package or chat
  are trimmed to what the editor itself writes before they reach the screen. Your connection
  profiles, signature and installed game data version are never exported.
- **One Narrator.** Opening a chat no longer creates a second Narrator card when two parts of
  SillyTavern ask for it at once.
- **Choices are more forgiving.** A model that introduces its three choices with a sentence is
  understood instead of failing.
- **Errors you can see.** When the map, the character screen, regeneration or audio fails, a
  message now appears instead of being read only to screen readers.
- **Small fixes.** The minimap's location name no longer runs off the screen edge, and tags and
  imports work on pages that aren't served over HTTPS.

# Silly Teyvat 1.57.0: Bursts for every element and room for a big party

- **Bursts hit like Bursts.** A Burst now charges up first: light rays turn behind the card while energy
  gathers into it. The splash art follows over the element's emblem, then the Burst strikes the whole
  board in its element's style: a fire pillar and embers for Pyro, a wave and ripples for Hydro, a vortex
  for Anemo, lightning from above for Electro, a bloom of leaves for Dendro, falling ice shards and snow
  for Cryo and a meteor for Geo. Its hits shake the board harder, flash white and show bigger numbers.
  Enemy Specials get the charge and the strike without splash art.
- **Every element has its own effects.** Impacts, Elemental Skill casts and projectiles each take their
  element's look, and projectiles leave a trail.
- **New battle sounds.** Each element has its own Burst sound (crackling fire, rushing water, howling
  wind, thunder, a blooming chord, shattering ice, a crashing meteor), ringing in a hall, plus a charge-up
  and an element-flavoured cast for Skills. They are still synthesised; no game audio is bundled.
- **Room for five or more.** Cards shrink only when a side would not fit between the turn buttons and
  played cards on the left and the summons, dice and moves on the right. Summons and played cards shrink
  and pack tighter so they never run into the cards, and a big party's dice grow downwards rather than
  into the summons on short screens. On phones held upright, HP badges no longer overlap the next card,
  and on short landscape screens the party no longer runs under the moves.
- **The Paimon menu switch is yours to set.** Each set in Settings → Features has a Paimon icon beside
  its switch. Light it and the Silly Teyvat switch in the Paimon menu turns that set off and back on
  (Story view only, to start). The sets now fold away under one Features row that counts how many are on.
- **Only the speaker's voice plays.** When several sprites change expression at once, only the speaking
  character's sprite voice plays.

# Silly Teyvat 1.56.0: The Narrator, a game-style character screen, menu sounds and an off switch

- **An off switch.** The **Silly Teyvat** switch at the top of Settings unloads the whole extension, so
  SillyTavern runs as if it weren't installed. Below it, ten switches turn sets of features on or off
  together: Story view, Choices & HUD, Sprites & staging, Scene CGs, Sounds, Location encounters, Enemies
  & battles, Trust, Roleplay prompts and Card art in SillyTavern. A set that is only partly on shows a
  half-way switch. Card art in SillyTavern's lists can now be turned off on its own.
- **The Narrator.** A hidden Narrator card keeps you company wherever no other character is in your party.
  It sets the scene when you start a solo journey and whenever you arrive somewhere with nobody there,
  then narrates what you do and the world around you. It never writes dialogue or talks to you, and it
  leaves the moment anyone else joins, enemies included. Edit its arrival prompt in Settings → Prompts.
- **Solo journeys start at home, alone.** Start solo journey now begins at your character's home with nobody
  else in the scene, so either twin begins alone at Traveler's Cove. Anyone who lives there appears when you
  come back later. A persona with no card or no home begins alone at their region's Adventurers' Guild.
  Your character appears as soon as the Narrator's first message starts, and your first solo narration ends
  with a hint about the map that is never saved to the chat or sent to the model.
- **A character screen like the game's.** Character Customization has each element's sky, drifting
  clouds, stars and tumbling particles, crests in the top left, text tabs on the left, the character on a
  reflective floor and details floating on the right. Q/E change character and W/S change section.
  Expressions open on the full body with a magnifier to zoom in.
- **Filters and sorting.** The All characters list (the grid button) filters by type, element, body,
  gender and region, and sorts by name, element, body type, region or type. The portrait strip follows the
  same filters, and a gold dot on the grid button shows when they're on.
- **Aloy counts as Genshin.** Cards tagged "Genshin Impact" are treated like "Genshin", so Hide non-Genshin
  no longer hides her.
- **Menu sounds from the game.** Menus, section tabs, buttons, toggles, choices, items, rising trust,
  waypoints and teleporting play clips from the game. Settings → CG & Audio has an **Interface sounds**
  switch and volume. The clips are listed in `GAME-AUDIO.md`.
- **Teleporting jumps to the new place.** Teleport goes straight to the travel message with the new
  background and sprites. Stepping back shows the earlier scene's background, sprites and music.
- **Cards and namecards.** Persona cards in Persona Management, and solo journeys in Recent Chats, show
  as whole cards like characters. The namecard list has all 291 namecards from the wiki.
- **Smaller fixes.** The trust icon matches the other icons, the map's region menu uses each region's
  emblem, and Starting trust appears only on Profile.

# Silly Teyvat 1.55.0: Traveler's Cove

- **Traveler's Cove.** A new waypoint on the beach just north of Starsnatch Cliff.
- **The Traveler starts there.** Play neither twin and the one who isn't the Abyss twin is found at the
  Cove, whichever way round Settings → World has them. If you moved a twin yourself, they stay put.
- **The Abyss twin stays in the Abyss.** A new chat with them opens in the Chasm on their Abyss greeting,
  with no swipes back to the Traveler's scenes. Before, a new solo chat used a random Traveler greeting.
- **Aether's and Lumine's cards open like the game.** Each card and all five greetings begin the moment
  the twin wakes alone on the beach, with their power gone and their sibling missing. Saved chats keep
  their old greeting. Originals are in `silly-teyvat-data/backups/card-travelers-cove-2026-10-31`.

# Silly Teyvat 1.54.0: Card drops by location, starting trust and every prompt

- **Card drops by location.** Every waypoint has its own pool of cards, drawn from its region's food and
  event cards, so Liyue and Natlan drop different things and two places in one region differ too. Open a
  waypoint on the map and choose **View card drops** to see every card with its rarity, the odds, and
  to add or remove cards. Reset brings the default back.
- **Rarity follows the fight.** Weak enemies such as hilichurls and small slimes drop a 5-star card about
  1% of the time, standard enemies 8%, tough ones 25%, and bosses 60%, plus the rare card they always
  leave. Three enemies at once count as one step harder. The odds are shown in the same window.
- **Every enemy pays.** A victory now drops cards for every enemy in the fight, not only those still
  standing when the last round began, so a three-enemy fight no longer pays less than a single enemy.
- **Starting trust.** Characters who already know the one you're playing no longer start at 0. Every
  Relationships entry in the character cards has a rating from 0.5 to 5 depending on how warm it is, so
  playing Klee starts Albedo at 4.5. Edit a character's list, or add anyone, in Character Customization
  → **Starting trust**.
- **A fresh start for the Travelers.** The game opens as Aether and Lumine arrive in Teyvat, so everyone
  starts at 0 with them and with Paimon. Only the twins trust each other, at 5. The character cards no
  longer mention shared history with the Traveler, and Aether's and Lumine's own cards begin at the
  start of the story. Originals are in `silly-teyvat-data/backups/card-fresh-start-2026-10-31`.
- **The twins.** Each twin has a Traveler card and an Abyss card. Play either twin and the other one takes
  the Abyss role and is found in the Chasm. Play someone else, and Settings → World chooses who is who.
  The Abyss cards are in Settings → Prompts. Everything the lorebook says about the Abyss twin stays
  true for the model, marked as something other characters don't know.
- **Every prompt is editable.** Settings → Prompts → Other prompts now holds Teyvat Choices, What do they
  think of you, the Trust rules and level meanings, gift replies, arrival greetings, World scale, Combat
  state, enemy reactions and both classifiers. Each has a Reset.
- **Small changes.** A gift they feel nothing about adds 0.1 trust. The Trust menu's footer is shorter.
  Trust tags are now also hidden in SillyTavern's own chat when the dialogue view is off, and they no
  longer reach the Teyvat Choices model.

# Silly Teyvat 1.53.0: Trust, gifts and a fresh start with Paimon

- **The Trust system.** Turn it on in Settings → World. Every character has five hearts of Trust with
  you in each chat, from 0 to 5. Characters earn or lose it through the roleplay: the model ends a reply
  with `[Trust +0.5]` or `[Trust -1]`, up to 1 either way in steps of 0.1, and the interface hides the
  tag and shows a small heart instead. Low Trust doesn't mean they dislike you, only that they don't
  know you yet or you've given them a reason to be careful. High Trust makes them more willing to do
  what you ask, even things they'd normally refuse. The levels of everyone in your party are added to
  the prompt on every turn, as **Silly Teyvat: Trust** beside Game systems in AI Config.
- **Trust belongs to the chat.** It is read from the messages themselves, so regenerating, editing or
  deleting a reply changes it correctly. Leaving someone behind and coming back changes nothing, and
  only a new chat starts it again.
- **The Trust menu.** Open Trust from the Paimon menu to see everyone you've met. **What do they think
  of you?** asks the model for that character's private thoughts, using the chat, their card, their
  Trust and whoever you're playing as, and shows them on a sheet of Genshin dialog paper.
- **Gifts.** Every card in the Inventory has a **Gift** button while Trust is on. A narrator line
  records the gift, then the character replies. A card they like adds 0.5, one they dislike takes 0.5
  away.
- **Likes and dislikes.** Everyone has favourite and least favourite cards, based on their Favorite
  Food and Least Favorite Food voice-overs on the Genshin Impact Wiki where those fit a card. The
  rest are plausible guesses, marked `guessed` in `character-tastes.js`. Present characters know
  their own, and will tell you if you ask.
- **29 new cards.** All of the wiki's remaining food cards and item cards, and they all work in
  combat. See `COMBAT.md`.
- **Starfell Lake is a safe location now**, and Paimon lives there. Her card is set at the very start
  of the game: she has just been pulled out of a whirlpool in the lake, all five greetings show that
  first meeting, and she knows nothing about you or anyone else. Update her card with the one in
  `character-cards/paimon/` if you have another copy of it. Your current chats are not changed.
- **Sharper art.** 27 location backgrounds now use larger wiki images, including Starfell Lake, and
  the burst splash art of 71 characters is rebuilt from the wiki's lossless originals.

# Silly Teyvat 1.52.2: Code review fixes

- **Smoother streaming.** The World scale prompt is rebuilt before each generation instead of on every
  screen refresh, which spent about 7 ms a frame on a full map (19 ms with every region in scope).
- **Chat and card text stays text.** Message text is read without running any markup in it, and card,
  persona and move names in battle tooltips are escaped. A shared settings file can no longer alter
  JavaScript's built-in objects.
- **Duels finish cleanly.** Two friends beaten in the same round are both settled, and a friend who
  reacts to a duel is no longer described to the model as an enemy.
- **Health stays up after a fight ends on a round summary.** Fleeing, or a reaction that failed, no
  longer hides the Attack circle and party health until the next message.
- **Movesets save what you see.** Saving a moveset no longer changes an effect's own element (Eula's
  Physical burst stayed Physical), and an enemy's Element choice now applies in battle. Auto leaves
  the dice that played item cards already spent.
- **Smaller fixes.** The namecard picker fills in if it was opened before namecards loaded, and "Match
  companion" follows the open chat. Wardrobe previews keep playing during Dialogue Review. Replaced
  sprites are cropped afresh, and a late crop can no longer cover an empty slot or a scene preview. Exports hold less in memory and survive an oddly encoded file name.

# Silly Teyvat 1.52.1: Your own card images

- **Any card image counts.** A character image shaped like a playable or NPC card now shows as a whole
  card wherever character cards appear, not only on the bundled characters.
- **Card uploads keep their shape.** Uploading a card-shaped image for a character skips SillyTavern's
  crop dialog, so the whole card is kept. Other images still go through it.

# Silly Teyvat 1.52.0: Guaranteed encounters and full cards everywhere

- **Someone is always there.** A location with a character or enemy always brings at least one of
  them, and a location with both brings one of each. Anyone else there rolls the encounter chance,
  up to 3 met at once.
- **Favorites always appear.** A favorited character is always met at their location, even past the
  limit of 3.
- **Left-behind companions wait for you.** A character you leave at a location is there when you come
  back. If more than 3 characters are at that location, it's a random roll unless they are a favorite.
- **Bypass Encounters.** Toggle this on a waypoint's map card to arrive there without meeting anyone.
  It stays on for that waypoint in this chat until you turn it off.
- **Full cards in more menus.** Add character to location, Wilderness encounters, Dialogue Review and
  the favorites row above the character list now show the same uncropped cards as the character list.
- **Enemy limit.** Maximum enemies per encounter now goes up to 3 to match the new limit. A saved
  higher value counts as 3.

# Silly Teyvat 1.51.0: Quicker waypoint images and a wider wilderness

- **Change a waypoint's image by clicking it.** Select a waypoint and click its picture to replace
  the background straight away. The Background source link is gone.
- **Wilderness encounters menu.** Wilderness settings now open in their own window, with a search
  box for the enemy list, from both the map and the Backgrounds tab.
- **More variety.** Every regular wilderness location has a new enemy pool, so enemies appear in
  more places and the same few slimes and hilichurls turn up less often. Treasure Hoarder
  Gravediggers and Pyro Potioneers can now spawn.
- **More wilderness.** Unsettled places with no characters tied to them, such as Stormterror's Lair,
  Luhua Pool, Nazuchi Beach and the Mausoleum of King Deshret, are now wilderness.

# Silly Teyvat 1.50.1: CG frames match their art

- **Frames fit the CG.** A framed CG, image or video, now takes the shape of its art at about the
  same size on screen, including in **Preview CG**. Resizing keeps that shape.

# Silly Teyvat 1.50.0: Video CGs and per-CG display

- **Each CG chooses how it appears.** Character Customization > Scenes now sets every CG to replace
  the background and sprites or open in a framed window. The CG Frame button in the Paimon menu and
  the Presentation setting are gone; existing CGs keep the mode that was in use.
- **Framed on phones.** CGs always open in a frame on phones, so the background stays visible.
- **Preview CG.** A new button shows the selected CG as it will appear, with its sound.
- **Videos and GIFs.** Scenes accept MP4, M4V, WebM and MOV videos up to 300 MB, and animated GIFs.
  Videos play once and hold their last frame unless **Loop video** is on. They are packaged with
  game data like any other upload.
- **CG volumes.** Each CG has its own video volume and linked audio volume. Both scale the master
  volume, and turning off CG audio mutes videos too.

# Silly Teyvat 1.49.0: Complete tester packages

- **No chats or journeys.** Exports no longer offer saved journeys, and imports ignore them.
- **Theme and quick replies.** Game data now carries Teyvat Slate and Teyvat Choices. Import switches
  them on the first time they arrive.
- **Every character's settings.** Import now adds character scenes, sprite sets, voices, properties,
  locations, tags and lorebook links without needing **Use the file's preferences**.
- **New content follows automatically.** Sets, scenes and audio are found from everything in the
  settings, so anything added in Character Customization is exported without further work.
  Installing warns about sprite folders that were copied in by hand and never registered.

# Silly Teyvat 1.48.0: Share with testers

- **Share tab in settings.** New buttons export the extension, export game data and import game
  data, with progress and a Stop button.
- **Export extension.** Saves the installed version, including its art and sounds and your current
  settings, as a ZIP. Unzipped into SillyTavern's `data/default-user/extensions` folder, it starts
  with those settings on the first run.
- **Export and import game data.** Saves the character cards, sprites, voices, music, lorebooks and
  game personas that SillyTavern keeps outside the extension. Import adds only what is missing, so
  it can be repeated after an interruption. It can also replace existing files or use the file's
  settings.
- **Private by default.** API keys, connection profiles and your signature are never exported, and
  cards unrelated to the game stay out.

# Silly Teyvat 1.47.0: Smooth loading, steady phone keyboard, Choices connection, starter scenes

- **Smoother loading screen.** Opening a chat, starting a new one, switching characters and
  travelling each show one continuous loading screen. It now appears in the same moment SillyTavern
  clears the old chat, so the bare interface no longer flashes. It stays up until the new place's
  background has loaded and its sprites are on stage, then fades once; steps that follow each
  other no longer make it cut out and back in. Tips and region emblems cross-fade instead of
  jumping. The region banner waits until the screen has gone.
- **Below SillyTavern's windows.** The loading screen covers the stage, dialogue and Silly
  Teyvat's HUD, but SillyTavern panels, drawers, popups and toasts stay on top and usable.
- **Phone keyboard.** Opening the on-screen keyboard no longer re-sizes or shifts the sprites on
  their own. The background, sprites and CG keep their size and rise with the dialogue and reply
  box as one scene, then settle back when the keyboard closes.
- **Choices connection.** *Dialogue → Choices connection* runs Teyvat Choices on a saved
  Connection Manager profile (Chat or Text Completion) instead of the main API. Main API remains
  the default. A deleted profile falls back to the main API.
- **Starter scene artworks.** Eight official birthday artworks (Klee, Hu Tao, Nahida, Venti, the
  Raiden Shogun, Kazuha, Yoimiya and Albedo) are added once to those characters' Scenes, with
  labels and descriptions written for the CG classifier. Removing or editing one is respected.
- **Scenes panel.** Character Customization → Scenes has titled sections, tiles whose labels stay
  readable, and its own status line. Phones on their side no longer run the tab rail under the
  status bar.
- Model suggestions for the CG classifier and Choices are in `CLASSIFIER-MODELS.md` in the
  repository.

# Silly Teyvat 1.46.1: Last speaker stays in front

The character who spoke last stays in front of the others on stage, through narration and
silence, until someone else speaks.

# Silly Teyvat 1.46.0: Loading screen

A Genshin-style loading screen now covers the stage while a chat opens and while the party
travels to another place, so unloaded sprites and the previous location never show. The centre
emblem is the destination's region, the seven element icons fill white from left to right, and a
tip above them is either the destination's description or a note on how a system works. The
region emblems come from the Genshin Impact Wiki API (`tools/fetch-region-emblems.py`).

# Silly Teyvat 1.45.0: Random greetings, no location flash

- **Random greeting.** A new solo chat starts on a randomly chosen greeting from the card's first
  message and alternates, instead of always the first.
- **No flash of the previous location.** The stage is covered while a chat opens, so the previous
  chat's location (shown while SillyTavern switches or Silly Teyvat starts a fresh chat) never
  appears before the new chat settles at the character's home.

# Silly Teyvat 1.44.5: Companions left behind stay gone

A narration page no longer inherits the sprites of characters who are no longer in the scene,
such as a companion you chose to leave behind when teleporting.

# Silly Teyvat 1.44.4: Review and delete also start clean

A chat opened in a travel party without the journey's origin marker, such as the new chat made
by Dialogue Review or the chat that replaces a deleted one, is now treated as new even if the
extension had already written scene data into it, and becomes a fresh solo chat.

# Silly Teyvat 1.45.0: Boss arenas

- **19 boss arenas on the world map.** Rhodeia of Loch, the Electro, Cryo and Hydro Hypostases, Thunder Manifestation, Golden Wolflord, Maguu Kenki, Jadeplume Terrorshroom, the Emperor of Fire and Iron, Experimental Field Generator, Millennial Pearl Seahorse, Hydro Tulpa, Goldflame Qucusaur Tyrant, Gluttonous Yumkasaur Mountain King, Dvalin, Azhdaha, the All-Devouring Narwhal, the Lord of Eroded Primal Fire and the Guardian of Apep's Oasis each have a Wilderness waypoint at the HoYoLAB marker of their arena or domain entrance. The boss is the only enemy there, at a fixed 100% chance, so arriving always starts the fight.
- **Music and backgrounds.** Each arena has a Genshin Impact Wiki background and plays the boss's combat theme (Caelestinum Finale Termini, Ode to Azhdaha, Eschatologia Iudicata and others) during the fight, with exploration music from the nearest documented waypoint.
- **Tougher bosses.** HP and damage were retuned in simulated fights so every boss is a real fight; see `COMBAT.md`. Card-authored boss HP no longer overrides the balance.
- **Paimon's Genius Invokation card** is now the Genshin Impact Wiki's Paimon support card.
- Existing players get the new waypoints once, on the next load; removed or moved waypoints are left alone.

# Silly Teyvat 1.44.3: New chats start with one character

Choosing New Chat inside a travel party no longer carries the party's enemies, sprites or
scene into the new conversation. The empty chat is replaced by a fresh solo chat with the
card the journey started from. The previous chat keeps its party and messages.

# Silly Teyvat 1.44.2: External game data

Media is installed as links to a separate local data pack. Existing same-origin
URLs, audio assignments and saved scenes continue to work. Use the repository's
`tools/game-data.py link` and `tools/sync-live.sh` with the pack available; see
`GAME-DATA.md` in the repository for installation and relocation instructions.

# Silly Teyvat 1.44.1: More places to explore

- **42 additional destinations.** New locations and exploration playlists fill gaps across all eight mapped regions. Their source links, marker methods and image limitations are recorded in the location catalog.
- **Safer coordinate corrections.** Foggy Forest Path, Lumidouce Harbor, the Fortress of Meropide, the Fane of Ashvattha, Fort Charybdis and Lumberpick Valley now use location-specific markers. Saved pins move only if they still match the old bundled coordinates; custom positions, artwork and playlists are preserved. Underground floors remain projected onto the surface map.
- **Music files.** New bundled assignments register their local audio files when those files are available. Existing music names, custom playlists and intentionally empty playlists are preserved.

# Silly Teyvat 1.44.0: Quieter combat, duels and enemy-started fights

- **Sprite staging.** On a phone on its side and on a desktop, neighbours now stand close together (slightly overlapping, with a wider gap where your party meets the enemies) instead of spreading to the edges. On an upright phone, three or more sprites are drawn smaller and overlap less, so the row is no longer cramped.
- **One classification per page.** A dialogue page is classified once, together with the narration page that precedes it. A request that was cancelled by a refresh, or needed by a narration page for the line before it, reuses the first answer instead of being sent again. SillyTavern's own Expressions extension still classifies each new message separately; turn that off there if you do not want its extra request.
- **Attack.** A small circle with a sword and no text, beside the refresh button in Teyvat Choices. It shows on the last page of the latest message, with or without enemies. With enemies it arms the attack for your next message, as before.
- **Fight a party member.** With no enemies, Attack asks which party members to battle, then puts you in a one-on-one battle against them with their own moves. If you defeat one, you are asked whether to use a Teyvat Fried Egg to revive them. If you decline, or have none, they leave the group and are untied from the location in this chat.
- **Enemy-started fights.** A hostile enemy that writes the **Enemy battle phrase** (Settings → Combat, default `[start_combat]`) starts a battle round once you have read its reply, and acts before your party in that round. A bracketed phrase is hidden from the dialogue; plain words stay visible. The roleplay model is told the phrase in the Combat state note and in Game systems. Leave the phrase empty to turn this off.
- **Health.** The sliding drawer is gone. Enemy health is a slim bar at the top centre; your party is a column of small portraits down the right edge, with names and HP on hover. Round character cutouts (this column, the battle picker, dice and battle plates) use the Sprite wardrobe's circular icons.

# Silly Teyvat 1.43.1: Layout and dialogue focus corrections

- **Welcome screen.** Transparent outer containers keep the rounded panels clear. Recent-chat portraits have their own column, including group collages, without extra rectangular image rings.
- **Paimon menu.** Back and Settings are true circles matching the open launcher. Opening Paimon after Hide UI restores the menu and scene controls. Inventory uses the bundled bag icon resolved from the Genshin Impact Wiki API (`File:Icon Inventory.png`).
- **Health drawer.** Party and enemy HP share one sliding panel. Tap the side **♥ HP** handle to open or close it; Escape also closes it. The open/closed choice is remembered.
- **Staging.** Sprites share a foot baseline. The shortest visible body model keeps its head and shoulders above the dialogue; the tallest stays below the configured height limit, including focus enlargement. Explicit Wardrobe vertical offsets remain available.
- **Light up speaker.** In **Settings → Stage → Speaker focus**, choose **Per page** to dim everyone during narration, or **Per message** to keep the reply's author lit through narration. The controlled persona lights up on player turns, including cached history.
- **Page expression context.** A dialogue page is classified together with the immediately preceding narration page, including narration in the previous message. Narration holds the previous expression; the new expression appears only on the dialogue page. Editing that context invalidates the affected classification.
- **Combat.** Larger item cards and a central phase line across desktop, portrait and landscape layouts. Portrait hands scroll beside the skill controls. Fuel rolls no longer show an empty red enemy portrait ring; that portrait belonged to the older damage preview.
- **Validation.** Automated battle layout checks cover nine viewports from 375×568 through 1920×1080. **Interactive preview → Responsive battle demo** opens a disposable four-member, three-enemy board for resizing. These are browser viewport checks, not physical-device tests.

# Silly Teyvat 1.43.0: Phone layout, sprite staging and Genshin-style menus

- **Sprite staging fits the screen it is shown on.** Sprites are sized and placed when a page is drawn, from the real window: your own sprite and companions on the left, enemies on the right, spread out on a desktop and overlapped from edge to edge on a phone. Faces clear the dialogue box, wide official art no longer shrinks everyone else, and body models keep a shared baseline under the height limit. Rotating or resizing re-fits the scene.
- **Crowded scenes.** **Settings → Staging → Listeners shown**: *Auto* hides characters who are not speaking when more than 5 sprites would be on a desktop screen or more than 3 on a phone; *Recent speakers only* keeps the old limit; *Everyone* shows all. **Only the speaking enemy** and **Only the speaking companion** show one of each at a time (the one talking, or whoever spoke last). Your own sprite always stays.
- **Darken listeners.** Characters who are not speaking are now darkened (Listener brightness, default 0.55) instead of turned see-through, and it is on by default. On a phone with three or more on stage, listeners also step back slightly.
- **Sprite animations.** The speaker grows and listeners darken with a smooth ease; characters step in and fade out when they join or leave; everyone breathes gently while standing (Idle breathing). After a battle round, a party member who was hurt shakes with a red flash and one who was healed glows with rising motes.
- **Eat between battles.** In the Inventory, dishes that heal or revive show **Eat now** with your party's health: tap a member to eat. Mushroom Pizza's healing over time arrives at once, Teyvat Fried Egg revives a downed member. The member glows on the stage when the bag closes.
- **Paimon menu on phones.** The namecard no longer gets cut off at the top; the menu is a narrower sheet with a 3 × 3 tile grid. Back and Settings match Paimon's size and spacing, and "Companion" has room under it on the namecard.
- **Teyvat Choices look like Genshin's dialogue options**, in the dialogue font, with the white speech-bubble icon and a gold highlight. The reply box uses the same slate, ivory and gold, with a gold send button, in scenes, Review and the welcome page.
- **SillyTavern's welcome page** is restyled in Teyvat colours and no longer slides under Paimon or the top-right icons.
- **Phones.** Party and enemy health use the optional side drawer. The top-right SillyTavern icons are tucked into the Paimon menu (Auto), and Attack stays beside the suggested-reply controls.
- **Battle board.** On phones held sideways, enemy intents no longer cover the party and the hand of cards shows; on short upright phones the hand keeps its height. The Roll Phase fits inside its frame on short screens.
- **Icons.** New filled sword, claymore, polearm, bow and catalyst icons (the Attack toggle, enemy intent badges and Normal Attacks without a wiki icon); proper reroll, skip and confirm icons in the Roll Phase; dice picked for a reroll stay visible under a small arrows badge.

# Silly Teyvat 1.42.1: Temporary enemy sprites

- All remaining enemy cards receive transparent temporary Official Art sets and default to them once. Most use HoYoWiki game renders; three use small wiki icon portraits. Clockwork variants share their family render, and the Hydro Phantasm uses its Water-Splitting form. Source and image limitations are recorded in the sprite pack manifest.

# Silly Teyvat 1.42.0: Genius Invokation reactions, instant cards and a cleaner board

- **Reactions work like Genius Invokation TCG.** Applied elements stay until a reaction uses them, and a reaction clears both elements. Melt, Vaporize and Overloaded add +2 (TCG), Superconduct and Electro-Charged add +1 and pierce every other character on that side, Frozen stops the target until the End Phase and breaks for +2 under Physical or Pyro, Swirl spreads the element, Crystallize shields the attacker, Bloom leaves a Dendro Core, Quicken a Catalyzing Field and Burning a Burning Flame summon. Cryo and Dendro sit together. One TCG point is 2 here.
- **Elemental enemies are always infused.** Hydro Slimes, Pyro Abyss Mages, Electro Cicins and every other Pyro, Hydro, Electro, Cryo or Dendro enemy enter battle with their element shown above their card, and take it back at each End Phase after a reaction clears it.
- **Reaction animations.** Each reaction blooms its wiki icon over the card with a shockwave and its own motion and particles: Swirl spins, Overloaded blasts, Frozen ices over, Electro-Charged buzzes. Dendro Cores and Catalyzing Fields sit by each side's name plate with their uses left.
- **Cards work the moment they are played.** Food heals, shields land, Starsigns adds Energy and buffs show straight away, as in Genius Invokation. Played cards cannot be taken back.
- **Cleaner target choice.** The enemy you are aiming at grows slightly and glows; the spinning reticle is gone, and so is the "Everyone is ready" note (the hourglass still pulses). The Attack target selector beside the Attack toggle is gone too: every enemy joins the battle, and you choose targets on the board.
- **Inventory polish.** "No cards of this type yet" sits in the middle of the screen with the tab's icon. The order toggle and Sort pill are centred, and Sort opens a Genshin-style list with the current choice ticked (arrow keys, Enter and Esc work).
- **Sounds.** New card-play and combat-status cues. Combat audio stays synthesised: the supplied GenshinAudio dump is from game version 3.2, before Genius Invokation TCG existed, and the Genshin Impact Wiki has no TCG sound effects.

# Silly Teyvat 1.41.1: Wiki artwork refresh

- Six enemy cards with transparent wiki Full Artwork get an Official Art sprite set, equipped once by default. You can select another set afterward.
- Higher-resolution transparent wiki Full Wish artwork replaces the corresponding burst images when its trimmed dimensions exceed the existing image in both directions.

# Silly Teyvat 1.41.0: Regional enemies, group encounters and Genshin HP bars

- **Enemies live where they belong.** Each enemy has the regions it is found in within Genshin Impact: Eremites and fungi in Sumeru, Kairagi and Nobushi in Inazuma, meka and the Tainted Hydro Phantasm in Fontaine, hilichurls across Mondstadt to Fontaine, Abyss Mages and Rifthounds in Natlan, Fatui and Cryo creatures in Snezhnaya, and so on. All 40 starter wilderness waypoints get pools chosen for their region and terrain (all 67 enemies appear somewhere). Misplaced enemies, such as Ruin Guards in Natlan and Nod-Krai and hilichurls in Snezhnaya, are moved out; enemies you added that belong to the region are kept. A waypoint's editor lists only enemies native to its region, and rolls ignore foreign ones. Your own regions accept any enemy.
- **Several enemies at once.** Set **Settings → Combat → Maximum enemies per encounter** (1–5, default 3). When an encounter happens, 1 to that many different enemies from the pool appear.
- **Defeated enemies stay defeated there.** An enemy you defeat at a waypoint is not rolled there again in that journey. The waypoint's map card lists its enemies, crosses out the defeated ones, and **Restore defeated enemies** brings them back.
- **Genshin-style HP bars.** Enemy and party health use one bar: navy plates with the gold frame of the other menus, a gold-rimmed bar with diamond end caps, a glossy fill and a cream trail that drains after a hit. Party members show their portraits, and their bars turn amber below half and red below a quarter.

# Silly Teyvat 1.40.0: Acting order, Inventory and 47 new TCG enemies

- **Choose who acts first.** The order you give members their moves is the order they act; the number on each medallion shows it. Tap a member who already has a move and use **‹ Act earlier / Act later ›** (or the [ and ] keys) to change it.
- **Clear planning.** After choosing, focus moves on to the next member still without a move. Once everyone has one, nobody stays highlighted: the hourglass pulses and "Everyone is ready" shows. Tap any member to change their move; tap them again to put them down.
- **Toss-Up works like the game.** Playing it goes straight back to the Roll Phase with every die that is not already paying for a move, all selected; reroll them (or deselect some), then return to your plan.
- **Card fixes.** Starsigns now counts towards a Burst in the same round (taking it back drops that Burst). A member revived with Teyvat Fried Egg stands up on the board and can be given a move that round.
- **Inventory.** A new Paimon menu tile opens the party's card bag, laid out after Genshin's item screen: type tabs, cards grouped under headers, quality colours and stars, *New* tags on cards won since you last looked, details on the right and sorting at the bottom.
- **47 new enemies.** Every enemy with a Genius Invokation TCG card now exists in Silly Teyvat, using that card for combat art, its Normal Attack and Elemental Skill as attacks and its Elemental Burst as its Special. Their character cards use the TCG card as the portrait, and the 10 enemies who already existed now do too. Card lists show TCG portraits whole.

# Silly Teyvat 1.39.2: Defeated enemies stay off the stage

- **Gone for good.** After a defeated enemy's sprite plays its fall and leaves, it no longer pops back on the next page of the same message, on later messages, or after the chat reloads. Only a new encounter brings it back.

# Silly Teyvat 1.39.1: Flee confirmation and tidier menus

- **Flee asks first.** The escape chance is no longer shown under the Flee button. Choosing Flee shows the chance and asks you to confirm; **Flee** begins the round as an escape, **Stay** (or Esc) goes back to your plan.
- **Evenly spaced turn buttons.** The round number is now a small badge on the hourglass's corner, so Auto, Begin round and Flee line up evenly.
- **Paimon lines up with the menu.** With the Paimon menu open, the Paimon icon centres over the back and settings buttons.

# Silly Teyvat 1.39.0: Enemy sprite animations and coloured skill medallions

- **Enemies make an entrance.** When an enemy first appears on the stage, its sprite rises in from a dark glow.
- **Hits land on the stage too.** After a round that hurt an enemy, its sprite shakes with a red flash once the battle screen closes.
- **Defeated enemies leave at once.** A defeated enemy's sprite flashes, fades away and exits right after the battle, instead of staying until the party moves on. If a later encounter brings it back, it makes a new entrance. Reduced motion skips the animations.
- **Coloured skill medallions.** The Normal Attack, Skill and Burst buttons use the same element-coloured skill icons as their tooltips, inside the bronze rim.

# Silly Teyvat 1.38.1: Defeated enemies stay defeated

- **No respawning enemies.** An enemy left in the group after a fight elsewhere (defeated, fled or left behind) no longer reappears at the next location with full HP and opens combat. It returns only if that location's own encounter brings it, and the leftover is removed from the group. Chats already affected are repaired when they load.

# Silly Teyvat 1.38: Silly Teyvat prompts in AI Config's prompt order

- **Choose when the AI reads each prompt.** With Chat Completion, Writing style, Characterization, Game systems, World scale and Combat state are entries in **AI Config → Prompts** (named "Silly Teyvat: …"). Drag them to reorder, or toggle them like any other prompt. New entries start next to Main Prompt (Characterization, Game systems) and after Chat History (Writing style, World scale, Combat state); after that, your arrangement is kept.
- **Edits go both ways.** Editing Writing style, Characterization or Game systems in AI Config changes Settings → Prompts, and the other way round. A preset that carries its own version brings it in when you switch to it.
- World scale and Combat state are rewritten every turn, so only their position and toggle are yours.
- Quiet summaries, and replies while Silly Teyvat or its roleplay prompts are off, still leave the prompts out. Disabling the extension blanks the entries. Text Completion keeps the previous hidden injections.

# Silly Teyvat 1.38: Shared character personas, solo journeys and Japanese Burst voices

- **One character, either role.** Choose **Play as** in Character Customization. Aether, Lumine and every other card share their body, outfits, appearance, moveset, CG and Burst audio with their linked persona. Existing persona appearance settings migrate without discarding card overrides. Profile name/description edits also update the linked card; native persona prompt placement remains configurable.
- **Your portrait in Paimon's menu.** The circular portrait opens your own Character Customization entry. Both circular rosters use wiki Avatar Icons (183 assets); cards and native thumbnails retain their original pictures. Characters without an official category icon use their portrait. The separate Persona Management glyph follows the selected body type; **Persona menu icon** overrides it.
- **Play the character already in the scene.** Their group seat is removed and their authored messages become user messages, preserving text, swipes and metadata with original-author provenance. A single-character chat is copied into its managed journey before adoption; its original source chat remains available. Switching chats/personas invalidates pending changes, and generation defers roster edits until it finishes.
- **Travel alone.** The last companion can stay behind. Empty native journey groups save user journal messages without asking a nonexistent NPC to reply; travel can bring new residents into the group. Played characters cannot appear as residents, random encounters or wilderness enemies.
- **Voice once per message.** Automatic sprite audio tracks both the sprite and recording across page changes and presentation resets. A different recording can play for a different sprite, and a new message starts a new allowance. Manual audio previews remain available.
- **Japanese Elemental Burst audio.** 421 wiki clips for 120 characters, including all seven Traveler elements. A randomly selected matching clip plays on the actual Burst action, never on selection or a skipped action. Cancel, chat changes and disabling combat audio stop playback. **Character Customization → Sprites → Elemental Burst audio** supports preview, add, replace, unlink, element filtering and restoring Japanese defaults. Characters without game Burst recordings support uploaded clips.
- Asset download provenance and checksums accompany the local `persona-and-combat-upgrade` bundle. Install its audio with `python3 tools/install-burst-audio.py BUNDLE_DIR USER_FILES_DIR`; the extension includes the icon images and default audio manifest, while audio files use SillyTavern's `/user/files/` store. No existing audio overrides are replaced.

# Silly Teyvat 1.37: Every SillyTavern panel in the Paimon menu, game menu icons

- **All of SillyTavern in the Paimon menu.** AI Config, API, Formatting, World Info, User Settings, Backgrounds, Extensions, Persona and Character List each have a tile in the menu's SillyTavern row.
- **Top-right icons are back as before**, with **Settings → Top-right SillyTavern icons**: Auto (shown on larger screens, hidden on phones for a clean layout), Show or Hide. This replaces 1.36's "Keep every SillyTavern button on the top bar".
- **Game menu icons.** Auto, Review, Characters, Map, CG Frame, Chat Box, Hide UI, Namecard, Back and Settings use Genshin Impact's Paimon menu icons, downloaded from the wiki with `tools/build-menu-icons.py`.

# Silly Teyvat 1.36: Every namecard, enemy cards, a quieter top bar and no forced page turns

- **A namecard for every character.** `tools/build-namecards.py` now also downloads each playable character's own namecard from the wiki (133 in all), so **Match companion** works for nearly everyone. The Travelers and Manekin/Manekina have none in the game.
- **Enemy cards.** Enemies without a Genius Invokation card (Treasure Hoarders, Cryo Whopperflower, Geo, Large Electro and Large Pyro Slimes) get a card drawn from their wiki enemy picture: `tools/build-tcg-cards.py --missing-enemies`.
- **Quieter top bar.** World Info, Formatting, User Settings, Backgrounds and Extensions move into a SillyTavern row in the Paimon menu; API Connections, AI Response Configuration, Persona and Character Management stay on top. Turn on **Settings → Keep every SillyTavern button on the top bar** for the original layout.
- **Battle names stay readable.** The move badge sits in the card's bottom-right corner instead of over the name.
- **Slimmer Roll Phase summary.** Portrait chips with dice counts; names and "2 spare dice tune into 1" are on hover.
- **Round summaries are hidden.** The battle round recap stays in the chat for the roleplay model to read, but is no longer shown or stepped through as dialogue.
- **No forced page turns.** A new reply (including an enemy's reaction after a battle) never pulls you off the message you're reading. You move on with Next, or Auto when it finishes the current message.

# Silly Teyvat 1.35: Paimon menu, Genius Invokation table and skill medallions

- **Paimon menu.** The menu now follows Genshin Impact's Paimon menu: an icon rail (back, settings, version), a profile on a namecard with your Traveler, a signature you can type, Adventure Rank with an EXP bar (25 EXP per message in the chat, 200 per rank, up to 60), Location and Companion, then square tiles for Auto, Review, Characters, Map, CG Frame, Chat Box, Hide UI and Namecard. The version label is read from `manifest.json` instead of being hard-coded.
- **Namecards.** 40 popular namecards (regions, Travel Notes and character cards) downloaded from the Genshin Impact Wiki with `tools/build-namecards.py`. Choose one with the pencil on the profile or the Namecard tile; **Match companion** uses the current character's own namecard when there is one. The choice and signature are saved in the extension settings.
- **Roll Phase table.** Dice are thrown onto a teal felt table with a carved wooden frame, under a spotlight that softens once they settle into the game's four-a-row grid. The title switches to **Reroll · Select dice to reroll** when a reroll is offered, and chosen dice dim under reroll arrows. Faces render saturated (neutral tone mapping, brighter emission) and the dice are larger.
- **Skill medallions.** Moves are bronze medallions with white glyphs, made from the Genius Invokation skill icons by `tools/build-skill-glyphs.py`. Dice costs are rimmed hex dice, Bursts show their Energy cost as a gold star, and moves you can't afford turn the game's dull grey-brown.

# Silly Teyvat 1.34: Roleplay system prompts

- **Three editable system prompts.** A writing style guide, a characterization guide and a game systems guide are sent with every roleplay reply while Silly Teyvat is on. Edit them in **Settings → Prompts**; clear one to turn it off, or press **Reset** for the bundled version. Unedited prompts follow future updates.
- **Writing style.** Visual novel layout (each line is narration or a quote, never both; no asterisks, speaker labels or paragraph blocks), third-person narration, spoken dialogue without em dashes or common AI tropes, and writing only for the speaking character. Sent just above the latest message.
- **Characterization.** Canon embodiment, characters who only know what they witnessed or were told, and a relationship with {{user}} that grows gradually.
- **Game systems.** How travel records, World scale and Combat state notes, battle rounds, enemy defeats, fleeing and Guild rescues appear in the chat, and how to narrate them without changing the results.
- Summaries and classifiers that run quietly in the background do not receive these prompts; in-character enemy reactions and greetings do.

# Silly Teyvat 1.33: Game icons, Traveler and Paimon cards, Paimon in combat

- **Game icons on the battle board.** Moves show their Genius Invokation skill icons, and elements, auras, dice, costs, resonance, reactions, summons and portraits use icons downloaded from the Genshin Impact Wiki with `tools/build-battle-icons.py`.
- **Aether, Lumine and Paimon cards.** The supplied card art is used on the board for the Traveler and Paimon.
- **Paimon fights.** Whenever Paimon is in the scene she joins battles: a feeble punch, cheering that empowers everyone else, and a pep talk that heals them and gives them Energy. She dodges half of all enemy hits.

# Silly Teyvat 1.32: Genius Invokation battle board, items, fleeing and enemy intents

- **A TCG-style battle board.** Battles now play on a Genius Invokation table: enemies on top, your party below, summons on the right, dice down the right edge, moves bottom right, item cards in hand and the hourglass round button on the left. HP drops, Energy diamonds, element icons and status tokens sit on the cards; details appear on hover or long-press instead of helper text. 120 characters and enemies use their official TCG card art.
- **See the enemy's next move.** Each enemy telegraphs its move and target for the coming round, and the member in danger shows the damage coming. Freeze or petrify an enemy to cancel its turn.
- **Items.** A shared bag of 20 TCG event cards: food that heals, shields, revives and empowers (one dish per member per round), dice cards like Toss-Up, Thunder and Eternity and the Woven resonances, and Butter Crab, Starsigns and Send Off. New chats start with basic food; victories drop more.
- **Flee.** Try to escape instead of fighting; the chance shows on the button. On failure the enemies still act.
- **Fresh start.** Health and battles from the earlier dice combat are discarded. HP comes from each moveset (your own from the character you play, or 34), so the "Your maximum HP" setting is gone.

# Silly Teyvat 1.31: Location music

- **Music library on the world map.** Upload and label audio in one shared library, preview tracks, and adjust background-music volume independently of voices and effects.
- **Waypoint playlists.** Choose music from a waypoint's details and select one or more exploration tracks. Multiple tracks shuffle in cycles; cancelling keeps the saved playlist.
- **Wilderness combat music.** Designate one combat-only track. It loops during a hostile encounter, then the exploration song resumes from its previous position. Leaving the location switches to the destination's playlist.
- **Safe playback.** History browsing does not change the live location's music. Chat changes, disabled playback, missing files and autoplay restrictions are handled separately from dialogue audio. See [Location music](LOCATION-MUSIC.md).

# Silly Teyvat 1.30: Turn-based elemental combat

- **Full battle rounds.** Attack + send now plays a round: Roll Phase, an Action Phase where every party member picks a Normal Attack, Elemental Skill or Elemental Burst and a target, then an animated resolution with enemy turns and an End Phase. See **COMBAT.md**.
- **Dice are fuel.** 1 + 2 dice per fighter. Skills and Bursts spend dice of the member's element (Omni is wild, two spare dice tune into one); Normal Attacks are free but can miss. Bursts also need Energy.
- **Movesets for everyone.** All 124 playable characters, every Traveler element and the 20 enemies have three moves named after their in-game attacks, with damage, healing, shields, buffs, debuffs, summons, decoys and HP costs. Enemies have Attacks, Specials, shields, armour, weaknesses and an enraged state.
- **Elemental reactions and combos.** Auras, Vaporize, Melt, Overloaded, Superconduct, Electro-Charged, Frozen and Shatter, Bloom, Burning, Quicken (Aggravate and Spread), Swirl and Crystallize; same-element resistance; combo bonus; Elemental Resonance. The Action Phase forecasts reactions for your chosen order.
- **Burst splash art, effects and sound.** Bursts flash the character's splash art (from the supplied Splash Art folder) with an elemental wash; hits, heals, shields, buffs and debuffs have particles, floating numbers and synthesised sounds.
- **Character Customization.** The Sprite Wardrobe is renamed, and its new **Moveset** tab edits any character's or enemy's moves and effects.
- **Settings.** Difficulty, Burst splash art & effects and Battle sounds replace the old damage-per-die controls. Enemy HP and damage scale with party size.

# Silly Teyvat 1.29: Party health, enemy attacks and the Adventurers' Guild

- **Party health.** You and your companions have HP. Enemies roll their own elemental dice after your attack and hurt a random party member. See **COMBAT.md**.
- **Defeat.** At 0 HP you are carried to the nearest Adventurers' Guild, healed, and Katheryne explains how you were found.
- **Guild waypoints.** Seven Adventurers' Guild locations with artwork across the major regions (Snezhnaya has no art yet).
- **Katheryne.** New NPC card with an official sprite; install with `tools/install-katheryne.sh`.

# Silly Teyvat 1.28.2: Resume where you left off

- Opening a previous chat now returns you to the location where you last left off. Only a new chat with no saved location starts at the character's tied home, and an opening scene is never restarted in a resumed chat.

# Silly Teyvat 1.28.1: Official Art by default

- Characters whose Original set has fewer than two sprites (104 of them) start on their **Official Art** set. This happens once per character and never overrides a set you already equipped.

# Silly Teyvat 1.28: Play as a character

- **Play as.** Every character's Profile tab in the Wardrobe has a **Play as {name}** button. It creates (or reuses) a persona from the card's portrait, description and sprites and switches to it. While you play a character they leave the world's random encounters, location rosters and the Wardrobe menu.
- **Aether and Lumine.** Their personas are linked to their cards from the start. The card is hidden while you play it, and the persona and the card share one set of sprites, outfits and equipped set, so changes in either version show in both.

# Silly Teyvat 1.27: Manage sprite sets

- **Outfits tab.** New set, Rename and Delete buttons manage sprite sets in one inline editor. New set creates `Character/Name` (optionally as a copy of the selected set) and selects it; Rename changes the label and keeps the folder; Delete either removes the set from the list (files kept) or deletes the set and its sprites. The Original and equipped sets are protected. "Link an existing sprite folder" still adds a folder you already have.

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
- **Body-model staging.** A character's Body model sets their relative sprite height (small female → tall male, or Custom with a 30–110% scale slider). The tallest model on screen always gets the full Tallest sprite height, so a small model alone on screen fills it; others stand shorter against the tallest. Per-character scale still applies on top.
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

Wilderness waypoints can spawn a configured enemy at an editable chance. Choose enemy pools from the map or Backgrounds, and set card roles, elements, body models, regions, HP and death messages in Character Customization. Enemy cards and tied-character selectors are kept separate. Forty existing wilderness waypoints have starter pools and a 40% chance.

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

In SillyTavern, open **Extensions → Install extension**, paste the address of this GitHub
repository and choose **Install for me**. After it loads, Silly Teyvat offers to download its game
data (characters, sprites, scenes, music and lorebooks) and shows the size first. **Not now** waits
until the next release; **Settings → Share → Check for game data** asks again.

To hear about updates, turn on **Notify on extension updates** in **Manage extensions**, or update
Silly Teyvat there. After an update that comes with new game data, Silly Teyvat offers just the
files that changed. If you installed an earlier copy by unzipping it into a `genshin-dialogue-ui`
folder, delete that folder first so that two copies don't run at once. Your settings are kept.

### From the source repository

Install the separate data pack and run `python3 tools/game-data.py link`, then
`bash tools/sync-live.sh` from the repository. The installer copies source and
links external media into `SillyTavern/data/<your-user>/extensions/genshin-dialogue-ui/`.
See `GAME-DATA.md` in the repository. Set `SILLY_TEYVAT_LIVE` for another server
directory and `SILLY_TEYVAT_DATA` for another data pack location. Keep the
extension folder name for compatibility with existing settings.

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

Choose the default **Decide sprites** mode in extension settings, or override it for a character in **Character Customization → Character scale, placement & classification**. **Once per dialogue page** classifies each visited speech page. A streaming page becomes eligible at its newline or generation end. **Once per complete message** waits for the full response and classifies it once, then uses that same exact sprite across its dialogue pages. Native LLM / WebLLM classifiers wait until reply generation ends in either mode. Narration continues holding the last spoken scene. The visible scene holds its previous expression while classification is pending.

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

In **Character Customization → Character scale, placement & classification**, each character has a percentage scale, an optional horizontal position and a vertical offset. Select any sprite tile to set **Selected sprite scale (%)** for that exact file, including numbered variants. The total size is global scale × character scale × selected sprite scale. For example, global 100%, character 80% and sprite 125% give the original size. Speaker focus applies on top of that.

Character scale applies across outfits. Individual sprite scale is stored per folder and filename. Scale or placement changes update the visible recorded page and future scenes; earlier pages retain their saved sizes and positions for faithful replay. These settings and uploaded files should be copied together when moving servers.

## Narration

In **Extensions → Silly Teyvat**, enable **Narration handling**, then choose its trigger. It is optional and starts turned off.

- **No quotation marks:** each dialogue page without speech marks becomes narration. One response can alternate between spoken dialogue, narration and spoken dialogue again. Straight, curly, single and Japanese speech quotes count; apostrophes in contractions do not.
- **Keyword:** set an exact, case-sensitive marker such as `Narrator:`. The marker disappears from dialogue view and the rest of that line becomes narration. The next newline returns to normal dialogue. A spoken prefix before a mid-line marker becomes a separate dialogue page.

Narration has no speaker name and uses muted text. It holds the character's most recent spoken expression and retains the other sprites in group scenes. It never classifies the narrative text. If that older speech has no recorded scene, its last spoken page can seed the expression. Original messages and reasoning remain available in History. Player messages keep their normal styling.

**Hide quotation marks on dialogue-only pages** is an optional setting beside Narration handling. It removes the outer speech marks when all text on the current page is quoted dialogue, including a quoted speech stream that has not closed yet. Mixed narration and dialogue keep their marks. Nested quotes and apostrophes inside speech stay. This is a presentation change: the source transcript, saved messages, narration detection, expression input and history retain the original punctuation. It works independently of the narration toggle.

## Character Customization

Open the Paimon menu → the bottom eye icon (**Character Customization**), or its button in the extension settings. The **Enable Character Customization** setting controls whether this menu is available.

1. Choose a character in the portrait strip. Preview its expressions without changing the scene.
2. Expand **Add a sprite set**. Give it a name and a native sprite folder such as `Klee/Summer`. Use an existing folder, or upload images to create it. Native folders allow one outfit subfolder.
3. Select the set and press **Use set**. This uses Character Expressions' normal folder override for that character. Other characters keep their own overrides.
4. Add images with **Image files → Add sprites**. Multiple files use names such as `joy.png`, `love.png` and `love-1.png`. Or turn off filename mapping and select the expression; numbered variants are assigned automatically. Existing filenames are only replaced when **Replace matching filenames** is enabled.
5. The final **+** tile creates a saved empty slot named `expression`, `expression-1`, `expression-2`, and so on. Select it to rename it or upload an image into that exact slot. The first uploaded image fills the selected slot; additional files become numbered variants. Empty slots have no artwork and do not appear on stage. Numbered filenames are variants of their base expression in Character Expressions. **Add expression** below the upload controls also registers a custom label directly. Custom labels are shared with native Character Expressions.
6. Select a sprite and use **Rename** to rename that expression and all its numbered variants in the current set. Renaming an empty slot changes only that slot, retaining its numbered suffix. The new label is registered with native Character Expressions and its pickers refresh. Earlier recorded scenes keep the old artwork. Custom labels need the native LLM or WebLLM classifier; the local emotion model has a fixed vocabulary. Labels shared by other characters are kept.
7. Select a sprite to remove it. **Undo remove** restores the last removed image or empty slot until the page is reloaded. **Forget selected set** only removes its menu entry and keeps the files.

Equipping a set updates the visible saved page. Other previously recorded pages keep their exact outfits and arrangements. Removing a file used by an old scene makes that image unavailable until it is restored.

## Sprite and CG audio

Under **Character Customization → Sprites & audio**, select the exact sprite or numbered variant, choose audio files and press **Add audio to selected sprite**. Under **Scene CGs**, select an artwork and use **Add audio to selected CG**. Multiple files are supported; one is chosen at random each time that sprite changes or that CG is newly selected for a fresh response.

Each CG audio file has its own **Loop** switch. A looping clip continues across pages while its CG stays visible. In scene replacement mode it ends when you leave that message. In framed mode it can continue into following messages until the frame is closed. Any newly triggered clip stops the previous clip. Opening or returning to historical dialogue never starts audio again; browsing back stops a playing clip. Preview buttons play once, even if Loop is enabled.

**Extensions → Silly Teyvat** has separate sprite and CG audio toggles and a shared volume control. If your browser blocks automatic playback, press **Enable audio on this device** once. Mobile browsers may require this again after reopening the app.

Uploads use SillyTavern's authenticated user-file storage, so assignments work on other devices connected to the same server. MP3, WAV, M4A, OGG, WebM, AAC and FLAC files are accepted; playback depends on the browser's codec support. Files must be nonempty and below 50 MB. **Unlink** removes an assignment while keeping its uploaded file.

## Character CGs

1. Open **Character Customization → Scene CGs** and select a character. The final **+** tile creates saved blank entries named `scene`, `scene-1`, `scene-2`, and so on. Empty CG slots stay out of classification. Select one and use **Add scene artwork** to fill it while keeping its labels and audio assignments. Audio can be assigned before artwork is uploaded.
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

Open **Character Customization → Backgrounds**. Backgrounds are shared scene locations, independent of the selected character, sprites and CGs.

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

The round minimap at the top left opens the full Teyvat map. You can also open it through **Character Customization → Backgrounds → Open world map**. Drag to pan, pinch or use the plus/minus controls to zoom. Only your own waypoints are shown.

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
