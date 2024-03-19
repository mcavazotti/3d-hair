import { Quaternion, Vector3 } from "three";

export function rotationFromTo(from: Vector3, to: Vector3): Quaternion {
    const a = from.clone().normalize();
    const b = to.clone().normalize();
    const quaternion = new Quaternion();
    return quaternion.setFromAxisAngle(a.add(b), Math.PI);
}