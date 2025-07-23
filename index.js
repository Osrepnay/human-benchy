import * as bs from "basic-slicer";
import { initDraw } from "./draw.js";

const pickerScreen = document.getElementById("picker-screen");

const stlPicker = document.getElementById("stl-picker");

let numLayers = 50;

function startGame(layers) {
    pickerScreen.style.display = "none";
    initDraw(numLayers, layers);
}

stlPicker.addEventListener("change", () => {
    // it can be more than one?
    // this is what mdn says so this is what i'll do
    // if it does weird things i'll fix it later
    if (stlPicker.files.length === 1 && stlPicker.files[0]) {
        const fileReader = new FileReader();
        fileReader.readAsArrayBuffer(stlPicker.files[0]);
        fileReader.addEventListener("loadend", () => {
            const fileArr = new Uint8Array(fileReader.result);
            const layers = bs.buf_to_layers(numLayers, fileArr);
            startGame(layers);
        });
    }
});

function init() {
}

if (document.readyState !== "loading") {
    init();
} else {
    document.addEventListener("DOMContentLoaded", init);
}
