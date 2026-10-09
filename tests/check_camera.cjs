const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');

const queue = new Map(); let nextFrame = 0, now = 1000;
const media = {matches:false, addEventListener(){}, removeEventListener(){}};
const gradient = {addColorStop(){}};
const context = new Proxy({measureText:text=>({width:text.length*9}), createRadialGradient:()=>gradient, isPointInPath:()=>true}, {get(o,k){return k in o ? o[k] : () => {};}});
const listeners = new Map(); const captures = new Set();
const canvas = {tabIndex:0,style:{},width:0,height:0,getContext:()=>context,getBoundingClientRect:()=>({left:0,top:0,width:900,height:600}),setAttribute(){},focus(){},addEventListener:(name,fn)=>listeners.set(name,fn),removeEventListener:name=>listeners.delete(name),setPointerCapture:id=>captures.add(id),releasePointerCapture:id=>captures.delete(id)};
class Path2D {moveTo(){} lineTo(){} closePath(){}}
const sandbox = {window:{devicePixelRatio:2,matchMedia:()=>media,requestAnimationFrame:fn=>{queue.set(++nextFrame,fn);return nextFrame;},cancelAnimationFrame:id=>queue.delete(id),addEventListener(){},removeEventListener(){}},Path2D,document:{createElement:()=>({getContext:()=>context})}};
for (const file of ['geo.js','renderer.js']) vm.runInNewContext(fs.readFileSync(path.join(__dirname,'..',file),'utf8'),sandbox);
let interactions = 0, selections = 0;
const scene = new sandbox.window.ChinaScene(canvas,{paused:true,onInteract:()=>interactions++,onSelect:()=>selections++});
const realRender=scene.render;scene.render=()=>{};
const tick=(count=1)=>{for(let i=0;i<count;i++){const callbacks=[...queue.values()];queue.clear();now+=16;callbacks.forEach(fn=>fn(now));}};
const settle=()=>{tick(90);assert.equal(scene._cameraMoving(),false);};
const event=(id,x,y,extra={})=>Object.assign({pointerId:id,clientX:x,clientY:y,pointerType:'touch',button:0,preventDefault(){}},extra);
scene.setCamera({yaw:.4,pitch:.6,zoom:1.4,targetX:.2,panX:19},{immediate:true});
const camera = JSON.stringify(scene.getState().camera);
scene.setScene('river'); assert.equal(JSON.stringify(scene.getState().camera),camera,'scene changes preserve camera');
scene.setScene('china'); scene.setView('top',{immediate:true});assert.equal(scene.camera.pitch,Math.PI/2);
scene.setCamera({pitch:-9,zoom:100},{immediate:true});assert.equal(scene.camera.pitch,.06);assert.equal(scene.camera.zoom,3.6);
scene.setCamera({zoom:NaN,targetX:Infinity},{immediate:true});assert.equal(scene.camera.zoom,3.6);
scene.reset();settle();

// The same model point remains under the wheel anchor after proportional zoom.
const p=[.2,.1,.05], anchor=scene._project(...p);
scene._wheel(event(1,anchor[0],anchor[1],{deltaY:-95,deltaMode:0}));settle();
const anchored=scene._project(...p);assert.ok(Math.hypot(anchored[0]-anchor[0],anchored[1]-anchor[1])<.02,'wheel zoom is anchor preserving');
scene.reset();
scene._down(event(1,300,200));scene._move(event(1,355,225));assert.equal(scene.camera.yaw,-.1,'orbit is damped');tick();assert.ok(scene.camera.yaw>-.1);
scene._up(event(1,355,225));assert.equal(scene.getState().gesture.pointers,0);settle();assert.equal(selections,0,'drag cannot select');
const yaw=scene.camera.yaw;scene._down(event(2,300,200,{pointerType:'mouse',button:2}));scene._move(event(2,335,215,{pointerType:'mouse',button:2}));scene._up(event(2,335,215));settle();assert.equal(scene.camera.yaw,yaw);assert.ok(scene.camera.panX>30,'right-drag pans');

// Multiple pointers never jump back to orbit or pick when one finger lifts.
scene.reset();scene._down(event(3,300,300));scene._down(event(4,500,300));scene._move(event(4,560,330));scene._up(event(4,560,330));scene._move(event(3,330,315));scene._up(event(3,330,315));settle();
assert.ok(scene.camera.zoom>1.2);assert.equal(scene.camera.yaw,-.1);assert.equal(selections,0);assert.equal(scene.getState().gesture.mode,'none');
scene._down(event(5,100,100));scene._move(event(5,200,100));listeners.get('pointercancel')(event(5,200,100));scene._up(event(5,200,100));assert.equal(selections,0);assert.equal(captures.size,0);assert.equal(scene._velocity.remaining,0);
scene._down(event(6,100,100));listeners.get('lostpointercapture')(event(6,100,100));assert.equal(scene.getState().gesture.pointers,0);
scene._down(event(7,100,100));scene.setScene('river');assert.equal(scene.getState().gesture.pointers,0);assert.equal(captures.size,0);

