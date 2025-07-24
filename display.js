import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(60, 1, 0.01, 1000);
// reorient z to up-down
camera.up = new THREE.Vector3(0, 0, 1);
const displayScreen = document.getElementById("display-screen");
const renderCanvas = document.getElementById("renderer");
let renderer;

export function initDisplay(geometries) {
    displayScreen.style.display = "flex";
    renderer = new THREE.WebGLRenderer({
        canvas: renderCanvas
    });
    let light1 = new THREE.PointLight(0xffffff, 20);
    light1.position.set(2, 2, 2);
    scene.add(light1);
    let light2 = new THREE.PointLight(0xffffff, 10);
    light2.position.set(-2, -2, 1.1);
    scene.add(light2);
    scene.add(new THREE.AmbientLight(0xffffff, 0.5));
    for (const geometry of geometries) {
        const material = new THREE.MeshPhongMaterial({ color: 0xff0000 });
        material.side = THREE.DoubleSide;
        const mesh = new THREE.Mesh(geometry, material);
        scene.add(mesh);
    }
    const centerDist = 2;
    const coordDelta = centerDist / Math.sqrt(3);
    camera.position.x = 0.5 + coordDelta;
    camera.position.y = 0.5 - coordDelta;
    camera.position.z = 0.5 + coordDelta;
    camera.lookAt(0.5, 0.5, 0.5);

    let controls = new OrbitControls(camera, renderer.domElement);
    controls.target = new THREE.Vector3(0.5, 0.5, 0.5);

    renderer.setSize(renderCanvas.width, renderCanvas.height);
    renderer.setAnimationLoop(() => renderer.render(scene, camera));
}
