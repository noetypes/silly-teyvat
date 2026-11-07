# Hu Tao pupil audit

The user explicitly requested this eye-only visual audit. Approved neutral v008 remains unchanged. Each source was reviewed in enlarged source-pixel crops. Small pupils and eyelid occlusion can make precise petal counts uncertain; observations below are visual assessments, not automated measurements.

| Expression | Action | Observation |
| --- | --- | --- |
| neutral | reference_unchanged | Accepted v008 baseline: small pale rounded blossom silhouettes; not editing the approved neutral. |
| annoyance | correct | Both pupils are compressed and irregular; viewer-right flower does not show five distinct rounded petals. |
| smug | correct | Both pupils read as pointed star/cross shapes rather than the neutral's rounded blossoms. |
| confusion | correct | Viewer-right pupil reads as a compact diamond/four-lobed form; viewer-left is more flower-like. |
| love | retain | Both pupils appear to retain small rounded five-lobed blossoms close to the neutral. |
| excitement | retain | Both open eyes appear to retain the neutral's small rounded blossom silhouettes. |
| joy | correct | Both pupils read as hollow-centered diamond/four-lobed forms rather than rounded five-petal blossoms. |
| fear | correct | Viewer-right pupil is cross-like and its lower lobes merge into the amber reflection; five petals are not reliably readable. |
| pride | retain | Small rounded flower silhouettes appear close to v008 in both eyes. |
| desire | retain | Both pale blossom silhouettes appear close to v008, allowing for the head angle. |
| anger | correct | Both pupils read as hollow-centered diamond/four-lobed silhouettes. |
| grief | correct | Small asymmetric cross/diamond pupils; viewer-right lacks a distinct complete five-petal outline. |
| sadness | correct | Both pupils read as compact hollow diamond-like forms, unlike the neutral blossoms. |
| disgust | correct | Viewer-right pupil reads as an incomplete three-pronged shape; five petals are not visible. |
| disappointment | correct | Both pale shapes have flattened/merged lower petals and cross-like upper outlines. |
| relief | correct | Viewer-right pupil is a compact angular four-lobed shape; the two pupils do not match. |
| admiration | correct | Viewer-right pupil is diamond-like, while the viewer-left is elongated; a matching pair of five petals is not readable. |
| gratitude | correct | Viewer-right pupil reads as a hollow-centered four-lobed diamond; viewer-left is irregular. |
| embarrassment | correct | Viewer-left pupil is blob-like, while viewer-right is a small cross/diamond; neither clearly matches the five-petal pair. |
| caring | retain | Both pale rounded blossom outlines appear close to the neutral. |
| love-1 | correct_white_hearts | Both heart shapes are pink; change only their fill to solid white. |
| desire-1 | correct_white_hearts | Both heart shapes are pink; change only their fill to solid white. |

## Correction method trial

The built-in tool has no dedicated markup, mask or pixel-lock argument. Three trial edits supplied each exact target plus an aligned transparent cyan annotation image and the approved neutral/model/portrait references. The actual annotation layers, arguments and raw images are preserved. This is an annotation-image-guided edit attempt, not a verified native markup feature.

Both white-heart trials changed the pupil fill to white. Joy still lacks a clearly readable matching five-petal pair after the trial. All three trials changed areas outside the requested eyes; two changed dimensions. They are unselected candidates and have not replaced any original sprite.

| Trial | Preservation result |
| --- | --- |
| joy | {"same_dimensions": false, "parent_dimensions": [934, 1685], "result_dimensions": [978, 1609]} |
| love-1 | {"same_dimensions": false, "parent_dimensions": [934, 1685], "result_dimensions": [978, 1609]} |
| desire-1 | {"same_dimensions": true, "parent_dimensions": [934, 1684], "result_dimensions": [934, 1684], "changed_pixels": 629067, "changed_pixels_outside_marked_regions": 624653, "pixel_identical_outside_marked_regions": false} |

The remaining edits are prepared but have not been submitted, because the available image tool did not preserve the requested surrounding image. An explicit request to allow deterministic pupil-patch compositing is pending. No live installation was performed.


## Authorized final compositing

The user replied “Yes—paste only the pupil patches.” Final v004 composites use small raster pupil crops from approved neutral v008 for fourteen flagged expressions, and white recolouring of the original hearts for both variants. They preserve original dimensions, exact alpha and every decoded pixel outside the recorded pupil-patch rectangles. V008 plus the five retained expressions are byte-identical to the originals. All 22 files are packaged for review; final approval remains with the user. Earlier failed trials are excluded from the active set.
