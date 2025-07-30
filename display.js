import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";

const scene = new THREE.Scene();
const trueScene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(60, 1, 0.01, 1000);
// reorient z to up-down
camera.up = new THREE.Vector3(0, 0, 1);
const displayScreen = document.getElementById("display-screen");
const renderCanvas = document.getElementById("renderer");
const trueRenderCanvas = document.getElementById("true-renderer");

export function initDisplay(center, geometries, transform, fileBuf) {
    displayScreen.style.display = "flex";
    let renderer = new THREE.WebGLRenderer({
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
    const centerDist = 1.5;
    const coordDelta = centerDist / Math.sqrt(3);
    camera.position.x = center.x + coordDelta;
    camera.position.y = center.x - coordDelta;
    camera.position.z = center.x + coordDelta;
    camera.lookAt(center);

    let controls = new OrbitControls(camera, renderer.domElement);
    controls.target = center;
    controls.update();

    renderer.setSize(renderCanvas.width, renderCanvas.height);
    renderer.setAnimationLoop(() => renderer.render(scene, camera));

    const loader = new STLLoader();
    const original = loader.parse(fileBuf);
    original.scale(transform.scale, transform.scale, transform.scale);
    original.translate(transform.x_offset, transform.y_offset, 0);

    let trueRenderer = new THREE.WebGLRenderer({
        canvas: trueRenderCanvas
    });
    trueScene.add(light1.clone());
    trueScene.add(light2.clone());
    trueScene.add(new THREE.AmbientLight(0xffffff, 0.5));
    const material = new THREE.MeshPhongMaterial({ color: 0xff0000 });
    material.side = THREE.DoubleSide;
    const mesh = new THREE.Mesh(original, material);
    trueScene.add(mesh);
    let trueControls = new OrbitControls(camera, trueRenderer.domElement);
    trueControls.target = center;
    trueControls.update();

    trueRenderer.setSize(renderCanvas.width, renderCanvas.height);
    trueRenderer.setAnimationLoop(() => trueRenderer.render(trueScene, camera));
}
