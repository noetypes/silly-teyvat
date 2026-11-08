# Example dialogue

One file per character: the text of that card's **Example Dialogue** (`mes_example`) field. The 126 playable and named characters and the 43 people of Teyvat (including Paimon) each have three exchanges, or two for the smaller NPC cards. Paimon keeps her six, rewritten in the same layout. The 104 enemy cards have two exchanges each, or three for the talkers.

Every reply follows the Silly Teyvat writing style (Settings → Prompts → Writing style), so the model copies the layout instead of writing paragraphs:

- A line is either narration or dialogue, never both, and a blank line separates them.
- Dialogue sits alone inside double quotes. Narration is plain third person, with no quotation marks, asterisks or "I" and "you".
- Lines are one or two sentences. No em or en dashes.
- The voice follows the character's Genshin Impact Wiki voice-over lines (chats, self-introductions, hobbies, likes) and their card. Where a character has no voice-over page (Aether, Lumine, Katheryne, Taroumaru, Teucer, Tonia and the NPCs), it follows the card and the in-game scenes it names.
- Each exchange assumes the character is meeting {{user}} for the first time. It never presumes a shared past or that {{user}} is the Traveler.
- Characters who are not human follow their card: Taroumaru, Plate and Whistle only bark, Nicole speaks into the mind, and the Aranara say "Nara".
- Enemies are invented from their cards and what the game shows of them. Those that cannot speak (slimes, beasts, machines, hypostases and the other bosses) make sounds: each sound is its own quoted line between lines of narration, such as "Bloop. Bloop." or "CLANG!". Hilichurls and their kin call in Hilichurlian ("Ya! Olah!", "Mosi?", "Upa! Lawa!") with gestures carrying the meaning. Fatui, Eremites, Treasure Hoarders, bandits and the Abyss Order's mages and lectors speak in short, guarded lines that give nothing away. Enemies keep their guard up; none of them befriends the party.

To write the files into the cards:

```bash
python3 tools/write-example-dialogue.py --check
python3 tools/write-example-dialogue.py --characters ~/Documents/ChatGPT/Test/SillyTavern/data/default-user/characters --backup /tmp/card-backup
```

`--check` validates the layout of every file. The write step updates `character-cards/location-npcs/*.json`, Paimon's JSON and PNG, and the installed card PNGs. It changes only `mes_example`, in both the V2 and V3 metadata. Reload SillyTavern afterwards so it rereads the cards.
