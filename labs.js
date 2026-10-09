/* Small, explicit models. Inputs and assumptions are shown alongside every result. */
(() => {
  'use strict';
  const make = (tag, text, cls) => { const e=document.createElement(tag); if(text!==undefined)e.textContent=text; if(cls)e.className=cls; return e; };
  const density = (populationTenThousand, areaTenThousand) => populationTenThousand / areaTenThousand;
  const flow = (width, depth, speed) => width * depth * speed;
  const solar = (latitude, declination) => 90 - Math.abs(latitude-declination);
  const localMinutes = longitude => 12*60 + (longitude-120)*4;
  const clock = mins => `${String(Math.floor(mins/60)).padStart(2,'0')}:${String(Math.round(mins%60)).padStart(2,'0')}`;
  const svg = content => { const e = document.createElementNS('http://www.w3.org/2000/svg','svg'); e.setAttribute('viewBox','0 0 360 110'); e.setAttribute('aria-hidden','true'); e.innerHTML=content; return e; };
  function range(label, min, max, value, step, update) {
    const row=make('label',undefined,'lab-control'), text=make('span',label), input=document.createElement('input'), output=make('output',String(value));
    input.type='range'; Object.assign(input,{min,max,value,step}); input.setAttribute('aria-label',label);
    input.oninput=()=>{output.textContent=input.value;update(Number(input.value));}; row.append(text,input,output); return {row,input,output};
  }
  function mount(node, host) {
    host.replaceChildren(); host.hidden=false;
    const details=make('details',undefined,'mini-lab'), summary=make('summary'), content=make('div',undefined,'lab-content'); details.append(summary,content); host.append(details);
    const result=make('div',undefined,'lab-result'), picture=make('div',undefined,'lab-picture'), note=make('p',undefined,'lab-note');
    if(node.id==='longitude'){
      summary.textContent='再做一个小实验：同一时刻，各地的地方时';
      note.textContent='假设东经120°的地方时为12:00。经度每相差1°，地方时相差4分钟；东早西晚。我国日常统一使用北京时间，这里计算的不是各地钟表时间。';
      const update=lon=>{result.textContent=`东经 ${lon}° → 地方时 ${clock(localMinutes(lon))}`;const x=25+(lon-74)/61*300;picture.replaceChildren(svg(`<line x1="25" y1="65" x2="335" y2="65" stroke="#77959b"/><line x1="251" y1="27" x2="251" y2="82" stroke="#e2b879" stroke-dasharray="4 3"/><circle cx="${x}" cy="65" r="9" fill="#b5e7bc"/><text x="25" y="100" fill="#a7c4c6" font-size="11">西 74°E</text><text x="229" y="20" fill="#e2b879" font-size="10">120°E</text><text x="295" y="100" fill="#a7c4c6" font-size="11">东 135°E</text>`));};
      const field=range('所在地经度（°E）',74,135,90,1,update);content.append(field.row,result,picture,note);update(90);
    } else if(node.id==='population-density'){
      summary.textContent='再做一个小实验：亲手算人口密度';
      note.textContent='人口密度＝人口÷面积。默认使用教材中的2020年江苏与青海数据；它不是当前人口数。下方可改变假设值，比较人口与面积各自的影响。';
      let pop=8474.8,area=10.72;
      const update=()=>{result.textContent=`${pop.toLocaleString('zh-CN')} 万人 ÷ ${area} 万平方千米 = ${density(pop,area).toFixed(1)} 人/平方千米`;picture.replaceChildren(svg(`<rect x="20" y="20" width="320" height="55" rx="5" fill="#19343b"/><rect x="20" y="20" width="${Math.min(320,density(pop,area)/1000*320)}" height="55" rx="5" fill="#79b99c"/><text x="20" y="100" fill="#a7c4c6" font-size="10">比较尺：0 — 1000 人/平方千米</text>`));};
      const p=range('人口（万人）',100,10000,pop,.1,v=>{pop=v;update();}), a=range('面积（万平方千米）',1,100,area,.01,v=>{area=v;update();});
      const presets=make('div',undefined,'lab-presets'); [['江苏（2020）',8474.8,10.72],['青海（2020）',592.4,72.23]].forEach(([label,population,size])=>{const b=make('button',label);b.onclick=()=>{pop=population;area=size;p.input.value=pop;p.output.textContent=pop;a.input.value=area;a.output.textContent=area;update();};presets.append(b);});
      content.append(presets,p.row,a.row,result,picture,note);update();
    } else if(node.id==='latitude'||node.id==='winter-temperature'){
      summary.textContent='再做一个小实验：纬度、季节与正午太阳';
      note.textContent='理想条件下，正午太阳高度＝90°−|当地纬度−太阳直射点纬度|。太阳高度影响光热条件，但气温还受海陆、海拔、云量等因素影响，不能用此直接预测气温。';
      let lat=35, decl=23.44; const update=()=>{const h=solar(lat,decl),r=h*Math.PI/180;result.textContent=`北纬 ${lat}° · ${decl>0?'夏至':'冬至'}正午太阳高度约 ${h.toFixed(1)}°`;const x=90+120*Math.cos(r),y=95-85*Math.sin(r);picture.replaceChildren(svg(`<path d="M25 95 H330" stroke="#6c8b91"/><path d="M90 95 L${x} ${y}" stroke="#e8bd83" stroke-width="2"/><circle cx="${x}" cy="${y}" r="10" fill="#e8bd83"/><path d="M90 95 L90 64" stroke="#b5e7bc" stroke-width="3"/><text x="238" y="55" fill="#b5e7bc" font-size="18">${h.toFixed(1)}°</text>`));};
      const presets=make('div',undefined,'lab-presets'); [['夏至',23.44],['冬至',-23.44]].forEach(([text,d])=>{const b=make('button',text);b.onclick=()=>{decl=d;update();};presets.append(b);});
      content.append(presets,range('纬度（°N）',18,53,lat,1,v=>{lat=v;update();}).row,result,picture,note);update();
    } else if(node.id==='sediment-lab'){
      summary.textContent='再做一个小实验：同样的水，河道变窄会怎样？';
      note.textContent='假设流量固定为40立方米/秒、水深固定为2米：平均流速＝流量÷过水断面面积。缩小断面会提高流速，有利于输沙；实际工程同时受河床、水位、泥沙粒径等影响，不能用这里的数字设计堤防。';
      const update=width=>{const speed=40/(width*2);result.textContent=`河宽 ${width} 米 → 断面 ${width*2} 平方米 → 平均流速 ${speed.toFixed(1)} 米/秒`;const w=width/20*260;picture.replaceChildren(svg(`<rect x="${180-w/2}" y="22" width="${w}" height="60" fill="#559cb0"/><path d="M${180-w/2} 14 V85 M${180+w/2} 14 V85" stroke="#b0a47c" stroke-width="6"/><path d="M120 52 H${150+speed*30} l-12 -6 m12 6 l-12 6" stroke="#b5e7bc" fill="none" stroke-width="3"/><text x="20" y="105" fill="#a7c4c6" font-size="10">固定流量与水深，仅改变河宽 · 箭头示意速度</text>`));};
      content.append(range('河宽（米）',5,20,10,1,update).row,result,picture,note);update(10);
    } else if(/流量.*水位|水位.*流速|河流流量/.test(node.title)){
      summary.textContent='再做一个小实验：一秒钟流过多少水？';
      note.textContent='把河道近似成矩形：流量 Q＝过水断面面积 A×断面平均流速 v＝宽×水深×流速。实际河道形状复杂；水位升高不表示流速一定按同一比例增加。';
      let width=10,depth=2,speed=1;
      const update=()=>{result.textContent=`Q = ${width} × ${depth} × ${speed} = ${flow(width,depth,speed).toFixed(1)} 立方米/秒`;const w=width/30*280,h=depth/5*65;picture.replaceChildren(svg(`<path d="M30 10 V85 H330 V10" fill="none" stroke="#8b8772" stroke-width="8"/><rect x="${180-w/2}" y="${85-h}" width="${w}" height="${h}" fill="#58aac3"/><text x="25" y="108" fill="#a7c4c6" font-size="10">矩形过水断面 · 蓝色面积 × 平均流速</text>`));};
      content.append(range('河宽（米）',2,30,width,1,v=>{width=v;update();}).row,range('水深（米）',.5,5,depth,.1,v=>{depth=v;update();}).row,range('平均流速（米/秒）',.2,3,speed,.1,v=>{speed=v;update();}).row,result,picture,note);update();
    } else {host.hidden=true;host.replaceChildren();}
  }
  window.GeographyLabs={mount,density,flow,solar,localMinutes};
})();
