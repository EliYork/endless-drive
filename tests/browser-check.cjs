const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const path=require('node:path');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 const page=await browser.newPage({viewport:{width:1280,height:800}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto('file:///'+path.resolve(__dirname,'../index.html').replaceAll('\\','/')+'#seed=73129');
 await page.waitForTimeout(1800);
 await page.screenshot({path:path.resolve(__dirname,'../screenshots/vehicle-rework-garage.png')});
 await page.keyboard.press('Space');await page.keyboard.down('w');await page.waitForTimeout(2200);await page.keyboard.up('w');
 await page.keyboard.down('a');await page.waitForTimeout(600);await page.keyboard.up('a');
 await page.screenshot({path:path.resolve(__dirname,'../screenshots/vehicle-rework-driving.png')});
 await page.keyboard.press('r');await page.keyboard.press('g');await page.waitForTimeout(3000);
 await page.keyboard.press('F2');
 await page.waitForTimeout(12000);
 await page.screenshot({path:path.resolve(__dirname,'../screenshots/vehicle-rework-autopilot.png')});
 const stability=await page.evaluate(()=>{
   const results=[];game.paused=true;
   for(const scenario of [{seed:73129,wet:0},{seed:42,wet:1}])for(const style of [0,1,2,3]){
     game.rebuildWorldForSeed(scenario.seed);game.world.rainAmount=scenario.wet;game.vehicle.setStyle(style);game.vehicle.setPaint(style);game.vehicle.reset();game.autopilot.setEnabled(true,game.vehicle);
     let maxOffset=0,worst=null,firstDeparture=null;
     for(let i=0;i<7200;i++){
       const controls=game.autopilot.control(1/120,game.vehicle);
       if(controls.reset)game.vehicle.reset(game.autopilot.routeDir);
       game.vehicle.update(1/120,{down:()=>false,take:()=>false},false,controls);
       const n=game.world.nearestRoad(game.vehicle.x,game.vehicle.z);
       if(!firstDeparture&&n.roadDist>2.32)firstDeparture={time:i/120,s:n.s,speed:game.vehicle.speed,yaw:game.vehicle.yaw,move:game.vehicle.moveYaw,steer:game.vehicle.currentSteer,control:controls,load:Array.from(game.vehicle.wheelLoad),target:game.autopilot.targetSpeed,predicted:game.autopilot.predictedMargin};
       if(n.roadDist>maxOffset){maxOffset=n.roadDist;worst={time:i/120,s:n.s,speed:game.vehicle.speed,state:game.autopilot.state,target:game.autopilot.targetSpeed,slip:game.vehicle.slipAngle,load:Array.from(game.vehicle.wheelLoad)};}
       if(!Number.isFinite(game.vehicle.y+game.vehicle.yaw+game.vehicle.speed))throw Error('nonfinite vehicle');
     }
     results.push({...scenario,style,maxOffset,speed:game.vehicle.speed,worst,firstDeparture});
   }
   return results;
 });
 const errorVisible=await page.locator('#error').isVisible();
 console.log(JSON.stringify({errors,errorVisible,stability,title:await page.title()}));
 await browser.close();if(errors.length||errorVisible||stability.some(r=>r.maxOffset>2.32))process.exitCode=1;
})();
