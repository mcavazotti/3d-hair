import { Vector2 } from "three";
import { StatsEnvironment } from "../core/stats-environment";

export class PopUp {
    private dialog: HTMLDialogElement;
    private stats: StatsEnvironment;
    private header: HTMLDivElement;
    private clicked: boolean = false;
    private clickPos?: Vector2;
    private headerInitialPos?: Vector2;
    constructor(onClose: Function) {
        this.dialog = document.createElement('dialog');
        this.dialog.setAttribute('open', 'true');
        this.dialog.setAttribute('style', 'position: absolute; top:50px; border-width: thin; padding:0;');
        this.dialog.setAttribute('class', 'lil-gui');
        this.dialog.innerHTML = `
        <div id="popup-header" class="title popup"><button style="width:20px">x</button></div>
        <div id="popup-body" style="padding:8px; background-color:white"></div>
        `;
        document.body.append(this.dialog);
        this.stats = new StatsEnvironment(document.getElementById('popup-body')!);
        this.header = document.getElementById('popup-header')! as HTMLDivElement;

        this.dialog.addEventListener('mousedown', (event) => {
            this.clicked = event.button == 0;
            this.clickPos = new Vector2(event.clientX, event.clientY);
            this.headerInitialPos = new Vector2(this.dialog.offsetLeft, this.dialog.offsetTop);
        });
        this.dialog.addEventListener('touchstart', (event) => {
            this.clicked = event.touches.length == 1;
            this.clickPos = new Vector2(event.touches[0].clientX, event.touches[0].clientY);
            this.headerInitialPos = new Vector2(this.dialog.offsetLeft, this.dialog.offsetTop);
        });
        this.dialog.addEventListener('mouseup', () => {
            this.clicked = false;
            this.clickPos = undefined;
            this.headerInitialPos = undefined;
        });
        this.dialog.addEventListener('touchend', () => {
            this.clicked = false;
            this.clickPos = undefined;
            this.headerInitialPos = undefined;
        });

        this.dialog.addEventListener('mousemove', (event) => {
            if (this.clicked) {
                // console.log(event)
                const x = (this.headerInitialPos!.x + event.clientX - this.clickPos!.x);
                const y = (this.headerInitialPos!.y + (event.clientY - this.clickPos!.y));
                console.log(x, y);

                this.dialog.style.left = x + 'px';
                this.dialog.style.top = y + 'px';
            }
        });
        this.dialog.addEventListener('touchmove', (event) => {
            if (this.clicked && event.touches.length == 1) {
                // console.log(event)
                const x = (this.headerInitialPos!.x + event.touches[0].clientX - this.clickPos!.x);
                const y = (this.headerInitialPos!.y + (event.touches[0].clientY - this.clickPos!.y));
                console.log(x, y);

                this.dialog.style.left = x + 'px';
                this.dialog.style.top = y + 'px';
            }
        });
        this.dialog.addEventListener('mouseleave', () => {
            this.clicked = false;
            this.clickPos = undefined;
        });

        const button = this.header.getElementsByTagName('button')[0];
        button.addEventListener('click', () => {
            this.dialog.remove();
            onClose();
        })
    }

    getStatsEnv() {
        return this.stats;
    }
}