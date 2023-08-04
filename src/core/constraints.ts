import { Vector3 } from "three";
import { ExtendedBufferGeometry } from "../auxiliary/extended-types";
import { Particle } from "../types/particle";
import { CONTAINED, NOT_INTERSECTED } from "three-mesh-bvh";

export function distanceConstraint(particle: Particle, other: Particle, restDistance: number, deltaTime: number, compliance: number, mass1Override?: number, mass2Override?: number): [Vector3, Vector3] {
    const m1 = mass1Override ?? particle.mass ?? 1;
    const m2 = mass2Override ?? other.mass ?? 1;

    const x = new Vector3().subVectors(other.position, particle.position);

    const gradient = x.clone().normalize();
    const w1 = 1 / m1;
    const w2 = 1 / m2;

    const alpha = compliance / (deltaTime * deltaTime);
    const lambda = (x.length() - restDistance) / (w1 + w2 + alpha);

    const deltaX1 = new Vector3().addScaledVector(gradient, lambda * w1);
    const deltaX2 = new Vector3().addScaledVector(gradient, -lambda * w2);

    particle.position.add(deltaX1);
    other.position.add(deltaX2);

    return [deltaX1, deltaX2];
}

export function spherePenetrationConstraint(particle: Particle, position: Vector3, radius: number) {
    const dist = particle.position.distanceTo(position);
    if (dist < (radius + 0.01)) {
        const normal = position.clone().sub(particle.position);
        const correction = normal.normalize().multiplyScalar(-(radius + 0.01 - dist));
        particle.position.add(correction);
    }
}

export function penetrationContraint(particle: Particle, collider: ExtendedBufferGeometry) {
    const bvh = collider.boundsTree;

    bvh.shapecast({
        intersectsBounds: (box) => box.containsPoint(particle.position) ? CONTAINED : NOT_INTERSECTED,
        intersectsTriangle: (triangle) => {
            const vec = particle.position.clone().sub(triangle.a);
            const normal = new Vector3();
            triangle.getNormal(normal);
            const projection = vec.dot(normal.normalize());
            if (triangle.containsPoint(particle.position) && projection < 0.01) {
                particle.position.add(normal.clone().multiplyScalar(0.01 - projection));
                return true;
            }
            return false;
        }
    });
    // console.log(target);
}