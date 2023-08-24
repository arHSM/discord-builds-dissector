import { parse } from "acorn";
import { full } from "acorn-walk";
import { generate } from "astring";
import {
    isAssignmentExpression,
    isCallExpression,
    isObjectExpression,
} from "./dissector/utils";
import {
    ExperimentDefinition,
    getAsset,
    getExperimentDefinition,
    getStrings,
    processChunk,
} from "./dissector/web";
import { Program } from "./types/es2022";
import { AnyNode } from "./types/utils";

const script = await Bun.file(`./files/chunks/2021.js.txt`).text();

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
const strings: Record<string, string> = {};
const experiments: ExperimentDefinition[] = [];

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

    full(module as unknown as any, acornNode => {
        const node = acornNode as unknown as AnyNode;
        if (
            isAssignmentExpression(node) ||
            isCallExpression(node) ||
            isObjectExpression(node)
        ) {
            const definition = getExperimentDefinition(node);
            if (typeof definition !== "undefined")
                experiments.push(
                    ...(Array.isArray(definition) ? definition : [definition])
                );
        }
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
