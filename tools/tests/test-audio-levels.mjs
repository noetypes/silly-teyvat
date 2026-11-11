// Unit checks for extension/genshin-dialogue-ui/audio-levels.js. Run: node tools/tests/test-audio-levels.mjs
import assert from 'node:assert/strict';
import {volumeLevel,migrateVolumes,VOLUME_KEYS} from '../../extension/genshin-dialogue-ui/audio-levels.js';
let n=0;const ok=(name,fn)=>{fn();n++;console.log('PASS',name);};
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-9,`${a} is not ${b}`);

ok('each kind plays at its own level times Main volume',()=>{
    const prefs={masterVolume:.5,locationMusicVolume:.4,voiceVolume:1,cgVolume:.6,effectsVolume:.2,uiSoundVolume:.8};
    near(volumeLevel(prefs,'music'),.2);near(volumeLevel(prefs,'voice'),.5);near(volumeLevel(prefs,'cg'),.3);
    near(volumeLevel(prefs,'effects'),.1);near(volumeLevel(prefs,'ui'),.4);
});
ok('Main volume at zero mutes everything',()=>{
    for(const kind of Object.keys(VOLUME_KEYS))assert.equal(volumeLevel({masterVolume:0,voiceVolume:1,cgVolume:1,effectsVolume:1,locationMusicVolume:1,uiSoundVolume:1},kind),0);
});
ok('settings from before 0.56a keep the old shared volume for voices, CGs and effects',()=>{
    const prefs=migrateVolumes({spriteVolume:.35,uiSoundVolume:.5,locationMusicVolume:.2});
    assert.deepEqual([prefs.voiceVolume,prefs.cgVolume,prefs.effectsVolume,prefs.masterVolume,prefs.uiSoundVolume,prefs.locationMusicVolume],[.35,.35,.35,1,.5,.2]);
    // Unmigrated settings already play at the same levels.
    near(volumeLevel({spriteVolume:.35},'voice'),.35);near(volumeLevel({spriteVolume:.35},'effects'),.35);
});
ok('a shared volume of zero stays muted rather than falling back to a default',()=>{
    const prefs=migrateVolumes({spriteVolume:0});
    assert.deepEqual([prefs.voiceVolume,prefs.cgVolume,prefs.effectsVolume],[0,0,0]);
});
ok('fresh settings get the defaults',()=>{
    const prefs=migrateVolumes({});
    assert.deepEqual([prefs.masterVolume,prefs.locationMusicVolume,prefs.voiceVolume,prefs.cgVolume,prefs.effectsVolume,prefs.uiSoundVolume],[1,.45,.8,.8,.8,.7]);
});
ok('a level that was already set is never overwritten, and bad values are clamped',()=>{
    const prefs=migrateVolumes({spriteVolume:.9,voiceVolume:.1,masterVolume:3,cgVolume:-1});
    assert.deepEqual([prefs.voiceVolume,prefs.masterVolume,prefs.cgVolume,prefs.effectsVolume],[.1,1,0,.9]);
});
ok('an unknown kind is an error',()=>assert.throws(()=>volumeLevel({},'thunder'),/Unknown sound kind/));
console.log(`${n} passed`);
