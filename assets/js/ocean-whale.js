/* Photo-textured beluga with a volumetric body, flippers and tail flukes. */
(() => {
  'use strict';

  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const smoothstep = (min, max, value) => {
    const t = clamp((value - min) / (max - min), 0, 1);
    return t * t * (3 - 2 * t);
  };
  const randomBetween = (min, max) => min + (max - min) * Math.random();
  const signedAngle = angle => Math.atan2(Math.sin(angle),Math.cos(angle));
  const mouthCenter = [-0.494, -0.048, 0];
  const jawPivot = [-0.389, -0.028];
  const jawTravel = 0.31;
  const neckPivot = -0.22;
  const headAxisY = 0.002;
  const viewTilt = 0.045;
  const swimPerspective = 0.39;
  const tailJoint = 0.389;
  const reverseDuration = 4.1;
  const spineSpacing = 0.055;
  const spineSections = 12;
  const trailSpacing = 0.05;
  const trailSamples = 18;
  const bubbleRelease = [0.52, 0.66, 0.79, 0.95, 1.06];
  const bubbleDuration = 1.58;
  const smallBubbleRelease = [0.14, 0.29];
  const wakeRelease = { tail: [0.09, 0.23, 0.38], flipper: [0.06, 0.20] };
  const bubbleCapacity = 14;
  const bubbleStride = 6;
  const meshAttributes = [['aPosition', 3, 0], ['aNormal', 3, 12], ['aUV', 2, 24], ['aPart', 1, 32], ['aFlex', 1, 36]];

  function rotatePair(x, y, angle) {
    const c = Math.cos(angle), s = Math.sin(angle);
    return [c*x-s*y, s*x+c*y];
  }

  function orientHeadVector(x, y, z, pose) {
    [x, z] = rotatePair(x,z,pose.headYaw);
    [x, y] = rotatePair(x,y,pose.headPitch);
    [x, y] = rotatePair(x,y,pose.pitch);
    [x, z] = rotatePair(x,z,pose.yaw);
    [y, z] = rotatePair(y,z,viewTilt);
    return [x,y,z];
  }

  function headPointInCamera(x,y,z,pose) {
    // Ahead of the shoulder the centerline is straight, with its origin at
    // the neck. Use the same local rotations as the vertex shader.
    [y,z] = rotatePair(y-headAxisY,z,pose.headRoll);
    return orientHeadVector(x-neckPivot,y+headAxisY,z,pose);
  }

  function strokePitch(distance,phase,effort,reverse,arch) {
    const along = distance/(tailJoint-neckPivot);
    const trunk = smoothstep(0.015,0.19,along);
    const tail = smoothstep(0.34,1,along);
    // A beat starts behind the shoulders and builds toward the tail stock.
    // Bend the segment tangents so the swimming stroke keeps its arc length.
    const amplitude = 0.85*trunk+0.15*tail;
    const forwardBeat = Math.sin(phase-3.95*along);
    const backwardBeat = Math.sin(phase-3.95+1.65*(along-1));
    return (0.012+0.69*effort)*amplitude*(forwardBeat+(backwardBeat-forwardBeat)*reverse)
      +0.46*arch*Math.sin(Math.PI*2*clamp(along,0,1));
  }

  // Side and oblique photographs set the envelope. Each row holds the axial
  // position, dorsal and ventral contour, half-width, and side-photo bounds
  // measured on a 960 × 640 copy. The bounds stay inside the photographed skin.
  const sections = [
    [0.020, 0.449, 0.449, 0.001, 219, 223], [0.027, 0.285, 0.626, 0.032, 211, 232],
    [0.039, 0.195, 0.678, 0.055, 207, 239], [0.058, 0.148, 0.695, 0.074, 204, 252],
    [0.083, 0.117, 0.710, 0.086, 204, 260], [0.116, 0.126, 0.716, 0.093, 203, 272],
    [0.154, 0.166, 0.732, 0.094, 201, 281], [0.196, 0.183, 0.751, 0.093, 196, 297],
    [0.240, 0.135, 0.765, 0.100, 193, 309], [0.325, 0.106, 0.776, 0.109, 186, 315],
    [0.410, 0.087, 0.765, 0.111, 179, 310], [0.505, 0.102, 0.727, 0.103, 174, 304],
    [0.605, 0.169, 0.660, 0.086, 181, 282], [0.700, 0.250, 0.594, 0.062, 188, 264],
    [0.780, 0.335, 0.546, 0.038, 198, 249], [0.845, 0.399, 0.519, 0.023, 205, 236],
    [0.886, 0.448, 0.505, 0.016, 213, 229], [0.905, 0.478, 0.478, 0.001, 217, 225],
  ];
  const finRoot = [-0.240, -0.058, 0.044];

  const vertexSource = `
    precision highp float;
    attribute vec3 aPosition, aNormal;
    attribute vec2 aUV;
    attribute float aPart, aFlex;
    uniform vec2 uViewport;
    uniform vec4 uPose;
    uniform vec3 uView;
    uniform float uSteering;
    uniform vec3 uHeadPose;
    uniform vec3 uFinControl;
    uniform vec3 uCenterline[${spineSections+3}];
    uniform float uPhase, uEffort, uDeform;
    uniform mediump float uMouth, uMelon;
    varying mediump vec2 vUV;
    varying mediump vec3 vNormal, vRestNormal;
    varying mediump vec3 vLocal;
    varying mediump float vPart, vFinSpan;

    vec2 rotate(vec2 p, float angle) {
      float s = sin(angle), c = cos(angle);
      return vec2(c*p.x-s*p.y, s*p.x+c*p.y);
    }

    // A cubic B-spline keeps the change in curvature continuous between
    // sections, so the inside of a tight bend doesn't kink at a joint.
    void spineFrame(float x,out vec3 center,out vec3 tangent) {
      float section = clamp((x-(${neckPivot}))/${spineSpacing},0.0,${spineSections-0.001});
      center = vec3(x,0.0,0.0);
      tangent = vec3(1.0,0.0,0.0);
      for (int i=0;i<${spineSections};i++) {
        float t = section-float(i);
        if (t >= 0.0 && t < 1.0) {
          vec3 p0 = uCenterline[i], p1 = uCenterline[i+1];
          vec3 p2 = uCenterline[i+2], p3 = uCenterline[i+3];
          vec3 b = 0.5*(p2-p0);
          vec3 c = 0.5*(p0-2.0*p1+p2);
          vec3 d = (p3-p0+3.0*(p1-p2))/6.0;
          center = (p0+4.0*p1+p2)/6.0+t*(b+t*(c+t*d));
          tangent = (b+t*(2.0*c+3.0*t*d))/${spineSpacing};
        }
      }
    }

    void main() {
      vec3 p = aPosition, normal = aNormal;
      vLocal = p;
      vPart = aPart;
      vFinSpan = aFlex;
      vRestNormal = aNormal;
      vUV = aUV;

      if (aPart < 0.5) {
        float cheek = abs(p.z);
        float melon = (1.0-smoothstep(-0.413,-0.371,p.x))
          * smoothstep(-0.005,0.063,p.y) * (1.0-smoothstep(0.028,0.083,cheek));
        p.x -= 0.019*uMelon*melon;
        p.y += 0.014*uMelon*melon;
        p.z *= 1.0+0.11*uMelon*melon;

        float lipY = -0.048+0.029*smoothstep(0.027,0.092,cheek);
        float jaw = (1.0-smoothstep(-0.420,-0.365,p.x))
          * (1.0-smoothstep(0.058,0.098,cheek))
          * (1.0-smoothstep(-0.015,0.005,p.y-lipY));
        float hinge = ${jawTravel}*uMouth*jaw;
        vec2 jawPivot = vec2(${jawPivot[0]},${jawPivot[1]});
        p.xy = jawPivot+rotate(p.xy-jawPivot,hinge);
        normal.xy = rotate(normal.xy,hinge);
      }

      if (aPart > 0.5 && aPart < 1.5) {
        // The inside paddle draws in on a turn; the outside one trims the bank.
        float side = sign(p.z);
        float inside = -uSteering*side;
        float inner = max(0.0,inside), outer = max(0.0,-inside);
        vec3 shoulder = vec3(${finRoot[0]},${finRoot[1]},${finRoot[2]}*side);
        float shoulderFlex = smoothstep(0.15,0.69,aFlex);
        float trim = uFinControl.y;
        float reverse = uFinControl.z;
        float timing = uFinControl.x+0.91*side;
        float unfold = smoothstep(-0.32,0.74,sin(timing));
        float lift = sin(timing-0.67);
        float brace = uEffort*sin(uPhase-0.44);
        float open = clamp(-0.23*(1.0-uEffort)-0.41*inner+0.32*outer+0.16*uMouth
          +0.36*(unfold-0.43)+0.21*abs(trim)+0.11*brace+0.27*reverse,-0.56,0.66)*shoulderFlex;
        float tilt = clamp(0.44*inner-0.29*outer+0.40*uView.y+0.25*lift+0.28*trim-0.20*brace,
          -0.56,0.56)*shoulderFlex;
        float feather = clamp(0.43*(unfold-0.44)-0.28*trim-0.15*inner+0.12*outer
          +0.29*reverse*sin(uPhase+0.22*side),-0.49,0.49)*shoulderFlex;
        vec3 paddle = p-shoulder;
        paddle.xz = rotate(paddle.xz,open*side);
        paddle.yz = rotate(paddle.yz,tilt*side);
        paddle.xy = rotate(paddle.xy,feather);
        p = shoulder+paddle;
        normal.xz = rotate(normal.xz,open*side);
        normal.yz = rotate(normal.yz,tilt*side);
        normal.xy = rotate(normal.xy,feather);
        // The thin outer half bends after the broader paddle has turned.
        float tip = smoothstep(0.28,1.0,aFlex);
        float flex = (0.017+0.021*uEffort)*sin(timing-1.36)
          +0.012*uEffort*sin(uPhase-1.14);
        p.y += flex*tip*tip;
        normal.yz = rotate(normal.yz,-7.0*side*tip*flex);
      }
      // Keep the pectoral bases in the same frame as the shoulder. The flukes
      // share the tail joint, then flex a little at their tips on each beat.
      float sectionX = aPosition.x;
      if (aPart > 1.5) {
        float rootBlend = smoothstep(0.04,0.29,aFlex);
        sectionX = mix(aPosition.x,${tailJoint},rootBlend);
        float feather = (0.016+0.231*uEffort)*cos(uPhase-2.03+0.75*uFinControl.z)*rootBlend;
        vec2 tailPivot = vec2(${tailJoint},0.0);
        p.xy = tailPivot+rotate(p.xy-tailPivot,feather);
        normal.xy = rotate(normal.xy,feather);
        float flex = 0.028*uEffort*sin(uPhase-2.55);
        p.y += flex*aFlex*aFlex;
        normal.yz = rotate(normal.yz,-9.0*sign(p.z)*aFlex*flex);
      } else if (aPart > 0.5) {
        // Skin the embedded root exactly like the neighboring body. Ease
        // into the shoulder frame only once the fin leaves the flank.
        sectionX = mix(aPosition.x,${finRoot[0]},smoothstep(0.06,0.40,aFlex));
      }
      float neckT = clamp((sectionX+0.383)/0.238,0.0,1.0);
      float headWeight = 1.0-neckT*neckT*neckT*(10.0+neckT*(-15.0+6.0*neckT));
      float tailBank = 1.0-0.48*smoothstep(0.03,${tailJoint},sectionX)*uDeform;
      float bankRipple = 0.10*uView.x*uEffort*smoothstep(-0.16,0.22,sectionX)
        *sin(uPhase-1.10-2.8*(sectionX+0.16));
      float roll = mix(uView.x*tailBank+bankRipple,uHeadPose.z,headWeight*uDeform);
      vec2 neckAxis = vec2(${headAxisY},0.0)*headWeight*uDeform;
      p.yz = neckAxis + rotate(p.yz-neckAxis,roll);
      normal.yz = rotate(normal.yz,roll);
      float headLead = uHeadPose.x*headWeight;
      vec2 neck = vec2(${neckPivot}, 0.0);
      p.xz = neck + rotate(p.xz-neck, headLead);
      normal.xz = rotate(normal.xz, headLead);
      float nod = uHeadPose.y*headWeight;
      p.xy = neck + rotate(p.xy-neck, nod);
      normal.xy = rotate(normal.xy, nod);
      if (uDeform > 0.0) {
        float root = max(${neckPivot},sectionX);
        vec3 center,tangent;
        spineFrame(root,center,tangent);
        float pitch = atan(tangent.y,length(tangent.xz));
        float yaw = atan(tangent.z,tangent.x);
        p.x -= root;
        p.xy = rotate(p.xy,pitch);
        normal.xy = rotate(normal.xy,pitch);
        p.xz = rotate(p.xz,yaw);
        normal.xz = rotate(normal.xz,yaw);
        p += center-vec3(${neckPivot},0.0,0.0);
      } else {
        p = aPosition;
        normal = aNormal;
        p.yz = neckAxis+rotate(p.yz-neckAxis,uView.x);
        normal.yz = rotate(normal.yz,uView.x);
      }
      p.xy = rotate(p.xy, uView.y);
      normal.xy = rotate(normal.xy, uView.y);
      p.xz = rotate(p.xz, uView.z);
      normal.xz = rotate(normal.xz, uView.z);
      // Looking slightly down reveals the dorsal contour and horizontal flukes.
      p.yz = rotate(p.yz, ${viewTilt});
      normal.yz = rotate(normal.yz, ${viewTilt});
      vNormal = normal;
      float clipW = 1.0-uPose.w*p.z;
      vec2 origin = uPose.xy/uViewport*vec2(2.0,-2.0)+vec2(-1.0,1.0);
      vec2 offset = p.xy*(2.0*uPose.z)/uViewport;
      gl_Position = vec4(origin*clipW+offset,-p.z*0.90,clipW);
    }
  `;

  const fragmentSource = `
    precision mediump float;
    uniform sampler2D uTexture, uCheekTexture, uMelonTexture;
    uniform float uDark, uDepth;
    uniform mediump float uMouth;
    varying mediump vec2 vUV;
    varying mediump vec3 vNormal, vRestNormal;
    varying mediump vec3 vLocal;
    varying mediump float vPart, vFinSpan;

    float luminance(vec3 color) {
      return dot(color, vec3(0.2126,0.7152,0.0722));
    }

    // Separate the tank's broad light from the smaller skin folds. The first
    // component retains the softer tonal variation across the photo patch.
    vec2 photoTones(sampler2D source, vec2 uv, vec2 radius, float center) {
      float around = luminance(texture2D(source,uv+vec2(radius.x,0.0)).rgb)
        + luminance(texture2D(source,uv-vec2(radius.x,0.0)).rgb)
        + luminance(texture2D(source,uv+vec2(0.0,radius.y)).rgb)
        + luminance(texture2D(source,uv-vec2(0.0,radius.y)).rgb);
      float broad = 0.25*around;
      return vec2(broad,center-broad);
    }

    void main() {
      vec3 normal = normalize(vNormal), rest = normalize(vRestNormal);
      vec3 water = mix(vec3(0.47,0.63,0.69), vec3(0.13,0.29,0.35), uDark);
      float photographed = luminance(texture2D(uTexture,vUV).rgb);
      float dorsal = smoothstep(-0.85,0.78,rest.y);
      vec3 skinTint = mix(vec3(0.038,0.012,-0.008),vec3(0.022,0.013,0.008),dorsal);
      vec3 color = vec3(0.19+0.87*photographed)+skinTint;
      if (vPart < 0.5) {
        float head = 1.0-smoothstep(-0.354,-0.214,vLocal.x);
        if (head > 0.0) {
          // Register the Highsmith photo to the eye, closed lip and cheek.
          float az = abs(vLocal.z);
          float photoX = 0.383+1.70*(vLocal.x+0.387)+0.28*(az-0.090);
          float photoY = 0.310-1.99*(vLocal.y-0.002)+0.14*(photoX-0.383);
          vec2 cheekUV = vec2(photoX,1.0-photoY);
          vec3 cheekPhoto = texture2D(uCheekTexture,cheekUV).rgb;
          float cheekValue = luminance(cheekPhoto);
          vec2 cheekTones = photoTones(uCheekTexture,cheekUV,vec2(0.016,0.023),cheekValue);
          float side = smoothstep(0.26,0.84,abs(rest.z));
          float upper = smoothstep(-0.091,0.088,0.66*vLocal.y+0.052*rest.y);
          vec3 headTone = mix(vec3(0.49,0.462,0.451),vec3(0.849,0.833,0.814),upper);
          float lipY = -0.048+0.029*smoothstep(0.027,0.092,az);
          // Feather before the background enters the cheek sampling footprint.
          float photoSilhouette = 0.147+0.50*max(photoX-0.31,0.0);
          float photoSkin = smoothstep(0.20,0.30,photoX)
            * smoothstep(photoSilhouette+0.036,photoSilhouette+0.104,photoY);
          float cheekMask = (1.0-smoothstep(0.049,0.087,abs(vLocal.y-0.006)))
            * (1.0-smoothstep(-0.358,-0.286,vLocal.x))*side*photoSkin;
          float eye = 1.0-smoothstep(0.32,1.16,length((cheekUV-vec2(0.383,0.690))/vec2(0.015,0.017)));
          float cheekLight = 0.14+0.68*cheekTones.x;
          vec3 cheekTone = vec3(cheekLight)+(cheekPhoto-cheekValue)*0.32;
          headTone = mix(headTone,cheekTone,0.36*cheekMask);
          headTone += cheekMask*clamp(cheekTones.y,-0.31,0.09)*(0.62+0.54*eye);

          // Fit the closed lip and forehead of the near-front photograph to the
          // mesh, using its better-lit half symmetrically across the muzzle.
          float fold = az*smoothstep(0.0,0.012,az);
          float photoMouthY = 0.534+0.049*smoothstep(0.012,0.074,fold);
          float foreheadBias = smoothstep(0.012,0.094,vLocal.y);
          float melonX = 0.454+(2.85-0.85*foreheadBias)*fold;
          float melonY = photoMouthY-2.45*(vLocal.y-lipY);
          vec2 melonUV = vec2(melonX,1.0-melonY);
          vec3 melonPhoto = texture2D(uMelonTexture,melonUV).rgb;
          float melonValue = luminance(melonPhoto);
          vec2 melonTones = photoTones(uMelonTexture,melonUV,vec2(0.023,0.032),melonValue);
          float front = (1.0-smoothstep(-0.404,-0.329,vLocal.x))*smoothstep(0.04,0.72,-rest.x);
          float photoCrown = 0.16+0.47*max(melonX-0.48,0.0);
          float melonMask = smoothstep(photoCrown+0.062,photoCrown+0.156,melonY)
            * smoothstep(-0.095,-0.065,vLocal.y)*(1.0-smoothstep(0.052,0.097,az));
          float variation = clamp(melonTones.x-0.45,-0.32,0.20);
          vec3 photoColor = (melonPhoto-melonValue)*0.28;
          headTone += (variation*0.13+clamp(melonTones.y,-0.07,0.055)*0.43+photoColor)*front*melonMask;
          color = mix(color,headTone,head*0.92);

          // Add a soft upper-lip shadow and a finer seam that fades at the corners.
          float lip = 1.0-smoothstep(0.0007,0.0031,abs(vLocal.y-lipY));
          float lipRange = (1.0-smoothstep(-0.434,-0.394,vLocal.x))*smoothstep(-0.93,-0.31,rest.y);
          float lipShadow = exp(-pow((vLocal.y-lipY+0.004)/0.012,2.0));
          color *= 1.0-(0.13*lip+0.09*lipShadow)*lipRange*(1.0-0.75*uMouth);
          if (uMouth > 0.0) {
            float aperture = (1.0-smoothstep(-0.440,-0.388,vLocal.x))
              * (1.0-smoothstep(0.047,0.088,az));
            float opening = 0.0022+0.016*uMouth*aperture;
            float inside = 1.0-smoothstep(0.57,1.0,abs(vLocal.y-lipY+0.004)/opening);
            float mouth = inside*aperture*smoothstep(0.05,0.62,uMouth)*smoothstep(-0.99,-0.68,rest.y);
            color = mix(color,vec3(0.106,0.076,0.077),mouth*0.96);
          }
        }

      } else {
        float underside = 1.0-smoothstep(-0.78,0.32,normal.y);
        float finTip = smoothstep(0.28,0.97,vFinSpan);
        if (vPart < 1.5) {
          // The photographed pectoral includes the grain and darker rim.
          vec3 finPhoto = texture2D(uCheekTexture,vUV).rgb;
          float finValue = luminance(finPhoto);
          vec3 finTone = vec3(0.23+0.71*finValue)+(finPhoto-finValue)*0.36;
          float root = 1.0-smoothstep(0.11,0.45,vFinSpan);
          float shoulderX = (89.0+650.0*(vLocal.x+0.48)/0.885)/960.0;
          float shoulderY = 0.565+0.86*(vLocal.y+0.012);
          float shoulderValue = luminance(texture2D(uTexture,vec2(shoulderX,shoulderY)).rgb);
          vec3 shoulderTone = vec3(0.19+0.87*shoulderValue)+skinTint;
          color = mix(finTone*(0.99-0.20*underside-0.075*finTip),shoulderTone,root);
          // A rounded fin edge curves away from the overhead light.
          float edge = 1.0-smoothstep(0.12,0.62,abs(rest.y));
          color *= 1.0-0.084*edge*(1.0-root);
        } else {
          color *= 0.99-0.20*underside-0.075*finTip;
        }
      }
      // Broad overhead illumination changes with the turn. Preserve diffuse
      // fill in the shadow so the white skin reads through the water.
      vec3 light = normalize(vec3(-0.28,0.91,0.29));
      float facingLight = dot(normal,light);
      color *= 0.97+0.14*(facingLight-0.48*rest.y);
      color = mix(color,water,0.053+0.13*uDepth);
      gl_FragColor = vec4(color,1.0);
    }
  `;

  const bubbleVertexSource = `
    attribute vec4 aBubble;
    attribute vec2 aAppearance;
    varying mediump vec2 vAppearance;

    void main() {
      gl_Position = vec4(aBubble.xyz,1.0);
      gl_PointSize = aBubble.w;
      vAppearance = aAppearance;
    }
  `;

  const bubbleFragmentSource = `
    precision mediump float;
    varying mediump vec2 vAppearance;

    void main() {
      vec2 point = gl_PointCoord*2.0-1.0;
      point.y *= vAppearance.y;
      float radius = length(point);
      float rim = smoothstep(0.65,0.87,radius)*(1.0-smoothstep(0.91,1.0,radius));
      float interior = 1.0-smoothstep(0.40,0.98,radius);
      float reflection = 1.0-smoothstep(0.05,0.43,length(point-vec2(-0.35,-0.43)));
      float shade = 0.45-0.23*point.y;
      float alpha = vAppearance.x*(0.055*interior+shade*rim+0.51*reflection);
      vec3 color = mix(vec3(0.53,0.76,0.81),vec3(0.90,0.96,0.98),reflection);
      gl_FragColor = vec4(color*alpha,alpha);
    }
  `;

  function sectionAt(x) {
    const end = sections.length - 1;
    let i = 0;
    while (i < end - 1 && x > sections[i+1][0]) i++;
    const a = sections[i], b = sections[i+1];
    const previous = sections[Math.max(0, i-1)], next = sections[Math.min(end, i+2)];
    const span = b[0]-a[0], t = (x-a[0])/span;
    return [1,2,3,4,5].map(component => {
      const leftSlope = (b[component]-previous[component])/(b[0]-previous[0]);
      const rightSlope = (next[component]-a[component])/(next[0]-a[0]);
      const delta = b[component]-a[component];
      return a[component]+t*(span*leftSlope+t*(3*delta-span*(2*leftSlope+rightSlope)
        +t*(-2*delta+span*(leftSlope+rightSlope))));
    });
  }

  function makeMesh() {
    const vertices = [], indices = [];
    // Each surface has a longitudinal axis and a closed transverse section.
    function surface(rows, sides, part, point) {
      const offset = vertices.length/10;
      for (let i=0; i<=rows; i++) {
        const t = i/rows;
        for (let j=0; j<=sides; j++) {
          const angle = j/sides*Math.PI*2;
          const sample = point(t, angle);
          const before = point(Math.max(0,t-0.0005),angle), after = point(Math.min(1,t+0.0005),angle);
          const around = point(t, angle+0.002);
          const along = after.map((value,k) => value-before[k]);
          const across = around.map((value,k) => value-sample[k]);
          const normal = [along[1]*across[2]-along[2]*across[1], along[2]*across[0]-along[0]*across[2], along[0]*across[1]-along[1]*across[0]];
          const length = Math.hypot(...normal)||1;
          const [x,y,z,u,v] = sample;
          vertices.push(x,y,z,...normal.map(value=>value/length),u,v,part,t);
        }
      }
      for (let i=0; i<rows; i++) {
        for (let j=0; j<sides; j++) {
          const a = offset+i*(sides+1)+j, b = a+sides+1;
          indices.push(a,b,a+1,a+1,b,b+1);
        }
      }
    }

    surface(124, 56, 0, (t, angle) => {
      // Resolve the narrow leading cap more finely to avoid a faceted nose.
      const u = sections[0][0] + (sections.at(-1)[0]-sections[0][0])*t*t;
      const [top,bottom,radius,photoTop,photoBottom] = sectionAt(u);
      const across = Math.sin(angle), vertical = Math.cos(angle);
      const center = (top+bottom)/2;
      const v = center+(bottom-top)*vertical/2;
      const head = 1-smoothstep(0.145,0.235,u);
      const alignedV = v+(0.449-center)*head;
      const cap = 1-smoothstep(0.040,0.092,u);
      const tip = clamp((u-0.020)/0.078,0,1);
      const roundness = Math.sqrt(tip*(2-tip)+1e-10);
      const ovalHeight = (0.5-alignedV)/3;
      const frontHeight = 0.032-0.010*tip-0.105*roundness*vertical;
      const dorsalRidge = 0.006*(1-smoothstep(0.0,0.46,Math.abs(across)))
        * smoothstep(0.39,0.51,u)*(1-smoothstep(0.59,0.70,u))*(vertical < 0 ? 1 : 0);
      const height = ovalHeight+(frontHeight-ovalHeight)*cap+dorsalRidge;
      const headRadius = radius+(0.089*roundness-radius)*cap;
      const jawWidth = 1-0.12*(1-smoothstep(-0.091,-0.019,height))*head;
      const z = across*headRadius*jawWidth;
      const halfWidth = Math.abs(z);
      // In the closed-mouth references the upper lip projects slightly in
      // front of the rounded forehead. Both flow into the cheek and throat.
      const lipCenter = -0.037+0.015*smoothstep(0.020,0.080,halfWidth);
      const melon = 0.018*Math.exp(-Math.pow((height-0.061)/0.057,2));
      const upperLip = 0.025*Math.exp(-Math.pow((height-lipCenter)/0.027,2));
      const lowerJaw = 0.016*Math.exp(-Math.pow((height+0.062)/0.036,2));
      const upperFold = 0.004*Math.exp(-Math.pow((height+0.013)/0.018,2));
      const throat = 0.020*(1-smoothstep(-0.090,-0.030,height));
      const cheek = 1-0.62*smoothstep(0.040,0.086,halfWidth);
      const faceDepth = (1-smoothstep(0.040,0.155,u))*(melon+cheek*(upperLip+lowerJaw-upperFold)-throat);
      const eyePocket = (1-smoothstep(0.38,1.22,Math.hypot((u-0.116)/0.022,(height-0.002)/0.021)))
        * smoothstep(0.058,0.084,halfWidth);
      const photoX = 89+650*(u-0.020)/0.885;
      const photoY = photoTop+(photoBottom-photoTop)*(vertical+1)*0.5;
      return [u-0.5-faceDepth, height, z*(1-0.029*eyePocket), photoX/960, 1-photoY/640];
    });

    for (const side of [-1,1]) {
      surface(26,24,1,(t,angle) => {
        const span = Math.sin(t*Math.PI/2);
        // The shoulder narrows before the broad part of the paddle. The
        // rounded tip bends out of the main surface, as in the oblique photo.
        const collar = 1-smoothstep(0.12,0.44,span);
        const width = (0.028+0.017*Math.sin(Math.PI*span)+0.006*collar)*Math.sqrt(1-span**5)+0.0003;
        const thickness = 0.014*(1-0.94*span)+0.008*collar;
        const across = Math.sin(angle)*side;
        const top = Math.cos(angle);
        const [x,y,z] = finRoot;
        const twist = (0.16+0.38*Math.sin(Math.PI*span))*width*across;
        const tipCurl = 0.014*span**4;
        const photoWidth = 0.073*Math.sin(Math.PI*span);
        return [x+0.078*span+0.022*span*span+width*across,
          y-0.098*span+top*thickness+twist+tipCurl,
          side*(z+0.129*span-0.021*span*span+0.40*top*thickness),
          0.547+0.233*span-0.54*across*photoWidth,
          1-(0.555+0.106*span+0.94*across*photoWidth)];
      });
      surface(28,24,2,(t,angle) => {
        const span = Math.sin(t*Math.PI/2);
        const chord = (0.077+0.063*Math.sin(Math.PI*span))*Math.sqrt(1-span)+0.002;
        const thickness = 0.010*(1-0.91*span);
        const across = Math.sin(angle)*side;
        const top = Math.cos(angle);
        const notch = 0.020*Math.exp(-Math.pow(span/0.15,2))*(across+1)*0.5;
        return [0.389+0.041*span+0.045*span*span+chord*across*0.5-notch,
          0.006+0.015*span*span+top*thickness,side*(0.177*span),
          (704+23*span+6*across)/960, 1-(221+3*span-2*top)/640];
      });
    }
    return {vertices:new Float32Array(vertices), indices:new Uint16Array(indices)};
  }

  window.createOceanWhale = (canvas, options = {}) => {
    const opacity = Number.isFinite(options.opacity) ? clamp(options.opacity, 0, 1) : 1;
    const shaders = new Set();
    const textures = new Set();
    const cancelImageLoads = new Set();
    let gl, program, vertexBuffer, indexBuffer, bubbleProgram, bubbleBuffer;
    let bubblePosition, bubbleAppearance;
    const uniform = {};
    const attributes = [];
    let indexCount = 0;
    let width = 1, height = 1, size = 440, pixelRatio = 1;
    let phase = Number.isFinite(options.startAt) ? options.startAt * 1.8 : 0;
    let stroking = true, strokeTime = 2.6, effort = 0.78;
    let x, y, z, speed;
    let targetX, targetY, targetZ, legTime = 0, swimTime = 0;
    let yaw, turnRate = 0, neckLook = 0, inclination = 0, bank = 0;
    let finPhase = randomBetween(0,Math.PI*2), finTrim = 0, headInclination = 0;
    let turnBend = 0, lastTurnSide = 0;
    let depthChange = null, depthChangeWait = 4.5, lastDepthDirection = -1;
    let reverseTime = null, reverseWait = 7.2, reverseDrive = 0, travelDirection = 1;
    let arch = 0;
    let headGesture = null, lookWait = 0.95, lookSide = Math.random() < 0.5 ? -1 : 1;
    let glanceYaw = 0, glancePitch = 0, melonGesture = 0;
    const travelTrail = new Float64Array(trailSamples*3);
    const centerline = new Float32Array((spineSections+3)*3);
    let newestTrail = 0, trailRemainder = 0;
    let bubbleWait = 2.65, bubbleTime = null, nextBubble = 0, mouth = 0, lift = 0;
    let smallExhaleTime = null;
    let wake = null, wakeCooldown = 0, bankWakeArmed = true;
    const bubbles = [];
    const bubbleVertices = new Float32Array(bubbleCapacity*bubbleStride);
    let frame = 0, last = null;
    let ready = false, running = false, disposed = false, failed = false, dark = true;
    let resolveReady, rejectReady;
    const readyPromise = new Promise((resolve, reject) => {
      resolveReady = resolve;
      rejectReady = reject;
    });
    readyPromise.catch(() => {});

    function stop() {
      running = false;
      last = null;
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
      bubbles.length = 0;
      if (bubbleTime !== null) bubbleWait = randomBetween(10,17);
      bubbleTime = null;
      smallExhaleTime = null;
      wake = null;
      mouth = lift = 0;
    }

    function releaseResources() {
      cancelImageLoads.forEach(cancel => cancel());
      if (gl && !gl.isContextLost()) {
        if (vertexBuffer) gl.deleteBuffer(vertexBuffer);
        if (indexBuffer) gl.deleteBuffer(indexBuffer);
        if (bubbleBuffer) gl.deleteBuffer(bubbleBuffer);
        textures.forEach(texture => gl.deleteTexture(texture));
        shaders.forEach(shader => gl.deleteShader(shader));
        if (program) gl.deleteProgram(program);
        if (bubbleProgram) gl.deleteProgram(bubbleProgram);
      }
      vertexBuffer = indexBuffer = program = bubbleBuffer = bubbleProgram = null;
      shaders.clear();
      textures.clear();
    }

    function fail(error) {
      if (disposed || failed) return;
      failed = true;
      stop();
      releaseResources();
      const issue = error instanceof Error ? error : new Error(String(error));
      rejectReady(issue);
      try { options.onError?.(issue); } catch {}
    }

    function onContextLost(event) {
      event.preventDefault();
      fail(new Error('The whale WebGL context was lost.'));
    }

    function destroy() {
      if (disposed) return;
      disposed = true;
      stop();
      canvas.removeEventListener('webglcontextlost', onContextLost);
      releaseResources();
      if (!ready) rejectReady(new Error('The whale renderer was destroyed before it was ready.'));
    }

    function chooseDestination() {
      const leftward = targetX >= width*0.5;
      const mobile = width <= 680;
      const sideMargin = mobile ? width*0.23 : Math.min(width*0.21,size*0.36);
      const sideBand = Math.min(width*0.095,size*0.22);
      let score = -Infinity;
      let nextTurnSide = lastTurnSide;
      for (let attempt=0;attempt<8;attempt++) {
        const offset = randomBetween(sideMargin,sideMargin+sideBand);
        const candidateX = leftward ? offset : width-offset;
        const candidateZ = randomBetween(-0.78,0.78)*size;
        const distance = Math.hypot(candidateX-x,candidateZ-z)/size;
        const angle = signedAngle(Math.atan2(z-candidateZ,x-candidateX)-yaw);
        const side = Math.abs(angle) < 0.32 ? 0 : Math.sign(angle);
        // Favor a usable stretch of water and vary which way the next arc
        // bends. Distance and room to turn take priority near an edge.
        const candidateScore = Math.min(distance,1.30)*0.52
          -0.52*(1-smoothstep(0.57,0.92,distance))
          -0.42*smoothstep(2.20,Math.PI,Math.abs(angle))
          +0.44*Number(side !== 0 && side === -lastTurnSide)
          +randomBetween(0,0.44);
        if (candidateScore <= score) continue;
        score = candidateScore;
        targetX = candidateX;
        targetZ = candidateZ;
        nextTurnSide = side || lastTurnSide;
      }
      lastTurnSide = nextTurnSide;
      legTime = 0;
    }

    function depthManeuver(dt,edge) {
      if (depthChange === null) {
        depthChangeWait -= dt;
        if (depthChangeWait > 0 || bubbleTime !== null || reverseTime !== null ||
            edge > 0.32 || Math.abs(turnRate) > 0.24) return 0;
        const level = y/height;
        const direction = level < 0.28 ? 1 : level > 0.66 ? -1 : -lastDepthDirection;
        depthChange = {time:0,duration:randomBetween(4.5,5.6),direction};
        lastDepthDirection = direction;
      }
      const {duration,direction} = depthChange;
      depthChange.time += dt;
      const t = depthChange.time/duration;
      if (t >= 1) {
        depthChange = null;
        depthChangeWait = randomBetween(4.0,8.0);
        arch = 0;
        return 0;
      }
      // Ease through the dive or rise, then hold the new depth. Taper against
      // the bounds before the whale gets too close to the surface or seabed.
      const level = y/height;
      const clearance = direction > 0 ? 0.84-level : level-0.09;
      const amplitude = width <= 680 ? 0.48 : 0.53;
      const room = smoothstep(0.02,0.15,clearance);
      arch = direction > 0 ? smoothstep(0,0.19,t)*(1-smoothstep(0.43,0.77,t))*room : 0;
      const pulse = smoothstep(0.14,0.39,t)*(1-smoothstep(0.70,1,t));
      return direction*amplitude*pulse*room;
    }

    function moveBackward(dt, edge) {
      if (reverseTime === null) {
        reverseWait -= dt;
        if (reverseWait > 0 || depthChange !== null || bubbleTime !== null ||
            Math.abs(turnRate) > 0.23 || edge > 0.27) return;
        const retreat = size * 0.31;
        const endX = x+Math.cos(yaw)*retreat, endZ = z+Math.sin(yaw)*retreat;
        const inset = Math.min(width*0.34,size*0.53);
        if (endX < inset || endX > width-inset || Math.abs(endZ) > size*0.70) return;
        reverseTime = 0;
      }
      reverseTime += dt;
      const t = reverseTime/reverseDuration;
      const brake = smoothstep(0,0.35,t)*(1-smoothstep(0.67,1,t));
      travelDirection = 1-1.84*brake;
      reverseDrive = smoothstep(0.40,0.78,brake);
      if (t >= 1) {
        reverseTime = null;
        reverseWait = randomBetween(16,24);
      }
    }

    function moveHead(dt,steering,maneuver) {
      const lead = Math.max(0,Math.abs(steering)-Math.max(0,Math.sign(steering)*turnRate)-0.035);
      const turnLook = Math.sign(steering)*Math.min(0.22,0.61*lead);
      const headEase = Math.abs(turnLook) > Math.abs(neckLook) ? 0.23 : 0.48;
      neckLook += (turnLook-neckLook)*(1-Math.exp(-dt/headEase));

      // A turn or a change of depth can take priority over a glance.
      const available = (1-smoothstep(0.10,0.26,Math.abs(turnRate)))
        *(1-smoothstep(0.04,0.23,Math.abs(maneuver)))*(1-lift)*(1-0.75*reverseDrive);
      if (headGesture === null) {
        lookWait -= dt;
        if (lookWait <= 0 && available > 0.78 && bubbleTime === null && reverseTime === null) {
          headGesture = {time:0,duration:randomBetween(1.85,2.50),yaw:lookSide*randomBetween(0.21,0.28),
            pitch:randomBetween(0.11,0.17)};
          lookSide = -lookSide;
        }
      }
      let yawTarget = 0, pitchTarget = 0, melonTarget = 0, nodExhale = false;
      if (headGesture !== null) {
        headGesture.time += dt;
        const progress = headGesture.time/headGesture.duration;
        nodExhale = available > 0.66 && progress >= 0.51 && progress-dt/headGesture.duration < 0.51;
        const glance = smoothstep(0,0.28,progress)*(1-smoothstep(0.50,0.91,progress));
        const nod = smoothstep(0.19,0.47,progress)*(1-smoothstep(0.52,0.77,progress))
          -0.32*smoothstep(0.56,0.73,progress)*(1-smoothstep(0.79,1,progress));
        yawTarget = headGesture.yaw*glance*available;
        pitchTarget = headGesture.pitch*nod*available;
        const flatten = smoothstep(0.04,0.20,progress)*(1-smoothstep(0.27,0.42,progress));
        const push = smoothstep(0.33,0.52,progress)*(1-smoothstep(0.66,0.95,progress));
        melonTarget = (0.48*push-0.65*flatten)*available;
        if (progress >= 1) {
          headGesture = null;
          lookWait = randomBetween(3.4,6.0);
        }
      }
      const blend = 1-Math.exp(-dt/0.18);
      glanceYaw += (yawTarget-glanceYaw)*blend;
      glancePitch += (pitchTarget-glancePitch)*blend;
      melonGesture += (melonTarget-melonGesture)*blend;
      return nodExhale;
    }

    function swim(dt) {
      legTime += dt;
      swimTime += dt;
      let remaining = Math.hypot(targetX - x, targetZ - z);
      const closeToSide = Math.abs(targetX-x) < size*(width <= 680 ? 0.10 : 0.14);
      const legLimit = Math.max(25,width/(size*0.085));
      if (reverseTime === null && (closeToSide || legTime > legLimit)) {
        chooseDestination();
        remaining = Math.hypot(targetX - x, targetZ - z);
      }
      // Look ahead by a fraction of a body length so the turn starts while
      // there is room to bank, including at the near and far depth limits.
      const forwardX = -Math.cos(yaw), forwardZ = -Math.sin(yaw);
      const narrowWater = width <= 680;
      const lookAhead = speed*(narrowWater ? 1.55 : 1.15);
      const futureX = x+forwardX*lookAhead, futureZ = z+forwardZ*lookAhead;
      const inset = Math.min(width*(narrowWater ? 0.36 : 0.24),size*(narrowWater ? 0.66 : 0.53));
      const left = 1-smoothstep(inset*0.22,inset,futureX);
      const right = 1-smoothstep(inset*0.22,inset,width-futureX);
      const depthEdge = smoothstep(0.57,1.01,Math.abs(futureZ)/size);
      const edge = Math.max(left,right,depthEdge);
      moveBackward(dt,edge);
      const towardX = (targetX-x)/Math.max(1,remaining)+1.60*(left-right);
      const towardZ = (targetZ-z)/Math.max(1,remaining)-1.46*Math.sign(futureZ)*depthEdge;
      const cruiseArc = 0.10*Math.sin(0.54*swimTime+1.20*Math.sin(0.16*swimTime));
      const headingError = Math.atan2(-towardZ,-towardX)+cruiseArc*(1-edge)-yaw;
      const shortestTurn = signedAngle(headingError);
      const turnLimit = (width <= 680 ? 0.57 : 0.48)+0.37*edge;
      const startSteering = smoothstep(0.20,1.16,swimTime);
      const steering = clamp(shortestTurn*0.90,-turnLimit,turnLimit)*startSteering*(1-reverseDrive);
      const bankTarget = clamp(turnRate*0.93+0.16*(steering-turnRate),-0.57,0.57);
      bank += (bankTarget-bank)*(1-Math.exp(-dt/0.48));
      const maneuver = depthManeuver(dt,edge);
      const nodExhale = moveHead(dt,steering,maneuver);
      turnRate += (steering-turnRate)*(1-Math.exp(-dt/(0.67-0.27*edge)));
      const bendTarget = Math.abs(turnRate);
      const bendEase = bendTarget > turnBend ? 0.33 : 0.72;
      turnBend += (bendTarget-turnBend)*(1-Math.exp(-dt/bendEase));
      const fullTurn = Math.PI * 2;
      yaw = (yaw + turnRate * dt + fullTurn) % fullTurn;
      // A vertical crossing often spans several side-to-side passes,
      // especially on a tall phone. Keep the two destinations independent.
      const shallow = targetY < height*0.45;
      const depthReach = height*(shallow ? 0.055 : 0.047);
      if (swimTime > 3.4 && (shallow ? y < targetY+depthReach : y > targetY-depthReach)) {
        targetY = height*(shallow ? randomBetween(0.76,0.83) : randomBetween(0.09,0.16));
      }
      const trimInclination = clamp(Math.atan2(targetY-y,Math.max(size*0.58,height*0.32)),-0.47,0.47);
      const depthMix = smoothstep(0.05,0.26,Math.abs(maneuver));
      const desiredInclination = (trimInclination+(maneuver-trimInclination)*depthMix)*(1-reverseDrive);
      inclination += (desiredInclination-inclination)*(1-Math.exp(-dt/0.86));
      const trimTarget = clamp((desiredInclination-inclination)*3.4+inclination*1.8,-0.70,0.70);
      finTrim += (trimTarget-finTrim)*(1-Math.exp(-dt/0.65));
      headInclination += (inclination-headInclination)*(1-Math.exp(-dt/0.70));
      // A brief glide follows a group of strokes. Finish the current stroke
      // before tucking the fins, then let drag carry speed down smoothly.
      strokeTime -= dt;
      if (strokeTime <= 0 && (!stroking || Math.cos(phase-1.58) < -0.20)) {
        stroking = !stroking;
        strokeTime = stroking ? randomBetween(4.0,6.5) : randomBetween(2.1,3.5);
      }
      const effortTarget = Math.max(stroking ? 1 : 0.10,0.86*smoothstep(0.06,0.36,Math.abs(maneuver)),0.82*reverseDrive)*(1-0.38*lift)
        * (1-0.38*smoothstep(0.23,0.67,Math.abs(turnRate)));
      effort += (effortTarget-effort)*(1-Math.exp(-dt/0.58));
      phase = (phase+dt*(0.91+1.67*effort)) % fullTurn;
      finPhase = (finPhase+dt*(1.12+0.27*effort+0.39*Math.abs(turnRate))) % fullTurn;
      const stroke = Math.cos(phase-1.58);
      const downstroke = Math.max(0,-stroke), upstroke = Math.max(0,stroke);
      const thrust = 0.095*downstroke**2+0.060*upstroke**2;
      const acceleration = size*(0.008+effort*(thrust+0.021*smoothstep(0.09,0.38,Math.abs(maneuver))));
      const turnDrag = 0.19+0.13*smoothstep(0.15,0.65,Math.abs(turnRate));
      speed += (acceleration-speed*turnDrag)*dt;
      speed = clamp(speed,size*0.064,size*(width <= 680 ? 0.193 : 0.264));
      const previousX = x, previousY = y, previousZ = z;
      const travel = speed*travelDirection*dt;
      const horizontalStep = Math.cos(inclination)*travel;
      x -= Math.cos(yaw) * horizontalStep;
      z -= Math.sin(yaw) * horizontalStep;
      y += Math.sin(inclination)*travel;
      if (travel >= 0) rememberTravel(previousX,previousY,previousZ);
      else {
        // Retreat is tail-first with the head still looking forward. Advect
        // the previous trail rather than feeding the reverse path to the spine.
        for (let i=0;i<travelTrail.length;i+=3) {
          travelTrail[i] += x-previousX;
          travelTrail[i+1] += y-previousY;
          travelTrail[i+2] += z-previousZ;
        }
      }
      const tailWakeAt = 0.28*(depthChange?.duration ?? 0);
      const tailWake = depthChange?.direction > 0 && arch > 0.40
        && depthChange.time >= tailWakeAt && depthChange.time-dt < tailWakeAt;
      if (Math.abs(bank) < 0.17) bankWakeArmed = true;
      const flipperWake = bankWakeArmed && Math.abs(bank) > 0.30;
      if (flipperWake) bankWakeArmed = false;
      updateBubbles(dt,nodExhale);
      updateWake(dt,tailWake ? 'tail' : flipperWake ? 'flipper' : null);
    }

    function rememberTravel(previousX,previousY,previousZ) {
      const distance = Math.hypot(x-previousX,y-previousY,z-previousZ)/size;
      if (distance < 1e-8) return;
      // A ring follows the distance the whale has traveled, so slowing down
      // during a glide does not shorten the torso.
      let next = trailSpacing-trailRemainder;
      while (next <= distance) {
        const t = next/distance;
        newestTrail = (newestTrail+1)%trailSamples;
        const i = newestTrail*3;
        travelTrail[i] = previousX+(x-previousX)*t;
        travelTrail[i+1] = previousY+(y-previousY)*t;
        travelTrail[i+2] = previousZ+(z-previousZ)*t;
        next += trailSpacing;
      }
      trailRemainder = trailSpacing-next+distance;
    }

    function updateCenterline(view) {
      const c = Math.cos(view.yaw), s = Math.sin(view.yaw);
      const cp = Math.cos(view.pitch), sp = Math.sin(view.pitch);
      const depth = view.scale/size;
      for (let section=-1; section<=spineSections+1; section++) {
        const i = (section+1)*3;
        const distance = section*spineSpacing;
        let axial = distance, vertical = 0, lateral = 0;
        if (section > 0) {
          const history = (distance-trailRemainder)/trailSpacing;
          const sample = Math.floor(history), t = history-sample;
          const recent = ((newestTrail-sample+trailSamples)%trailSamples)*3;
          const older = ((newestTrail-sample-1+trailSamples)%trailSamples)*3;
          const dx = (travelTrail[recent]+t*(travelTrail[older]-travelTrail[recent])-x)/size;
          const dy = -(travelTrail[recent+1]+t*(travelTrail[older+1]-travelTrail[recent+1])-y)/view.scale;
          const dz = (travelTrail[recent+2]+t*(travelTrail[older+2]-travelTrail[recent+2])-z)/size;
          const straightX = c*dx+s*dz;
          const weight = smoothstep(0.045,0.24,distance)*0.91;
          axial += (Math.max(0.67*distance,cp*straightX+sp*dy)-distance)*weight;
          vertical = 0.105*Math.tanh((cp*dy-sp*straightX)/0.105)*weight;
          const followTurn = smoothstep(0.035,0.40,turnBend);
          lateral = 0.255*Math.tanh((c*dz-s*dx)/(0.255*depth))*weight*followTurn;
        }
        centerline[i] = neckPivot+axial;
        centerline[i+1] = vertical;
        centerline[i+2] = lateral;
      }
      // Keep the arc length consistent. A thick torso needs a wider turning
      // radius than the slender tail, even when bending in both planes.
      let previousX = neckPivot, previousY = 0, previousZ = 0;
      let sectionYaw = 0, sectionPitch = 0;
      for (let i=6;i<centerline.length;i+=3) {
        const rawX = centerline[i], rawY = centerline[i+1], rawZ = centerline[i+2];
        const dx = rawX-previousX, dy = rawY-previousY, dz = rawZ-previousZ;
        const targetYaw = Math.atan2(dz,Math.max(0.018,dx));
        if (i > 6) {
          const distance = (i/3-1.5)*spineSpacing;
          const targetPitch = Math.atan2(dy,Math.hypot(dx,dz))+strokePitch(distance,phase,effort,reverseDrive,arch);
          const limit = 0.118+0.046*smoothstep(0.29,0.59,distance);
          const yawChange = targetYaw-sectionYaw, pitchChange = targetPitch-sectionPitch;
          const bend = Math.hypot(yawChange,pitchChange);
          const weight = bend > 1e-8 ? limit*Math.tanh(bend/limit)/bend : 1;
          sectionYaw += yawChange*weight;
          sectionPitch += pitchChange*weight;
        }
        const horizontal = spineSpacing*Math.cos(sectionPitch);
        centerline[i] = centerline[i-3]+horizontal*Math.cos(sectionYaw);
        centerline[i+1] = centerline[i-2]+spineSpacing*Math.sin(sectionPitch);
        centerline[i+2] = centerline[i-1]+horizontal*Math.sin(sectionYaw);
        previousX = rawX;
        previousY = rawY;
        previousZ = rawZ;
      }
      // Use a straight ghost section so the head and the mouth's bubble
      // origin still share exactly the same frame at the neck.
      centerline[0] = neckPivot-spineSpacing;
      centerline[1] = 0;
      centerline[2] = 0;
    }

    function resize(w, h, dpr = window.devicePixelRatio || 1) {
      if (disposed) return;
      const previousWidth = width;
      const previousHeight = height;
      const previousSize = size;
      width = Math.max(1, Number(w) || window.innerWidth);
      height = Math.max(1, Number(h) || window.innerHeight);
      size = width <= 680 ? Math.min(264,width*0.59) : Math.min(460,width*0.42);
      if (x === undefined) {
        const mirror = Math.random() < 0.5;
        const origin = width <= 680 ? 0.32 : 0.42;
        x = width*(mirror ? 1-origin : origin);
        y = height * (width <= 680 ? 0.13 : 0.18);
        z = -0.48 * size;
        speed = size * 0.17;
        const destination = width <= 680 ? randomBetween(0.72,0.77) : randomBetween(0.86,0.90);
        targetX = width*(mirror ? 1-destination : destination);
        targetY = height*(width <= 680 ? randomBetween(0.17,0.24) : randomBetween(0.18,0.26));
        targetZ = size*randomBetween(0.02,0.20);
        yaw = Math.atan2(z-targetZ,x-targetX);
        for (let sample=0;sample<trailSamples;sample++) {
          const i = ((trailSamples-sample)%trailSamples)*3;
          const distance = sample*size*trailSpacing;
          travelTrail[i] = x+Math.cos(yaw)*distance;
          travelTrail[i+1] = y;
          travelTrail[i+2] = z+Math.sin(yaw)*distance;
        }
      } else {
        const previousX = x, previousY = y, previousZ = z;
        x *= width / previousWidth;
        y *= height / previousHeight;
        z *= size / previousSize;
        targetX *= width / previousWidth;
        targetY *= height / previousHeight;
        targetZ *= size / previousSize;
        speed *= size / previousSize;
        const ratio = size/previousSize;
        for (let i=0;i<travelTrail.length;i+=3) {
          travelTrail[i] = x+(travelTrail[i]-previousX)*ratio;
          travelTrail[i+1] = y+(travelTrail[i+1]-previousY)*ratio;
          travelTrail[i+2] = z+(travelTrail[i+2]-previousZ)*ratio;
        }
        for (const bubble of bubbles) {
          bubble.x *= width/previousWidth;
          bubble.y *= height/previousHeight;
          bubble.worldZ *= size/previousSize;
        }
      }
      pixelRatio = clamp(Number(dpr) || 1, 1, 1.5);
      canvas.width = Math.round(width * pixelRatio);
      canvas.height = Math.round(height * pixelRatio);
      if (ready && !running) draw();
    }

    function swimPose() {
      const recoil = 0.012*effort*Math.cos(phase-1.58);
      const pitch = inclination*0.88-0.079*lift+0.12*arch+recoil;
      const headPitch = clamp(headInclination*0.53,-0.147,0.147)
        +glancePitch+0.043*effort*Math.sin(phase-0.40)-0.148*lift+0.18*arch;
      const smallMouth = smallExhaleTime === null ? 0
        : 0.22*smoothstep(0,0.14,smallExhaleTime)*(1-smoothstep(0.29,0.53,smallExhaleTime));
      const pose = {
        pitch, roll: bank, yaw, mouth: Math.max(mouth,smallMouth), headRoll:0,
        headYaw: clamp(neckLook+glanceYaw,-0.29,0.29),
        headPitch: clamp(headPitch-pitch,-0.34,0.34),
        melon: clamp(0.64*lift+0.41*mouth+melonGesture*(1-lift),-0.65,1),
        scale: size*swimDepth(),
      };
      // Equalize the projected eye heights, including the difference in
      // depth between the two sides of the face during an oblique pass.
      const [,eyeY,eyeZ] = headPointInCamera(-0.385,headAxisY,0,pose);
      const up = orientHeadVector(0,1,0,pose);
      const cheek = orientHeadVector(0,0,1,pose);
      const slope = vector => vector[1]*(1-swimPerspective*eyeZ)+swimPerspective*eyeY*vector[2];
      pose.headRoll = Math.atan2(slope(cheek),slope(up));
      return pose;
    }

    function swimDepth() {
      return clamp(0.86+0.145*z/size,0.68,1.02);
    }

    function projectMouth(pose, offset) {
      const [lipX,lipY,lipZ] = mouthCenter;
      const [lowerX,lowerY] = rotatePair(lipX-jawPivot[0],lipY-jawPivot[1],jawTravel*pose.mouth);
      const middleX = (lipX+jawPivot[0]+lowerX)*0.5;
      const middleY = (lipY+jawPivot[1]+lowerY)*0.5;
      const [mx,my,mz] = headPointInCamera(middleX-offset,middleY,lipZ,pose);
      const scale = pose.scale/(1-swimPerspective*mz);
      return {x:x+mx*scale, y:y-my*scale, z:mz};
    }

    function releaseBubble(pose, index) {
      const lip = projectMouth(pose,0.007);
      const forward = projectMouth(pose,0.063);
      const projectedTravel = speed*Math.cos(inclination);
      const draftX = -Math.cos(yaw)*projectedTravel;
      const draftZ = -Math.sin(yaw)*projectedTravel;
      const radius = index === 1 ? randomBetween(6.0,7.4) : randomBetween(2.3,4.7);
      bubbles.push({
        x: lip.x+randomBetween(-0.9,0.9), y: lip.y+randomBetween(-0.7,0.7),
        worldZ: z+lip.z*pose.scale,
        vx: 0.9*draftX+(forward.x-lip.x)*2.35+randomBetween(-6,6),
        vy: (forward.y-lip.y)*0.7-randomBetween(17,26),
        vz: 0.92*draftZ+(forward.z-lip.z)*pose.scale*2.35,
        age: 0, life: randomBetween(1.8,2.65),
        radius: radius*clamp(size/410,0.63,1.1), phase: randomBetween(0,6.28),
      });
    }

    function updateSmallExhale(dt, requested) {
      if (smallExhaleTime === null) {
        if (!requested || reverseTime !== null) return;
        const pose = swimPose();
        const lip = projectMouth(pose,0.008);
        if (lip.x < width*0.06 || lip.x > width*0.94 || lip.y < height*0.09) return;
        smallExhaleTime = 0;
      }
      const previous = smallExhaleTime;
      smallExhaleTime += dt;
      const pose = swimPose();
      for (const [index, at] of smallBubbleRelease.entries()) {
        if (previous >= at || smallExhaleTime < at || bubbles.length >= bubbleCapacity-bubbleRelease.length) continue;
        const lip = projectMouth(pose,0.016+0.003*index);
        const ahead = projectMouth(pose,0.062);
        const travel = speed * travelDirection * Math.cos(inclination);
        bubbles.push({
          x: lip.x, y: lip.y-0.7*index,
          worldZ: z+(lip.z+0.009)*pose.scale,
          vx: -travel*Math.cos(yaw)+3.7*(ahead.x-lip.x)+3*index,
          vy: -27-6*index,
          vz: -travel*Math.sin(yaw)+3.7*(ahead.z-lip.z)*pose.scale,
          age: 0, life: 1.38+0.17*index, rise: 1.55,
          radius: (3.05+0.7*index)*clamp(size/410,0.71,1.1),
          phase: phase+1.7*index,
        });
      }
      if (smallExhaleTime >= 0.53) smallExhaleTime = null;
    }

    function projectWake(pose, kind, index) {
      const aft = kind === 'tail';
      const sectionX = aft ? tailJoint : finRoot[0];
      // Sample the same centerline as the mesh. Offsets put the bubbles
      // just behind the flukes or outside the chest, in the moving water.
      const section = clamp((sectionX-neckPivot)/spineSpacing,0,spineSections-0.001);
      const row = Math.floor(section), t = section-row;
      const center = [], tangent = [];
      for (let axis=0;axis<3;axis++) {
        const i = row*3+axis;
        const a = centerline[i], b = centerline[i+3], c = centerline[i+6], d = centerline[i+9];
        const linear = 0.5*(c-a), quadratic = 0.5*(a-2*b+c), cubic = (d-a+3*(b-c))/6;
        center.push((a+4*b+c)/6+t*(linear+t*(quadratic+t*cubic)));
        tangent.push(linear+t*(2*quadratic+3*t*cubic));
      }
      const localPitch = Math.atan2(tangent[1],Math.hypot(tangent[0],tangent[2]));
      const localYaw = Math.atan2(tangent[2],tangent[0]);
      const side = aft ? (index%2 ? -1 : 1) : Math.sign(bank || 1);
      let mx = aft ? 0.085+0.026*index : 0.060+0.022*index;
      let my = aft ? -0.012+0.016*index : -0.116-0.022*index;
      let mz = side*(aft ? 0.072+0.017*index : 0.164+0.014*index);
      [my,mz] = rotatePair(my,mz,pose.roll*(aft ? 0.52 : 1));
      [mx,my] = rotatePair(mx,my,localPitch);
      [mx,mz] = rotatePair(mx,mz,localYaw);
      mx += center[0]-neckPivot;
      my += center[1];
      mz += center[2];
      [mx,my] = rotatePair(mx,my,pose.pitch);
      [mx,mz] = rotatePair(mx,mz,pose.yaw);
      [my,mz] = rotatePair(my,mz,viewTilt);
      const scale = pose.scale/(1-swimPerspective*mz);
      return [x+mx*scale,y-my*scale,mz];
    }

    function updateWake(dt, requested) {
      wakeCooldown = Math.max(0,wakeCooldown-dt);
      if (wake === null) {
        if (!requested || wakeCooldown > 0) return;
        wake = {kind:requested,time:0};
        wakeCooldown = 2.9;
      }
      const previous = wake.time;
      wake.time += dt;
      const times = wakeRelease[wake.kind];
      for (const [index, at] of times.entries()) {
        if (previous >= at || wake.time < at || bubbles.length >= bubbleCapacity-bubbleRelease.length) continue;
        const pose = swimPose();
        updateCenterline(pose);
        const [px,py,pz] = projectWake(pose,wake.kind,index);
        if (px < 0 || px > width || py < 0 || py > height) continue;
        bubbles.push({
          x:px, y:py, worldZ:z+pz*pose.scale,
          vx:(10+6*index)*Math.cos(yaw), vy:3-8*index, vz:8*Math.sin(yaw),
          age:0, life:1.3+0.17*index, rise:1.22,
          radius:(2.55+0.32*index)*clamp(size/410,0.78,1.1),
          phase:phase+2.2*index,
        });
      }
      if (wake.time >= times[times.length-1]) wake = null;
    }

    function updateBubbles(dt, requested) {
      for (let i=bubbles.length-1; i>=0; i--) {
        const bubble = bubbles[i];
        bubble.age += dt;
        if (bubble.age >= bubble.life) {
          bubbles.splice(i,1);
          continue;
        }
        const releaseMomentum = Math.exp(-2.5*bubble.age);
        bubble.x += (bubble.vx*releaseMomentum+5*Math.sin(bubble.phase+5*bubble.age))*dt;
        const rise = (21+19*smoothstep(0,1.5,bubble.age))*(bubble.rise ?? 1);
        bubble.y += (bubble.vy*releaseMomentum-rise)*dt;
        bubble.worldZ += bubble.vz*releaseMomentum*dt;
      }
      if (bubbleTime === null) {
        bubbleWait = Math.max(0,bubbleWait-dt);
        if (bubbleWait === 0 && depthChange === null && reverseTime === null &&
            Math.abs(glanceYaw) <= 0.09 && Math.abs(turnRate) <= 0.40) {
          const pose = swimPose();
          const lip = projectMouth(pose,0.011);
          const away = projectMouth(pose,0.041).z < lip.z-0.009;
          const visible = lip.x > width*0.09 && lip.x < width*0.91 && lip.y > height*0.12;
          if (!away && visible) {
            bubbleTime = 0;
            smallExhaleTime = null;
            nextBubble = 0;
          }
        }
        if (bubbleTime === null) {
          updateSmallExhale(dt,requested);
          return;
        }
      }
      bubbleTime += dt;
      lift = smoothstep(0,0.40,bubbleTime)*(1-smoothstep(0.80,bubbleDuration,bubbleTime));
      mouth = smoothstep(0.24,0.52,bubbleTime)*(1-smoothstep(1.02,1.46,bubbleTime));
      while (nextBubble < bubbleRelease.length && bubbleTime >= bubbleRelease[nextBubble]) {
        releaseBubble(swimPose(),nextBubble);
        nextBubble++;
      }
      if (bubbleTime >= bubbleDuration) {
        bubbleTime = null;
        mouth = lift = 0;
        bubbleWait = randomBetween(12,21);
      }
    }

    function drawBubbles(scale) {
      if (!bubbles.length) return;
      for (let i=0; i<bubbles.length; i++) {
        const bubble = bubbles[i];
        const t = bubble.age/bubble.life;
        const offset = i*bubbleStride;
        bubbleVertices[offset] = bubble.x/width*2-1;
        bubbleVertices[offset+1] = 1-bubble.y/height*2;
        const localDepth = (bubble.worldZ-z)/scale;
        const perspectiveDepth = 1-swimPerspective*clamp(localDepth,-1.15,0.75);
        bubbleVertices[offset+2] = clamp(-0.90*localDepth/perspectiveDepth,-0.99,0.99);
        bubbleVertices[offset+3] = bubble.radius*2*pixelRatio*(0.78+0.44*t);
        bubbleVertices[offset+4] = opacity*smoothstep(0,0.085,bubble.age)*(1-smoothstep(0.49,1,t));
        bubbleVertices[offset+5] = 1.11+0.10*Math.sin(bubble.phase+6*bubble.age);
      }
      gl.useProgram(bubbleProgram);
      gl.bindBuffer(gl.ARRAY_BUFFER,bubbleBuffer);
      gl.bufferSubData(gl.ARRAY_BUFFER,0,bubbleVertices);
      gl.enableVertexAttribArray(bubblePosition);
      gl.enableVertexAttribArray(bubbleAppearance);
      gl.vertexAttribPointer(bubblePosition,4,gl.FLOAT,false,24,0);
      gl.vertexAttribPointer(bubbleAppearance,2,gl.FLOAT,false,24,16);
      gl.depthMask(false);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.ONE,gl.ONE_MINUS_SRC_ALPHA);
      gl.drawArrays(gl.POINTS,0,bubbles.length);
      gl.disable(gl.BLEND);
      gl.depthMask(true);
      gl.disableVertexAttribArray(bubblePosition);
      gl.disableVertexAttribArray(bubbleAppearance);
    }

    function draw(pose) {
      if (!ready || disposed || failed || gl.isContextLost()) return;
      const still = Number.isFinite(pose?.yaw);
      const depth = still ? 1 : swimDepth();
      const view = still ? {yaw:pose.yaw, pitch:pose.pitch || 0, roll:pose.roll || 0,
        scale:Math.min(width*0.89,height*1.75), mouth:0, melon:0, headYaw:0, headPitch:0, headRoll:0} : swimPose();
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.useProgram(program);
      gl.bindBuffer(gl.ARRAY_BUFFER,vertexBuffer);
      for (const [location,components,offset] of attributes) {
        gl.enableVertexAttribArray(location);
        gl.vertexAttribPointer(location,components,gl.FLOAT,false,40,offset);
      }
      gl.uniform2f(uniform.uViewport, width, height);
      const perspective = still && Number.isFinite(pose.perspective) ? clamp(pose.perspective,0.18,0.84) : swimPerspective;
      gl.uniform4f(uniform.uPose, still ? width/2 : x, still ? height/2 : y,view.scale,perspective);
      gl.uniform3f(uniform.uView,view.roll,view.pitch,view.yaw);
      gl.uniform1f(uniform.uSteering,clamp(turnRate/0.52,-1,1));
      gl.uniform3f(uniform.uFinControl,finPhase,finTrim,reverseDrive);
      gl.uniform3f(uniform.uHeadPose,view.headYaw,view.headPitch,view.headRoll);
      if (!still) {
        updateCenterline(view);
        gl.uniform3fv(uniform.uCenterline,centerline);
      }
      gl.uniform1f(uniform.uPhase, phase);
      gl.uniform1f(uniform.uEffort, effort);
      gl.uniform1f(uniform.uDeform, still ? 0 : 1);
      gl.uniform1f(uniform.uMouth,view.mouth);
      gl.uniform1f(uniform.uMelon,view.melon);
      gl.uniform1f(uniform.uDark, dark ? 1 : 0);
      gl.uniform1f(uniform.uDepth, clamp((1 - depth) / 0.28, 0, 1));
      gl.drawElements(gl.TRIANGLES, indexCount, gl.UNSIGNED_SHORT, 0);
      if (!still) drawBubbles(view.scale);
    }

    function tick(now) {
      frame = 0;
      if (!running || !ready || disposed || failed) return;
      const dt = last === null ? 0 : clamp((now - last) / 1000, 0, 1 / 30);
      last = now;
      if (dt) swim(dt);
      try {
        draw();
        frame = requestAnimationFrame(tick);
      } catch (error) {
        fail(error);
      }
    }

    function start() {
      if (disposed || failed || running) return;
      running = true;
      last = null;
      if (ready && !frame) frame = requestAnimationFrame(tick);
    }

    function loadImage(url) {
      return new Promise((resolve, reject) => {
        const image = new Image();
        function finish() {
          image.onload = image.onerror = null;
          cancelImageLoads.delete(cancel);
        }
        function cancel() {
          finish();
          image.removeAttribute('src');
          reject(new Error('The whale image load was cancelled.'));
        }
        cancelImageLoads.add(cancel);
        image.onload = () => { finish(); resolve(image); };
        image.onerror = () => { finish(); reject(new Error('Could not load the local whale image.')); };
        image.src = url;
      });
    }

    function compile(type, source) {
      const shader = gl.createShader(type);
      shaders.add(shader);
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader));
      return shader;
    }

    function linkProgram(vertexSource,fragmentSource) {
      const vertex = compile(gl.VERTEX_SHADER,vertexSource);
      const fragment = compile(gl.FRAGMENT_SHADER,fragmentSource);
      const linked = gl.createProgram();
      gl.attachShader(linked,vertex);
      gl.attachShader(linked,fragment);
      gl.linkProgram(linked);
      const succeeded = gl.getProgramParameter(linked,gl.LINK_STATUS);
      const issue = succeeded ? null : gl.getProgramInfoLog(linked);
      for (const shader of [vertex,fragment]) {
        gl.detachShader(linked,shader);
        gl.deleteShader(shader);
        shaders.delete(shader);
      }
      if (!succeeded) {
        gl.deleteProgram(linked);
        throw new Error(issue);
      }
      return linked;
    }

    async function initialize() {
      const materialURLs = [options.atlasURL, options.cheekURL, options.melonURL];
      if (materialURLs.some(url => !url)) throw new Error('The whale needs its local textures.');
      gl = canvas.getContext('webgl', { alpha: true, antialias: true, premultipliedAlpha: true, powerPreference: 'low-power' });
      if (!gl) throw new Error('WebGL is unavailable for the whale.');
      canvas.addEventListener('webglcontextlost', onContextLost);
      const images = await Promise.all(materialURLs.map(loadImage));
      if (disposed || failed) return;

      program = linkProgram(vertexSource,fragmentSource);
      gl.useProgram(program);

      for (const name of ['uViewport','uPose','uView','uSteering','uHeadPose','uFinControl',
        'uPhase','uEffort','uDeform','uMouth','uMelon','uDark','uDepth']) {
        uniform[name] = gl.getUniformLocation(program, name);
      }
      uniform.uCenterline = gl.getUniformLocation(program,'uCenterline[0]');
      const mesh = makeMesh();
      indexCount = mesh.indices.length;
      vertexBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, mesh.vertices, gl.STATIC_DRAW);
      for (const [name,components,offset] of meshAttributes) {
        attributes.push([gl.getAttribLocation(program,name),components,offset]);
      }
      indexBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, mesh.indices, gl.STATIC_DRAW);

      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
      ['uTexture', 'uCheekTexture', 'uMelonTexture'].forEach((name, unit) => {
        const texture = gl.createTexture();
        textures.add(texture);
        gl.activeTexture(gl.TEXTURE0 + unit);
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, images[unit]);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.uniform1i(gl.getUniformLocation(program,name), unit);
      });
      gl.enable(gl.DEPTH_TEST);
      gl.enable(gl.CULL_FACE);

      bubbleProgram = linkProgram(bubbleVertexSource,bubbleFragmentSource);
      bubblePosition = gl.getAttribLocation(bubbleProgram,'aBubble');
      bubbleAppearance = gl.getAttribLocation(bubbleProgram,'aAppearance');
      bubbleBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER,bubbleBuffer);
      gl.bufferData(gl.ARRAY_BUFFER,bubbleVertices.byteLength,gl.DYNAMIC_DRAW);

      ready = true;
      draw();
      resolveReady(api);
      if (running && !frame) frame = requestAnimationFrame(tick);
    }

    const api = {
      ready: readyPromise,
      start, stop, resize, destroy,
      setTheme(value) { dark = Boolean(value); if (!running) draw(); },
      renderOnce: draw,
    };
    resize(canvas.clientWidth || window.innerWidth, canvas.clientHeight || window.innerHeight);
    initialize().catch(fail);
    return api;
  };
})();
