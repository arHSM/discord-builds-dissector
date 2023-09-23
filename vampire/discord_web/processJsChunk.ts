import { parse } from "acorn";
import { full } from "acorn-walk";
import { assets, metadata, webpack } from "../../dissector/discord_web";
import {
    isAssignmentExpression,
    isCallExpression,
    isObjectExpression,
} from "../../dissector/utils";
import { AnyNode } from "../../types/utils";
import { WebManifest } from "./types";

export function processChunk(
    chunkId: string,
    src: string,
    manifest: WebManifest
) {
    const { requiredChunks, modules, executeModules } = webpack.processChunk(
        parse(src, { ecmaVersion: "latest", sourceType: "module" })
    );

    manifest.webpack_chunks[chunkId] = {
        module_dependencies: {}, // TODO
        required_chunks: requiredChunks,
        execute_modules: executeModules,
    };

    for (const [id, module] of Object.entries(modules)) {
        const cdnAsset = assets.getCDNAsset(module);
        if (typeof cdnAsset !== "undefined") {
            manifest.assets.cdn.js.push(cdnAsset);
        }

        const strings = metadata.getStrings(module);

        if (typeof strings !== "undefined") {
            Object.assign(manifest.metadata.strings, strings);
        }

        full(module as unknown as any, acornNode => {
            const node = acornNode as AnyNode;

            if (isCallExpression(node)) {
                const actionType = metadata.getDispatcherActionType(node);
                if (typeof actionType !== "undefined") {
                    manifest.metadata.action_types[actionType.type] ??=
                        actionType.partialProps;
                }

                const svg = assets.getMinfiedJSXSvg(node);
                if (typeof svg !== "undefined") {
                    manifest.assets.minified_jsx_svg.push(svg);
                }

                const lottie = assets.getLottieAsset(node);
                if (typeof lottie !== "undefined") {
                    manifest.assets.lottie.push(lottie);
                }

                const buildNumber =
                    manifest.build.build_number === -1
                        ? undefined
                        : metadata.getBuildNumber(node);
                if (typeof buildNumber !== "undefined") {
                    manifest.build.build_number = buildNumber;
                }
            }

            if (
                isAssignmentExpression(node) ||
                isCallExpression(node) ||
                isObjectExpression(node)
            ) {
                const experimentDefinition =
                    metadata.getExperimentDefinition(node);
                if (typeof experimentDefinition !== "undefined") {
                    manifest.metadata.experiments.push(
                        ...(Array.isArray(experimentDefinition)
                            ? experimentDefinition
                            : [experimentDefinition])
                    );
                }
            }
        });
    }
}

export function processClassNameMappingsChunk(
    src: string,
    manifest: WebManifest
) {}
