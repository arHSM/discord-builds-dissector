import assert from "assert";
import { load } from "cheerio";

/**
 * This function returns data from the given HTML file source.
 *
 * There are 3 things you'll need from the HTML file:
 * 1. The GLOBAL_ENV.
 * 2. The base stylesheet.
 * 3. The surface level JS chunks.
 *
 * The GLOBAL_ENV is useful if you want to do something like
 * <https://gitlab.com/bignutty/displunger> or <https://github.com/nurmarvin/discord-proxy>.
 *
 * The base stylesheet isn't that useful unless you have some specific use for it.
 *
 * The surface level chunks are the important ones as they'll allow you to perform
 * other things like getting assets or extracting strings.
 */
export function processHtml(html: string) {
    const $ = load(html);

    const globalEnv = {};
    const stylesheet = $('link[rel="stylesheet"]').attr("href");
    const surfaceChunksArray: string[] = [];

    $("script").each(function () {
        const text = $(this).text().trim();
        if (text.startsWith("window.GLOBAL_ENV")) {
            // MMYES good 'ol eval
            Object.assign(
                globalEnv,
                eval(
                    "(" +
                        text
                            .replaceAll(
                                /(window\.GLOBAL_ENV\s*=\s*|,(?=\n?\s+\})|;)/g,
                                ""
                            )
                            .replace("Date.now()", '"Date.now()"') +
                        ")"
                )
            );
        }
    });

    $("script[src]").each(function (i) {
        surfaceChunksArray[i] = this.attribs["src"];
    });

    assert(
        surfaceChunksArray.length >= 2,
        "There must be atleast 2 JS chunks in the HTML source."
    );
    assert(
        surfaceChunksArray.length <= 4,
        "More than 4 JS chunks detected, notify arHSM :^)"
    );

    const surfaceChunks = {
        chunkLoader: surfaceChunksArray[0],
        classMappings:
            surfaceChunksArray.length >= 3 ? surfaceChunksArray[1] : null,
        vendor: surfaceChunksArray.length === 4 ? surfaceChunksArray[2] : null,
        main: surfaceChunksArray[surfaceChunksArray.length - 1],
    };

    return {
        globalEnv,
        stylesheet,
        surfaceChunks,
    };
}
