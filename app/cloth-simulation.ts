export type ClothSimulationConfig = {
  columns: number;
  rows: number;
  width: number;
  height: number;
};

type Constraint = {
  a: number;
  b: number;
  restLength: number;
  stiffness: number;
};

export type ClothFrame = {
  alpha: number;
  averageSpeed: number;
  contentReady: boolean;
  maxSpeed: number;
  settled: boolean;
  time: number;
};

const FEEL = {
  simulation: {
    dt: 1 / 120,
    maxSubSteps: 5,
    gravity: 5.45,
    velocityDamping: 0.989,
    constraintIterations: 6,
  },
  material: {
    structuralStiffness: 0.925,
    shearStiffness: 0.59,
    bendStiffness: 0.22,
    backPlane: -0.035,
    backPlaneRestitution: 0.09,
  },
  release: {
    delay: 0.18,
    duration: 1.48,
    gatheredDepthRatio: 0.53,
    forwardImpulse: 1.46,
    downwardImpulse: 0.51,
    gustPeak: 1.16,
    gustWidth: 0.48,
    gustStrength: 3.05,
  },
  bed: {
    contactStart: 1.48,
    contactFull: 3.35,
    horizontalPull: 31,
    verticalPull: 48,
    depthPull: 42,
    settledDamping: 0.962,
    edgeCurl: 0.032,
  },
  settle: {
    averageSpeed: 0.021,
    maxSpeed: 0.13,
    stableSeconds: 0.36,
    contentAverageSpeed: 0.19,
    contentEarliest: 3.0,
    contentTimeout: 4.15,
    hardTimeout: 6.8,
  },
} as const;

const distance = (ax: number, ay: number, az: number, bx: number, by: number, bz: number) =>
  Math.hypot(bx - ax, by - ay, bz - az);

export class ClothSimulation {
  readonly columns: number;
  readonly rows: number;
  readonly positions: Float32Array;
  readonly uvs: Float32Array;
  readonly indices: Uint32Array;

  private readonly previous: Float32Array;
  private readonly visualPrevious: Float32Array;
  private readonly released: Uint8Array;
  private readonly releaseAt: Float32Array;
  private readonly constraints: Constraint[] = [];
  private readonly restPositions: Float32Array;

  private accumulator = 0;
  private elapsed = 0;
  private stableFor = 0;
  private averageSpeed = Number.POSITIVE_INFINITY;
  private maxSpeed = Number.POSITIVE_INFINITY;
  private contentReady = false;
  private settled = false;

  constructor({ columns, rows, width, height }: ClothSimulationConfig) {
    this.columns = columns;
    this.rows = rows;

    const vertexCount = (columns + 1) * (rows + 1);
    this.positions = new Float32Array(vertexCount * 3);
    this.previous = new Float32Array(vertexCount * 3);
    this.visualPrevious = new Float32Array(vertexCount * 3);
    this.restPositions = new Float32Array(vertexCount * 3);
    this.uvs = new Float32Array(vertexCount * 2);
    this.released = new Uint8Array(vertexCount);
    this.releaseAt = new Float32Array(vertexCount);
    this.indices = new Uint32Array(columns * rows * 6);

    const top = height / 2;
    const gatheredHeight = height * FEEL.release.gatheredDepthRatio;

    for (let row = 0; row <= rows; row += 1) {
      const v = row / rows;
      for (let column = 0; column <= columns; column += 1) {
        const u = column / columns;
        const vertex = row * (columns + 1) + column;
        const positionIndex = vertex * 3;
        const uvIndex = vertex * 2;
        const restX = (u - 0.5) * width;
        const restY = top - v * height;

        const foldPhase = v * Math.PI * 10.5 + u * 0.9;
        const foldStrength = 0.025 + v * 0.105;
        const gatheredX = restX * (0.975 - Math.sin(v * Math.PI * 5) * 0.012);
        const gatheredY = top - v * gatheredHeight + Math.sin(u * Math.PI * 2.4) * v * 0.024;
        const gatheredZ = Math.sin(foldPhase) * foldStrength;

        this.positions[positionIndex] = gatheredX;
        this.positions[positionIndex + 1] = gatheredY;
        this.positions[positionIndex + 2] = gatheredZ;
        this.restPositions[positionIndex] = restX;
        this.restPositions[positionIndex + 1] = restY;
        this.restPositions[positionIndex + 2] = 0;
        this.uvs[uvIndex] = u;
        this.uvs[uvIndex + 1] = 1 - v;

        const asymmetry = 0.11 * u + 0.055 * Math.sin(u * Math.PI * 2.2);
        this.releaseAt[vertex] = FEEL.release.delay + v * FEEL.release.duration + asymmetry;
        if (row === 0) {
          this.released[vertex] = 0;
          this.releaseAt[vertex] = Number.POSITIVE_INFINITY;
        }
      }
    }

    this.previous.set(this.positions);
    this.visualPrevious.set(this.positions);
    this.buildConstraints(width, height);
    this.buildIndices();
  }

