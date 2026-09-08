// Long, deterministic terrain regression; game runtime remains a single HTML file.
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const path=require('node:path');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});let failed=false;
 try{
  const page=await browser.newPage();
  await page.goto('file:///'+path.resolve(__dirname,'../index.html').replaceAll('\\','/')+'#seed=1');
  for(const seed of [1,2,3,42,73129]){
   const result=await page.evaluate(seed=>{
    game.paused=true;game.rebuildWorldForSeed(seed);game.vehicle.reset();game.autopilot.setEnabled(true,game.vehicle);
    let maxOffset=0,minSpeed=Infinity,maxSpeed=0,trace=[];
    for(let i=0;i<14400;i++){
     const v=game.vehicle,a=game.autopilot,c=a.control(1/60,v);
     if(c.reset)return {seed,failed:'unexpected reset',time:i/60};
     v.update(1/60,{down:()=>false,take:()=>false},false,c);
     game.world.maybeShiftOrigin(v,game.camera);
     const n=game.world.nearestRoad(v.x,v.z);maxOffset=Math.max(maxOffset,n.roadDist);maxSpeed=Math.max(maxSpeed,v.speed*3.6);
     if(i>600)minSpeed=Math.min(minSpeed,v.speed*3.6);
     if(i%30===0){trace.push({t:i/60,s:n.s,offset:n.roadDist,speed:v.speed*3.6,target:a.targetSpeed*3.6,brake:c.brake,load:Array.from(v.wheelLoad)});if(trace.length>6)trace.shift();}
     if(!Number.isFinite(v.y+v.yaw+v.speed)||n.roadDist>2.6)return {seed,failed:'corridor exceeded or nonfinite',maxOffset,trace};
    }
    return {seed,maxOffset,minSpeed,maxSpeed,passed:true};
   },seed);
   console.log(JSON.stringify(result));if(!result.passed)failed=true;
  }
 }finally{await browser.close();}
 if(failed)process.exitCode=1;
})();
