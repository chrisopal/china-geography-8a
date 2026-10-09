/* ChinaScene — dependency-free Canvas2D educational relief model.
 * Geographic outlines: geo.js (source provenance in research/map-sources.md).
 * Elevation, rainfall, energy and process values below are schematic indices,
 * never DEM, statistics, forecasts or a geographic routing service.
 * Parameter meaning: china=theme emphasis (terrain=relief); monsoon=winter→summer;
 * river=vegetation cover; land=slope conservation; resources=renewable share;
 * transport=road / rail / water mode; ecology=catchment restoration effort.
 */
(function (root) {
  'use strict';
  var TAU = Math.PI * 2;
  var P = root.CHINA_PROVINCES || [];
  var G = root.CHINA_GEOMETRY || { outline: [], offshore: [] };
  var NAMES = { china: '中国地理全景', monsoon: '季风与降水', river: '河流与水土流失', land: '土地利用实验', resources: '能源结构实验', transport: '交通运输实验', ecology: '流域生态修复' };
  var LAYERS = ['terrain', 'provinces', 'population', 'climate', 'rivers', 'agriculture', 'industry', 'resources', 'ecology'];
  var DEFAULTS = { focus: '', layer: 'terrain', parameter: 55, labels: true, autoRotate: false, paused: false, playbackSpeed: 1, exaggeration: 1.3 };
  var MAP_FOCUS = {
    plateaus:{title:'四大高原',hint:'比较位置与地貌',description:'定位青藏、内蒙古、黄土、云贵四大高原；标记表示大致位置，不是地形区边界。',places:[['青藏高原',90,32],['内蒙古高原',110,43],['黄土高原',108,36],['云贵高原',104,25.5]]},
    basins:{title:'四大盆地',hint:'天山南北对照',description:'定位塔里木、准噶尔、柴达木、四川四大盆地；比较天山南北与季风区内外的大致位置。',places:[['塔里木盆地',83,39],['准噶尔盆地',85,45],['柴达木盆地',95,37],['四川盆地',105,30.5]]},
    plains:{title:'三大平原',hint:'东部南北排列',description:'从北向南定位东北、华北、长江中下游三大平原，并观察东南丘陵的大致位置。',places:[['东北平原',125,46],['华北平原',116.5,36],['长江中下游平原',116,29.8],['东南丘陵',117,26]]},
    'mountain-directions':{title:'主要山脉走向',hint:'结合北箭头判读',description:'金色表示东西走向，青色表示东北—西南走向，浅紫色表示南北走向；线段仅概括山脉位置与整体走向。',mountains:['tianshan','yinshan','qinling','daxingan','taihang','wushan','xuefeng','hengduan']},
    'step-boundaries':{title:'阶梯分界山脉',hint:'宏观地形过渡带',description:'金色突出一、二级阶梯间的昆仑、祁连、横断山；青色突出二、三级间的大兴安岭、太行、巫山、雪峰山。示意线不是精确分界。',mountains:['kunlun','qilian','hengduan','daxingan','taihang','wushan','xuefeng']}
  };
  var MOUNTAINS = {
    kunlun:{name:'昆仑山脉',points:[[76,36],[83,36],[89,35.7],[96,35.3]],label:[86,36],direction:'ew',step:1},
    qilian:{name:'祁连山脉',points:[[94.5,39],[98,38],[102.7,36.7]],label:[98.5,38.2],direction:'nw',step:1},
    hengduan:{name:'横断山脉',points:[[99,33],[99.4,30],[99.7,27]],label:[99.3,29.5],direction:'ns',step:1},
    daxingan:{name:'大兴安岭',points:[[120.2,50],[120,47],[118.6,45],[117.5,43]],label:[119.8,47.4],direction:'ne',step:2},
    taihang:{name:'太行山脉',points:[[114.5,40.3],[113.6,38],[112.6,35.4]],label:[113.5,38],direction:'ne',step:2},
    wushan:{name:'巫山',points:[[110.1,32],[109.7,30.5],[109.4,29.5]],label:[109.7,31],direction:'ne',step:2},
    xuefeng:{name:'雪峰山',points:[[111.4,28.3],[110.9,27.5],[110.4,26.6]],label:[110.9,27.4],direction:'ne',step:2},
    tianshan:{name:'天山山脉',points:[[80,42],[86,43],[92,43]],label:[85.5,42.9],direction:'ew'},
    yinshan:{name:'阴山山脉',points:[[106,41],[110,41],[114,41]],label:[109,41],direction:'ew'},
    qinling:{name:'秦岭',points:[[104.8,34],[108,34],[111.3,33.5]],label:[107,34],direction:'ew'}
  };
  var CITIES = [{name:'北京',p:[116.4,39.9]},{name:'上海',p:[121.47,31.23]},{name:'武汉',p:[114.3,30.6]},{name:'重庆',p:[106.55,29.56]},{name:'广州',p:[113.27,23.13]},{name:'兰州',p:[103.8,36.06]},{name:'乌鲁木齐',p:[87.62,43.83]}];
  var YANGTZE = [[91.1,33.5],[94,33],[97,32],[98.5,28.3],[100,26.7],[102,27.8],[104,28.7],[106.5,29.5],[108.5,30.5],[111,30.7],[114.3,30.6],[116.1,29.8],[118,31],[121.6,31.5]];
  var YELLOW = [[96.5,35],[98,34.2],[100,34],[102,35.4],[103.8,36],[105.8,37.4],[106.8,39.5],[109,40.8],[111.2,40],[110.5,36.2],[110.3,34.7],[113,34.8],[116,35.4],[119.1,37.8]];
  var clamp = function(v,a,b){return Math.max(a,Math.min(b,v));};
  var mix = function(a,b,t){return a+(b-a)*t;};
  function color(a,b,t){t=clamp(t,0,1);return 'rgb('+a.map(function(x,i){return Math.round(mix(x,b[i],t));}).join(',')+')';}
  function noise(x,y){return Math.sin(x*3.3+y*7.1)*Math.cos(x*5.7-y*2.9);}
  function gauss(x,y,cx,cy,sx,sy){return Math.exp(-(((x-cx)/sx)*((x-cx)/sx)+((y-cy)/sy)*((y-cy)/sy)));}
  function elevation(lon,lat){
    var h=.045+.30*gauss(lon,lat,87,32,14,6)+.20*gauss(lon,lat,96,34,9,5);
    h+=.14*gauss(lon,lat,85,43,8,1.4)+.10*gauss(lon,lat,88,48,7,2);
    h+=.08*gauss(lon,lat,106,37,5,6)+.085*gauss(lon,lat,103,25,5,5);
    h-=.075*gauss(lon,lat,105,30,3,2)+.12*gauss(lon,lat,83,39,7,2.3);
    h+=.025*gauss(lon,lat,118,27,5,4)+.038*gauss(lon,lat,127,43,5,5);
    // Keep variation below the mesh sampling frequency so outlines do not spike.
    h+=.005*noise((lon-104)*.08,(lat-36)*.08);
    return Math.max(.028,h);
  }
  function inside(point,ring){var yes=false,x=point[0],y=point[1];for(var i=0,j=ring.length-1;i<ring.length;j=i++){var a=ring[i],b=ring[j];if(((a[1]>y)!==(b[1]>y))&&(x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0]))yes=!yes;}return yes;}
  function box(r){var b=[Infinity,Infinity,-Infinity,-Infinity];r.forEach(function(p){b[0]=Math.min(b[0],p[0]);b[1]=Math.min(b[1],p[1]);b[2]=Math.max(b[2],p[0]);b[3]=Math.max(b[3],p[1]);});return b;}
  var REGIONS=[];P.forEach(function(p){p.polygons.forEach(function(poly){if(poly[0].length>3)REGIONS.push({p:p,r:poly[0],holes:poly.slice(1),b:box(poly[0])});});});
  function regionAt(lon,lat){for(var i=0;i<REGIONS.length;i++){var r=REGIONS[i],b=r.b;if(lon>=b[0]&&lon<=b[2]&&lat>=b[1]&&lat<=b[3]&&inside([lon,lat],r.r)&&!r.holes.some(function(h){return inside([lon,lat],h);}))return r.p;}return null;}
  var CELLS=null;
  function makeCells(){if(CELLS)return CELLS;var cells=[],step=.62;for(var lat=18;lat<54;lat+=step){for(var lon=73;lon<135;lon+=step){var pr=regionAt(lon+step/2,lat+step/2);if(!pr)continue;var a=[lon,lat],b=[lon+step,lat],c=[lon+step,lat+step],d=[lon,lat+step];[[a,b,c],[a,c,d]].forEach(function(v){cells.push({v:v,lon:lon,lat:lat,h:elevation(lon,lat),province:pr});});}}CELLS=cells;return cells;}
  function ChinaScene(canvas,opts){
    if(!(this instanceof ChinaScene))return new ChinaScene(canvas,opts);
    if(!canvas||!canvas.getContext)throw new Error('ChinaScene requires a canvas');
    this.canvas=canvas;this.ctx=canvas.getContext('2d');this.options=Object.assign({},DEFAULTS,opts||{});
    this.onSelect=opts&&typeof opts.onSelect==='function'?opts.onSelect:null;
    this.onInteract=opts&&typeof opts.onInteract==='function'?opts.onInteract:null;
    this.scene='china';this.camera={yaw:-.1,pitch:.83,zoom:1,targetX:0,targetY:0,targetZ:0,panX:0,panY:0};
    this._cameraGoal=Object.assign({},this.camera);this._velocity={yaw:0,pitch:0,remaining:0};this.view='oblique';this._profileActive=false;this.stage=0;
    this.selected=null;this._pointers=new Map();this._drag=null;this._gestureMode='none';this._gestureMoved=false;this._gestureMulti=false;
    this._hit=[];this._w=1;this._h=1;this._raf=0;this._last=0;this._simulationTime=0;this._dirty=true;this._destroyed=false;this._cache=null;this._labelBoxes=[];this._rain=null;this._processState={kind:'terrain',phase:'静止地形',phaseLabels:['地形'],counts:{}};
    this._motion=root.matchMedia?root.matchMedia('(prefers-reduced-motion: reduce)'):null;this._reduced=this._motion?this._motion.matches:false;
    this._listeners=[];var self=this;function listen(el,event,fn,options){el.addEventListener(event,fn,options);self._listeners.push([el,event,fn,options]);}
    canvas.tabIndex=canvas.tabIndex>=0?canvas.tabIndex:0;canvas.setAttribute('role','img');canvas.style.touchAction='none';canvas.style.cursor='grab';canvas.style.display='block';canvas.style.width='100%';canvas.style.height='100%';
    listen(canvas,'pointerdown',function(e){self._down(e);});listen(canvas,'pointermove',function(e){self._move(e);});listen(canvas,'pointerup',function(e){self._up(e);});
    listen(canvas,'pointercancel',function(){self._cancelGesture();});listen(canvas,'lostpointercapture',function(e){if(self._pointers.has(e.pointerId))self._cancelGesture();});
    listen(canvas,'contextmenu',function(e){e.preventDefault();});listen(canvas,'wheel',function(e){self._wheel(e);},{passive:false});
    listen(canvas,'dblclick',function(e){self._focusAt(e);});listen(canvas,'keydown',function(e){self._key(e);});listen(canvas,'blur',function(){self._cancelGesture();});
    if(this._motion&&this._motion.addEventListener)listen(this._motion,'change',function(e){self._reduced=e.matches;if(e.matches){self._velocity.remaining=0;Object.assign(self.camera,self._cameraGoal);}self._invalidate();});
    if(root.ResizeObserver){this._observer=new root.ResizeObserver(function(){self.resize();});this._observer.observe(canvas);}else listen(root,'resize',function(){self.resize();});
    this._updateAria();this.resize();
  }
  ChinaScene.prototype.resize=function(){var r=this.canvas.getBoundingClientRect();this._w=Math.max(1,r.width||900);this._h=Math.max(1,r.height||600);this._dpr=clamp(root.devicePixelRatio||1,1,2);this.canvas.width=Math.round(this._w*this._dpr);this.canvas.height=Math.round(this._h*this._dpr);this.ctx.setTransform(this._dpr,0,0,this._dpr,0,0);this._invalidate();};
  ChinaScene.prototype._invalidate=function(){this._dirty=true;this._cache=null;this._request();};
  ChinaScene.prototype._cameraMoving=function(){var self=this;return this._velocity.remaining>0||Object.keys(this.camera).some(function(k){return Math.abs(self.camera[k]-self._cameraGoal[k])>.0001;});};
  ChinaScene.prototype._advanceCamera=function(dt){
    var changed=false,v=this._velocity;
    if(v.remaining>0&&!this._pointers.size&&!this._reduced){var step=Math.min(dt,v.remaining);this._cameraGoal.yaw+=v.yaw*step;this._cameraGoal.pitch=clamp(this._cameraGoal.pitch+v.pitch*step,.06,Math.PI/2);v.yaw*=Math.exp(-step/90);v.pitch*=Math.exp(-step/90);v.remaining-=step;}
    var amount=this._reduced?1:1-Math.exp(-dt/48),self=this;
    Object.keys(this.camera).forEach(function(k){var d=self._cameraGoal[k]-self.camera[k];if(Math.abs(d)>.0001){self.camera[k]+=d*amount;if(Math.abs(self._cameraGoal[k]-self.camera[k])<.0001)self.camera[k]=self._cameraGoal[k];changed=true;}else if(d){self.camera[k]=self._cameraGoal[k];changed=true;}});
    if(changed)this._cache=null;return changed;
  };
  ChinaScene.prototype._physicalMotion=function(){return !this.options.paused&&!this._reduced&&(this.options.autoRotate||['monsoon','river','land','resources','transport','ecology'].indexOf(this.scene)>=0);};
  ChinaScene.prototype._request=function(){if(this._raf||this._destroyed)return;var self=this;this._raf=root.requestAnimationFrame(function(t){
    self._raf=0;if(self._destroyed)return;var dt=self._last?clamp(t-self._last,0,48):16;self._last=t;
    if(!self.options.paused&&!self._reduced)self._simulationTime+=dt*clamp(Number(self.options.playbackSpeed)||1,.25,3);
    if(self.options.autoRotate&&!self.options.paused&&!self._pointers.size&&!self._reduced){self._cameraGoal.yaw+=dt*.000055;}
    self._advanceCamera(dt);self.render(self._simulationTime);
    if(self._cameraMoving()||self._physicalMotion())self._request();else self._last=0;
  });};
  ChinaScene.prototype._updateAria=function(){this.canvas.setAttribute('aria-label',NAMES[this.scene]+'。拖动旋转，滚轮缩放，Shift 或右键拖动平移，双指缩放平移，双击聚焦。方向键旋转，Shift 加方向键平移，加减号缩放，1 斜视、2 俯视、3 剖面，Home 复位，L 显隐标注；全国地图可按左右方括号切换省级行政区，Enter 查看。'+this.describe());};
  ChinaScene.prototype._manual=function(type){this._velocity.remaining=0;if(this.onInteract)this.onInteract({type:type});};
  ChinaScene.prototype.setScene=function(name){if(!NAMES[name])return;this._cancelGesture();this.selected=null;if(this.scene!==name){this.scene=name;this._rain=null;this._profileActive=false;this.stage=0;this._simulationTime=0;this._processState={kind:name,phase:'等待绘制',phaseLabels:[],counts:{}};}this._updateAria();this._invalidate();};
  ChinaScene.prototype.setOptions=function(opts){opts=opts||{};if(Object.prototype.hasOwnProperty.call(opts,'focus')){var focus=typeof opts.focus==='string'?opts.focus:'';if(focus!==this.options.focus){this._rain=null;this._profileActive=false;this.stage=0;}this.options.focus=focus;}if(LAYERS.indexOf(opts.layer)>=0)this.options.layer=opts.layer;if(Number.isFinite(Number(opts.parameter)))this.options.parameter=clamp(Number(opts.parameter),0,100);if(Number.isFinite(Number(opts.exaggeration)))this.options.exaggeration=clamp(Number(opts.exaggeration),1,3);if(Number.isFinite(Number(opts.playbackSpeed)))this.options.playbackSpeed=clamp(Number(opts.playbackSpeed),.25,3);['labels','autoRotate','paused'].forEach(function(k){if(k in opts)this.options[k]=!!opts[k];},this);this._updateAria();this._invalidate();};
  ChinaScene.prototype.replay=function(){this._simulationTime=0;this._last=0;this._invalidate();return this;};
  // target is in model coordinates; panX/panY are CSS pixels. Camera methods do
  // not trigger onInteract, so lessons can guide the view without leaving follow mode.
  ChinaScene.prototype.setCamera=function(patch,opts){
    patch=patch||{};opts=opts||{};var limits={pitch:[.06,Math.PI/2],zoom:[.55,3.6],targetX:[-1.7,1.7],targetY:[-1.5,1.5],targetZ:[-.2,1.5],panX:[-this._w*.85,this._w*.85],panY:[-this._h*.85,this._h*.85]},self=this;
    Object.keys(this.camera).forEach(function(k){if(patch[k]===undefined||!Number.isFinite(Number(patch[k])))return;var value=Number(patch[k]);self._cameraGoal[k]=limits[k]?clamp(value,limits[k][0],limits[k][1]):value;});
    if(opts.immediate||this._reduced)Object.assign(this.camera,this._cameraGoal);this._invalidate();return this;
  };
  ChinaScene.prototype.setView=function(name,opts){var views={oblique:{yaw:-.1,pitch:.83},top:{yaw:0,pitch:Math.PI/2},profile:{yaw:0,pitch:.12}};if(!views[name])return this;this._cancelGesture();this.view=name;this._profileActive=name==='profile';this.setCamera(Object.assign({zoom:1,targetX:0,targetY:0,targetZ:0,panX:0,panY:0},views[name]),opts);return this;};
  ChinaScene.prototype.applyCue=function(cue){cue=cue||{};if(cue.view)this.setView(cue.view);if(cue.camera)this.setCamera(cue.camera);if(cue.parameter!==undefined)this.setOptions({parameter:cue.parameter});if(cue.stage!==undefined&&Number.isFinite(Number(cue.stage)))this.stage=Math.max(0,Math.floor(Number(cue.stage)));this._invalidate();return this;};
  ChinaScene.prototype.setLessonStep=function(index){if(Number.isFinite(Number(index)))this.stage=Math.max(0,Math.floor(Number(index)));this._invalidate();return this;};
  ChinaScene.prototype.reset=function(){this._cancelGesture();this.setView('oblique',{immediate:true});};
  ChinaScene.prototype.zoom=function(delta){this._manual('zoom');this.setCamera({zoom:this._cameraGoal.zoom*Math.exp(Number(delta)||0)},{immediate:true});};
  ChinaScene.prototype._zoomAt=function(factor,x,y){var c=this._cameraGoal,next=clamp(c.zoom*factor,.55,3.6),ratio=next/c.zoom;this.setCamera({zoom:next,panX:x-this._originX()-(x-this._originX()-c.panX)*ratio,panY:y-this._originY()-(y-this._originY()-c.panY)*ratio});};
  ChinaScene.prototype._wheel=function(e){e.preventDefault();this._manual('zoom');var r=this.canvas.getBoundingClientRect(),delta=e.deltaY*(e.deltaMode===1?16:e.deltaMode===2?this._h:1);this._zoomAt(Math.exp(-clamp(delta,-240,240)*.0017),e.clientX-r.left,e.clientY-r.top);};
  ChinaScene.prototype._cancelGesture=function(){var ids=Array.from(this._pointers.keys());this._pointers.clear();this._drag=null;this._gestureMode='none';this._gestureMoved=true;this._gestureMulti=false;this._velocity.remaining=0;Object.assign(this._cameraGoal,this.camera);var self=this;ids.forEach(function(id){try{self.canvas.releasePointerCapture(id);}catch(ignore){}});this.canvas.style.cursor='grab';};
  ChinaScene.prototype._down=function(e){
    if(e.pointerType==='mouse'&&e.button!==0&&e.button!==2)return;
    this.canvas.focus({preventScroll:true});this._manual('pointer');
    if(!this._pointers.size){this._gestureMoved=false;this._gestureMulti=false;this._gestureMode=e.button===2||e.shiftKey?'pan':'orbit';}
    this._pointers.set(e.pointerId,{x:e.clientX,y:e.clientY,startX:e.clientX,startY:e.clientY});
    if(this._pointers.size>1){this._gestureMode='pinch';this._gestureMulti=true;this._gestureMoved=true;}
    this._drag=true;try{this.canvas.setPointerCapture(e.pointerId);}catch(ignore){}this.canvas.style.cursor='grabbing';
  };
  ChinaScene.prototype._move=function(e){
    var p=this._pointers.get(e.pointerId);if(!p)return;var dx=e.clientX-p.x,dy=e.clientY-p.y,old=Array.from(this._pointers.values()).map(function(a){return {x:a.x,y:a.y};});
    if(Math.hypot(e.clientX-p.startX,e.clientY-p.startY)>5)this._gestureMoved=true;
    p.x=e.clientX;p.y=e.clientY;
    if(this._pointers.size>1){
      var now=Array.from(this._pointers.values()),a=old[0],b=old[1],aa=now[0],bb=now[1],before=Math.hypot(a.x-b.x,a.y-b.y),after=Math.hypot(aa.x-bb.x,aa.y-bb.y),r=this.canvas.getBoundingClientRect();
      var ox=(a.x+b.x)/2-r.left,oy=(a.y+b.y)/2-r.top,nx=(aa.x+bb.x)/2-r.left,ny=(aa.y+bb.y)/2-r.top;
      if(before>8&&after>8)this._zoomAt(after/before,ox,oy);this.setCamera({panX:this._cameraGoal.panX+nx-ox,panY:this._cameraGoal.panY+ny-oy});
    }else if(this._gestureMode==='pan'||e.shiftKey){this._gestureMode='pan';this.setCamera({panX:this._cameraGoal.panX+dx,panY:this._cameraGoal.panY+dy});}
    else{this.view='custom';this.setCamera({yaw:this._cameraGoal.yaw+dx*.005,pitch:this._cameraGoal.pitch+dy*.004});this._velocity={yaw:clamp(dx*.00023,-.004,.004),pitch:clamp(dy*.00018,-.003,.003),remaining:0};}
  };
  ChinaScene.prototype._pick=function(x,y){if(['china','monsoon','transport'].indexOf(this.scene)<0||this._isStepsProfile())return null;for(var i=this._hit.length-1;i>=0;i--){var h=this._hit[i];if(this.ctx.isPointInPath(h.path,x*this._dpr,y*this._dpr,'evenodd'))return h.province;}return null;};
  ChinaScene.prototype._up=function(e){
    var p=this._pointers.get(e.pointerId);if(!p)return;var mode=this._gestureMode,click=!this._gestureMoved&&!this._gestureMulti&&mode==='orbit'&&Math.hypot(e.clientX-p.startX,e.clientY-p.startY)<=5;
    this._pointers.delete(e.pointerId);try{this.canvas.releasePointerCapture(e.pointerId);}catch(ignore){}
    if(this._pointers.size){this._gestureMoved=true;this._gestureMulti=true;this._gestureMode=this._pointers.size>1?'pinch':'pan';return;}
    this._drag=null;this._gestureMode='none';this.canvas.style.cursor='grab';
    if(click){var r=this.canvas.getBoundingClientRect(),province=this._pick(e.clientX-r.left,e.clientY-r.top);if(province)this._select(province);}
    if(mode==='orbit'&&this._gestureMoved&&!this._gestureMulti&&!this._reduced){this._velocity.remaining=180;this._request();}
  };
  ChinaScene.prototype._focusAt=function(e){
    this._manual('focus');var r=this.canvas.getBoundingClientRect(),x=e.clientX-r.left,y=e.clientY-r.top,p=this._pick(x,y),patch={panX:0,panY:0,zoom:clamp(this.camera.zoom*1.35,1,3.6)};
    if(p){patch.targetX=(p.centroid[0]-104.5)/29;patch.targetY=(36-p.centroid[1])/22;patch.targetZ=this._height(p.centroid[0],p.centroid[1]);this._select(p);}else{
      var c=this.camera,scale=this._scale(),rx=(x-this._originX()-c.panX)/scale,ry=(y-this._originY()-c.panY)/scale/Math.max(.22,Math.sin(c.pitch));patch.targetX=c.targetX+rx*Math.cos(c.yaw)+ry*Math.sin(c.yaw);patch.targetY=c.targetY-rx*Math.sin(c.yaw)+ry*Math.cos(c.yaw);
    }this.setCamera(patch);
  };
  ChinaScene.prototype._select=function(province){if(!province)return;this.selected=province.id;this._updateAria();this._invalidate();if(this.onSelect)this.onSelect({id:province.id,name:province.name,abbr:province.abbr,capital:province.capital,center:province.center.slice()});};
  ChinaScene.prototype._key=function(e){
    var k=e.key,handled=true,c=this._cameraGoal,patch={};
    if(k.indexOf('Arrow')===0){if(e.shiftKey){patch.panX=c.panX+(k==='ArrowLeft'?-22:k==='ArrowRight'?22:0);patch.panY=c.panY+(k==='ArrowUp'?-22:k==='ArrowDown'?22:0);}else{patch.yaw=c.yaw+(k==='ArrowLeft'?-.09:k==='ArrowRight'?.09:0);patch.pitch=c.pitch+(k==='ArrowUp'?.07:k==='ArrowDown'?-.07:0);this.view='custom';}this.setCamera(patch);}
    else if(k==='+'||k==='=')this.zoom(.12);else if(k==='-')this.zoom(-.12);else if(k==='Home'||k==='0')this.reset();else if(k==='1'||k==='2'||k==='3')this.setView(['oblique','top','profile'][Number(k)-1]);
    else if(k.toLowerCase()==='l')this.options.labels=!this.options.labels;
    else if((k==='['||k===']')&&P.length){var ix=P.findIndex(function(p){return p.id===this.selected;},this);this.selected=P[(ix+(k===']'?1:-1)+P.length)%P.length].id;}
    else if(k==='Enter'&&this.selected)this._select(P.find(function(p){return p.id===this.selected;},this));else handled=false;
    if(handled){e.preventDefault();this._manual('keyboard');this._updateAria();this._invalidate();}
  };
  ChinaScene.prototype.destroy=function(){this._cancelGesture();this._destroyed=true;if(this._raf)root.cancelAnimationFrame(this._raf);this._raf=0;if(this._observer)this._observer.disconnect();this._listeners.forEach(function(x){x[0].removeEventListener(x[1],x[2],x[3]);});this._listeners=[];this._cache=null;};
  ChinaScene.prototype.getState=function(){return {scene:this.scene,focus:this.options.focus,options:Object.assign({},this.options),camera:Object.assign({},this.camera),view:this.view,stage:this.stage,gesture:{mode:this._gestureMode,pointers:this._pointers.size},animating:this._cameraMoving()||this._physicalMotion(),paused:!!this.options.paused,reducedMotion:this._reduced,experiment:this._experimentState(),process:Object.assign({kind:this.scene,phase:'静止地形',phaseLabels:[],counts:{}},this._processState||{}),selected:this.selected,wind:this.scene==='monsoon'?{season:this.options.parameter<45?'winter':this.options.parameter>55?'summer':'transition',streams:(this._windPaths||[]).map(function(f){return {kind:f.kind,weight:f.weight};}),clouds:this._monsoonMix()>0?(this._rainClouds||[]).length:0}:null,metrics:this._metrics(),description:this.describe(),schematic:true,renderer:'canvas2d-projected'};};
  ChinaScene.prototype._metrics=function(){var p=this.options.parameter;if(this.options.focus==='terrain-steps')return [{label:'宏观地势',value:'西高东低',unit:''},{label:'观察方向',value:'西 → 东',unit:''},{label:'剖面',value:'高度和宽度均为示意',unit:''}];if(this._isWatershed())return [{label:'水系结构',value:'2支流汇入干流',unit:'示意'},{label:'分水岭',value:'山脊分隔两侧',unit:''},{label:'地表汇流',value:'流向各自低地',unit:''}];var focus=MAP_FOCUS[this.options.focus];if(this.scene==='china'&&focus)return [{label:'重点观察',value:focus.title,unit:''},{label:'定位线索',value:focus.hint,unit:''},{label:'地图精度',value:'大致位置',unit:'教学示意'}];switch(this.scene){case'monsoon':return [{label:'季节情景',value:p<45?'冬季风':p>55?'夏季风':'季节转换',unit:''},{label:'主要风向',value:p<45?'偏北风':p>55?'东南风 / 西南风':'比较方向',unit:''},{label:'气流特征',value:p<45?'冷干 · 大陆来风':p>55?'暖湿 · 海洋水汽':'季节切换示意',unit:''}];case'river':return [{label:'植被覆盖',value:Math.round(p),unit:'%'},{label:'产沙强度',value:Math.round(95-p*.8),unit:'示意指数'},{label:'下游淤积',value:Math.round(86-p*.68),unit:'示意指数'}];case'land':return [{label:'坡地保护',value:Math.round(p),unit:'示意指数'},{label:'坡地林草',value:Math.round(20+p*.7),unit:'示意比例 %'},{label:'侵蚀风险',value:Math.round(95-p*.8),unit:'示意指数'}];case'resources':return [{label:'可再生能源',value:Math.round(p),unit:'示意占比 %'},{label:'化石能源消耗',value:Math.round(100-p),unit:'示意指数'},{label:'供需平衡',value:p>80?'需储能调节':'组合供能',unit:''}];case'transport':return [{label:'当前运输方式',value:p<34?'公路':p<67?'铁路':'水运',unit:''},{label:'任务',value:'内河沿线大宗货物',unit:''},{label:'速度 / 运量',value:p<34?'灵活 / 较小':p<67?'较快 / 较大':'较慢 / 大',unit:''}];case'ecology':return [{label:'修复投入',value:Math.round(p),unit:'示意指数'},{label:'水体清洁度',value:Math.round(23+p*.7),unit:'示意指数'},{label:'水土保持',value:Math.round(12+p*.8),unit:'示意指数'}];default:return [{label:'省级行政区',value:34,unit:'个'},{label:'地势格局',value:'西高东低',unit:''},{label:'当前强调',value:Math.round(p),unit:'%'}];}};
  ChinaScene.prototype.describe=function(){var p=this.options.parameter;if(this.options.focus==='terrain-steps')return '西高东低的三级阶梯概括宏观地势；剖面高度和宽度均为示意，不是实测地形。两级过渡带落差较大，局部河流方向还受具体地形控制。';if(this._isWatershed())return '两条支流顺坡汇入干流；金色虚线沿山脊标出分水岭，两侧地表水流入不同流域。地形、河道与界线均为教学示意。';var focus=MAP_FOCUS[this.options.focus];if(this.scene==='china'&&focus)return focus.description;var text={china:'拖动观察地势三级阶梯，点击省区查看资料。高度与专题着色为教学示意。',monsoon:p<45?'冬季风从大陆吹向海洋，偏北风带来冷干气流。':p>55?'夏季风由海洋吹向陆地，携带水汽，东部降雨增强。':'季节转换：比较大陆与海洋间的气流方向变化。',river:'提高植被覆盖率，可减弱坡面侵蚀与河流含沙量，减少下游淤积。',land:'提高坡地保护程度后，陡坡退耕、林草增加，保留平地耕作并改造适宜坡地。',resources:'改变能源组合：提高可再生占比会降低化石能源消耗，高比例时需要储能与电网调节。',transport:'比较沿长江城际大宗货物运输：公路灵活、铁路较快，水运适合大运量但依赖航道。',ecology:'修复坡地植被、设置河岸缓冲带并治理排放，观察泥沙与污染压力降低。'};return text[this.scene];};
  ChinaScene.prototype._originX=function(){return this._w*.5-(this._w<480?18:0);};
  ChinaScene.prototype._originY=function(){return this._h*(this._isStepsProfile()?.60:['china','monsoon','transport'].indexOf(this.scene)>=0?.48:.54);};
  ChinaScene.prototype._scale=function(){var map=['china','monsoon','transport'].indexOf(this.scene)>=0,width=this._w-(this._w<480?72:0);return (map?Math.min(width*.415,this._h*(this._isStepsProfile()?.57:.49)):Math.min(width*.40,Math.max(160,this._h-230)*.54))*this.camera.zoom;};
  ChinaScene.prototype._project=function(x,y,z){var camera=this.camera,c=Math.cos(camera.yaw),s=Math.sin(camera.yaw);x-=camera.targetX;y-=camera.targetY;z-=camera.targetZ;var rx=x*c-y*s,ry=x*s+y*c,scale=this._scale();return [this._originX()+camera.panX+rx*scale,this._originY()+camera.panY+(ry*Math.sin(camera.pitch)-z*Math.cos(camera.pitch))*scale,ry*Math.cos(camera.pitch)+z*Math.sin(camera.pitch)];};
  ChinaScene.prototype._geo=function(lon,lat,z){return this._project((lon-104.5)/29,(36-lat)/22,z==null?this._height(lon,lat):z);};
  ChinaScene.prototype._height=function(lon,lat){var emphasis=this.scene==='china'&&this.options.layer==='terrain'?mix(.8,1.55,this.options.parameter/100):1;return elevation(lon,lat)*.62*this.options.exaggeration*emphasis;};
  ChinaScene.prototype._path=function(points,close){var path=new Path2D();points.forEach(function(p,i){if(i)path.lineTo(p[0],p[1]);else path.moveTo(p[0],p[1]);});if(close!==false)path.closePath();return path;};
  ChinaScene.prototype._geoPath=function(polygons,z){var path=new Path2D(),self=this;polygons.forEach(function(poly){poly.forEach(function(ring){if(!ring.length||ring.every(function(p){return p[1]<17.5;}))return;ring.forEach(function(p,i){var q=self._geo(p[0],p[1],z);if(i)path.lineTo(q[0],q[1]);else path.moveTo(q[0],q[1]);});path.closePath();});});return path;};
  ChinaScene.prototype._line=function(points,stroke,width,dash){var c=this.ctx;c.save();c.strokeStyle=stroke;c.lineWidth=width||1;c.lineCap='round';if(dash)c.setLineDash(dash);c.stroke(this._path(points,false));c.restore();};
  ChinaScene.prototype._dot=function(x,y,r,fill){var c=this.ctx;c.beginPath();c.arc(x,y,r,0,TAU);c.fillStyle=fill;c.fill();};
  ChinaScene.prototype._label=function(text,x,y,opt){if(!this.options.labels)return;opt=opt||{};var c=this.ctx,size=opt.size||11;c.font=(opt.bold?'600 ':'500 ')+size+'px system-ui, sans-serif';var w=c.measureText(text).width+12,h=size+10;x=clamp(x,9+w/2,this._w-9-w/2);y=clamp(y,12+h/2,this._h-15-h/2);var b=[x-w/2,y-h/2,w,h];if(!opt.force&&this._labelBoxes.some(function(a){return b[0]<a[0]+a[2]+4&&b[0]+b[2]+4>a[0]&&b[1]<a[1]+a[3]+2&&b[1]+b[3]+2>a[1];}))return;this._labelBoxes.push(b);c.save();c.fillStyle=opt.bare?'rgba(5,19,29,.28)':'rgba(7,23,32,.80)';c.beginPath();c.roundRect(b[0],b[1],w,h,4);c.fill();c.fillStyle=opt.color||'#e2efe6';c.textAlign='center';c.textBaseline='middle';c.fillText(text,x,y+.5);c.restore();return true;};
  ChinaScene.prototype._background=function(){var c=this.ctx,w=this._w,h=this._h;c.clearRect(0,0,w,h);var grad=c.createRadialGradient(w*.48,h*.38,20,w*.5,h*.5,w*.72);grad.addColorStop(0,'#16323b');grad.addColorStop(.46,'#102530');grad.addColorStop(1,'#08151e');c.fillStyle=grad;c.fillRect(0,0,w,h);
    c.save();for(var x=-1.65;x<1.7;x+=.14)this._line([this._project(x,-1.3,-.11),this._project(x,1.3,-.11)],'rgba(91,164,180,.075)',.6);for(var y=-1.3;y<1.4;y+=.14)this._line([this._project(-1.7,y,-.11),this._project(1.7,y,-.11)],'rgba(91,164,180,.075)',.6);c.restore();
    var cx=w-42,cy=49;var n=this._project(0,-.25,0),o=this._project(0,0,0),a=Math.atan2(n[1]-o[1],n[0]-o[0]);c.save();c.translate(cx,cy);c.rotate(a+Math.PI/2);c.fillStyle='#b3d9d2';c.beginPath();c.moveTo(0,-15);c.lineTo(-4,8);c.lineTo(0,4);c.lineTo(4,8);c.closePath();c.fill();c.restore();c.font='600 10px system-ui';c.textAlign='center';c.fillStyle='#87a9b4';c.fillText('N',cx,cy-22);
  };
  ChinaScene.prototype.render=function(time){if(this._destroyed||!this._w)return;this._dirty=false;var c=this.ctx;
    if(!this._cache){this._labelBoxes=[];this._background();if(this._isStepsProfile())this._renderStepsProfile();else if(this.scene==='china'||this.scene==='monsoon'||this.scene==='transport')this._renderMap();else this._renderLandscape();this._cache=document.createElement('canvas');this._cache.width=this.canvas.width;this._cache.height=this.canvas.height;this._cache.getContext('2d').drawImage(this.canvas,0,0);}else{c.clearRect(0,0,this._w,this._h);c.drawImage(this._cache,0,0,this._w,this._h);}
    this._animate(this._reduced?0:this.options.paused?this._simulationTime:time||0);
  };
  ChinaScene.prototype._terrainColor=function(h,shade){var base=h>.25?color([173,152,115],[225,214,179],(h-.25)/.27):h>.10?color([99,145,112],[183,166,121],(h-.10)/.15):color([89,151,122],[110,161,122],h/.10);var v=base.match(/\d+/g).map(Number);return color(v,shade>0?[248,238,194]:[18,43,47],Math.abs(shade));};
  ChinaScene.prototype._renderMap=function(){
    var c=this.ctx,self=this,outline=this._geoPath(G.outline),bottom=this._geoPath(G.outline,-.022);this._hit=[];
    c.save();c.shadowColor='rgba(0,0,0,.72)';c.shadowBlur=35;c.shadowOffsetY=25;c.fillStyle='#071216';c.fill(bottom,'evenodd');c.restore();
    var walls=[];G.outline.forEach(function(poly){poly.forEach(function(ring){for(var i=1;i<ring.length;i++){var a=ring[i-1],b=ring[i];if(a[1]<17.5||b[1]<17.5)continue;var pa=self._geo(a[0],a[1]),pb=self._geo(b[0],b[1]);walls.push({depth:(pa[2]+pb[2])/2,path:self._path([pa,pb,self._geo(b[0],b[1],-.02),self._geo(a[0],a[1],-.02)]),shade:(b[0]-a[0])*.15});}});});walls.sort(function(a,b){return a.depth-b.depth;});walls.forEach(function(w){c.fillStyle=w.depth>0?'#304d42':'#233e37';c.fill(w.path);});
    c.fillStyle='#80a985';c.fill(outline,'evenodd');c.save();c.clip(outline,'evenodd');
    var cells=makeCells().map(function(a){var pts=a.v.map(function(p){return self._geo(p[0],p[1]);});return {a:a,pts:pts,depth:(pts[0][2]+pts[1][2]+pts[2][2])/3};});cells.sort(function(a,b){return a.depth-b.depth;});
    cells.forEach(function(cell){var a=cell.a,h=a.h;var slope=(elevation(a.lon+.5,a.lat)-elevation(a.lon-.5,a.lat))*.6+(elevation(a.lon,a.lat+.5)-elevation(a.lon,a.lat-.5))*.8;var shade=clamp(slope*6,-.33,.34);c.fillStyle=self._terrainColor(h,shade);c.strokeStyle=c.fillStyle;c.lineWidth=.85;c.lineJoin='round';var path=self._path(cell.pts);c.fill(path);c.stroke(path);});
    c.restore();
    P.forEach(function(p,i){var path=self._geoPath(p.polygons);self._hit.push({province:p,path:path});c.save();if(self.options.layer==='provinces'&&self.scene==='china'){c.fillStyle='hsla('+(132+(i*31)%105)+',42%,65%,'+mix(.22,.68,self.options.parameter/100)+')';c.fill(path,'evenodd');}else if(self.scene==='china'&&self.options.layer!=='terrain'&&self.options.layer!=='rivers'){c.fillStyle=self._themeColor(p);c.fill(path,'evenodd');}c.strokeStyle='rgba(220,239,208,.32)';c.lineWidth=.55;c.stroke(path);if(p.id===self.selected){c.fillStyle='rgba(244,206,122,.32)';c.fill(path,'evenodd');c.strokeStyle='#ffe2a2';c.lineWidth=2;c.stroke(path);}c.restore();});
    c.strokeStyle='rgba(206,225,177,.8)';c.lineWidth=1;c.stroke(outline);
    this._mapRivers();
    if(this.scene==='china')this._mapTheme();
    if(this.scene==='transport')this._transport();
    if(this.scene==='monsoon')this._monsoonBase();
    this._mapLabels();this._inset();if(this.scene==='china'&&this.options.layer==='terrain')this._locator();if(this.options.focus==='terrain-steps')this._stepsOverview();
  };
  ChinaScene.prototype._themeColor=function(p){var lon=p.centroid[0],lat=p.centroid[1],t=this.options.parameter/100,layer=this.options.layer,h=elevation(lon,lat),v=.5;if(layer==='population')v=clamp((lon-96)/26,0,1)*clamp((52-lat)/18,.2,1);if(layer==='climate')v=clamp((42-lat)/21+(lon-105)/35,0,1);if(layer==='agriculture')v=clamp((lon-99)/22,0,1)*(h<.13?1:.45);if(layer==='industry')v=clamp((lon-105)/17,0,1);if(layer==='resources')v=clamp((112-lon)/33+(lat-30)/24,0,1);if(layer==='ecology')v=clamp(h*2+(110-lon)/55,0,1);var palettes={population:[25,87,100],climate:[35,131,168],agriculture:[47,155,89],industry:[209,148,64],resources:[178,122,53],ecology:[33,133,111]};var col=palettes[layer]||[70,150,128];return 'rgba('+col.join(',')+','+((.13+v*.57)*mix(.3,1,t))+')';};
  ChinaScene.prototype._mapRivers=function(){var self=this;[YANGTZE,YELLOW].forEach(function(r,i){var pts=r.map(function(p){return self._geo(p[0],p[1],self._height(p[0],p[1])+.008);});self._line(pts,'rgba(14,62,78,.75)',i?2.4:3.3);self._line(pts,i?'#83cbd2':'#80d7e4',i?1.15:1.7);});};
  ChinaScene.prototype._mapTheme=function(){var layer=this.options.layer,self=this,p=this.options.parameter/100;if(layer==='population'){var hu=[[127.5,50.2],[98.5,25]],pts=hu.map(function(q){return self._geo(q[0],q[1],self._height(q[0],q[1])+.015);});this._line(pts,'#f7d198',1.6,[5,5]);this._label('黑河—腾冲线',pts[0][0]-5,pts[0][1]-20,{color:'#ffdba4'});for(var lon=100;lon<130;lon+=2.1)for(var lat=22;lat<48;lat+=1.8){if(lon<105+(lat-25)*.68||!regionAt(lon,lat))continue;var q=this._geo(lon,lat,this._height(lon,lat)+.01);this._dot(q[0],q[1],1.2+p*1.2,'rgba(250,210,142,.7)');}}
    if(layer==='rivers'){[['长江',113,30],['黄河',110,38]].forEach(function(a){var q=self._geo(a[1],a[2]);self._label(a[0],q[0],q[1]-15,{color:'#ace4ef',bold:true});});}
    if(layer==='climate'||layer==='agriculture'){var qin=[[104,34],[108,34],[112,33],[116,33],[119,33]];this._line(qin.map(function(a){return self._geo(a[0],a[1],self._height(a[0],a[1])+.02);}), '#f9df9c',1.5,[4,4]);var q=this._geo(111,33);this._label('秦岭—淮河（示意）',q[0],q[1]-14,{color:'#ffe5ad'});}
    if(layer==='industry'){[[121,31,'长江三角洲'],[113,23,'珠江三角洲'],[117,39,'京津唐'],[123,41,'辽中南']].forEach(function(a){var q=self._geo(a[0],a[1]);self._dot(q[0],q[1],7+p*4,'rgba(247,192,103,.25)');self._dot(q[0],q[1],3,'#f8d28e');self._label(a[2],q[0]+10,q[1]-19,{color:'#f9dcac'});});}
    if(layer==='resources'){[[85,41,'油气'],[112,38,'煤炭'],[102,29,'水能'],[100,40,'风光']].forEach(function(a){var q=self._geo(a[0],a[1]);self._dot(q[0],q[1],5,'#edd397');self._label(a[2],q[0],q[1]-18,{color:'#f3dca9'});});}
  };
  ChinaScene.prototype._mapLabels=function(){var self=this;if(this.scene==='china'&&this.options.layer==='terrain'&&MAP_FOCUS[this.options.focus]){this._focusMap();return;}if(this.scene==='transport'||this.scene==='monsoon')return;if(this.options.layer==='provinces'||this.selected){P.slice().sort(function(a,b){return a.id===self.selected?-1:b.id===self.selected?1:0;}).forEach(function(p){var q=self._geo(p.centroid[0],p.centroid[1]);self._label(p.abbr,q[0],q[1],{size:p.id===self.selected?12:10,color:p.id===self.selected?'#ffe3a8':'#eef2df',force:p.id===self.selected});});}else{[['青藏高原',89,32],['塔里木盆地',83,39],['内蒙古高原',111,43],['黄土高原',108,36],['东北平原',124,46],['华北平原',116,37],['长江中下游平原',115,29],['四川盆地',105,30],['东海',127,29],['南海',115,19]].forEach(function(a){var q=self._geo(a[1],a[2],a[0].indexOf('海')===1?0:undefined);self._label(a[0],q[0],q[1],{size:11,bare:true,color:a[0].indexOf('海')===1?'#68a9c1':'#ecedce'});});}};
  // Place labels around projected anchors; keep the existing collision guard and
  // use leader lines when a nearby label needs to move for a narrow viewport.
  ChinaScene.prototype._focusMarker=function(text,lon,lat,tint){
    var q=this._geo(lon,lat,this._height(lon,lat)+.008),c=this.ctx,size=this._w<480?10:11;
    this._dot(q[0],q[1],6,'rgba(242,219,159,.17)');this._dot(q[0],q[1],2.5,tint);
    c.font='600 '+size+'px system-ui, sans-serif';var half=(c.measureText(text).width+12)/2;
    var offsets=[[0,-16],[0,16],[44,-4],[-44,-4],[0,-34],[0,34],[55,-28],[-55,-28]];
    for(var i=0;i<offsets.length;i++){
      var x=clamp(q[0]+offsets[i][0],9+half,this._w-9-half),y=clamp(q[1]+offsets[i][1],size+17,this._h-73);
      if(this._label(text,x,y,{size:size,bold:true,color:tint})){
        this._line([[q[0],q[1]],[x,y+(y<q[1]?size/2+4:-size/2-4)]],'rgba(222,233,206,.48)',.65);break;
      }
    }
  };
  ChinaScene.prototype._focusMap=function(){
    var self=this,focus=MAP_FOCUS[this.options.focus];
    if(focus.places){focus.places.forEach(function(a){self._focusMarker(a[0],a[1],a[2],'#f5dda3');});return;}
    focus.mountains.forEach(function(id){var m=MOUNTAINS[id],isSteps=self.options.focus==='step-boundaries';
      var tint=isSteps?(m.step===1?'#efc879':'#8bd8d7'):(m.direction==='ew'?'#efc879':m.direction==='ns'?'#d4bfed':'#8bd8d7');
      var pts=m.points.map(function(a){return self._geo(a[0],a[1],self._height(a[0],a[1])+.012);});
      self._line(pts,isSteps?'rgba(244,218,150,.15)':'rgba(8,32,38,.42)',isSteps?8:5);self._line(pts,tint,2,isSteps?[4,2]:null);
      self._focusMarker(m.name,m.label[0],m.label[1],tint);
    });
  };
  ChinaScene.prototype._inset=function(){var c=this.ctx,compact=this.scene==='monsoon'&&this._w<480,w=compact?62:83,h=compact?80:104,x=compact?16:this._w-w-16,y=compact?108:this._h-h-51;c.save();c.fillStyle='rgba(8,28,40,.78)';c.strokeStyle='rgba(103,151,164,.38)';c.lineWidth=.7;c.beginPath();c.roundRect(x,y,w,h,5);c.fill();c.stroke();var all=G.offshore.concat(G.outline.filter(function(poly){return poly[0].every(function(p){return p[1]<18;});}));c.beginPath();all.forEach(function(poly){poly.forEach(function(r){r.forEach(function(p,i){var xx=x+8+(p[0]-105)/20*(w-16),yy=y+14+(24-p[1])/22*(h-26);if(i)c.lineTo(xx,yy);else c.moveTo(xx,yy);});c.closePath();});});c.fillStyle='#94b6a0';c.fill('evenodd');c.strokeStyle='#86aaa0';c.lineWidth=.65;c.stroke();c.font=(compact?'8':'9')+'px system-ui';c.fillStyle='#7fa9b8';c.textAlign='center';c.fillText(compact?'南海诸岛':'南海诸岛 · 示意',x+w/2,y+h-8);c.restore();};
  ChinaScene.prototype._locator=function(){
    var c=this.ctx,r=this._w<480?28:39,cx=23+r,cy=76+r;
    function project(lon,lat){var a=(lon-106)*Math.PI/180,b=lat*Math.PI/180,tilt=20*Math.PI/180;return [cx+r*Math.cos(b)*Math.sin(a),cy-r*(Math.sin(b)*Math.cos(tilt)-Math.cos(b)*Math.cos(a)*Math.sin(tilt)),Math.sin(b)*Math.sin(tilt)+Math.cos(b)*Math.cos(a)*Math.cos(tilt)];}
    c.save();var grad=c.createRadialGradient(cx-r*.4,cy-r*.5,2,cx,cy,r);grad.addColorStop(0,'#245163');grad.addColorStop(1,'#0b2535');c.fillStyle=grad;c.beginPath();c.arc(cx,cy,r,0,TAU);c.fill();c.strokeStyle='rgba(124,184,197,.45)';c.lineWidth=.7;c.stroke();
    for(var lat=-60;lat<=60;lat+=30){var seg=[];for(var lon=16;lon<=196;lon+=3){var q=project(lon,lat);if(q[2]>=0)seg.push(q);}this._line(seg,lat===0?'rgba(228,199,134,.65)':'rgba(108,167,186,.3)',lat===0?.9:.5);}
    for(var lon=16;lon<=196;lon+=30){var seg=[];for(var lat=-90;lat<=90;lat+=3){var q=project(lon,lat);if(q[2]>=0)seg.push(q);}this._line(seg,'rgba(108,167,186,.3)',.5);}
    c.fillStyle='#b6dcb4';G.outline.forEach(function(poly){poly.forEach(function(ring){c.beginPath();ring.forEach(function(p,i){var q=project(p[0],p[1]);if(i)c.lineTo(q[0],q[1]);else c.moveTo(q[0],q[1]);});c.closePath();c.fill();});});
    c.font='9px system-ui';c.fillStyle='#a9c4c3';c.textAlign='center';c.fillText('东半球 · 北半球',cx,cy+r+15);if(this._w>=480){c.fillStyle='#d3c495';c.fillText('赤道',cx+r+15,cy+10);}c.restore();
  };
  // Broad flow bundles, not measured wind vectors. Cubic curves keep the
  // directions legible; all samples are projected with the map's own camera.
  ChinaScene.prototype._monsoonMix=function(){return clamp((this.options.parameter-45)/10,0,1);};
  ChinaScene.prototype._monsoonBase=function(){
    var c=this.ctx,self=this,summer=this._monsoonMix(),mobile=this._w<480;
    this._windPaths=[];this._rainClouds=[];
    function bundle(kind,count,tint,weight,controls){
      if(weight<=0)return;
      for(var lane=0;lane<count;lane++){
        var control=controls(lane),points=[],geographic=[];
        for(var j=0;j<=48;j++){
          var t=j/48,u=1-t,lon=u*u*u*control[0][0]+3*u*u*t*control[1][0]+3*u*t*t*control[2][0]+t*t*t*control[3][0],lat=u*u*u*control[0][1]+3*u*u*t*control[1][1]+3*u*t*t*control[2][1]+t*t*t*control[3][1];
          geographic.push([lon,lat]);points.push(self._geo(lon,lat,self._height(lon,lat)+.07));
        }
        self._windPaths.push({kind:kind,points:points,geographic:geographic,tint:tint,weight:weight,lane:lane});
      }
    }
    bundle('winter',10,'#d5eaff',1-summer,function(i){return [[86+i*3.4,48+Math.sin(i*.3)*3],[92+i*3.3,43],[99+i*3.3,30+i*.65],[109+i*2.7,20+i*1.3]];});
    bundle('southeast',8,'#68eff1',summer,function(i){return [[119+i*2.0,17+i*1.7],[118+i*1.6,23+i*1.7],[110+i*1.5,28+i*1.7],[106+i*2.3,34+i*1.65]];});
    bundle('southwest',5,'#ffd09a',summer,function(i){return [[87+i*1.9,15],[94+i*1.3,18],[97+i*1.1,25],[102+i*1.1,28+i*.7]];});
    var origin=this._geo(summer>.5?115:105,summer>.5?28:43,.04),radius=this._scale()*.8;
    var wash=c.createRadialGradient(origin[0],origin[1],0,origin[0],origin[1],radius);
    wash.addColorStop(0,summer>.5?'rgba(34,163,186,.36)':'rgba(101,164,208,.35)');wash.addColorStop(1,'rgba(28,65,82,0)');
    c.save();c.clip(this._geoPath(G.outline),'evenodd');c.fillStyle=wash;c.fillRect(0,0,this._w,this._h);c.restore();
    ['winter','southeast','southwest'].forEach(function(kind){var group=self._windPaths.filter(function(f){return f.kind===kind;});if(!group.length)return;c.save();c.globalAlpha=.055*group[0].weight;c.fillStyle=group[0].tint;c.fill(self._path(group[0].points.concat(group[group.length-1].points.slice().reverse())));c.restore();});
    this._windPaths.forEach(function(flow){
      self._windRibbon(flow.points,0,1,(mobile?3.5:8)*self.camera.zoom,flow.tint,.11*flow.weight);
      c.save();c.globalAlpha=.23*flow.weight;self._line(flow.points,flow.tint,mobile?.6:1);c.restore();
    });
    // Cloud positions are fixed geographic samples. Test land once per cache
    // rebuild rather than searching province polygons on every animation frame.
    for(var i=0;i<16;i++){
      var lon=105+(i*4.37)%18,lat=23+(i*3.17)%17;
      if(regionAt(lon,lat))this._rainClouds.push(this._geo(lon,lat,this._height(lon,lat)+.1));
    }
  };
  ChinaScene.prototype._windRibbon=function(path,start,end,width,tint,alpha){
    var left=[],right=[],c=this.ctx;
    for(var j=0;j<=12;j++){
      var t=mix(start,end,j/12),a=this._trailPoint(path,t),before=this._trailPoint(path,Math.max(0,t-.008)),after=this._trailPoint(path,Math.min(.9999,t+.008)),dx=after[0]-before[0],dy=after[1]-before[1],len=Math.hypot(dx,dy)||1;
      var half=width*(.12+.88*Math.sin(Math.PI*j/12))*.5;
      left.push([a[0]-dy/len*half,a[1]+dx/len*half]);right.push([a[0]+dy/len*half,a[1]-dx/len*half]);
    }
    c.save();c.globalAlpha=alpha;c.fillStyle=tint;c.fill(this._path(left.concat(right.reverse())));c.restore();
  };
  ChinaScene.prototype._monsoonAnimate=function(time){
    var self=this,c=this.ctx,summer=this._monsoonMix(),mobile=this._w<480,scale=clamp(this.camera.zoom,.7,1.65)*(mobile?.65:1);
    (this._windPaths||[]).forEach(function(flow,index){
      for(var j=0;j<3;j++){
        var head=(time*.000075*(1+(index%3)*.09)+j/3+index*.137)%1,tail=Math.max(0,head-.16);
        self._windRibbon(flow.points,tail,head,6*scale,flow.tint,.85*flow.weight);
        var a=self._trailPoint(flow.points,Math.max(0,head-.015)),b=self._trailPoint(flow.points,head),angle=Math.atan2(b[1]-a[1],b[0]-a[0]),size=6*scale;
        c.save();c.globalAlpha=flow.weight;c.fillStyle=flow.tint;c.beginPath();c.moveTo(b[0],b[1]);c.lineTo(b[0]-Math.cos(angle-.52)*size,b[1]-Math.sin(angle-.52)*size);c.lineTo(b[0]-Math.cos(angle+.52)*size,b[1]-Math.sin(angle+.52)*size);c.closePath();c.fill();c.restore();
      }
    });
    if(summer>0)(this._rainClouds||[]).forEach(function(q,i){
      if(mobile&&i%2)return;
      var r=(mobile?7:11)*clamp(self.camera.zoom,.7,1.5),breath=1+Math.sin(time*.001+i)*.08;
      c.save();c.globalAlpha=summer*.40;c.fillStyle='#d7f6fc';
      [[-r*.6,0,r*.8],[0,-r*.28,r],[r*.65,0,r*.7]].forEach(function(a){c.beginPath();c.ellipse(q[0]+a[0],q[1]+a[1]-10,a[2]*breath,a[2]*.45,0,0,TAU);c.fill();});
      c.globalAlpha=summer*.78;
      for(var k=0;k<4;k++){var fall=(time*.022+i*7+k*5)%(mobile?13:22),x=q[0]+(k-1.5)*r*.5;self._line([[x,q[1]+fall-6],[x-2*scale,q[1]+fall+1]],'#9ceaff',1.25*scale);}
      c.restore();
    });
    // Annotations stay above the moving field, and respect the labels toggle.
    this._labelBoxes=[];
    function label(text,lon,lat,tint,offset){var q=self._geo(lon,lat,self._height(lon,lat)+.08);self._label(text,q[0],q[1]+(offset||0),{bold:true,size:mobile?10:12,color:tint});}
    if(summer<1)label(mobile?'大陆冷干气流':'大陆冷干气流 · 偏北风',100,51,'#d5eaff',-13);
    if(summer>0){label(mobile?'西南季风':'印度洋方向 · 西南季风',89,19,'#ffd09a',9);label(mobile?'东南季风':'太平洋方向 · 东南季风',128,19,'#8af7f4',14);}
    label('青藏高原',88,32,'#d9dcba',0);
  };
  ChinaScene.prototype._transport=function(){var p=this.options.parameter,route=p<34?[[106.55,29.56],[108,30.8],[110,31.4],[112,31.5],[114.3,30.6],[116.3,31.7],[118.8,32],[121.47,31.23]]:p<67?[[106.55,29.56],[108,30.4],[111.3,30.7],[114.3,30.6],[117,31.8],[121.47,31.23]]:YANGTZE.slice(6);var self=this;this._transportMode=p<34?'road':p<67?'rail':'ship';this._route=route.map(function(a){return self._geo(a[0],a[1],self._height(a[0],a[1])+.02);});this._line(this._route,'rgba(4,18,26,.7)',7);this._line(this._route,p<34?'#e5bc7e':p<67?'#f3db9f':'#64d6e8',3,p<34?[5,3]:null);this._processState={kind:'transport-flow',phase:this._transportMode==='road'?'公路集疏运':this._transportMode==='rail'?'铁路干线运输':'水运干线运输',phaseLabels:['装货','干线运输','换装/到达'],counts:{vehicles:this._transportMode==='ship'?3:this._transportMode==='rail'?2:4,mode:this._transportMode}};CITIES.forEach(function(city){var q=self._geo(city.p[0],city.p[1],self._height(city.p[0],city.p[1])+.02);self._dot(q[0],q[1],4,'#edf4d9');self._label(city.name,q[0],q[1]-17,{bold:true});});};
  ChinaScene.prototype._transportGlyph=function(mode,x,y,angle,scale){var c=this.ctx,s=scale||1;c.save();c.translate(x,y);c.rotate(angle);c.lineWidth=1.2*s;if(mode==='road'){c.fillStyle='#e8bd7f';c.fillRect(-8*s,-4*s,16*s,8*s);c.fillStyle='#244750';c.fillRect(-3*s,-3*s,5*s,3*s);c.fillStyle='#182b31';c.beginPath();c.arc(-5*s,5*s,2.3*s,0,TAU);c.arc(5*s,5*s,2.3*s,0,TAU);c.fill();}else if(mode==='rail'){c.fillStyle='#e7d49d';c.strokeStyle='#16333c';c.beginPath();c.roundRect(-10*s,-5*s,20*s,9*s,2*s);c.fill();c.stroke();c.fillStyle='#397786';c.fillRect(-6*s,-3*s,4*s,2*s);c.fillRect(1*s,-3*s,4*s,2*s);c.fillStyle='#26353a';c.beginPath();c.arc(-6*s,5*s,2*s,0,TAU);c.arc(6*s,5*s,2*s,0,TAU);c.fill();}else{c.fillStyle='#5bc7d7';c.beginPath();c.moveTo(-11*s,2*s);c.lineTo(8*s,2*s);c.lineTo(11*s,-2*s);c.lineTo(-6*s,-5*s);c.closePath();c.fill();c.fillStyle='#e8d39b';c.fillRect(-3*s,-4*s,6*s,3*s);c.strokeStyle='#163d46';c.stroke();}c.restore();};
  ChinaScene.prototype._isStepsProfile=function(){return this.scene==='china'&&this.options.focus==='terrain-steps'&&this._profileActive;};
  ChinaScene.prototype._stepsOverview=function(){
    var self=this,labels=[['第一阶梯',89,32,'#f2d49d'],['第二阶梯',106,35,'#d2dc9f'],['第三阶梯',119,33,'#9fe0d4']];
    labels.forEach(function(a){var q=self._geo(a[1],a[2]);self._label(a[0],q[0],q[1]+22,{bold:true,color:a[3],force:true});});
  };
  // A separate conceptual cross-section keeps the three tiers legible. Its
  // smooth ramps deliberately avoid implying literal steps or measured heights.
  ChinaScene.prototype._renderStepsProfile=function(){
    var self=this,c=this.ctx;this._hit=[];var start=-1.13,end=1.15,yFront=.24,yBack=-.27;
    function smooth(a,b,x){var t=clamp((x-a)/(b-a),0,1);return t*t*(3-2*t);}
    function h(x){return .62-.27*smooth(-.53,-.27,x)-.23*smooth(.36,.61,x)+.012*Math.sin(x*31)+.007*Math.cos(x*47);}
    var front=[],back=[],top=[];for(var i=0;i<=130;i++){var x=mix(start,end,i/130);front.push(this._project(x,yFront,h(x)));back.push(this._project(x,yBack,h(x)));}
    var bottomA=this._project(start,yFront,-.16),bottomB=this._project(end,yFront,-.16);
    var section=this._path(front.concat([bottomB,bottomA]));c.save();c.shadowColor='rgba(0,0,0,.45)';c.shadowBlur=24;c.shadowOffsetY=14;c.fillStyle='#665741';c.fill(section);c.restore();
    c.save();c.clip(section);var strata=['#a49063','#8b7954','#75664b','#655940'];for(var j=0;j<4;j++){var upper=[],lower=[];for(var k=0;k<=100;k++){var xx=mix(start,end,k/100);upper.push(this._project(xx,yFront,h(xx)-.08-j*.17));lower.unshift(this._project(xx,yFront,h(xx)-.24-j*.17));}c.fillStyle=strata[j];c.fill(this._path(upper.concat(lower)));this._line(upper,'rgba(233,212,164,.30)',1);}c.restore();
    for(var n=0;n<130;n++){var xx=mix(start,end,(n+.5)/130);c.fillStyle=xx<-.4?'#c3b784':xx<.49?'#99aa77':'#6faa8f';c.strokeStyle=c.fillStyle;c.lineWidth=.8;var panel=this._path([back[n],back[n+1],front[n+1],front[n]]);c.fill(panel);c.stroke(panel);}
    this._line(front,'#e2d6a3',1.5);this._line(back,'rgba(221,230,195,.65)',1);
    var bands=[{x:-.82,title:'第一阶梯',sub:'青藏高原为主体',color:'#f6d99f'},{x:.03,title:'第二阶梯',sub:'高原、盆地',color:'#dfe6b3'},{x:.87,title:'第三阶梯',sub:'平原、丘陵',color:'#b7eade'}];
    bands.forEach(function(b){var q=self._project(b.x,-.04,h(b.x));self._label(b.title,q[0],q[1]-32,{size:self._w<480?11:13,bold:true,color:b.color,force:true});self._label(b.sub,q[0],q[1]+13,{size:self._w<480?9:11,color:b.color,force:true});});
    var west=this._project(start,yFront,-.16),east=this._project(end,yFront,-.16);this._arrow([[west[0],west[1]+32],[east[0],east[1]+32]],'#c6d9cc',1.5);this._label('西',west[0],west[1]+34,{bold:true,force:true});this._label('东 · 海洋',east[0],east[1]+34,{bold:true,force:true});
    var river=[];for(var m=0;m<=100;m++){var rx=mix(-1.04,1.11,m/100);river.push(this._project(rx,.04,h(rx)+.02));}this._line(river,'#4ea8c0',5);this._arrow(river,'#9de6e9',2);
    if(this.stage>=2)[-.40,.49].forEach(function(x){var q=self._project(x,.04,h(x)+.02);self._dot(q[0],q[1],12,'rgba(247,208,129,.2)');self._label('过渡带：落差较大',q[0],q[1]+56,{size:10,color:'#f4d69b',force:true});});

  };
  ChinaScene.prototype._rainRoute=function(side){
    var self=this,vertices=side==='left'?[[.19,-.43],[.07,-.30],[-.13,-.13],[-.4,.12],[-.4,.75]]:[[.41,-.43],[.56,-.28],[.78,-.05],[.82,.3],[.82,.75]],points=[];
    for(var i=1;i<vertices.length;i++)for(var j=0;j<18;j++){var t=j/18,x=mix(vertices[i-1][0],vertices[i][0],t),y=mix(vertices[i-1][1],vertices[i][1],t);points.push([x,y,self._localHeight(x,y)]);}
    var last=vertices[vertices.length-1];points.push([last[0],last[1],this._localHeight(last[0],last[1])]);return points;
  };
  // Process geometry intent: cache a small set of downhill channels and let
  // animated water travel through their junctions into the side river.
  ChinaScene.prototype._rainChannels=function(side){
    var self=this,specs=side==='left'?
      [[[-.96,-.58],[-.80,-.43],[-.61,-.25],[-.40,-.10]],[[-.73,-.56],[-.61,-.39],[-.52,-.10],[-.40,.16]],[[-.14,-.54],[-.22,-.34],[-.30,-.02],[-.40,.39]],[ [.13,-.48],[.04,-.27],[-.12,.08],[-.40,.56]]]:
      [[[.47,-.58],[.58,-.42],[.71,-.23],[.81,-.08]],[[.53,-.53],[.64,-.34],[.76,-.08],[.81,.18]],[[.68,-.55],[.74,-.30],[.80,.02],[.81,.40]],[[.42,-.47],[.50,-.25],[.64,.10],[.81,.60]]];
    return specs.map(function(raw){var vertices=raw.map(function(v){return v.slice();}),last=vertices[vertices.length-1];last[0]=side==='left'?-.40+.035*Math.sin(last[1]*4):.81+.025*Math.sin(last[1]*4);var out=[];for(var i=1;i<vertices.length;i++)for(var j=0;j<12;j++){var t=j/12,x=mix(vertices[i-1][0],vertices[i][0],t),y=mix(vertices[i-1][1],vertices[i][1],t);out.push([x,y,self._localHeight(x,y)]);}out.push([last[0],last[1],self._localHeight(last[0],last[1])]);return out;});
  };
  ChinaScene.prototype._rainRiver=function(side){var self=this,out=[];for(var i=0;i<=75;i++){var y=mix(-.67,.75,i/75),x=side==='left'?-.40+.035*Math.sin(y*4):.81+.025*Math.sin(y*4);out.push([x,y,self._localHeight(x,y)]);}return out;};
  ChinaScene.prototype._rainRiverPoint=function(side,y){var x=side==='left'?-0.40+.035*Math.sin(y*4):.81+.025*Math.sin(y*4);return [x,y,this._localHeight(x,y)];};
  ChinaScene.prototype._rainFlow=function(side,channel){
    var main=this._rainRiver(side),joinY=channel[channel.length-1][1],flow=channel.concat([this._rainRiverPoint(side,joinY)]);
    for(var i=0;i<main.length;i++)if(main[i][1]>joinY+1e-8)flow.push(main[i]);
    return flow;
  };
  ChinaScene.prototype._rainProjected=function(points){var self=this;return points.map(function(p){return self._project(p[0],p[1],p[2]*self.options.exaggeration+.025);});};
  ChinaScene.prototype.experiment=function(action){
    if(action==='clear-rain'){this._rain=null;}else if(this._isWatershed()&&['rain-left','rain-right','rain-both'].indexOf(action)>=0){if(!this._rain)this._rain=[];var sides=action==='rain-both'?['left','right']:[action==='rain-left'?'left':'right'];sides.forEach(function(side){if(this._rain.indexOf(side)<0)this._rain.push(side);},this);}
    else return this.getState().experiment;
    this._invalidate();return this._experimentState();
  };
  ChinaScene.prototype._experimentState=function(){var self=this,sides=(this._rain||[]).slice();return {rain:sides,routes:sides.map(function(side){var points=self._rainRoute(side),channels=(self._rainPaths&&self._rainPaths[side])||self._rainChannels(side);return {side:side,basin:side==='left'?'西侧干流流域':'东侧相邻流域',points:points,downhill:points.every(function(p,i){return !i||p[2]<=points[i-1][2]+.000001;}),channels:channels.map(function(channel){return {points:channel,count:channel.length,downhill:channel.every(function(p,i){return !i||p[2]<=channel[i-1][2]+.000001;})};})};})};};
  ChinaScene.prototype._rainExperiment=function(time){
    if(!this._isWatershed()||!this._rain)return;var self=this,c=this.ctx;
    this._rain.forEach(function(side,sideIndex){
      var tint=side==='left'?'#66d8f1':'#f1c06e',modelChannels=(self._rainPaths&&self._rainPaths[side])||self._rainChannels(side),projected=(self._rainProjectedPaths&&self._rainProjectedPaths[side])||null,channels=projected?projected.channels:modelChannels.map(function(channel){return self._rainProjected(channel);}),flows=(self._rainProjectedFlows&&self._rainProjectedFlows[side])||modelChannels.map(function(channel){return self._rainProjected(self._rainFlow(side,channel));}),main=projected?projected.river:self._rainProjected(self._rainRiver(side));
      // Keep every cloud on its own slope. Small overlapping puffs leave the
      // relief readable while several drops establish rainfall as an area.
      channels.forEach(function(channel,index){var source=channel[0],radius=(self._w<480?7:10)*(index%2?.86:1),breath=1+Math.sin(time*.0008+index)*.05;
        c.save();c.globalAlpha=.68;c.fillStyle=side==='left'?'#d8f4fa':'#f4ead2';
        [[-radius*.55,0,.78],[0,-radius*.3,1],[radius*.58,0,.72]].forEach(function(a){c.beginPath();c.ellipse(source[0]+a[0],source[1]-35+a[1],radius*a[2]*breath,radius*.44,0,0,TAU);c.fill();});
        for(var drop=0;drop<4;drop++){var fall=(time*.022+index*5+drop*3+sideIndex*2)%25,x=source[0]+(drop-1.5)*radius*.53;self._line([[x,source[1]-28+fall],[x-1.5,source[1]-20+fall]],tint,1.4);}
        c.restore();
        var path=channel,flow=flows[index];
        self._line(path,'rgba(9,42,50,.55)',4);self._line(path,tint,1.25);
        for(var k=0;k<2;k++){var bead=self._trailPoint(flow,(time*.00017+k/2+index*.13)%1);if(bead)self._dot(bead[0],bead[1],2.5,tint);}
      });
      self._line(main,'rgba(8,37,45,.78)',8);self._line(main,tint,2.5);self._arrow(main.slice(Math.floor(main.length*.68),Math.floor(main.length*.80)),tint,2.5);
      for(var k=0;k<5;k++){var bead=self._trailPoint(main,(time*.00017+k/5+sideIndex*.21)%1);if(bead)self._dot(bead[0],bead[1],2.8,tint);}
      // Separate side captions avoid three labels competing for the ridge crest.
      var size=self._w<480?10:11,text=side==='left'?'西侧降雨 → 干流':'东侧降雨 → 相邻流域',x=self._w*(side==='left'?.26:.70),y=116;
      c.save();c.font='600 '+size+'px system-ui';var width=c.measureText(text).width+16;x=clamp(x,width/2+9,self._w-width/2-52);c.fillStyle='rgba(7,23,32,.90)';c.beginPath();c.roundRect(x-width/2,y-12,width,24,5);c.fill();c.textAlign='center';c.textBaseline='middle';c.fillStyle=tint;c.fillText(text,x,y);c.restore();
    });
    this._processState={kind:'watershed',phase:'降雨→坡面汇流→干流输送',phaseLabels:['降雨','坡面汇流','支流汇合','干流输送'],counts:{basins:this._rain.length,channels:this._rain.length*4,clouds:this._rain.length*4,flowParticles:this._rain.length*13}};
  };
  /* Local cross section: a catchment, not the shape of a particular real place. */
  ChinaScene.prototype._isWatershed=function(){return this.scene==='river'&&(this.options.focus==='river-system'||this.options.focus==='watershed');};
  ChinaScene.prototype._localHeight=function(x,y){if(this._isWatershed())return .045+.15*(.75-y)+.36*Math.exp(-Math.pow((x-.3)/.20,2))+.15*Math.exp(-Math.pow((x+1.10)/.28,2));var mountain=.48*gauss(x,y,-.65,-.18,.43,.63)+.32*gauss(x,y,.42,-.44,.42,.35);var channel=.12*gauss(x,y,0,.12,.21,.9);return Math.max(.035,.07+mountain-channel)+.012*noise(x*4,y*4);};
  ChinaScene.prototype._renderLandscape=function(){var self=this,c=this.ctx,p=this.options.parameter/100;this._hit=[];this._flowPaths=null;this._sedimentPaths=null;this._landRunoffPaths=null;this._pollutionPath=null;this._energyPaths=null;var corners=[[-1.04,-.7],[1.04,-.7],[1.04,.75],[-1.04,.75]],base=corners.map(function(a){return self._project(a[0],a[1],-.16);});c.save();c.shadowColor='rgba(0,0,0,.65)';c.shadowBlur=28;c.shadowOffsetY=20;c.fillStyle='#09191d';c.fill(this._path(base));c.restore();
    var surfaces=[];var step=.065;for(var y=-.7;y<.75;y+=step)for(var x=-1.04;x<1.04;x+=step){var xx=Math.min(1.04,x+step),yy=Math.min(.75,y+step),h=this._localHeight(x,y),pts=[[x,y],[xx,y],[xx,yy],[x,yy]].map(function(a){return self._project(a[0],a[1],self._localHeight(a[0],a[1])*self.options.exaggeration);});surfaces.push({x:x,y:y,h:h,pts:pts,depth:pts.reduce(function(s,q){return s+q[2];},0)/4});}
    var wallPts=[];for(var i=0;i<4;i++){var a=corners[i],b=corners[(i+1)%4];for(var j=0;j<40;j++){var t=j/40,u=(j+1)/40,va=[mix(a[0],b[0],t),mix(a[1],b[1],t)],vb=[mix(a[0],b[0],u),mix(a[1],b[1],u)];var pa=self._project(va[0],va[1],self._localHeight(va[0],va[1])*self.options.exaggeration),pb=self._project(vb[0],vb[1],self._localHeight(vb[0],vb[1])*self.options.exaggeration);wallPts.push({d:(pa[2]+pb[2])/2,path:self._path([pa,pb,self._project(vb[0],vb[1],-.16),self._project(va[0],va[1],-.16)])});}}wallPts.sort(function(a,b){return a.d-b.d;});wallPts.forEach(function(a){c.fillStyle=a.d>0?'#6b6950':'#4b5144';c.fill(a.path);});
    surfaces.sort(function(a,b){return a.depth-b.depth;});surfaces.forEach(function(a){var green=self.scene==='land'||self.scene==='ecology'||self.scene==='river'?p:.55;var shade=clamp((self._localHeight(a.x+.04,a.y)-a.h)*5,-.20,.16);var land=self._terrainColor(a.h,shade);if(a.h>.14)land=color([167,147,99],[70,135,97],green);else land=color([166,171,103],[121,159,111],.55);if(self._isWatershed())land=a.x<.3?color([111,157,130],[133,171,124],a.h):color([145,162,109],[165,176,124],a.h);if(self.scene==='land'&&a.x<-.20&&a.h>.18&&p<.3)land='rgb(184,154,100)';var dx=(self._localHeight(a.x+.015,a.y)-self._localHeight(a.x-.015,a.y))/.03,dy=(self._localHeight(a.x,a.y+.015)-self._localHeight(a.x,a.y-.015))/.03,light=(-.5*dx+.65*dy+1)/Math.sqrt(dx*dx+dy*dy+1),tint=clamp((light-.8)*.55,-.35,.22);land=color(land.match(/\d+/g).map(Number),tint>0?[237,228,188]:[18,43,46],Math.abs(tint));c.fillStyle=land;c.strokeStyle=land;c.lineWidth=.7;var path=self._path(a.pts);c.fill(path);c.stroke(path);});
    // Fine contour strata on the exposed front section.
    for(var z=-.12;z<.015;z+=.045)this._line([this._project(-1.04,.75,z),this._project(1.04,.75,z)],'rgba(206,174,124,.24)',.9);
    if(this._isWatershed()){this._watershed();return;}
    this._localRiver=[];for(var k=0;k<=75;k++){var ry=mix(-.67,.76,k/75),rx=.08+Math.sin(ry*5.5)*.085;this._localRiver.push(this._project(rx,ry,this._localHeight(rx,ry)*this.options.exaggeration+.012));}
    var water=this.scene==='ecology'?color([150,133,79],[64,176,192],p):this.scene==='river'?color([153,137,81],[72,181,199],p):'#55adc2';this._line(this._localRiver,'#2b6c7b',15);this._line(this._localRiver,water,10);
    if(this.scene==='river'){this._sediment(p);this._vegetation(p);var q=this._project(-.66,-.15,.6*this.options.exaggeration);this._label('坡面侵蚀',q[0],q[1]-12,{bold:true,color:'#f0d3a0'});q=this._project(.15,.72,.05);this._label('下游堆积',q[0]+80,q[1]+3,{color:'#e9d6a6'});}
    else if(this.scene==='land'){this._farms(p);this._vegetation(.15+p*.85);this._landFlows(p);}
    else if(this.scene==='resources'){this._energy(p);this._energyFlow(p);}
    else if(this.scene==='ecology'){this._vegetation(p);this._ecology(p);}
    var q=this._project(-.92,.74,-.16);this._label('地层剖面 · 教学模型',q[0]+80,q[1]+18,{size:10,color:'#b3baa1'});
  };
  ChinaScene.prototype._watershed=function(){
    var self=this,main=[],neighbor=[];
    // Both longitudinal gradients descend toward y=.75. The continuous ridge
    // x=.30 separates the western main river from the eastern neighboring basin.
    function mainX(y){return -.40+.035*Math.sin(y*4);}
    function point(x,y){return self._project(x,y,self._localHeight(x,y)*self.options.exaggeration+.012);}
    function sampleLine(vertices){var out=[];for(var i=1;i<vertices.length;i++)for(var j=0;j<15;j++){var t=j/15;out.push(point(mix(vertices[i-1][0],vertices[i][0],t),mix(vertices[i-1][1],vertices[i][1],t)));}out.push(point(vertices.at(-1)[0],vertices.at(-1)[1]));return out;}
    for(var k=0;k<=75;k++){var y=mix(-.67,.75,k/75);main.push(point(mainX(y),y));neighbor.push(point(.81+.025*Math.sin(y*4),y));}
    var tributaryA=sampleLine([[-.94,-.47],[-.76,-.34],[-.57,-.20],[mainX(-.02),-.02]]);
    var tributaryB=sampleLine([[.11,-.37],[-.03,-.17],[-.18,.03],[mainX(.31),.31]]);
    this._localRiver=main;this._flowPaths=[main,tributaryA,tributaryB,neighbor];this._rainPaths={left:this._rainChannels('left'),right:this._rainChannels('right')};this._rainProjectedPaths={};this._rainProjectedFlows={};
    ['left','right'].forEach(function(side){self._rainProjectedPaths[side]={river:self._rainProjected(self._rainRiver(side)),channels:self._rainPaths[side].map(function(channel){return self._rainProjected(channel);})};self._rainProjectedFlows[side]=self._rainPaths[side].map(function(channel){return self._rainProjected(self._rainFlow(side,channel));});});
    [[main,9,'#79d8e3'],[tributaryA,5,'#8be3e8'],[tributaryB,5,'#8be3e8'],[neighbor,6,'#a2d6ce']].forEach(function(r){self._line(r[0],'rgba(29,79,89,.75)',r[1]+3);self._line(r[0],r[2],r[1]);self._arrow(r[0].slice(Math.floor(r[0].length*.57),Math.floor(r[0].length*.70)),r[2],2);});
    Object.keys(this._rainPaths).forEach(function(side){var tint=side==='left'?'rgba(102,216,241,.42)':'rgba(241,192,110,.42)';self._rainPaths[side].forEach(function(channel){var path=self._rainProjected(channel);self._line(path,'rgba(18,59,63,.46)',3);self._line(path,tint,1);});});
    var ridge=[];for(var j=0;j<=36;j++)ridge.push(point(.3,mix(-.7,.75,j/36)));this._line(ridge,'rgba(70,59,28,.55)',4);this._line(ridge,'#f3d089',2,[6,5]);
    // Runoff arrows start on opposite flanks and descend into separate valleys.
    this._arrow(sampleLine([[.21,-.06],[.08,.02],[-.09,.12]]),'#e7e4b3',2);
    this._arrow(sampleLine([[.39,-.06],[.57,.03],[.76,.14]]),'#e7e4b3',2);
    function label(text,x,y,dx,dy,color){var q=point(x,y);self._label(text,q[0]+dx,q[1]+dy,{size:self._w<480?10:11,bold:true,color:color||'#d6eff0'});}
    label('干流',mainX(.54),.54,-22,2);label('支流 ①',-.72,-.31,-10,-17);label('支流 ②',-.06,-.12,-7,-20);
    label('分水岭 · 山脊',.3,-.52,8,-22,'#f5d99d');label('相邻流域',.84,.48,19,18,'#c5e7d6');
    this._processState={kind:'watershed',phase:this._rain&&this._rain.length?'降雨→坡面汇流→干流输送':'等待降雨',phaseLabels:['降雨','坡面汇流','支流汇合','干流输送'],counts:{basins:(this._rain||[]).length,channels:(this._rain||[]).length*4,clouds:(this._rain||[]).length*4,flowParticles:0}};
  };
  ChinaScene.prototype._tree=function(x,y,scale){var q=this._project(x,y,this._localHeight(x,y)*this.options.exaggeration),s=scale||1,c=this.ctx;c.save();c.fillStyle='rgba(0,0,0,.14)';c.beginPath();c.ellipse(q[0]+4*s,q[1]+2*s,8*s,3*s,0,0,TAU);c.fill();this._line([[q[0],q[1]],[q[0],q[1]-8*s]],'#695c3d',2*s);for(var k=0;k<2;k++){c.beginPath();c.moveTo(q[0],q[1]-(23-k*7)*s);c.lineTo(q[0]-(9-k)*s,q[1]-(7-k*6)*s);c.lineTo(q[0]+(9-k)*s,q[1]-(7-k*6)*s);c.closePath();c.fillStyle=k?'#317555':'#458d66';c.fill();}c.restore();};
  ChinaScene.prototype._vegetation=function(p){var trees=[];for(var i=0;i<76;i++){var x=-.94+((i*37)%100)/100*1.83,y=-.59+((i*29)%100)/100*1.19;if(Math.abs(x-.08)<.17)continue;if(((i*17)%100)/100>p*.90+.05)continue;trees.push({x:x,y:y,d:this._project(x,y,0)[2]});}trees.sort(function(a,b){return a.d-b.d;});var self=this;trees.forEach(function(t){self._tree(t.x,t.y,clamp(self._w/950,.65,1.25)*self.camera.zoom);});};
  ChinaScene.prototype._farms=function(p){var self=this,c=this.ctx;for(var i=0;i<6;i++){var x=.37+(i%2)*.23,y=.13+Math.floor(i/2)*.17;var pts=[[x,y],[x+.19,y],[x+.19,y+.12],[x,y+.12]].map(function(a){return self._project(a[0],a[1],self._localHeight(a[0],a[1])*self.options.exaggeration+.008);});var path=this._path(pts);c.fillStyle=i%2?'#d0bc72':'#8bac70';c.fill(path);c.strokeStyle='#e3d593';c.lineWidth=.7;c.stroke(path);for(var j=1;j<5;j++)this._line([this._project(x+j*.034,y,this._localHeight(x+j*.034,y)*this.options.exaggeration+.009),this._project(x+j*.034,y+.12,this._localHeight(x+j*.034,y+.12)*this.options.exaggeration+.009)],'rgba(62,103,56,.65)',1);}
    if(p>.4)for(var n=0;n<6;n++){var y=-.36+n*.075,pts=[];for(var k=0;k<13;k++){var x=-.87+k*.045;pts.push(this._project(x,y,this._localHeight(x,y)*this.options.exaggeration+.008));}this._line(pts,'#d4be7d',3);}
    var q=this._project(.64,.42,.08);this._label('平地耕作',q[0]+22,q[1]+5,{color:'#f3e2a5'});q=this._project(-.65,-.25,.52*this.options.exaggeration);this._label(p>.5?'等高梯田 + 坡地林草':'坡耕地：侵蚀风险较高',q[0],q[1]-23,{color:'#e6deb2'});
  };
  ChinaScene.prototype._sediment=function(p){var self=this,c=this.ctx;
    var starts=[[-.84,-.48],[-.70,-.38],[-.54,-.31],[-.35,-.25]],paths=[];
    starts.forEach(function(start,index){var endY=-.24+index*.07,pts=[];for(var j=0;j<=18;j++){var t=j/18,x=mix(start[0],.08+Math.sin(endY*5.5)*.085,t),y=mix(start[1],endY,t);pts.push(self._project(x,y,self._localHeight(x,y)*self.options.exaggeration+.02));}var riverStart=clamp(Math.round((endY+.67)/1.43*75),0,75);paths.push(pts.concat(self._localRiver.slice(riverStart)));});
    this._sedimentPaths=paths;this._processState={kind:'river-erosion',phase:'坡面侵蚀→泥沙入河→下游输送',phaseLabels:['坡面侵蚀','泥沙入河','下游输送','沉积'],counts:{erosionPaths:paths.length,sedimentParticles:Math.round(6+(1-p)*16),vegetation:Math.round(15+p*60)}};
    for(var j=0;j<8;j++){var pts=[];for(var k=0;k<12;k++){var x=-.74+k*.055,y=-.29+j*.085;pts.push(self._project(x,y,self._localHeight(x,y)*self.options.exaggeration+.006));}this._line(pts,'rgba(166,120,64,'+((1-p)*.62)+')',1.8);}
    var q=this._project(.08,.69,this._localHeight(.08,.69)*this.options.exaggeration+.023);c.save();c.globalAlpha=.22+(1-p)*.35;c.fillStyle='#d5a45c';c.beginPath();c.ellipse(q[0],q[1],18+(1-p)*20,7+(1-p)*8,0,0,TAU);c.fill();c.restore();
  };
  ChinaScene.prototype._landFlows=function(p){var self=this,c=this.ctx,starts=[[-.88,-.48],[-.66,-.41],[-.44,-.34],[-.20,-.29]],paths=[];
    starts.forEach(function(start,index){var endY=-.08+index*.13,pts=[];for(var j=0;j<=24;j++){var t=j/24,x=mix(start[0],.08+Math.sin(endY*5.5)*.085,t),y=mix(start[1],endY,t);pts.push(self._project(x,y,self._localHeight(x,y)*self.options.exaggeration+.024));}paths.push(pts);});
    var active=Math.max(1,Math.round(4-(p*3)));this._landRunoffPaths=paths.slice(0,active);this._processState={kind:'land-conservation',phase:p>.55?'降雨→入渗为主':'降雨→地表径流为主',phaseLabels:['降雨','坡面入渗','地表径流','河道汇合'],counts:{runoffPaths:active,infiltrationArrows:Math.round(3+p*9),flowParticles:active*3}};
    paths.forEach(function(path,index){var alpha=index<active?(0.48+(1-p)*.35):.10;self._line(path,'rgba(73,162,193,'+alpha+')',index<active?2.5:1,[4,4]);if(index<active)self._arrow(path.slice(-9),p<.5?'#7bd5e5':'#9bbfba',1.6);});
    for(var i=0;i<Math.round(3+p*9);i++){var x=-.82+(i%5)*.16,y=-.42+Math.floor(i/5)*.20,q=self._project(x,y,self._localHeight(x,y)*self.options.exaggeration+.03);self._line([[q[0],q[1]-13],[q[0]-2,q[1]-3]],'#a8d5b4',1.5);self._arrow([[q[0]-2,q[1]-5],[q[0]-2,q[1]+2]],'#a8d5b4',1.2);}
    var q=this._project(-.72,-.47,.38);this._label(p>.55?'林草覆盖：入渗增强':'裸坡径流：汇流较快',q[0],q[1]-20,{color:p>.55?'#b8e0bf':'#e9c99c'});
  };
  ChinaScene.prototype._energy=function(p){var c=this.ctx,self=this;this._turbines=[];for(var i=0;i<Math.round(1+p*6);i++){var x=-.88+(i%3)*.22,y=-.36+Math.floor(i/3)*.29,q=this._project(x,y,this._localHeight(x,y)*this.options.exaggeration);this._line([[q[0],q[1]],[q[0],q[1]-39]],'#ccd7ca',3);this._turbines.push([q[0],q[1]-39]);}
    for(var j=0;j<Math.round(2+p*9);j++){var x=.34+(j%3)*.17,y=-.25+Math.floor(j/3)*.12;var pts=[[x,y],[x+.13,y],[x+.13,y+.085],[x,y+.085]].map(function(a){return self._project(a[0],a[1],self._localHeight(a[0],a[1])*self.options.exaggeration+.035);});c.fillStyle='#236b84';c.strokeStyle='#71b5bc';c.lineWidth=.8;c.fill(this._path(pts));c.stroke(this._path(pts));}
    var coal=this._project(-.65,.45,this._localHeight(-.65,.45)*this.options.exaggeration),amount=1-p;c.fillStyle='#485453';c.beginPath();c.ellipse(coal[0],coal[1],14+amount*35,9+amount*15,0,0,TAU);c.fill();this._label('化石消耗 '+Math.round((1-p)*100)+' · 示意',coal[0],coal[1]+27,{size:10,color:'#d3d7cb'});var q=this._project(.64,-.13,.3);this._label('风光发电 + 储能调节',q[0],q[1]-23,{color:'#bee2ce'});
    var water=[[-.045,-.21],[.21,-.21],[.20,.12],[-.065,.12]].map(function(a){return self._project(a[0],a[1],.075*self.options.exaggeration);});c.fillStyle='rgba(67,163,192,.75)';c.fill(this._path(water));var dam=[this._project(-.075,.15,.11),this._project(.22,.15,.11),this._project(.22,.20,.05),this._project(-.075,.20,.05)];c.fillStyle='#a0b3ab';c.fill(this._path(dam));this._label('水库 / 水能',dam[1][0]+40,dam[1][1],{size:10});
  };
  ChinaScene.prototype._ecology=function(p){var c=this.ctx,self=this;for(var k=0;k<25;k++){var y=-.60+k*.05,x=.08+Math.sin(y*5.5)*.085;[-1,1].forEach(function(s){var q=self._project(x+s*.07,y,self._localHeight(x+s*.07,y)*self.options.exaggeration+.007);self._dot(q[0],q[1],2+p*4,'rgba(56,146,89,'+(.15+p*.50)+')');});}var q=this._project(.53,.21,.13);c.fillStyle='#a7b2a8';c.fillRect(q[0]-13,q[1]-15,27,17);c.fillStyle='#596b67';c.fillRect(q[0]-3,q[1]-30,7,16);this._pollutionPath=[[q[0]-12,q[1]+2],this._project(.15,.3,.055),this._project(.08,.55,this._localHeight(.08,.55)*this.options.exaggeration+.03),this._project(.08,.72,this._localHeight(.08,.72)*this.options.exaggeration+.03)];this._line(this._pollutionPath,color([154,133,64],[96,184,186],p),4);c.save();c.globalAlpha=.18+(1-p)*.30;c.fillStyle='#c99b5d';for(var plume=0;plume<7;plume++){var pq=this._pollutionPath[Math.min(this._pollutionPath.length-1,1+plume%3)];c.beginPath();c.arc(pq[0]+Math.sin(plume*2.4)*9,pq[1]+Math.cos(plume*1.7)*6,3+(1-p)*3,0,TAU);c.fill();}c.restore();this._label(p>.55?'源头治理 + 河岸缓冲带':'排放入河：污染压力较高',q[0]+10,q[1]-43,{color:p>.55?'#c1e2cc':'#edcea2'});this._processState={kind:'ecology-restoration',phase:p>.55?'治理→河岸缓冲→水体恢复':'污染→河流传播',phaseLabels:['污染排放','河流传播','河岸缓冲','水体恢复'],counts:{pollutionParticles:Math.round(4+(1-p)*18),bufferTrees:Math.round(8+p*26),sourceNodes:1}};};
  ChinaScene.prototype._energyFlow=function(p){var c=this.ctx,self=this,amount=1-p,coal=this._project(-.65,.45,this._localHeight(-.65,.45)*this.options.exaggeration),q=this._project(.64,-.13,.3),demand=this._project(.61,.51,.16);this._energyPaths=[];[{point:this._turbines[0],kind:'wind',weight:p},{point:q,kind:'solar',weight:p},{point:[coal[0],coal[1]-7],kind:'coal',weight:amount}].forEach(function(source){if(!source.point||source.weight<=0)return;var pts=[source.point,[mix(source.point[0],demand[0],.42),mix(source.point[1],demand[1],.42)-22],[demand[0],demand[1]]];self._energyPaths.push({kind:source.kind,points:pts,weight:source.weight});self._line(pts,source.kind==='coal'?'rgba(210,172,116,.40)':'rgba(172,226,208,.44)',2,[3,5]);});c.fillStyle='#b8d2c6';c.fillRect(demand[0]-17,demand[1]-22,34,22);c.fillStyle='#173d4a';c.fillRect(demand[0]-11,demand[1]-16,7,7);c.fillRect(demand[0]+3,demand[1]-16,7,7);this._label('城市用电',demand[0],demand[1]+18,{size:10,color:'#c7e3d1'});this._processState={kind:'energy-flow',phase:'能源发电→输电→城市用电',phaseLabels:['能源发电','输电','储能调节','城市用电'],counts:{wind:this._turbines.length,solar:Math.round(2+p*9),coal:Math.round(amount*10),demandNodes:1,flowParticles:Math.round(4+p*8)}};};
  ChinaScene.prototype._arrow=function(points,col,width){if(points.length<2)return;this._line(points,col,width||2);var a=points[points.length-2],b=points[points.length-1],ang=Math.atan2(b[1]-a[1],b[0]-a[0]),s=8,c=this.ctx;c.fillStyle=col;c.beginPath();c.moveTo(b[0],b[1]);c.lineTo(b[0]-Math.cos(ang-.5)*s,b[1]-Math.sin(ang-.5)*s);c.lineTo(b[0]-Math.cos(ang+.5)*s,b[1]-Math.sin(ang+.5)*s);c.closePath();c.fill();};
  ChinaScene.prototype._trailPoint=function(path,t){if(!path||path.length<2)return null;var f=clamp(t,0,.99999)*(path.length-1),i=Math.floor(f);return [mix(path[i][0],path[i+1][0],f-i),mix(path[i][1],path[i+1][1],f-i)];};
  ChinaScene.prototype._animate=function(time){this._rainExperiment(time);var c=this.ctx,self=this,p=this.options.parameter/100,t=time*.00013;if(this.scene==='monsoon')this._monsoonAnimate(time);
    if(this.scene==='river'||this.scene==='ecology'){var paths=this._flowPaths||[this._localRiver];paths.forEach(function(path){for(var k=0;k<8;k++){var a=self._trailPoint(path,(t*.7+k/8)%1);if(a)self._dot(a[0],a[1],1.7,!self._isWatershed()&&self.scene==='river'&&p<.4?'#dcca8d':'#d0f1ed');}});}
    if(this.scene==='river'&&this._sedimentPaths){var sedimentCount=Math.round(3+(1-p)*9);this._sedimentPaths.forEach(function(path,index){for(var k=0;k<sedimentCount;k++){var a=self._trailPoint(path,(t*.52+k/sedimentCount+index*.17)%1);if(a)self._dot(a[0],a[1],1.4+(1-p)*1.6,'#d7ac6f');}});}
    if(this.scene==='land'&&this._landRunoffPaths){this._landRunoffPaths.forEach(function(path,index){for(var k=0;k<3;k++){var a=self._trailPoint(path,(t*.62+k/3+index*.21)%1);if(a)self._dot(a[0],a[1],2,'#a7e1e2');}});}
    if(this.scene==='ecology'&&this._pollutionPath){var pollutionCount=Math.round(2+(1-p)*10);for(var k=0;k<pollutionCount;k++){var a=self._trailPoint(this._pollutionPath,(t*.38+k/pollutionCount)%1);if(a)self._dot(a[0],a[1],1.8+(1-p)*1.7,p>.55?'rgba(132,208,180,.65)':'rgba(208,150,91,.85)');}}
    if(this.scene==='resources'&&this._turbines){this._turbines.forEach(function(q,j){for(var k=0;k<3;k++){var a=time*.0011+k*TAU/3+j;self._line([q,[q[0]+Math.cos(a)*17,q[1]+Math.sin(a)*17]],'#dce8df',2.5);}self._dot(q[0],q[1],3,'#8db1aa');});(this._energyPaths||[]).forEach(function(flow,index){var count=Math.round(flow.weight*3);for(var k=0;k<count;k++){var a=self._trailPoint(flow.points,(t*.52+k/count+index*.19)%1);if(a)self._dot(a[0],a[1],2.4,flow.kind==='coal'?'#e4b672':flow.kind==='solar'?'#f3df9a':'#a9e2ce');}});}
    if(this.scene==='transport'&&this._route){var speed=this._transportMode==='road'?.48:this._transportMode==='rail'?.85:.22,count=this._transportMode==='ship'?3:this._transportMode==='rail'?2:4;for(var k=0;k<count;k++){var f=(t*speed+k/count)%1,a=self._trailPoint(this._route,f),b=self._trailPoint(this._route,Math.min(.999,f+.012));if(a&&b){var angle=Math.atan2(b[1]-a[1],b[0]-a[0]);c.save();c.shadowColor='#dffbf3';c.shadowBlur=10;self._transportGlyph(self._transportMode,a[0],a[1],angle,self._w<480?.72:.95);c.restore();}}}
  };
  root.ChinaScene=ChinaScene;
})(window);