// Paused physics still allows camera frames, with no particle time change.
const time=scene._simulationTime;scene.setView('top');tick(20);assert.equal(scene._simulationTime,time);assert.ok(scene.camera.pitch>1.5);settle();assert.equal(queue.size,0,'paused idle renderer stops scheduling');
scene.setOptions({paused:false});tick(3);assert.ok(scene._simulationTime>time);scene.setOptions({paused:true});tick(2);assert.equal(queue.size,0);
scene._key({key:'1',preventDefault(){}});settle();assert.equal(scene.view,'oblique');scene._key({key:'2',preventDefault(){}});settle();assert.equal(scene.view,'top');scene._key({key:'3',preventDefault(){}});settle();assert.equal(scene.view,'profile');
scene._key({key:'ArrowRight',shiftKey:true,preventDefault(){}});settle();assert.ok(scene.camera.panX>20);

scene.setOptions({focus:'river-system'});scene.experiment('rain-left');scene.experiment('rain-right');let rain=scene.getState().experiment;assert.equal(rain.rain.length,2);
for(const route of rain.routes){assert.equal(route.downhill,true,route.side+' route must descend');for(const [x] of route.points)assert.ok(route.side==='left'?x<.3:x>.3,'route stays on own side of ridge');assert.equal(route.points.at(-1)[1],.75);}
const beforeClear=interactions;scene.experiment('clear-rain');assert.equal(interactions,beforeClear,'clearing a lesson cannot leave follow mode');assert.equal(scene.getState().experiment.rain.length,0);scene.experiment('rain-both');assert.equal(scene.getState().experiment.rain.length,2);scene.reset();assert.equal(scene.getState().experiment.rain.length,2,'reset view preserves experiment evidence');
scene.setScene('china');scene.setOptions({focus:'terrain-steps'});scene.applyCue({view:'profile',parameter:75,stage:2});settle();assert.equal(scene._isStepsProfile(),true);assert.equal(scene.stage,2);assert.equal(scene.options.parameter,75);
scene._down(event(20,300,250));scene._move(event(20,335,270));scene._up(event(20,335,270));settle();assert.equal(scene.view,'custom');assert.equal(scene._isStepsProfile(),true,'manual orbit keeps conceptual profile');
scene.setView('top',{immediate:true});assert.equal(scene._isStepsProfile(),false);scene.setView('profile',{immediate:true});
realRender.call(scene,0); // Exercise the conceptual profile's complete Canvas drawing path.
scene.setScene('river');scene.setOptions({focus:'river-system'});scene.experiment('rain-both');realRender.call(scene,1000); // Exercise both rain overlays and shaded watershed mesh.
// Wind fields cover multiple geographic corridors and keep seasonal direction.
scene.setScene('monsoon');scene.setOptions({focus:'monsoon',parameter:0});realRender.call(scene,1000);
assert.equal(scene._windPaths.length,10);assert.equal(scene.getState().wind.clouds,0);
for(const flow of scene._windPaths){assert.equal(flow.kind,'winter');assert.ok(flow.geographic.at(-1)[1]<flow.geographic[0][1]);assert.ok(flow.geographic.at(-1)[0]>flow.geographic[0][0]);}
scene.setOptions({parameter:100});realRender.call(scene,1000);
assert.equal(scene._windPaths.filter(f=>f.kind==='southeast').length,8);assert.equal(scene._windPaths.filter(f=>f.kind==='southwest').length,5);assert.ok(scene.getState().wind.clouds>5);
for(const flow of scene._windPaths){assert.ok(flow.geographic.at(-1)[1]>flow.geographic[0][1]);assert.ok(flow.points.flat().every(Number.isFinite));}
scene.setOptions({parameter:50});realRender.call(scene,1000);assert.equal(scene._windPaths.length,23);assert.ok(scene._windPaths.every(f=>f.weight===.5));
scene.setScene('china');scene.setOptions({focus:'plateaus'});scene.setView('oblique',{immediate:true});realRender.call(scene,0);assert.equal(scene._hit.length,34);
scene._down(event(9,300,200));scene._up(event(9,300,200));assert.equal(selections,1,'ordinary click still selects a province');
const selected=scene.selected;scene._focusAt(event(9,300,200));settle();assert.ok(scene.camera.zoom>1);assert.equal(scene.selected,selected);
assert.ok(interactions>8,'manual gestures notify parent');const before=interactions;scene.applyCue({view:'top',stage:1});assert.equal(interactions,before,'lesson cues never notify manual interaction');
scene._reduced=true;scene.setCamera({yaw:1,pitch:.8});assert.equal(scene.camera.yaw,1,'reduced motion uses immediate camera');scene._down(event(10,300,200));scene._move(event(10,350,200));scene._up(event(10,350,200));assert.equal(scene._velocity.remaining,0);
scene.destroy();assert.equal(queue.size,0);assert.equal(listeners.size,0);assert.equal(captures.size,0);
console.log('PASS: anchored zoom, orbit damping/inertia, pan, pinch/cancel, scene preservation, keyboard, paused physics, reduced motion, province picking, downhill watershed rain, profile rendering, destroy.');
