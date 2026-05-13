/* ════════════════════════════════════════════════════════
   ILYA · main.js
   WebGL Quantum Particles Galaxy  +  GSAP Cinematic Idle
   No admin code · 60fps mobile · Memory-safe
   ════════════════════════════════════════════════════════ */

'use strict';

/* ─── Tiny helpers ─── */
const qs = (s, p = document) => p.querySelector(s);
const qsa = (s, p = document) => [...p.querySelectorAll(s)];
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const CFG = window.ILYA || {};

const LOADER_MSGS = [
    'INITIALIZING SYSTEM',
    'LOADING ASSETS',
    'CALIBRATING RENDERER',
    'BUILDING UNIVERSE',
    'SYSTEM ONLINE'
];

/* ════════════════════════════════════════════════════════
   VISITOR COUNTER
════════════════════════════════════════════════════════ */
function initVisitor() {
    try {
        const n = (parseInt(localStorage.getItem('ilya_vc') || '0', 10)) + 1;
        localStorage.setItem('ilya_vc', String(n));
        const el = qs('#visit-count');
        if (el) el.textContent = n.toLocaleString('en-US');
    } catch (_) {}
}

/* ════════════════════════════════════════════════════════
   APPLY CONFIG TO DOM
════════════════════════════════════════════════════════ */
function applyConfig() {
    const map = {
        '#profile-name-txt': 'profileName',
        '#profile-subtitle-txt': 'profileSubtitle',
        '#bracket-open': 'bracketOpen',
        '#bracket-close': 'bracketClose',
        '#profile-desc-txt': 'profileDesc',
        '#section-title-txt': 'sectionTitle',
        '#cover-hud-txt': 'coverHudText',
        '#footer-copy-txt': 'footerCopy',
        '#footer-url-label-txt': 'footerUrlLabel',
        '#footer-vis-label': 'footerVisLabel'
    };
    for (const [sel, key] of Object.entries(map)) {
        const el = qs(sel);
        if (el && CFG[key]) el.textContent = CFG[key];
    }
    const urlEl = qs('#footer-url-link');
    if (urlEl && CFG.footerUrl) urlEl.href = CFG.footerUrl;

    const bannerEl = qs('#banner-img');
    if (bannerEl && CFG.bannerUrl) bannerEl.src = CFG.bannerUrl;

    const profileEl = qs('#profile-img');
    if (profileEl && CFG.profileUrl) profileEl.src = CFG.profileUrl;

    const ldrLogo = qs('#ldr-logo-img');
    if (ldrLogo && CFG.logoUrl) ldrLogo.src = CFG.logoUrl;
}

/* ════════════════════════════════════════════════════════
   BUILD LINK CARDS
════════════════════════════════════════════════════════ */
function buildLinks() {
    const grid = qs('#links-grid');
    const links = Array.isArray(CFG.links) ? CFG.links : [];
    if (!grid || !links.length) return;

    grid.innerHTML = '';
    links.forEach(({ name = '', url = '#', icon = '', handle = '', color = '#ff0033' }) => {
        const a = document.createElement('a');
        a.className = 'app-card';
        a.href = url;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        a.setAttribute('aria-label', name);
        a.innerHTML = `
      <div class="ac-glow"  aria-hidden="true"></div>
      <div class="ac-sheen" aria-hidden="true"></div>
      <div class="aib" style="box-shadow:0 0 22px ${color}28,0 6px 14px rgba(0,0,0,.72);">
        <div class="ihalo" style="box-shadow:0 0 22px ${color}55 inset;" aria-hidden="true"></div>
        <i class="${icon}" style="color:${color};" aria-hidden="true"></i>
      </div>
      <span class="an">${name}</span>
      <span class="ah">${handle}</span>`;
        grid.appendChild(a);
    });
}

