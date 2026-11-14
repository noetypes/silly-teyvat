# Silly Teyvat

A Genshin-inspired visual novel and card-battle game inside SillyTavern. Travel Teyvat with a party of characters, talk to them in a story view with sprites, scenes and music, earn their Trust, and fight Genius Invokation-style battles.

**Version 0.50a** is the first public alpha. Expect rough edges.

Silly Teyvat is an unofficial fan project and is not affiliated with HoYoverse.

## Install and play

Requires **SillyTavern 1.19.0 or later**, Git, and about **7 GB of free disk space** for the extension, game data and download. Run the asset download on the server computer at `http://localhost:8000` (or use HTTPS). Once installed, other browsers and phones use the same server's assets.

1. In SillyTavern, open **Extensions → Install extension** and paste:
   ```text
   https://github.com/noetypes/silly-teyvat-dist
   ```
2. Reload SillyTavern. Accept **Download** when Silly Teyvat offers its game data (**2.14 GB**). Keep the page open while it downloads and installs, then choose **Reload** when finished.
3. Connect your own **Chat Completion API** in SillyTavern. No model subscription or API credentials are included.
4. Choose a persona (Aether and Lumine are included), open a Genshin character card, and start chatting. The Paimon menu opens **Characters**, **Map**, **Inventory** and the other game screens. If dialogue view is off, switch **Silly Teyvat** on in that menu or press **Alt+G**.

The download includes **275 character cards, 2,484 sprites, 959 uploaded files, the Aether and Lumine personas, two lorebooks, the Teyvat Slate theme and Teyvat Choices**. Map backgrounds, portraits, TCG artwork, dice, fonts and interface assets are included with the extension. Your existing SillyTavern content is kept.

If you chose **Not now**, open **Extensions → Silly Teyvat → Share → Check for game data**. Interrupted downloads can be retried; files already installed are skipped. Update the extension through SillyTavern's extension manager; newer game data is offered automatically when available.

Expressions use SillyTavern's **Character Expressions** classifier settings. Chatting, choices and scene classification use your own model connection.

## Features

### Story view

- Replies play as visual novel pages over the scene: gold speaker names, text that reveals at your chosen speed, and arrows, tap or keyboard to move between pages and messages.
- One reply can voice everyone in the scene. The model writes speaker parts (`Klee:`, `Narrator:`), and each part becomes its own message, so the name plate, sprite and expression follow whoever is talking.
- **Guest speakers** (Settings → Dialogue) lets a character voice someone without a card, such as Fischl speaking for Oz (`Oz:`) or Kinich for Ajaw (`Ajaw:`). Those lines show the guest's name, and the character's sprite stays unlit until their own name comes back.
- Narration is shown apart from dialogue, and a hidden **Narrator** sets the scene whenever you are travelling alone.
- **Teyvat Choices** suggests three replies after each character message. Click one to send it.
- **Auto** reads for you, **History** opens the full transcript for editing and swiping, and **Hide UI** clears the screen for screenshots, and **Full Screen** hides the browser around the game on PC and Android (on iPhone, add SillyTavern to the Home Screen and open it from there). Regenerate and Stop sit beside the dialogue box.
- The HUD icons and the Paimon menu open SillyTavern's own panels, restyled to match the game.

### Characters, sprites and scenes

- Every visible character stands on stage with sprites sized by body type. The current speaker comes forward, and the others stay in the scene.
- Expressions are chosen for each page or message and remembered, so revisiting old dialogue shows the same scene without asking the model again.
- **Scene CGs**: hundreds of official artworks, including every character birthday illustration, are offered to a classifier that picks one when a reply fits. CGs can replace the background or open in a frame, and can be images, GIFs or videos with their own sound. Scenes can require certain characters or a location. The **Gallery** collects every scene a chat has shown.
- **Character Customization** (the Paimon menu's Characters screen) edits each card's name, card details and portrait, profile, outfits, expressions, scenes, staging, combat kit and starting Trust. You can upload your own sprite sets, expressions, voice clips and CGs.
- Every card carries a **Silly Teyvat** tag and SillyTavern tags for its role (playable, NPC, enemy or boss), rarity, element, region, weapon, build, titles and nicknames, occupation, affiliation and personality, so the Character List's tag filter can show, say, every Pyro character, every Fatui or every 5★.
- Sprites can have voice clips, and Elemental Bursts play Japanese Burst voice lines. An outfit without its own clip for an expression speaks with that expression's clip from the character's other sprite sets, unless you turn that off for the sprite.

### Playing as anyone

- Play as the Traveler, or use **Play as {{char}}** in Character Customization to become any character, NPC or enemy. Aether and Lumine are the only personas that come with the game; Play as creates a persona for anyone else, sharing the card's sprites, outfits and moveset. Choosing one of those personas in SillyTavern's persona list plays that character too.
- The Travelers begin the game as it begins: arriving in Teyvat with nobody knowing them. Whichever twin you don't play becomes the Abyss twin.
- Playing an enemy reverses the sides. You start in the wilderness among your own kind, and the characters of Teyvat are hostile to you.

### The world map

- A full interactive map of Teyvat with **270 waypoints in eight regions**: Mondstadt, Liyue, Inazuma, Sumeru, Fontaine, Natlan, Nod-Krai and Snezhnaya. Each has its own background and music.
- **Teleport** to any waypoint, from the map or from the **Teyvat** tab of SillyTavern's Backgrounds menu, which shows every location picture. Travel is recorded in the chat with real distances, and a classifier follows the party when the story moves somewhere within the current region.
- Characters live at the places they belong to, and you meet some of them when you arrive. When you leave, you choose who travels with you. Favourites are always there, and anyone left behind waits for you.
- Wilderness waypoints have regional enemy pools, and **20 boss arenas** each hold one boss with its own music.
- Every region has a **Statue of The Seven**, marked with the statue's own map icon (Nod-Krai's is a Statue of the New Moon). Arriving at one restores your party's HP. Arrive with Aether or Lumine in your party, or while playing one of them, to resonate with the region's element. Starfell Lake is a statue too, and the waypoint editor can make any waypoint one.
- You can add, move and edit waypoints, set exploration and battle playlists per place, and adjust encounter chances.
- The model is told the current location and the distances and directions to other places, so travel times stay believable.

