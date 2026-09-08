// Developer-only checks; not needed by the single-file game.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync(require('node:path').join(__dirname,'../index.html'),'utf8');
const script=html.match(/<script>([\s\S]*?)<\/script>/)[1];new Function(script);
assert(!/<script\b[^>]*\bsrc\s*=/i.test(html),'no external script dependency');
assert(!/<link\b[^>]*rel=["']stylesheet["']/i.test(html),'no external stylesheet dependency');
const context=vm.createContext({console,Float32Array,Uint8Array,Math});
const start=script.indexOf('function vehicleSteerLimit'),end=script.indexOf('function createCylinderXMesh',start);
vm.runInContext('const DEG=Math.PI/180;const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));const lerp=(a,b,t)=>a+(b-a)*t;'+script.slice(start,end),context);
function run(speed,steer,hand=false,load=6474.6){context.s={speed,yaw:0,yawRate:0,lateralSpeed:0};vm.runInContext(`for(let i=0;i<1200;i++)stepTyres(s,1/120,${steer},0,${load},${load},.98,${hand},2.36)`,context);return context.s;}
assert.equal(run(20,0).yaw,0);const turn=run(15,.045);assert(turn.yaw>0&&Number.isFinite(turn.lateralSpeed));assert.equal(run(20,.2,false,0).yaw,0);
console.log('PASS syntax, straight-line, steering response, airborne grip');
context.s={speed:20,yaw:0,yawRate:0,lateralSpeed:0};
vm.runInContext('for(let i=0;i<60;i++)stepTyres(s,1/120,.08,-16.5,6474.6,6474.6,.98,false,2.36)',context);
assert(context.s.speed<20&&context.s.yaw>.001,'braking must retain steering authority');
console.log('PASS combined braking and cornering');
// Exercise actual suspension and Vehicle.update on controlled road surfaces, without GPU.
const vstart=script.indexOf('class Vehicle{'),vend=script.indexOf('// 10. Autopilot',vstart);
vm.runInContext('const expLerp=(a,b,k,dt)=>lerp(a,b,1-Math.exp(-k*dt));const smoothstep=(a,b,v)=>{const t=clamp((v-a)/(b-a),0,1);return t*t*(3-2*t)};const TAU=Math.PI*2;'+script.slice(vstart,vend)+';globalThis.Vehicle=Vehicle;',context);
const v=Object.create(context.Vehicle.prototype);Object.assign(v,{x:0,y:.50,z:0,yaw:0,speed:0,pitch:0,roll:0,heaveVel:0,pitchVel:0,rollVel:0,wheelTrack:.78,wheelRadius:.41,style:{frontZ:1.18,rearZ:-1.18},accelVisual:0});
for(const key of ['wheelGround','wheelWorldX','wheelWorldZ','wheelCenterY','wheelLoad','wheelContact','wheelYOffset','wheelCompression'])v[key]=new Float32Array(4);
let ground=0;v.world={nearestRoad:()=>({}),surfaceHeight:()=>ground};
for(let i=0;i<1200;i++)v.updateWheelContact(1/120,0,0);
assert(Math.abs(v.y-.5)<.015);assert(Math.abs(v.heaveVel)<.001);assert(Math.abs(v.wheelLoad.reduce((a,b)=>a+b,0)-1320*9.81)<2);
ground=-2;v.updateWheelContact(1/120,0,0);assert(v.wheelContact.every(n=>n===0));assert(v.heaveVel<0);assert(v.y>.45);
for(let i=0;i<600;i++)v.updateWheelContact(1/120,0,0);assert(Math.abs(v.y+1.5)<.02);
console.log('PASS suspension equilibrium, crest free-fall, landing settle');
Object.assign(v,{y:.5,speed:0,lateralSpeed:0,yawRate:0,currentSteer:0,slipAngle:0,moveYaw:0,odometer:0,brakeLight:0,wheelSpin:0,stuckTimer:0});ground=0;
v.world.settings={speedAccelFade:true,acceleration:1,offroadDrag:true,highSpeedSteer:true,steering:1,grip:1,onePedal:0,noCollision:true};
v.world.nearestRoad=()=>({roadDist:0});v.world.updateStreaming=()=>{};v.world.speedReference=()=>83;v.world.maxRoadSpeed=()=>83;
v.updateGroundEffects=()=>{};const input={down:()=>false,take:()=>false};
function drive(seconds,controls){for(let i=0;i<seconds*120;i++){v.update(1/120,input,false,controls);for(const key of ['speed','yaw','lateralSpeed','yawRate','y','pitch','roll'])assert(Number.isFinite(v[key]),key);}}
drive(8,{throttle:1});assert(v.speed>15&&v.speed<50);const initial=v.speed;
drive(4,{brake:1});assert(v.speed<initial&&v.speed>=0);
drive(3,{throttle:1});drive(3,{throttle:.4,steer:.5});assert(Math.abs(v.yawRate)>.005);
drive(2,{throttle:0,steer:.5,handbrake:true});drive(5,{throttle:0,steer:0});
console.log('PASS full Vehicle.update acceleration, braking, cornering, handbrake and finite state');
v.speed=0;v.lateralSpeed=0;v.yawRate=0;drive(2,{brake:1});assert(v.speed<0);
drive(4,{throttle:1});assert(v.speed>0);
console.log('PASS reverse and forward recovery; inline runtime dependency checks');
