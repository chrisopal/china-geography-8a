async page => {
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.setViewportSize({width:1500,height:980});
  await page.goto('http://127.0.0.1:8767/');await page.waitForFunction(()=>window.geographyApp);
  await page.evaluate(()=>geographyApp.selectNode('monsoon'));
  await page.locator('#tab-ask').click();
  await page.route('**/api/ask',route=>route.fulfill({status:504,contentType:'application/json',body:JSON.stringify({error:'验证用：问答连接超时，问题保留。'})}));
  await page.locator('#ask-input').fill('夏季风为什么能带来降雨？');await page.locator('#ask-send').click();
  await page.waitForSelector('.chat-bubble.error');
  if(await page.locator('#ask-input').inputValue()!=='夏季风为什么能带来降雨？')throw new Error('question lost on failure');
  await page.unroute('**/api/ask');await page.locator('#clear-chat').click();
  await page.locator('#ask-input').fill('为什么夏季风能带来降雨？它能不能同样影响中国所有地方？请简短解释。');
  await page.locator('#ask-send').click();
  await page.waitForSelector('.chat-links',{timeout:60000});
  const answer=await page.locator('.chat-bubble:not(.user)').innerText();
  if(!answer.includes('水汽')||!answer.includes('gemini'))throw new Error('missing grounded response/model attribution');
  const questionCleared=await page.locator('#ask-input').inputValue()==='';
  await page.screenshot({path:'evidence/live-ai-classroom.png',fullPage:true});
  const relatedCount=await page.locator('.chat-links button').count();
  await page.locator('.chat-links button').first().click();
  if(await page.locator('#tab-ask').getAttribute('aria-selected')!=='true')throw new Error('related jump loses chat tab');
  return {failureKeepsQuestion:true,questionCleared,relatedCount,realAnswer:answer,errors};
}
