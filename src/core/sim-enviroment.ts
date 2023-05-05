import { AxesHelper, BoxGeometry, BufferGeometry, Color, GridHelper, HemisphereLight, Mesh, MeshStandardMaterial, Object3D, PerspectiveCamera, PlaneGeometry, Scene, SphereGeometry, Vector3, WebGLRenderer } from "three";
import { OrbitControls } from "../third_party/OrbitControls";
import { DragControls } from "../third_party/DragControls";
import GUI from "lil-gui";
import { GuiControlObject } from "../types/configs";
import { Hair } from "./hair";

export class SimEnvironment {
    private renderer: WebGLRenderer;
    private scene: Scene;
    private camera: PerspectiveCamera;
    private cameraControl: OrbitControls;
    private mainObject: Mesh;
    private hair: Hair;
    private auxiliaryObjects: Map<string, Object3D>;
    private dragControl: DragControls;
    private gui!: GUI;
    private guiControlObject: GuiControlObject;

    private prevTimestamp!: number;


    constructor() {
        this.renderer = new WebGLRenderer();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        document.body.appendChild(this.renderer.domElement);

        this.scene = new Scene();
        this.scene.background = new Color(0x444444);

        this.camera = new PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.camera.position.z = 5;
        this.camera.position.y = 5;

        this.cameraControl = new OrbitControls(this.camera, this.renderer.domElement);

        const geometry = new BoxGeometry(1, 1, 1);
        const material = new MeshStandardMaterial({ color: 0x886644 });
        this.mainObject = new Mesh<BufferGeometry, MeshStandardMaterial>(geometry, material);
        this.mainObject.position.y = 0.5;
        this.scene.add(this.mainObject);

        this.hair = new Hair();
        this.mainObject.add(this.hair.object3D);
        this.hair.createHair(this.mainObject);

        this.auxiliaryObjects = new Map<string, Object3D>([
            ['light', new HemisphereLight(0xffffff, 0x444444)],
            ['grid', new GridHelper(10, 11)],
            ['axes', new AxesHelper(2)],
        ]);
        this.auxiliaryObjects.get('light')?.position.add(new Vector3(1, 0.5, 0));

        for (const obj of this.auxiliaryObjects.values()) {
            this.scene.add(obj);
        }



        this.dragControl = new DragControls([this.mainObject], this.camera, this.renderer.domElement);
        this.dragControl.transformGroup = true;

        this.dragControl.addEventListener('hoveron', () => {
            this.cameraControl.enabled = false;
        });

        this.dragControl.addEventListener('hoveroff', () => {
            this.cameraControl.enabled = true;
        });

        this.guiControlObject = {
            mainObject: 'cube'
        };

        this.setupGui();

    }

    start() {
        this.prevTimestamp = performance.now();
        requestAnimationFrame(this.loop.bind(this));
    }

    private loop(timestamp: number) {
        const deltaTime = timestamp - this.prevTimestamp;
        this.prevTimestamp = timestamp;

        this.hair.simulateCycle(deltaTime);
        this.renderer.render(this.scene, this.camera);
        requestAnimationFrame(this.loop.bind(this));
    }

    private setupGui() {
        this.gui = new GUI();

        const objFolder = this.gui.addFolder('Main Object');

        objFolder.add(this.guiControlObject, 'mainObject', ['cube', 'sphere', 'plane']).onChange((val: string) => {
            switch (val) {
                case 'cube':
                    this.mainObject.geometry = new BoxGeometry(1, 1, 1);
                    break;
                case 'sphere':
                    this.mainObject.geometry = new SphereGeometry(0.5);
                    break;
                case 'plane':
                    this.mainObject.geometry = new PlaneGeometry();
                    break;
            }
        });
        objFolder.add(this.mainObject.material, 'wireframe');
    }
}