/* ════════════════════════════════════════════════════════
   LOADER
════════════════════════════════════════════════════════ */
function runLoader(onComplete) {
    const loader = qs('#loader');
    const fillEl = qs('#ldr-fill');
    const headEl = qs('#ldr-head');
    const pctEl = qs('#ldr-pct');
    const statEl = qs('#ldr-status');
    if (!loader) { onComplete(); return; }

    let pct = 0,
        msgIdx = 0,
        raf;
    const start = performance.now();
    const minMs = 2700;

    function tick(now) {
        const natural = clamp((now - start) / minMs * 100, 0, 100);
        pct = clamp(pct + (natural - pct) * 0.055, 0, 100);
        const pi = Math.round(pct);

        if (fillEl) fillEl.style.width = pct + '%';
        if (headEl) headEl.style.right = (100 - pct) + '%';
        if (pctEl) pctEl.textContent = pi + '%';

        const ni = Math.min(Math.floor(pct / 22), LOADER_MSGS.length - 1);
        if (ni !== msgIdx) {
            msgIdx = ni;
            if (statEl) {
                statEl.style.opacity = '0';
                setTimeout(() => {
                    if (statEl) { statEl.textContent = LOADER_MSGS[msgIdx];
                        statEl.style.opacity = '1'; }
                }, 200);
            }
        }

        if (pct < 99.9) {
            raf = requestAnimationFrame(tick);
        } else {
            if (pctEl) pctEl.textContent = '100%';
            setTimeout(() => {
                loader.classList.add('hidden');
                loader.addEventListener('transitionend', () => { loader.remove();
                    onComplete(); }, { once: true });
            }, 380);
        }
    }
    raf = requestAnimationFrame(tick);

    setTimeout(() => {
        cancelAnimationFrame(raf);
        if (loader.isConnected) {
            loader.classList.add('hidden');
            loader.addEventListener('transitionend', () => { loader.remove();
                onComplete(); }, { once: true });
        }
    }, 8500);
}

