import * as bs from "basic-slicer";

let layers;

export function initDraw(l) {
    layers = l;
    gameScreen.style.display = "flex";
    resizeCanvas();
    let layerIdx = 0;
    drawLayer(layerIdx);
    drawUserLine();
}

const gameScreen = document.getElementById("game-screen");

const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
ctx.lineJoin = "round";
ctx.lineCap = "round";

// for drawing the slice
const layerCanvas = document.getElementById("layer-canvas");
const layerCtx = layerCanvas.getContext("2d");

const scale = Math.min(canvas.width, canvas.height);

function transformX(clientX) {
    let {x, _y, width, _height} = canvas.getBoundingClientRect();
    return (clientX - x) * scale / width;
}

function transformY(clientY) {
    let {_x, y, _width, height} = canvas.getBoundingClientRect();
    return (clientY - y) * scale / height;
}

const wrapper = document.getElementById("canvas-wrapper");
function resizeCanvas() {
    console.log(wrapper.parentElement.clientWidth + " " + wrapper.parentElement.clientHeight);
    // landscape
    if (wrapper.parentElement.clientWidth > wrapper.parentElement.clientHeight) {
        wrapper.classList.remove("wrapper-portrait");
        wrapper.classList.add("wrapper-landscape");
    } else {
        wrapper.classList.remove("wrapper-landscape");
        wrapper.classList.add("wrapper-portrait");
    }
}

window.addEventListener("resize", resizeCanvas);

let currPath = [];
let drawing = false;
canvas.addEventListener("mousemove", (e) => {
    if (e.buttons != 0) {
        currPath.push({ x: transformX(e.clientX), y: transformY(e.clientY) });
    } else {
        currPath = [];
    }
});

let brushWidth = canvas.width / 50;
// draw user-drawn line
function drawUserLine() {
    const cb = () => {
        if (currPath.length > 0) {
            ctx.strokeStyle = "red";
            ctx.fillStyle = "red";
            ctx.lineWidth = brushWidth;
            if (currPath.length > 1) {
                ctx.beginPath();
                ctx.moveTo(currPath[0].x, currPath[0].y);
                for (let i = 1; i < currPath.length; i++) {
                    ctx.lineTo(currPath[i].x, currPath[i].y);
                }
                ctx.stroke();
            }

            currPath = [currPath[currPath.length -1]];
        }
        window.requestAnimationFrame(cb);
    };
    window.requestAnimationFrame(cb);
}

function drawLayer(idx) {
    layerCtx.clearRect(0, 0, layerCanvas.width, layerCanvas.height);

    layerCtx.lineWidth = 2;
    layerCtx.strokeStyle = "black";

    for (let i = 0; i < bs.layer_segments(idx, layers); i++) {
        let segment = bs.get_segment(idx, i, layers)
        layerCtx.beginPath();
        let first = true;
        for (const point of segment) {
            if (first) {
                layerCtx.moveTo(point.x * scale, point.y * scale);
            } else {
                layerCtx.lineTo(point.x * scale, point.y * scale);
            }
            first = false;
        }
        layerCtx.closePath();
        layerCtx.stroke();
    }
}
