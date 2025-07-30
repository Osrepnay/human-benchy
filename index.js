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

function startGame(layers) {
    pickerScreen.style.display = "none";
    initDraw(numLayers, layers);
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
        const layers = bs.buf_to_layers(numLayers, fileArr);
        if (layers) {
            return layers;
        }
    } catch (error) {
    }
    fail("Couldn't slice file");
    return null;
}

let layers;

stlPicker.addEventListener("change", () => {
    clearFail();
    startButton.disabled = true;
    if (pickerValid()) {
        filenameDisplay.innerHTML = "⏳";
        filenameDisplay.classList.add("spin");
        const fileReader = new FileReader();
        fileReader.readAsArrayBuffer(stlPicker.files[0]);
        fileReader.addEventListener("loadend", () => {
            const fileArr = new Uint8Array(fileReader.result);
            layers = slice(fileArr);
            if (layers) {
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
    if (useBenchy.checked) {
        const resp = await fetch("dist/3DBenchy.stl");
        if (!resp.ok) {
            fail("Couldn't download Benchy");
        } else {
            const fileArr = await resp.bytes();
            layers = slice(fileArr);
        }
    }
    if (!layers) {
        fail("No valid file provided");
    } else {
        startGame(layers);
    }
});

function init() {
}

if (document.readyState !== "loading") {
    init();
} else {
    document.addEventListener("DOMContentLoaded", init);
}
