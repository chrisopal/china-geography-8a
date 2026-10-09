async page => {
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.setViewportSize({width:1500,height:980});
  await page.goto('http://127.0.0.1:8767/');await page.waitForFunction(()=>window.geographyApp);
  await page.evaluate(()=>geographyApp.selectNode('location'));
  await page.waitForFunction(()=>document.getElementById('audio-status').textContent.includes('已缓存'));
  await page.locator('#continuous-audio').check();await page.locator('#play-narration').click();
  await page.waitForFunction(()=>document.getElementById('narration-audio').currentTime>.1);
  const first=await page.evaluate(()=>({duration:document.getElementById('narration-audio').duration,src:document.getElementById('narration-audio').getAttribute('src')}));
  if(first.duration<5||!first.src.endsWith('.mp3'))throw new Error('real TTS audio unavailable');
  await page.evaluate(()=>{const a=document.getElementById('narration-audio');a.currentTime=a.duration-.15;});
  await page.waitForFunction(()=>geographyApp.getState().step===1&&!document.getElementById('narration-audio').paused);
  const second=await page.evaluate(()=>document.getElementById('narration-audio').getAttribute('src'));
  if(first.src===second)throw new Error('continuous narration reused wrong clip');
  await page.locator('#continuous-audio').uncheck();
  await page.evaluate(()=>geographyApp.selectNode('monsoon'));
  if(!await page.locator('#narration-audio').isHidden())throw new Error('old lesson audio still visible');
  await page.route('**/api/narration',async route=>{await new Promise(r=>setTimeout(r,700));await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({url:first.src,cue:'monsoon-01',cached:true})});});
  await page.locator('#play-narration').click();
  await page.evaluate(()=>geographyApp.selectNode('longitude'));
  await page.waitForTimeout(1000);
  const staleSuppressed=await page.evaluate(()=>document.getElementById('narration-audio').paused&&document.getElementById('narration-audio').hidden);
  if(!staleSuppressed)throw new Error('stale speech started after navigation');
  await page.unroute('**/api/narration');await page.evaluate(()=>geographyApp.selectNode('location'));
  await page.screenshot({path:'evidence/desktop-final.png'});
  return {realCachedTTS:true,firstDuration:first.duration,continuousAdvances:true,oldAudioStopsOnNavigation:true,staleSuppressed,errors};
}
