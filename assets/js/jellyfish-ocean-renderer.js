/*
 * Continuous jellyfish swimming, adapted from:
 * Copyright © 2012–2020 Aleksandar Rodic, MIT License.
 * https://github.com/arodic/jellyfish — full notice in /ocean/LICENSE.txt.
 * Photographic bells, separate oral-arm ribbons and filament motion are project code;
 * the three transparent jellyfish materials are generated for this site.
 */
(() => {
  'use strict';
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const unit = (v) => { const l = Math.hypot(v[0], v[1], v[2]) || 1; return v.map((x) => x / l); };
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const angleBetween = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));
  const swimRate = (speciesIndex) => 2.12 - 0.16 * speciesIndex;
  const swimPhase = (speciesIndex, time) => swimRate(speciesIndex) * time + 1.73 * speciesIndex + 0.5;

  const vertexSource = `
    precision highp float;
    attribute vec2 aPosition, aUV, aRoot, aTail;
    attribute vec4 aMotion;
    uniform mat4 uProjection, uJoint0, uHistory1, uHistory2, uHistory3, uHistory4;
    uniform vec4 uShape;
    uniform vec2 uCurrent;
    uniform float uPhase, uBellEnd;
    uniform highp float uTime;
    varying mediump vec3 vWorld;
    varying mediump vec2 vUV, vTail;
    varying mediump float vKind, vFold;
    float contraction(float phase) {
      float beat = fract(phase / 6.2831853);
      return smoothstep(0.02, 0.30, beat) * (1.0 - smoothstep(0.30, 0.84, beat));
    }
    vec3 bellDeform(vec2 uv) {
      float side = uv.x - 0.5;
      float edge = smoothstep(0.08, 0.44, abs(side));
      float rim = smoothstep(uShape.z * 0.42, uBellEnd, uv.y);
      float stroke = contraction(uPhase - 0.34 * rim + 0.22 * side * uCurrent.x);
      float width = side * (1.0 - stroke * mix(0.025, 0.265 * uShape.w, rim));
      // The dome keeps its volume while the rim curls in and down.
      float drop = rim * mix(0.010, 0.081, edge) * stroke;
      float dome = (1.0 - rim) * 0.020 * stroke;
      float depth = (1.0 - 4.0 * side * side) * (0.030 + 0.025 * stroke);
      return vec3(width * uShape.x, (uShape.z - uv.y + dome - drop) * uShape.y, depth * uShape.y);
    }
    vec3 trailingPoint(vec2 position, float t, out float fold) {
      float height = uShape.y;
      vec3 p = bellDeform(position);
      float lag = 0.0;
      fold = 0.0;
      if (aMotion.w > 0.5) {
        vec3 base = vec3((position.x - 0.5) * uShape.x, (uShape.z - position.y) * height, 0.0);
        vec3 root = vec3((aRoot.x - 0.5) * uShape.x, (uShape.z - aRoot.y) * height, 0.0);
        // Root rows use the exact same xyz deformation as the cap, including skirt.
        p = mix(p, base + bellDeform(aRoot) - root, smoothstep(0.02, 0.15, t));
        float seed = aMotion.x;
        float frequency = aMotion.y;
        float released = smoothstep(0.05, 0.24, t);
        float softness = pow(t, 1.38) * released;
        float wave = uTime * frequency + seed - t * (4.0 + sin(seed) * 1.1);
        float ripple = uTime * frequency * 1.67 + seed * 2.13 - t * (8.5 + cos(seed));
        float wash = contraction(uPhase - 0.47 - t * (2.65 + 0.55 * cos(seed)));
        float sway = (sin(wave) + 0.30 * sin(ripple)) * aMotion.z;
        float spread = (aRoot.x - 0.5) * (0.15 - 0.24 * wash);
        p.x += height * (sway + spread + uCurrent.x * 0.042) * softness;
        p.y += height * (0.020 * sin(wave - 0.9) - 0.045 * wash * uCurrent.y) * softness;
        p.z += height * (0.036 * cos(wave) + 0.012 * sin(ripple)) * softness;
        if (aMotion.w < 1.5) {
          fold = sin(ripple) * released;
          p.z += height * 0.016 * aTail.y * fold;
        }
        lag = smoothstep(0.08, 1.0, t) * (3.25 + 0.62 * sin(seed));
      }
      vec4 point = vec4(p, 1.0);
      vec4 world;
      if (lag < 1.0) world = mix(uJoint0 * point, uHistory1 * point, lag);
      else if (lag < 2.0) world = mix(uHistory1 * point, uHistory2 * point, lag - 1.0);
      else if (lag < 3.0) world = mix(uHistory2 * point, uHistory3 * point, lag - 2.0);
      else world = mix(uHistory3 * point, uHistory4 * point, lag - 3.0);
      return world.xyz;
    }
    void main() {
      float t = aTail.x;
      float fold;
      vec3 world = trailingPoint(aPosition,t,fold);
      if (aMotion.w > 1.5) {
        // Keep each thin ribbon across its animated screen tangent. The
        // strand can curl sideways without turning edge-on and disappearing.
        float step = t < 0.98 ? 0.02 : -0.02;
        float ignoredFold;
        vec3 next = trailingPoint(aPosition + aUV * step,t + step,ignoredFold);
        vec2 tangent = (next.xy - world.xy) / step;
        vec2 perpendicular = vec2(-tangent.y,tangent.x) / max(length(tangent),0.001);
        float size = length(uJoint0[0].xyz) * uShape.y;
        float strandWidth = (0.0031 + 0.0008 * abs(sin(aMotion.x))) * size;
        float halfWidth = max(0.73,strandWidth * (1.0 - 0.50 * t));
        world.xy += perpendicular * halfWidth * aTail.y;
      }
      vFold = fold;
      vWorld = world;
      vUV = vec2(aUV.x, 1.0 - aUV.y);
      vTail = aTail;
      vKind = aMotion.w;
      gl_Position = uProjection * vec4(world,1.0);
    }
  `;
  const fragmentSource = `
    precision mediump float;
    uniform sampler2D uTexture, uCaustics;
    uniform mediump vec2 uCausticOffset, uCollar;
    uniform mediump vec3 uFilamentColor;
    uniform float uDark;
    varying mediump vec3 vWorld;
    varying mediump vec2 vUV, vTail;
    varying mediump float vKind, vFold;
    float tissueCoverage(float alpha) {
      // Solid tissue occludes like the whale. Keep the photographed
      // boundary and fine frills soft where their coverage is low.
      return smoothstep(0.0, 0.88, alpha);
    }
    void main() {
      vec4 material;
      if (vKind > 1.5) {
        float edge = 1.0 - smoothstep(0.44, 1.0, abs(vTail.y));
        float tip = 1.0 - smoothstep(0.86, 1.0, vTail.x);
        material = vec4(uFilamentColor, edge * tip * 0.66);
      } else {
        material = texture2D(uTexture, vUV);
        if (vKind < 0.5) {
          material.a = tissueCoverage(material.a)
            * (1.0 - smoothstep(uCollar.x, uCollar.y, 1.0 - vUV.y));
        } else {
          float span = abs(vTail.y);
          float edge = 1.0 - smoothstep(0.40, 1.0, span);
          float tip = 1.0 - smoothstep(0.96, 1.0, vTail.x);
          // The connected ribbon defines coverage. The photo supplies color
          // and texture only, so stray highlights cannot make another arm.
          float photo = smoothstep(0.24, 0.86, material.a);
          vec3 tissue = mix(uFilamentColor, vec3(0.88, 0.94, 1.0), 0.26);
          material.rgb = mix(tissue, material.rgb, 0.88 * photo);
          material.rgb *= 0.88 + 0.12 * (1.0 - span);
          material.a = edge * tip * mix(0.94, 0.68, vTail.x);
        }
      }
      if (material.a < 0.006) discard;
      vec3 caustic = texture2D(uCaustics, fract(vec2(
        vWorld.x / 420.0 + uCausticOffset.x,
        (vWorld.z - vWorld.y) / 580.0 + uCausticOffset.y))).rgb;
      float glow = dot(caustic, vec3(0.30, 0.54, 0.16));
      vec3 color = material.rgb * (mix(0.94, 1.025, uDark) + glow * 0.055 + vFold * 0.058);
      color += vec3(0.012, 0.018, 0.024) * glow * material.a;
      gl_FragColor = vec4(color, material.a);
    }
  `;

  // Curved photographic oral arms, in original-image UV coordinates [x,y,half-width].
  // Fine crossing threads are reconstructed separately instead of moving with these masks.
  const armPaths = [
    [
      [[0.34,0.49,0.055],[0.30,0.59,0.055],[0.32,0.69,0.045],[0.26,0.80,0.015]],
      [[0.49,0.49,0.049],[0.50,0.58,0.051],[0.46,0.67,0.042],[0.51,0.74,0.034],[0.53,0.83,0.011]],
      [[0.65,0.49,0.055],[0.67,0.60,0.050],[0.70,0.69,0.045],[0.75,0.80,0.015]],
    ],
    [
      [[0.45,0.24,0.035],[0.39,0.40,0.065],[0.43,0.55,0.065],[0.34,0.70,0.060],[0.39,0.85,0.040],[0.37,0.91,0.015]],
      [[0.51,0.24,0.035],[0.50,0.40,0.060],[0.49,0.55,0.055],[0.56,0.70,0.050],[0.52,0.85,0.040],[0.48,0.97,0.012]],
      [[0.56,0.24,0.035],[0.61,0.40,0.065],[0.70,0.55,0.065],[0.68,0.70,0.060],[0.70,0.85,0.040],[0.70,0.90,0.012]],
    ],
    [
      [[0.46,0.24,0.035],[0.42,0.35,0.065],[0.34,0.45,0.065],[0.43,0.55,0.065],[0.35,0.65,0.060],[0.38,0.75,0.055],[0.35,0.85,0.040],[0.40,0.92,0.010]],
      [[0.52,0.24,0.035],[0.56,0.35,0.055],[0.60,0.45,0.055],[0.53,0.55,0.060],[0.61,0.65,0.060],[0.53,0.75,0.060],[0.60,0.85,0.040],[0.50,0.96,0.010]],
    ],
  ];
  // The silver bell has a third oral arm between the two long outer arms.
  // Give it its own shorter outline; its material can sample intact frills
  // instead of the clear pixels between arms in the source cutout.
  const silverMiddleArm = [
    [0.49,0.24,0.024], [0.50,0.33,0.034], [0.49,0.45,0.037],
    [0.46,0.54,0.035], [0.52,0.66,0.032], [0.48,0.77,0.026],
    [0.50,0.88,0.010],
  ];
  const pathPoint = (path, t) => {
    const position = clamp(t, 0, 1) * (path.length - 1), i = Math.min(path.length - 2, Math.floor(position)), f = position - i;
    const p0 = path[Math.max(0, i - 1)], p1 = path[i], p2 = path[i + 1], p3 = path[Math.min(path.length - 1, i + 2)];
    return p1.map((v, k) => {
      // Keep the ribbon rows in order where a short attachment meets a fold.
      if (k === 1) return v + (p2[k] - v) * f;
      return 0.5 * (2 * v + (-p0[k] + p2[k]) * f
        + (2 * p0[k] - 5 * v + 4 * p2[k] - p3[k]) * f * f
        + (-p0[k] + 3 * v - 3 * p2[k] + p3[k]) * f * f * f);
    });
  };
  const pointAtHeight = (path, height) => {
    let first = 0, last = path.length - 1;
    while (last - first > 1) {
      const middle = Math.floor((first + last) / 2);
      if (path[middle][1] <= height) first = middle;
      else last = middle;
    }
    const fraction = clamp((height - path[first][1]) / (path[last][1] - path[first][1]), 0, 1);
    return pathPoint(path, (first + fraction) / (path.length - 1));
  };

  // Measure only the connected band around the trace. A second bright patch
  // across a clear gap belongs to another arm and stays outside this sample.
  const connectedTextureWidth = (shape, point, direction) => {
    const [x,y,width]=point;
    const limit = width * 0.70;
    if (!shape.alphaAt || shape.alphaAt(x,y)<0.40) return limit*0.33;
    let span=0;
    for (let step=1;step<=10;step++) {
      const distance=step*limit/10;
      if (shape.alphaAt(x+direction*distance,y)<0.40) break;
      span=distance;
    }
    return Math.max(limit*0.12,span);
  };

  // Find the dense oral tissue inside each photographed arm rather than letting
  // a hand-drawn UV strip wander into empty water between its folded edges.
  const traceTissue = (guide, alphaAt) => {
    if (!alphaAt) return guide;
    const rows=112,columns=41,span=0.075,parents=[],samples=[],costs=[];
    for(let row=0;row<=rows;row++){
      const center=pathPoint(guide,row/rows),line=[],current=new Float32Array(columns),parent=new Int16Array(columns);
      for(let column=0;column<columns;column++){
        const x=clamp(center[0]+(column/(columns-1)*2-1)*span,0.02,0.98),y=center[1];
        let density=0;
        for(const ox of [-0.004,0,0.004])for(const oy of [-0.002,0,0.002])density+=alphaAt(x+ox,y+oy)/9;
        const own=(1-density)*(1-density)*5.0+(1-alphaAt(x,y))**2*2.0+((x-center[0])/span)**2*0.35;
        line.push([x,y,Math.max(0.010,center[2]*1.18)]);
        if(row===0){current[column]=own+Math.abs(x-center[0])*800;continue;}
        let best=Infinity,bestIndex=0;
        for(let previous=0;previous<columns;previous++){
          const delta=x-samples[row-1][previous][0];
          if(Math.abs(delta)>0.030)continue;
          const candidate=costs[row-1][previous]+own+delta*delta*1800;
          if(candidate<best){best=candidate;bestIndex=previous;}
        }
        current[column]=best;parent[column]=bestIndex;
      }
      samples.push(line);costs.push(current);parents.push(parent);
    }
    let column=0;for(let x=1;x<columns;x++)if(costs[rows][x]<costs[rows][column])column=x;
    const path=new Array(rows+1);
    for(let row=rows;row>=0;row--){path[row]=samples[row][column];column=parents[row][column];}
    path[0]=guide[0].slice();
    // One small smoothing pass removes pixel-scale zig-zags without flattening folds.
    return path.map((point,index)=>index===0||index===rows?point:[(path[index-1][0]+point[0]*2+path[index+1][0])/4,point[1],point[2]]);
  };

  window.createJellyfishOcean = (canvas, options = {}) => {
    let gl, program, projection, ready = false, running = false, destroyed = false;
    let width = 1, height = 1, bottomInset = 0, waterHeight = 1, dark = true, frame = 0, lastTime = 0, time = 0;
    let fish = [];
    const buffers = [], textures = [], uniforms = {};
    const species = [
      { height: 10, anchor: 0.32, rim: 0.50, aspect: 1, wave: 0.95, color: [0.43,0.79,0.95], count: 12 },
      { height: 14, anchor: 0.17, rim: 0.28, aspect: 2 / 3, wave: 1, color: [0.94,0.83,0.58], count: 16 },
      { height: 14, anchor: 0.16, rim: 0.24, aspect: 2 / 3, wave: 1.12, color: [0.79,0.86,0.94], count: 16 },
    ];
    const activeSpecies = [0, 2];
    const base = new URL(options.assetBase || '/ocean/', window.location.href);
    const assetURL = (name) => new URL(name, base.href.endsWith('/') ? base : `${base.href}/`).href;
    let resolveReady, rejectReady;
    const readyPromise = new Promise((resolve, reject) => { resolveReady = resolve; rejectReady = reject; });
    readyPromise.catch(() => {});

    const reportError = (error) => {
      const e = error instanceof Error ? error : new Error(String(error));
      stop();
      options.onError?.(e);
      if (!ready) rejectReady(e);
    };
    const loadImage = (url) => new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error(`Could not load ocean texture: ${url}`));
      image.src = url;
    });
    const shader = (type, source) => {
      const handle = gl.createShader(type);
      gl.shaderSource(handle, source);
      gl.compileShader(handle);
      if (!gl.getShaderParameter(handle, gl.COMPILE_STATUS)) {
        const message = gl.getShaderInfoLog(handle);
        gl.deleteShader(handle);
        throw new Error(`Ocean shader could not compile: ${message}`);
      }
      return handle;
    };
    const attributes = {};
    const bindGeometry = (geometry) => {
      gl.bindBuffer(gl.ARRAY_BUFFER, geometry.vertices);
      [['aPosition',2,0],['aUV',2,2],['aRoot',2,4],['aMotion',4,6],['aTail',2,10]].forEach(([name,size,offset]) => {
        const location = attributes[name];
        if (location >= 0) { gl.enableVertexAttribArray(location); gl.vertexAttribPointer(location, size, gl.FLOAT, false, 48, offset * 4); }
      });
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, geometry.indices);
    };
    const makeGeometry = (shape, speciesIndex) => {
      const data = [], indices = [];
      const vertex = (x,y,u,v,root,seed,frequency,amplitude,kind,t,edge) => {
        data.push(x,y,u,v,root[0],root[1],seed,frequency,amplitude,kind,t,edge);
      };
      const gridIndices = (start, columns, rows) => {
        for (let y=0;y<rows;y++) for (let x=0;x<columns;x++) {
          const a=start+y*(columns+1)+x,b=a+columns+1; indices.push(a,b,a+1,a+1,b,b+1);
        }
      };
      // The short collar hides the joins without carrying a second set of arms.
      const columns=48, rows=24, end=shape.rim+0.042;
      for (let y=0;y<=rows;y++) for (let x=0;x<=columns;x++) {
        const u=x/columns,v=y/rows*end; vertex(u,v,u,v,[0.5,shape.anchor],0,0,0,0,0,0);
      }
      gridIndices(0,columns,rows);
      const bell = indices.splice(0);
      const tracedArms=armPaths[speciesIndex].map(sourcePath => {
        const guide=sourcePath.map(point=>point.slice()), attachment=shape.rootAt(guide[0][0]);
        if (attachment[1]<guide[0][1]-0.002) guide.unshift([attachment[0],attachment[1],guide[0][2]]);
        return traceTissue(guide,shape.alphaAt);
      });
      const addArm = (path, index, { texturePath=path, textureEnd, spread=0, middle=false }={}) => {
        const start=data.length/12, segments=56, across=6, root=path[0];
        const seed=speciesIndex*1.71+index*Math.PI+0.35+(middle ? 1.45 : 0);
        const frequency=0.93+index*0.187+speciesIndex*0.081;
        const amplitude=(speciesIndex===0?0.0391:middle?0.052:0.07705)*(0.87+index*0.09);
        const length=path[path.length-1][1]-root[1];
        const textureStart=middle ? 0.25 : texturePath[0][1];
        for (let y=0;y<=segments;y++) {
          const t=y/segments, point=pointAtHeight(path,root[1]+length*t);
          const texturePoint=textureEnd ? pointAtHeight(texturePath,textureStart+(textureEnd-textureStart)*t) : point;
          const fan=spread*t*(2-t);
          const left=connectedTextureWidth(shape,texturePoint,-1);
          const right=connectedTextureWidth(shape,texturePoint,1);
          const fold=0.80+0.20*Math.cos(t*31+seed);
          for (let x=0;x<=across;x++) {
            const edge=x/across*2-1;
            const u=point[0]+point[2]*edge*fold*0.82+fan;
            const sample=middle ? -edge : edge;
            const texU=texturePoint[0]+sample*(sample<0 ? left : right);
            vertex(u,point[1],texU,texturePoint[1],root,seed,frequency,amplitude,1,t,edge);
          }
        }
        gridIndices(start,across,segments);
      };
      if (speciesIndex===2) {
        const attachment=shape.rootAt(silverMiddleArm[0][0]);
        const middle=attachment[1]<silverMiddleArm[0][1]
          ? [[...attachment,silverMiddleArm[0][2]],...silverMiddleArm] : silverMiddleArm;
        addArm(middle,2,{texturePath:tracedArms[1],textureEnd:0.775,middle:true});
      }
      tracedArms.forEach((path,index) => {
        if (speciesIndex!==2) addArm(path,index);
        else addArm(path,index,{spread:(index-0.5)*0.12,textureEnd:index===0 ? 0.835 : undefined});
      });
      const arms = indices.splice(0);
      // Each filament is separate geometry with independently seeded motion.
      for (let index=0;index<shape.count;index++) {
        const start=data.length/12, segments=40, across=4, spread=index/(shape.count-1);
        const seed=0.47+speciesIndex*2.21+index*2.399963;
        const root=shape.rootAt(0.22+spread*0.56);
        const frequency=0.72+((index*0.347+speciesIndex*0.19)%1)*0.97;
        const amplitude=(speciesIndex===0?0.0368:0.08165)*(0.68+((index*0.618)%1)*0.53);
        const endY=speciesIndex===0?0.75+0.065*Math.sin(index*1.7):0.79+0.19*((index*0.43)%1);
        for (let y=0;y<=segments;y++) {
          const t=y/segments;
          const arc = t*Math.PI*0.82, curl = t*9+seed;
          const centerX=root[0]+(spread-0.5)*0.30*Math.sin(arc)+0.018*Math.sin(curl)*t;
          const alongY=endY-root[1], centerY=root[1]+alongY*t;
          const alongX=(spread-0.5)*0.30*Math.PI*0.82*Math.cos(arc)+0.018*(Math.sin(curl)+9*t*Math.cos(curl));
          for (let x=0;x<=across;x++) {
            const edge=x/across*2-1;
            // Filaments are procedural; this pair carries the UV tangent
            // instead of a texture lookup.
            vertex(centerX,centerY,alongX,alongY,root,seed,frequency,amplitude,2,t,edge);
          }
        }
        gridIndices(start,across,segments);
      }
      // The delicate strands sit behind the heavier oral arms and bell.
      indices.push(...arms,...bell);
      const vertices=gl.createBuffer(),elements=gl.createBuffer(); buffers.push(vertices,elements);
      gl.bindBuffer(gl.ARRAY_BUFFER,vertices); gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(data),gl.STATIC_DRAW);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,elements); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,new Uint16Array(indices),gl.STATIC_DRAW);
      return {vertices,indices:elements,count:indices.length};
    };
    const texture = (image, slot) => {
      const handle = gl.createTexture();
      textures.push(handle);
      gl.activeTexture(gl.TEXTURE0 + slot);
      gl.bindTexture(gl.TEXTURE_2D, handle);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      return handle;
    };
    const imageSize = (i) => Math.min(
      (width <= 680 ? [155, 190, 175] : [245, 300, 280])[i],
      width * 0.40, waterHeight * 0.37,
    );
    let route={a:1,b:1};
    const routeCurve = angle => {
      const x = Math.sin(angle), dx = Math.cos(angle);
      const y = 0.84*Math.sin(2*angle)+0.16*dx;
      const dy = 1.68*Math.cos(2*angle)-0.16*x;
      return width < waterHeight ? [y,x,dy,dx] : [x,y,dx,dy];
    };
    const fitRoute = () => {
      let a=width*0.49,b=waterHeight*0.49;
      // Fit the complete rotated image, additional strand sweep and capped lag.
      // This is a geometric fit, never a correction or teleport during swimming.
      for(let attempt=0;attempt<48;attempt++){
        let maxX=0,maxY=0;
        for(const index of activeSpecies)for(let sample=0;sample<120;sample++){
          const [u,v,du,dv]=routeCurve(sample*Math.PI*2/120);
          const dx=a*du,dy=b*dv,speed=Math.hypot(dx,dy);
          const [halfWidth,halfHeight]=silhouette(index,dx/speed,dy/speed);
          maxX=Math.max(maxX,Math.abs(a*u)+halfWidth);
          maxY=Math.max(maxY,Math.abs(b*v)+halfHeight);
        }
        if(maxX<=width/2-8&&maxY<=waterHeight/2-8)break;
        if(maxX>width/2-8)a*=0.965;
        if(maxY>waterHeight/2-8)b*=0.965;
      }
      route={a,b};
    };
    const routeFrame = (index,at=time) => {
      const slot=activeSpecies.indexOf(index);
      const pulse = swimPhase(index,at) - 1.74;
      const pulseRate = swimRate(index);
      // Advance during contraction and keep a small push during reopening.
      // Integrating the speed along the curve keeps turns and glides continuous.
      const advance = 0.008 * (Math.sin(pulse) + 0.18 * Math.sin(2 * pulse));
      const advanceRate = 0.008 * pulseRate * (Math.cos(pulse) + 0.36 * Math.cos(2 * pulse));
      // Offset their start times on a crossing route so both visit each side
      // and pass through the middle at different times.
      const theta=0.80-slot*1.60+at*0.054+advance+0.025*Math.sin(at*0.09+slot*2.11);
      const rate=0.054+advanceRate+0.00225*Math.cos(at*0.09+slot*2.11);
      const [u,v,du,dv]=routeCurve(theta);
      const velocity=[route.a*du*rate,route.b*dv*rate,0];
      return {center:[route.a*u,bottomInset/2+route.b*v],velocity,heading:Math.atan2(velocity[0],velocity[1])};
    };
    const makeFish = (i) => {
      const shape=species[i],scale=imageSize(i)/shape.height,centerOffset=(0.5-shape.anchor)*shape.height,pose=routeFrame(i),heading=pose.heading;
      const p=[pose.center[0]+Math.sin(heading)*centerOffset*scale,pose.center[1]+Math.cos(heading)*centerOffset*scale,[60,-30,-100][i]];
      return {p,velocity:pose.velocity,scale,centerOffset,shape,index:i,heading,angularVelocity:angleBetween(routeFrame(i,time+0.001).heading,routeFrame(i,time-0.001).heading)/0.002,speed:Math.hypot(...pose.velocity),seed:1.1+i*2.73,history:[{time,p:p.slice(),heading}]};
    };
    const resize = (w, h, dpr = window.devicePixelRatio || 1) => {
      const previousWidth = width;
      const previousHeight = height;
      width = Math.max(1, Number(w) || canvas.clientWidth || window.innerWidth);
      height = Math.max(1, Number(h) || canvas.clientHeight || window.innerHeight);
      const requestedInset = typeof options.bottomInset === 'function' ? options.bottomInset(width, height) : options.bottomInset;
      bottomInset = clamp(Number(requestedInset) || 0, 0, height * 0.25);
      waterHeight = height - bottomInset;
      const ratio = clamp(Number(dpr) || 1, 1, 1.5);
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      projection = new Float32Array([2 / width, 0, 0, 0, 0, 2 / height, 0, 0, 0, 0, -1 / 900, 0, 0, 0, 0, 1]);
      fitRoute();
      if (!fish.length || previousWidth <= 1) fish = activeSpecies.map((i) => makeFish(i));
      else fish.forEach((item) => {
        const next=makeFish(item.index),turn=angleBetween(next.heading,item.heading);
        const sx=width/previousWidth,sy=height/previousHeight;
        item.history.forEach(pose=>{
          pose.p[0]=next.p[0]+(pose.p[0]-item.p[0])*sx;
          pose.p[1]=next.p[1]+(pose.p[1]-item.p[1])*sy;
          pose.heading+=turn;
        });
        item.p=next.p;item.heading=next.heading;item.velocity=next.velocity;item.scale=next.scale;item.angularVelocity=next.angularVelocity;
      });
      if (gl && ready) { gl.viewport(0, 0, canvas.width, canvas.height); if (!running) draw(); }
    };

    function silhouette(index, ux, uy) {
      const h=imageSize(index), halfH=h*0.62, halfW=h*(species[index].aspect*0.5+0.15);
      return [halfH*Math.abs(ux)+halfW*Math.abs(uy),halfH*Math.abs(uy)+halfW*Math.abs(ux)];
    }
    const simulate = (dt) => {
      time+=dt;
      fish.forEach((item)=>{
        const pose=routeFrame(item.index),previous=item.heading;
        item.heading=previous+angleBetween(pose.heading,previous);
        item.angularVelocity=angleBetween(item.heading,previous)/dt;
        item.velocity=pose.velocity;item.speed=Math.hypot(...pose.velocity);
        item.p[0]=pose.center[0]+Math.sin(item.heading)*item.centerOffset*item.scale;
        item.p[1]=pose.center[1]+Math.cos(item.heading)*item.centerOffset*item.scale;
        item.history.push({time,p:item.p.slice(),heading:item.heading});
        while(item.history.length>2&&item.history[1].time<time-1.5)item.history.shift();
      });
    };
    const poseAt = (item, delay) => {
      const target=time-delay, history=item.history;
      for(let i=history.length-1;i>0;i--){
        const a=history[i-1],b=history[i];
        if(a.time<=target){const blend=clamp((target-a.time)/(b.time-a.time||1),0,1);return {p:a.p.map((v,k)=>v+(b.p[k]-v)*blend),heading:a.heading+angleBetween(b.heading,a.heading)*blend};}
      }
      return history[0];
    };
    const poseMatrix = (item,delay=0) => {
      const pose=delay?poseAt(item,delay):{p:item.p,heading:item.heading};
      const point=pose.p.slice(),dx=point[0]-item.p[0],dy=point[1]-item.p[1],distance=Math.hypot(dx,dy),limit=imageSize(item.index)*0.10;
      if(distance>limit){point[0]=item.p[0]+dx*limit/distance;point[1]=item.p[1]+dy*limit/distance;}
      const up=unit([Math.sin(pose.heading),Math.cos(pose.heading),0.018*Math.sin(time*0.19+item.seed)]);
      let x=unit(cross(up,[0,0,1])),z=unit(cross(x,up));
      const twist = Math.sin((time-delay)*0.31+item.seed)*0.17;
      x=x.map((v,k)=>v*Math.cos(twist)+z[k]*Math.sin(twist));
      const zz=unit(cross(x,up)),scale=item.scale;
      return new Float32Array([x[0]*scale,x[1]*scale,x[2]*scale,0,up[0]*scale,up[1]*scale,up[2]*scale,0,zz[0]*scale,zz[1]*scale,zz[2]*scale,0,point[0],point[1],point[2],1]);
    };
    const draw = () => {
      if (!ready || destroyed || gl.isContextLost()) return;
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.useProgram(program);
      gl.uniformMatrix4fv(uniforms.uProjection, false, projection);
      gl.uniform1f(uniforms.uTime, time);
      gl.uniform2f(uniforms.uCausticOffset, (time * 0.012) % 1, (time * 0.008) % 1);
      gl.uniform1f(uniforms.uDark, dark ? 1 : 0);
      fish.slice().sort((a, b) => a.p[2] - b.p[2]).forEach((item) => {
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, item.shape.texture);
        gl.uniform4f(uniforms.uShape, item.shape.height * item.shape.aspect, item.shape.height, item.shape.anchor, item.shape.wave);
        gl.uniform1f(uniforms.uPhase, swimPhase(item.index,time));
        gl.uniform1f(uniforms.uBellEnd, item.shape.rim);
        gl.uniform2f(uniforms.uCollar, item.shape.rim + 0.012, item.shape.rim + 0.042);
        gl.uniform3fv(uniforms.uFilamentColor, item.shape.color);
        const crossflow = 0.52*Math.sin(time*0.33+item.seed)-2.2*item.angularVelocity;
        gl.uniform2f(uniforms.uCurrent, clamp(crossflow,-1,1), 0.70+0.30*clamp(item.speed/34,0,1));
        gl.uniformMatrix4fv(uniforms.uJoint0, false, poseMatrix(item));
        for(let i=1;i<=4;i++)gl.uniformMatrix4fv(uniforms[`uHistory${i}`],false,poseMatrix(item,i*0.3));
        bindGeometry(item.shape.geometry);
        gl.drawElements(gl.TRIANGLES, item.shape.geometry.count, gl.UNSIGNED_SHORT, 0);
      });
    };
    const tick = (timestamp) => {
      frame = 0;
      if (!running || !ready || destroyed) return;
      const dt = lastTime ? clamp((timestamp - lastTime) / 1000, 0, 1 / 30) : 0;
      lastTime = timestamp;
      if (dt) simulate(dt);
      draw();
      frame = requestAnimationFrame(tick);
    };
    function start() { if (destroyed) return; running = true; lastTime = 0; if (ready && !frame) frame = requestAnimationFrame(tick); }
    function stop() { running = false; lastTime = 0; if (frame) cancelAnimationFrame(frame); frame = 0; }
    const setTheme = (isDark) => { dark = Boolean(isDark); if (ready && !running) draw(); };
    const contextLost = (event) => { event.preventDefault(); reportError(new Error('Ocean WebGL context was lost.')); };
    const destroy = () => {
      if (destroyed) return;
      stop(); destroyed = true;
      canvas.removeEventListener('webglcontextlost', contextLost);
      if (gl && !gl.isContextLost()) { buffers.forEach((b) => gl.deleteBuffer(b)); textures.forEach((t) => gl.deleteTexture(t)); if (program) gl.deleteProgram(program); }
      fish = [];
    };
    const api = { ready: readyPromise, start, stop, resize, setTheme, renderOnce: draw, destroy };
    resize(canvas.clientWidth || window.innerWidth, canvas.clientHeight || window.innerHeight);

    (async () => {
      try {
        if (!Array.isArray(options.textureURLs) || options.textureURLs.length !== 3 || options.textureURLs.some((url) => typeof url !== 'string' || !url)) {
          throw new Error('The ocean needs three transparent jellyfish texture URLs.');
        }
        gl = canvas.getContext('webgl', { alpha: true, antialias: true, premultipliedAlpha: true, powerPreference: 'low-power' });
        if (!gl) throw new Error('WebGL is unavailable for the ocean background.');
        canvas.addEventListener('webglcontextlost', contextLost);
        const [materials, caustics] = await Promise.all([
          Promise.all(options.textureURLs.map((url,index) => activeSpecies.includes(index)?loadImage(url):Promise.resolve(null))), loadImage(assetURL('caustics.jpg')),
        ]);
        if (destroyed) return;
        const vs = shader(gl.VERTEX_SHADER, vertexSource), fs = shader(gl.FRAGMENT_SHADER, fragmentSource);
        program = gl.createProgram(); gl.attachShader(program, vs); gl.attachShader(program, fs); gl.linkProgram(program);
        gl.deleteShader(vs); gl.deleteShader(fs);
        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(`Ocean program could not link: ${gl.getProgramInfoLog(program)}`);
        gl.useProgram(program);
        ['aPosition','aUV','aRoot','aMotion','aTail'].forEach((name) => { attributes[name] = gl.getAttribLocation(program, name); });
        ['uProjection','uJoint0','uHistory1','uHistory2','uHistory3','uHistory4','uShape','uCurrent','uPhase','uBellEnd','uTexture','uCaustics','uTime','uCausticOffset','uCollar','uFilamentColor','uDark'].forEach((name) => { uniforms[name] = gl.getUniformLocation(program, name); });
        materials.forEach((material, i) => {
          if(!material)return;
          species[i].aspect = material.naturalWidth / material.naturalHeight;
          species[i].texture = texture(material, 0);
          let pixels=null;
          if(typeof document!=='undefined'){
            const source=document.createElement('canvas');source.width=material.naturalWidth;source.height=material.naturalHeight;
            const context=source.getContext('2d',{willReadFrequently:true});
            if(context){context.drawImage(material,0,0);pixels=context.getImageData(0,0,source.width,source.height).data;}
          }
          species[i].alphaAt=pixels?((u,v)=>{
            const w=material.naturalWidth,h=material.naturalHeight,x=Math.round(clamp(u,0,1)*(w-1)),y=Math.round(clamp(v,0,1)*(h-1));
            return pixels[(y*w+x)*4+3]/255;
          }):null;
          species[i].rootAt=(u)=>{
            if(pixels){
              const w=material.naturalWidth,h=material.naturalHeight,x=Math.round(clamp(u,0.02,0.98)*(w-1));
              for(let y=Math.floor((species[i].rim-0.018)*h);y>=Math.floor(h*0.06);y--){
                const alpha=pixels[(y*w+x)*4+3];
                if(alpha>=180)return [u,Math.max(0.02,(y-3)/h)];
              }
            }
            return [clamp(u,0.31,0.69),species[i].rim-0.07];
          };
          species[i].geometry = makeGeometry(species[i], i);
        });
        texture(caustics, 1);
        gl.uniform1i(uniforms.uTexture, 0); gl.uniform1i(uniforms.uCaustics, 1);
        gl.disable(gl.CULL_FACE); gl.disable(gl.DEPTH_TEST); gl.enable(gl.BLEND);
        gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
        ready = true; draw(); resolveReady(api); options.onReady?.(api);
        if (running && !frame) frame = requestAnimationFrame(tick);
      } catch (error) { if (!destroyed) reportError(error); }
    })();
    return api;
  };
})();
