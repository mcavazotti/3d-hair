import { Particle } from "../types/particle";

export function distanceConstraint(particle: Particle, other: Particle, restDistance: number) {
    const dist = particle.position.distanceTo(other.position);
    const delta = other.position.clone().sub(particle.position);
    particle.position.sub(delta.normalize().multiplyScalar(restDistance - dist));
}