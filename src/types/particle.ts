import { Vector3 } from "three";

export interface Particle {
    prevPos: Vector3;
    vertexPos?: Vector3;
    position: Vector3;
    velocity: Vector3;
}

export type Strand = Particle[];