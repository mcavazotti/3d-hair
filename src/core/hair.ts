import { BufferAttribute, BufferGeometry, Color, GLSL3, LineSegments, Mesh, ShaderMaterial, StreamDrawUsage, UniformsLib, Vector3 } from "three";
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

    constructor() {
        this.hairParameters = {
            numberOfSegments: 20,
            segmentLength: 0.1,
        };

        this.simulationParameters = {
            gravity: new Vector3(0, -10, 0),
            damping: 0.9,
            steps: 1,
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
                uColor: { value: new Color(0.2, 0.2, 0.05)}
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

        const segmentDirections = new Float32Array(this.strands.flat().flatMap((p, index, particles) => {
            const p1 = (index < particles.length -1)? p: particles[index-1];
            const p2 = (index < particles.length -1)? particles[index + 1]: p;
            
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
        
        if(this.castShadows) {

            const segmentDirections = new Float32Array(this.strands.flat().flatMap((p, index, particles) => {
                const p1 = (index < particles.length -1)? p: particles[index-1];
                const p2 = (index < particles.length -1)? particles[index + 1]: p;
                
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
        for (const strand of this.strands) {
            for (let i = 0; i < strand.length; i++) {
                const particle = strand[i];
                if (i == 0) {
                    particle.prevPos.copy(particle.position);
                    particle.position.copy(this.object3D.localToWorld(particle.vertexPos!.clone()));
                    particle.velocity.subVectors(particle.position,particle.prevPos).divideScalar(deltaTime);
                    continue;
                }

                particle.prevPos.copy(particle.position);
                particle.position.addScaledVector(particle.velocity.clone().addScaledVector(this.simulationParameters.gravity, deltaTime), deltaTime);

                /** SOLVE CONSTRAINTS */
                const p: Particle = {
                    position: this.object3D.worldToLocal(particle.position.clone()),
                    prevPos: new Vector3(),
                    velocity: new Vector3()
                }
                spherePenetrationConstraint(p, this.object3D.position,0.5);
                particle.position = this.object3D.localToWorld(p.position);
                const correction = distanceConstraint(particle, strand[i - 1], this.hairParameters.segmentLength);
                
                /** UPDATE VELOCITIES*/
                particle.velocity.subVectors(particle.position, particle.prevPos).divideScalar(deltaTime);
                strand[i - 1].velocity.add(correction.multiplyScalar(-this.simulationParameters.damping/ deltaTime));
            }
        }
    }
}
