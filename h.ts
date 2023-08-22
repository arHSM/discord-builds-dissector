import { parse } from "acorn";
import { simple } from "acorn-walk";
import { generate } from "astring";
import {
    getAsset,
    getExperimentDefinition,
    getStrings,
    processChunk,
} from "./dissector/web";
import { ObjectExpression, Program } from "./types/es2022";

const script = await Bun.file(`./files/chunks/2023.js.txt`).text();

const astStartTime = performance.now();

const ast = parse(script, {
    ecmaVersion: "latest",
    sourceType: "module",
});

const astEndTime = performance.now();
console.log(`Parsed chunk in ${astEndTime - astStartTime}ms`);

const { requiredChunks, modules, executeModules } = processChunk(ast);

const processEndTime = performance.now();
console.log(`Processed chunk in ${processEndTime - astEndTime}ms`);

const assets: Record<string, string> = {};
const strings = {};
const experiments: any[] = [];

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

    simple(module as unknown as any, {
        ObjectExpression(node) {
            const obj = node as unknown as ObjectExpression;
            const definition = getExperimentDefinition(obj);
            if (definition) experiments.push(definition);
        },
    });
}

const resolveEndTime = performance.now();
console.log(`Resolved chunk in ${resolveEndTime - processEndTime}ms`);

await Bun.write(
    "out.json",
    JSON.stringify(
        {
            requiredChunks,
            executeModules,
            assets,
            experiments,
            strings,
            modules: Object.fromEntries(
                Object.entries(modules).map(([k, v]) => [
                    k,
                    generate(
                        v.body.type === "BlockStatement"
                            ? <Program>{ type: "Program", body: v.body.body }
                            : v.body
                    ),
                ])
            ),
        },
        undefined,
        4
    )
);
