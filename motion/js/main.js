const{OrbitControls,GLTFLoader,DRACOLoader}=window.THREE_ADDONS,lenis=new Lenis({duration:1.5,easing:e=>Math.min(1,1.001-Math.pow(2,-10*e))}),bgScene=new THREE.Scene;bgScene.background=new THREE.Color(16644853);const scene=new THREE.Scene,camera=new THREE.PerspectiveCamera(75,window.innerWidth/window.innerHeight,.1,1e3);camera.position.set(0,1,5);const rendererBg=new THREE.WebGLRenderer({antialias:!0});rendererBg.setSize(window.innerWidth,window.innerHeight),rendererBg.setPixelRatio(window.devicePixelRatio),rendererBg.domElement.style.position="fixed",rendererBg.domElement.style.top="0",rendererBg.domElement.style.left="0",rendererBg.domElement.style.zIndex="1",document.body.appendChild(rendererBg.domElement);const renderer=new THREE.WebGLRenderer({antialias:!0,alpha:!0});renderer.setSize(window.innerWidth,window.innerHeight),renderer.setPixelRatio(window.devicePixelRatio),renderer.outputColorSpace=THREE.SRGBColorSpace,renderer.domElement.style.position="fixed",renderer.domElement.style.top="0",renderer.domElement.style.left="0",renderer.domElement.style.zIndex="3",document.body.appendChild(renderer.domElement);const controls=new OrbitControls(camera,renderer.domElement);controls.enabled=!1,controls.enableDamping=!0,controls.dampingFactor=.05;const ambientLight=new THREE.AmbientLight(16777215,1);scene.add(ambientLight);const directionalLight=new THREE.DirectionalLight(16777215,2);directionalLight.position.set(5,10,5),scene.add(directionalLight);const directionalLight2=new THREE.DirectionalLight(16777215,1);directionalLight2.position.set(-5,-5,-5),scene.add(directionalLight2);let mixer;const clock=new THREE.Clock,targetMouse=new THREE.Vector2(.5,.5),_revealVec=new THREE.Vector3,shaderUniforms={time:{value:0},mouse:{value:new THREE.Vector2(.5,.5)},resolution:{value:new THREE.Vector2(window.innerWidth,window.innerHeight)},bgColor:{value:new THREE.Color(16644853)},colorCyan:{value:new THREE.Color(15248176)},colorPurple:{value:new THREE.Color(14382854)},colorBlue:{value:new THREE.Color(16096779)},colorPeach:{value:new THREE.Color(11817737)},colorHotPink:{value:new THREE.Color(16112009)},edgeBlurAmount:{value:.5},uRevealProgress:{value:0},uRevealOrigin:{value:new THREE.Vector2(.5,.5)}},animatedMaterials=[],bgGeo=new THREE.PlaneGeometry(2,2),bgMat=new THREE.ShaderMaterial({uniforms:{time:shaderUniforms.time,mouse:shaderUniforms.mouse,bgColor:shaderUniforms.bgColor,resolution:shaderUniforms.resolution,colorCyan:shaderUniforms.colorCyan,colorBlue:shaderUniforms.colorBlue,colorHotPink:shaderUniforms.colorHotPink,colorPeach:shaderUniforms.colorPeach},vertexShader:`
    varying vec2 vUv;
    void main() {
      vUv = uv;
      // Lock the plane to the screen completely ignoring the camera
      gl_Position = vec4(position.xy, 1.0, 1.0); 
    }
  `,fragmentShader:`
    uniform float time;
    uniform vec2 mouse;
    uniform vec3 bgColor;
    uniform vec2 resolution;
    uniform vec3 colorCyan;
    uniform vec3 colorBlue;
    uniform vec3 colorHotPink;
    uniform vec3 colorPeach;
    varying vec2 vUv;
    
    // 2D Rotation for organic noise
    mat2 rotate2d(float _angle){
        return mat2(cos(_angle),-sin(_angle),
                    sin(_angle),cos(_angle));
    }
    
    void main() {
       float pixelSize = 15.0; 
       vec2 screenUv = vUv; 
       float aspect = resolution.x / resolution.y;
       vec2 aspectUv = vec2(screenUv.x * aspect, screenUv.y);
       
       vec2 gridUv = aspectUv * (resolution.y / pixelSize);
       vec2 localUv = fract(gridUv) - 0.5;
       
       // --- 1. Procedural Background Colors ---
       float wave1 = sin(aspectUv.x * 4.0 - time * 0.8);
       float wave2 = cos(aspectUv.y * 3.0 + time * 0.6);
       float combinedWave = smoothstep(-0.8, 0.8, (wave1 + wave2) * 0.5);
       float wavePeach = sin(aspectUv.y * 3.0 - aspectUv.x * 2.0 + time * 0.9) * 0.5 + 0.5;
       
       vec3 mixColor = mix(colorBlue, colorCyan, combinedWave);
       vec3 pinkTransition = mix(mixColor, colorHotPink, smoothstep(0.1, 0.7, wavePeach));
       mixColor = mix(pinkTransition, colorPeach, smoothstep(0.5, 1.0, wavePeach));
       vec3 lightGridColor = mix(mixColor, vec3(1.0), 0.6);
       
       // --- 2. ASCII Grid ---
       float boxSize = 0.3 + sin(time * 2.0 + gridUv.x * 0.2 + gridUv.y * 0.2) * 0.1;
       float radius = 0.12; 
       float d = length(max(abs(localUv) - (boxSize - radius), 0.0)) - radius;
       float alpha = smoothstep(0.05, 0.0, d);
       
       // --- 3. Interactive Organic Masking ---
       // Parallax radial mask: center shifts slightly towards the mouse
       vec2 radialCenter = mix(vec2(0.5, 0.5), mouse, 0.3);
       float radialMask = smoothstep(0.7, 0.1, distance(screenUv, radialCenter));
       
       vec2 p = aspectUv * 3.0;
       
       vec2 mouseAspect = vec2(mouse.x * aspect, mouse.y);
       float mouseDist = distance(aspectUv, mouseAspect);
       
       // Multi-layered rotated sine waves for blobs
       float noise = 0.0;
       noise += sin(p.x + time * 0.4) * sin(p.y + time * 0.3);
       p *= rotate2d(1.1);
       noise += sin(p.x * 1.5 - time * 0.5) * sin(p.y * 1.5 + time * 0.2);
       p *= rotate2d(2.3);
       noise += sin(p.x * 2.0 + time * 0.3) * sin(p.y * 2.0 - time * 0.4);
       
       // Dynamic shape morphing instead of space warping (prevents stretched ray artifacts)
       // Creates an organic ripple/push effect that morphs the blobs near the cursor
       noise += cos(mouseDist * 12.0 - time * 3.0) * smoothstep(0.6, 0.0, mouseDist) * 1.2;
       
       float blobMask = smoothstep(0.0, 1.5, noise);
       
       // Extra interactive element: reveal ASCII grid brightly right at the cursor
       float cursorHighlight = smoothstep(0.2, 0.0, mouseDist);
       
       float finalMask = clamp((radialMask * blobMask) + (cursorHighlight * 0.5), 0.0, 1.0);
       float finalAlpha = alpha * finalMask * 0.85; 
       
       vec3 finalColor = mix(bgColor, lightGridColor, finalAlpha);
       gl_FragColor = vec4(finalColor, 1.0);
    }
  `,depthWrite:!1,depthTest:!1}),bgMesh=new THREE.Mesh(bgGeo,bgMat);bgMesh.renderOrder=-1,bgMesh.frustumCulled=!1,bgScene.add(bgMesh);const guiParams={bgColor:"#fdfaf5",edgeBlur:.5,colorCyan:"#"+shaderUniforms.colorCyan.value.getHexString(),colorPurple:"#"+shaderUniforms.colorPurple.value.getHexString(),colorBlue:"#"+shaderUniforms.colorBlue.value.getHexString(),colorPeach:"#"+shaderUniforms.colorPeach.value.getHexString(),colorHotPink:"#"+shaderUniforms.colorHotPink.value.getHexString(),phase4X:-1.35,phase4Y:-5.4,phase4Z:5.67,phase4Scale:.85,phase4RotX:0,phase4RotY:.6723,phase4RotZ:0},dracoLoader=new DRACOLoader;dracoLoader.setDecoderPath("https://www.gstatic.com/draco/versioned/decoders/1.5.7/");const loader=new GLTFLoader;loader.setDRACOLoader(dracoLoader),loader.parse(window.SITE_ASSETS.modelGlb,"",e=>{const n=e.scene,u=new THREE.Box3().setFromObject(n).getSize(new THREE.Vector3),s=Math.max(u.x,u.y,u.z);if(window.modelMaxDim=s,s>0){const o=5/s;n.scale.setScalar(o),window.baseModelScale=o}else window.baseModelScale=1;const f=new THREE.Box3().setFromObject(n).getCenter(new THREE.Vector3);n.position.sub(f),n.position.set(.1,-3.93,4.17),n.rotation.set(-.05026,-.92781,-.12566),window.mainModel=n,window.mainModel.visible=!1,camera.position.set(-1.8,-1,6.5),camera.lookAt(-1.8,.5,0),controls.target.set(-1.8,.5,0),controls.update(),window.applyHolographicShader=function(o){o.onBeforeCompile=i=>{i.uniforms.time=shaderUniforms.time,i.uniforms.colorCyan=shaderUniforms.colorCyan,i.uniforms.colorPurple=shaderUniforms.colorPurple,i.uniforms.colorBlue=shaderUniforms.colorBlue,i.uniforms.colorPeach=shaderUniforms.colorPeach,i.uniforms.colorHotPink=shaderUniforms.colorHotPink,i.uniforms.edgeBlurAmount=shaderUniforms.edgeBlurAmount,i.uniforms.uRevealProgress=shaderUniforms.uRevealProgress,i.uniforms.uRevealOrigin=shaderUniforms.uRevealOrigin,i.uniforms.resolution=shaderUniforms.resolution,i.vertexShader=`
          varying vec3 vLocalPosition;
        `+i.vertexShader,i.vertexShader=i.vertexShader.replace("#include <begin_vertex>",`#include <begin_vertex>
           #ifdef USE_INSTANCING
             vLocalPosition = (instanceMatrix * vec4(position, 1.0)).xyz;
           #else
             vLocalPosition = position;
           #endif
          `),i.fragmentShader=`
          uniform float time;
          uniform float edgeBlurAmount;
          uniform float uRevealProgress;
          uniform vec2 uRevealOrigin;
          uniform vec2 resolution;
          uniform vec3 colorCyan;
          uniform vec3 colorPurple;
          uniform vec3 colorBlue;
          uniform vec3 colorPeach;
          uniform vec3 colorHotPink;
          varying vec3 vLocalPosition;
        `+i.fragmentShader,i.fragmentShader=i.fragmentShader.replace("#include <dithering_fragment>",`#include <dithering_fragment>
           vec3 vDir = normalize( vViewPosition );
           float fresnel = 1.0 - max(dot(vDir, normal), 0.0);
           float fresnelPow = pow(fresnel, 2.0); // Softer fresnel falloff
           
           // Procedural waves (softer, slower)
           // Bind to local position so waves stick to the geometry during rotation
           float wave1 = sin(vLocalPosition.x * 2.0 - time * 1.0);
           float wave2 = cos(vLocalPosition.y * 1.5 + time * 0.8);
           float wave3 = sin(vLocalPosition.z * 2.5 + time * 0.5);
           float combinedWave = (wave1 + wave2 + wave3) / 3.0; 
           combinedWave = smoothstep(-0.5, 0.5, combinedWave); // Softer mixing
           
           float wavePeachRaw = sin(vLocalPosition.y * 2.0 - vLocalPosition.x * 1.0 + time * 1.2);
           // Normalize to 0..1 for clean blending
           float wavePeach = wavePeachRaw * 0.5 + 0.5;
           
           // 1. Base cold colors (Blue -> Cyan)
           vec3 mixColor = mix(colorBlue, colorCyan, combinedWave);
           
           // 2. Clean transition to warm colors
           // Smooth, gentle transitions between the pastel tones
           vec3 pinkTransition = mix(mixColor, colorHotPink, smoothstep(0.2, 0.8, wavePeach));
           mixColor = mix(pinkTransition, colorPeach, smoothstep(0.5, 0.95, wavePeach));
           
           // 3. Purple rim light
           mixColor = mix(mixColor, colorPurple, fresnel);
           
           // Glowing rim effect (softer)
           vec3 glow = colorCyan * fresnelPow * 1.5;
           
           // Curved, softer lines
           // Add distortion using X and Z to make the lines wavy/curved
           float distortion = sin(vLocalPosition.x * 2.5 + time * 0.5) * 0.4 + cos(vLocalPosition.z * 2.0) * 0.4;
           float curvedY = vLocalPosition.y + distortion;
           
           // Less quantity (multiplier 1.2), slower movement
           float lines = fract((curvedY - time * 0.2) * 1.2);
           
           // Very soft transition for the lines
           float lineIntensity = smoothstep(0.2, 0.6, lines) * smoothstep(1.0, 0.6, lines);
           vec3 lineGlow = vec3(1.0, 0.76, 0.30) * lineIntensity * (0.3 + fresnel * 1.0);
           
           vec3 finalEmission = mixColor * 0.6 + glow + lineGlow;
           
           // --- ASCII Dynamic Shapes Effect ---
           float pixelSize = 8.0; 
           vec2 localUv = fract(gl_FragCoord.xy / pixelSize) - 0.5;
           
           float luma = dot(finalEmission, vec3(0.2126, 0.7152, 0.0722));
           
           // 1. Dynamic Size: scale dramatically based on brightness
           float currentSize = clamp(luma * 1.2, 0.05, 0.45);
           
           // 2. Dynamic Shape: morph from square to circle based on color!
           // wavePeach controls the warm colors. 
           // 0.0 (Cold blue/cyan) = Sharp Squares
           // 1.0 (Warm pink/peach) = Perfect Circles
           float currentRadius = mix(0.0, currentSize, wavePeach);
           
           // SDF for dynamic rounded box
           float d = length(max(abs(localUv) - (currentSize - currentRadius), 0.0)) - currentRadius;
           float shapeAlpha = smoothstep(1.5 / pixelSize, 0.0, d);
           
           // Keep discard for the ASCII grid so depth sorting works correctly
           if (shapeAlpha < 0.1) discard;
           
           // Soften/blur the geometric edges of the model using the fresnel angle
           // Dynamic blur controlled by the slider (0.0 = sharp, 1.0 = extreme blur)
           float edgeStart = mix(1.0, 0.7, edgeBlurAmount);
           float edgeEnd = mix(0.99, 0.1, edgeBlurAmount);
           float edgeBlur = smoothstep(edgeStart, edgeEnd, fresnel);
           
           finalEmission *= 1.2; // Boost brightness a bit
           
           // --- SPECTACULAR 2D SCREEN-SPACE REVEAL ---
           // We use screen coordinates so the reveal is perfectly consistent 
           // regardless of how the 3D model is scaled or offset internally!
           vec2 screenUv = gl_FragCoord.xy / resolution.xy;
           screenUv.x *= resolution.x / resolution.y; // correct aspect ratio
           
           // Only carve out the reveal DURING the intro animation. Once it completes the discard is
           // fully disabled, so the model can NEVER be hidden again no matter where it flies during
           // the scroll choreography (fixes the model vanishing when scrolling into the finale).
           if (uRevealProgress < 0.999) {
             // Reveal emanates from the model's ACTUAL on-screen center (updated every frame on the CPU).
             vec2 revealOrigin = uRevealOrigin;
             float distFromCenter2D = distance(screenUv, revealOrigin);

             // Expand radius generously so the whole model is guaranteed to be revealed by the end.
             float currentRadius2D = uRevealProgress * 3.0;

             // Add digital grid noise based on pixel coordinates for a dissolving edge.
             float gridRandom = fract(sin(dot(floor(gl_FragCoord.xy / 8.0), vec2(12.9898, 78.233))) * 43758.5453);
             // Fade the noise out as the reveal completes so nothing stays permanently carved away.
             float noisyRadius2D = currentRadius2D - gridRandom * 0.15 * (1.0 - uRevealProgress);

             if (distFromCenter2D > noisyRadius2D) {
               discard;
             }

             // Glowing edge at the expansion border
             float revealEdge = smoothstep(noisyRadius2D - 0.05, noisyRadius2D, distFromCenter2D);
             vec3 revealGlow = colorHotPink * revealEdge * 3.0 + colorCyan * pow(revealEdge, 4.0) * 8.0;
             finalEmission += revealGlow;
           }
           
           // Multiply alpha by edgeBlur to make the silhouette soft and blurry
           gl_FragColor = vec4(gl_FragColor.rgb + finalEmission, gl_FragColor.a * shapeAlpha * edgeBlur);
          `)}},n.traverse(o=>{if(o.isMesh){const i=new THREE.MeshPhysicalMaterial({color:65795,metalness:.9,roughness:.2,clearcoat:1,clearcoatRoughness:.1,transparent:!0,opacity:.95,side:THREE.DoubleSide});window.applyHolographicShader(i),o.material=i}}),scene.add(n),n.traverse(o=>{o.isMesh&&(window.mainModelMaterial=o.material)}),window.logoParticles=null;const p=new Image;p.src=window.SITE_ASSETS.logoSvg,p.onload=()=>{const o=document.createElement("canvas"),i=o.getContext("2d",{willReadFrequently:!0}),y=p.height/p.width;o.width=450,o.height=Math.floor(450*y),i.drawImage(p,0,0,o.width,o.height);const m=i.getImageData(0,0,o.width,o.height),g=[],v=(l,t)=>l<0||l>=o.width||t<0||t>=o.height?0:m.data[(t*o.width+l)*4+3],M=.25;for(let l=0;l<o.height;l++)for(let t=0;t<o.width;t++)if(v(t,l)>128&&(g.push({x:t,y:l,z:M/2,isAmbient:0}),g.push({x:t,y:l,z:-M/2,isAmbient:0}),v(t-1,l)<128||v(t+1,l)<128||v(t,l-1)<128||v(t,l+1)<128))for(let c=1;c<3;c++){const h=-M/2+M*c/3;g.push({x:t,y:l,z:h,isAmbient:0})}const T=3500;for(let l=0;l<T;l++)g.push({x:o.width/2+(Math.random()-.5)*o.width*3,y:o.height/2+(Math.random()-.5)*o.height*10,z:(Math.random()-.5)*20,isAmbient:1});const R=5.7/o.width,x=g.length,b=new Float32Array(x*3),C=new Float32Array(x*3),H=new Float32Array(x),I=new Float32Array(x);for(let l=0;l<x;l++){const t=g[l],w=(Math.random()-.5)*1.2,a=(Math.random()-.5)*1.2,c=(Math.random()-.5)*.1,h=(t.x+w-o.width/2)*R,S=-(t.y+a-o.height/2)*R,E=t.z+c;b[l*3+0]=h,b[l*3+1]=S,b[l*3+2]=E;const A=Math.random()*Math.PI*2,L=25+Math.random()*25,k=Math.cos(A)*L,z=(Math.random()-.5)*45,U=Math.sin(A)*L;C[l*3+0]=k,C[l*3+1]=z,C[l*3+2]=U;const D=Math.sqrt(Math.pow(t.x-o.width/2,2)+Math.pow(t.y-o.height/2,2))/(o.width/2);H[l]=Math.random()*.5+D*.5,I[l]=t.isAmbient||0}const P=new THREE.BufferGeometry;P.setAttribute("position",new THREE.BufferAttribute(b,3)),P.setAttribute("aRandomPosition",new THREE.BufferAttribute(C,3)),P.setAttribute("aDelay",new THREE.BufferAttribute(H,1)),P.setAttribute("aIsAmbient",new THREE.BufferAttribute(I,1));const B=new THREE.ShaderMaterial({uniforms:{time:shaderUniforms.time,uProgress:{value:0},uScale:{value:1},uShatterFade:{value:0},colorCyan:shaderUniforms.colorCyan,colorBlue:shaderUniforms.colorBlue,colorPeach:shaderUniforms.colorPeach,colorHotPink:shaderUniforms.colorHotPink},vertexShader:`
          uniform float time;
          uniform float uProgress;
          uniform float uScale;
          attribute vec3 aRandomPosition;
          attribute float aDelay;
          attribute float aIsAmbient;
          varying vec3 vLocalPosition;
          varying float vIsAmbient;
          
          void main() {
            vLocalPosition = position; 
            vIsAmbient = aIsAmbient;
            
            float safeProgress = clamp(uProgress, 0.0, 1.0);
            
            float startThreshold = aDelay * 0.4;
            float particleProgress = clamp((safeProgress - startThreshold) / (1.0 - startThreshold), 0.0, 1.0);
            
            // Sharper ease out so they snap firmly into place
            float rushEase = 1.0 - pow(1.0 - particleProgress, 4.0);
            
            // Clean Spin: rotate the random position around Y axis (Local Space)
            float spin = (1.0 - particleProgress) * 10.0;
            float s = sin(spin);
            float c = cos(spin);
            
            vec3 spiraledPos = aRandomPosition;
            spiraledPos.x = aRandomPosition.x * c - aRandomPosition.z * s;
            spiraledPos.z = aRandomPosition.x * s + aRandomPosition.z * c;
            
            // FLATTEN the depth of shattered particles so they stay close to the camera 
            // and don't shrink into tiny specks due to 3D perspective!
            spiraledPos.z *= 0.15;
            
            // Smooth vertical convergence without crazy noise
            spiraledPos.y = mix(spiraledPos.y, position.y, rushEase);
            
            vec3 currentPos = mix(spiraledPos, position, rushEase);
            
            // Add continuous slow drift to ambient particles AND shattered logo particles!
            // rushEase is 1.0 when assembled, 0.0 when scattered. 
            // So (1.0 - rushEase) makes them drift only when scattered!
            float driftFactor = (aIsAmbient > 0.5) ? 1.0 : (1.0 - rushEase);
            if (driftFactor > 0.01) {
               currentPos.x += sin(time * 0.4 + aRandomPosition.y) * 1.5 * driftFactor;
               currentPos.y += cos(time * 0.3 + aRandomPosition.x) * 1.5 * driftFactor;
               currentPos.z += sin(time * 0.5 + aRandomPosition.z) * 1.5 * driftFactor;
            }
            
            vec4 mvPosition = modelViewMatrix * vec4(currentPos, 1.0);
            
            // Expand the base size of shattered logo particles by 4x to counteract any depth shrinking
            float shatterBoost = mix(4.5, 1.0, rushEase);
            float baseSize = (aIsAmbient > 0.5 ? 40.0 : (16.0 * shatterBoost)) * uScale;
            
            // Point size attenuation with less aggressive clamping
            gl_PointSize = clamp(baseSize / max(0.5, -mvPosition.z), 4.0, 120.0); 
            
            gl_Position = projectionMatrix * mvPosition;
          }
        `,fragmentShader:`
          uniform float time;
          uniform float uProgress;
          uniform float uShatterFade;
          uniform vec3 colorCyan;
          uniform vec3 colorBlue;
          uniform vec3 colorPeach;
          uniform vec3 colorHotPink;
          varying vec3 vLocalPosition;
          varying float vIsAmbient;
          
          void main() {
            vec2 cxy = 2.0 * gl_PointCoord - 1.0;
            float r = dot(cxy, cxy);
            if (r > 1.0) discard;
            
            float dist = sqrt(r);
            // Stronger core, softer edge for a denser "juicy" look without additive washout
            float glow = smoothstep(1.0, 0.2, dist);
            
            // Spatial Gradient + Flowing Time Animation
            float waveX = sin(time * 1.5) * 1.5; 
            float waveY = cos(time * 1.2) * 0.8;
            
            // Map ambient particles into the gradient bounds so they shimmer too
            float effX = vIsAmbient > 0.5 ? mod(vLocalPosition.x + time, 6.0) - 3.0 : vLocalPosition.x;
            float effY = vIsAmbient > 0.5 ? mod(vLocalPosition.y + time, 2.0) - 1.0 : vLocalPosition.y;
            
            float tX = smoothstep(-3.0, 3.0, effX + waveX);
            float tY = smoothstep(-1.0, 1.0, effY + waveY);
            
            // Bilinear blend of 4 colors
            vec3 leftColor = mix(colorBlue, colorCyan, tY);
            vec3 rightColor = mix(colorHotPink, colorPeach, tY);
            
            // Boost the vibrancy of the colors to make them "juicy"
            vec3 finalColor = mix(leftColor, rightColor, tX) * 1.4;
            
            // Fade out logo particles during the final shatter phase, but keep ambient particles fully visible
            float alphaMultiplier = vIsAmbient > 0.5 ? 1.0 : (1.0 - uShatterFade);
            
            // Global fade-in to prevent abrupt popping when they first appear
            float globalFadeIn = smoothstep(0.0, 0.15, uProgress);
            
            gl_FragColor = vec4(finalColor, glow * alphaMultiplier * globalFadeIn);
          }
        `,transparent:!0,depthWrite:!1,blending:THREE.NormalBlending});window.logoParticles=new THREE.Points(P,B),window.logoParticles.position.set(-.6,-2,-3),window.logoParticles.frustumCulled=!1,window.logoParticles.visible=!1,scene.add(window.logoParticles)},e.animations&&e.animations.length>0&&(mixer=new THREE.AnimationMixer(n),e.animations.forEach(o=>{mixer.clipAction(o).play()}))},e=>{console.error("An error happened while loading the model:",e);const n=document.createElement("div");n.style.cssText="position:absolute;top:10px;left:10px;color:red;background:white;padding:10px;border:2px solid red;z-index:9999;font-family:sans-serif;",n.innerText="Error loading model: "+(e.message||e),document.body.appendChild(n)});let scrollProgress=0,_ratio=window.innerWidth/1200,responsiveScale=_ratio<=1?_ratio:1+(_ratio-1)*.4;const PORTRAIT_FULL_ASPECT=.5,PORTRAIT_EXTRA_CAM_Z=2.5,PORTRAIT_PHASE4_LIFT=1.6,portraitFitFor=e=>THREE.MathUtils.clamp((1-e)/(1-PORTRAIT_FULL_ASPECT),0,1);let portraitFit=portraitFitFor(window.innerWidth/window.innerHeight);function robotTargetX(e,n,d){const u=THREE.MathUtils.lerp(-.6,-.5,e),s=THREE.MathUtils.lerp(u,guiParams.phase4X,n);return THREE.MathUtils.lerp(s,-.4,d)}window.addEventListener("scroll",()=>{const e=document.body.scrollHeight-window.innerHeight,n=window.innerHeight*1,d=Math.max(1,e-n);scrollProgress=window.scrollY/d,scrollProgress=Math.max(0,Math.min(scrollProgress,1))});const word1=document.getElementById("word1"),word2=document.getElementById("word2"),word3=document.getElementById("word3"),word4=document.getElementById("word4"),word5=document.getElementById("word5"),glassContainer=document.getElementById("glass-container");function updateWordAnimation(e,n,d,u,s=!1){if(!e)return;if(n<=d){e.style.opacity="0";return}let r=(n-d)/(u-d);if(!s&&r>=1){e.style.opacity="0";return}let f,p,o,i;if(s&&r>1){const y=Math.min(1,(r-1)/1.25),m=y*y;if(f=0,p=0-m*100,o=0,i=-800,e.style.opacity="1",e.children.length>0){const g=[.8,1.4,.5,1.7,.9,1.2];for(let v=0;v<e.children.length;v++){const M=e.children[v],T=g[v%g.length],R=-(m*60*T),x=m*24*T;M.style.transform=`translate3d(0, ${R}vh, 0)`,M.style.opacity="1",M.style.filter=x>.1?`blur(${x}px)`:"none"}}}else{const y=m=>.5-Math.cos(m*Math.PI)/2;if(s)f=1400-y(r)*1400,p=80-(1-Math.pow(1-r,3))*80;else{f=1400-y(r)*3100;const m=Math.min(1,r/.55);p=80-(1-Math.pow(1-m,3))*80}if(o=-(f/800)*60,i=-800,e.children.length>0){const m=e.children.length;for(let g=0;g<m;g++){const v=e.children[g],M=g/m*.25;let R=(r-M)/.35;R=Math.max(0,Math.min(1,R));let x=Math.min(1,R/.5);const b=1-Math.pow(1-R,3);let C=60-b*60,H=24-b*24;if(!s){const I=g/m*.15;let P=(r-(.5+I))/.25;if(P=Math.max(0,Math.min(1,P)),P>0){const B=P*P;C-=B*60,H+=B*24,x=Math.min(x,1-P)}}v.style.transform=`translate3d(0, ${C}vh, 0)`,v.style.opacity=x.toString(),v.style.filter=H>.1?`blur(${H}px)`:"none"}e.style.opacity="1"}else{let m=1;r<.1?m=r/.1:!s&&r>.8&&(m=1-(r-.8)/.2),e.style.opacity=m.toString()}}e.style.transform=`translate3d(calc(-50% + ${f}px), calc(-50% + ${p}vh), ${i}px) rotateY(${o}deg)`}window.addEventListener("mousemove",e=>{targetMouse.x=e.clientX/window.innerWidth,targetMouse.y=1-e.clientY/window.innerHeight}),window.addEventListener("resize",()=>{camera.aspect=window.innerWidth/window.innerHeight,camera.updateProjectionMatrix(),rendererBg.setSize(window.innerWidth,window.innerHeight),renderer.setSize(window.innerWidth,window.innerHeight),shaderUniforms.resolution.value.set(window.innerWidth,window.innerHeight);let e=window.innerWidth/1200;responsiveScale=e<=1?e:1+(e-1)*.4,portraitFit=portraitFitFor(camera.aspect)});let preloaderDone=!1,preloaderCurrentPercent=0,preloaderTargetPercent=0,preloaderShatter=0;const preloaderPointsGeo=new THREE.PlaneGeometry(4,4),preloaderPointsMat=new THREE.ShaderMaterial({uniforms:{time:shaderUniforms.time,colorCyan:shaderUniforms.colorCyan,colorPurple:shaderUniforms.colorPurple,colorBlue:shaderUniforms.colorBlue,colorPeach:shaderUniforms.colorPeach,colorHotPink:shaderUniforms.colorHotPink,uShatter:{value:0}},vertexShader:`
    uniform float uShatter;
    varying vec2 vUv;
    void main() {
      vUv = uv;
      vec3 pos = position;
      // Expand while scattering
      pos *= (1.0 + uShatter * 2.0); 
      gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    }
  `,fragmentShader:`
    uniform float time;
    uniform float uShatter;
    uniform vec3 colorCyan;
    uniform vec3 colorPurple;
    uniform vec3 colorBlue;
    uniform vec3 colorPeach;
    uniform vec3 colorHotPink;
    varying vec2 vUv;
    
    void main() {
      vec2 center = vec2(0.5, 0.5);
      vec2 st = vUv - center;
      
      float angle = atan(st.y, st.x);
      float radius = length(st);
      
      // Dynamic fluid wobble
      float wobble = sin(angle * 3.0 + time * 1.5) * 0.03 + cos(angle * 2.0 - time) * 0.04;
      float maxRadius = 0.35 + wobble;
      
      // Scatter/Expand logic
      float currentRadius = maxRadius * (1.0 + uShatter * 1.5);
      
      // Soft alpha edge
      float alpha = smoothstep(currentRadius + 0.08, currentRadius - 0.02, radius);
      
      // Dissolve noise during shatter
      float shatterNoise = fract(sin(dot(vUv * 10.0, vec2(12.9898, 78.233))) * 43758.5453);
      alpha -= (shatterNoise * uShatter * 2.0);
      alpha *= (1.0 - uShatter); // Fade out completely
      
      if (alpha <= 0.01) discard;
      
      // Organic color gradients
      vec2 p = vUv * 2.0 - 1.0;
      float wave1 = sin(p.x * 2.0 - time * 1.0);
      float wave2 = cos(p.y * 1.5 + time * 0.8);
      float combinedWave = smoothstep(-0.5, 0.5, (wave1 + wave2)/2.0);
      
      float wavePeach = sin(p.y * 2.0 - p.x * 1.0 + time * 1.2) * 0.5 + 0.5;
      
      vec3 mixColor = mix(colorBlue, colorCyan, combinedWave);
      vec3 pinkTransition = mix(mixColor, colorHotPink, smoothstep(0.2, 0.8, wavePeach));
      mixColor = mix(pinkTransition, colorPeach, smoothstep(0.5, 0.95, wavePeach));
      
      // Purple edge
      mixColor = mix(mixColor, colorPurple, smoothstep(0.2, 0.45, radius));
      // Soften colors by mixing towards white
      mixColor = mix(mixColor, vec3(1.0), 0.35); // 35% lighter/pastel
      
      gl_FragColor = vec4(mixColor, alpha);
    }
  `,transparent:!0,depthWrite:!1}),preloaderPoints=new THREE.Mesh(preloaderPointsGeo,preloaderPointsMat);preloaderPoints.position.set(-1.8,-.25,4.5),preloaderPoints.lookAt(-1.8,-1,6.5),scene.add(preloaderPoints);const odoNumbers=document.getElementById("odometer-numbers");let odoHTML="";for(let e=0;e<=100;e++){const n=String(e).padStart(3,"0");odoHTML+=`<div style="height: 4rem; line-height: 4rem; display: flex; align-items: center; justify-content: center;">${n}</div>`}odoNumbers&&(odoNumbers.innerHTML=odoHTML);function initTitles(){document.querySelectorAll("#animated-hero-title, .animated-title").forEach(d=>{const u=Array.from(d.childNodes);d.innerHTML="";function s(r,f){if(r.nodeType===3){const p=r.textContent;if(p.trim()===""){f.appendChild(document.createTextNode(p));return}p.split("").forEach(i=>{if(i===" "||i===`
`||i==="	")f.appendChild(document.createTextNode(i));else{const y=document.createElement("span");y.className="char-mask";const m=document.createElement("span");m.className="hero-char",m.textContent=i,y.appendChild(m),f.appendChild(y)}})}else if(r.nodeType===1)if(r.tagName==="BR")f.appendChild(r.cloneNode());else{const p=r.cloneNode(!1);Array.from(r.childNodes).forEach(o=>s(o,p)),f.appendChild(p)}}u.forEach(r=>s(r,d))});const n=new IntersectionObserver(d=>{d.forEach(u=>{u.isIntersecting&&(u.target.querySelectorAll(".hero-char:not(.revealed)").forEach((r,f)=>{setTimeout(()=>r.classList.add("revealed"),f*10)}),n.unobserve(u.target))})},{threshold:.3});document.querySelectorAll(".animated-title.flow-title").forEach(d=>n.observe(d))}document.readyState==="loading"?document.addEventListener("DOMContentLoaded",initTitles):initTitles();const triggeredSelectors=new Set;function triggerTextReveal(e){if(triggeredSelectors.has(e))return;const n=document.querySelectorAll(`${e} .hero-char:not(.revealed)`);n.length!==0&&(triggeredSelectors.add(e),n.forEach((d,u)=>{setTimeout(()=>d.classList.add("revealed"),u*10)}))}const loaderSteps=[25,50,75,100];let loaderStepIndex=0;function advanceLoader(){loaderStepIndex>=loaderSteps.length||(preloaderTargetPercent=loaderSteps[loaderStepIndex],loaderStepIndex++,setTimeout(advanceLoader,300))}setTimeout(advanceLoader,200);function animate(e){requestAnimationFrame(animate),e&&lenis.raf(e);const n=clock.getDelta();shaderUniforms.time.value+=n,preloaderPointsMat.uniforms.time.value=shaderUniforms.time.value,shaderUniforms.mouse.value.lerp(targetMouse,n*3);const d=Math.min(1,scrollProgress/.12),u=Math.max(0,Math.min(1,(scrollProgress-.4)/.14)),s=Math.max(0,Math.min(1,(scrollProgress-.54)/.14)),r=Math.max(0,Math.min(1,(scrollProgress-.68)/.12)),f=Math.max(0,Math.min(1,(scrollProgress-.86)/.14)),p=Math.max(0,Math.min(1,(scrollProgress-.86)/.14)),o=document.getElementById("phase4-container");if(o)if(s>0&&s<1){let a=1,c=0;if(s<.2){const h=s/.2;a=h,c=50*(1-h)}else if(s>.8){const h=(s-.8)/.2;a=1-h,c=-50*h}o.style.opacity=a.toString(),o.style.transform=`translateY(${c}px)`,o.style.pointerEvents=a>.5?"auto":"none",a>.7&&triggerTextReveal("#phase4-title")}else o.style.opacity="0",o.style.pointerEvents="none";const i=document.getElementById("phase5-container");if(i)if(scrollProgress>=.68&&scrollProgress<=1){let a=0;scrollProgress<.74?a=0:scrollProgress<.78?a=(scrollProgress-.74)/.04:scrollProgress<.82?a=1:scrollProgress<.86?a=1-(scrollProgress-.82)/.04:a=0,i.style.opacity=Math.max(0,Math.min(1,a)).toString(),a>.7&&(triggerTextReveal("#phase5-title-1"),triggerTextReveal("#phase5-title-2"))}else i.style.opacity="0";const y=document.getElementById("phase6-container"),m=document.getElementById("phase6-footer");if(y)if(scrollProgress>=.86){const a=(scrollProgress-.86)/.14,c=Math.max(0,Math.min(1,a));y.style.opacity=c.toString();const S=100*(1-(1-Math.pow(1-c,3)));m&&(m.style.transform=`translateY(${S}vh)`);const E=.95+.05*c;y.style.transform=`scale(${E})`,c>.7&&triggerTextReveal("#phase6-title")}else y.style.opacity="0",m&&(m.style.transform="translateY(100vh)");const g=1-Math.pow(1-f,3),v=robotTargetX(d,s,g),M=THREE.MathUtils.lerp(-1.8,-.6,d),T=portraitFit*Math.max(1-r,f),R=THREE.MathUtils.lerp(M,v,T),x=R,b=PORTRAIT_PHASE4_LIFT*portraitFit*s*(1-g),C=THREE.MathUtils.lerp(-1,-2,d)-b,H=THREE.MathUtils.lerp(.5,-2,d)-b,I=THREE.MathUtils.lerp(7.5,7.15,u),P=THREE.MathUtils.lerp(6.5,I,d),B=PORTRAIT_EXTRA_CAM_Z*T,l=THREE.MathUtils.lerp(P,.5,r)+B,t=(a,c,h)=>Math.abs(c-a)<1e-4?c:THREE.MathUtils.lerp(a,c,h),w=n*6;if(!preloaderDone){if(preloaderCurrentPercent<preloaderTargetPercent&&(preloaderCurrentPercent+=n*180,preloaderCurrentPercent>preloaderTargetPercent&&(preloaderCurrentPercent=preloaderTargetPercent),odoNumbers&&(odoNumbers.style.transform=`translateY(-${preloaderCurrentPercent*4}rem)`)),preloaderCurrentPercent>=100){preloaderShatter+=n*2;const a=Math.pow(preloaderShatter,3);if(preloaderPointsMat.uniforms.uShatter.value=a,preloaderShatter>1){preloaderDone=!0,preloaderPoints.visible=!1,window.mainModel&&(window.mainModel.visible=!0);const c=document.getElementById("preloader");c&&(c.style.opacity="0"),document.querySelectorAll(".preload-hidden").forEach(E=>E.classList.remove("preload-hidden"));const S=document.querySelectorAll("#animated-hero-title .hero-char");setTimeout(()=>{S.forEach((E,A)=>{setTimeout(()=>{E.classList.add("revealed")},A*25)})},150)}}window.scrollTo(0,0),scrollProgress=0}if(camera.position.x=t(camera.position.x,R,w),camera.position.y=t(camera.position.y,C,w),camera.position.z=t(camera.position.z,l,w),controls.target.x=t(controls.target.x,x,w),controls.target.y=t(controls.target.y,H,w),window.mainModel){const a=THREE.MathUtils.lerp(-3.93,-6.15,d),c=THREE.MathUtils.lerp(4.17,7,d),h=THREE.MathUtils.lerp(a,guiParams.phase4Y,s),S=THREE.MathUtils.lerp(c,guiParams.phase4Z,s),E=g,A=v,L=THREE.MathUtils.lerp(h,-5.2,E),k=THREE.MathUtils.lerp(S,-1,E),z=targetMouse.x*2-1,F=(targetMouse.y*2-1)*.05,D=z*.1,X=Math.max(0,Math.min(1,(scrollProgress-.12)/.28)),W=THREE.MathUtils.lerp(-.05026,-.2,d),N=THREE.MathUtils.lerp(W,guiParams.phase4RotX,s),G=THREE.MathUtils.lerp(N,0+F,E),_=-.92781,Z=THREE.MathUtils.lerp(_,_+Math.PI,d),$=THREE.MathUtils.lerp(Z,Math.PI*2,X),V=THREE.MathUtils.lerp($,guiParams.phase4RotY,s),q=THREE.MathUtils.lerp(V,0+D,E),j=THREE.MathUtils.lerp(-.12566,0,d),K=THREE.MathUtils.lerp(j,guiParams.phase4RotZ,s),J=THREE.MathUtils.lerp(K,0,E);window.mainModel.position.x=t(window.mainModel.position.x,A,w),window.mainModel.position.y=t(window.mainModel.position.y,L,w),window.mainModel.position.z=t(window.mainModel.position.z,k,w),window.mainModel.rotation.x=t(window.mainModel.rotation.x,G,w),window.mainModel.rotation.y=t(window.mainModel.rotation.y,q,w),window.mainModel.rotation.z=t(window.mainModel.rotation.z,J,w);const Y=window.baseModelScale||1,Q=Y*guiParams.phase4Scale,ee=THREE.MathUtils.lerp(Y,Q,s);if(window.currentModelScale||(window.currentModelScale=Y),window.currentModelScale=t(window.currentModelScale,ee,w),window.mainModel.scale.set(window.currentModelScale,window.currentModelScale,window.currentModelScale),window.mainModelMaterial){let O=.95;f>0?O=THREE.MathUtils.lerp(0,.95,Math.min(1,f*2)):r>0&&(O=THREE.MathUtils.lerp(.95,0,Math.min(1,r*2))),window.mainModelMaterial.opacity=O}shaderUniforms.uRevealProgress.value<.999&&(window.mainModel.getWorldPosition(_revealVec),_revealVec.project(camera),shaderUniforms.uRevealOrigin.value.set((_revealVec.x*.5+.5)*(window.innerWidth/window.innerHeight),_revealVec.y*.5+.5))}if(window.logoParticles)if(r>0){window.logoParticles.visible=!0;let a=r,c=0;if(p>0){const F=THREE.MathUtils.smoothstep(p,0,1);a=1-Math.pow(F,.3),c=0}window.logoParticles.material.uniforms.uProgress.value=t(window.logoParticles.material.uniforms.uProgress.value,a,w*1.5),window.logoParticles.material.uniforms.uShatterFade.value=t(window.logoParticles.material.uniforms.uShatterFade.value,c,w*1.5);const h=targetMouse.x*2-1,E=(targetMouse.y*2-1)*.15*r,A=h*.25*r;window.logoParticles.rotation.x=t(window.logoParticles.rotation.x,E,w),window.logoParticles.rotation.y=t(window.logoParticles.rotation.y,A,w);const L=THREE.MathUtils.smoothstep(f,0,1),k=THREE.MathUtils.lerp(1,1.4,L)*responsiveScale,z=window.logoParticles.scale.x,U=t(z,k,w);window.logoParticles.scale.set(U,U,U),window.logoParticles.material.uniforms.uScale.value=U}else window.logoParticles.visible=!1,window.logoParticles.material.uniforms.uProgress.value=0,window.logoParticles.rotation.x=0,window.logoParticles.rotation.y=0,window.logoParticles.scale.set(1,1,1),window.logoParticles.material.uniforms.uScale.value=1;if(updateWordAnimation(word1,scrollProgress,.12,.21),updateWordAnimation(word2,scrollProgress,.17,.26),updateWordAnimation(word3,scrollProgress,.22,.31),updateWordAnimation(word4,scrollProgress,.27,.36),updateWordAnimation(word5,scrollProgress,.31,.4,!0),glassContainer){const a=document.getElementById("glass-gradient");if(scrollProgress<=.54){const h=100-u*u*100;if(glassContainer.style.transform=`translateY(${h}vh)`,h<60&&triggerTextReveal("#phase3-title"),a){const S=.65+.35*u;a.style.transform=`translate(-50%, -50%) scale(${S})`,a.style.borderRadius=`${u*24}px`}}else{const c=1-Math.pow(1-s,3),h=Math.max(window.innerHeight,glassContainer.scrollHeight);glassContainer.style.transform=`translateY(${-(c*h)}px)`,a&&(a.style.transform="translate(-50%, -50%) scale(1)",a.style.borderRadius="24px")}}if(mixer&&mixer.update(n),preloaderDone&&shaderUniforms.uRevealProgress.value<.999){window.revealStartTime||(window.revealStartTime=shaderUniforms.time.value+.5);const a=shaderUniforms.time.value-window.revealStartTime;if(a>0){let c=Math.min(1,a/2.3);const h=1-Math.pow(1-c,3);shaderUniforms.uRevealProgress.value=h}}controls.update(),rendererBg.render(bgScene,camera),renderer.render(scene,camera)}animate();
