import { generate } from "astring";
import { Literal } from "../../types/es2022";
import { AnyNode } from "../../types/utils";

type AstToJSLiteral = Literal["value"];
type AstToJSObject = Record<string, any>;
export type AstToJS = AstToJSLiteral | AstToJSObject | AstToJS[];

export function astToJS(node: AnyNode, ignoreObjectProps?: string[]): AstToJS {
    switch (node.type) {
        case "Literal":
            return node.value;
        case "ObjectExpression":
            const obj: AstToJSObject = {};

            for (const prop of node.properties) {
                if (!isProperty(prop)) continue;

                if (isIdentifier(prop.key)) {
                    if (
                        typeof ignoreObjectProps !== "undefined" &&
                        ignoreObjectProps.includes(prop.key.name)
                    ) {
                        continue;
                    }

                    obj[prop.key.name] = astToJS(prop.value);
                } else if (isLiteral(prop.key)) {
                    obj[prop.key.value as unknown as string] = astToJS(
                        prop.value
                    );
                }
            }

            return obj;
        case "ArrayExpression":
            return node.elements.map((elem: any) => astToJS(elem));
        case "UnaryExpression":
            if (node.operator === "!") {
                const value = astToJS(node.argument);
                if (typeof value === "number") {
                    return !value;
                }
            }
        default:
            return generate(node);
    }
}

function is<
    P,
    T extends AnyNode["type"],
    N extends Extract<AnyNode, { type: T }>
>(
    type: T,
    condition?: (node: N, predicate: P) => boolean
): (node: AnyNode | null | undefined, predicate?: P) => node is N {
    return function (node, predicate): node is N {
        return node
            ? node.type === type &&
                  (typeof condition === "undefined"
                      ? true
                      : typeof predicate === "undefined"
                      ? true
                      : condition(node as N, predicate))
            : false;
    };
}

export const isAssignmentExpression = is("AssignmentExpression");
export const isArrayExpression = is("ArrayExpression");
export const isArrowFunctionExpression = is("ArrowFunctionExpression");
export const isBlockStatement = is("BlockStatement");
export const isBinaryExpression = is("BinaryExpression");
export const isCallExpression = is("CallExpression");
export const isConditionalExpression = is("ConditionalExpression");
export const isExpressionStatement = is("ExpressionStatement");
export const isFunctionExpression = is("FunctionExpression");
export const isLogicalExpression = is("LogicalExpression");
export const isMemberExpression = is("MemberExpression");
export const isObjectExpression = is("ObjectExpression");
export const isProperty = is("Property");
export const isSequenceExpression = is("SequenceExpression");
export const isThisExpression = is("ThisExpression");

export const isIdentifier = is(
    "Identifier",
    (node, name: string) => node.name === name
);
export const isLiteral = is(
    "Literal",
    (node, value: string | boolean | null | number | RegExp | bigint) =>
        node.value === value
);
