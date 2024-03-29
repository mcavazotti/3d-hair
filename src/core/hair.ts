import { BufferAttribute, BufferGeometry, Color, Euler, GLSL3, LineSegments, Mesh, Quaternion, ShaderMaterial, StreamDrawUsage, UniformsLib, Vector3 } from "three";
import { HairParameters, SimulationParameters } from "../types/configs";
import { Strand, Particle } from "../types/particle";
import { distanceConstraint, spherePenetrationConstraint } from "./constraints";
import { hairVertexShader } from "../assets/shaders/hair.vert";
import { hairFragmentShader } from "../assets/shaders/hair.frag";

export class Hair {
    hairParameters: HairParameters;
    simulationParameters: SimulationParameters;
    strands!: Strand[];
    object3D: LineSegments;
    geometry!: BufferGeometry;
    castShadows: boolean = true;

    // to test if there's a difference in using the deltaThete = cosine(angle) - cosine(rest)
    // private restAngleCos!: number;

    constructor() {
        this.hairParameters = {
            numberOfSegments: 20,
            segmentLength: 0.1,
            particleRadius: 0.001,
            restAngle: 180,
            stiffness: 0,
            curlyHair: true,
            particleMass: 1,
        };

        this.simulationParameters = {
            gravity: new Vector3(0, -10, 0),
            damping: 0.875,
            steps: 2,
            colliders: []
        };
        this.geometry = new BufferGeometry();
        // this.object3D = new LineSegments(this.geometry, new LineBasicMaterial({ color: 0xaaaa00 }));
        this.object3D = new LineSegments(this.geometry, new ShaderMaterial({
            vertexShader: hairVertexShader,
            fragmentShader: hairFragmentShader,
            lights: true,
            glslVersion: GLSL3,
            uniforms: {
                ...UniformsLib.lights,
                uColor: { value: new Color(0.2, 0.2, 0.05) }
            }
        }));
    }

    createHair(baseObject: Mesh) {
        this.generateStrands(baseObject);
        this.setGeometry();
    }

    private generateStrands(baseObject: Mesh) {
        const baseGeometry = baseObject.geometry;
        const worldPosition = baseObject.position.clone();
        const worldRotation = baseObject.rotation.clone();

        const positionBuffer = (baseGeometry.attributes['position'] as BufferAttribute);
        const normalBuffer = (baseGeometry.attributes['normal'] as BufferAttribute);
        this.strands = []
        for (let i = 0; i < positionBuffer.array.length; i += positionBuffer.itemSize) {
            const baseVertex = new Vector3(positionBuffer.array[i], positionBuffer.array[i + 1], positionBuffer.array[i + 2]);
            const transformedVertex = baseVertex.clone().add(worldPosition);

            const direction = new Vector3(normalBuffer.array[i], normalBuffer.array[i + 1], normalBuffer.array[i + 2]);
            direction.applyEuler(worldRotation);

            const strand = this.generateStrand(transformedVertex, baseVertex, direction, this.hairParameters.curlyHair ? new Euler(0, Math.PI / 4, Math.PI /3) : undefined, Math.random());
            this.strands.push(strand);
        }
        console.log(this.strands.map(s => s.length - 2).reduce((a, b) => a + b) + " particles");
    }

