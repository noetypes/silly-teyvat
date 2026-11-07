# Battle sound clips

Recorded clips that stand in for some of the synthesised battle sounds (`battle-sound.js`).
`index.json` maps each sound to its file; anything not listed stays synthesised (turn chimes, end of
round, card flash, switching, tuning, element hits and reactions, the Burst splash, Victory). Play
Card layers its clip over the synthesised card sound.

Index entries can carry timing so sounds land with the animations:

- `step` (Starting Hand): a clip of evenly spaced events; `deal(count)` plays the first `count`.
  `deal-hand.mp3` holds five card flips 110 ms apart, the stagger of the cards flying in.
- `repeat` (Draw): one event played `count` times that far apart, one flip per card drawn.
- `lead` (Burst impact): the clip's transient comes this far in, so the board starts it early and
  the hit lands with the flash and the shake.

The coin toss is two sounds: the spin as the coin appears, and the landing 2.39 s later, when the
coin's animation settles (`COIN_LAND` in `battle-ui.js`).

All clips are royalty-free samples from **Splice**, licensed to the project owner's Splice account
(November 2026), not covered by this project's MIT code licence. Each was trimmed, faded,
loudness-matched (about −15 to −21 LUFS) and encoded as 160 kbps MP3. Like the other media, the
files live in the separate data pack; clips that are no longer used were moved to the pack's
`backups/retired-battle-sounds-2026-11-06/`.

| Sound | File | Source |
| --- | --- | --- |
| coin | coin-spin.mp3 | Dome of Doom · PFS2_Money_Coin_Drop_12 (5df67533-7929-48c8-a806-89acaa431abf), 0.2–2.6 s |
| coinLand | coin-land.mp3 | Epic Stock Media · Mobile Game 3 · ESM_MG3_fx_powerups_purchase_shop_store_04 (owner's library) |
| deal | deal-hand.mp3 | Big Room Sound · BRS_Cards_Dealing_Flip_Many_2 (bcc18b04-444f-4377-a158-6128721a3966): the flips at 0.10, 0.80 and 1.96 s, plus 4.32 and 5.62 s, matched in level and placed 110 ms apart |
| draw | draw.mp3 | Epic Stock Media · ESM_FX_card_foley_deal_card_single_slide_flip_02 (3a90a492-9716-40a2-b897-fc05e445714f) |
| card | card-flip.mp3 | Big Room Sound · BRS_Cards_Dealing_Flip_Many_1 (53c2d798-8e84-4b71-a709-12942c5083dc), one flip |
| phase | phase-beat.mp3 | Montage by Splice · MNT_OTR_perc_taiko_large_taiko_dokodokodon (5ce8155c-4597-4b38-9f59-b8854440c4f2): its last beat alone (from 1.03 s), faded out; the round banner, Roll and Action Phase |
| phaseEnd | phase-taiko.mp3 | Montage by Splice · MNT_OTR_perc_taiko_large_taiko_dokodokodon (5ce8155c-4597-4b38-9f59-b8854440c4f2), 0–2.0 s: the full roll, for the End Phase |
| shield | shield-bowl.mp3 | Gio Israel · GIO_HEAL_bowls_healer (9cd52f49-56f0-4efa-8e01-cbbf8051b896), 0.2–2.4 s |
| heal | heal-zipper.mp3 | Epic Stock Media · Mobile Game 2 · ESM_Mobile_Game_One_Shot_Special_Zipper_Bell_Power_Up_1 (owner's library) |
| buff | buff-zipper.mp3 | Epic Stock Media · Mobile Game 2 · ESM_Mobile_Game_One_Shot_Special_Zipper_Bell_Power_Up_2 (owner's library) |
| charge | charge-booster.mp3 | Epic Stock Media · Quest Game · ESM_QG_FX_ui_solid_power_booster_up (owner's library) |
| burstImpact | burst-impact-hit.mp3 | Dropgun Samples · Tearout Dubstep 2 · DS_TD2_fx_impact_obtrude_subby, with Field & Foley · Impact Essentials · FF_IE_fx_boom_resonate starting on its transient (0.28 s), faded out (both from the owner's library) |
| whoosh | whoosh.mp3 | Epic Stock Media · ESM_FG2_FX_combat_one_shot_whoosh_whip_02 (a1329649-b198-4544-a627-95dea1e86f2b) |
| slash | slash.mp3 | Epic Stock Media · ESM_FG2_FX_combat_one_shot_slash_animee_sword_hit_2 (5e089754-a386-42ed-a0fc-81bcd3beb940) |
| summon | summon.mp3 | Epic Stock Media · ESM_EMWI_FX_whoosh_magic_mystic_conjure_shimmer_spell_cast_metal_07 (60f5c9fe-cc4f-4624-9b1d-dc4ed2eff297) |
| wipe | wipe.mp3 | Epic Stock Media · ESM_Ambient_Game_Power_Down_Fairy_Dust_1 (77f9c937-60d6-4580-bdf3-6e9cb8301b82) |

`preview-sound-audition.html` plays each sound synthesised and as its clip.
