# Nobushi sprite visibility repair

All three Nobushi sprite image URLs returned 404 because character display names and overrides use colons while the corresponding disk folders do not. Three relative directory aliases now resolve the URLs returned by the sprite API to the existing folders. This also repairs previously cached scene paths after the browser reloads their images.

The actual sprite API was queried and every returned PNG URL now gives HTTP 200, decodes correctly and matches the existing image hash. Existing artwork, Official Art, settings, cards and extension code are unchanged. No sprites were regenerated or new emotion sets added. Each currently has its existing neutral sprite. Exact aliases, target folders and verification are in run.json. Removing only the aliases reverses this change.
