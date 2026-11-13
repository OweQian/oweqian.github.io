/* One king crab in a projected three-dimensional ground plane. The photographic
 * front shell bends with the torso mesh; six articulated, textured legs plant
 * independently in world space. Anatomy: fisheries.noaa.gov/species/red-king-crab. */
(() => {
  'use strict';
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const smooth=(v)=>{const t=clamp(v,0,1);return t*t*(3-2*t);};
  const TAU=Math.PI*2, STANCE=0.67, STRIDE=13, UPPER=32, LOWER=32;
  const routePoints=[[.62,.23],[.91,.68],[.56,.37],[.12,.83],[.28,.52],[.73,.89],[.85,.18],[.35,.63],[.10,.40]];
  const hypot=(v)=>Math.hypot(...v), sub=(a,b)=>a.map((v,i)=>v-b[i]);
  const unit=(v)=>{const d=hypot(v)||1;return v.map(n=>n/d);};
  const mix=(a,b,t)=>a.map((v,i)=>v+(b[i]-v)*t);
  const grainSamples=[[.32,.36],[.43,.28],[.55,.31],[.65,.37],[.35,.49],[.48,.43],[.58,.48],[.66,.52]];
  const prepareLiveMaterial=(imageData)=>{
    // Living red king crabs are mottled brown/purple under blue water. Suppress
    // saturated orange tissue without recoloring olive shell, pale mouth or eyes.
    // Both torso and limb grain use these pixels, not separate display filters.
    const pixels=imageData.data;
    for(let i=0;i<pixels.length;i+=4){
      if(!pixels[i+3])continue;
      const r=pixels[i],g=pixels[i+1],b=pixels[i+2],bright=Math.max(r,g,b),low=Math.min(r,g,b);
      const light=r*0.2126+g*0.7152+b*0.0722,saturation=bright?(bright-low)/bright:0;
      let warm=clamp(Math.min((r-g*1.12)/45,(r-b*1.08)/45),0,1);
      if(light>115&&saturation<0.38)warm*=0.12;
      if(bright<28)warm*=0.2;
      pixels[i]=Math.round(r+(light*0.90-r)*warm);
      pixels[i+1]=Math.round(g+(light*0.86-g)*warm);
      pixels[i+2]=Math.round(b+(light*0.97-b)*warm);
    }
    return imageData;
  };
  const opaqueShellOutline=({data,width,height})=>{
    const left=[],right=[],middle=Math.floor(width/2);
    const solid=(x,y)=>data[((y-2)*width+x)*4+3]>=250
      && data[(y*width+x)*4+3]>=250
      && data[((y+2)*width+x)*4+3]>=250;
    for(let y=2;y<height-2;y+=2){
      if(!solid(middle,y))continue;
      let lo=middle,hi=middle;
      while(lo>1&&solid(lo-1,y))lo--;
      while(hi<width-2&&solid(hi+1,y))hi++;
      if(hi-lo<8)continue;
      left.push([(lo+2)/width,y/height]);
      right.push([(hi-2)/width,y/height]);
    }
    return left.concat(right.reverse());
  };
  window.createOceanSeabed=(canvas,options={})=>{
    const context=canvas.getContext('2d',{alpha:true});
    let width=1,height=1,ratio=1,scale=1,baseScale=1,ground=1;
    let body=null,grain=null,shellOutline=[],ready=false,disposed=false,dark=true;
    let running=false,frame=0,lastTime=null,time=0,gait=0,walking=0;
    let center=[0,0],velocity=[0,0],goal=[0,0],yaw=0,lookYaw=0,routeIndex=0;
    let mode='walk',pause=0,legs=[],rootUV=null;
    let lift=0,flight=null,swimWait=5.8;
    let clawWave=null,clawWait=1.05,clawSide=-1,waveCount=0;
    let resolveReady,rejectReady;
    const readyPromise=new Promise((resolve,reject)=>{resolveReady=resolve;rejectReady=reject;});readyPromise.catch(()=>{});
    const bounds=()=>{
      const inset=Math.min(width*.42,67*baseScale+12);
      return {left:inset,right:width-inset,back:width<=680?-52:-88,front:width<=680?16:28};
    };
    const localSurface=(u,v)=>[(u-0.5)*40,34-v*30,5+v*8+(1-Math.pow(u*2-1,2))*5-Math.pow(1-v,2)*8];
    const toWorld=(point)=>{
      const c=Math.cos(yaw),s=Math.sin(yaw);
      return [center[0]+scale*(point[0]*c+point[2]*s),point[1]*scale,center[1]+scale*(-point[0]*s+point[2]*c)];
    };
    const toLocal=(point)=>{
      const c=Math.cos(yaw),s=Math.sin(yaw),x=(point[0]-center[0])/scale,z=(point[2]-center[1])/scale;
      return [x*c-z*s,point[1]/scale,x*s+z*c];
    };
    const project=(point)=>[point[0],ground+point[2]*0.42-point[1]*0.80];
    const screen=([x,y,z])=>project(toWorld([x,y+lift,z]));
    const neutral=(leg)=>[leg.side*(37+leg.index*5),0,leg.index===2?23:-15+leg.index*15];
    const heading=()=>Math.atan2(velocity[0],Math.abs(velocity[1])+11);
    const chooseGoal=()=>{
      const b=bounds();
      const [across,depth]=routePoints[routeIndex%routePoints.length];
      goal=[b.left+(b.right-b.left)*across,b.back+(b.front-b.back)*depth];
      routeIndex++;
    };
    const makeLegs=()=>{
      legs=[];
      for(const side of [-1,1])for(let index=0;index<3;index++){
        const offset=(index/3+(side>0?0.5:0))%1,cycle=(gait+offset)%1;
        const leg={side,index,offset,cycle,swinging:cycle>=STANCE,from:STANCE,stepLift:0,start:[0,0,0],target:[0,0,0],foot:[0,0,0]};
        const point=toWorld(neutral(leg));
        leg.foot=point.slice();leg.start=point.slice();leg.target=point.slice();legs.push(leg);
      }
    };
    const stop=()=>{running=false;if(frame)cancelAnimationFrame(frame);frame=0;lastTime=null;};
    const resize=(w,h,dpr=window.devicePixelRatio||1)=>{
      if(disposed)return;
      const oldWidth=width,oldCenter=center.slice(),oldScale=scale;
      width=Math.max(1,Number(w)||canvas.clientWidth||window.innerWidth||1);height=Math.max(1,Number(h)||canvas.clientHeight||window.innerHeight||1);
      ratio=clamp(Number(dpr)||1,1,1.5);baseScale=width<=680?Math.min(1.22,width/240):2;
      ground=height-(width<=680?43:58);scale=baseScale*(1+center[1]*0.0016);
      canvas.width=Math.round(width*ratio);canvas.height=Math.round(height*ratio);context?.setTransform(ratio,0,0,ratio,0,0);
      const initialX=width*(width>=1600?0.10:0.40);
      const b=bounds();center=[clamp(oldWidth<=1?initialX:center[0]*width/oldWidth,b.left,b.right),clamp(center[1],b.back,b.front)];
      if(!legs.length){chooseGoal();makeLegs();}
      else{
        const resizePoint=([x,y,z])=>[center[0]+(x-oldCenter[0])*scale/oldScale,y*scale/oldScale,center[1]+(z-oldCenter[1])*scale/oldScale];
        goal=[clamp(goal[0]*width/oldWidth,b.left,b.right),clamp(goal[1],b.back,b.front)];
        legs.forEach(leg=>{for(const key of ['foot','start','target'])leg[key]=resizePoint(leg[key]);});
        if(flight){
          // Rebase the remaining travel so a resize cannot put the crab off screen.
          flight.from=center.slice();
          flight.to=[clamp(flight.to[0]*width/oldWidth,b.left,b.right),clamp(flight.to[1],b.back,b.front)];
          flight.travelStart=flight.elapsed;
          flight.feet=flight.feet.map(resizePoint);
        }
      }
      draw();
    };
    const step=(dt)=>{
      time+=dt;
      advanceClaws(dt);
      if(flight){swimStep(dt);return;}
      let distance=Math.hypot(goal[0]-center[0],goal[1]-center[1]);
      if(mode==='walk'&&distance<3.5){mode='pause';pause=1.4+0.8*(1+Math.sin(routeIndex*2.3));lookYaw=yaw;}
      if(mode==='pause'){pause-=dt;if(pause<=0&&Math.hypot(...velocity)<0.15){chooseGoal();mode='walk';distance=Math.hypot(goal[0]-center[0],goal[1]-center[1]);}}
      const speed=(width<=680?13:26)*(0.94+0.06*Math.sin(time*0.62));
      const wanted=mode==='walk'?Math.min(speed,Math.sqrt(Math.max(0,distance)*14)):0;
      const tx=distance?(goal[0]-center[0])/distance*wanted:0,tz=distance?(goal[1]-center[1])/distance*wanted:0;
      const ease=1-Math.exp(-dt*3.1);velocity[0]+=(tx-velocity[0])*ease;velocity[1]+=(tz-velocity[1])*ease;
      const delta=[velocity[0]*dt,velocity[1]*dt];center[0]+=delta[0];center[1]+=delta[1];
      const moving=Math.hypot(...velocity);walking+=(clamp(moving/speed,0,1)-walking)*(1-Math.exp(-dt*7));
      const wantedYaw=mode==='walk'?clamp(heading()*0.51,-0.49,0.49):lookYaw*.65+.16*Math.sin(time*.74);
      yaw+=clamp((wantedYaw-yaw)*(1-Math.exp(-dt*2.2)),-dt*0.25,dt*0.25);
      scale=baseScale*(1+center[1]*0.0016);
      gait+=Math.hypot(...delta)/scale*STANCE/(STRIDE*.91);
      const walkDirection=moving>0.01?[velocity[0]/moving,velocity[1]/moving]:[1,0];
      legs.forEach(leg=>{
        let cycle=(gait+leg.offset)%1;
        const front=leg.index===2;
        const localFoot=toLocal(leg.foot),rest=neutral(leg);
        if((!front||mode==='walk')&&!leg.swinging&&Math.hypot(localFoot[0]-rest[0],localFoot[2]-rest[2])>STRIDE*1.10){leg.offset=(STANCE-gait%1+1)%1;cycle=STANCE;}
        if(front&&mode==='pause'&&leg.swinging&&cycle>=STANCE){
          // Complete the swing on its own clock while the body slows down.
          leg.offset=(leg.offset+Math.min(1-cycle+1e-6,dt*.55))%1;
          cycle=(gait+leg.offset)%1;
        }
        const swing=cycle>=STANCE&&(!front||mode==='walk'||leg.swinging);
        if(swing&&!leg.swinging){
          if(front){leg.offset=(STANCE-gait%1+1)%1;cycle=STANCE;leg.stepLift=walking;}
          leg.start=leg.foot.slice();leg.from=STANCE;
          const n=toWorld(rest),reach=STRIDE*scale*(front ? .53 : .68);
          leg.target=[n[0]+walkDirection[0]*reach,0,n[2]+walkDirection[1]*reach];
        }else if(!swing&&leg.swinging)leg.foot=leg.target.slice();
        leg.swinging=swing;
        if(swing){
          const f=clamp((cycle-leg.from)/(1-leg.from),0,1);
          leg.foot=mix(leg.start,leg.target,smooth(f));
          const stepHeight=front ? 4.5*leg.stepLift : (6.4+leg.index*.48)*walking;
          leg.foot[1]=Math.sin(Math.PI*f)*scale*stepHeight;
        }else leg.foot[1]=0;
        leg.cycle=cycle;
      });
      swimWait-=dt;
      if(swimWait<=0&&mode==='walk'&&moving>speed*.66&&distance>35)startSwim(distance);
    };
    const startSwim=(distance)=>{
      const b=bounds();
      const reach=Math.min(distance*.72,width<=680?53:116);
      const to=[
        clamp(center[0]+(goal[0]-center[0])/distance*reach,b.left,b.right),
        clamp(center[1]+(goal[1]-center[1])/distance*reach,b.back,b.front),
      ];
      const travel=Math.hypot(to[0]-center[0],to[1]-center[1]);
      const duration=width<=680?2.9:3.25;
      const entry=clamp(Math.hypot(...velocity)*duration/Math.max(1,travel),0,1.35);
      flight={from:center.slice(),to,feet:legs.map(leg=>leg.foot.slice()),elapsed:0,travelStart:0,duration,entry};
      mode='swim';
    };
    const swimStep=(dt)=>{
      const {from,to,feet,travelStart,duration,entry}=flight;
      flight.elapsed=Math.min(duration,flight.elapsed+dt);
      const t=flight.elapsed/duration;
      const travel=clamp((flight.elapsed-travelStart)/Math.max(1e-6,duration-travelStart),0,1);
      const previous=center;
      center=mix(from,to,smooth(travel)+entry*travel*(1-travel)**2);
      velocity=[(center[0]-previous[0])/dt,(center[1]-previous[1])/dt];
      const aim=clamp(Math.atan2(to[0]-from[0],Math.abs(to[1]-from[1])+20)*.53,-.60,.60);
      yaw+=(aim-yaw)*(1-Math.exp(-dt*2.4));
      scale=baseScale*(1+center[1]*.0016);
      const paddle=smooth(t/.24)*smooth((1-t)/.30);
      lift=Math.min(width<=680?42:53,height*.065/scale)*Math.sin(Math.PI*t)**1.24;
      legs.forEach((leg,index)=>{
        const [x,,z]=neutral(leg);
        const wave=t*TAU*3-leg.index*1.10+(leg.side>0?2.10:0);
        const destination=toWorld([
          x+leg.side*(6*Math.cos(wave)-5)*paddle,
          Math.max(0,lift+(6+4*Math.sin(wave))*paddle),
          z+(11*Math.sin(wave)+4)*paddle,
        ]);
        leg.foot=mix(feet[index],destination,smooth(t/.23));
      });
      if(t<1)return;
      // Land in a complete stance before walking picks up again.
      flight=null;lift=0;mode='walk';swimWait=15+4*Math.sin(routeIndex*1.7);
      walking=0;makeLegs();
    };
    const legJoints=(leg)=>{
      const uv=rootUV?.[leg.side<0?0:1]?.[leg.index]||[leg.side<0?0.19:0.81,0.43+leg.index*0.12];
      const front=leg.index===2,upper=front ? 26 : UPPER,lower=front ? 29 : LOWER;
      const root=localSurface(...uv),foot=toLocal(leg.foot);
      foot[1]-=lift;
      const toe=front ? [leg.side*3.1,-4.9,2.9] : [leg.side*4.2,-5.8,1.5];
      const ankle=sub(foot,toe);
      const delta=sub(ankle,root),distance=hypot(delta)||1,axis=unit(delta),reach=clamp(distance,Math.abs(upper-lower)+.1,upper+lower-.1);
      let end=ankle;
      if(reach!==distance){end=root.map((v,i)=>v+axis[i]*reach);toe.forEach((offset,i)=>{foot[i]=end[i]+offset;});}
      const along=(upper*upper-lower*lower+reach*reach)/(2*reach);
      const kneeHeight=Math.sqrt(Math.max(0,upper*upper-along*along));
      const preferred=[leg.side*.45,1,front ? .38 : -.12];
      const dot=preferred.reduce((n,v,i)=>n+v*axis[i],0),bend=unit(preferred.map((v,i)=>v-dot*axis[i]));
      const knee=root.map((v,i)=>v+axis[i]*along+bend[i]*kneeHeight);
      return [root,knee,end,foot];
    };
    const paintPlate=(seed,x,y,w,h,litY)=>{
      context.fillStyle=dark?'#66565e':'#76686e';context.fill();
      context.clip();
      context.globalAlpha=.72;
      const strip=seed%grainSamples.length;
      context.drawImage(grain,strip*32,0,32,24,x,y,w,h);
      context.globalAlpha=1;
      // Shading remains inside the plate and follows the upper lit edge.
      const shade=context.createLinearGradient(0,litY,0,-litY);
      shade.addColorStop(0,'rgba(185,166,151,.27)');
      shade.addColorStop(.30,'rgba(185,166,151,.04)');
      shade.addColorStop(.63,'rgba(43,30,40,.13)');
      shade.addColorStop(1,'rgba(27,22,35,.44)');
      context.fillStyle=shade;context.fillRect(x,y,w,h);
    };
    const limb=(a,b,wide,narrow,seed)=>{
      const p=screen(a),q=screen(b),dx=q[0]-p[0],dy=q[1]-p[1],length=Math.hypot(dx,dy)||1;
      context.save();context.translate(p[0],p[1]);context.rotate(Math.atan2(dy,dx));
      const w=wide*scale,n=narrow*scale,join=Math.min(w*.78,length*.24);
      const spikes=wide>2?4:wide>1.25?3:1;
      const outline=(side)=>{
        for(let i=0;i<spikes;i++){
          const index=side<0?i:spikes-i-1;
          const variation=((seed*13+index*17+(side+1)*3)%11)/10;
          const t=(index+.50+(variation-.50)*.40)/spikes;
          const x=length*(.12+.76*t),r=w+(n-w)*t;
          const spread=Math.min(scale*.85,length/(spikes*4));
          const spike=(.28+.61*variation)*Math.min(scale,w*.72);
          context.lineTo(x+side*spread,side*r);
          context.lineTo(x+spread*.26,side*(r+spike));
          context.lineTo(x-side*spread,side*r);
        }
      };
      // The adjacent plates overlap around the joint, with a single profile
      // continuing through the bend instead of a circular cap on each bone.
      context.beginPath();context.moveTo(-join,w*.52);
      context.quadraticCurveTo(-join,-w*.85,0,-w);
      outline(-1);
      context.lineTo(length,-n);context.quadraticCurveTo(length+n*.55,0,length,n);
      outline(1);
      context.quadraticCurveTo(-join,w,-join,w*.52);context.closePath();
      paintPlate(seed,-join,-w*1.4,length+join+n,w*2.8,dx<0?w:-w);
      context.restore();
    };
    const drawLeg=(leg)=>{
      const p=legJoints(leg),seed=leg.index*3+(leg.side<0?0:5);
      limb(p[0],p[1],2.6-leg.index*.1,1.9,seed);
      limb(p[1],p[2],1.9,.9,seed+1);
      limb(p[2],p[3],.9,.18,seed+2);
    };
    const triangle=(uv,points)=>{
      const [u0,u1,u2]=uv,[p0,p1,p2]=points,den=u0[0]*(u1[1]-u2[1])+u1[0]*(u2[1]-u0[1])+u2[0]*(u0[1]-u1[1]);if(!den)return;
      const aff=(k)=>[(p0[k]*(u1[1]-u2[1])+p1[k]*(u2[1]-u0[1])+p2[k]*(u0[1]-u1[1]))/den,(p0[k]*(u2[0]-u1[0])+p1[k]*(u0[0]-u2[0])+p2[k]*(u1[0]-u0[0]))/den,(p0[k]*(u1[0]*u2[1]-u2[0]*u1[1])+p1[k]*(u2[0]*u0[1]-u0[0]*u2[1])+p2[k]*(u0[0]*u1[1]-u1[0]*u0[1]))/den];
      const a=aff(0),b=aff(1);
      const winding=Math.sign((p1[0]-p0[0])*(p2[1]-p0[1])-(p1[1]-p0[1])*(p2[0]-p0[0]));
      if(!winding)return;
      // Overlap each shared edge by one device pixel. The texture still
      // defines the outer silhouette; the clip edges must not reveal sand.
      const outward=points.map((p,i)=>{
        const q=points[(i+1)%3],dx=q[0]-p[0],dy=q[1]-p[1],d=Math.hypot(dx,dy);
        return [winding*dy/d,-winding*dx/d];
      });
      context.save();context.beginPath();
      points.forEach((p,i)=>{
        const before=outward[(i+2)%3],after=outward[i];
        const expand=1/(ratio*(1+before[0]*after[0]+before[1]*after[1]));
        context[i?'lineTo':'moveTo'](p[0]+(before[0]+after[0])*expand,p[1]+(before[1]+after[1])*expand);
      });
      context.closePath();context.clip();context.transform(a[0],b[0],a[1],b[1],a[2],b[2]);context.drawImage(body,0,0);context.restore();
    };
    const drawShell=()=>{
      // Continuous opaque tissue below the textured mesh covers any
      // subpixel seams. The source cutout still defines spikes and gaps.
      if(shellOutline.length){
        context.beginPath();
        shellOutline.forEach(([u,v],index)=>{
          context[index?'lineTo':'moveTo'](...screen(localSurface(u,v)));
        });
        context.closePath();context.fillStyle='#574850';context.fill();
      }
      // Curved torso mesh changes perspective with yaw; it is not one rigid card.
      const cols=10,rows=8;
      for(let y=0;y<rows;y++)for(let x=0;x<cols;x++){
        const uv=[[x/cols,y/rows],[(x+1)/cols,y/rows],[x/cols,(y+1)/rows],[(x+1)/cols,(y+1)/rows]];
        const points=uv.map(p=>screen(localSurface(...p))),pixels=uv.map(p=>[p[0]*body.width,p[1]*body.height]);
        triangle([pixels[0],pixels[1],pixels[2]],[points[0],points[1],points[2]]);triangle([pixels[2],pixels[1],pixels[3]],[points[2],points[1],points[3]]);
      }
    };
    const advanceClaws=(dt)=>{
      if(clawWave){
        clawWave.elapsed+=dt;
        if(clawWave.elapsed>=clawWave.duration){
          clawWave=null;
          clawWait=4.8+1.9*(.5+.5*Math.sin(waveCount*2.3));
        }
      }else if(!flight){
        clawWait-=dt;
        if(clawWait<=0){
          clawWave={side:clawSide,elapsed:0,duration:3.25+.48*Math.sin(waveCount*1.71),strength:1+.16*Math.sin(waveCount*1.48)};
          clawSide*=-1;
          waveCount++;
        }
      }
    };
    const clawSegment=([x,y,z],side,length,sweep,elevation)=>{
      const horizontal=length*Math.cos(elevation);
      return [x+side*horizontal*Math.sin(sweep),y+length*Math.sin(elevation),z+horizontal*Math.cos(sweep)];
    };
    const clawPose=(side)=>{
      const idle=Math.sin(time*.62+side*1.7);
      const phase=clawWave?clawWave.elapsed/clawWave.duration:0;
      const raised=smooth(phase/.27)*smooth((1-phase)/.32);
      const active=clawWave?.side===side;
      const strength=clawWave?clawWave.strength:0;
      const reach=raised*strength*(active?1:.19);
      const wave=Math.sin((phase-.24)*TAU*2.1);
      const pinch=smooth((phase-.14)/.15)*smooth((.83-phase)/.20)
        *(.52+.48*Math.sin((phase-.23)*TAU*1.62));
      const root=localSurface(side<0 ? .24 : .76,.77);
      // Each rigid segment pivots from the end of the one before it.
      const elbow=clawSegment(root,side,9.5,.76+reach*(.28+.12*wave),-.04+.044*idle+.78*reach);
      const wrist=clawSegment(elbow,side,8.5,.48+reach*(.37+.27*wave),-.37+.05*idle+reach*(1.28+.15*wave));
      const tip=clawSegment(wrist,side,11.6,.56+reach*(.39+.41*wave),-.24+.06*idle+reach*(.97-.19*wave));
      return {side,seed:side<0?2:6,root,elbow,wrist,tip,opening:.04*(1+idle)+pinch*(active ? .96 : .20)};
    };
    const drawPincer=({side,seed,wrist,tip,opening})=>{
      const p=screen(wrist),q=screen(tip),dx=q[0]-p[0],dy=q[1]-p[1];
      const length=Math.hypot(dx,dy)||1;
      const width=(side<0?3.9:3.1)*scale;
      const handedness=-side;
      const hinge=[length*.56,width*.30];
      const angle=opening*.88,c=Math.cos(angle),s=Math.sin(angle);
      const finger=(x,y)=>[hinge[0]+x*c-y*s,hinge[1]+x*s+y*c];
      context.save();context.translate(...p);context.rotate(Math.atan2(dy,dx));context.scale(1,handedness);
      // The lower finger pivots at its knuckle. The upper finger and palm
      // keep their shape throughout the open-close movement.
      context.beginPath();context.moveTo(-width*.46,-width*.43);
      context.quadraticCurveTo(length*.16,-width*1.08,length*.46,-width*.88);
      context.quadraticCurveTo(length*.81,-width*.77,length,-width*.38);
      context.quadraticCurveTo(length*.79,-width*.27,length*.57,-width*.12);
      context.quadraticCurveTo(length*.50,width*.01,...finger(0,-width*.13));
      context.quadraticCurveTo(...finger(length*.19,-width*.16),...finger(length*.40,-width*.52));
      context.quadraticCurveTo(...finger(length*.30,width*.44),...finger(-length*.04,width*.56));
      context.quadraticCurveTo(length*.14,width*.80,-width*.46,width*.43);
      context.closePath();
      paintPlate(seed+2,-width*.50,-width*1.10,length+width*1.5,Math.max(width*2.20,length*.48+width*1.40),width);
      context.restore();
    };
    const drawClaw=(claw)=>{
      const {root,elbow,wrist,seed}=claw;
      // Keep the narrow joint tissue beneath the plates through a sharp bend.
      // The full claw is in front of the lower shell, including its base.
      context.save();
      context.beginPath();
      context.moveTo(...screen(root));
      context.lineTo(...screen(elbow));
      context.lineTo(...screen(wrist));
      context.lineWidth=2.8*scale;
      context.lineCap='round';
      context.lineJoin='round';
      context.strokeStyle=dark?'#51414c':'#6a5961';
      context.stroke();
      context.beginPath();
      context.moveTo(...screen(wrist));
      context.lineTo(...screen(mix(wrist,claw.tip,.29)));
      context.lineWidth=2.3*scale;
      context.stroke();
      context.restore();
      limb(root,elbow,2.5,1.9,seed);
      limb(elbow,wrist,1.9,1.45,seed+1);
      drawPincer(claw);
    };
    const groundShadow=(point,radius,opacity)=>{
      const p=project([point[0],0,point[2]]);context.save();context.translate(p[0],p[1]);context.scale(1,0.17);
      const gradient=context.createRadialGradient(0,0,0,0,0,radius);
      gradient.addColorStop(0,`rgba(4,15,21,${opacity})`);
      gradient.addColorStop(.45,`rgba(4,15,21,${opacity*.54})`);
      gradient.addColorStop(1,'rgba(4,15,21,0)');
      context.fillStyle=gradient;context.fillRect(-radius,-radius,radius*2,radius*2);context.restore();
    };
    function draw(){
      if(!context||disposed)return;context.clearRect(0,0,width,height);if(!ready||!body)return;
      context.save();groundShadow([center[0],0,center[1]],(59+lift*.28)*scale,(dark ? .29 : .21)/(1+lift*.020));
      // Contact shadows have their own opacity. Crab surfaces use full coverage.
      context.globalAlpha=1;
      legs.slice().sort((a,b)=>toWorld(neutral(a))[2]-toWorld(neutral(b))[2]).forEach(drawLeg);
      drawShell();
      const claws=[clawPose(-1),clawPose(1)];
      claws.sort((a,b)=>toWorld(a.wrist)[2]-toWorld(b.wrist)[2]).forEach(drawClaw);
      context.restore();
    }
    const tick=(now)=>{frame=0;if(!running||disposed||!ready)return;const dt=lastTime===null?0:clamp((now-lastTime)/1000,0,1/30);lastTime=now;if(dt)step(dt);draw();frame=requestAnimationFrame(tick);};
    const start=()=>{if(disposed)return;running=true;lastTime=null;if(ready&&!frame)frame=requestAnimationFrame(tick);};
    const setTheme=(value)=>{dark=Boolean(value);if(!running)draw();};
    const destroy=()=>{if(disposed)return;stop();disposed=true;body=null;grain=null;shellOutline=[];legs=[];context?.clearRect(0,0,width,height);};
    const fail=(error)=>{stop();const issue=error instanceof Error?error:new Error(String(error));options.onError?.(issue);rejectReady(issue);};
    const api={ready:readyPromise,start,stop,resize,setTheme,renderOnce:draw,destroy};
    resize(canvas.clientWidth||window.innerWidth,canvas.clientHeight||window.innerHeight);
    if(!context){fail(new Error('The seabed needs a 2D canvas.'));return api;}
    if(typeof options.bodyURL!=='string'||!options.bodyURL){fail(new Error('The king crab needs its local front texture.'));return api;}
    const image=new Image();
    image.onload=()=>{
      if(disposed)return;
      try{
        const source=document.createElement('canvas');source.width=image.naturalWidth;source.height=image.naturalHeight;
        const ctx=source.getContext('2d',{willReadFrequently:true});ctx.drawImage(image,0,0);
        const prepared=prepareLiveMaterial(ctx.getImageData(0,0,source.width,source.height));
        const rgba=prepared.data;
        // The source shell is mostly near-opaque. Keep the soft contour and
        // empty cutout while making its solid tissue fully cover the sand.
        for(let i=0;i<rgba.length;i+=4){
          if(rgba[i+3]>=244)rgba[i+3]=255;
          if(!rgba[i+3])continue;
          // Separate the living shell from the gray-blue stones without
          // changing its markings or making the pale mouth and eyes glow.
          const light=0.2126*rgba[i]+0.7152*rgba[i+1]+0.0722*rgba[i+2];
          const lift=smooth((light-22)/70)*(1-smooth((light-135)/85));
          rgba[i]+=12*lift;rgba[i+1]+=6*lift;rgba[i+2]+=10*lift;
        }
        ctx.putImageData(prepared,0,0);
        let minX=source.width,minY=source.height,maxX=-1,maxY=-1;
        for(let py=0;py<source.height;py+=2)for(let px=0;px<source.width;px+=2){if(rgba[(py*source.width+px)*4+3]<=24)continue;minX=Math.min(minX,px);minY=Math.min(minY,py);maxX=Math.max(maxX,px);maxY=Math.max(maxY,py);}
        if(maxX<minX)throw new Error('The king crab texture is empty.');
        const crop={x:Math.max(0,minX-2),y:Math.max(0,minY-2),w:Math.min(source.width,maxX+3)-Math.max(0,minX-2),h:Math.min(source.height,maxY+3)-Math.max(0,minY-2)};
        rootUV=[-1,1].map(side=>[0,1,2].map(index=>{const v=0.43+index*0.12,py=Math.round(crop.y+v*crop.h);let u=side<0?0.22:0.78;for(let step=0;step<34;step++){const candidate=side<0?0.10+step*.01:0.90-step*.01,px=Math.round(crop.x+candidate*crop.w);let alpha=255;for(let oy=-1;oy<=1;oy++)for(let ox=-1;ox<=1;ox++){const cx=clamp(px+ox,0,source.width-1),cy=clamp(py+oy,0,source.height-1);alpha=Math.min(alpha,rgba[(cy*source.width+cx)*4+3]);}if(alpha>=180){u=candidate-side*.035;break;}}return[u,v];}));
        body=document.createElement('canvas');body.width=256;body.height=Math.round(256*crop.h/crop.w);
        const bodyContext=body.getContext('2d',{willReadFrequently:true});
        bodyContext.drawImage(source,crop.x,crop.y,crop.w,crop.h,0,0,body.width,body.height);
        shellOutline=opaqueShellOutline(bodyContext.getImageData(0,0,body.width,body.height));
        grain=document.createElement('canvas');grain.width=grainSamples.length*32;grain.height=24;
        const grainContext=grain.getContext('2d');
        grainContext.fillStyle='#66565e';grainContext.fillRect(0,0,grain.width,grain.height);
        grainSamples.forEach(([u,v],index)=>{
          grainContext.drawImage(source,crop.x+crop.w*u,crop.y+crop.h*v,crop.w*.13,crop.h*.13,index*32,0,32,24);
        });
        ready=true;draw();resolveReady(api);if(running&&!frame)frame=requestAnimationFrame(tick);
      }catch(error){fail(error);}
    };
    image.onerror=()=>{if(!disposed)fail(new Error('The local king crab texture could not load.'));};image.src=options.bodyURL;
    return api;
  };
})();
