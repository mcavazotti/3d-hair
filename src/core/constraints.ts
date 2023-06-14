import { Vector3 } from "three";
import { ExtendedBufferGeometry } from "../auxiliary/extended-types";
import { Particle } from "../types/particle";
import { CONTAINED, NOT_INTERSECTED } from "three-mesh-bvh";

export function distanceConstraint(particle: Particle, other: Particle, restDistance: number) {
    const dist = particle.position.distanceTo(other.position);
    const delta = other.position.clone().sub(particle.position);
    const correction = delta.normalize().multiplyScalar(-(restDistance - dist));
    particle.position.add(correction);
    return correction;
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
        intersectsBounds: (box) => box.containsPoint(particle.position)? CONTAINED: NOT_INTERSECTED ,
        intersectsTriangle: (triangle) => {
            const vec = particle.position.clone().sub(triangle.a);
            const normal = new Vector3(); 
            triangle.getNormal(normal);
            const projection = vec.dot(normal.normalize());
            if(triangle.containsPoint(particle.position) && projection < 0.01){
                particle.position.add(normal.clone().multiplyScalar(0.01 - projection));
                return true;
            }
            return false;
        }
    });
    // console.log(target);
}