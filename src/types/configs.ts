import { Vector3 } from "three";

export interface HairParameters {
    numberOfSegments: number;
    segmentLength: number;
}

export interface SimulationParameters {
    gravity: Vector3;
}

export interface GuiControlObject {
    mainObject: 'cube' | 'sphere' | 'plane';
}