/* ════════════════════════════════════════════════════════
   WebGL — QUANTUM PARTICLES GALAXY
   Uses global THREE loaded via CDN script tag
════════════════════════════════════════════════════════ */
const Galaxy = (() => {
    let renderer, scene, camera, points, animId;
    let W = window.innerWidth,
        H = window.innerHeight;
    const mouse = { x: 0, y: 0 };
    const targetRot = { x: 0, y: 0 };
    const currentRot = { x: 0, y: 0 };

    /* Adaptive particle count — optimized for 60fps */
    const COUNT = (() => {
        const a = W * H;
        if (a < 250000) return 3500;
        if (a < 600000) return 5500;
        return 8000;
    })();

    /* GLSL shaders */
    const vert = `
    attribute float aSize;
    attribute float aAlpha;
    attribute float aSpeed;
    attribute vec3  aColor;
    varying   float vAlpha;
    varying   vec3  vColor;
    uniform   float uTime;
    uniform   float uDpr;
    void main(){
      vAlpha = aAlpha;
      vColor = aColor;
      vec3 p = position;
      float wave = sin(uTime * aSpeed + p.x * 2.2) * 0.06;
      p.y += wave;
      p.z += cos(uTime * aSpeed * 0.75 + p.y * 1.6) * 0.045;
      vec4 mv = modelViewMatrix * vec4(p, 1.0);
      gl_PointSize = aSize * uDpr * (300.0 / -mv.z);
      gl_Position  = projectionMatrix * mv;
    }
  `;
    const frag = `
    varying float vAlpha;
    varying vec3  vColor;
    void main(){
      vec2  uv   = gl_PointCoord * 2.0 - 1.0;
      float d    = length(uv);
      if(d > 1.0) discard;
      float core = smoothstep(1.0, 0.0, d);
      float glow = pow(core, 2.2) * 1.5;
      float ray  = pow(core, 5.5) * 0.7;
      float a    = (glow + ray) * vAlpha;
      gl_FragColor = vec4(vColor * (glow + ray), a);
    }
  `;

    function buildGeo() {
        const N = COUNT;
        const pos = new Float32Array(N * 3);
        const sizes = new Float32Array(N);
        const alpha = new Float32Array(N);
        const speed = new Float32Array(N);
        const color = new Float32Array(N * 3);
        const ARMS = 4;

        for (let i = 0; i < N; i++) {
            const inCore = i < N * 0.12;
            const inHalo = i > N * 0.82;

            let r, theta, phi;
            if (inCore) {
                r = Math.random() * 0.72;
                theta = Math.random() * Math.PI * 2;
                phi = (Math.random() - 0.5) * 0.55;
            } else if (inHalo) {
                r = 4.0 + Math.random() * 2.8;
                theta = Math.random() * Math.PI * 2;
                phi = (Math.random() - 0.5) * 0.9;
            } else {
                const arm = Math.floor(Math.random() * ARMS);
                r = 0.65 + Math.pow(Math.random(), 0.55) * 3.5;
                const base = (arm / ARMS) * Math.PI * 2;
                theta = base + r * 0.62 + (Math.random() - 0.5) * 0.55 / (r + 0.4);
                phi = (Math.random() - 0.5) * 0.18 / (r * 0.5 + 1);
            }

            pos[i * 3] = r * Math.cos(theta) * Math.cos(phi);
            pos[i * 3 + 1] = r * Math.sin(phi) * 0.35;
            pos[i * 3 + 2] = r * Math.sin(theta) * Math.cos(phi);

            /* Red-to-white palette */
            const t = clamp(r / 5.8, 0, 1);
            let cr, cg, cb;
            if (t < 0.22) {
                cr = 1.0;
                cg = 0.8;
                cb = 0.76;
            } else if (t < 0.55) {
                const f = (t - 0.22) / 0.33;
                cr = 1.0;
                cg = 0.8 * (1 - f) + 0.0 * f;
                cb = 0.76 * (1 - f) + 0.04 * f;
            } else if (t < 0.78) {
                const f = (t - 0.55) / 0.23;
                cr = 1.0;
                cg = 0.0 * (1 - f) + 0.0 * f;
                cb = 0.04 * (1 - f) + 0.05 * f;
            } else {
                const f = clamp((t - 0.78) / 0.22, 0, 1);
                cr = 1.0 * (1 - f) + 0.6 * f;
                cg = 0.0 * (1 - f) + 0.3 * f;
                cb = 0.05 * (1 - f) + 0.3 * f;
            }
            const b = 0.65 + Math.random() * 0.55;
            color[i * 3] = clamp(cr * b, 0, 1);
            color[i * 3 + 1] = clamp(cg * b, 0, 1);
            color[i * 3 + 2] = clamp(cb * b, 0, 1);

            sizes[i] = inCore ? 1.9 + Math.random() * 2.4 : 0.55 + Math.random() * 2.0;
            alpha[i] = inHalo ? 0.14 + Math.random() * 0.42 : 0.32 + Math.random() * 0.68;
            speed[i] = 0.1 + Math.random() * 0.55;
        }

        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
        geo.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
        geo.setAttribute('aAlpha', new THREE.BufferAttribute(alpha, 1));
        geo.setAttribute('aSpeed', new THREE.BufferAttribute(speed, 1));
        geo.setAttribute('aColor', new THREE.BufferAttribute(color, 3));
        return geo;
    }

    function init() {
        if (typeof THREE === 'undefined') return;
        const canvas = qs('#canvas-bg');
        if (!canvas) return;

        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: true, powerPreference: 'high-performance' });
        renderer.setPixelRatio(dpr);
        renderer.setSize(W, H);
        renderer.setClearColor(0x000000, 0);

        scene = new THREE.Scene();
        camera = new THREE.PerspectiveCamera(60, W / H, 0.1, 100);
        camera.position.set(0, 1.7, 7.8);
        camera.lookAt(0, 0, 0);

        const mat = new THREE.ShaderMaterial({
            vertexShader: vert,
            fragmentShader: frag,
            uniforms: { uTime: { value: 0 }, uDpr: { value: dpr } },
            transparent: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending
        });

        points = new THREE.Points(buildGeo(), mat);
        scene.add(points);

        /* Mouse parallax */
        window.addEventListener('mousemove', e => {
            mouse.x = (e.clientX / W) * 2 - 1;
            mouse.y = (e.clientY / H) * 2 - 1;
        }, { passive: true });

        /* Gyroscope for mobile */
        window.addEventListener('deviceorientation', e => {
            if (e.beta !== null && e.gamma !== null) {
                mouse.x = clamp(e.gamma / 45, -1, 1);
                mouse.y = clamp(e.beta / 90 - 0.5, -1, 1);
            }
        }, { passive: true });

        let t0 = null;

        function frame(now) {
            animId = requestAnimationFrame(frame);
            if (!t0) t0 = now;
            const t = (now - t0) * 0.001;

            mat.uniforms.uTime.value = t;

            targetRot.y = mouse.x * 0.38;
            targetRot.x = mouse.y * 0.18;
            currentRot.x += (targetRot.x - currentRot.x) * 0.028;
            currentRot.y += (targetRot.y - currentRot.y) * 0.028;

            points.rotation.y = t * 0.025 + currentRot.y;
            points.rotation.x = Math.sin(t * 0.015) * 0.12 + currentRot.x;
            points.rotation.z = Math.cos(t * 0.008) * 0.06;

            renderer.render(scene, camera);
        }
        animId = requestAnimationFrame(frame);

        window.addEventListener('resize', onResize, { passive: true });
    }

    function onResize() {
        W = window.innerWidth;
        H = window.innerHeight;
        if (!renderer) return;
        camera.aspect = W / H;
        camera.updateProjectionMatrix();
        renderer.setSize(W, H);
    }

    function destroy() {
        cancelAnimationFrame(animId);
        window.removeEventListener('resize', onResize);
        if (points) { points.geometry.dispose();
            points.material.dispose(); }
        if (renderer) renderer.dispose();
    }

    return { init, destroy };
})();

