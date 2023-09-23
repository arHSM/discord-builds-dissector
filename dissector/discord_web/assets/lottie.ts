import { CallExpression } from "../../../types/es2022";
import { isIdentifier, isLiteral, isMemberExpression } from "../../utils";

export interface Lottie {
    nm: string;
}

export function getLottieAsset(node: CallExpression) {
    if (
        isMemberExpression(node.callee) &&
        isIdentifier(node.callee.object, "JSON") &&
        isIdentifier(node.callee.property, "parse") &&
        node.arguments.length === 1 &&
        isLiteral(node.arguments[0]) &&
        typeof node.arguments[0].value === "string" &&
        node.arguments[0].value.includes('"nm":')
    ) {
        const lottie = JSON.parse(node.arguments[0].value) as Lottie;

        // this is just a naïve way of verifying that it's actually lottie
        // animation data and not just arbitiary JSON with `"nm":` in it.
        if (typeof lottie.nm === "string") return lottie;
    }
}