  advance(deltaSeconds: number): ClothFrame {
    if (this.settled) {
      return this.frame(1);
    }

    this.accumulator += Math.min(Math.max(deltaSeconds, 0), 0.08);
    let subSteps = 0;

    while (this.accumulator >= FEEL.simulation.dt && subSteps < FEEL.simulation.maxSubSteps) {
      this.visualPrevious.set(this.positions);
      this.step(FEEL.simulation.dt);
      this.accumulator -= FEEL.simulation.dt;
      subSteps += 1;
    }

    if (subSteps === FEEL.simulation.maxSubSteps && this.accumulator >= FEEL.simulation.dt) {
      this.accumulator = 0;
    }

    return this.frame(this.accumulator / FEEL.simulation.dt);
  }

  writeInterpolatedPositions(target: Float32Array, alpha: number) {
    const interpolation = Math.min(Math.max(alpha, 0), 1);
    for (let index = 0; index < target.length; index += 1) {
      target[index] = this.visualPrevious[index]
        + (this.positions[index] - this.visualPrevious[index]) * interpolation;
    }
  }

  private frame(alpha: number): ClothFrame {
    return {
      alpha,
      averageSpeed: this.averageSpeed,
      contentReady: this.contentReady,
      maxSpeed: this.maxSpeed,
      settled: this.settled,
      time: this.elapsed,
    };
  }

  private step(dt: number) {
    this.elapsed += dt;
    this.releaseParticles(dt);
    this.integrate(dt);

    for (let iteration = 0; iteration < FEEL.simulation.constraintIterations; iteration += 1) {
      for (const constraint of this.constraints) {
        this.satisfyConstraint(constraint);
      }
      this.constrainBackPlane();
      this.pinTopEdge();
    }

    this.measureMotion(dt);
  }

  private releaseParticles(dt: number) {
    for (let vertex = 0; vertex < this.released.length; vertex += 1) {
      if (this.released[vertex] || this.elapsed < this.releaseAt[vertex]) continue;

      this.released[vertex] = 1;
      const row = Math.floor(vertex / (this.columns + 1));
      const column = vertex % (this.columns + 1);
      const v = row / this.rows;
      const u = column / this.columns;
      const index = vertex * 3;

      const centreLift = Math.sin(v * Math.PI) * (0.78 + u * 0.28);
      const edgeLift = Math.pow(v, 2.2) * 0.38;
      const forwardVelocity = FEEL.release.forwardImpulse * (centreLift + edgeLift);
      const downwardVelocity = FEEL.release.downwardImpulse * (0.55 + v * 0.75);
      const sidewaysVelocity = (u - 0.42) * 0.16 * Math.sin(v * Math.PI);

      this.previous[index] = this.positions[index] - sidewaysVelocity * dt;
      this.previous[index + 1] = this.positions[index + 1] + downwardVelocity * dt;
      this.previous[index + 2] = this.positions[index + 2] - forwardVelocity * dt;
    }
  }

