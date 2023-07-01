import { parse } from "acorn";
import { generate } from "astring";
import { getAsset, getStrings, processChunk } from "./dissector/web";

const script = await Bun.file(`./files/chunks/2023.js.txt`).text();
const ast = parse(script, {
    ecmaVersion: "latest",
    sourceType: "module",
});
let { requiredChunks, modules, executeModules } = processChunk(ast);

let assets: Record<string, string> = {};
let strings = {};

for (let [id, module] of Object.entries(modules)) {
    if (module === null) continue;

    const asset = getAsset(module);
    if (typeof asset !== "undefined") {
        assets[id] = asset;
        continue;
    }

    let moduleStrings = getStrings(module);
    if (typeof moduleStrings !== "undefined") {
        Object.assign(strings, moduleStrings);
        continue;
    }
}

console.log(
    JSON.stringify(
        {
            requiredChunks,
            executeModules,
            assets,
            strings,
            modules: Object.fromEntries(
                Object.entries(modules).map(([k, v]) => [k, generate(v)])
            ),
        },
        undefined,
        4
    )
);
