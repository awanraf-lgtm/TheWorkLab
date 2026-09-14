/*!
 * <interlock-knot-3d> — light-mode hero object, alternate cut.
 *
 * A single continuous glass trefoil knot with a copper filament running its full
 * length. Where the ring version says "two systems, one shared core", this one says
 * "one system that never stops returning to itself" — it is one unbroken path that
 * passes through its own loops three times.
 *
 * Same integration contract as <interlock-glass-3d>, so the two are drop-in
 * interchangeable: light-background tuned, transparent canvas, real refraction,
 * soft contact shadow, pauses off-screen, honours prefers-reduced-motion.
 *
 * USAGE
 *   <script src="/js/interlock-knot-3d.js"></script>
 *   <div style="height:520px">
 *     <interlock-knot-3d></interlock-knot-3d>
 *   </div>
 *
 * ATTRIBUTES (all optional)
 *   accent      copper filament + rim light           default "#E2643A"
 *   glass       body tint                              default "#EDE9E2"
 *   ground      colour the contact shadow sits on      default "#F5F3EF"
 *   shadow      "off" removes the contact shadow       default on
 *   spin        rotations per minute, 0 = static       default 1.4
 *   parallax    "off" disables pointer tilt            default on
 *   quality     "high" | "low" — low drops refraction
 *   three-src   override the three.js module URL
 */
