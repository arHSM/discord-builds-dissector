import { CallExpression } from "../../../types/es2022";
import {
    isBinaryExpression,
    isCallExpression,
    isIdentifier,
    isLiteral,
    isMemberExpression,
} from "../../utils";

export function getBuildNumber(node: CallExpression) {
    let buildNumberMatch;
    let buildNumber;

    // early 2018
    if (
        isMemberExpression(node.callee) &&
        isIdentifier(node.callee.object, "console") &&
        isIdentifier(node.callee.property, "log") &&
        node.arguments.length === 1 &&
        isLiteral(node.arguments[0]) &&
        typeof node.arguments[0].value === "string" &&
        node.arguments[0].value.startsWith("[BUILD INFO]") &&
        (buildNumberMatch =
            node.arguments[0].value.match(/Build Number: (\d+),/)) &&
        !isNaN((buildNumber = parseInt(buildNumberMatch[1])))
    ) {
        return buildNumber;
    }

    // late 2018 - 2022 (pre swc)
    if (
        isMemberExpression(node.callee) &&
        isIdentifier(node.callee.object, "console") &&
        isIdentifier(node.callee.property, "log") &&
        node.arguments.length === 1 &&
        isBinaryExpression(node.arguments[0]) &&
        isBinaryExpression(node.arguments[0].left) &&
        isLiteral(node.arguments[0].left.left) &&
        typeof node.arguments[0].left.left.value === "string" &&
        node.arguments[0].left.left.value.startsWith("[BUILD INFO]") &&
        isLiteral(node.arguments[0].right) &&
        typeof node.arguments[0].right.value === "string" &&
        (buildNumberMatch =
            node.arguments[0].right.value.match(/Build Number: (\d+),/)) &&
        !isNaN((buildNumber = parseInt(buildNumberMatch[1])))
    ) {
        return buildNumber;
    }

    // 2022 (post swc) - current
    if (
        isMemberExpression(node.callee) &&
        isIdentifier(node.callee.property, "log") &&
        node.arguments.length === 1 &&
        isCallExpression(node.arguments[0]) &&
        isMemberExpression(node.arguments[0].callee) &&
        isCallExpression(node.arguments[0].callee.object) &&
        isIdentifier(node.arguments[0].callee.property, "concat") &&
        node.arguments[0].callee.object.arguments.length === 2 &&
        isLiteral(
            node.arguments[0].callee.object.arguments[1],
            ", Version Hash: "
        ) &&
        isLiteral(node.arguments[0].callee.object.arguments[0]) &&
        typeof node.arguments[0].callee.object.arguments[0].value ===
            "string" &&
        !isNaN(
            (buildNumber = parseInt(
                node.arguments[0].callee.object.arguments[0].value
            ))
        )
    ) {
        return buildNumber;
    }
}
