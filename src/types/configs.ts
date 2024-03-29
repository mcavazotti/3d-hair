import { Vector3 } from "three";
import { ExtendedMesh } from "../auxiliary/extended-types";

export interface HairParameters {
    numberOfSegments: number;
    segmentLength: number;
    particleRadius: number;
    curlyHair: boolean;
    restAngle: number;
    stiffness: number;
    particleMass: number;
}

export interface SimulationParameters {
    gravity: Vector3;
    damping: number;
    steps: number;
    colliders: ExtendedMesh[];
}

export interface GuiControlObject {
    mainObject: 'cube' | 'sphere' | 'plane';
    showShadows: boolean;
    simulateStep: Function;
    fixedDeltaTime: boolean;
    reset: Function;
    runSimulation: boolean;
    openStats:Function;
}