# Supplied Genius Invokation dice

Silly Teyvat 1.16.1 uses the user's supplied **Elemental_Dice_-_Genshin_Impact_(TCG)** glTF 2.0 model. It has 27,824 vertices, 43,312 triangles, and four 2048 × 2048 texture maps: base color, metallic/roughness, normals and emission. The model buffer and textures are copied unchanged. The `.gltf` file is renamed to `elemental-dice.gltf`; all relative resource paths are retained. The supplied background JPEG is not needed for rendering and is omitted.

The export's viewer placement/rotation is omitted. Its mesh is centered and uniformly normalized at runtime. Each die shares the original geometry and materials. `supplied/face-orientations.json` maps the eight textured panels to the combat result, using their outward normals and texture-up directions. Since 1.21 the roll is a small rigid-body simulation in `dice-tcg.js` (gravity, table/rim bounces and sphere-approximated die-to-die collisions); each die eases onto its predetermined face as it settles, so physics never changes the result. Impacts drive the synthesised audio in `dice-sound.js`. No animation clip was included in the supplied model.

The model is user-provided third-party artwork. The folder contains no creator credit, source URL or license document, and its glTF metadata lists only OpenSceneGraph 3.5.6 as the exporter. This project does not claim authorship or place this model under its MIT code license. Retain the original source's attribution/license if sharing it beyond this local fan project.

Rendering uses **Three.js 0.186.1**, bundled locally under its MIT license (see `THREE-LICENSE.txt`). It loads only for a dice roll. There is no CDN or runtime network service. Geometry, textures, reflection resources and the WebGL context are released when the renderer is disposed. If WebGL or model loading is unavailable, the same rolled faces and damage remain available as text with Continue; the result is not rerolled.

`dice-stage-source.js` is the readable renderer source. Rebuild the local runtime with Node and esbuild:

```sh
npm install --ignore-scripts three@0.186.1 esbuild@0.28.2
npx esbuild dice-stage-source.js --bundle --minify --format=esm --platform=browser --target=es2022 --legal-comments=eof --outfile=dice-stage.js
```

The extension's main `elemental-dice.js` controls the dialog, roll commitment, reduced motion, skipping and cancellation. The bundled renderer handles only the supplied model and visual placement. It does not decide combat results.
