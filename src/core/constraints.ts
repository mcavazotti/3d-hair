import { Particle } from "../types/particle";

export function distanceConstraint(particle: Particle, other: Particle, restDistance: number) {
    const dist = particle.position.distanceTo(other.position);
    const delta = other.position.clone().sub(particle.position);
    const correction = delta.normalize().multiplyScalar(-(restDistance - dist))
    particle.position.add(correction);
    return correction;
}