/**
 * ════════════════════════════════════════════════════════
 * ILYA SYSTEM CORE · main.js
 * Professional WebGL Engine & UI Logic
 * High-Performance · 60 FPS · Physically Based Rendering
 * ════════════════════════════════════════════════════════
 */

'use strict';

const ILYA = (() => {
    // ─── Private Variables ───
    const cfg = window.ILYA_CONFIG;
    const dom = {
        loader:    document.querySelector('#loader'),
        fill:      document.querySelector('#loader-fill'),
        pct:       document.querySelector('#loader-pct'),
        card:      document.querySelector('#main-card'),
        links:     document.querySelector('#links-grid'),
        modal:     document.querySelector('#image-modal'),
        modalImg:  document.querySelector('#modal-img'),
        modalCls:  document.querySelector('#modal-close')
    };

    // ─── WebGL State ───
    let scene, camera, renderer, clock;
    let mainGroup, shapes = [], lights = [];
    let mouse = { x: 0, y: 0, targetX: 0, targetY: 0 };
    let isLoaded = false;

    // ════════════════════════════════════════════
    // 1. INITIALIZATION & UI
    // ════════════════════════════════════════════
    
    const initUI = () => {
        // Build Links
        if (cfg && cfg.links) {
            dom.links.innerHTML = cfg.links.map(link => `
                <a href="${link.url}" target="_blank" rel="noopener" class="link-card">
                    <div class="link-icon-box">
                        <i class="${link.icon}"></i>
                    </div>
                    <span class="link-name">${link.name}</span>
                </a>
            `).join('');
        }

        // Modal Logic
        const triggers = ['#banner-trigger', '#profile-trigger'];
        triggers.forEach(id => {
            const el = document.querySelector(id);
            if (el) {
                el.onclick = () => {
                    const img = el.querySelector('img');
                    if (img) {
                        dom.modalImg.src = img.src;
                        dom.modal.classList.add('active');
                    }
                };
            }
        });

        dom.modalCls.onclick = () => dom.modal.classList.remove('active');
        dom.modal.onclick = (e) => { if (e.target === dom.modal) dom.modal.classList.remove('active'); };
    };

    const runLoader = (callback) => {
        let progress = 0;
        const interval = setInterval(() => {
            progress += Math.random() * 15;
            if (progress >= 100) {
                progress = 100;
                clearInterval(interval);
                setTimeout(finishLoader, 500);
            }
            dom.fill.style.width = `${progress}%`;
            dom.pct.innerText = `${Math.floor(progress)}%`;
        }, 100);

        function finishLoader() {
            dom.loader.classList.add('hidden');
            isLoaded = true;
            if (callback) callback();
        }
    };

    // ════════════════════════════════════════════
    // 2. WEBGL ENGINE (The "Soul" of the site)
    // ════════════════════════════════════════════
    
    const initWebGL = () => {
        const container = document.querySelector('#webgl-container');
        scene = new THREE.Scene();
        clock = new THREE.Clock();

        // Camera Setup
        camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
        camera.position.z = 15;

        // Renderer Optimization
        renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // Limit pixel ratio for performance
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.toneMapping = THREE.ReinhardToneMapping;
        container.appendChild(renderer.domElement);

        // Group for all 3D objects
        mainGroup = new THREE.Group();
        scene.add(mainGroup);

        // ─── Physically Based Materials ───
        const material = new THREE.MeshPhysicalMaterial({
            color: 0x050001,
            metalness: 0.9,
            roughness: 0.1,
            transmission: 0.5, // Glass effect
            thickness: 2,
            envMapIntensity: 1
        });

        const wireMaterial = new THREE.MeshBasicMaterial({
            color: 0xff0033,
            wireframe: true,
            transparent: true,
            opacity: 0.05
        });

        // ─── Geometry Creation ───
        const geometries = [
            new THREE.IcosahedronGeometry(4, 0),
            new THREE.TorusKnotGeometry(2, 0.6, 100, 16),
            new THREE.OctahedronGeometry(3, 0)
        ];

        geometries.forEach((geo, i) => {
            const mesh = new THREE.Mesh(geo, material);
            const wire = new THREE.Mesh(geo, wireMaterial);
            mesh.add(wire);
            
            // Random Initial State
            mesh.position.set((i - 1) * 8, Math.random() * 4 - 2, Math.random() * -5);
            mesh.rotation.set(Math.random(), Math.random(), Math.random());
            
            shapes.push(mesh);
            mainGroup.add(mesh);
        });

        // ─── Lighting (Professional Setup) ───
        const ambient = new THREE.AmbientLight(0xffffff, 0.2);
        scene.add(ambient);

        const p1 = new THREE.PointLight(0xff0033, 2, 50);
        p1.position.set(10, 10, 10);
        scene.add(p1);
        lights.push(p1);

        const p2 = new THREE.PointLight(0xffffff, 1, 50);
        p2.position.set(-10, -10, 5);
        scene.add(p2);
        lights.push(p2);

        // Events
        window.addEventListener('mousemove', onInputMove);
        window.addEventListener('touchmove', e => onInputMove(e.touches[0]));
        window.addEventListener('resize', onWindowResize);

        animate();
    };

    const onInputMove = (e) => {
        mouse.targetX = (e.clientX / window.innerWidth) * 2 - 1;
        mouse.targetY = -(e.clientY / window.innerHeight) * 2 + 1;
    };

    const onWindowResize = () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    };

    const animate = () => {
        requestAnimationFrame(animate);
        const delta = clock.getDelta();
        const time = clock.getElapsedTime();

        // Smooth Lerping for Mouse interaction
        mouse.x += (mouse.targetX - mouse.x) * 0.05;
        mouse.y += (mouse.targetY - mouse.y) * 0.05;

        // Group Interaction
        mainGroup.rotation.y = mouse.x * 0.2;
        mainGroup.rotation.x = -mouse.y * 0.2;

        // Individual Shape Animation
        shapes.forEach((shape, i) => {
            shape.rotation.y += 0.2 * delta;
            shape.rotation.z += 0.1 * delta;
            shape.position.y += Math.sin(time + i) * 0.005; // Gentle breathing
        });

        // Light Movement
        lights[0].position.x = Math.sin(time * 0.5) * 15;
        lights[1].position.y = Math.cos(time * 0.5) * 15;

        renderer.render(scene, camera);
    };

    // ════════════════════════════════════════════
    // 3. CINEMATIC ENTRANCE
    // ════════════════════════════════════════════
    
    const startIntro = () => {
        if (!window.gsap) return;

        dom.card.classList.remove('hidden');
        
        const tl = gsap.timeline();
        
        tl.fromTo(dom.card, 
            { y: 60, opacity: 0, scale: 0.9 },
            { y: 0, opacity: 1, scale: 1, duration: 1.4, ease: "power4.out" }
        );

        tl.from('.profile-wrapper', {
            scale: 0, duration: 0.8, ease: "back.out(1.7)"
        }, "-=0.8");

        tl.from('.link-card', {
            y: 20, opacity: 0, duration: 0.6, stagger: 0.1, ease: "power2.out"
        }, "-=0.4");
    };

    // ─── Public Boot ───
    return {
        boot: () => {
            initUI();
            initWebGL();
            runLoader(startIntro);
        }
    };
})();

// Launch System
document.addEventListener('DOMContentLoaded', ILYA.boot);
