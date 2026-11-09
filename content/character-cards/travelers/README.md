# Traveler cards

Aether.json and Lumine.json hold the description, scenario and five greetings of each twin's card. The other card fields and the images are not here, because these two cards live in SillyTavern's own characters folder.

Every greeting opens at the same moment as the game: the twin has just woken alone at Traveler's Cove, the beach below Starsnatch Cliff, with their power gone and their sibling missing. The greetings are original fan scenes and don't include Paimon, who is met at Starfell Lake.

The Abyss twin never uses this text: while a twin has the Abyss role, Settings → Prompts replaces their description, scenario and first greeting.

To write these fields into the installed cards:

```bash
python3 tools/write-traveler-cards.py ~/Documents/ChatGPT/Test/SillyTavern/data/default-user/characters
```
