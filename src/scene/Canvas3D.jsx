// src/scene/Canvas3D.jsx
import React, { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import HUD from "../ui/HUD";
import EndOfLevelModal from "../ui/EndOfLevelModal";
import { useNavigate, useParams } from "react-router-dom";

/**
 * Canvas3D.jsx
 *
 * - Multi-level mini-golf scene (levels 1..5)
 * - Preserves your original aim/trajectory/physics/sinking/confetti logic
 * - Level-specific obstacles and behaviors:
 *   L1: baseline
 *   L2: ramp + stationary obstacles + oscillating block
 *   L3: rotating planks (moving obstacles)
 *   L4: water pond (changes friction)
 *   L5: hot-wheels style ramp + jump/landing
 *
 * Note: Keep HUD and EndOfLevelModal components available at ../ui/.
 */

export default function Canvas3D(props) {
  const {
    onHoleComplete, // callback to parent to set holeDone flag AFTER sink completes
    holeDone = false,
    onNextHole,
    strokes = 0,
    setStrokes,
    setHoleDone,
  } = props;

  // route param -> level
  const { levelId } = useParams();
  const level = Math.min(5, Math.max(1, parseInt(levelId || "1", 10)));

  const mountRef = useRef(null);
  const navigate = useNavigate();

  // persistent object refs
  const ballRef = useRef(null);
  const holeRef = useRef(null);
  const velocityRef = useRef(new THREE.Vector3());
  const confettiPoolRef = useRef([]);
  const flagRef = useRef(null);
  const sinkingRef = useRef({ active: false, t: 0, start: null, end: null });
  const holeTriggeredRef = useRef(false);

  // constants
  const BALL_RADIUS = 0.6;
  const HOLE_RADIUS = BALL_RADIUS * 2;
  const COURSE_SIZE = 22; // slightly bigger
  const COURSE_LIMIT = COURSE_SIZE / 2 - 0.6;

  // audio
  const celebrationAudioRef = useRef(null);
  useEffect(() => {
    // create once
    try {
      celebrationAudioRef.current = new Audio("/audio/celebration.mp3");
    } catch (e) {
      celebrationAudioRef.current = null;
    }
  }, []);

  // main setup / tear-down
  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    // Scene + camera + renderer
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87ceeb);

    const camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    // camera: 45deg above, back a bit to keep a studio view
    camera.position.set(14, 14, 12);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    mount.appendChild(renderer.domElement);

    // Lights
    const hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 0.95);
    scene.add(hemi);
    const sun = new THREE.DirectionalLight(0xffffff, 0.9);
    sun.position.set(30, 40, 10);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    scene.add(sun);

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.enablePan = false;
    controls.minDistance = 6;
    controls.maxDistance = 48;
    // lock polar so camera can't go below minimum elevation
    controls.minPolarAngle = Math.PI / 6; // ~30 degrees
    controls.maxPolarAngle = Math.PI / 2.2; // slightly above horizon
    controls.target.set(0, BALL_RADIUS, 0);

    // Surroundings: trees and low hills (keeps aesthetic)
    (function addSurroundings() {
      const treeMat = new THREE.MeshStandardMaterial({ color: 0x2e7d32 });
      const trunkMat = new THREE.MeshStandardMaterial({ color: 0x8b5a2b });
      for (let i = 0; i < 18; i++) {
        const a = (i / 18) * Math.PI * 2;
        const r = COURSE_SIZE * 0.9 + 2 + Math.random() * 3;
        const x = Math.cos(a) * r + (Math.random() - 0.5) * 2;
        const z = Math.sin(a) * r + (Math.random() - 0.5) * 2;
        const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 1.2), trunkMat);
        trunk.position.set(x, 0.6, z);
        scene.add(trunk);
        const foliage = new THREE.Mesh(new THREE.ConeGeometry(0.9, 1.6, 8), treeMat);
        foliage.position.set(x, 1.6, z);
        scene.add(foliage);
      }

      // hills
      const hillMat = new THREE.MeshStandardMaterial({ color: 0x3aa55a, roughness: 0.95 });
      const h1 = new THREE.Mesh(new THREE.SphereGeometry(9, 16, 12), hillMat);
      h1.scale.set(1, 0.45, 1.4);
      h1.position.set(-22, -7.5, -18);
      scene.add(h1);
      const h2 = h1.clone();
      h2.position.set(20, -8, 20);
      scene.add(h2);
    })();

    // Ground: checkered / different sizes per level
    const groundGroup = new THREE.Group();
    if (level === 1) {
      const divisions = 6;
      const squareSize = COURSE_SIZE / divisions;
      const colors = [0x66bb66, 0x228822];
      for (let i = 0; i < divisions; i++) {
        for (let j = 0; j < divisions; j++) {
          const color = colors[(i + j) % 2];
          const square = new THREE.Mesh(
            new THREE.PlaneGeometry(squareSize, squareSize),
            new THREE.MeshStandardMaterial({ color })
          );
          square.rotation.x = -Math.PI / 2;
          square.position.set(
            -COURSE_SIZE / 2 + i * squareSize + squareSize / 2,
            0,
            -COURSE_SIZE / 2 + j * squareSize + squareSize / 2
          );
          groundGroup.add(square);
        }
      }
    } else if (level === 2) {
      // L-shaped course with bigger check squares
      const colors = [0x7bd67b, 0x2e9a3a];
      for (let i = -5; i <= 5; i++) {
        for (let j = -11; j <= 5; j++) {
          // carve L: skip zone upper-right
          if (i > 2 && j > -1) continue;
          const sq = new THREE.Mesh(
            new THREE.PlaneGeometry(2, 2),
            new THREE.MeshStandardMaterial({ color: colors[(i + j + 100) % 2] })
          );
          sq.rotation.x = -Math.PI / 2;
          sq.position.set(i * 2, 0, j * 2);
          groundGroup.add(sq);
        }
      }
    } else if (level === 3) {
      // baseline grid but centered and a little denser
      const colors = [0x66bb66, 0x228822];
      const squareSize = 1.6;
      const grid = 10;
      for (let i = -grid; i <= grid; i++) {
        for (let j = -grid; j <= grid; j++) {
          const color = colors[(i + j + 100) % 2];
          const sq = new THREE.Mesh(
            new THREE.PlaneGeometry(squareSize, squareSize),
            new THREE.MeshStandardMaterial({ color })
          );
          sq.rotation.x = -Math.PI / 2;
          sq.position.set(i * squareSize, 0, j * squareSize);
          groundGroup.add(sq);
        }
      }
    } else if (level === 4) {
      // same as level 1 but darken some squares
      const divisions = 6;
      const squareSize = COURSE_SIZE / divisions;
      const colors = [0x66bb66, 0x1f7d32];
      for (let i = 0; i < divisions; i++) {
        for (let j = 0; j < divisions; j++) {
          const color = colors[(i + j) % 2];
          const square = new THREE.Mesh(
            new THREE.PlaneGeometry(squareSize, squareSize),
            new THREE.MeshStandardMaterial({ color })
          );
          square.rotation.x = -Math.PI / 2;
          square.position.set(
            -COURSE_SIZE / 2 + i * squareSize + squareSize / 2,
            0,
            -COURSE_SIZE / 2 + j * squareSize + squareSize / 2
          );
          groundGroup.add(square);
        }
      }
    } else if (level === 5) {
      // wider squares, glossy look
      const colors = [0x7dd07d, 0x2f8f3f];
      for (let i = -6; i <= 6; i++) {
        for (let j = -6; j <= 6; j++) {
          const sq = new THREE.Mesh(
            new THREE.PlaneGeometry(2.2, 2.2),
            new THREE.MeshStandardMaterial({ color: colors[(i + j + 100) % 2] })
          );
          sq.rotation.x = -Math.PI / 2;
          sq.position.set(i * 2.2, 0, j * 2.2);
          groundGroup.add(sq);
        }
      }
    }
    scene.add(groundGroup);

    // Wooden border (visual)
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x6b4a2a });
    const wallThickness = 0.6;
    const wallHeight = 0.5;
    const borderOuter = new THREE.Mesh(
      new THREE.BoxGeometry(COURSE_SIZE + 2, wallHeight, wallThickness),
      wallMat
    );
    borderOuter.position.set(0, wallHeight / 2, -COURSE_SIZE / 2 - wallThickness / 2 - 0.4);
    scene.add(borderOuter);
    const borderOuterBack = borderOuter.clone();
    borderOuterBack.position.set(0, wallHeight / 2, COURSE_SIZE / 2 + wallThickness / 2 + 0.4);
    scene.add(borderOuterBack);
    const borderLeft = new THREE.Mesh(
      new THREE.BoxGeometry(wallThickness, wallHeight, COURSE_SIZE + 2),
      wallMat
    );
    borderLeft.position.set(-COURSE_SIZE / 2 - wallThickness / 2 - 0.4, wallHeight / 2, 0);
    scene.add(borderLeft);
    const borderRight = borderLeft.clone();
    borderRight.position.set(COURSE_SIZE / 2 + wallThickness / 2 + 0.4, wallHeight / 2, 0);
    scene.add(borderRight);

    // Hole placement per level (keeps the difficulty & aesthetics)
    let holePosition = new THREE.Vector3(5, 0.05, -3); // default L1
    if (level === 2) holePosition = new THREE.Vector3(0, 0.05, -14); // far into the L shape
    if (level === 3) holePosition = new THREE.Vector3(6, 0.05, -6); // near rotating planks
    if (level === 4) holePosition = new THREE.Vector3(-5, 0.05, -4); // near pond
    if (level === 5) holePosition = new THREE.Vector3(10, 0.05, 0); // on landing track

    const holeMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(HOLE_RADIUS, HOLE_RADIUS, 0.12, 32),
      new THREE.MeshStandardMaterial({ color: 0x111111 })
    );
    holeMesh.position.copy(holePosition);
    holeMesh.receiveShadow = true;
    scene.add(holeMesh);
    holeRef.current = holeMesh;

    // Flag (large)
    const flagGroup = new THREE.Group();
    const flagPole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.08, 3.0, 12),
      new THREE.MeshStandardMaterial({ color: 0x777777 })
    );
    flagPole.position.set(0, 1.5, 0);
    flagGroup.add(flagPole);
    const flagCloth = new THREE.Mesh(
      new THREE.PlaneGeometry(1.2, 0.7, 8, 4),
      new THREE.MeshStandardMaterial({ color: 0xff2b2b, side: THREE.DoubleSide })
    );
    flagCloth.position.set(0.55, 1.7, 0);
    flagCloth.userData.waver = Math.random() * 10;
    flagCloth.rotation.y = Math.PI / 10;
    flagGroup.add(flagCloth);
    flagGroup.position.copy(holeMesh.position);
    scene.add(flagGroup);
    flagRef.current = flagCloth;

    // Ball (slightly bigger as requested)
    const ball = new THREE.Mesh(
      new THREE.SphereGeometry(BALL_RADIUS, 32, 32),
      new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 0.15, roughness: 0.6 })
    );
    ball.position.set(0, BALL_RADIUS, 0);
    ball.castShadow = true;
    scene.add(ball);
    ballRef.current = ball;

    // Helper arrays for obstacles per level
    const obstacles = []; // objects: { mesh, type, bounds, extraData }

    // Add level-specific obstacles
    if (level === 2) {
      // ramp (visual + approximation)
      const ramp = new THREE.Mesh(
        new THREE.BoxGeometry(6, 0.5, 8),
        new THREE.MeshStandardMaterial({ color: 0x8f8f8f })
      );
      ramp.position.set(0, 0.25, -10);
      ramp.rotation.x = -Math.PI / 12;
      scene.add(ramp);
      obstacles.push({ mesh: ramp, type: "ramp", data: { width: 6, depth: 8, height: 1.4 } });

      // static walls for challenge
      const wallA = new THREE.Mesh(
        new THREE.BoxGeometry(0.6, 1.2, 3.5),
        new THREE.MeshStandardMaterial({ color: 0xaa3333 })
      );
      wallA.position.set(3.2, 0.6, -6);
      scene.add(wallA);
      obstacles.push({ mesh: wallA, type: "box" });

      const wallB = wallA.clone();
      wallB.position.set(-2.2, 0.6, -4.2);
      scene.add(wallB);
      obstacles.push({ mesh: wallB, type: "box" });

      // moving block that oscillates on X
      const movingBlock = new THREE.Mesh(
        new THREE.BoxGeometry(1.2, 1.0, 1.2),
        new THREE.MeshStandardMaterial({ color: 0x1e88e5 })
      );
      movingBlock.position.set(0, 0.6, -12);
      scene.add(movingBlock);
      obstacles.push({ mesh: movingBlock, type: "moving", axis: "x", amplitude: 3.0, speed: 1.2, basePos: movingBlock.position.clone() });
    }

    if (level === 3) {
      // Rotating planks across the course
      for (let i = 0; i < 4; i++) {
        const plank = new THREE.Mesh(
          new THREE.BoxGeometry(5.2, 0.35, 0.9),
          new THREE.MeshStandardMaterial({ color: 0xd27f2f })
        );
        const px = -6 + i * 3.6;
        const pz = -3 + i * -1.2;
        plank.position.set(px, 0.15, pz);
        scene.add(plank);
        obstacles.push({ mesh: plank, type: "rotating", speed: 0.6 + i * 0.25 });
      }
      // small ramp to elevated hole
      const ramp2 = new THREE.Mesh(
        new THREE.BoxGeometry(5, 0.5, 6),
        new THREE.MeshStandardMaterial({ color: 0x9e9e9e })
      );
      ramp2.position.set(5, 0.25, -6);
      ramp2.rotation.x = -Math.PI / 14;
      scene.add(ramp2);
      obstacles.push({ mesh: ramp2, type: "ramp", data: { width: 5, depth: 6, height: 1.2 } });
    }

    if (level === 4) {
      // water pond (circle) - mostly visual; affects friction when ball enters
      const pond = new THREE.Mesh(
        new THREE.CircleGeometry(3.6, 32),
        new THREE.MeshStandardMaterial({ color: 0x3ab7d9, transparent: true, opacity: 0.9 })
      );
      pond.rotation.x = -Math.PI / 2;
      pond.position.set(-4, 0.02, -4);
      scene.add(pond);
      obstacles.push({ mesh: pond, type: "water", center: pond.position.clone(), radius: 3.6 });

      // small island near hole
      const island = new THREE.Mesh(
        new THREE.BoxGeometry(1.6, 0.4, 1.6),
        new THREE.MeshStandardMaterial({ color: 0x8b5a2b })
      );
      island.position.set(-4, 0.2, -2.8);
      scene.add(island);
      obstacles.push({ mesh: island, type: "box" });
    }

    if (level === 5) {
      // Hot-wheels type: series of ramps with jump gap
      const rampA = new THREE.Mesh(
        new THREE.BoxGeometry(6, 0.6, 3),
        new THREE.MeshStandardMaterial({ color: 0xff9800 })
      );
      rampA.position.set(-6, 0.3, 2);
      rampA.rotation.x = -Math.PI / 18;
      scene.add(rampA);
      obstacles.push({ mesh: rampA, type: "ramp", data: { width: 6, depth: 3, height: 1.2 } });

      // landing ramp separated by gap
      const rampB = new THREE.Mesh(
        new THREE.BoxGeometry(6, 0.6, 3),
        new THREE.MeshStandardMaterial({ color: 0xff5722 })
      );
      rampB.position.set(2, 0.3, -0.5);
      rampB.rotation.x = Math.PI / 18;
      scene.add(rampB);
      obstacles.push({ mesh: rampB, type: "ramp", data: { width: 6, depth: 3, height: 1.2 } });

      // rails for aesthetic
      const railL = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 12), new THREE.MeshStandardMaterial({ color: 0x222222 }));
      railL.position.set(-3.2, 0.9, 1.8);
      scene.add(railL);
      const railR = railL.clone(); railR.position.set(-2.0, 0.9, 1.8); scene.add(railR);
    }

    // Build confetti pool
    function createConfettiPool(n = 120) {
      const pool = [];
      const geo = new THREE.PlaneGeometry(0.12, 0.12);
      const colors = [0xff3b30, 0xffcc00, 0x4cd964, 0x007aff, 0xff2d55];
      for (let i = 0; i < n; i++) {
        const mat = new THREE.MeshBasicMaterial({ color: colors[i % colors.length], side: THREE.DoubleSide });
        const m = new THREE.Mesh(geo, mat);
        m.visible = false;
        m.rotation.x = Math.random() * Math.PI;
        pool.push({ mesh: m, vel: new THREE.Vector3(), life: 0 });
        scene.add(m);
      }
      return pool;
    }
    confettiPoolRef.current = createConfettiPool(160);

    function spawnConfetti(pos, count = 50) {
      let spawned = 0;
      for (const c of confettiPoolRef.current) {
        if (spawned >= count) break;
        if (c.mesh.visible) continue;
        c.mesh.position.copy(pos).add(new THREE.Vector3((Math.random() - 0.5) * 1.2, 0.4 + Math.random() * 0.6, (Math.random() - 0.5) * 1.2));
        c.vel.set((Math.random() - 0.5) * 4, 3 + Math.random() * 3, (Math.random() - 0.5) * 4);
        c.mesh.visible = true;
        c.life = 1.2 + Math.random() * 2;
        spawned++;
      }
    }
    function updateConfetti(dt) {
      for (const c of confettiPoolRef.current) {
        if (!c.mesh.visible) continue;
        c.vel.y -= 9.8 * dt;
        c.mesh.position.addScaledVector(c.vel, dt);
        c.mesh.rotation.z += dt * 4;
        c.life -= dt;
        if (c.life <= 0 || c.mesh.position.y < -1) c.mesh.visible = false;
      }
    }

    // Arrow + trajectory preview (preserve your behavior)
    const arrowMat = new THREE.LineBasicMaterial({ color: 0xff0000 });
    const arrowGeom = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]);
    const arrow = new THREE.Line(arrowGeom, arrowMat);
    arrow.visible = false;
    scene.add(arrow);

    const trajDots = [];
    const dotMat = new THREE.MeshBasicMaterial({ color: 0xffff00 });
    for (let i = 0; i < 40; i++) {
      const d = new THREE.Mesh(new THREE.SphereGeometry(0.055, 6, 6), dotMat);
      d.visible = false;
      scene.add(d);
      trajDots.push(d);
    }

    // Raycaster to ground plane
    const raycaster = new THREE.Raycaster();
    const tmpV2 = new THREE.Vector2();
    const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

    function getMousePointOnGround(e) {
      const rect = renderer.domElement.getBoundingClientRect();
      tmpV2.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      tmpV2.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(tmpV2, camera);
      const p = new THREE.Vector3();
      raycaster.ray.intersectPlane(groundPlane, p);
      return p;
    }

    // trajectory sim (simple friction-based)
    function simulateTrajectory(start, vel) {
      const points = [];
      const simPos = start.clone();
      const simVel = vel.clone();
      const dt = 0.06;
      let localFriction = 1.5;
      if (level === 4) localFriction = 1.5; // base; pond will modify during sim not here
      for (let i = 0; i < trajDots.length; i++) {
        if (simVel.lengthSq() < 1e-6) break;
        simPos.addScaledVector(simVel, dt);
        points.push(simPos.clone());
        const s = simVel.length();
        simVel.setLength(Math.max(0, s - localFriction * dt));
      }
      return points;
    }

    // Input handling for aiming
    let isAiming = false;
    let dragStart = null;
    function onPointerDown(e) {
      const p = getMousePointOnGround(e);
      if (!ballRef.current) return;
      if (p.distanceTo(ballRef.current.position) < 1.2) {
        isAiming = true;
        dragStart = p.clone();
        arrow.visible = true;
        controls.enabled = false;
      }
    }
    function onPointerMove(e) {
      if (!isAiming) return;
      const current = getMousePointOnGround(e);
      const dir = new THREE.Vector3().subVectors(dragStart, current);
      const length = Math.min(dir.length(), 6);
      dir.setLength(length);
      const arrowEnd = new THREE.Vector3().addVectors(ball.position, dir);
      arrow.geometry.setFromPoints([ball.position.clone().setY(BALL_RADIUS), arrowEnd.clone().setY(BALL_RADIUS)]);
      const previewVel = dir.clone().multiplyScalar(5);
      const sim = simulateTrajectory(ball.position.clone(), previewVel);
      trajDots.forEach((d, i) => {
        if (i < sim.length) {
          d.position.copy(sim[i]).setY(BALL_RADIUS);
          d.visible = true;
        } else d.visible = false;
      });
    }
    function onPointerUp(e) {
      if (!isAiming) return;
      isAiming = false;
      arrow.visible = false;
      trajDots.forEach((d) => (d.visible = false));
      const release = getMousePointOnGround(e);
      const dir = new THREE.Vector3().subVectors(dragStart, release);
      const power = Math.min(dir.length(), 6);
      dir.setLength(power * 5);
      velocityRef.current.add(dir);
      if (typeof setStrokes === "function") setStrokes((s) => s + 1);
      controls.enabled = true;
    }

    // add pointer listeners
    renderer.domElement.style.touchAction = "none";
    renderer.domElement.addEventListener("pointerdown", onPointerDown, { passive: true });
    renderer.domElement.addEventListener("pointermove", onPointerMove, { passive: true });
    renderer.domElement.addEventListener("pointerup", onPointerUp, { passive: true });
    renderer.domElement.addEventListener("pointerleave", onPointerUp, { passive: true });

    // Helper: simple sphere-vs-box collision test (approx)
    function sphereIntersectsBox(spherePos, radius, boxMesh) {
      const box = new THREE.Box3().setFromObject(boxMesh);
      const closest = box.clampPoint(spherePos, new THREE.Vector3());
      return closest.distanceTo(spherePos) <= radius;
    }

    // Helper: obstacle collision resolution (simple reflect / impulse)
    function handleObstacleCollisions() {
      const ballPos = ballRef.current.position;
      const vel = velocityRef.current;

      for (const o of obstacles) {
        if (!o.mesh) continue;
        if (o.type === "box") {
          if (sphereIntersectsBox(ballPos, BALL_RADIUS, o.mesh)) {
            // reflect away from obstacle center
            const dir = new THREE.Vector3().subVectors(ballPos, o.mesh.position).setY(0).normalize();
            if (dir.lengthSq() < 1e-6) dir.set(1, 0, 0);
            vel.reflect(dir);
            vel.multiplyScalar(0.7);
            // nudge out
            ballPos.add(dir.multiplyScalar(0.04));
          }
        } else if (o.type === "moving") {
          // approximate moving block as box center
          const dist = o.mesh.position.distanceTo(ballPos);
          const min = BALL_RADIUS + 0.6;
          if (dist < min) {
            const dir = new THREE.Vector3().subVectors(ballPos, o.mesh.position).normalize();
            // small impulse based on relative velocity
            vel.add(dir.multiplyScalar(5));
            // bounce the moving block slightly (visual)
            o.mesh.position.add(dir.multiplyScalar(-0.04));
          }
        } else if (o.type === "rotating") {
          // use bounding box for collision
          const b = new THREE.Box3().setFromObject(o.mesh);
          const closest = b.clampPoint(ballPos, new THREE.Vector3());
          if (closest.distanceTo(ballPos) <= BALL_RADIUS + 0.02) {
            // compute normal from rotating plank center
            const dir = new THREE.Vector3().subVectors(ballPos, o.mesh.position).setY(0).normalize();
            velocityRef.current.reflect(dir);
            velocityRef.current.multiplyScalar(0.75);
            // small outward nudge
            ballPos.add(dir.multiplyScalar(0.03));
          }
        } else if (o.type === "ramp") {
          // approximate ramp collision: if ball inside horizontal footprint, lift Y accordingly
          const w = o.data?.width || 4;
          const depth = o.data?.depth || 6;
          const center = o.mesh.position;
          const dx = Math.abs(ballPos.x - center.x);
          const dz = Math.abs(ballPos.z - center.z);
          if (dx < w / 2 + 0.6 && dz < depth / 2 + 0.6) {
            // proportion along depth (local z)
            const localZ = (ballPos.z - (center.z - depth / 2)) / depth;
            const t = THREE.MathUtils.clamp(localZ, 0, 1);
            const height = (o.data?.height || 1.2) * t;
            // gently place ball on ramp surface
            ballPos.y = BALL_RADIUS + height;
            // damp vertical velocity
            velocityRef.current.y *= 0.2;
          }
        } else if (o.type === "water") {
          // water handled in friction calculation (below)
        }
      }
    }

    // animate moving / rotating obstacles
    let obstacleTime = 0;

    // Keep track of requestAnimationFrame ids for cleanup
    let afId;
    let obstacleAfId;

    // main animation loop
    let last = performance.now();
    function animate(now) {
      const dt = (now - last) / 1000;
      last = now;

      obstacleTime += dt;

      // update rotating obstacles
      for (const o of obstacles) {
        if (o.type === "rotating") {
          o.mesh.rotation.y += (o.speed || 0.6) * dt;
        } else if (o.type === "moving") {
          // oscillate along X or Z as configured
          const amp = o.amplitude || 2.2;
          const spd = o.speed || 1.0;
          if (o.axis === "x") {
            o.mesh.position.x = o.basePos.x + Math.sin(obstacleTime * spd) * amp;
          } else {
            o.mesh.position.z = o.basePos.z + Math.cos(obstacleTime * spd) * amp;
          }
        }
      }

      // animate flag waving (vertex displacement)
      if (flagRef.current) {
        const geo = flagRef.current.geometry;
        const pos = geo.attributes.position;
        if (!geo.attributes.orig) {
          geo.setAttribute("orig", new THREE.BufferAttribute(pos.array.slice(0), 3));
        }
        const orig = geo.attributes.orig.array;
        const arr = pos.array;
        for (let i = 0; i < arr.length; i += 3) {
          const ox = orig[i], oy = orig[i + 1], oz = orig[i + 2];
          const offset = Math.sin((ox + oy + now * 0.002) * 4 + (flagRef.current.userData.waver || 0)) * 0.05;
          arr[i + 2] = oz + offset;
        }
        pos.needsUpdate = true;
      }

      // physics integration (unless sinking)
      if (!sinkingRef.current.active) {
        // friction: default
        let localFriction = 1.5;

        // water area increases friction (simulate drag) for level 4
        if (level === 4) {
          for (const o of obstacles) {
            if (o.type === "water") {
              const d = ballRef.current.position.distanceTo(o.center);
              if (d < o.radius) {
                // increase friction a lot inside pond (ball slows faster)
                localFriction = 4.0;
              }
            }
          }
        }

        // integrate velocity -> position
        const vel = velocityRef.current;
        if (vel.lengthSq() > 1e-6) {
          const speed = vel.length();
          const decel = localFriction * dt;
          const newSpeed = Math.max(0, speed - decel);
          vel.setLength(newSpeed);
          ballRef.current.position.addScaledVector(vel, dt);

          // wall collisions (bounding)
          const limit = COURSE_LIMIT;
          if (ballRef.current.position.x < -limit) {
            ballRef.current.position.x = -limit;
            vel.x *= -0.8;
          }
          if (ballRef.current.position.x > limit) {
            ballRef.current.position.x = limit;
            vel.x *= -0.8;
          }
          if (ballRef.current.position.z < -limit) {
            ballRef.current.position.z = -limit;
            vel.z *= -0.8;
          }
          if (ballRef.current.position.z > limit) {
            ballRef.current.position.z = limit;
            vel.z *= -0.8;
          }
        }

        // handle collisions with obstacles
        handleObstacleCollisions();
      }

      // Hole detection: distance-only -> start sinking sequence
      if (!holeDone && !sinkingRef.current.active && holeRef.current && ballRef.current) {
        const dist = ballRef.current.position.distanceTo(holeRef.current.position);
        if (!holeTriggeredRef.current && dist < HOLE_RADIUS) {
          holeTriggeredRef.current = true;
          // freeze velocity
          velocityRef.current.set(0, 0, 0);
          // store sink start & end
          sinkingRef.current = {
            active: true,
            t: 0,
            start: ballRef.current.position.clone(),
            end: holeRef.current.position.clone().setY(-0.5),
          };
          // immediate confetti + audio
          spawnConfetti(holeRef.current.position, 60);
          try {
            celebrationAudioRef.current?.play();
          } catch (e) {
            // autoplay might be blocked - ignore
          }
          // DO NOT call onHoleComplete now; call after sinking finishes
        }
      }

      // Sinking animation (once ball center is inside hole radius)
      if (sinkingRef.current.active) {
        sinkingRef.current.t += dt;
        const total = 1.2;
        const traw = sinkingRef.current.t / total;
        const t = Math.min(1, traw);
        const eased = t * t * (3 - 2 * t); // smoothstep
        // use stored start & end for consistent LERP
        if (sinkingRef.current.start && sinkingRef.current.end) {
          ballRef.current.position.lerpVectors(sinkingRef.current.start, sinkingRef.current.end, eased);
          ballRef.current.scale.setScalar(1 - 0.7 * eased);
        }
        if (t >= 1) {
          sinkingRef.current.active = false;
          // final placement
          ballRef.current.position.copy(sinkingRef.current.end);
          ballRef.current.scale.setScalar(0.3);
          // notify parent AFTER sink finishes
          if (typeof onHoleComplete === "function") {
            try {
              onHoleComplete(); // parent should flip holeDone -> true and show modal
            } catch (err) {
              console.warn("onHoleComplete error", err);
            }
          }
        }
      }

      // update confetti
      updateConfetti(dt);

      // keep camera target follow ball slightly above so it doesn't dip below ground
      controls.target.copy(ballRef.current.position).add(new THREE.Vector3(0, 0.4, 0));
      controls.update();

      renderer.render(scene, camera);
      afId = requestAnimationFrame(animate);
    }

    afId = requestAnimationFrame(animate);

    // small obstacle animation loop (for moving blocks done in main loop via obstacleTime)
    // Not required separately.

    // Resize handling
    function onResize() {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    }
    window.addEventListener("resize", onResize);

    // cleanup / unmount
    return () => {
      window.removeEventListener("resize", onResize);
      renderer.domElement.removeEventListener("pointerdown", onPointerDown);
      renderer.domElement.removeEventListener("pointermove", onPointerMove);
      renderer.domElement.removeEventListener("pointerup", onPointerUp);
      renderer.domElement.removeEventListener("pointerleave", onPointerUp);
      try {
        cancelAnimationFrame(afId);
      } catch (e) { /* ignore */ }
      try {
        mount.removeChild(renderer.domElement);
      } catch (e) { /* ignore */ }
      renderer.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [level]); // rebuild entire scene on level change (keeps code simpler)

  // Modal handlers (exact semantics you had)
  // Next level: reset ball & navigate to next level (if exists)
  const handleNext = () => {
    // reset local visuals (ball exists in scene but we're navigating away; parent will re-create)
    if (ballRef.current) {
      ballRef.current.position.set(0, BALL_RADIUS, 0);
      ballRef.current.scale.setScalar(1);
    }
    velocityRef.current.set(0, 0, 0);
    sinkingRef.current.active = false;
    holeTriggeredRef.current = false;
    if (typeof setStrokes === "function") setStrokes(0);
    if (typeof setHoleDone === "function") setHoleDone(false);
    const next = Math.min(5, level + 1);
    navigate(`/game/${next}`);
    if (typeof onNextHole === "function") onNextHole();
  };

  const handleRetry = () => {
    if (ballRef.current) {
      ballRef.current.position.set(0, BALL_RADIUS, 0);
      ballRef.current.scale.setScalar(1);
    }
    velocityRef.current.set(0, 0, 0);
    sinkingRef.current.active = false;
    holeTriggeredRef.current = false;
    if (typeof setStrokes === "function") setStrokes(0);
    if (typeof setHoleDone === "function") setHoleDone(false);
    navigate(`/game/${level}`); // reload same route
  };

  const handleMainMenu = () => {
    if (typeof setHoleDone === "function") setHoleDone(false);
    navigate("/menu");
  };

  // Render: canvas container + HUD + modal overlay (same API as you used)
  return (
    <div style={{ width: "100vw", height: "100vh", position: "relative", overflow: "hidden" }}>
      <div ref={mountRef} style={{ width: "100%", height: "100%" }} />
      <HUD hole={level} par={3} strokes={strokes} />

      {holeDone && (
        <EndOfLevelModal
          strokes={strokes}
          onNext={handleNext}
          onRetry={handleRetry}
          onMainMenu={handleMainMenu}
        />
      )}
    </div>
  );
}
