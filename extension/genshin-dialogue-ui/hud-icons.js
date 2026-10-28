// User-supplied assets replace glyphs only. Native drawer actions stay intact.
export const iconAsset = name => new URL(`assets/icons/${encodeURIComponent(name)}.webp`, import.meta.url).href;
const mapping = {
    'advanced-formatting-button': 'AI Response Formatting', 'ai-config-button': 'AI Response Configuration', 'sys-settings-button': 'API Connections',
    'WI-SP-button': 'World Info', 'user-settings-button': 'User Settings',
    'backgrounds-button': 'Change Background Image', 'extensions-settings-button': 'Extensions',
    'persona-management-button': 'Persona_Management_Aether', rightNavHolder: 'Character Management',
};
// Drawers the Paimon menu holds unless "Keep every SillyTavern button on the top bar" is on.
// API Connections, AI Response Configuration, Persona and Character Management stay on top.
export const TUCKED = [['WI-SP-button', 'World Info'], ['advanced-formatting-button', 'Formatting'], ['user-settings-button', 'User Settings'], ['backgrounds-button', 'Backgrounds'], ['extensions-settings-button', 'Extensions']];
export const tuckedIcon = id => iconAsset(mapping[id]);
export function syncHudIcons(on, persona = 'Aether', tuck = false) {
    for (const [id] of TUCKED) document.querySelector(`#${id}`)?.classList.toggle('gi-hud-tucked', Boolean(on && tuck));
    document.body.classList.add('gi-shell');
    document.body.classList.toggle('gi-choices-enabled', on);
    const drawers = [...document.querySelectorAll('#top-settings-holder > .drawer')].filter(el => getComputedStyle(el).display !== 'none' && !el.classList.contains('gi-hud-tucked'));
    document.body.style.setProperty('--gi-hud-count', Math.max(1, drawers.length));
    if (!on) return;
    for (const [id, name] of Object.entries(mapping)) {
        const target = document.querySelector(`#${id} > .drawer-toggle .drawer-icon`);
        if (!target) continue;
        target.classList.add('gi-hud-target');
        let image = target.querySelector('.gi-hud-icon');
        if (!image) { image = document.createElement('img'); image.className = 'gi-hud-icon'; image.alt = ''; image.setAttribute('aria-hidden', 'true'); target.append(image); }
        const src = iconAsset(id === 'persona-management-button' ? `Persona_Management_${persona === 'Lumine' ? 'Lumine' : 'Aether'}` : name);
        if (image.src !== src) image.src = src;
    }

}
export function disposeHudIcons() {
    document.body.classList.remove('gi-choices-enabled', 'gi-shell');
    document.body.style.removeProperty('--gi-hud-count');
    document.querySelectorAll('.gi-hud-icon').forEach(el => el.remove());
    document.querySelectorAll('.gi-hud-target').forEach(el => el.classList.remove('gi-hud-target'));
    document.querySelectorAll('.gi-hud-tucked').forEach(el => el.classList.remove('gi-hud-tucked'));
}
