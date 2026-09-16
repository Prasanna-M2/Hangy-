// physics.js - 240 Hz Verlet Rope & Bead Physics Engine
// Faithful port of Hangly's RopeSimulation.swift & RopeConfiguration.swift

class RopePoint {
  constructor(x, y, inverseMass = 1.0) {
    this.x = x;
    this.y = y;
    this.oldX = x;
    this.oldY = y;
    this.inverseMass = inverseMass;
  }

  get displacement() {
    return Math.hypot(this.x - this.oldX, this.y - this.oldY);
  }
}

class RopeBead {
  constructor(size, offsetRatio, mass = 0.5) {
    this.size = size; // { width, height }
    this.offsetRatio = offsetRatio; // 0 to 1 along cord
    this.mass = mass;
    this.currentOffset = offsetRatio;
    this.oldOffset = offsetRatio;
    this.x = 0;
    this.y = 0;
  }

  update(cordLength, curvatureFactor, dt) {
    // Verlet on 1D cord position
    const damping = 0.96;
    const springK = 35.0; // Restoring force toward natural tether
    const displacement = this.currentOffset - this.oldOffset;
    const accel = -springK * (this.currentOffset - this.offsetRatio) + (curvatureFactor * 0.05);

    const nextOffset = this.currentOffset + (displacement * damping) + (accel * dt * dt);
    this.oldOffset = this.currentOffset;
    this.currentOffset = Math.max(0.02, Math.min(0.98, nextOffset));
  }
}

class RopeSimulation {
  constructor(config = {}) {
    this.config = {
      segmentCount: 20,
      segmentLength: 11,
      gravity: 2000,
      damping: 0.999,
      constraintIterations: 256,
      stretchPasses: 256,
      convergenceTolerance: 0.05,
      maxStretchRatio: 1.02,
      fixedTimeStep: 1.0 / 240.0,
      maxFrameDuration: 0.1,
      maximumSpeed: 6000,
      maximumReachRatio: 0.98,
      restSpeed: 4.0,
      framesBeforeSleep: 60,
      initialAngle: 0.38,
      ...config
    };

    this.points = [];
    this.beads = [];
    this.anchor = { x: 150, y: 15 };
    this.charmMetrics = { mass: 3.5, radiusRatio: 0.15, knotInset: 0.96 };
    this.beadDescriptions = [];
    this.dragIndex = null;
    this.dragTarget = { x: 0, y: 0 };
    this.dragVelocity = { x: 0, y: 0 };
    this.isRunning = true;
    this.isSleeping = false;
    this.stillFrames = 0;
    this.accumulator = 0;
    this.lastStepCount = 0;
    this.windForce = 0;
    this.hangMode = 'topTrailing'; // topTrailing, topCenter, taskbar, pin, breeze, pendulum, elastic

    this.reset();
  }

  get totalLength() {
    return this.config.segmentCount * this.config.segmentLength;
  }

  reset(angle = this.config.initialAngle) {
    this.points = [];
    const count = this.config.segmentCount + 1;
    const len = this.config.segmentLength;

    for (let i = 0; i < count; i++) {
      const t = i / (count - 1);
      const theta = angle * (1.0 - t * 0.2); // subtle curve
      const x = this.anchor.x + Math.sin(theta) * (i * len);
      const y = this.anchor.y + Math.cos(theta) * (i * len);

      // Node mass: interior links are light, final node gets charm mass
      let invMass = 1.0;
      if (i === 0) {
        invMass = 0.0; // pinned
      } else if (i === count - 1) {
        invMass = 1.0 / (this.charmMetrics.mass || 3.0);
      } else {
        invMass = 1.0;
      }
      this.points.push(new RopePoint(x, y, invMass));
    }

    this.dragIndex = null;
    this.dragVelocity = { x: 0, y: 0 };
    this.stillFrames = 0;
    this.isSleeping = false;
    this.rebuildBeads();
  }

  setAnchor(x, y) {
    if (Math.hypot(this.anchor.x - x, this.anchor.y - y) > 0.1) {
      this.anchor.x = x;
      this.anchor.y = y;
      this.wake();
    }
  }

  setCharmMetrics(metrics) {
    this.charmMetrics = { ...this.charmMetrics, ...metrics };
    if (this.points.length > 0) {
      this.points[this.points.length - 1].inverseMass = 1.0 / (this.charmMetrics.mass || 3.0);
    }
    this.rebuildBeads();
    this.wake();
  }

  setBeads(descriptions) {
    this.beadDescriptions = descriptions || [];
    this.rebuildBeads();
    this.wake();
  }

  rebuildBeads() {
    this.beads = this.beadDescriptions.map((desc, idx) => {
      const offset = (idx + 1) / (this.beadDescriptions.length + 1);
      return new RopeBead(desc.size || { width: 14, height: 14 }, desc.offsetRatio || offset, desc.mass || 0.4);
    });
  }

