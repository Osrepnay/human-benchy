import * as bs from "basic-slicer";
import * as THREE from "three";
import { initDisplay } from "./display.js";
import * as BufferGeometryUtils from "three/addons/utils/BufferGeometryUtils.js";

let layers;
let transform;
let fileBuf;
let layerIdx = 0;
let numLayers;
let totalScale;
let cheatmode = true;
let startTime; 

const timeCounter = document.getElementById("time-counter");
const layerCounter = document.getElementById("layer-counter");
function updateInfoDisplay() {
    const ms = Date.now() - startTime;
    const secs = Math.floor(ms / 1000);
    const decimalPart = ("" + ms % 1000).padEnd(3, "0");
    timeCounter.innerHTML = secs + "." + decimalPart;

    layerCounter.innerHTML = "Layer " + (layerIdx + 1) + "/" + numLayers;
}

function update() {
    updateInfoDisplay();
    window.requestAnimationFrame(update);
}

window.requestAnimationFrame(update);

export function initDraw(num, l, t, f) {
    numLayers = num;
    layers = l;
    transform = t;
    fileBuf = f;
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

    startTime = Date.now();
}

const gameScreen = document.getElementById("game-screen");

const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
let brushWidth;
ctx.lineJoin = "round";
ctx.lineCap = "round";
ctx.strokeStyle = "red";
ctx.fillStyle = "red";

const hoverCanvas = document.getElementById("hover-canvas");
const hoverCtx = hoverCanvas.getContext("2d");
hoverCtx.strokeStyle = "red";
hoverCtx.fillStyle = "red";

