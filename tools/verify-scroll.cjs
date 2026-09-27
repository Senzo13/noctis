/* Actual wheel, pin-release and fallback checks. Requires tools/serve.py on 5180. */
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const base = process.argv[2] || 'http://127.0.0.1:5180';
const out = path.join(__dirname, '_shots', 'scroll');
async function jump(page, y) {
  await page.evaluate(y => {
    window.__noctisLenis ? window.__noctisLenis.scrollTo(y, { immediate: true }) : window.scrollTo({ top: y, behavior: 'instant' });
    window.ScrollTrigger?.update();
  }, y);
  await page.waitForTimeout(900);
}
async function state(page, id) {
  return page.evaluate(id => {
    const section = document.getElementById(id), rail = section.querySelector('[data-carousel-rail],.rail');
    const trigger = window.ScrollTrigger?.getById('horizontal-' + id);
    const last = rail.lastElementChild.getBoundingClientRect();
    return { start: trigger?.start, end: trigger?.end, progress: trigger?.progress, x: Number(window.gsap?.getProperty(rail,'x') || 0), top: section.getBoundingClientRect().top, last: { left:last.left,right:last.right,bottom:last.bottom }, width:innerWidth, height:innerHeight, y:scrollY, overflow:document.documentElement.scrollWidth-innerWidth, controls:section.querySelector('[data-carousel-count]').textContent };
  }, id);
}
(async () => {
  fs.mkdirSync(out,{recursive:true});
  const browser = await chromium.launch({executablePath:process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe'});
  try {
    for (const [width,height] of [[1440,900],[1366,768]]) {
      const page=await browser.newPage({viewport:{width,height}}), errors=[];
      page.on('pageerror', e=>errors.push(e.message));
      await page.goto(base+'/?intro=0');
      await page.waitForFunction(()=>window.ScrollTrigger?.getById('horizontal-atelier') && window.ScrollTrigger?.getById('horizontal-collection'));
      await page.waitForTimeout(1200);
      for (const id of ['atelier','collection']) {
        const initial=await state(page,id); assert.ok(initial.end>initial.start, `${id}: pin exists`);
        await jump(page,initial.start+1);
        await page.screenshot({path:path.join(out,`${id}-${width}-start.png`)});
        const title = await page.locator('#'+id+' .display-offset').boundingBox();
        assert.ok(title.x>=-1 && title.y>=0 && title.y+title.height<=height,`${id}: initial title fits`);
        await jump(page,initial.start+100);
        await page.mouse.move(width*.55,height*.5);
        const before=await state(page,id);
        await page.mouse.wheel(0,600); await page.waitForTimeout(1500);
        const forward=await state(page,id);
        assert.ok(forward.x<before.x-250,`${id}: wheel advances track ${JSON.stringify({before,forward})}`);
        assert.ok(Math.abs(forward.top)<2,`${id}: stage pinned`);
        await page.screenshot({path:path.join(out,`${id}-${width}-wheel.png`)});
        await page.mouse.wheel(0,-350); await page.waitForTimeout(1300);
        const reverse=await state(page,id); assert.ok(reverse.x>forward.x+100, `${id}: reverse wheel`);
        await page.locator('#'+id+' [data-carousel-next]').click(); await page.waitForTimeout(1500);
        const button=await state(page,id); assert.ok(button.y>reverse.y+100,`${id}: button drives vertical position`);
        await jump(page,initial.end-1);
        const end=await state(page,id);
        assert.ok(end.last.right<=width+1 && end.last.left>=-1, `${id}: final image fits ${JSON.stringify(end)}`);
        assert.ok(end.last.bottom<=height+1,`${id}: final card fits vertically`);
        assert.equal(end.overflow,0);
        await page.screenshot({path:path.join(out,`${id}-${width}-end.png`)});
        await page.mouse.wheel(0,600); await page.waitForTimeout(1500);
        const released=await state(page,id); assert.ok(released.top < -250, `${id}: exits pin`);
        console.log(width,id,JSON.stringify({before,forward,reverse,button,end,released}));
      }
      await page.setViewportSize({width:390,height:844}); await page.waitForTimeout(1500);
      assert.equal(await page.locator('.is-scroll-pinned').count(),0,'resize cleans pin classes');
      assert.equal(await page.locator('.horizontal-stage').count(),0,'resize restores original DOM');
      assert.equal(await page.locator('.craft-stories > .craft-story').count(),3);
      assert.equal(await page.locator('.pin-spacer').count(),0,'resize removes spacers');
      assert.deepEqual(errors,[]);
      await page.close();
    }
    for(const mode of ['mobile','reduce','nojs']) {
      const page=await browser.newPage({viewport:{width:mode==='mobile'?390:1440,height:844},hasTouch:mode==='mobile',reducedMotion:mode==='reduce'?'reduce':'no-preference',javaScriptEnabled:mode!=='nojs'});
      await page.goto(base+'/?intro=0'); await page.waitForTimeout(900);
      assert.equal(await page.locator('.is-scroll-pinned').count(),0,mode+' no pin');
      await page.locator('#atelier').scrollIntoViewIfNeeded();
      await page.screenshot({path:path.join(out,`${mode}-atelier.png`)});
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth),0,mode+' no page overflow');
      if(mode==='mobile') {
        const cards=await page.locator('.craft-story').evaluateAll(cards=>cards.map(c=>({x:c.getBoundingClientRect().x,y:c.getBoundingClientRect().y,width:c.getBoundingClientRect().width})));
        assert.ok(cards[1].y>cards[0].y+200 && cards[2].y>cards[1].y+200,'mobile vertically stacked gestures');
      }
      await page.close();
      console.log(mode+' fallback passed');
    }
  } finally { await browser.close(); }
})().catch(error=>{console.error(error);process.exit(1);});
