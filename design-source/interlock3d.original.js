// <interlock-3d> — two intersecting wireframe cubes, solid copper intersection.
// The mark's logic (overlap = product) rendered in three dimensions.
(function () {
  if (window.customElements && customElements.get('interlock-3d')) return;

  class Interlock3D extends HTMLElement {
    connectedCallback() {
      if (this._booted) return;
      this._booted = true;
      this.style.display = 'block';
      this.style.width = this.style.width || '100%';
      this.style.height = this.style.height || '100%';
      this._boot();
    }

    disconnectedCallback() {
      this._alive = false;
      if (this._ro) this._ro.disconnect();
      if (this._io) this._io.disconnect();
      if (this._renderer) this._renderer.dispose();
    }

    async _boot() {
      let THREE;
      try {
        THREE = await import('https://esm.sh/three@0.160.1');
      } catch (e) {
        return;
      }
      if (!this.isConnected) return;
      this._alive = true;

      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const accent = this.getAttribute('accent') || '#E2643A';
      const shell = this.getAttribute('shell') || '#1A1C20';

      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.05;
      this._renderer = renderer;
      renderer.domElement.style.display = 'block';
      renderer.domElement.style.width = '100%';
      renderer.domElement.style.height = '100%';
      this.appendChild(renderer.domElement);

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
      camera.position.set(4.4, 2.9, 6.2);
      camera.lookAt(0, 0, 0);

      const group = new THREE.Group();
      group.rotation.set(0.18, -0.5, 0);
      scene.add(group);

      const S = 2.0; // cube side
      const OFF = S * 0.6; // diagonal offset = 60% of the side
      const OV = S - OFF; // intersection edge

      const edgeMat = new THREE.LineBasicMaterial({
        color: new THREE.Color(shell).multiplyScalar(3.1),
      });
      const faceMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(shell),
        roughness: 0.62,
        metalness: 0.35,
        transparent: true,
        opacity: 0.5,
        side: THREE.DoubleSide,
      });
      const cubeGeo = new THREE.BoxGeometry(S, S, S);
      const edgeGeo = new THREE.EdgesGeometry(cubeGeo);

      const placements = [
        [-OFF / 2, -OFF / 2, -OFF / 2],
        [OFF / 2, OFF / 2, OFF / 2],
      ];
      placements.forEach((p) => {
        const shellMesh = new THREE.Mesh(cubeGeo, faceMat);
        shellMesh.position.set(p[0], p[1], p[2]);
        group.add(shellMesh);
        const lines = new THREE.LineSegments(edgeGeo, edgeMat);
        lines.position.set(p[0], p[1], p[2]);
        group.add(lines);
      });

      // the overlap — the only lit, solid, coloured volume
      const seam = new THREE.Mesh(
        new THREE.BoxGeometry(OV, OV, OV),
        new THREE.MeshStandardMaterial({
          color: new THREE.Color(accent),
          roughness: 0.28,
          metalness: 0.85,
        })
      );
      group.add(seam);

      // a sparse field of metallic beads gathered around the seam
      const beadMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(accent).lerp(new THREE.Color('#F0D2C2'), 0.32),
        roughness: 0.16,
        metalness: 1.0,
      });
      const beadGeo = new THREE.SphereGeometry(1, 20, 16);
      const beads = new THREE.InstancedMesh(beadGeo, beadMat, 34);
      const m4 = new THREE.Matrix4();
      let seed = 7;
      const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
      for (let i = 0; i < 34; i++) {
        const r = 2.05 + rnd() * 1.15;
        const t = rnd() * Math.PI * 2;
        const ph = Math.acos(2 * rnd() - 1);
        const s = 0.055 + rnd() * 0.105;
        m4.makeScale(s, s, s);
        m4.setPosition(
          r * Math.sin(ph) * Math.cos(t),
          r * Math.cos(ph) * 0.78,
          r * Math.sin(ph) * Math.sin(t)
        );
        beads.setMatrixAt(i, m4);
      }
      group.add(beads);

      scene.add(new THREE.HemisphereLight(0xffffff, 0x1a1c20, 0.55));
      const key = new THREE.DirectionalLight(0xffffff, 2.5);
      key.position.set(5, 7, 5);
      scene.add(key);
      const rim = new THREE.DirectionalLight(new THREE.Color(accent), 1.5);
      rim.position.set(-6, -2, -4);
      scene.add(rim);
      const fill = new THREE.PointLight(0xffffff, 18, 20);
      fill.position.set(-3, 3, 5);
      scene.add(fill);

      const resize = () => {
        const w = this.clientWidth || 600;
        const h = this.clientHeight || 480;
        renderer.setSize(w, h, false);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.render(scene, camera);
      };
      this._ro = new ResizeObserver(resize);
      this._ro.observe(this);
      resize();

      if (reduce) return;

      let visible = true;
      this._io = new IntersectionObserver((es) => {
        visible = es[0].isIntersecting;
      });
      this._io.observe(this);

      let px = 0,
        py = 0,
        tx = 0,
        ty = 0;
      const onMove = (e) => {
        const r = this.getBoundingClientRect();
        tx = ((e.clientX - r.left) / r.width - 0.5) * 0.32;
        ty = ((e.clientY - r.top) / r.height - 0.5) * 0.22;
      };
      this.addEventListener('pointermove', onMove);
      this.addEventListener('pointerleave', () => {
        tx = 0;
        ty = 0;
      });

      const tick = () => {
        if (!this._alive) return;
        requestAnimationFrame(tick);
        if (!visible) return;
        px += (tx - px) * 0.05;
        py += (ty - py) * 0.05;
        group.rotation.y += 0.0022;
        group.rotation.x = 0.18 + py;
        group.position.x = px * 0.6;
        renderer.render(scene, camera);
      };
      requestAnimationFrame(tick);
    }
  }

  customElements.define('interlock-3d', Interlock3D);
})();
