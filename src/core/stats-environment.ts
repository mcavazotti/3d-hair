import { Chart } from "chart.js/auto";
import { Particle } from "../types/particle";

export class StatsEnvironment {
    private energyChart: Chart;
    private datasets = {
        potential: [] as number[],
        kinetic: [] as number[],
        total: [] as number[],
    }

    constructor(popUpDocument: Document) {
        // popUpDocument.body.innerHTML = `<canvas id="energy" width=400 height=400></canvas>`;
        const element = popUpDocument.createElement('canvas');
        element.setAttribute('width', '400');
        element.setAttribute('height', '400');
        popUpDocument.body.appendChild(element);
        this.energyChart = new Chart(element, {
            type: 'line',
            data: {
                labels: new Array(120).fill(''),
                datasets: [
                    {
                        label: 'Potential Energy',
                        data: this.datasets.potential
                    },
                    {
                        label: 'Kinetic Energy',
                        data: this.datasets.kinetic
                    },
                    {
                        label: 'Total Energy',
                        data: this.datasets.total
                    },
                ]
            },
            options: {
                animation: false,
                elements: {
                    point: {
                        radius: 0
                    }
                }
            }

        });
    }

    updateData(particles: Particle[], gravity: number) {
        const energy = particles.reduce<[number, number]>((prev, particle) => {
            const kineticEnergy = 0.5 * (particle.mass ?? 1) * particle.velocity.lengthSq();
            const potentialEnergy = (particle.mass ?? 1) * gravity * particle.position.y;
            return [prev[0] + kineticEnergy, prev[1] + potentialEnergy]
        }, [0, 0]);

        this.datasets.kinetic.push(energy[0]);
        if (this.datasets.kinetic.length > 120) this.datasets.kinetic.shift();
        this.datasets.potential.push(energy[1]);
        if (this.datasets.potential.length > 120) this.datasets.potential.shift();
        this.datasets.total.push(energy[0] + energy[1]);
        if (this.datasets.total.length > 120) this.datasets.total.shift();

        this.energyChart.update();
    }
}