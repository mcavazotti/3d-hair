# Goal:
Implement a real-time hair simulator with the following features:
1. Hair-mesh collision
2. Hair-hair collision
3. Accurately simulate curly hair dynamics

# Development choices:
- [ThreeJS](https://threejs.org/) to handle rendering and interaction
- [Position-based Dynamics (PBD)](https://diglib.eg.org/bitstream/handle/10.2312/egt.20151045.t3/t3.pdf) to simulate inextensible strand behavior
- [Follow The Leader (FTL) PBD](https://matthias-research.github.io/pages/publications/FTLHairFur.pdf) to properly simmulate strands


# Dev-log
- (28/06/23) Found some jittering in the hair strands sometimes.
  - Cause identified to be the velocity correction from DFTL
  - Having more substeps increases the changes of jittering happening
  - Solving for penetration first attenuate problem
    - This requires more substeps or deltaTime small enough to garantee constraint is maintained
- (04/08/23) Made yet another change in the calculation of the distance constraint, this time to implement compliance. Clamp velocity helps solving jittering
  - Adapted the formula from [Matthias Muller](https://matthias-research.github.io/pages/tenMinutePhysics/15-selfCollision.pdf): instead of considering only the particle radius, I used `segmentLength / particleRadius`.
- (11/08/23) Implemented (a flawed) hair stiffness
  - I create a "root" particle bellow object's surface
  - I'm using the angular form of Hooke's law
  - I changed the original PBD algorithm
    - Instead of calculating the acceleration, applying it to the velocity and updating the particle's position in the main loop, I separated the acceleration calculation and application to velocity in a new loop before the main one.
      - This improved the spring behavior because when following the original algorithm, after the  `n-th` particle's position is updated and corrected, the angle `(n-1, n, n+1)` is very likely to be more acute than it was before the update, causing greater elastic forces to be applied and, therefore, instability.
      - By computing all the accelerations (forces) before moving the particles, it`ll garanty that the accelerations will be relative to a more compliant configuration of the particles
  - The stiffness calculation reintrodiced jittering
    - If stiffness is high enough to be noticiable (a desired effect), the simulation is not likely to find a stable configuration, more so if the hair strand is long enough and its direction is close to the  up position (`(0,1,0)` in Three.js)
  - I tried to use `deltaTheta = cos(theta)- cos(theta_0)` to avoid having to compute the arc cosine of the value resulted from the dot product, but I didn't noticiable performance improvement, so I prefered to stick to the physical accurate formula