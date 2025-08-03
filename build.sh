#!/bin/sh

set -e

mkdir -p site/dist
cd basic-slicer
wasm-pack build
cd ..
# it really shouldn't change so we don't need to check timestamps or w/e
if [ ! -f site/dist/3DBenchy.stl ]; then
    curl https://files.printables.com/media/prints/3161/stls/123914_1f1d8ca1-252a-4770-846f-52f1208d193d/3dbenchy.stl -o site/dist/3DBenchy.stl
fi
node build.mjs
