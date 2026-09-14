import { prefersReducedMotion } from './env.js';

/**
 * <worklab-knot-3d> — the hero object.
 *
 * A single continuous glass trefoil knot with a copper filament running its
 * full length: one unbroken path that passes through its own loops three times.
 *
 * Three.js and the room environment are imported dynamically so they land in
 * their own bundle chunk, fetched only when the element is on the page. Every
 * failure path leaves the reserved space empty rather than throwing — the hero
 * sizes this well in CSS, so a missing scene costs no layout shift.
 *
 * Attributes (all optional):
 *   accent    copper filament and rim light       default #E2643A
 *   glass     body tint                           default #EDE9E2
 *   ground    colour the contact shadow sits on   default #F5F3EF
 *   shadow    "off" removes the contact shadow    default on
 *   spin      rotations per minute, 0 = static    default 1.4
 *   parallax  "off" disables pointer tilt         default on
 *   quality   "high" | "low" — low drops refraction
 *
 * Sets `data-ready` once rendering, or `data-failed` if Three.js never loaded.
 */

const DEFAULTS = {
  accent: '#E2643A',
  glass: '#EDE9E2',
  ground: '#F5F3EF',
  spin: 1.4,
};

/** Trefoil winding numbers. */
const KNOT_P = 2;
const KNOT_Q = 3;
const KNOT_RADIUS = 1.18;
const KNOT_TUBE = 0.3;

/**
 * Slack added to the knot's own bounding radius when framing it, in world
 * units. The group drifts and slides under pointer parallax, so the camera has
 * to frame more than the knot at rest or the outer loops clip at the extremes
 * of that movement. Covers the 0.19 of horizontal slide plus the 0.05 vertical
 * drift the animation applies, with a little left over.
 */
const FIT_MARGIN = 0.22;

/** How much of the gap the parallax closes per frame. */
const PARALLAX_EASING = 0.045;

class WorklabKnot3D extends HTMLElement {
  connectedCallback() {
    if (this.hasBooted) return;
    this.hasBooted = true;
    this.boot();
  }

  disconnectedCallback() {
    this.teardown?.();
  }

  /** Attribute value, treating absent and empty alike. */
  attr(name, fallback) {
    const value = this.getAttribute(name);
    return value === null || value === '' ? fallback : value;
  }

  async boot() {
    let THREE;
    let RoomEnvironment;
    try {
      [THREE, { RoomEnvironment }] = await Promise.all([
        import('three'),
        import('three/examples/jsm/environments/RoomEnvironment.js'),
      ]);
    } catch {
      this.setAttribute('data-failed', 'true');
      return;
    }

    // The element may have been removed while the chunk was in flight.
    if (!this.isConnected) return;

    const reduce = prefersReducedMotion();
    const lowEnd = this.attr('quality', 'high') === 'low';
    const accent = new THREE.Color(this.attr('accent', DEFAULTS.accent));
    const glassTint = new THREE.Color(this.attr('glass', DEFAULTS.glass));
    const groundColor = new THREE.Color(this.attr('ground', DEFAULTS.ground));
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
    this.append(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 120);
    const cameraDirection = new THREE.Vector3(0.04, 0.3, 1).normalize();

    // Set once the knot geometry exists, from its own bounding sphere — so the
    // framing stays correct if the knot's radius or tube thickness change.
    let fitRadius = 2.3;

    // Pull the camera back far enough to frame that radius on whichever axis is
    // tighter, so the object never crops when the well changes shape.
    const fitCamera = () => {
      const vFov = THREE.MathUtils.degToRad(camera.fov);
      const hFov = 2 * Math.atan(Math.tan(vFov / 2) * camera.aspect);
      const padding = this.clientWidth < 420 ? 1.12 : 1.02;
      const distance =
        Math.max(fitRadius / Math.sin(vFov / 2), fitRadius / Math.sin(hFov / 2)) * padding;
      camera.position.copy(cameraDirection).multiplyScalar(distance);
      camera.lookAt(0, 0, 0);
    };

    // Refraction needs something to refract: a room environment stands in for
    // the studio the glass is nominally sitting in.
    const pmrem = new THREE.PMREMGenerator(renderer);
    const envTarget = pmrem.fromScene(new RoomEnvironment(renderer), 0.05);
    scene.environment = envTarget.texture;

    const group = new THREE.Group();
    group.rotation.set(0.3, -0.35, 0);
    scene.add(group);

    // Track every disposable so the GPU resources are released on removal.
    const disposables = [];
    const track = (resource) => {
      disposables.push(resource);
      return resource;
    };

    const body = new THREE.Mesh(
      track(
        new THREE.TorusKnotGeometry(
          KNOT_RADIUS,
          KNOT_TUBE,
          lowEnd ? 96 : 260,
          lowEnd ? 12 : 32,
          KNOT_P,
          KNOT_Q
        )
      ),
      track(
        new THREE.MeshPhysicalMaterial({
          color: glassTint,
          metalness: 0,
          roughness: 0.07,
          // Real transmission is the expensive part; "low" falls back to plain
          // translucency instead.
          transmission: lowEnd ? 0 : 0.94,
          thickness: 0.95,
          ior: 1.48,
          clearcoat: 1,
          clearcoatRoughness: 0.05,
          transparent: !lowEnd,
          opacity: lowEnd ? 0.55 : 1,
          envMapIntensity: 1.3,
          attenuationColor: glassTint.clone().lerp(accent, 0.22),
          attenuationDistance: 2.6,
        })
      )
    );
    body.castShadow = wantShadow;
    group.add(body);

    // Measure what actually has to fit, rather than assuming it.
    body.geometry.computeBoundingSphere();
    fitRadius = body.geometry.boundingSphere.radius + FIT_MARGIN;

    // The same path again, thin and solid — the copper core seen through the glass.
    const filament = new THREE.Mesh(
      track(
        new THREE.TorusKnotGeometry(
          KNOT_RADIUS,
          0.055,
          lowEnd ? 96 : 280,
          lowEnd ? 8 : 18,
          KNOT_P,
          KNOT_Q
        )
      ),
      track(
        new THREE.MeshStandardMaterial({
          color: accent,
          metalness: 1,
          roughness: 0.24,
          envMapIntensity: 1.5,
        })
      )
    );
    group.add(filament);

    scene.add(new THREE.HemisphereLight(0xffffff, groundColor.getHex(), 0.9));

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
      // Catches the contact shadow only; the plane itself stays invisible.
      const floor = new THREE.Mesh(
        track(new THREE.PlaneGeometry(14, 14)),
        track(new THREE.ShadowMaterial({ color: 0x2a2420, opacity: 0.1 }))
      );
      floor.rotation.x = -Math.PI / 2;
      floor.position.y = -2.05;
      floor.receiveShadow = true;
      scene.add(floor);
    }

