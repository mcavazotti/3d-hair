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
            const vec = new Vector3()
            triangle.closestPointToPoint(particle.position,vec)
            if(vec.sub(particle.position).length() < 0.1)
                console.log(vec);
                return true;
            return false;
        }
    });
    // console.log(target);
}