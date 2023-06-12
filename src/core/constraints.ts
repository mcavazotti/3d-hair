import { Vector3 } from "three";
import { ExtendedBufferGeometry } from "../auxiliary/extended-types";
import { Particle } from "../types/particle";

export function distanceConstraint(particle: Particle, other: Particle, restDistance: number) {
    const dist = particle.position.distanceTo(other.position);
    const delta = other.position.clone().sub(particle.position);
    const correction = delta.normalize().multiplyScalar(-(restDistance - dist))
    particle.position.add(correction);
    return correction;
}


export function penetrationContraint(particle: Particle, collider: ExtendedBufferGeometry) {
    const bvh = collider.boundsTree;
    
    const target = bvh.shapecast({
        intersectsBounds: (box) => box.containsPoint(particle.position),
        intersectsTriangle: (triangle) => {
            const vec = particle.position.clone().sub(triangle.a);
            const normal = new Vector3();
            triangle.getNormal(normal);
            const projection = vec.dot(normal.normalize());
            if(projection < 0.01) {
                // console.log(vec);
                particle.position.add(normal.multiplyScalar(0.01- projection));
                return true;
            }
            return false;
        }
    });
    // console.log(target);
}