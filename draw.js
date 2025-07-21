import * as bs from "basic-slicer";
import * as THREE from "three";
import { initDisplay } from "./display.js";

let layers;
let layerIdx = 0;
let numLayers;
let totalScale;
let cheatmode = true;

export function initDraw(num, l) {
    numLayers = num;
    layers = l;
    const totalHeight = bs.total_height(layers);
    if (totalHeight > 1) {
        totalScale = 1 / totalHeight; 
    } else {
        totalScale = 1;
    }
    console.log(totalHeight);
    gameScreen.style.display = "flex";
    resizeCanvas();
    drawLayer(layerIdx);
    if (cheatmode) {
        drawLayerCheat(layerIdx);
    }
}

const gameScreen = document.getElementById("game-screen");

const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
let brushWidth = canvas.width / 50;
ctx.lineJoin = "round";
ctx.lineCap = "round";
ctx.strokeStyle = "red";
ctx.fillStyle = "red";
ctx.lineWidth = brushWidth;

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
["brush", "fill"].forEach((t) => document.getElementById(t).addEventListener("click", () => tool = t));

document.getElementById("reset-layer").addEventListener("click", () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
});

document.addEventListener("keydown", (e) => {
    if (e.key === "b") {
        tool = "brush";
    } else if (e.key === "f") {
        tool = "fill";
    } else if (e.key === "Enter" && gameScreen.style.display !== "none") {
        document.getElementById("next-layer").click();
    }
});

