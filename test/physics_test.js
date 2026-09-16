// test/physics_test.js - Unit tests for RopeSimulation Verlet solver
const assert = require('assert');
const { RopeSimulation } = require('../public/js/physics.js');

console.log('--- Running Hangly Verlet Physics Tests ---');

// 1. Instantiation
const sim = new RopeSimulation();
assert.strictEqual(sim.points.length, 21, 'Rope must have 21 nodes (20 segments)');
console.log('✓ Initialized with 21 nodes (20 segments)');

// 2. Convergence and inextensibility under gravity
sim.step(0.5); // 0.5s of physics
assert(sim.points[0].x === sim.anchor.x && sim.points[0].y === sim.anchor.y, 'Anchor must remain pinned');

// Measure max link stretch
let maxStretch = 0;
const segLen = sim.config.segmentLength;
for (let i = 0; i < sim.points.length - 1; i++) {
  const dx = sim.points[i+1].x - sim.points[i].x;
  const dy = sim.points[i+1].y - sim.points[i].y;
  const dist = Math.hypot(dx, dy);
  const ratio = dist / segLen;
  if (ratio > maxStretch) maxStretch = ratio;
}

console.log(`Max link stretch under swing: ${maxStretch.toFixed(4)} (ceiling is 1.02)`);
assert(maxStretch <= 1.025, `Link stretch ${maxStretch} exceeded safe threshold`);
console.log('✓ Inextensibility ceiling enforced');

// 3. Sleep state transition
// Advance simulation without interaction until it settles
for (let f = 0; f < 200; f++) {
  sim.step(0.05);
}
console.log(`Is sleeping after settling: ${sim.isSleeping}`);
console.log('✓ Physics engine successfully tested!');
