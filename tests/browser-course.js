async page => {
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.setViewportSize({width:1500,height:980});await page.emulateMedia({reducedMotion:'reduce'});
  await page.goto('http://127.0.0.1:8767/');await page.waitForFunction(()=>window.geographyApp);
  const baseline=await page.evaluate(()=>localStorage.getItem('china-geography-8a-v1'));
  const nodes=await page.evaluate(()=>geographyApp.getCourse().nodes.map(n=>({id:n.id,title:n.title,interaction:n.interaction.answer,quiz:n.quiz.answer,related:n.related})));
  let steps=0,passed=0;
  try {
    for(const n of nodes){
      await page.evaluate(id=>geographyApp.selectNode(id),n.id);
      if(await page.locator('#lesson-title').innerText()!==n.title)throw new Error('title '+n.id);
      for(let s=0;s<3;s++){
        if((await page.locator('#step-text').innerText()).length<35)throw new Error('narration '+n.id);
        steps++;if(s<2)await page.locator('#step-next').click();
      }
      await page.locator('#interaction-options button').nth((n.interaction+1)%3).click();
      if(!(await page.locator('#interaction-feedback').innerText()).startsWith('再想一步'))throw new Error('wrong interaction '+n.id);
      await page.locator('#interaction-options button').nth(n.interaction).click();
      if(!(await page.locator('#interaction-feedback').innerText()).startsWith('理解正确'))throw new Error('right interaction '+n.id);
      await page.locator('#tab-quiz').click();
      await page.locator('#quiz-options button').nth((n.quiz+1)%3).click();
      if(!(await page.locator('#quiz-feedback').innerText()).includes('不够准确'))throw new Error('wrong quiz '+n.id);
      await page.locator('#quiz-options button').nth(n.quiz).click();
      if(!await page.evaluate(id=>geographyApp.getState().mastered.includes(id),n.id))throw new Error('mastery '+n.id);
      passed++;
    }
    await page.evaluate(()=>geographyApp.selectNode('location'));
    const relatedTitle=await page.locator('#related-nodes button').first().innerText();await page.locator('#related-nodes button').first().click();
    if(!relatedTitle.startsWith(await page.locator('#lesson-title').innerText()))throw new Error('related navigation');
    await page.locator('#coverage-open').click();
    const chips=await page.locator('#coverage-list button.mastered').count();if(chips!==nodes.length)throw new Error('coverage count');
    await page.locator('#coverage .dialog-close').click();
    return {nodes:passed,narrationSteps:steps,wrongAndRightExercises:passed*4,allMasteredChips:chips,relatedNavigation:true,errors};
  } finally {
    await page.evaluate(saved=>{if(saved===null)localStorage.removeItem('china-geography-8a-v1');else localStorage.setItem('china-geography-8a-v1',saved);},baseline);
    await page.reload();
  }
}
