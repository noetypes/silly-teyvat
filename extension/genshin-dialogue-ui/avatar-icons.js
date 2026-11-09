// Shared transparent head portraits for every circular character surface.
let icons={};
export const avatarIconsReady=fetch(new URL('./assets/avatar-icons/index.json',import.meta.url))
    .then(r=>r.ok?r.json():{}).then(data=>{icons=data.icons || {};}).catch(()=>{});
export const avatarIcon=name=>icons[name]?new URL('./assets/avatar-icons/'+icons[name],import.meta.url).href:'';
