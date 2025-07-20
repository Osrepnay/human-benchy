import * as bs from "basic-slicer";
import * as THREE from "three";
import { initDisplay } from "./display.js";

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
            // hack to make it draw even if you just click without dragging
            if (currPath.length === 0) {
                currPath.push({ x: transformX(e.clientX), y: transformY(e.clientY) });
            }
            currPath.push({ x: transformX(e.clientX), y: transformY(e.clientY) });
        } else {
            currPath = [];
        }
    }
});
canvas.addEventListener("mousedown", (e) => {
    console.log(transformX(e.clientX), transformY(e.clientY));
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

function loopPoints(imageData, points) {
    const deltas = [
        { x: 1, y: 1 },
        { x: -1, y: -1 },
        { x: 1, y: -1 },
        { x: -1, y: 1 },
        { x: 1, y: 0 },
        { x: 0, y: 1 },
        { x: -1, y: 0 },
        { x: 0, y: -1 }
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
    // scan unfilled sections to determine whether they are
    // 1. free/normal (sees image border) or
    // 2. a hole
    // 3. boundary of filled
    let pixelFlags = new Array(imageData.width);
    for (let x = 0; x < pixelFlags.length; x++) {
        pixelFlags[x] = new Array(imageData.height).fill(0);
    }
    // each unfilled section gets its own identifier
    let nthUnfilled = 1;
    // hole boundaries can overlap so we can't rely on pixelFlags for this
    // not sure if normal outer boundaries have a similar problem
    // not obviously so far
    let allHoles = [];
    for (let x = 0; x < imageData.width; x++) {
        for (let y = 0; y < imageData.height; y++) {
            if (!pxIsTouched(imageData, x, y) && pixelFlags[x][y] === 0) {
                let isHole = true;
                // points that 
                let contacts = [];
                let mark = (x, y) => {
                    // boundary pixel
                    if (x === 0 || y === 0 || x === imageData.width - 1 || y === imageData.height - 1) {
                        isHole = false;
                    }
                    pixelFlags[x][y] = nthUnfilled;
                };
                let check = (x, y) => {
                    let touched = pxIsTouched(imageData, x, y);
                    let visited = pixelFlags[x][y] === nthUnfilled;
                    if (touched && !visited) {
                        contacts.push({ x: x, y: y });
                    }
                    return touched || visited;
                };
                floodfillGeneric(mark, check, x, y, imageData.width, imageData.height);
                if (isHole) {
                    let hole = new Set();
                    contacts.forEach((pt) => {
                        pixelFlags[pt.x][pt.y] = -2;
                        hole.add(pt.x + pt.y * imageData.width);
                    });
                    allHoles.push(hole);
                } else {
                    contacts.forEach((pt) => {
                        pixelFlags[pt.x][pt.y] = -1;
                    });
                }
                nthUnfilled++;
            }
        }
    }
    // edge case: manually mark all touched that are next to the wall as boundaries
    for (let x = 0; x < imageData.width; x++) {
        if (pxIsTouched(imageData, x, 0)) pixelFlags[x][0] = -1;
        if (pxIsTouched(imageData, x, imageData.height - 1)) pixelFlags[x][imageData.height - 1] = -1;
    }
    for (let y = 0; y < imageData.height; y++) {
        if (pxIsTouched(imageData, 0, y)) pixelFlags[0][y] = -1;
        if (pxIsTouched(imageData, imageData.width - 1, y)) pixelFlags[imageData.width - 1][y] = -1;
    }

    // TODO fix adjacent hole/boundary handling
    // (holes with shared boundaries)
    // everything being in a single pixelFlags really limits reasonable options
    // i wanna get it working first

    // check filled sections to find boundaries
    // this code breaks if the boundaries branch
    // but that would require like a 1px wide line
    // which is kinda hard to do normally
    let shapes = [];
    for (let x = 0; x < imageData.width; x++) {
        for (let y = 0; y < imageData.height; y++) {
            if (pxIsTouched(imageData, x, y) && pixelFlags[x][y] !== -3) {
                let boundary = new Set();
                let holes = [];
                let marked = 0;
                let mark = (x, y) => {
                    marked++;
                    if (pixelFlags[x][y] == -1) {
                        boundary.add(x + y * imageData.width);
                    } else if (pixelFlags[x][y] == -2) {
                        for (let i = 0; i < allHoles.length; i++) {
                            if (allHoles[i].has(x + y * imageData.width)) {
                                holes.push(allHoles[i]);
                                allHoles.splice(i, 1);
                            }
                        }
                    }
                    pixelFlags[x][y] = -3;
                };
                let check = (x, y) => !pxIsTouched(imageData, x, y) || pixelFlags[x][y] === -3;
                floodfillGeneric(mark, check, x, y, imageData.width, imageData.height);

                // make the shape
                let boundaryLoop = loopPoints(imageData, boundary);
                let holeLoops = holes.map((hole) => {
                    let looped = loopPoints(imageData, hole);
                    if (!looped) {
                        return null;
                    }
                    return new THREE.Path(looped);
                });
                // error handling! how uncharacteristic!
                if (boundaryLoop && holeLoops.every((h) => h)) {
                    let shape = new THREE.Shape(boundaryLoop);
                    shape.holes = holeLoops;
                    if (shape) shapes.push(shape);
                }
            }
        }
    }
    return shapes;

}

let allGeometries = [];
document.getElementById("next-layer").addEventListener("click", () => {
    let shapes = polygonate(ctx.getImageData(0, 0, canvas.width, canvas.height));
    const layerHeight = 1 / (numLayers - 1);
    for (const shape of shapes) {
        const geo = new THREE.ExtrudeGeometry([shape], {
                depth: layerHeight,
                bevelEnabled: false
            })
            .translate(0, 0, layerIdx * layerHeight);
        allGeometries.push(geo);
    }
    if (layerIdx === numLayers - 1) {
        gameScreen.style.display = "none";
        initDisplay(allGeometries);
    } else {
        drawLayer(++layerIdx);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
});
