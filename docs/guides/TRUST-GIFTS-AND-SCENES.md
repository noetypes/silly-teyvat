# Gift preferences and scene Trust requirements

Gift preferences now cover the expanded Inventory card pool. Existing named likes
and dislikes take priority. Each written like and dislike in `character-tastes.js`
carries its own Trust change, within the usual 0–5 range:

- Likes spread from the character's favourite down to +0.3, evenly by how much they
  like each card. A 5★ favourite (rarity 3) gives +1. A character who likes no 5★ card
  has one favourite 3★ or 4★ card give +0.9 instead. Only the favourite and, for
  characters with many likes, one other card reach +0.9; other 5★ likes give up to
  +0.9 and other 3★ and 4★ likes up to +0.7.
- Besides food, characters like cards tied to them: their own summons, signature
  weapons and home locations (Xiao and Wangshu Inn, Jean and Dandelion Field, Diluc
  and Dawn Winery). A few dislike cards tied to someone they resent, such as the
  Wanderer and Eye of Stormy Judgment.
- Written dislikes give −0.5 for the strongest and −0.3 for the others. A neutral
  gift gives +0.1.
- Likes worked out from element and weapon (below) give +0.3 for 3★, +0.4 for 4★ and
  +0.6 for 5★ cards. Dislikes worked out the same way give −0.3.

- Weapons of the recipient's weapon type are liked; other weapon types are disliked.
  This follows the saved moveset weapon, or the character's bundled moveset.
  An unknown character without a saved weapon has no inferred weapon preference.
- Elemental artifacts matching the recipient's current character properties are
  liked; artifacts with bonuses restricted to other elements are disliked.
  Artifacts without an elemental restriction remain neutral unless named otherwise.
- Matching elemental dice, resonances and summons are liked. Opposing elemental
  gifts are disliked; remaining elements are neutral. For this gift mechanic,
  Pyro opposes Hydro/Cryo, Hydro and Cryo oppose Pyro, Electro opposes Cryo,
  Dendro opposes Pyro, and Anemo/Geo oppose each other. These are gameplay tastes.
- Authored tastes and these additional preferences are both included in the Trust
  prompt and the recipient's gift reply instructions. Past gifts keep their recorded
  verdict and Trust change when character properties or movesets change.
- **Gifts** in Character Customization (Profile, below **Starting trust**) lists
  every card with the Trust change it gives that character, from −2 to +2, in steps
  of 0.1 between −1 and +1. A card
  set above +0.1 counts as liked and one set below 0 as disliked, in the Trust
  prompt and the gift reply; anything between is neutral. Choosing a card's default
  again removes the change, and **Reset to their tastes** removes them all. The
  filter shows one card type, cards that raise or lower Trust, or changed cards.

In **Character Customization → Scenes → Only show this scene when**, set
**Required Trust** for the selected CG. The field saves when changed, accepts
0–5 hearts in steps of 0.1, and defaults to **0** for every existing or new CG.
It measures that CG owner's Trust toward the player, including starting Trust,
even when the CG belongs to a listener rather than the speaker.

While Trust is enabled, the Trust requirement, all required characters, and any
required location must be satisfied together before the CG is offered to the
classifier. Alternative artworks sharing a classification retain their individual
requirements. When checking an older uncached reply, only Trust through that reply
counts; later gifts cannot unlock earlier dialogue. Requirements are checked again
before accepting an asynchronous classification result.

Turning Trust off disables the Trust requirement. Recorded scenes, Gallery and
manual Preview CG remain available. Changing a requirement preserves recorded
choices; **Recheck visible message** explicitly evaluates that reply again.

## Minimum Trust for expression sprites

In **Character Customization → Expressions**, select a sprite and set **Minimum Trust to
be classified** (0–5 hearts, saved per sprite as `spriteTrust`). The classifier only offers a
sprite once that character's Trust toward the player reaches the minimum; if no sprite for
the chosen emotion qualifies, the usual fallback expression is used. Defaults: plain `love`
and `desire` need 3, numbered variants such as `love-1` and `desire-1` need 4, and every other
sprite needs none. Clearing the field, or typing the default, returns the sprite to its default.
As with scenes, older replies are checked against the Trust that existed at that reply, and
turning Trust off disables every sprite requirement (`sprite-trust.js`).
