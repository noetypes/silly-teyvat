# Silly Teyvat character metadata research

**Checked:** 2026-10-26  
**Scope:** exact 127 card names present in the 62-card location-linked catalog and 65-card playable expansion catalog. The 20 enemy cards in the separate enemy library are outside this set and are not marked as playable characters here.

`records.json` contains one record for each exact `cardName`/`name`, with `playable`, `element`, `modelType`, `region`, explicit exception notes, confidence, and source URLs. The consuming extension should use the `element` field for combat matching. `visionStatus` prevents a combat element from being mistaken for proof that a character literally holds a Vision.

## Source method

For each name I checked the Genshin Impact Wiki character page through its public MediaWiki API. I read the structured character infobox fields (`type`, `element`, `region`) and its `Playable Characters` and body-model categories. The exact character page and the category page used for model classification are recorded in each record's `sources` array. The roster/list and model definitions are also linked there where relevant.

I cross-checked the roster against the [Genshin Impact Wiki Character List](https://genshin-impact.fandom.com/wiki/Character/List), its [model type explainer](https://genshin-impact.fandom.com/wiki/Model_Type), and the current [HoYoDex character list](https://www.hoyodex.com/wiki/genshin-impact/characters-list), which showed version 7.1 characters as of its 2026-09-30 update. Newer names were checked against their current pages and current version coverage. For example, HoYoverse's 7.0 announcement states that Odette and Alyosha join the playable roster ([official press release](https://www.gamespress.com/Genshin-Impact-Finally-Lands-in-Snezhnaya-Teyvats-Seventh-Nation-on-Au)); Vodyanitsa has an official [HoYoWiki character page](https://wiki.hoyolab.com/m/genshin/entry/11702).

The wiki calls the smallest rig **Short Female**; records normalize that to the user's requested **small female** label. The other four labels are retained as small/medium/tall plus gender. For Travelers and Wonderland Manekin variants, the shared parent page establishes both models and the per-name source records show the exact variant.

## Exceptions and confidence

- **124 playable cards** have a playable profile/category. **Taroumaru, Teucer, and Tonia** are the only non-playable cards among the 127 names. The pages identify Taroumaru as an open-world NPC/dog and Teucer and Tonia as Snezhnaya NPCs. They are tagged `playable: false`, `element: "none"`, with no playable model type. These cards should not enter the playable-party element pool.
- **Aether and Lumine** redirect to Traveler. Their records use the shared profile's gendered models and list all seven currently supported Traveler elements. Both use **Anemo** as the editable default; their element comes from elemental resonance, not a Vision.
- **Manekin and Manekina** redirect to Wonderland Manekin. They are playable Miliastra avatars, use medium male and medium female models respectively, and have an **Adaptive** element rather than a fixed Vision. The records use `element: "unknown"`, `elementMode: "adaptive-copy"`, and list supported elements so combat code will not silently assign a fabricated fixed Vision.
- **Venti, Zhongli, Raiden Shogun, Nahida, and Neuvillette** have a fixed combat element but are marked `visionStatus: "not-asserted"`; their character power source is not a conventional Vision. Combat should still use the recorded affinity.
- **Nicole and Skirk** have no nation value in their infoboxes. Their region tags say `Unspecified` and explain the profile's known affiliation instead of borrowing a home waypoint as their nationality. Aloy and the Travelers are tagged `Otherworld`; Wonderland Manekin variants have no nation.
- **Vesna and Vodyanitsa** are confirmed playable and have their current Anemo/Hydro element and Snezhnaya region. The current character list page leaves their model-type cells blank, and their character pages have not yet gained a model category, so `modelType` is `null` pending a reliable classification. I did not infer from body appearance or unofficial speculation.
- The other 122 playable records have a matching model category. All element and standard model assignments are high-confidence profile/category data. The two blank newer model types are explicitly unverified. The three NPC model types are not applicable to the five playable rigs.

No character in this set is an unverified fan-created OC. Prune is included as the current playable Anemo character from Mondstadt; it is not treated as a custom/non-playable character.

## Counts

| Tag | Count |
|---|---:|
| Total records | 127 |
| Playable | 124 |
| Non-playable NPC cards | 3 |
| Fixed seven-element combat affinity (excluding Traveler variants) | 120 |
| Traveler records with editable Anemo default and seven supported elements | 2 |
| Adaptive Manekin records with no fixed default | 2 |
| Model type known from profile/category or shared parent page | 122 |
| Playable model type still unverified | 2 |
| NPC model type outside the playable five | 3 |
| Missing region affiliation | 0 (non-nation/otherworld cases are explicitly labeled) |
