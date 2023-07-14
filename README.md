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