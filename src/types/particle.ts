import { Vector3 } from "three";

export interface Particle {
    prevPos: Vector3;
    vertexPos?: Vector3;
    auxPoint?: Vector3;
    childLocalPos?: Vector3;
    normal?: Vector3;
    mass?: number;
    position: Vector3;
    velocity: Vector3;
}

export type Strand = Particle[];