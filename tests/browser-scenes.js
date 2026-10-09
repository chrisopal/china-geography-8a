async page => {
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.setViewportSize({width:1500,height:980});await page.emulateMedia({reducedMotion:'reduce'});
  await page.goto('http://127.0.0.1:8767/');await page.waitForFunction(()=>window.geographyApp);
  const nodes=await page.evaluate(()=>geographyApp.getCourse().nodes.map(n=>({id:n.id,scene:n.scene})));
  const hash=()=>page.evaluate(()=>{const a=document.getElementById('scene').getContext('2d').getImageData(0,0,document.getElementById('scene').width,document.getElementById('scene').height).data;let h=2166136261;for(let i=0;i<a.length;i+=17)h=Math.imul(h^a[i],16777619);return h>>>0;});
  const results=[];
  for(const name of ['china','monsoon','river','land','resources','transport','ecology']){
    const n=nodes.find(n=>n.scene===name && n.id!=='river-system');if(!n)throw new Error('missing scene curriculum '+name);
    await page.evaluate(id=>geographyApp.selectNode(id),n.id);
    await page.locator('#parameter').fill('0');await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));const low=await hash();
    await page.locator('#parameter').fill('100');await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));const high=await hash();
    if(low===high)throw new Error('parameter has no visible effect '+name);
    const before=await page.evaluate(()=>geographyApp.getState().scene.camera.zoom);await page.locator('#zoom-in').click();
    if((await page.evaluate(()=>geographyApp.getState().scene.camera.zoom))<=before)throw new Error('zoom fails');
    await page.locator('#reset-view').click();
    const labelsBefore=await hash();await page.locator('#labels-toggle').click();await page.evaluate(()=>new Promise(r=>requestAnimationFrame(r)));const labelsAfter=await hash();
    if(labelsBefore===labelsAfter)throw new Error('labels unchanged '+name);await page.locator('#labels-toggle').click();
    await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:`evidence/scene-${name}.png`});
    results.push({scene:name,pixelChange:true,zoom:true,labels:true,metrics:await page.locator('#metrics').innerText()});
  }
  await page.evaluate(()=>geographyApp.selectNode('monsoon'));
  await page.setViewportSize({width:390,height:844});await page.evaluate(()=>scrollTo(0,0));
  await page.screenshot({path:'evidence/mobile-monsoon.png'});
  if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth))throw new Error('mobile overflow');
  await page.context().setOffline(true);await page.locator('#parameter').fill('0');
  const offline=await page.evaluate(()=>geographyApp.getState().scene.options.parameter===0);await page.context().setOffline(false);
  await page.setViewportSize({width:1500,height:980});await page.evaluate(()=>geographyApp.selectNode('location'));
  return {scenes:results,offlineLoadedInteraction:offline,errors};
}