/* ════════════════════════════════════════════════════════
   GSAP CINEMATIC IDLE ANIMATIONS
════════════════════════════════════════════════════════ */
function initGSAP() {
    if (typeof gsap === 'undefined') return;

    /* ── Card entrance ── */
    gsap.fromTo('#main-card', { opacity: 0, y: 55 }, { opacity: 1, y: 0, duration: 1.5, ease: 'expo.out', delay: 0.1 });

    /* ── Profile photo — perpetual float ── */
    gsap.to('#profile-wrap', { y: -12, duration: 4.0, ease: 'sine.inOut', yoyo: true, repeat: -1, delay: 0.4 });

    /* ── Banner breathe ── */
    gsap.to('#banner-img', { scaleY: 1.013, duration: 6, ease: 'sine.inOut', yoyo: true, repeat: -1, transformOrigin: 'center bottom' });

    /* ── Card heartbeat (y only) ── */
    gsap.to('#main-card', { y: '-=5', duration: 7.5, ease: 'sine.inOut', yoyo: true, repeat: -1, delay: 2 });

    /* ── Desc box float ── */
    gsap.to('.desc-box', { y: -4, duration: 5.5, ease: 'sine.inOut', yoyo: true, repeat: -1, delay: 1 });

    /* ── Section title float ── */
    gsap.to('.section-title', { y: -6, duration: 5, ease: 'sine.inOut', yoyo: true, repeat: -1, delay: 1.4 });

    /* ── Link cards — staggered random bounce + entrance ── */
    qsa('.app-card').forEach((card, i) => {
        const dur = 2.6 + Math.random() * 2.6;
        const yAmt = 7 + Math.random() * 10;
        const delay = i * 0.12 + Math.random() * 0.45;

        gsap.fromTo(card, { opacity: 0, y: 28, scale: 0.8 }, { opacity: 1, y: 0, scale: 1, duration: 0.72, ease: 'back.out(1.6)', delay: 0.55 + i * 0.07 });

        gsap.to(card, { y: -yAmt, duration: dur, ease: 'sine.inOut', yoyo: true, repeat: -1, delay });
    });

    /* ── Footer entrance ── */
    gsap.fromTo('.site-footer', { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: 1.1, ease: 'expo.out', delay: 1 });
}

/* ════════════════════════════════════════════════════════
   IMAGE MODAL
════════════════════════════════════════════════════════ */
function initModal() {
    const modal = qs('#img-modal');
    const modalImg = qs('#modal-img');
    const closeBtn = qs('#modal-close');
    if (!modal || !modalImg || !closeBtn) return;

    function open(src) {
        if (!src) return;
        modalImg.src = src;
        modal.classList.add('active');
        modal.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';
        closeBtn.focus();
    }

    function close() {
        modal.classList.remove('active');
        modal.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';
        setTimeout(() => { modalImg.src = ''; }, 440);
    }

    const bannerWrap = qs('#banner-wrap');
    const profileWrap = qs('#profile-wrap');
    const bannerImg = qs('#banner-img');
    const profileImg = qs('#profile-img');

    if (bannerWrap && bannerImg) {
        const t = () => open(bannerImg.src);
        bannerWrap.addEventListener('click', t);
        bannerWrap.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault();
                t(); } });
    }
    if (profileWrap && profileImg) {
        const t = () => open(profileImg.src);
        profileWrap.addEventListener('click', t);
        profileWrap.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault();
                t(); } });
    }

    closeBtn.addEventListener('click', close);
    modal.addEventListener('click', e => { if (e.target === modal) close(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && modal.classList.contains('active')) close(); });
}

/* ════════════════════════════════════════════════════════
   BOOT
════════════════════════════════════════════════════════ */
function boot() {
    applyConfig();
    buildLinks();
    initVisitor();
    initModal();
    Galaxy.init();

    runLoader(() => {
        initGSAP();
    });
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
} else {
    boot();
}

/* Memory-safe cleanup */
window.addEventListener('pagehide', () => Galaxy.destroy(), { once: true });
