// src/physics/Ball.js
import * as THREE from 'three';

export class Ball {
  constructor(scene, startPos = new THREE.Vector3(0, 0.4, 0)) {
    this.radius = 0.4;
    // Linear friction (units: speed per second)
    this.friction = 2.0;
    this.velocity = new THREE.Vector3();
    this.mesh = new THREE.Mesh(
      new THREE.SphereGeometry(this.radius, 32, 32),
      new THREE.MeshStandardMaterial({ color: 0xffffff })
    );
    this.mesh.position.copy(startPos);
    scene.add(this.mesh);
  }

  applyImpulse(vec3) {
    this.velocity.copy(vec3);
  }

  update(dt = 1 / 60) {
    // Apply linear deceleration due to friction
    const speed = this.velocity.length();
    if (speed > 0) {
      const newSpeed = Math.max(0, speed - this.friction * dt);
      if (newSpeed === 0) {
        this.velocity.set(0, 0, 0);
      } else {
        this.velocity.setLength(newSpeed);
      }
    }
    // Move ball
    this.mesh.position.addScaledVector(this.velocity, dt);
    // Stop if velocity is very small
    if (this.velocity.length() < 0.01) {
      this.velocity.set(0, 0, 0);
    }
  }

  reset(pos = new THREE.Vector3(0, 0.4, 0)) {
    this.mesh.position.copy(pos);
    this.velocity.set(0, 0, 0);
  }
}
