async page => {
  await page.setViewportSize({width:1500,height:980});await page.goto('http://127.0.0.1:8767/');await page.waitForFunction(()=>window.geographyApp);
  const results=[];
  for(const id of ['river-system','plateaus','basins','plains','mountain-directions','step-boundaries']){
    await page.evaluate(id=>geographyApp.selectNode(id),id);
    await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
    const state=await page.evaluate(()=>geographyApp.getState().scene);
    if(state.focus!==id)throw new Error('focus not wired '+id);
    if(id!=='river-system'&&state.scene!=='china')throw new Error('not on China map '+id);
    await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:`evidence/focus-${id}.png`});results.push({id,focus:state.focus,scene:state.scene});
  }
  await page.setViewportSize({width:390,height:844});await page.evaluate(()=>geographyApp.selectNode('mountain-directions'));await page.evaluate(()=>scrollTo(0,0));
  await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
  await page.screenshot({path:'evidence/mobile-mountains.png'});
  if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth))throw new Error('mobile overflow');
  await page.setViewportSize({width:1500,height:980});await page.evaluate(()=>geographyApp.selectNode('location'));await page.evaluate(()=>{scrollTo(0,0);document.getElementById('sidebar').scrollTop=0;});
  await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
  await page.screenshot({path:'evidence/desktop-final.png'});
  return {focuses:results,mobileNoOverflow:true};
}
