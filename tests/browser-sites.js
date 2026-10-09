async page => {
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/api/status',async route=>{
    const response=await route.fetch(),data=await response.json();
    data.configured=true;data.tts.configured=true;
    await route.fulfill({response,json:data});
  });
  await page.setViewportSize({width:1500,height:980});
  await page.goto('http://127.0.0.1:8768/');
  await page.waitForFunction(()=>window.geographyApp);
  await page.evaluate(()=>geographyApp.selectNode('location'));
  await page.locator('#play-narration').click();
  await page.waitForFunction(()=>document.getElementById('narration-audio').currentTime>.1);
  const bundledDuration=await page.locator('#narration-audio').evaluate(a=>a.duration);
  if(bundledDuration<10)throw new Error('Bundled narration failed');
  await page.evaluate(()=>geographyApp.selectNode('monsoon'));
  let requests=0;
  const audioBase64=(await (await page.request.get('http://127.0.0.1:8768/audio/location-01-6e615d5a9bcd69c5.mp3')).body()).toString('base64');
  await page.route('**/api/narration',async route=>{
    requests++;
    await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(requests===1?{url:'/audio/evicted.mp3'}:{audioBase64,mimeType:'audio/mpeg',cue:'monsoon-01'})});
  });
  await page.locator('#play-narration').click();
  await page.waitForFunction(()=>document.getElementById('play-narration').textContent.includes('重试'));
  await page.locator('#play-narration').click();
  await page.waitForFunction(()=>document.getElementById('narration-audio').currentTime>.1);
  if(requests!==2)throw new Error('Evicted narration did not regenerate on retry');
  await page.reload();await page.waitForFunction(()=>window.geographyApp);await page.evaluate(()=>geographyApp.selectNode('monsoon'));
  if(!await page.evaluate(()=>geographyApp.getState().audioIds.includes('monsoon-01')))throw new Error('Generated audio was not saved');
  await page.locator('#play-narration').click();await page.waitForFunction(()=>document.getElementById('narration-audio').currentTime>.1);
  if(requests!==2)throw new Error('Saved generated audio caused another generation');
  await page.unroute('**/api/narration');
  await page.evaluate(()=>new Promise((resolve,reject)=>{const req=indexedDB.open('china-geography-audio-v1',1);req.onsuccess=()=>{const db=req.result,tx=db.transaction('clips','readwrite');tx.objectStore('clips').delete('monsoon-01');tx.oncomplete=()=>{db.close();resolve();};tx.onerror=()=>reject(tx.error);};}));
  await page.reload();await page.waitForFunction(()=>window.geographyApp);
  await page.evaluate(()=>geographyApp.selectNode('location'));
  await page.screenshot({path:'evidence/sites-desktop.png'});
  await page.setViewportSize({width:390,height:844});
  await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
  if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth))throw new Error('Horizontal overflow');
  await page.screenshot({path:'evidence/sites-mobile.png'});
  await page.unroute('**/api/status');
  if(errors.length)throw new Error(errors.join(';'));
  return {workerBundleLoads:true,bundledNarrationSeconds:bundledDuration,evictedAudioRetry:true,generatedAudioPersists:true,mobileNoOverflow:true,errors};
}
