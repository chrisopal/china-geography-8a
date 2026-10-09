const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const queue = new Map();
let nextFrame = 0;
const media = {matches:false, addEventListener(){}, removeEventListener(){}};
const rendererSource = fs.readFileSync(path.join(__dirname,'..','renderer.js'),'utf8');
const gradient = {addColorStop(){}};
const context = new Proxy({measureText:text=>({width:text.length*8}), createRadialGradient:()=>gradient, isPointInPath:()=>true}, {get(o,k){return k in o ? o[k] : () => {};}});
const canvas = {tabIndex:0,style:{},width:0,height:0,getContext:()=>context,getBoundingClientRect:()=>({left:0,top:0,width:900,height:600}),setAttribute(){},focus(){},addEventListener(){},removeEventListener(){},setPointerCapture(){},releasePointerCapture(){}};
class Path2D {moveTo(){} lineTo(){} closePath(){}}
const sandbox = {window:{devicePixelRatio:1,matchMedia:()=>media,requestAnimationFrame:fn=>{queue.set(++nextFrame,fn);return nextFrame;},cancelAnimationFrame:id=>queue.delete(id),addEventListener(){},removeEventListener(){}},Path2D,document:{createElement:()=>({width:0,height:0,getContext:()=>context})}};
for(const file of ['geo.js','renderer.js'])vm.runInNewContext(fs.readFileSync(path.join(__dirname,'..',file),'utf8'),sandbox);
const scene = new sandbox.window.ChinaScene(canvas,{paused:true});
scene.setScene('river');scene.setOptions({focus:'river-system'});scene.experiment('rain-both');scene.render(1000);
const rain=scene.getState().experiment;assert.equal(rain.routes.length,2);assert.equal(rain.routes[0].channels.length,4);assert.equal(rain.routes[1].channels.length,4);
for(const route of rain.routes){assert.ok(route.downhill);for(const channel of route.channels){assert.ok(channel.downhill);assert.ok(channel.points.length>20);for(const point of channel.points)assert.ok(route.side==='left'?point[0]<.3:point[0]>.3);}}
for(const side of ['left','right']){for(const channel of scene._rainPaths[side]){for(const point of channel)assert.ok(Math.abs(point[2]-scene._localHeight(point[0],point[1]))<1e-12,'runoff must stay on terrain');const end=channel.at(-1),river=scene._rainRiverPoint(side,end[1]);assert.ok(Math.hypot(end[0]-river[0],end[1]-river[1])<1e-12,'channel joins side river');const flow=scene._rainFlow(side,channel);for(let i=1;i<flow.length;i++)assert.ok(flow[i][2]<=flow[i-1][2]+1e-6,'full runoff flow must descend');}}
assert.equal(scene.getState().process.phaseLabels.length,4);
for(const [name,parameter] of [['river',20],['land',80],['resources',65],['transport',80],['ecology',85]]){scene.setScene(name);scene.setOptions({focus:'',parameter});scene.render(1200);const state=scene.getState();assert.ok(state.process.phaseLabels.length>=3,name+' should expose process stages');assert.ok(Object.keys(state.process.counts).length>0,name+' should expose process counts');}
assert.equal((rendererSource.match(/ChinaScene\.prototype\._energy=function/g)||[]).length,1,'energy geometry should have one definition');
scene.setScene('resources');scene.setOptions({parameter:0});scene.render(1300);assert.ok(scene._energyPaths.every(flow=>flow.kind==='coal'&&flow.weight>0),'zero renewable share should have no renewable paths');assert.equal(scene._energyPaths.filter(flow=>flow.kind==='coal').length,1);
scene.setOptions({playbackSpeed:99});assert.equal(scene.getState().options.playbackSpeed,3);
scene.setOptions({playbackSpeed:.01});assert.equal(scene.getState().options.playbackSpeed,.25);
function frame(time){const callbacks=[...queue.values()];queue.clear();assert.equal(callbacks.length,1);callbacks.forEach(fn=>fn(time));}
scene.setOptions({paused:false,playbackSpeed:.5});scene.replay();frame(100);assert.equal(scene._simulationTime,8,'half speed advances 8 ms per 16 ms frame');
scene.setOptions({playbackSpeed:2});frame(116);assert.equal(scene._simulationTime,40,'double speed adds 32 ms per 16 ms frame');
scene.setOptions({paused:true});frame(132);assert.equal(scene._simulationTime,40,'pause must freeze simulation time');
const cameraBefore=JSON.stringify(scene.getState().camera);scene.replay();assert.equal(scene._simulationTime,0);assert.equal(JSON.stringify(scene.getState().camera),cameraBefore,'replay preserves camera');
scene.destroy();
console.log('PASS: distributed downhill runoff, process summaries, scene-specific flow geometry, playback clamp, replay.');
