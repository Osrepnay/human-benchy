import * as THREE from "three";

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, 1, 0.01, 1000);
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
    let light = new THREE.DirectionalLight(0xffffff, 1);
    light.position.set(1, 1, 1);
    light.target.position.set(0.5, 0.5, 0.5);
    scene.add(light);
    scene.add(new THREE.AmbientLight(0xffffff, 0.3));
    for (const geometry of geometries) {
        const material = new THREE.MeshPhongMaterial({ color: 0xff0000 });
        const mesh = new THREE.Mesh(geometry, material);
        scene.add(mesh);
    }
    const centerDist = 2;
    const coordDelta = centerDist / Math.sqrt(3);
    camera.position.x = 0.5 + coordDelta;
    camera.position.y = 0.5 - coordDelta;
    camera.position.z = 0.5 + coordDelta;
    camera.lookAt(0.5, 0.5, 0.5);
    renderer.setSize(renderCanvas.width, renderCanvas.height);
    renderer.setAnimationLoop(() => renderer.render(scene, camera));
}