### Trust and gifts

- Each character has up to five hearts of Trust with you in each chat. They gain or lose it through the roleplay, and higher Trust makes them more willing to go along with you.
- Characters who already know the one you play start with suitable Trust.
- Give cards from your Inventory as gifts. Everyone has favourite and least favourite cards, based on the game, including their own summons, weapons and haunts. A favourite gives the most Trust: +1 for a 5★ card, or +0.9 for someone who likes no 5★ card, and other likes give less, down to +0.3. The **Gifts** menu in a character's profile sets how much each card raises or lowers their Trust.
- **What do they think of you?** in the Trust menu shows a character's private opinion of you.
- Some sprites and scenes unlock only at a minimum Trust, set in half hearts.

### Genius Invokation battles

- Arm **Attack** before you send a message to fight the enemies in the scene, or a friendly character in a duel. Some characters and enemies start fights themselves.
- Battles follow the Genius Invokation TCG: elemental dice and rerolls, active characters, switching, Elemental Tuning, Energy and Bursts, elemental reactions, summons, supports, weapons, artifacts and statuses. Newer mechanics such as Nightsoul, Techniques and Lunar reactions are included.
- Over a hundred playable characters use their TCG card's kit, and every enemy and NPC has a moveset. You can edit any kit and replace the card art.
- Aether and Lumine have a kit for each of their seven elements, based on the game's Skills and Bursts, with Burst splash art for every element. Change it at a Statue of The Seven or in Character Customization → Combat.
- Every character, enemy and NPC has icons for their combat moves. Every fight has full card animations, weapon-shaped attacks, Burst cinematics, battle sounds and a Victory screen. **Auto** can play your turns for you.
- Victories drop cards based on where you fought and how hard the fight was. Build a combat deck of up to 30 cards in the **Inventory**, and use **Card Search** to mark the places that drop a card you want.
- If the whole party falls, you are carried to the nearest Adventurers' Guild, where Katheryne is always waiting.

### Settings and sharing

- The **Silly Teyvat** switch unloads the whole extension. Below it, feature sets (story view, choices, sprites, CGs, sounds, encounters, battles, Trust, prompts and card art) turn on and off separately.
- Settings are searchable, every section has a Reset, and fine-tuning is folded under **Advanced**.
- **CG & Audio** has a Main volume and separate volumes for music, voices, CG audio, sound effects and interface sounds.
- Every prompt the extension sends, including its roleplay writing guides, is editable under **Settings → Prompts**.
- Scene, location and choice requests can use the main API, a saved Connection Manager profile or WebLLM.
- **Share** exports the extension or the game data as ZIP files for other players. API keys and connection profiles are never exported.
- The interface works on phones in portrait and landscape, with the HYWenHei font bundled.

## Notes

- Map tiles load from HoYoverse's map service as you zoom in. Chat text is never sent there.
- Scene choices, Trust and travel are saved in the chat. Uploaded media and settings are kept on the SillyTavern server; copy them together if you move servers.
- To uninstall, turn Silly Teyvat off, remove it in the extension manager and reload. Saved scene data in chats is harmless without it.

Guides: [Combat](https://github.com/noetypes/silly-teyvat/blob/main/docs/guides/COMBAT.md) · [Trust, gifts and scenes](https://github.com/noetypes/silly-teyvat/blob/main/docs/guides/TRUST-GIFTS-AND-SCENES.md) · [Location catalog](https://github.com/noetypes/silly-teyvat/blob/main/docs/guides/LOCATION-CATALOG.md) · [Location music](https://github.com/noetypes/silly-teyvat/blob/main/docs/guides/LOCATION-MUSIC.md) · [Teyvat Choices](https://github.com/noetypes/silly-teyvat/blob/main/docs/guides/QUICK-REPLIES.md)
