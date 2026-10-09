async page => {
  const errors=[],checks=[],onError=e=>errors.push(e.message);page.on('pageerror',onError);
  const check=(ok,label)=>{if(!ok)throw new Error(label);checks.push(label);};
  const state=()=>page.evaluate(()=>geographyApp.getState());
  const frame=()=>page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
  const pixels=()=>page.locator('#scene').evaluate(c=>{const a=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let h=2166136261;for(let i=0;i<a.length;i+=29)h=Math.imul(h^a[i],16777619);return h>>>0;});
  await page.setViewportSize({width:1500,height:1050});await page.emulateMedia({reducedMotion:'no-preference'});
  await page.goto('http://127.0.0.1:8768/');await page.waitForFunction(()=>window.geographyApp);
  await page.locator('[data-explore=monsoon]').click();await page.waitForTimeout(300);
  let wind=(await state()).scene.wind;
  check(wind.streams.length>=8 && wind.streams.every(f=>f.kind==='winter'),'winter shows a distributed cold wind field');
  check(wind.clouds===0,'winter does not inherit summer rain');
  await page.screenshot({path:'evidence/process-monsoon-winter.png'});
  await page.locator('[data-season="100"]').click();await frame();wind=(await state()).scene.wind;
  check(wind.streams.filter(f=>f.kind==='southeast').length>=5 && wind.streams.filter(f=>f.kind==='southwest').length>=3,'summer has multiple southeast and southwest moisture streams');
  check(wind.clouds>5,'summer clouds are distributed over land');
  const moving=await pixels();await page.waitForTimeout(250);check(await pixels()!==moving,'wind and cloud/rain visibly advance');
  await page.screenshot({path:'evidence/process-monsoon-summer.png'});
  await page.locator('[data-explore=river-system]').click();await page.getByRole('button',{name:'两侧同时落雨',exact:true}).click();await page.waitForTimeout(350);
  check((await state()).scene.experiment.rain.length===2,'both watersheds can receive rain together');
  check((await state()).scene.experiment.routes.every(r=>r.downhill),'rain still follows downhill basin routes');
  await page.screenshot({path:'evidence/process-watershed.png'});
  await page.locator('#motion-toggle').click();await page.waitForFunction(()=>!geographyApp.getState().scene.animating);await frame();
  const frozen=await pixels();await page.waitForTimeout(220);check(await pixels()===frozen,'paused rain/runoff remains pixel stable');
  const preserved=(await state()).scene;await page.locator('[data-speed="0.5"]').click();await frame();
  check((await state()).scene.options.playbackSpeed===.5,'half speed control reaches the simulation');
  await page.locator('#replay-process').click();await frame();let replay=(await state()).scene;
  check(!replay.paused && JSON.stringify(replay.camera)===JSON.stringify(preserved.camera),'replay resumes animation without resetting camera');
  check(replay.experiment.rain.length===2,'replay preserves selected rainfall experiment');
  await page.locator('[data-speed="2"]').click();check((await state()).scene.options.playbackSpeed===2,'double speed control reaches the simulation');
  const nodes=await page.evaluate(()=>geographyApp.getCourse().nodes.map(n=>({id:n.id,scene:n.scene})));
  for(const kind of ['river','land','resources','transport','ecology']){
    const node=nodes.find(n=>n.scene===kind && !['river-system','watershed'].includes(n.id));
    await page.evaluate(id=>geographyApp.selectNode(id),node.id);await page.waitForTimeout(300);
    const presets=page.locator('[data-preset]');check(await presets.count()>=2,kind+' exposes comparison presets');
    await presets.first().click();await frame();const low=await pixels();
    await presets.last().click();await frame();const high=await pixels();check(low!==high,kind+' presets change visible process');
    check(await presets.last().getAttribute('aria-pressed')==='true',kind+' selected scenario is reflected in controls');
    await page.waitForTimeout(220);check(await pixels()!==high,kind+' process visibly moves');
    await page.locator('#motion-toggle').click();await page.waitForFunction(()=>!geographyApp.getState().scene.animating);await frame();const freeze=await pixels();await page.waitForTimeout(180);check(freeze===await pixels(),kind+' pause is stable');
    await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:'evidence/process-'+kind+'.png'});
  }
  await page.setViewportSize({width:390,height:844});await page.locator('[data-explore=river-system]').click();await page.getByRole('button',{name:'两侧同时落雨',exact:true}).click();await page.waitForTimeout(350);
  check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'mobile has no horizontal overflow');
  await page.screenshot({path:'evidence/process-watershed-mobile.png',fullPage:true});
  await page.emulateMedia({reducedMotion:'reduce'});await frame();const still=await pixels();await page.waitForTimeout(180);check(still===await pixels(),'reduced-motion freezes processes while preserving static evidence');
  check(errors.length===0,'no browser errors');page.off('pageerror',onError);await page.emulateMedia({reducedMotion:'no-preference'});
  return {checks,errors};
}