  private integrate(dt: number) {
    const dtSquared = dt * dt;
    const gustDistance = (this.elapsed - FEEL.release.gustPeak) / FEEL.release.gustWidth;
    const gustEnvelope = Math.exp(-gustDistance * gustDistance) * FEEL.release.gustStrength;
    const bedProgress = this.smoothstep(FEEL.bed.contactStart, FEEL.bed.contactFull, this.elapsed);
    const damping = FEEL.simulation.velocityDamping
      + (FEEL.bed.settledDamping - FEEL.simulation.velocityDamping) * bedProgress;

    for (let vertex = 0; vertex < this.released.length; vertex += 1) {
      if (!this.released[vertex]) continue;

      const index = vertex * 3;
      const row = Math.floor(vertex / (this.columns + 1));
      const column = vertex % (this.columns + 1);
      const v = row / this.rows;
      const u = column / this.columns;

      const x = this.positions[index];
      const y = this.positions[index + 1];
      const z = this.positions[index + 2];
      const velocityX = (x - this.previous[index]) * damping;
      const velocityY = (y - this.previous[index + 1]) * damping;
      const velocityZ = (z - this.previous[index + 2]) * damping;

      this.previous[index] = x;
      this.previous[index + 1] = y;
      this.previous[index + 2] = z;

      const broadGust = Math.sin(v * Math.PI) * (0.72 + u * 0.42);
      const lateralCurl = Math.sin(u * Math.PI * 1.7 + v * 2.2) * gustEnvelope * 0.12;
      const interior = Math.pow(Math.max(Math.sin(u * Math.PI) * Math.sin(v * Math.PI), 0), 0.28);
      const bedGrip = 0.7 + interior * 0.3;
      const edge = 1 - interior;
      const targetX = this.restPositions[index];
      const targetY = this.restPositions[index + 1];
      const targetZ = edge * FEEL.bed.edgeCurl
        * (0.45 + 0.55 * Math.sin(u * Math.PI * 3.0 + v * Math.PI * 2.0));
      const pullX = (targetX - x) * FEEL.bed.horizontalPull * bedGrip * bedProgress;
      const pullY = (targetY - y) * FEEL.bed.verticalPull * bedGrip * bedProgress;
      const pullZ = (targetZ - z) * FEEL.bed.depthPull * bedGrip * bedProgress;
      const gravity = FEEL.simulation.gravity * (1 - bedProgress * 0.91);

      this.positions[index] = x + velocityX + (lateralCurl + pullX) * dtSquared;
      this.positions[index + 1] = y + velocityY + (pullY - gravity) * dtSquared;
      this.positions[index + 2] = z + velocityZ + (gustEnvelope * broadGust + pullZ) * dtSquared;
    }
  }

  private satisfyConstraint({ a, b, restLength, stiffness }: Constraint) {
    const weightA = this.released[a] ? 1 : 0;
    const weightB = this.released[b] ? 1 : 0;
    const totalWeight = weightA + weightB;
    if (totalWeight === 0) return;

    const ai = a * 3;
    const bi = b * 3;
    const dx = this.positions[bi] - this.positions[ai];
    const dy = this.positions[bi + 1] - this.positions[ai + 1];
    const dz = this.positions[bi + 2] - this.positions[ai + 2];
    const currentLength = Math.hypot(dx, dy, dz);
    if (currentLength < 0.000001) return;

    const correction = ((currentLength - restLength) / currentLength) * stiffness;
    const correctionA = correction * (weightA / totalWeight);
    const correctionB = correction * (weightB / totalWeight);

    this.positions[ai] += dx * correctionA;
    this.positions[ai + 1] += dy * correctionA;
    this.positions[ai + 2] += dz * correctionA;
    this.positions[bi] -= dx * correctionB;
    this.positions[bi + 1] -= dy * correctionB;
    this.positions[bi + 2] -= dz * correctionB;
  }

  private constrainBackPlane() {
    const plane = FEEL.material.backPlane;
    for (let vertex = 0; vertex < this.released.length; vertex += 1) {
      if (!this.released[vertex]) continue;
      const index = vertex * 3;
      if (this.positions[index + 2] >= plane) continue;

      const incomingVelocity = this.positions[index + 2] - this.previous[index + 2];
      this.positions[index + 2] = plane;
      this.previous[index + 2] = plane + incomingVelocity * FEEL.material.backPlaneRestitution;
    }
  }

  private pinTopEdge() {
    for (let column = 0; column <= this.columns; column += 1) {
      const index = column * 3;
      this.positions[index] = this.restPositions[index];
      this.positions[index + 1] = this.restPositions[index + 1];
      this.positions[index + 2] = 0;
      this.previous[index] = this.positions[index];
      this.previous[index + 1] = this.positions[index + 1];
      this.previous[index + 2] = this.positions[index + 2];
    }
  }

