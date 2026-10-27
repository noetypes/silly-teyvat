// Empty wardrobe slots are settings entries, never transparent image files.
export function nextSlotName(prefix, names) {
    const used = new Set(names.map(name => String(name).toLocaleLowerCase()));
    let candidate = prefix, index = 0;
    while (used.has(candidate.toLocaleLowerCase())) candidate = `${prefix}-${++index}`;
    return candidate;
}
export function spriteDrafts(ctx, folder) {
    const prefs = ctx.extensionSettings.genshin_dialogue_ui ??= {};
    const folders = prefs.spriteDrafts ??= {};
    if (!Object.hasOwn(folders, folder)) Object.defineProperty(folders, folder, {value:[], enumerable:true, writable:true, configurable:true});
    return folders[folder];
}
export function draftSprite(folder, draft) {
    return { ...draft, blank:true, path:`/characters/${folder.split('/').map(encodeURIComponent).join('/')}/${encodeURIComponent(draft.name)}.png` };
}
