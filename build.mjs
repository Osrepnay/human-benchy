import * as esbuild from "esbuild"
import { wasmLoader } from "esbuild-plugin-wasm"

await esbuild.build({
    entryPoints: ["index.js"],
    bundle: true,
    format: "esm",
    outdir: "dist",
    plugins: [wasmLoader()],
    logLevel: "info",
});
