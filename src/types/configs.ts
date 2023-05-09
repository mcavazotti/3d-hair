import { Vector3 } from "three";

export interface HairParameters {
    numberOfSegments: number;
    segmentLength: number;
}

export interface SimulationParameters {
    gravity: Vector3;
    damping: number;
    steps: number;
}

export interface GuiControlObject {
    mainObject: 'cube' | 'sphere' | 'plane';
    simulateStep: Function;
    fixedDeltaTime: boolean;
    reset: Function;
    runSimulation: boolean;
    openStats:Function;
}