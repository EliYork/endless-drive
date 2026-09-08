const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const path=require('node:path'),assert=require('node:assert/strict');
const url='file:///'+path.resolve(__dirname,'../index.html').replaceAll('\\','/')+'#seed=73129';
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  const desktop=await browser.newPage({viewport:{width:900,height:600}});
  await desktop.addInitScript(()=>{Object.defineProperty(navigator,'maxTouchPoints',{get:()=>0});const native=window.matchMedia.bind(window);window.matchMedia=q=>q==='(any-pointer:coarse)'?{matches:false}:native(q);});
  await desktop.goto(url);assert.equal(await desktop.locator('body').evaluate(e=>e.classList.contains('mobile-mode')),false);
  await desktop.locator('#garageMobileStart').click();assert(await desktop.locator('#touchThrottle').isVisible());
  await desktop.setViewportSize({width:390,height:844});
  await desktop.screenshot({path:path.resolve(__dirname,'../screenshots/mobile-forced-portrait.png')});
  assert.equal(await desktop.locator('#ui').evaluate(e=>Math.round(e.getBoundingClientRect().width)),390);
  await desktop.reload();assert(await desktop.locator('body').evaluate(e=>e.classList.contains('mobile-mode')));
  await desktop.close();
  const page=await browser.newPage({viewport:{width:844,height:390},hasTouch:true,isMobile:true,deviceScaleFactor:1});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(url);assert(await page.locator('body').evaluate(e=>e.classList.contains('mobile-mode')));
  await page.locator('#garageMobileStart').tap();
  await page.evaluate(()=>{game.paused=true;});
  const cdp=await page.context().newCDPSession(page);
  const pt=async(selector,id)=>{const b=await page.locator(selector).boundingBox();return {x:b.x+b.width/2,y:b.y+b.height/2,id,radiusX:5,radiusY:5};};
  const throttle=await pt('#touchThrottle',1),left=await pt('#touchSteering [data-key="ArrowLeft"]',2);
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[throttle]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[throttle,left]});
  assert.deepEqual((await page.evaluate(()=>[...game.input.virtualKeys])).sort(),['ArrowLeft','ArrowUp']);
  const steering=await page.evaluate(()=>{
   game.vehicle.reset();game.vehicle.speed=10;
   for(let i=0;i<48;i++)game.vehicle.update(1/120,game.input,false,null);
   return {steer:game.vehicle.currentSteer,throttle:game.vehicle.audioThrottle,yaw:game.vehicle.yawRate};
  });
  assert(steering.throttle===1&&steering.steer>.1&&Math.abs(steering.yaw)>.1);
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[left]});
  assert.deepEqual(await page.evaluate(()=>[...game.input.virtualKeys]),['ArrowUp']);
  await cdp.send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]});
  assert.equal(await page.evaluate(()=>game.input.virtualKeys.size),0);
  // Two fingers on the same pedal: releasing one must not release the other.
  const other={...throttle,id:3,x:throttle.x+8};
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[throttle]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[throttle,other]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[throttle]});
  assert.deepEqual(await page.evaluate(()=>[...game.input.virtualKeys]),['ArrowUp']);
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  await page.evaluate(()=>{game.paused=false;game.vehicle.reset();});
  await page.waitForTimeout(450);
  await page.screenshot({path:path.resolve(__dirname,'../screenshots/mobile-controls.png')});
  await page.locator('#menuBtn').tap();
  await page.waitForTimeout(350);
  const hit=await page.evaluate(()=>{
   const menu=document.querySelector('#controlMenu'),a=menu.getBoundingClientRect(),b=document.querySelector('#touchThrottle').getBoundingClientRect();
   const x=(Math.max(a.left,b.left)+Math.min(a.right,b.right))/2,y=(Math.max(a.top,b.top)+Math.min(a.bottom,b.bottom))/2;
   return {overlap:a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top,menuHit:!!document.elementFromPoint(x,y)?.closest('#controlMenu')};
  });
  assert(hit.overlap&&hit.menuHit,'menu must receive touch in the overlapping pedal area');
  await page.screenshot({path:path.resolve(__dirname,'../screenshots/mobile-menu-layer.png')});
  assert.deepEqual(errors,[]);console.log('PASS forced/mobile detection, portrait size, persistence, multi-touch steering, independent release/cancel',steering);
 }finally{await browser.close();}
})();
