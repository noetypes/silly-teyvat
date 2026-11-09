// Classifier and Choices requests prefer reasoning off, and fall back to reasoning on for a model that refuses it.
import assert from 'node:assert/strict';
import {preferReasoningOff,reasoningRequired,finalizeChoiceRequest,finalizeReasoningRequest} from '../../extension/genshin-dialogue-ui/choices-api.js';

const yaml={parse:text=>JSON.parse(text)};
const refuses=()=>{const calls=[];return {calls,ask:async off=>{calls.push(off);return off?{error:{message:'Bad Request'}}:{choices:[{message:{content:'ok'}}]};}};};
const fine=()=>{const calls=[];return {calls,ask:async off=>{calls.push(off);return {choices:[]};}};};

let model=refuses();
assert.ok(!(await preferReasoningOff('glm-x',true,model.ask)).error,'a model that refuses reasoning off is answered with it on');
assert.deepEqual(model.calls,[true,false]);
assert.ok(reasoningRequired.has('glm-x'),'and is remembered');
model=refuses();await preferReasoningOff('glm-x',true,model.ask);
assert.deepEqual(model.calls,[false],'a remembered model goes straight to reasoning on');

model=refuses();await preferReasoningOff('other-model',true,model.ask);
assert.ok(reasoningRequired.has('other-model'),'any model is remembered, not only one family');

model=fine();await preferReasoningOff('fast',true,model.ask);
assert.deepEqual(model.calls,[true],'a model that accepts reasoning off is asked once');
assert.ok(!reasoningRequired.has('fast'));

model=fine();await preferReasoningOff('fast',false,model.ask);
assert.deepEqual(model.calls,[false],'with the toggle off, reasoning stays on');

const broken={calls:[],ask:async off=>{broken.calls.push(off);return {error:{}};}};
assert.ok((await preferReasoningOff('down',true,broken.ask)).error,'a connection that fails either way still fails');
assert.deepEqual(broken.calls,[true,false]);
assert.ok(!reasoningRequired.has('down'),'and is not remembered as needing reasoning');

const custom=()=>({chat_completion_source:'custom',model:'glm-x',custom_include_body:JSON.stringify({reasoning_effort:'high',top_k:5,max_tokens:9}),tools:[{}],tool_choice:'auto'});
const off=finalizeChoiceRequest(custom(),yaml),on=finalizeReasoningRequest(custom(),yaml,600);
assert.equal(JSON.parse(off.custom_include_body).reasoning_effort,'none','reasoning off reaches Custom backends');
assert.deepEqual(JSON.parse(on.custom_include_body),{reasoning_effort:'high',top_k:5},'reasoning on keeps the player\'s reasoning settings and drops size overrides');
assert.equal(on.max_tokens,600);assert.equal(on.tool_choice,undefined);assert.deepEqual(on.tools,[]);
console.log('Reasoning fallback checks passed.');