  wake() {
    this.isSleeping = false;
    this.stillFrames = 0;
  }

  startDrag(x, y) {
    this.wake();
    // Grab the charm (last node) or closest node
    this.dragIndex = this.points.length - 1;
    this.dragTarget = { x, y };
    this.dragVelocity = { x: 0, y: 0 };
  }

  updateDrag(x, y, vx = 0, vy = 0) {
    this.wake();
    this.dragTarget = { x, y };
    this.dragVelocity = { x: vx, y: vy };
  }

  releaseDrag(flingVx = 0, flingVy = 0) {
    if (this.dragIndex !== null) {
      const p = this.points[this.dragIndex];
      // Impart throw momentum via Verlet history
      p.oldX = p.x - flingVx * this.config.fixedTimeStep;
      p.oldY = p.y - flingVy * this.config.fixedTimeStep;
      this.dragIndex = null;
      this.wake();
    }
  }

  nudge(forceX = 300, forceY = 0) {
    this.wake();
    const last = this.points[this.points.length - 1];
    last.oldX = last.x - forceX * this.config.fixedTimeStep;
    last.oldY = last.y - forceY * this.config.fixedTimeStep;
  }

  step(deltaTime) {
    if (!this.isRunning || deltaTime <= 0 || (this.isSleeping && this.hangMode !== 'breeze' && this.hangMode !== 'pendulum')) {
      this.lastStepCount = 0;
      return;
    }

    this.accumulator = Math.min(this.accumulator + deltaTime, this.config.maxFrameDuration);
    const dt = this.config.fixedTimeStep;
    let taken = 0;

    while (this.accumulator >= dt) {
      this.advance(dt);
      this.accumulator -= dt;
      taken++;
    }

    this.lastStepCount = taken;
    this.updateSleepState();
  }

  advance(dt) {
    this.enforceAnchor();
    this.integrate(dt);
    this.driveDraggedPoint(dt);

    // Gauss-Seidel distance relaxation with convergence check
    let iterations = 0;
    let residual = Infinity;
    const maxIter = this.hangMode === 'elastic' ? 32 : this.config.constraintIterations;

    while (iterations < maxIter && residual >= this.config.convergenceTolerance) {
      residual = this.solveDistanceConstraints();
      iterations++;
    }

    // Inextensibility stretch ceiling clamp
    if (this.hangMode !== 'elastic') {
      this.enforceMaximumStretch();
    }

    this.advanceBeads(dt);
  }

  enforceAnchor() {
    if (this.points.length === 0) return;
    this.points[0].x = this.anchor.x;
    this.points[0].y = this.anchor.y;
    this.points[0].oldX = this.anchor.x;
    this.points[0].oldY = this.anchor.y;
  }

  integrate(dt) {
    let gy = this.config.gravity * dt * dt;
    let gx = 0;

    // Apply Hang Modes
    if (this.hangMode === 'breeze') {
      const now = performance.now() * 0.002;
      const breeze = Math.sin(now) * 0.7 + Math.sin(now * 2.3) * 0.3;
      gx = breeze * 650 * dt * dt;
    } else if (this.hangMode === 'pendulum') {
      const now = performance.now() * 0.003;
      gx = Math.cos(now) * 800 * dt * dt;
    } else if (this.hangMode === 'taskbar') {
      // Inverted or grounded hang
      gy = this.config.gravity * dt * dt;
    }

    const damping = this.config.damping;
    const maxDisplacement = this.config.maximumSpeed * dt;

    for (let i = 1; i < this.points.length; i++) {
      if (i === this.dragIndex) continue;
      const p = this.points[i];
      if (p.inverseMass <= 0) continue;

      let vx = (p.x - p.oldX) * damping;
      let vy = (p.y - p.oldY) * damping;

      const mag = Math.hypot(vx, vy);
      if (mag > maxDisplacement) {
        vx = (vx / mag) * maxDisplacement;
        vy = (vy / mag) * maxDisplacement;
      }

      p.oldX = p.x;
      p.oldY = p.y;
      p.x += vx + gx;
      p.y += vy + gy;
    }
  }

  driveDraggedPoint(dt) {
    if (this.dragIndex === null) return;
    const p = this.points[this.dragIndex];

    const dx = this.dragTarget.x - this.anchor.x;
    const dy = this.dragTarget.y - this.anchor.y;
    const dist = Math.hypot(dx, dy);
    const maxReach = this.totalLength * this.config.maximumReachRatio;

    let targetX = this.dragTarget.x;
    let targetY = this.dragTarget.y;

    if (dist > maxReach) {
      targetX = this.anchor.x + (dx / dist) * maxReach;
      targetY = this.anchor.y + (dy / dist) * maxReach;
    }

    p.oldX = p.x;
    p.oldY = p.y;
    p.x = targetX;
    p.y = targetY;
  }

