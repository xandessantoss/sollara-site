const{OrbitControls,GLTFLoader,DRACOLoader}=window.THREE_ADDONS,lenis=new Lenis({duration:1.5,easing:o=>Math.min(1,1.001-Math.pow(2,-10*o))}),bgScene=new THREE.Scene;bgScene.background=new THREE.Color(16644853);const scene=new THREE.Scene,camera=new THREE.PerspectiveCamera(75,window.innerWidth/window.innerHeight,.1,1e3);camera.position.set(0,1,5);const rendererBg=new THREE.WebGLRenderer({antialias:!0});rendererBg.setSize(window.innerWidth,window.innerHeight),rendererBg.setPixelRatio(window.devicePixelRatio),rendererBg.domElement.style.position="fixed",rendererBg.domElement.style.top="0",rendererBg.domElement.style.left="0",rendererBg.domElement.style.zIndex="1",document.body.appendChild(rendererBg.domElement);const renderer=new THREE.WebGLRenderer({antialias:!0,alpha:!0});renderer.setSize(window.innerWidth,window.innerHeight),renderer.setPixelRatio(window.devicePixelRatio),renderer.outputColorSpace=THREE.SRGBColorSpace,renderer.domElement.style.position="fixed",renderer.domElement.style.top="0",renderer.domElement.style.left="0",renderer.domElement.style.zIndex="3",document.body.appendChild(renderer.domElement);const controls=new OrbitControls(camera,renderer.domElement);controls.enabled=!1,controls.enableDamping=!0,controls.dampingFactor=.05;const ambientLight=new THREE.AmbientLight(16777215,1);scene.add(ambientLight);const directionalLight=new THREE.DirectionalLight(16777215,2);directionalLight.position.set(5,10,5),scene.add(directionalLight);const directionalLight2=new THREE.DirectionalLight(16777215,1);directionalLight2.position.set(-5,-5,-5),scene.add(directionalLight2);let mixer;const clock=new THREE.Clock,targetMouse=new THREE.Vector2(.5,.5),_revealVec=new THREE.Vector3,shaderUniforms={time:{value:0},mouse:{value:new THREE.Vector2(.5,.5)},resolution:{value:new THREE.Vector2(window.innerWidth,window.innerHeight)},bgColor:{value:new THREE.Color(16644853)},colorCyan:{value:new THREE.Color(15248176)},colorPurple:{value:new THREE.Color(14382854)},colorBlue:{value:new THREE.Color(16096779)},colorPeach:{value:new THREE.Color(11817737)},colorHotPink:{value:new THREE.Color(16112009)},edgeBlurAmount:{value:.5},uRevealProgress:{value:0},uRevealOrigin:{value:new THREE.Vector2(.5,.5)}},animatedMaterials=[],bgGeo=new THREE.PlaneGeometry(2,2),bgMat=new THREE.ShaderMaterial({uniforms:{time:shaderUniforms.time,mouse:shaderUniforms.mouse,bgColor:shaderUniforms.bgColor,resolution:shaderUniforms.resolution,colorCyan:shaderUniforms.colorCyan,colorBlue:shaderUniforms.colorBlue,colorHotPink:shaderUniforms.colorHotPink,colorPeach:shaderUniforms.colorPeach},vertexShader:`
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
  `,depthWrite:!1,depthTest:!1}),bgMesh=new THREE.Mesh(bgGeo,bgMat);bgMesh.renderOrder=-1,bgMesh.frustumCulled=!1,bgScene.add(bgMesh);const guiParams={bgColor:"#fdfaf5",edgeBlur:.5,colorCyan:"#"+shaderUniforms.colorCyan.value.getHexString(),colorPurple:"#"+shaderUniforms.colorPurple.value.getHexString(),colorBlue:"#"+shaderUniforms.colorBlue.value.getHexString(),colorPeach:"#"+shaderUniforms.colorPeach.value.getHexString(),colorHotPink:"#"+shaderUniforms.colorHotPink.value.getHexString(),phase4X:-1.35,phase4Y:-5.4,phase4Z:5.67,phase4Scale:.85,phase4RotX:0,phase4RotY:.6723,phase4RotZ:0},dracoLoader=new DRACOLoader;dracoLoader.setDecoderPath("https://www.gstatic.com/draco/versioned/decoders/1.5.7/");const loader=new GLTFLoader;loader.setDRACOLoader(dracoLoader),loader.parse(window.SITE_ASSETS.modelGlb,"",o=>{const r=o.scene,w=new THREE.Box3().setFromObject(r).getSize(new THREE.Vector3),d=Math.max(w.x,w.y,w.z);if(window.modelMaxDim=d,d>0){const e=5/d;r.scale.setScalar(e),window.baseModelScale=e}else window.baseModelScale=1;const p=new THREE.Box3().setFromObject(r).getCenter(new THREE.Vector3);r.position.sub(p),r.position.set(.1,-3.93,4.17),r.rotation.set(-.05026,-.92781,-.12566),window.mainModel=r,window.mainModel.visible=!1,camera.position.set(-1.8,-1,6.5),camera.lookAt(-1.8,.5,0),controls.target.set(-1.8,.5,0),controls.update(),window.applyHolographicShader=function(e){e.onBeforeCompile=i=>{i.uniforms.time=shaderUniforms.time,i.uniforms.colorCyan=shaderUniforms.colorCyan,i.uniforms.colorPurple=shaderUniforms.colorPurple,i.uniforms.colorBlue=shaderUniforms.colorBlue,i.uniforms.colorPeach=shaderUniforms.colorPeach,i.uniforms.colorHotPink=shaderUniforms.colorHotPink,i.uniforms.edgeBlurAmount=shaderUniforms.edgeBlurAmount,i.uniforms.uRevealProgress=shaderUniforms.uRevealProgress,i.uniforms.uRevealOrigin=shaderUniforms.uRevealOrigin,i.uniforms.resolution=shaderUniforms.resolution,i.vertexShader=`
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
          `)}},r.traverse(e=>{if(e.isMesh){const i=new THREE.MeshPhysicalMaterial({color:65795,metalness:.9,roughness:.2,clearcoat:1,clearcoatRoughness:.1,transparent:!0,opacity:.95,side:THREE.DoubleSide});window.applyHolographicShader(i),e.material=i}}),scene.add(r),r.traverse(e=>{e.isMesh&&(window.mainModelMaterial=e.material)}),window.logoParticles=null;const g=new Image;g.src=window.SITE_ASSETS.logoSvg,g.onload=()=>{const e=document.createElement("canvas"),i=e.getContext("2d",{willReadFrequently:!0}),y=g.height/g.width;e.width=450,e.height=Math.floor(450*y),i.drawImage(g,0,0,e.width,e.height);const m=i.getImageData(0,0,e.width,e.height),v=[],E=(a,l)=>a<0||a>=e.width||l<0||l>=e.height?0:m.data[(l*e.width+a)*4+3],P=.25;for(let a=0;a<e.height;a++)for(let l=0;l<e.width;l++)if(E(l,a)>128&&(v.push({x:l,y:a,z:P/2,isAmbient:0}),v.push({x:l,y:a,z:-P/2,isAmbient:0}),E(l-1,a)<128||E(l+1,a)<128||E(l,a-1)<128||E(l,a+1)<128))for(let S=1;S<3;S++){const A=-P/2+P*S/3;v.push({x:l,y:a,z:A,isAmbient:0})}const T=3500;for(let a=0;a<T;a++)v.push({x:e.width/2+(Math.random()-.5)*e.width*3,y:e.height/2+(Math.random()-.5)*e.height*10,z:(Math.random()-.5)*20,isAmbient:1});const M=5.7/e.width,x=v.length,b=new Float32Array(x*3),h=new Float32Array(x*3),f=new Float32Array(x),t=new Float32Array(x);for(let a=0;a<x;a++){const l=v[a],C=(Math.random()-.5)*1.2,R=(Math.random()-.5)*1.2,S=(Math.random()-.5)*.1,A=(l.x+C-e.width/2)*M,H=-(l.y+R-e.height/2)*M,U=l.z+S;b[a*3+0]=A,b[a*3+1]=H,b[a*3+2]=U;const I=Math.random()*Math.PI*2,B=25+Math.random()*25,k=Math.cos(I)*B,L=(Math.random()-.5)*45,z=Math.sin(I)*B;h[a*3+0]=k,h[a*3+1]=L,h[a*3+2]=z;const D=Math.sqrt(Math.pow(l.x-e.width/2,2)+Math.pow(l.y-e.height/2,2))/(e.width/2);f[a]=Math.random()*.5+D*.5,t[a]=l.isAmbient||0}const n=new THREE.BufferGeometry;n.setAttribute("position",new THREE.BufferAttribute(b,3)),n.setAttribute("aRandomPosition",new THREE.BufferAttribute(h,3)),n.setAttribute("aDelay",new THREE.BufferAttribute(f,1)),n.setAttribute("aIsAmbient",new THREE.BufferAttribute(t,1));const u=new THREE.ShaderMaterial({uniforms:{time:shaderUniforms.time,uProgress:{value:0},uScale:{value:1},uShatterFade:{value:0},colorCyan:shaderUniforms.colorCyan,colorBlue:shaderUniforms.colorBlue,colorPeach:shaderUniforms.colorPeach,colorHotPink:shaderUniforms.colorHotPink},vertexShader:`
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
        `,transparent:!0,depthWrite:!1,blending:THREE.NormalBlending});window.logoParticles=new THREE.Points(n,u),window.logoParticles.position.set(-.6,-2,-3),window.logoParticles.frustumCulled=!1,window.logoParticles.visible=!1,scene.add(window.logoParticles)},o.animations&&o.animations.length>0&&(mixer=new THREE.AnimationMixer(r),o.animations.forEach(e=>{mixer.clipAction(e).play()}))},o=>{console.error("An error happened while loading the model:",o);const r=document.createElement("div");r.style.cssText="position:absolute;top:10px;left:10px;color:red;background:white;padding:10px;border:2px solid red;z-index:9999;font-family:sans-serif;",r.innerText="Error loading model: "+(o.message||o),document.body.appendChild(r)});let scrollProgress=0,_ratio=window.innerWidth/1200,responsiveScale=_ratio<=1?_ratio:1+(_ratio-1)*.4;window.addEventListener("scroll",()=>{const o=document.body.scrollHeight-window.innerHeight,r=window.innerHeight*1,c=Math.max(1,o-r);scrollProgress=window.scrollY/c,scrollProgress=Math.max(0,Math.min(scrollProgress,1))});const word1=document.getElementById("word1"),word2=document.getElementById("word2"),word3=document.getElementById("word3"),word4=document.getElementById("word4"),word5=document.getElementById("word5"),glassContainer=document.getElementById("glass-container");function updateWordAnimation(o,r,c,w,d=!1){if(!o)return;if(r<=c){o.style.opacity="0";return}let s=(r-c)/(w-c);if(!d&&s>=1){o.style.opacity="0";return}let p,g,e,i;if(d&&s>1){const y=Math.min(1,(s-1)/1.25),m=y*y;if(p=0,g=0-m*100,e=0,i=-800,o.style.opacity="1",o.children.length>0){const v=[.8,1.4,.5,1.7,.9,1.2];for(let E=0;E<o.children.length;E++){const P=o.children[E],T=v[E%v.length],M=-(m*60*T),x=m*24*T;P.style.transform=`translate3d(0, ${M}vh, 0)`,P.style.opacity="1",P.style.filter=x>.1?`blur(${x}px)`:"none"}}}else{const y=m=>.5-Math.cos(m*Math.PI)/2;if(d)p=1400-y(s)*1400,g=80-(1-Math.pow(1-s,3))*80;else{p=1400-y(s)*3100;const m=Math.min(1,s/.55);g=80-(1-Math.pow(1-m,3))*80}if(e=-(p/800)*60,i=-800,o.children.length>0){const m=o.children.length;for(let v=0;v<m;v++){const E=o.children[v],P=v/m*.25;let M=(s-P)/.35;M=Math.max(0,Math.min(1,M));let x=Math.min(1,M/.5);const b=1-Math.pow(1-M,3);let h=60-b*60,f=24-b*24;if(!d){const t=v/m*.15;let n=(s-(.5+t))/.25;if(n=Math.max(0,Math.min(1,n)),n>0){const u=n*n;h-=u*60,f+=u*24,x=Math.min(x,1-n)}}E.style.transform=`translate3d(0, ${h}vh, 0)`,E.style.opacity=x.toString(),E.style.filter=f>.1?`blur(${f}px)`:"none"}o.style.opacity="1"}else{let m=1;s<.1?m=s/.1:!d&&s>.8&&(m=1-(s-.8)/.2),o.style.opacity=m.toString()}}o.style.transform=`translate3d(calc(-50% + ${p}px), calc(-50% + ${g}vh), ${i}px) rotateY(${e}deg)`}window.addEventListener("mousemove",o=>{targetMouse.x=o.clientX/window.innerWidth,targetMouse.y=1-o.clientY/window.innerHeight}),window.addEventListener("resize",()=>{camera.aspect=window.innerWidth/window.innerHeight,camera.updateProjectionMatrix(),rendererBg.setSize(window.innerWidth,window.innerHeight),renderer.setSize(window.innerWidth,window.innerHeight),shaderUniforms.resolution.value.set(window.innerWidth,window.innerHeight);let o=window.innerWidth/1200;responsiveScale=o<=1?o:1+(o-1)*.4});let preloaderDone=!1,preloaderCurrentPercent=0,preloaderTargetPercent=0,preloaderShatter=0;const preloaderPointsGeo=new THREE.PlaneGeometry(4,4),preloaderPointsMat=new THREE.ShaderMaterial({uniforms:{time:shaderUniforms.time,colorCyan:shaderUniforms.colorCyan,colorPurple:shaderUniforms.colorPurple,colorBlue:shaderUniforms.colorBlue,colorPeach:shaderUniforms.colorPeach,colorHotPink:shaderUniforms.colorHotPink,uShatter:{value:0}},vertexShader:`
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
  `,transparent:!0,depthWrite:!1}),preloaderPoints=new THREE.Mesh(preloaderPointsGeo,preloaderPointsMat);preloaderPoints.position.set(-1.8,-.25,4.5),preloaderPoints.lookAt(-1.8,-1,6.5),scene.add(preloaderPoints);const odoNumbers=document.getElementById("odometer-numbers");let odoHTML="";for(let o=0;o<=100;o++){const r=String(o).padStart(3,"0");odoHTML+=`<div style="height: 4rem; line-height: 4rem; display: flex; align-items: center; justify-content: center;">${r}</div>`}odoNumbers&&(odoNumbers.innerHTML=odoHTML);function initTitles(){document.querySelectorAll("#animated-hero-title, .animated-title").forEach(c=>{const w=Array.from(c.childNodes);c.innerHTML="";function d(s,p){if(s.nodeType===3){const g=s.textContent;if(g.trim()===""){p.appendChild(document.createTextNode(g));return}g.split("").forEach(i=>{if(i===" "||i===`
`||i==="	")p.appendChild(document.createTextNode(i));else{const y=document.createElement("span");y.className="char-mask";const m=document.createElement("span");m.className="hero-char",m.textContent=i,y.appendChild(m),p.appendChild(y)}})}else if(s.nodeType===1)if(s.tagName==="BR")p.appendChild(s.cloneNode());else{const g=s.cloneNode(!1);Array.from(s.childNodes).forEach(e=>d(e,g)),p.appendChild(g)}}w.forEach(s=>d(s,c))});const r=new IntersectionObserver(c=>{c.forEach(w=>{w.isIntersecting&&(w.target.querySelectorAll(".hero-char:not(.revealed)").forEach((s,p)=>{setTimeout(()=>s.classList.add("revealed"),p*10)}),r.unobserve(w.target))})},{threshold:.3});document.querySelectorAll(".animated-title.flow-title").forEach(c=>r.observe(c))}document.readyState==="loading"?document.addEventListener("DOMContentLoaded",initTitles):initTitles();const triggeredSelectors=new Set;function triggerTextReveal(o){if(triggeredSelectors.has(o))return;const r=document.querySelectorAll(`${o} .hero-char:not(.revealed)`);r.length!==0&&(triggeredSelectors.add(o),r.forEach((c,w)=>{setTimeout(()=>c.classList.add("revealed"),w*10)}))}const loaderSteps=[25,50,75,100];let loaderStepIndex=0;function advanceLoader(){loaderStepIndex>=loaderSteps.length||(preloaderTargetPercent=loaderSteps[loaderStepIndex],loaderStepIndex++,setTimeout(advanceLoader,300))}setTimeout(advanceLoader,200);function animate(o){requestAnimationFrame(animate),o&&lenis.raf(o);const r=clock.getDelta();shaderUniforms.time.value+=r,preloaderPointsMat.uniforms.time.value=shaderUniforms.time.value,shaderUniforms.mouse.value.lerp(targetMouse,r*3);const c=Math.min(1,scrollProgress/.12),w=Math.max(0,Math.min(1,(scrollProgress-.4)/.14)),d=Math.max(0,Math.min(1,(scrollProgress-.54)/.14)),s=Math.max(0,Math.min(1,(scrollProgress-.68)/.12)),p=Math.max(0,Math.min(1,(scrollProgress-.86)/.14)),g=Math.max(0,Math.min(1,(scrollProgress-.86)/.14)),e=document.getElementById("phase4-container");if(e)if(d>0&&d<1){let t=1,n=0;if(d<.2){const u=d/.2;t=u,n=50*(1-u)}else if(d>.8){const u=(d-.8)/.2;t=1-u,n=-50*u}e.style.opacity=t.toString(),e.style.transform=`translateY(${n}px)`,e.style.pointerEvents=t>.5?"auto":"none",t>.7&&triggerTextReveal("#phase4-title")}else e.style.opacity="0",e.style.pointerEvents="none";const i=document.getElementById("phase5-container");if(i)if(scrollProgress>=.68&&scrollProgress<=1){let t=0;scrollProgress<.74?t=0:scrollProgress<.78?t=(scrollProgress-.74)/.04:scrollProgress<.82?t=1:scrollProgress<.86?t=1-(scrollProgress-.82)/.04:t=0,i.style.opacity=Math.max(0,Math.min(1,t)).toString(),t>.7&&(triggerTextReveal("#phase5-title-1"),triggerTextReveal("#phase5-title-2"))}else i.style.opacity="0";const y=document.getElementById("phase6-container"),m=document.getElementById("phase6-footer");if(y)if(scrollProgress>=.86){const t=(scrollProgress-.86)/.14,n=Math.max(0,Math.min(1,t));y.style.opacity=n.toString();const a=100*(1-(1-Math.pow(1-n,3)));m&&(m.style.transform=`translateY(${a}vh)`);const l=.95+.05*n;y.style.transform=`scale(${l})`,n>.7&&triggerTextReveal("#phase6-title")}else y.style.opacity="0",m&&(m.style.transform="translateY(100vh)");const v=THREE.MathUtils.lerp(-1.8,-.6,c),E=THREE.MathUtils.lerp(-1.8,-.6,c),P=THREE.MathUtils.lerp(-1,-2,c),T=THREE.MathUtils.lerp(.5,-2,c),M=THREE.MathUtils.lerp(7.5,7.15,w),x=THREE.MathUtils.lerp(6.5,M,c),b=THREE.MathUtils.lerp(x,.5,s),h=(t,n,u)=>Math.abs(n-t)<1e-4?n:THREE.MathUtils.lerp(t,n,u),f=r*6;if(!preloaderDone){if(preloaderCurrentPercent<preloaderTargetPercent&&(preloaderCurrentPercent+=r*180,preloaderCurrentPercent>preloaderTargetPercent&&(preloaderCurrentPercent=preloaderTargetPercent),odoNumbers&&(odoNumbers.style.transform=`translateY(-${preloaderCurrentPercent*4}rem)`)),preloaderCurrentPercent>=100){preloaderShatter+=r*2;const t=Math.pow(preloaderShatter,3);if(preloaderPointsMat.uniforms.uShatter.value=t,preloaderShatter>1){preloaderDone=!0,preloaderPoints.visible=!1,window.mainModel&&(window.mainModel.visible=!0);const n=document.getElementById("preloader");n&&(n.style.opacity="0"),document.querySelectorAll(".preload-hidden").forEach(l=>l.classList.remove("preload-hidden"));const a=document.querySelectorAll("#animated-hero-title .hero-char");setTimeout(()=>{a.forEach((l,C)=>{setTimeout(()=>{l.classList.add("revealed")},C*25)})},150)}}window.scrollTo(0,0),scrollProgress=0}if(camera.position.x=h(camera.position.x,v,f),camera.position.y=h(camera.position.y,P,f),camera.position.z=h(camera.position.z,b,f),controls.target.x=h(controls.target.x,E,f),controls.target.y=h(controls.target.y,T,f),window.mainModel){const t=THREE.MathUtils.lerp(-.6,-.5,c),n=THREE.MathUtils.lerp(-3.93,-6.15,c),u=THREE.MathUtils.lerp(4.17,7,c),a=THREE.MathUtils.lerp(t,guiParams.phase4X,d),l=THREE.MathUtils.lerp(n,guiParams.phase4Y,d),C=THREE.MathUtils.lerp(u,guiParams.phase4Z,d),R=1-Math.pow(1-p,3),S=THREE.MathUtils.lerp(a,-.4,R),A=THREE.MathUtils.lerp(l,-5.2,R),H=THREE.MathUtils.lerp(C,-1,R),U=targetMouse.x*2-1,B=(targetMouse.y*2-1)*.05,k=U*.1,L=Math.max(0,Math.min(1,(scrollProgress-.12)/.28)),z=THREE.MathUtils.lerp(-.05026,-.2,c),O=THREE.MathUtils.lerp(z,guiParams.phase4RotX,d),D=THREE.MathUtils.lerp(O,0+B,R),_=-.92781,W=THREE.MathUtils.lerp(_,_+Math.PI,c),X=THREE.MathUtils.lerp(W,Math.PI*2,L),N=THREE.MathUtils.lerp(X,guiParams.phase4RotY,d),G=THREE.MathUtils.lerp(N,0+k,R),$=THREE.MathUtils.lerp(-.12566,0,c),Z=THREE.MathUtils.lerp($,guiParams.phase4RotZ,d),V=THREE.MathUtils.lerp(Z,0,R);window.mainModel.position.x=h(window.mainModel.position.x,S,f),window.mainModel.position.y=h(window.mainModel.position.y,A,f),window.mainModel.position.z=h(window.mainModel.position.z,H,f),window.mainModel.rotation.x=h(window.mainModel.rotation.x,D,f),window.mainModel.rotation.y=h(window.mainModel.rotation.y,G,f),window.mainModel.rotation.z=h(window.mainModel.rotation.z,V,f);const F=window.baseModelScale||1,q=F*guiParams.phase4Scale,j=THREE.MathUtils.lerp(F,q,d);if(window.currentModelScale||(window.currentModelScale=F),window.currentModelScale=h(window.currentModelScale,j,f),window.mainModel.scale.set(window.currentModelScale,window.currentModelScale,window.currentModelScale),window.mainModelMaterial){let Y=.95;p>0?Y=THREE.MathUtils.lerp(0,.95,Math.min(1,p*2)):s>0&&(Y=THREE.MathUtils.lerp(.95,0,Math.min(1,s*2))),window.mainModelMaterial.opacity=Y}shaderUniforms.uRevealProgress.value<.999&&(window.mainModel.getWorldPosition(_revealVec),_revealVec.project(camera),shaderUniforms.uRevealOrigin.value.set((_revealVec.x*.5+.5)*(window.innerWidth/window.innerHeight),_revealVec.y*.5+.5))}if(window.logoParticles)if(s>0){window.logoParticles.visible=!0;let t=s,n=0;if(g>0){const U=THREE.MathUtils.smoothstep(g,0,1);t=1-Math.pow(U,.3),n=0}window.logoParticles.material.uniforms.uProgress.value=h(window.logoParticles.material.uniforms.uProgress.value,t,f*1.5),window.logoParticles.material.uniforms.uShatterFade.value=h(window.logoParticles.material.uniforms.uShatterFade.value,n,f*1.5);const u=targetMouse.x*2-1,l=(targetMouse.y*2-1)*.15*s,C=u*.25*s;window.logoParticles.rotation.x=h(window.logoParticles.rotation.x,l,f),window.logoParticles.rotation.y=h(window.logoParticles.rotation.y,C,f);const R=THREE.MathUtils.smoothstep(p,0,1),S=THREE.MathUtils.lerp(1,1.4,R)*responsiveScale,A=window.logoParticles.scale.x,H=h(A,S,f);window.logoParticles.scale.set(H,H,H),window.logoParticles.material.uniforms.uScale.value=H}else window.logoParticles.visible=!1,window.logoParticles.material.uniforms.uProgress.value=0,window.logoParticles.rotation.x=0,window.logoParticles.rotation.y=0,window.logoParticles.scale.set(1,1,1),window.logoParticles.material.uniforms.uScale.value=1;if(updateWordAnimation(word1,scrollProgress,.12,.21),updateWordAnimation(word2,scrollProgress,.17,.26),updateWordAnimation(word3,scrollProgress,.22,.31),updateWordAnimation(word4,scrollProgress,.27,.36),updateWordAnimation(word5,scrollProgress,.31,.4,!0),glassContainer){const t=document.getElementById("glass-gradient");if(scrollProgress<=.54){const u=100-w*w*100;if(glassContainer.style.transform=`translateY(${u}vh)`,u<60&&triggerTextReveal("#phase3-title"),t){const a=.65+.35*w;t.style.transform=`translate(-50%, -50%) scale(${a})`,t.style.borderRadius=`${w*24}px`}}else{const u=-((1-Math.pow(1-d,3))*100);glassContainer.style.transform=`translateY(${u}vh)`,t&&(t.style.transform="translate(-50%, -50%) scale(1)",t.style.borderRadius="24px")}}if(mixer&&mixer.update(r),preloaderDone&&shaderUniforms.uRevealProgress.value<.999){window.revealStartTime||(window.revealStartTime=shaderUniforms.time.value+.5);const t=shaderUniforms.time.value-window.revealStartTime;if(t>0){let n=Math.min(1,t/2.3);const u=1-Math.pow(1-n,3);shaderUniforms.uRevealProgress.value=u}}controls.update(),rendererBg.render(bgScene,camera),renderer.render(scene,camera)}animate();