const brushSizeInput = document.getElementById("brush-size");
const updateBrushWidth = () => {
    // flip it
    brushWidth = brushSizeInput.value / 500 * canvas.width;
};
updateBrushWidth();
brushSizeInput.addEventListener("change", updateBrushWidth);

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
        if (child.id !== "canvas-container" && child.id !== "info-display") {
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

// bubbles
document.getElementById("canvas-wrapper").addEventListener("pointermove", (e) => {
    hoverCtx.clearRect(0, 0, layerCanvas.width, layerCanvas.height);
    if (tool === "brush") {
        hoverCtx.beginPath();
        hoverCtx.arc(transformX(e.clientX), transformY(e.clientY), brushWidth / 2, 0, 2 * Math.PI);
        hoverCtx.fill();
    }
}, true);

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
        let firstP;
        for (const point of segment) {
            if (first) {
                firstP = point;
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

const v = (x, y) => new THREE.Vector2(x, y);
// square layout (0 is lsb, 3 is msb)
// 0 1
// 2 3
const squares = [
    // 0000
    [],
    // 0001
    [[v(1, 0), v(0, 1)]],
    // 0010
    [[v(1, 0), v(2, 1)]],
    // 0011
    [[v(0, 1), v(2, 1)]],
    // 0100
    [[v(0, 1), v(1, 2)]],
    // 0101
    [[v(1, 0), v(1, 2)]],
    // 0110
    [
        [v(1, 0), v(2, 1)],
        [v(0, 1), v(1, 2)]
    ],
    // 0111
    [[v(2, 1), v(1, 2)]],
    // 1000
    [[v(2, 1), v(1, 2)]],
    // 1001
    [
        [v(1, 0), v(0, 1)],
        [v(2, 1), v(1, 2)]
    ],
    // 1010
    [[v(1, 0), v(1, 2)]],
    // 1011
    [[v(0, 1), v(1, 2)]],
    // 1100
    [[v(0, 1), v(2, 1)]],
    // 1101
    [[v(1, 0), v(2, 1)]],
    // 1110
    [[v(1, 0), v(0, 1)]],
    // 1111
    []
];

function squareContours(imageData, sqTester, topLeftX, topLeftY) {
    const squareBit = (x, y) => {
        if (x < 0 || y < 0 || x >= imageData.width || y >= imageData.height) {
            return 0;
        } else if (sqTester(x, y)) {
            return 1;
        } else {
            return 0;
        }
    };
    const sq0 = squareBit(topLeftX, topLeftY);
    const sq1 = squareBit(topLeftX + 1, topLeftY);
    const sq2 = squareBit(topLeftX, topLeftY + 1);
    const sq3 = squareBit(topLeftX + 1, topLeftY + 1);
    const contours = squares[sq3 * 8 + sq2 * 4 + sq1 * 2 + sq0];
    return contours.map((c) => c.map((vec) => new THREE.Vector2(topLeftX + vec.x / 2, topLeftY + vec.y / 2)));
}

function posMod(x, m) {
    return (x % m + m) % m;
}

// wrapper for rdp_js that does THREE.Vector2/Point2d conversions
function simplifyPoints(points) {
    const point2dPoints = points.map((p) => new bs.Point2d(p.x, p.y));
    return bs.rdp_js(point2dPoints, 0.005).map((p) => new THREE.Vector2(p.x, p.y));
}

const segs = 300;

function polygonate(imageData) {
    const orthoDeltas = [
        { x: 1, y: 0 },
        { x: 0, y: 1 },
        { x: -1, y: 0 },
        { x: 0, y: -1 }
    ];

    let pixelFlags = new Array(imageData.width);
    for (let x = 0; x < pixelFlags.length; x++) {
        pixelFlags[x] = new Array(imageData.height).fill(0);
    }

    let nthShape = 1;
    for (let x = 0; x < imageData.width; x++) {
        for (let y = 0; y < imageData.height; y++) {
            if (pxIsTouched(imageData, x, y) && pixelFlags[x][y] === 0) {
                const mark = (x, y) => {
                    pixelFlags[x][y] = nthShape;
                };
                const check = (x, y) => pixelFlags[x][y] !== 0 || !pxIsTouched(imageData, x, y);
                floodfillGeneric(mark, check, x, y, imageData.width, imageData.height);

                nthShape++;
            }
        }
    }


    let shapes = [];
    for (let shapeIdx = 1; shapeIdx < nthShape; shapeIdx++) {
        const sqTester = (x, y) => pixelFlags[x][y] === shapeIdx;
        let segments = [];
        let segPointMap = new Map();
        // deliberately go off-canvas to get contours on shapes touching the wall
        // TODO mark areas of interst so we don't have to do full screen scan each time
        for (let x = -1; x < imageData.width; x++) {
            for (let y = -1; y < imageData.height; y++) {
                const segment = squareContours(imageData, sqTester, x, y);
                if (segment.length === 0) {
                    continue;
                }

                segment.forEach((s) => {
                    for (let i = 0; i < s.length; i++) {
                        const pt = s[i].x + s[i].y * imageData.width;
                        if (segPointMap.has(pt)) {
                            segPointMap.get(pt).push({
                                "startIdx": i,
                                "segmentsIdx": segments.length
                            });
                        } else {
                            segPointMap.set(pt, [{
                                "startIdx": i,
                                "segmentsIdx": segments.length
                            }]);
                        }
                    }
                    segments.push(s);
                });
            }
        }

        if (segments.length === 0) {
            continue;
        }

        let loops = [];
        let addedSegs = new Set();
        let currLoop = [];
        outer:
        while (addedSegs.size < segments.length) {
            if (currLoop.length === 0) {
                for (let i = 0; i < segments.length; i++) {
                    if (!addedSegs.has(i)) {
                        currLoop = [...segments[i]];
                        addedSegs.add(i);
                        break;
                    }
                }
            }
            let end = currLoop.at(-1);
            if (segPointMap.has(end.x + end.y * imageData.width)) {
                for (const ptData of segPointMap.get(end.x + end.y * imageData.width)) {
                    if (!addedSegs.has(ptData.segmentsIdx)) {
                        addedSegs.add(ptData.segmentsIdx);
                        // all segments only have length of 2
                        // ignore the one at startIdx because that's the one we already have
                        // in currLoop by definition
                        currLoop.push(segments[ptData.segmentsIdx][1 - ptData.startIdx]);

                        if (currLoop.at(-1).x === currLoop[0].x && currLoop.at(-1).y === currLoop[0].y) {
                            for (let pt of currLoop) {
                                pt.x /= imageData.width;
                                pt.y /= imageData.height;
                            }
                            loops.push(currLoop.map((v) => v.multiplyScalar(totalScale)));
                            currLoop = [];
                        }
                        continue outer;
                    }
                }
            }

            // spaghetti
            break;
        }

        // outer boundary must have the highest bounds
        let maxBoundScore = Number.MIN_SAFE_INTEGER;
        let maxBoundIdx = -1;
        for (let i = 0; i < loops.length; i++) {
            let minX = Number.MAX_SAFE_INTEGER;
            let maxX = Number.MIN_SAFE_INTEGER;
            let minY = Number.MAX_SAFE_INTEGER;
            let maxY = Number.MIN_SAFE_INTEGER;
            for (const px of loops[i]) {
                minX = Math.min(minX, px.x);
                maxX = Math.max(maxX, px.x);
                minY = Math.min(minY, px.y);
                maxY = Math.max(maxY, px.y);
            }
            const score = (maxX - minX) + (maxY - minY);
            if (score > maxBoundScore) {
                maxBoundScore = score;
                maxBoundIdx = i;
            }
        }
        const boundaryLoop = loops[maxBoundIdx];
        loops.splice(maxBoundIdx, 1);
        const holeLoops = loops
            .map(simplifyPoints)
            .filter((ps) => ps.length > 2) // rdp simplifies polygons to a line if they're too small
            // TODO SplineCurve rounds corners...
            // .map((ps) => new THREE.SplineCurve(ps));
            .map((ps) => new THREE.Path(ps));

        console.assert(boundaryLoop && holeLoops.every((h) => h), "failed to loop shape");

        // horrible hack
        // let shape = new THREE.Shape(new THREE.SplineCurve(simplifyPoints(boundaryLoop)).getPoints(segs));
        let shape = new THREE.Shape(simplifyPoints(boundaryLoop));
        shape.holes = holeLoops;
        if (shape) shapes.push(shape);
    }
    return shapes;
}

let allGeometries = [];
let currHeight = 0;
document.getElementById("next-layer").addEventListener("click", () => {
    lastPoint = null;
    let shapes = polygonate(ctx.getImageData(0, 0, canvas.width, canvas.height));
    if (!shapes) {
        return;
    }
    const height = bs.get_layer_height(layerIdx, layers) * totalScale;
    for (const shape of shapes) {
        const geo = new THREE.ExtrudeGeometry([shape], {
                depth: height,
                bevelEnabled: false,
                curveSegments: segs,
            })
            .translate(0, 0, currHeight);
        allGeometries.push(geo);
    }
    currHeight += height;
    if (layerIdx >= numLayers - 1) {
        bs.release_layers(layers);

        gameScreen.style.display = "none";
        const center = new THREE.Vector3(0.5 * totalScale, 0.5 * totalScale, height * numLayers / 2);
        let finalGeometry = BufferGeometryUtils.mergeVertices(
            BufferGeometryUtils.mergeGeometries(allGeometries, false)
        );
        finalGeometry.computeVertexNormals();
        initDisplay(center, totalScale, finalGeometry, transform, fileBuf);
    } else {
        drawLayer(++layerIdx);
        console.log("layer", layerIdx);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        if (cheatmode) {
            drawLayerCheat(layerIdx);
        }
    }
});
