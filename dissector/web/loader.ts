import assert from "assert";

const jsChunksRegex = /(\{(?:[\de]+?:"[0-9a-fA-F]{20}",?)+\})\[\w+?\]\+"\.js"/;
// prettier-ignore
const cssChunksRegex = /(\{(?:[\de]+?:"[0-9a-fA-F]{20}",?)+\})\[\w+?\]\+"\.css"/;
const chunksJsonFix = /([\de]+):/g;

function matchToJSON(match: string): Record<string, string> {
    return JSON.parse(
        // Have to parseFloat here because of minifier using the scientific e notation
        match
            .replace(",}", "}")
            .replaceAll(chunksJsonFix, (_, id) => '"' + parseFloat(id) + '":')
    );
}

/**
 * This function returns chunk data from the given chunk loader source string.
 *
 * There are 2 types of chunks:
 * 1. Javascript
 * 2. CSS
 *
 * Discord started using CSS chunks somewhere around 2020 but they've been using
 * JS chunks for as long as they've been a thing.
 */
export default function getChunks(loaderSrc: string) {
    const src = loaderSrc.replaceAll(/\n|\s+/g, "");

    const jsChunksMatch = jsChunksRegex.exec(src);
    const cssChunksMatch = cssChunksRegex.exec(src);

    assert(
        !!jsChunksMatch,
        "A valid Discord chunk loader will always have JS chunks."
    );

    const jsChunks = matchToJSON(jsChunksMatch[1]);
    const cssChunks = !!cssChunksMatch ? matchToJSON(cssChunksMatch[1]) : {};

    return {
        js: jsChunks,
        css: cssChunks,
    };
}
