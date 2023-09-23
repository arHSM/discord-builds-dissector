import { parse } from "acorn";
import { full } from "acorn-walk";

import { assets, metadata, webpack } from "./dissector/discord_web";
import {
    isAssignmentExpression,
    isCallExpression,
    isObjectExpression,
} from "./dissector/utils";
import { AnyNode } from "./types/utils";

// prettier-ignore
const script = await Bun.file(`./files/discord_web/mainChunks/2023.js.txt`).text();
// const script = await fetch("https://canary.discord.com/assets/619454966c65dd6c8d2b.js").then(r => r.text());

const ast = parse(script, {
    ecmaVersion: "latest",
    sourceType: "module",
});

const { requiredChunks, modules, executeModules } = webpack.processChunk(ast);

/*
const classNameMappings: Record<string, string> = {};

for (const module of Object.values(modules)) {
    const mappings = getClassNameMappings(module);

    if (typeof mappings !== "undefined") {
        Object.assign(classNameMappings, mappings);
    }
}

console.log(classNameMappings);
*/

// assets
const cdnAssets: Record<string, string> = {};
const minifiedJSXSVGAssets: assets.ReactElement[] = [];
const lottieAssets: Record<string, any> = {};

// metadata
const experiments: metadata.ExperimentDefinition[] = [];
const actionTypes: Record<string, metadata.ActionType["partialProps"]> = {};
const strings: Record<string, string> = {};

let modulesCount = 0;

for (const [id, module] of Object.entries(modules)) {
    modulesCount++;

    const asset = assets.getCDNAsset(module);
    if (typeof asset !== "undefined") {
        cdnAssets[id] = asset;
        continue;
    }

    let moduleStrings = metadata.getStrings(module);
    if (typeof moduleStrings !== "undefined") {
        Object.assign(strings, moduleStrings);
        continue;
    }

    full(module as unknown as any, acornNode => {
        const node = acornNode as unknown as AnyNode;

        if (isCallExpression(node)) {
            const actionType = metadata.getDispatcherActionType(node);
            if (typeof actionType !== "undefined") {
                actionTypes[actionType.type] ??= actionType.partialProps;
            }

            const svg = assets.getMinfiedJSXSvg(node);
            if (typeof svg !== "undefined") {
                minifiedJSXSVGAssets.push(svg);
            }

            const lottie = assets.getLottieAsset(node);
            if (typeof lottie !== "undefined") {
                lottieAssets[lottie.nm] = lottie;
            }

            const buildNumber = metadata.getBuildNumber(node);
            if (typeof buildNumber !== "undefined") {
                console.log(buildNumber);
            }
        }

        if (
            isAssignmentExpression(node) ||
            isCallExpression(node) ||
            isObjectExpression(node)
        ) {
            const experimentDefinition = metadata.getExperimentDefinition(node);
            if (typeof experimentDefinition !== "undefined") {
                experiments.push(
                    ...(Array.isArray(experimentDefinition)
                        ? experimentDefinition
                        : [experimentDefinition])
                );
            }
        }
    });
}

const out = {
    assets: {
        cdn: cdnAssets,
        minified_jsx_svg: minifiedJSXSVGAssets,
        lottie: lottieAssets,
    },
    metadata: {
        experiments,
        action_types: actionTypes,
        strings,
    },
    webpack: {
        modules_count: modulesCount,
        required_chunks: requiredChunks,
        execute_modules: executeModules,
    },
};

await Bun.write("out.json", JSON.stringify(out, undefined, 2));
