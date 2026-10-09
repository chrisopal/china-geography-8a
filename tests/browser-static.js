async page => {
  const errors=[], apiRequests=[];
  const onError=e=>errors.push(e.message), onRequest=r=>{if(new URL(r.url()).pathname.startsWith('/api/'))apiRequests.push(r.url());};
  page.on('pageerror',onError);page.on('request',onRequest);
  await page.setViewportSize({width:1440,height:1000});
  await page.goto('http://127.0.0.1:8769/');await page.waitForFunction(()=>window.geographyApp);
  await page.evaluate(()=>geographyApp.selectNode('location'));
  if(!await page.locator('#ask-input').isDisabled())throw new Error('Static AI input must remain disabled');
  await page.locator('#play-narration').click();
  await page.waitForFunction(()=>document.querySelector('audio').currentTime>.1);
  const audioDuration=await page.locator('audio').evaluate(a=>a.duration);
  await page.locator('[data-explore=terrain-steps]').click();
  await page.locator('#step-next').click();
  await page.waitForFunction(()=>geographyApp.getState().scene.view==='profile');
  await page.locator('[data-view=top]').click();
  await page.waitForFunction(()=>!geographyApp.getState().scene.animating);
  const before=await page.evaluate(()=>geographyApp.getState().scene.camera);
  await page.locator('#step-next').click();
  const after=await page.evaluate(()=>geographyApp.getState().scene.camera);
  if(JSON.stringify(before)!==JSON.stringify(after))throw new Error('Static narration stole the free camera');
  if(apiRequests.length || errors.length)throw new Error(JSON.stringify({apiRequests,errors}));
  page.off('pageerror',onError);page.off('request',onRequest);
  return {staticMode:true,courseNodes:await page.evaluate(()=>geographyApp.getCourse().nodes.length),audioDuration,stepCamera:true,freeCameraPreserved:true,backendRequests:0,errors};
}