    const render = () => renderer.render(scene, camera);

    const resize = () => {
      const width = this.clientWidth || 640;
      const height = this.clientHeight || 480;
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      fitCamera();
      camera.updateProjectionMatrix();
      render();
    };

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(this);
    resize();

    this.setAttribute('data-ready', 'true');

    const dispose = () => {
      resizeObserver.disconnect();
      disposables.forEach((resource) => resource.dispose());
      envTarget.dispose();
      pmrem.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };

    // A single still frame is the whole experience when nothing should move.
    if (reduce || (rpm === 0 && !wantParallax)) {
      this.teardown = dispose;
      return;
    }

    this.teardown = this.animate({ group, render, dispose, rpm, wantParallax });
  }

  /**
   * Idle spin, a slow drift, and optional pointer parallax. Pauses whenever the
   * element is scrolled out of view so an off-screen canvas costs nothing.
   *
   * @returns {() => void} cleanup function
   */
  animate({ group, render, dispose, rpm, wantParallax }) {
    let isVisible = true;
    let frame = null;

    const visibility = new IntersectionObserver(([entry]) => {
      isVisible = entry.isIntersecting;
    });
    visibility.observe(this);

    let currentX = 0;
    let currentY = 0;
    let targetX = 0;
    let targetY = 0;

    const onPointerMove = (event) => {
      const rect = this.getBoundingClientRect();
      targetX = ((event.clientX - rect.left) / rect.width - 0.5) * 0.55;
      targetY = ((event.clientY - rect.top) / rect.height - 0.5) * 0.32;
    };

    const onPointerLeave = () => {
      targetX = 0;
      targetY = 0;
    };

    if (wantParallax) {
      this.addEventListener('pointermove', onPointerMove);
      this.addEventListener('pointerleave', onPointerLeave);
    }

    // rpm → radians per frame, assuming 60fps.
    const spin = (rpm * Math.PI * 2) / 3600;
    let elapsed = 0;

    const tick = () => {
      frame = requestAnimationFrame(tick);
      if (!isVisible) return;

      elapsed += 0.016;
      currentX += (targetX - currentX) * PARALLAX_EASING;
      currentY += (targetY - currentY) * PARALLAX_EASING;

      group.rotation.y += spin;
      group.rotation.x = 0.3 + currentY + Math.sin(elapsed * 0.4) * 0.04;
      group.rotation.z = Math.sin(elapsed * 0.28) * 0.05;
      group.position.y = Math.sin(elapsed * 0.55) * 0.05;
      group.position.x = currentX * 0.7;

      render();
    };

    frame = requestAnimationFrame(tick);

    return () => {
      if (frame !== null) cancelAnimationFrame(frame);
      visibility.disconnect();
      this.removeEventListener('pointermove', onPointerMove);
      this.removeEventListener('pointerleave', onPointerLeave);
      dispose();
    };
  }
}

/** Registers <worklab-knot-3d>. Safe to call more than once. */
export function defineWorklabKnot3D() {
  if (!customElements.get('worklab-knot-3d')) {
    customElements.define('worklab-knot-3d', WorklabKnot3D);
  }
}
