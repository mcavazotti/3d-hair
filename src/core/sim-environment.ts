import { AmbientLight, AxesHelper, Color, DirectionalLight, GridHelper, MeshStandardMaterial, Object3D, PerspectiveCamera, Scene, SphereGeometry, WebGLRenderer } from "three";
import { OrbitControls } from "../third_party/OrbitControls";
import { DragControls } from "../third_party/DragControls";
import GUI from "lil-gui";
import { GuiControlObject } from "../types/configs";
import { Hair } from "./hair";
import { StatsEnvironment } from "./stats-environment";
import { PopUp } from "../auxiliary/popup";
import { ExtendedBufferGeometry, ExtendedMesh } from "../auxiliary/extended-types";
// import { MeshBVHVisualizer } from "three-mesh-bvh";

export class SimEnvironment {
    private renderer: WebGLRenderer;
    private scene: Scene;
    private camera: PerspectiveCamera;
    private cameraControl: OrbitControls;
    private mainObject: ExtendedMesh;
    private hair: Hair;
    private auxiliaryObjects: Map<string, Object3D>;
    private dragControl: DragControls;
    private gui!: GUI;
    private guiControlObject: GuiControlObject;
    private statsEnv?: StatsEnvironment;
    // private bvhViz: MeshBVHVisualizer;

    private prevTimestamp!: number;


    constructor() {
        this.renderer = new WebGLRenderer({antialias: true});
        this.renderer.shadowMap.enabled = true;
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        document.body.appendChild(this.renderer.domElement);

        this.scene = new Scene();
        this.scene.background = new Color(0x444444);

        this.camera = new PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.camera.position.z = 5;
        this.camera.position.y = 5;

        this.cameraControl = new OrbitControls(this.camera, this.renderer.domElement);

        const geometry = new ExtendedBufferGeometry(new SphereGeometry(0.5));
        const material = new MeshStandardMaterial({ color: 0x886644 });
        this.mainObject = new ExtendedMesh<ExtendedBufferGeometry, MeshStandardMaterial>(geometry, material);
        this.mainObject.position.y = 0.5;
        this.mainObject.castShadow = true;
        this.mainObject.receiveShadow = true;
        this.scene.add(this.mainObject);

        // this.bvhViz = new MeshBVHVisualizer(this.mainObject, 10);
        // this.scene.add(this.bvhViz);

        this.hair = new Hair();
        this.mainObject.add(this.hair.object3D);
        this.hair.createHair(this.mainObject);
        this.hair.simulationParameters.colliders = [this.mainObject];
        this.hair.object3D.receiveShadow = true;
        this.hair.object3D.castShadow = true;
        
        const light = new DirectionalLight(0xffffff);
        this.hair.object3D.add(light)
        light.position.set(10,5,0);
        light.castShadow = true;
        light.shadow.mapSize.width = 2048;
        light.shadow.mapSize.height = 2048;
        light.target = this.hair.object3D;

        this.auxiliaryObjects = new Map<string, Object3D>([
            ['ambientLight', new AmbientLight(0xffffff, 0.2)],
            ['grid', new GridHelper(10, 11)],
            ['axes', new AxesHelper(2)],
        ]);

        for (const obj of this.auxiliaryObjects.values()) {
            this.scene.add(obj);
        }



        this.dragControl = new DragControls([this.mainObject], this.camera, this.renderer.domElement);
        this.dragControl.transformGroup = true;

        this.dragControl.addEventListener('hoveron', () => {
            this.cameraControl.enabled = false;
        });
        this.dragControl.addEventListener('dragstart', () => {
            this.cameraControl.enabled = false;
        });

        this.dragControl.addEventListener('hoveroff', () => {
            this.cameraControl.enabled = true;
        });
        this.dragControl.addEventListener('dragend', () => {
            this.cameraControl.enabled = true;
        });

        this.guiControlObject = {
            mainObject: 'cube',
            fixedDeltaTime: false,
            runSimulation: true,
            simulateStep: () => {
                this.hair.simulateCycle(1 / 60);
                if (this.statsEnv) {
                    this.statsEnv.updateData(this.hair.strands.flat(), this.hair.simulationParameters.gravity.length());
                }
            },
            reset: () => {
                this.mainObject.position.x = 0;
                this.mainObject.position.y = 0.5;
                this.mainObject.position.z = 0;

                this.hair.geometry.dispose();
                this.hair.createHair(this.mainObject);
            },
            openStats: () => {
                if (!this.statsEnv) {
                    const popup = new PopUp(() => {
                        this.statsEnv = undefined;
                    });
                    this.statsEnv = popup.getStatsEnv();
                }
            }

        };

        this.setupGui();

    }

    start() {
        this.prevTimestamp = performance.now();
        requestAnimationFrame(this.loop.bind(this));
    }

    private loop(timestamp: number) {
        const deltaTime = (timestamp - this.prevTimestamp) / 1000;
        this.prevTimestamp = timestamp;

        if (this.guiControlObject.runSimulation) {
            this.hair.simulateCycle(this.guiControlObject.fixedDeltaTime ? 1 / 60 : deltaTime);

            if (this.statsEnv) {
                this.statsEnv.updateData(this.hair.strands.flat(), this.hair.simulationParameters.gravity.length());
            }
        }

        this.renderer.render(this.scene, this.camera);
        requestAnimationFrame(this.loop.bind(this));
    }

    private setupGui() {
        this.gui = new GUI();
        this.gui.add(this.guiControlObject, 'openStats');

        const objFolder = this.gui.addFolder('Main Object');

        // objFolder.add(this.guiControlObject, 'mainObject', ['cube', 'sphere', 'plane']).onChange((val: string) => {
        //     this.mainObject.geometry.dispose();
        //     switch (val) {
        //         case 'cube':
        //             this.mainObject.geometry = new ExtendedBufferGeometry(new BoxGeometry(1, 1, 1));
        //             break;
        //         case 'sphere':
        //             this.mainObject.geometry = new ExtendedBufferGeometry(new SphereGeometry(0.5));
        //             break;
        //         case 'plane':
        //             this.mainObject.geometry = new ExtendedBufferGeometry(new PlaneGeometry());
        //             break;
        //     }
        //     this.hair.createHair(this.mainObject);
        //     // this.bvhViz.update();
        // });
        objFolder.add(this.mainObject.material, 'wireframe');

        const simFolder = this.gui.addFolder('Simulation Parameters')
        simFolder.add(this.hair.hairParameters, 'numberOfSegments', 1, 100, 1).onChange(() => {
            this.hair.geometry.dispose();
            this.hair.createHair(this.mainObject);
        });
        simFolder.add(this.hair.hairParameters, 'segmentLength', 0, 10).onChange(() => {
            this.hair.geometry.dispose();
            this.hair.createHair(this.mainObject);
        });

        const gravity = simFolder.addFolder('Gravity');
        gravity.add(this.hair.simulationParameters.gravity, 'x');
        gravity.add(this.hair.simulationParameters.gravity, 'y');
        gravity.add(this.hair.simulationParameters.gravity, 'x');

        simFolder.add(this.hair.simulationParameters, 'damping', 0, 1);
        simFolder.add(this.hair.simulationParameters, 'steps', 1, 1000, 1);

        simFolder.add(this.guiControlObject, 'runSimulation');
        simFolder.add(this.guiControlObject, 'simulateStep');
        simFolder.add(this.guiControlObject, 'reset');
    }
}
