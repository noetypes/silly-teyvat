# TCG enemy sprites and La Signora's Crimson Witch of Embers

The 18 neutral sprites approved on 2026-11-07 ("Signora accepted along with all the others", listed in
`../2026-11-07-signora-crimson-witch/approved-enemies.json`) are installed as `neutral.png` in each
enemy's SillyTavern character folder. The five names with a colon also get a relative directory alias
under their display name, as in `../2026-11-06-nobushi-visibility-fix`.

La Signora's folder also holds `crimson_witch.png`: the latest Crimson Witch of Embers candidate
(`../2026-11-07-signora-crimson-witch-face-perspective`, neutral-v003, made after the note on v002).
It is not an expression label. Silly Teyvat shows it only after she takes that form in battle
(see COMBAT.md). To use another candidate, copy it over `La Signora/crimson_witch.png`.

`scripts/install.py` checks every source against its approved hash and writes `installation.json`
(sources, destinations, hashes and aliases). The live sprite API returned all 19 files with HTTP 200.
