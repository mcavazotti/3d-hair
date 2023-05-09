import { BufferAttribute, BufferGeometry, LineBasicMaterial, LineSegments, Mesh, StreamDrawUsage, Vector3 } from "three";
import { HairParameters, SimulationParameters } from "../types/configs";
import { Strand } from "../types/particle";
import { distanceConstraint } from "./constraints";

export class Hair {
    hairParameters: HairParameters;
    simulationParameters: SimulationParameters;
    strands!: Strand[];
    object3D: LineSegments;
    geometry!: BufferGeometry;

    constructor() {
        this.hairParameters = {
            numberOfSegments: 20,
            segmentLength: 0.1,
        };

        this.simulationParameters = {
            gravity: new Vector3(0, -10, 0),
            damping: 0.9,
            steps: 1
        };
        this.geometry = new BufferGeometry();
        this.object3D = new LineSegments(this.geometry, new LineBasicMaterial({ color: 0xaaaa00 }));
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

            const strand: Strand = [{ vertexPos: baseVertex, prevPos: transformedVertex.clone(), position: transformedVertex.clone(), velocity: new Vector3() }];
            for (let j = 1; j <= this.hairParameters.numberOfSegments; j++) {
                strand.push({ prevPos: transformedVertex.clone().addScaledVector(direction, this.hairParameters.segmentLength * j), position: transformedVertex.clone().addScaledVector(direction, this.hairParameters.segmentLength * j), velocity: new Vector3() });
            }
            this.strands.push(strand);
        }
    }

    private setGeometry() {
        const vertices = new Float32Array(this.strands.flat().flatMap((p) => {
            const pos = this.object3D.worldToLocal(p.position.clone());
            return [pos.x, pos.y, pos.z];
        }));
        const vertexBuffer = new BufferAttribute(vertices, 3);
        vertexBuffer.usage = StreamDrawUsage;

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
    }

    private updateGeometry() {
        const vertices = new Float32Array(this.strands.flat().flatMap((p) => {
            const pos = this.object3D.worldToLocal(p.position.clone());
            return [pos.x, pos.y, pos.z];
        }));

        const vertexBuffer = this.geometry.attributes['position'] as BufferAttribute;
        vertexBuffer.set(vertices);
        this.geometry.attributes['position'].needsUpdate = true;
    }

    simulateCycle(deltaTime: number) {
        for (let i = 0; i < this.simulationParameters.steps; i++)
            this.simulateStep(deltaTime / this.simulationParameters.steps);
        this.updateGeometry();
    }

    simulateStep(deltaTime: number) {
        for (const strand of this.strands) {
            for (let i = 0; i < strand.length; i++) {
                const particle = strand[i];
                if (i == 0 && particle.vertexPos) {
                    particle.prevPos.copy(particle.position);
                    particle.position.copy(this.object3D.localToWorld(particle.vertexPos.clone()));
                    continue;
                }

                particle.prevPos.copy(particle.position);
                particle.position.addScaledVector(particle.velocity.addScaledVector(this.simulationParameters.gravity, deltaTime), deltaTime);

                /** SOLVE CONSTRAINTS */
                const correction = distanceConstraint(particle, strand[i - 1], this.hairParameters.segmentLength);

                /** UPDATE VELOCITIES*/
                particle.velocity.subVectors(particle.position, particle.prevPos).divideScalar(deltaTime);
                strand[i - 1].velocity.add(correction.multiplyScalar(-1 * this.simulationParameters.damping * (1 / deltaTime)));
                continue;
            }
        }
    }
}