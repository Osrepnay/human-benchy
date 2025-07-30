import * as bs from "basic-slicer";
import { initDraw } from "./draw.js";

const pickerScreen = document.getElementById("picker-screen");
const stlPicker = document.getElementById("stl-picker");
const stlPickerLabel = document.getElementById("stl-picker-label");
const filenameDisplay = document.getElementById("filename");
const numLayersSelector = document.getElementById("num-layers");
const startButton = document.getElementById("start-button");
const useBenchy = document.getElementById("use-benchy");

let numLayers;

function startGame(layers, transform, fileBuf) {
    pickerScreen.style.display = "none";
    initDraw(numLayers, layers, transform, fileBuf);
}

function updatePickerDisabledState() {
    if (useBenchy.checked) {
        stlPicker.disabled = true;
        stlPickerLabel.classList.add("disabled-picker");
    } else {
        stlPicker.disabled = false;
        stlPickerLabel.classList.remove("disabled-picker");
    }
}

function pickerValid() {
    return stlPicker.files.length === 1 && stlPicker.files[0];
}

function updateStartDisabledState() {
    // it can be more than one?
    // this is what mdn says so this is what i'll do
    // if it does weird things i'll fix it later
    startButton.disabled = !(useBenchy.checked || pickerValid());
}

// state persists through reloads
updatePickerDisabledState();
updateStartDisabledState();

useBenchy.addEventListener("change", () => {
    updatePickerDisabledState();
    updateStartDisabledState();
});

function fail(msg) {
    failed.style.display = "block";
    failed.innerHTML = msg;
}

function clearFail() {
    failed.style.display = "none";
    failed.innerHTML = "";
}

function slice(fileArr) {
    clearFail();
    if (!numLayers) {
        fail("Input valid number of layers");
    }
    try {
        const tris = bs.parse_stl(fileArr);
        if (tris) {
            const layers = bs.slice_triangles(numLayers, tris);
            const transform = bs.mk_transform(tris);
            return [layers, transform];
        }
    } catch (error) {
    }
    fail("Couldn't slice file");
    return null;
}

let sliceResult;
let fileBuf;

stlPicker.addEventListener("change", () => {
    clearFail();
    startButton.disabled = true;
    if (pickerValid()) {
        filenameDisplay.innerHTML = "⏳";
        filenameDisplay.classList.add("spin");
        const fileReader = new FileReader();
        fileReader.readAsArrayBuffer(stlPicker.files[0]);
        fileReader.addEventListener("loadend", () => {
            fileBuf = fileReader.result;
            const fileArr = new Uint8Array(fileReader.result);
            sliceResult = slice(fileArr);
            if (sliceResult) {
                startButton.disabled = false;
            }
            filenameDisplay.classList.remove("spin");
            filenameDisplay.innerHTML = stlPicker.files[0].name;
        });
    }
});

function updateNumLayers() {
    numLayers = numLayersSelector.value;
}

updateNumLayers();

numLayersSelector.addEventListener("change", updateNumLayers);

document.getElementById("option-form").addEventListener("submit", async () => {
    clearFail();
    let fileArr;
    if (useBenchy.checked) {
        const resp = await fetch("dist/3DBenchy.stl");
        if (!resp.ok) {
            fail("Couldn't download Benchy");
        } else {
            fileArr = await resp.bytes();
            fileBuf = fileArr.buffer;
            sliceResult = slice(fileArr);
        }
    }
    if (!sliceResult) {
        fail("No valid file provided");
    } else {
        let [layers, transform] = sliceResult;
        console.log(transform.x_offset, transform.y_offset, transform.scale);
        startGame(layers, transform, fileBuf);
    }
});

function init() {
}

if (document.readyState !== "loading") {
    init();
} else {
    document.addEventListener("DOMContentLoaded", init);
}