  private measureMotion(dt: number) {
    let speedTotal = 0;
    let speedMaximum = 0;
    let movingParticles = 0;
    let allReleased = true;

    for (let vertex = this.columns + 1; vertex < this.released.length; vertex += 1) {
      if (!this.released[vertex]) {
        allReleased = false;
        continue;
      }

      const index = vertex * 3;
      const speed = distance(
        this.positions[index],
        this.positions[index + 1],
        this.positions[index + 2],
        this.previous[index],
        this.previous[index + 1],
        this.previous[index + 2],
      ) / dt;
      speedTotal += speed;
      speedMaximum = Math.max(speedMaximum, speed);
      movingParticles += 1;
    }

    this.averageSpeed = movingParticles ? speedTotal / movingParticles : Number.POSITIVE_INFINITY;
    this.maxSpeed = speedMaximum;

    if (
      allReleased
      && this.elapsed >= FEEL.settle.contentEarliest
      && (this.averageSpeed < FEEL.settle.contentAverageSpeed || this.elapsed >= FEEL.settle.contentTimeout)
    ) {
      this.contentReady = true;
    }

    if (
      allReleased
      && this.averageSpeed < FEEL.settle.averageSpeed
      && this.maxSpeed < FEEL.settle.maxSpeed
    ) {
      this.stableFor += dt;
    } else {
      this.stableFor = 0;
    }

    if (this.stableFor >= FEEL.settle.stableSeconds || this.elapsed >= FEEL.settle.hardTimeout) {
      this.settled = true;
      this.contentReady = true;
    }
  }

  private buildConstraints(width: number, height: number) {
    const horizontalRest = width / this.columns;
    const verticalRest = height / this.rows;
    const diagonalRest = Math.hypot(horizontalRest, verticalRest);

    for (let row = 0; row <= this.rows; row += 1) {
      for (let column = 0; column <= this.columns; column += 1) {
        const vertex = row * (this.columns + 1) + column;
        if (column < this.columns) {
          this.constraints.push({
            a: vertex,
            b: vertex + 1,
            restLength: horizontalRest,
            stiffness: FEEL.material.structuralStiffness,
          });
        }
        if (row < this.rows) {
          this.constraints.push({
            a: vertex,
            b: vertex + this.columns + 1,
            restLength: verticalRest,
            stiffness: FEEL.material.structuralStiffness,
          });
        }
        if (column < this.columns && row < this.rows) {
          this.constraints.push(
            {
              a: vertex,
              b: vertex + this.columns + 2,
              restLength: diagonalRest,
              stiffness: FEEL.material.shearStiffness,
            },
            {
              a: vertex + 1,
              b: vertex + this.columns + 1,
              restLength: diagonalRest,
              stiffness: FEEL.material.shearStiffness,
            },
          );
        }
        if (column + 2 <= this.columns) {
          this.constraints.push({
            a: vertex,
            b: vertex + 2,
            restLength: horizontalRest * 2,
            stiffness: FEEL.material.bendStiffness,
          });
        }
        if (row + 2 <= this.rows) {
          this.constraints.push({
            a: vertex,
            b: vertex + (this.columns + 1) * 2,
            restLength: verticalRest * 2,
            stiffness: FEEL.material.bendStiffness,
          });
        }
      }
    }
  }

  private buildIndices() {
    let index = 0;
    for (let row = 0; row < this.rows; row += 1) {
      for (let column = 0; column < this.columns; column += 1) {
        const a = row * (this.columns + 1) + column;
        const b = a + 1;
        const c = a + this.columns + 1;
        const d = c + 1;
        this.indices[index++] = a;
        this.indices[index++] = c;
        this.indices[index++] = b;
        this.indices[index++] = b;
        this.indices[index++] = c;
        this.indices[index++] = d;
      }
    }
  }

  private smoothstep(from: number, to: number, value: number) {
    const progress = Math.min(Math.max((value - from) / (to - from), 0), 1);
    return progress * progress * (3 - 2 * progress);
  }
}
