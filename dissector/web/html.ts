import assert from "assert";
import { load } from "cheerio";

export function processHtml(html: string) {
    const $ = load(html);

    const stylesheet = $('link[rel="stylesheet"]').attr("href");
    const surfaceChunksArray: string[] = [];

    $("script[src]").each(function (i) {
        surfaceChunksArray[i] = this.attribs["src"];
    });

    assert(
        surfaceChunksArray.length >= 2,
        "There must be atleast 2 JS chunks in the HTML source."
    );
    assert(
        surfaceChunksArray.length > 4,
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
        stylesheet,
        surfaceChunks,
    };
}