import { html, webpack } from "../../dissector/discord_web";
import { WebManifest } from "./types";

export async function dissect() {
    const [buildId, { globalEnv, stylesheet, surfaceChunks }] = await fetch(
        "https://canary.discord.com/app"
    ).then(async r => {
        const buildId = r.headers.get("X-Build-Id") || undefined;

        return [
            buildId,
            html.processHtml(await r.text(), true, true, buildId),
        ] as [string, ReturnType<typeof html.processHtml>];
    });

    const { css: secondaryCssChunks, js: secondaryJsChunks } = await fetch(
        `https://canary.discord.com/assets/${surfaceChunks.chunkLoader}`
    ).then(async r => webpack.getChunks(await r.text()));

    const manifest: WebManifest = {
        build: {
            build_hash: buildId,
            build_number: -1,
            global_env: globalEnv,
        },
        assets: {
            css_chunks: {
                primary: stylesheet,
                secondary: secondaryCssChunks,
            },
            js_chunks: {
                primary: {
                    loader: surfaceChunks.chunkLoader,
                    class_mappings: surfaceChunks.classMappings,
                    vendor: surfaceChunks.vendor,
                    main: surfaceChunks.main,
                },
                secondary: secondaryJsChunks,
            },
            cdn: {
                css: [], // TODO
                js: [],
            },
            minified_jsx_svg: [],
            lottie: [],
        },
        metadata: {
            class_name_mappings: {}, // TODO
            experiments: [],
            strings: {},
            locale_strings: {}, // TODO
            action_types: {},
            enums: {
                // TODO
                Endpoints: {},
                Routes: {},
            },
        },
        webpack_chunks: {},
    };

    return manifest;
}