let lastPoint = null;
canvas.addEventListener("pointermove", (e) => {
    if (tool === "brush") {
        if (e.buttons != 0) {
            const point = { x: transformX(e.clientX), y: transformY(e.clientY) };

            if (!lastPoint) {
                lastPoint = point;
            }
            ctx.lineWidth = brushWidth;
            ctx.moveTo(lastPoint.x, lastPoint.y);
            ctx.beginPath();
            ctx.lineTo(point.x, point.y);
            // why is this needed???
            ctx.lineTo(lastPoint.x, lastPoint.y);
            ctx.closePath();
            ctx.stroke();

            lastPoint = point;
        } else {
            lastPoint = null;
        }
    }
});
canvas.addEventListener("pointerdown", (e) => {
    console.log(transformX(e.clientX), transformY(e.clientY));
    if (tool === "fill") {
        floodfill(Math.round(transformX(e.clientX)), Math.round(transformY(e.clientY)));
    } else if (tool === "brush") {
        const point = { x: transformX(e.clientX), y: transformY(e.clientY) };
        lastPoint = point;
        ctx.lineWidth = brushWidth;
        ctx.beginPath();
        ctx.arc(point.x, point.y, brushWidth / 2, 0, 2 * Math.PI);
        ctx.closePath();
        ctx.fill();
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

function pxIsTouched(origData, x, y) {
    let coord = mkDataIdx(origData, x, y);
    return origData.data[coord] !== 0 ||
        origData.data[coord + 1] !== 0 ||
        origData.data[coord + 2] !== 0 ||
        origData.data[coord + 3] !== 0;
}
// need to do a lot of weird shit with floodfill
function floodfillGeneric(mark, check, x, y, width, height) {
    let seeds = [{ x: x, y: y }];
    while (seeds.length > 0) {
        const seed = seeds.pop();
        if (check(seed.x, seed.y)) {
            continue;
        }
        // scan left
        let xLeft;
        for (xLeft = seed.x; xLeft >= 0; xLeft--) {
            if (!check(xLeft, seed.y)) {
                mark(xLeft, seed.y);
            } else {
                break;
            }
        }
        xLeft++;

        // scan right
        let xRight;
        for (xRight = seed.x + 1; xRight < width; xRight++) {
            if (!check(xRight, seed.y)) {
                mark(xRight, seed.y);
            } else {
                break;
            }
        }
        xRight--;

        if (seed.y - 1 >= 0) {
            for (let x = xLeft; x <= xRight; x++) {
                if (!check(x, seed.y - 1)) {
                    seeds.push({ x: x, y: seed.y - 1 });
                }
            }
        }
        if (seed.y + 1 < height) {
            for (let x = xLeft; x <= xRight; x++) {
                if (!check(x, seed.y + 1)) {
                    seeds.push({ x: x, y: seed.y + 1 });
                }
            }
        }
    }
}

function floodfill(startX, startY) {
    const origData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    let mark = (x, y) => colorSq(origData, x, y);
    let check = (x, y) => pxIsFilled(origData, x, y);
    floodfillGeneric(mark, check, startX, startY, origData.width, origData.height);
    ctx.putImageData(origData, 0, 0);
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

function drawLayerCheat(idx) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.lineWidth = 4;
    ctx.strokeStyle = "red";

    for (let i = 0; i < bs.layer_segments(idx, layers); i++) {
        let segment = bs.get_segment(idx, i, layers)
        ctx.beginPath();
        let first = true;
        for (const point of segment) {
            if (first) {
                ctx.moveTo(point.x * scale, point.y * scale);
            } else {
                ctx.lineTo(point.x * scale, point.y * scale);
            }
            first = false;
        }
        ctx.closePath();
        ctx.stroke();
    }
}

function loopPoints(imageData, points) {
    // nasty detail:
    // orthogonal deltas have to be ordered first
    // to properly deal with square corners
    const deltas = [
        { x: 1, y: 0 },
        { x: 0, y: 1 },
        { x: -1, y: 0 },
        { x: 0, y: -1 },
        { x: 1, y: 1 },
        { x: -1, y: -1 },
        { x: 1, y: -1 },
        { x: -1, y: 1 }
    ];
    
    let path = [];
    let visited = new Set();
    let point = points.values().next().value;
    const firstPoint = point;
    path.push(new THREE.Vector2((point % imageData.width) / imageData.width, point / imageData.height / imageData.height));
    visited.add(point);

    outer:
    while (visited.size < points.size) {
        for (const delta of deltas) {
            let flatDelta = delta.x + delta.y * imageData.width;
            let newPoint = point + flatDelta;
            if (points.has(newPoint) && !visited.has(newPoint)) {
                visited.add(newPoint);
                point = newPoint;
                path.push(new THREE.Vector2((point % imageData.width) / imageData.width,
                        point / imageData.height / imageData.height));
                continue outer;
            }
        }
        break;
    }

    let loops = false;
    for (const delta of deltas) {
        let flatDelta = delta.x + delta.y * imageData.width;
        if (point + flatDelta == firstPoint) {
            loops = true;
            break;
        }
    }

    if (!loops) {
        return null;
    }

    path.push(new THREE.Vector2((firstPoint % imageData.width) / imageData.width,
            firstPoint / imageData.height / imageData.height));
    return path;
}

function polygonate(imageData) {
    const pxOnCanvasEdge = (x, y) => {
        return x === 0 ||
            y === 0 ||
            x == imageData.width - 1 ||
            y == imageData.height - 1;
    };

    let pixelFlags = new Array(imageData.width);
    for (let x = 0; x < pixelFlags.length; x++) {
        pixelFlags[x] = new Array(imageData.height).fill(0);
    }

    let shapes = [];
    const deltas = [
        { x: 1, y: 0 },
        { x: 0, y: 1 },
        { x: -1, y: 0 },
        { x: 0, y: -1 }
    ];
    let nthShape = 1;
    for (let x = 0; x < imageData.width; x++) {
        for (let y = 0; y < imageData.height; y++) {
            if (pxIsTouched(imageData, x, y) && pixelFlags[x][y] === 0) {
                let shell = new Set();
                const mark = (x, y) => {
                    pixelFlags[x][y] = nthShape;
                };
                const check = (x, y) => {
                    if (!pxIsTouched(imageData, x, y)) {
                        shell.add(x + y * imageData.width);
                        return true;
                    } else {
                        return pixelFlags[x][y] !== 0;
                    }
                };
                floodfillGeneric(mark, check, x, y, imageData.width, imageData.height);

                let outerBoundary = null;
                let holes = [];
                while (shell.size > 0) {
                    const shellPt = shell.values().next().value; 
                    const shellPtX = shellPt % imageData.width;
                    const shellPtY = Math.floor(shellPt / imageData.width);
                    let isOuter = false;
                    // can't put this in pixelFlags because multiple shapes will probably
                    // end up searching the same space
                    let searched = new Set();
                    let touchingShape = new Set();

                    const outerMark = (x, y) => {
                        shell.delete(x + y * imageData.width);
                        return searched.add(x + y * imageData.width);
                    };
                    const outerCheck = (x, y) => {
                        // this shell can "see" the canvas edge (ignoring other shapes),
                        // so it must be an outer boundary
                        if (pxOnCanvasEdge(x, y)) {
                            isOuter = true;
                        }
                        if (pixelFlags[x][y] === nthShape) {
                            touchingShape.add(x + y * imageData.width);
                            return true;
                        } else {
                            return searched.has(x + y * imageData.width);
                        }
                    };
                    floodfillGeneric(outerMark, outerCheck, shellPtX, shellPtY, imageData.width, imageData.height);

                    if (isOuter) {
                        console.assert(!outerBoundary, "duplicate boundaries found for shape");
                        // edge case: manually mark all touched that are next to the wall as boundaries
                        for (let x = 0; x < imageData.width; x++) {
                            if (pxIsTouched(imageData, x, 0)) {
                                touchingShape.add(x + 0 * imageData.width);
                            }
                            if (pxIsTouched(imageData, x, imageData.height - 1)) {
                                touchingShape.add(x + (imageData.height - 1) * imageData.width);
                            }
                        }
                        for (let y = 0; y < imageData.height; y++) {
                            if (pxIsTouched(imageData, 0, y)) {
                                touchingShape.add(0 + y * imageData.width);
                            }
                            if (pxIsTouched(imageData, imageData.width - 1, y)) {
                                touchingShape.add(imageData.width - 1 + y * imageData.width);
                            }
                        }
                        outerBoundary = touchingShape;
                    } else {
                        holes.push(touchingShape);
                    }
                }

                // make the shape
                let boundaryLoop = loopPoints(imageData, outerBoundary);
                let holeLoops = holes.map((hole) => {
                    let looped = loopPoints(imageData, hole);
                    if (!looped) {
                        return null;
                    }
                    return new THREE.Path(looped);
                });
                // error handling! how uncharacteristic!
                if (boundaryLoop && holeLoops.every((h) => h)) {
                    console.log("found shape");
                    let shape = new THREE.Shape(boundaryLoop);
                    shape.scale = new THREE.Vector3(totalScale, totalScale, totalScale);
                    shape.holes = holeLoops;
                    if (shape) shapes.push(shape);
                } else {
                    console.log("failed to loop shape", boundaryLoop, holeLoops);
                }

                nthShape++;
            }
        }
    }
    return shapes;
}

let allGeometries = [];
let currHeight = 0;
document.getElementById("next-layer").addEventListener("click", () => {
    lastPoint = null;
    let shapes = polygonate(ctx.getImageData(0, 0, canvas.width, canvas.height));
    const height = bs.get_layer_height(layerIdx, layers) * totalScale;
    for (const shape of shapes) {
        const geo = new THREE.ExtrudeGeometry([shape], {
                depth: height,
                bevelEnabled: false
            })
            .translate(0, 0, currHeight);
        allGeometries.push(geo);
    }
    currHeight += height;
    if (layerIdx >= numLayers - 1) {
        gameScreen.style.display = "none";
        initDisplay(allGeometries);
    } else {
        drawLayer(++layerIdx);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        if (cheatmode) {
            drawLayerCheat(layerIdx);
        }
    }
});