    private generateStrand(root: Vector3, rootVertex: Vector3, normal: Vector3, twist?: Euler, noise?: number): Strand {
        const strand: Strand = [];

        const rotation = new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), normal.clone().normalize());

        for (let i = 0; i < this.hairParameters.numberOfSegments; i++) {
            let particle: Particle;
            if (i == 0) {
                particle = { position: new Vector3(), velocity: new Vector3(), prevPos: new Vector3(), vertexPos: rootVertex.clone(), auxPoint: new Vector3(1), normal: normal };
                particle.auxPoint!.applyQuaternion(rotation).add(root);
            } else {
                const segment = new Vector3(0, this.hairParameters.segmentLength, 0);
                if (twist) {
                    const localTwist = twist.clone();
                    localTwist.y = twist.y * i + Math.PI*(noise??0);
                    segment.applyEuler(localTwist);
                }
                particle = { position: new Vector3(0, segment.y * i).add(segment), velocity: new Vector3(), prevPos: new Vector3(0, segment.y * i).add(segment) };
            }

            particle.position
                .applyQuaternion(rotation)
                .add(root);
            particle.prevPos
                .applyQuaternion(rotation)
                .add(root);
            strand.push(particle);
        }

        for (let i = 0; i < this.hairParameters.numberOfSegments; i++) {
            const particle = strand[i];
            const ax1 = particle.normal?.normalize() ?? strand[i].position.clone().sub(strand[i-1].position).normalize();
            let ax2: Vector3;
            if(particle.auxPoint) {
                ax2 = particle.auxPoint.clone().sub(particle.position).normalize();
            } else {
                
            }
        }
        return strand;

    }

    private setGeometry() {
        const vertices = new Float32Array(this.strands.flat().flatMap((p) => {
            const pos = this.object3D.worldToLocal(p.position.clone());
            return [pos.x, pos.y, pos.z];
        }));

        const segmentDirections = new Float32Array(this.strands.flat().flatMap((p, index, particles) => {
            const p1 = (index < particles.length - 1) ? p : particles[index - 1];
            const p2 = (index < particles.length - 1) ? particles[index + 1] : p;

            const pos1 = this.object3D.worldToLocal(p1.position.clone());
            const pos2 = this.object3D.worldToLocal(p2.position.clone());
            const dir = pos2.sub(pos1);

            return [dir.x, dir.y, dir.z];
        }));

        const vertexBuffer = new BufferAttribute(vertices, 3);
        vertexBuffer.usage = StreamDrawUsage;
        const directionBuffer = new BufferAttribute(segmentDirections, 3);
        directionBuffer.usage = StreamDrawUsage;

        // const normalBuffer = new BufferAttribute(3)

        const indices = this.strands.flatMap((strand, idx) => {
            const strandIndices: number[] = [idx * strand.length];

            for (let i = 1; i < strand.length - 1; i++) {
                strandIndices.push(idx * strand.length + i, idx * strand.length + i);
            }
            strandIndices.push((idx + 1) * strand.length - 1);
            return strandIndices
        });

        this.geometry.setIndex(indices);
        this.geometry.setAttribute('position', vertexBuffer);
        this.geometry.setAttribute('normal', directionBuffer);
    }

    private updateGeometry() {
        const vertices = new Float32Array(this.strands.flat().flatMap((p) => {
            const pos = this.object3D.worldToLocal(p.position.clone());
            return [pos.x, pos.y, pos.z];
        }));

        const vertexBuffer = this.geometry.attributes['position'] as BufferAttribute;
        vertexBuffer.set(vertices);
        this.geometry.attributes['position'].needsUpdate = true;

        if (this.castShadows) {

            const segmentDirections = new Float32Array(this.strands.flat().flatMap((p, index, particles) => {
                const p1 = (index < particles.length - 1) ? p : particles[index - 1];
                const p2 = (index < particles.length - 1) ? particles[index + 1] : p;

                const pos1 = this.object3D.worldToLocal(p1.position.clone());
                const pos2 = this.object3D.worldToLocal(p2.position.clone());
                const dir = pos2.sub(pos1);

                return [dir.x, dir.y, dir.z];
            }));
            const directionBuffer = this.geometry.attributes['normal'] as BufferAttribute;
            directionBuffer.set(segmentDirections);
            this.geometry.attributes['normal'].needsUpdate = true;
        }

    }

    simulateCycle(deltaTime: number) {
        for (let i = 0; i < this.simulationParameters.steps; i++)
            this.simulateStep(deltaTime / this.simulationParameters.steps);
        this.updateGeometry();
    }

    simulateStep(deltaTime: number) {
        // this.restAngleCos = Math.cos(this.hairParameters.restAngle / 180 * Math.PI);
        const maxVelocity = (this.hairParameters.segmentLength / this.hairParameters.particleRadius) * this.simulationParameters.steps / deltaTime;
        for (const strand of this.strands) {
            for (let i = 0; i < strand.length; i++) {
                const particle = strand[i];
                if (i == 0) {
                    particle.prevPos.copy(particle.position);
                    particle.position.copy(this.object3D.localToWorld(particle.vertexPos!.clone()));
                    particle.velocity.subVectors(particle.position, particle.prevPos).divideScalar(deltaTime);
                    continue;
                }

                const acceleration = this.simulationParameters.gravity.clone();

                particle.velocity.addScaledVector(acceleration, deltaTime);
            }
        }

        for (const strand of this.strands) {
            for (let i = 1; i < strand.length; i++) {


                const particle = strand[i];
                /** UPDATE POSITIONS */
                particle.prevPos.copy(particle.position);

                particle.position.addScaledVector(particle.velocity, deltaTime);

                /** SOLVE CONSTRAINTS */
                const correction = distanceConstraint(particle, strand[i - 1], this.hairParameters.segmentLength, deltaTime, 0, undefined, Infinity);
                const p: Particle = {
                    position: this.object3D.worldToLocal(particle.position.clone()),
                    prevPos: new Vector3(),
                    velocity: new Vector3()
                }
                spherePenetrationConstraint(p, this.object3D.position, 0.5);
                particle.position = this.object3D.localToWorld(p.position);

                /** UPDATE VELOCITIES*/
                particle.velocity.subVectors(particle.position, particle.prevPos).divideScalar(deltaTime);
                strand[i - 1].velocity.add(correction[0].multiplyScalar(-this.simulationParameters.damping / deltaTime));
                // strand[i - 2].velocity.add(correction[1].multiplyScalar(-this.simulationParameters.damping / deltaTime));

                // clamp velocity
                particle.velocity.clampLength(0, maxVelocity);
                strand[i - 1].velocity.clampLength(0, maxVelocity);

            }
        }
    }

    computeStiffnessAcc(p1: Vector3, p2: Vector3, p3: Vector3): [Vector3, Vector3] {
        const v1 = new Vector3().subVectors(p1, p2).normalize();
        const v2 = new Vector3().subVectors(p3, p2).normalize();

        const dot = Math.max(-1, Math.min(v1.dot(v2), 1));
        const angle = Math.acos(dot);
        const restAngleRad = this.hairParameters.restAngle / 180 * Math.PI;
        // const deltaTheta = -(dot - this.restAngleCos);
        const deltaTheta = (angle - restAngleRad);

        const torque = this.hairParameters.stiffness * deltaTheta;
        const f = torque;
        const acc = f / this.hairParameters.particleMass * (1 - this.simulationParameters.damping);

        if (isNaN(acc)) {
            throw Error("NAN!!!!!!!!!!!!!!!")
        }

        const direction1 = v2.clone().sub(v1.clone().multiplyScalar(v1.dot(v2))).multiplyScalar(0.5);
        const direction2 = v1.clone().sub(v2.clone().multiplyScalar(v2.dot(v1))).multiplyScalar(0.5);


        return [direction1.multiplyScalar(acc), direction2.multiplyScalar(acc)];


    }
}