  solveDistanceConstraints() {
    let maxMovement = 0;
    const segLen = this.config.segmentLength;

    for (let i = 0; i < this.points.length - 1; i++) {
      const p1 = this.points[i];
      const p2 = this.points[i + 1];

      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const dist = Math.hypot(dx, dy) || 0.0001;
      const delta = dist - segLen;
      const nx = dx / dist;
      const ny = dy / dist;

      const w1 = p1.inverseMass;
      const w2 = p2.inverseMass;
      const wSum = w1 + w2;
      if (wSum <= 0) continue;

      if (w1 > 0 && i !== this.dragIndex) {
        const m1 = (w1 / wSum) * delta;
        p1.x += nx * m1;
        p1.y += ny * m1;
        if (Math.abs(m1) > maxMovement) maxMovement = Math.abs(m1);
      }

      if (w2 > 0 && (i + 1) !== this.dragIndex) {
        const m2 = (w2 / wSum) * delta;
        p2.x -= nx * m2;
        p2.y -= ny * m2;
        if (Math.abs(m2) > maxMovement) maxMovement = Math.abs(m2);
      }
    }
    return maxMovement;
  }

  enforceMaximumStretch() {
    const maxLen = this.config.segmentLength * this.config.maxStretchRatio;

    for (let i = 0; i < this.points.length - 1; i++) {
      const p1 = this.points[i];
      const p2 = this.points[i + 1];

      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const dist = Math.hypot(dx, dy) || 0.0001;

      if (dist > maxLen) {
        const excess = dist - maxLen;
        const nx = dx / dist;
        const ny = dy / dist;

        if (p1.inverseMass > 0 && i !== this.dragIndex) {
          p1.x += nx * excess * 0.5;
          p1.y += ny * excess * 0.5;
        }
        if (p2.inverseMass > 0 && (i + 1) !== this.dragIndex) {
          p2.x -= nx * excess * 0.5;
          p2.y -= ny * excess * 0.5;
        }
      }
    }
  }

  advanceBeads(dt) {
    if (this.beads.length === 0 || this.points.length === 0) return;

    for (let i = 0; i < this.beads.length; i++) {
      const bead = this.beads[i];
      // Curvature factor: measure how bent the rope is at this bead
      const knotPointIndex = Math.min(this.points.length - 1, Math.max(1, Math.floor(bead.currentOffset * (this.points.length - 1))));
      const prev = this.points[knotPointIndex - 1];
      const cur = this.points[knotPointIndex];
      const next = this.points[Math.min(this.points.length - 1, knotPointIndex + 1)];

      const curvature = (prev.x - 2 * cur.x + next.x) * 0.5;
      bead.update(this.totalLength, curvature, dt);

      // Project bead onto spline/points curve
      const pos = this.getPointAtRatio(bead.currentOffset);
      bead.x = pos.x;
      bead.y = pos.y;
    }
  }

  getPointAtRatio(ratio) {
    if (this.points.length === 0) return { x: this.anchor.x, y: this.anchor.y };
    const scaled = Math.max(0, Math.min(1, ratio)) * (this.points.length - 1);
    const idx = Math.floor(scaled);
    const frac = scaled - idx;

    if (idx >= this.points.length - 1) {
      const last = this.points[this.points.length - 1];
      return { x: last.x, y: last.y };
    }

    const p1 = this.points[idx];
    const p2 = this.points[idx + 1];
    return {
      x: p1.x + (p2.x - p1.x) * frac,
      y: p1.y + (p2.y - p1.y) * frac
    };
  }

  updateSleepState() {
    if (this.dragIndex !== null || this.hangMode === 'breeze' || this.hangMode === 'pendulum') {
      this.stillFrames = 0;
      this.isSleeping = false;
      return;
    }

    const speedLimit = this.config.restSpeed * this.config.fixedTimeStep;
    let moving = false;

    for (let i = 0; i < this.points.length; i++) {
      if (this.points[i].displacement > speedLimit) {
        moving = true;
        break;
      }
    }

    if (moving) {
      this.stillFrames = 0;
      this.isSleeping = false;
    } else {
      this.stillFrames++;
      if (this.stillFrames >= this.config.framesBeforeSleep) {
        this.isSleeping = true;
      }
    }
  }
}

// Export for Node/CommonJS or attach to window
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { RopePoint, RopeBead, RopeSimulation };
} else {
  window.RopeSimulation = RopeSimulation;
  window.RopePoint = RopePoint;
  window.RopeBead = RopeBead;
}
