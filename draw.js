import * as bs from "basic-slicer";

let layers;
let layerIdx = 0;
let numLayers;

export function initDraw(num, l) {
    numLayers = num;
    layers = l;
    gameScreen.style.display = "flex";
    resizeCanvas();
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

// this is awful but it's the best way i could find
const container = document.getElementById("canvas-container");
function resizeCanvas() {
    let availableWidth = container.parentElement.clientWidth;
    for (const child of container.parentElement.children) {
        if (child.id !== "canvas-container") {
            availableWidth -= child.offsetWidth;
        }
    }
    if (availableWidth > container.parentElement.clientHeight) {
        container.classList.remove("container-portrait");
        container.classList.add("container-landscape");
    } else {
        container.classList.remove("container-landscape");
        container.classList.add("container-portrait");
    }
}

window.addEventListener("resize", resizeCanvas);

let tool = "brush";
["brush", "erase", "fill"].forEach((t) => document.getElementById(t).addEventListener("mousedown", () => tool = t));

let currPath = [];
canvas.addEventListener("mousemove", (e) => {
    if (tool === "brush") {
        if (e.buttons != 0) {
            currPath.push({ x: transformX(e.clientX), y: transformY(e.clientY) });
        } else {
            currPath = [];
        }
    }
});
canvas.addEventListener("mousedown", (e) => {
    if (tool === "fill") {
        floodfill(Math.round(transformX(e.clientX)), Math.round(transformY(e.clientY)));
    }
});

function mkDataIdx(data, x, y) {
    // red channel
    return 4 * (x + y * data.width);
}

function colorSq(data, x, y) {
    data.data[mkDataIdx(data, x, y)] = 255;
    data.data[mkDataIdx(data, x, y) + 1] = 0;
    data.data[mkDataIdx(data, x, y) + 2] = 0;
    // alpha
    data.data[mkDataIdx(data, x, y) + 3] = 255;
}

function pxIsFilled(origData, x, y) {
    // red channel
    let coord = mkDataIdx(origData, x, y);
    return origData.data[coord] === 255 &&
        origData.data[coord + 1] === 0 &&
        origData.data[coord + 2] === 0 &&
        origData.data[coord + 3] === 255;
}

function floodfill(x, y) {
    const origData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    let seeds = [{ x: x, y: y }];
    while (seeds.length > 0) {
        const seed = seeds.pop();
        if (pxIsFilled(origData, seed.x, seed.y)) {
            continue;
        }
        // scan left
        let xLeft;
        for (xLeft = seed.x; xLeft >= 0; xLeft--) {
            if (!pxIsFilled(origData, xLeft, seed.y)) {
                colorSq(origData, xLeft, seed.y);
            } else {
                break;
            }
        }
        xLeft++;

        // scan right
        let xRight;
        for (xRight = seed.x + 1; xRight < origData.width; xRight++) {
            if (!pxIsFilled(origData, xRight, seed.y)) {
                colorSq(origData, xRight, seed.y);
            } else {
                break;
            }
        }
        xRight--;

        if (seed.y - 1 >= 0) {
            for (let x = xLeft; x <= xRight; x++) {
                if (!pxIsFilled(origData, x, seed.y - 1)) {
                    seeds.push({ x: x, y: seed.y - 1 });
                }
            }
        }
        if (seed.y + 1 < origData.height) {
            for (let x = xLeft; x <= xRight; x++) {
                if (!pxIsFilled(origData, x, seed.y + 1)) {
                    seeds.push({ x: x, y: seed.y + 1 });
                }
            }
        }
    }
    ctx.putImageData(origData, 0, 0);
}

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
    const layerScale = Math.min(layerCanvas.width, layerCanvas.height);
    layerCtx.clearRect(0, 0, layerCanvas.width, layerCanvas.height);

    layerCtx.lineWidth = 4;
    layerCtx.strokeStyle = "black";

    for (let i = 0; i < bs.layer_segments(idx, layers); i++) {
        let segment = bs.get_segment(idx, i, layers)
        layerCtx.beginPath();
        let first = true;
        for (const point of segment) {
            if (first) {
                layerCtx.moveTo(point.x * layerScale, point.y * layerScale);
            } else {
                layerCtx.lineTo(point.x * layerScale, point.y * layerScale);
            }
            first = false;
        }
        layerCtx.closePath();
        layerCtx.stroke();
    }
}

document.getElementById("next-layer").addEventListener("click", () => {
    drawLayer(++layerIdx);
})