(function () {
  if (window.customElements && customElements.get('interlock-knot-3d')) return;

  const DEFAULTS = {
    accent: '#E2643A',
    glass: '#EDE9E2',
    ground: '#F5F3EF',
    spin: 1.4,
    threeSrc: 'https://esm.sh/three@0.160.1'
  };

  class InterlockKnot3D extends HTMLElement {
    connectedCallback() {
      if (this._booted) return;
      this._booted = true;
      this.style.display = 'block';
      if (!this.style.width) this.style.width = '100%';
      if (!this.style.height) this.style.height = '100%';
      this._boot();
    }

    disconnectedCallback() {
      this._alive = false;
      if (this._ro) this._ro.disconnect();
      if (this._io) this._io.disconnect();
      if (this._env) this._env.dispose();
      if (this._renderer) {
        this._renderer.dispose();
        if (this._renderer.domElement.parentNode) {
          this._renderer.domElement.parentNode.removeChild(this._renderer.domElement);
        }
      }
    }

    attr(name, fallback) {
      const v = this.getAttribute(name);
      return v === null || v === '' ? fallback : v;
    }

    async _boot() {
      const src = this.attr('three-src', DEFAULTS.threeSrc);
      let THREE, RoomEnvironment;
      try {
        THREE = await import(/* webpackIgnore: true */ src);
        const envMod = await import(/* webpackIgnore: true */ src.replace(/\/?$/, '') + '/examples/jsm/environments/RoomEnvironment.js');
        RoomEnvironment = envMod.RoomEnvironment;
      } catch (e) {
        this.setAttribute('data-failed', 'true');
        return;
      }
      if (!this.isConnected) return;
      this._alive = true;

      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const lowEnd = this.attr('quality', 'high') === 'low';
      const accent = new THREE.Color(this.attr('accent', DEFAULTS.accent));
      const glassTint = new THREE.Color(this.attr('glass', DEFAULTS.glass));
      const groundCol = new THREE.Color(this.attr('ground', DEFAULTS.ground));
      const rpm = parseFloat(this.attr('spin', DEFAULTS.spin)) || 0;
      const wantShadow = this.attr('shadow', 'on') !== 'off';
      const wantParallax = this.attr('parallax', 'on') !== 'off' && !reduce;

      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, lowEnd ? 1.25 : 2));
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.12;
      renderer.shadowMap.enabled = wantShadow;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      renderer.domElement.style.cssText = 'display:block;width:100%;height:100%';
      this._renderer = renderer;
      this.appendChild(renderer.domElement);

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 120);
      const camDir = new THREE.Vector3(0.04, 0.3, 1).normalize();
      const FIT = 2.5;
      const fitCamera = () => {
        const vFov = THREE.MathUtils.degToRad(camera.fov);
        const hFov = 2 * Math.atan(Math.tan(vFov / 2) * camera.aspect);
        const pad = this.clientWidth < 420 ? 1.2 : 1.08;
        const d = Math.max(FIT / Math.sin(vFov / 2), FIT / Math.sin(hFov / 2)) * pad;
        camera.position.copy(camDir).multiplyScalar(d);
        camera.lookAt(0, 0, 0);
      };

      const pmrem = new THREE.PMREMGenerator(renderer);
      const envRT = pmrem.fromScene(new RoomEnvironment(renderer), 0.05);
      scene.environment = envRT.texture;
      this._env = { dispose: () => { envRT.dispose(); pmrem.dispose(); } };

      const group = new THREE.Group();
      group.rotation.set(0.3, -0.35, 0);
      scene.add(group);

      const P = 2, Q = 3;      // trefoil
      const RAD = 1.18;
      const TUBE = 0.3;

      const body = new THREE.Mesh(
        new THREE.TorusKnotGeometry(RAD, TUBE, lowEnd ? 96 : 260, lowEnd ? 12 : 32, P, Q),
        new THREE.MeshPhysicalMaterial({
          color: glassTint,
          metalness: 0,
          roughness: 0.07,
          transmission: lowEnd ? 0 : 0.94,
          thickness: 0.95,
          ior: 1.48,
          clearcoat: 1,
          clearcoatRoughness: 0.05,
          transparent: !lowEnd,
          opacity: lowEnd ? 0.55 : 1,
          envMapIntensity: 1.3,
          attenuationColor: glassTint.clone().lerp(accent, 0.22),
          attenuationDistance: 2.6
        })
      );
      body.castShadow = wantShadow;
      group.add(body);

      // The copper filament: the same path, thin and solid, visible through the glass.
      const filament = new THREE.Mesh(
        new THREE.TorusKnotGeometry(RAD, 0.055, lowEnd ? 96 : 280, lowEnd ? 8 : 18, P, Q),
        new THREE.MeshStandardMaterial({ color: accent, metalness: 1, roughness: 0.24, envMapIntensity: 1.5 })
      );
      group.add(filament);

      scene.add(new THREE.HemisphereLight(0xffffff, groundCol.getHex(), 0.9));
      const key = new THREE.DirectionalLight(0xffffff, 2.1);
      key.position.set(3.2, 6.6, 4.4);
      if (wantShadow) {
        key.castShadow = true;
        key.shadow.mapSize.set(lowEnd ? 512 : 1024, lowEnd ? 512 : 1024);
        key.shadow.camera.near = 1;
        key.shadow.camera.far = 22;
        key.shadow.camera.left = -4;
        key.shadow.camera.right = 4;
        key.shadow.camera.top = 4;
        key.shadow.camera.bottom = -4;
        key.shadow.bias = -0.0012;
        key.shadow.radius = 8;
      }
      scene.add(key);
      const rim = new THREE.DirectionalLight(accent, 1.2);
      rim.position.set(-4.6, -1.6, -3);
      scene.add(rim);

      if (wantShadow) {
        const floor = new THREE.Mesh(
          new THREE.PlaneGeometry(14, 14),
          new THREE.ShadowMaterial({ color: 0x2a2420, opacity: 0.1 })
        );
        floor.rotation.x = -Math.PI / 2;
        floor.position.y = -2.05;
        floor.receiveShadow = true;
        scene.add(floor);
      }

      const resize = () => {
        const w = this.clientWidth || 640;
        const h = this.clientHeight || 480;
        renderer.setSize(w, h, false);
        camera.aspect = w / h;
        fitCamera();
        camera.updateProjectionMatrix();
        renderer.render(scene, camera);
      };
      this._ro = new ResizeObserver(resize);
      this._ro.observe(this);
      resize();

      this.setAttribute('data-ready', 'true');
      if (reduce || (rpm === 0 && !wantParallax)) return;

      let visible = true;
      this._io = new IntersectionObserver(es => { visible = es[0].isIntersecting; });
      this._io.observe(this);

      let px = 0, py = 0, tx = 0, ty = 0;
      if (wantParallax) {
        this.addEventListener('pointermove', e => {
          const r = this.getBoundingClientRect();
          tx = ((e.clientX - r.left) / r.width - 0.5) * 0.55;
          ty = ((e.clientY - r.top) / r.height - 0.5) * 0.32;
        });
        this.addEventListener('pointerleave', () => { tx = 0; ty = 0; });
      }

      const spin = (rpm * Math.PI * 2) / 3600;
      let t = 0;
      const tick = () => {
        if (!this._alive) return;
        requestAnimationFrame(tick);
        if (!visible) return;
        t += 0.016;
        px += (tx - px) * 0.045;
        py += (ty - py) * 0.045;
        group.rotation.y += spin;
        group.rotation.x = 0.3 + py + Math.sin(t * 0.4) * 0.04;
        group.rotation.z = Math.sin(t * 0.28) * 0.05;
        group.position.y = Math.sin(t * 0.55) * 0.05;
        group.position.x = px * 0.7;
        renderer.render(scene, camera);
      };
      requestAnimationFrame(tick);
    }
  }

  customElements.define('interlock-knot-3d', InterlockKnot3D);
})();
