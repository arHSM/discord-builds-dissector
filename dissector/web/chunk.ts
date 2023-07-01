import assert from "assert";

import { generate } from "astring";
import {
    ArrayExpression,
    ArrowFunctionExpression,
    FunctionExpression,
    Literal,
    Program,
    Property,
} from "../../types/es2022";
import { checkElements, isIdentifier, isLiteral } from "../util";

export interface Chunk {
    requiredChunks: number[];
    // 2016-2021: FunctionExpression | null
    // 2022-current: Property
    modules: Record<string, FunctionExpression | ArrowFunctionExpression>;
    // 2016 - early 2018: number[]
    // late 2018 - 2021: number[][]
    // 2022 - current: ArrowFunctionExpression
    executeModules: number[] | string | null;
}

/**
 * This function returns data from the given chunk AST. This function only
 * supports all chunks other than the chunk loader.
 *
 * To get any useful data you will need to pair this function with other
 * functions like `getAsset`.
 *
 * Here's what a chunk looks like:
 *
 * ```js
 * // 2016 - early 2018
 * //
 * // These builds do not use `.push` instead the `webpackJsonp`
 * // function is mapped to add to the global modules array.
 * //
 * // `webpackJsonp` is given 3 array arguments.
 * //
 * // Arrays passed to `webpackJsonp` are asa follows:
 * // - Array of ids of chunks to preload.
 * // - Array of module functions, some elements may be null, do not filter the
 * //   null values the null values contribute to the increment of the module IDs
 * //   since in these builds modules are specified in an array instead of an object.
 * // - Called "executeModules", this is only present when the entrypoint is the
 * //   current chunk, the IDs in the array are module IDs which are immediately
 * //   executed once the chunk is pushed.
 * webpackJsonp(
 *   [ number, ... ],
 *   [ ... ],
 *   [ number, ... ],
 * )
 *
 * // late 2018 - 2021
 * //
 * // This is similar to 2016 - early 2018 builds except 2 major changes,
 * // 1. `Array.prototype.push` is being used.
 * // 2. The last array is now an 'array of arrays of numbers' instead of just being an array of numbers.
 * (window.webpackJsonp = window.webpackJsonp || []).push(
 *   [
 *     [ number, ... ],
 *     [...],
 *     [ [ number, ... ], ... ],
 *   ]
 * )
 *
 * // 2022 (pre/post swc) - current
 * //
 * // This is quite similar to late 2018 - 2021 builds except 2 major changes yet again,
 * // 1. The second array is now an object of module id to module function mappings.
 * // 2. The third array has been replaced by a function.
 * (this.webpackChunkdiscord_app = this.webpackChunkdiscord_app || []).push(
 *   [
 *     [ number, ... ],
 *     { number: Function, ... },
 *     (__webpack_require__) => {...},
 *   ]
 * )
 * ```
 *
 * Here's a yaml representation of the AST:
 *
 * ```yaml
 * ast: Program
 *   body: array
 *     [0]: ExpressionStatement
 *       expression: CallExpression
 *         # 2016 - early 2018
 *         callee: Identifier
 *           name: "webpackJsonp"
 *         arguments:
 *           [0]: ArrayExpression
 *             elements: array
 *               [...]: Literal
 *                 value: number
 *           [1]: ArrayExpression
 *             elements: array
 *               [...]: FunctionExpression | null
 *           [2]: ArrayExpression
 *             elements: array
 *               [...]: Literal
 *                 value: number
 *         # late 2018 - current
 *         callee: MemberExpression
 *           object: AssignmentExpression
 *             left: MemberExpression
 *               # late 2018 - 2021
 *               object: Identifier
 *                 name: "window"
 *               # 2022 - current
 *               object: ThisExpression
 *               property: Identifier
 *                 # late 2018 - 2021
 *                 name: "webpackJsonp"
 *                 # 2022 - current
 *                 name: "webpackChunkdiscord_app"
 *             right: LogicalExpression
 *               left: MemberExpression
 *                 # late 2018 - 2021
 *                 object: Identifier
 *                   name: "window"
 *                 # 2022 - current
 *                 object: ThisExpression
 *                 property: Identifier
 *                   # late 2018 - 2021
 *                   name: "webpackJsonp"
 *                   # 2022 - current
 *                   name: "webpackChunkdiscord_app"
 *           property: Identifier
 *             name: "push"
 *         arguments:
 *           [0]: ArrayExpression
 *             elements: array
 *               [0]: ArrayExpression
 *                 elements: array
 *                   [...]: Literal
 *                     value: number
 *               # late 2018 - 2021
 *               [1]: ArrayExpression
 *                 elements: array
 *                   [...]: FunctionExpression | null
 *               [2]: ArrayExpression
 *                 elements: array
 *                   [...]: ArrayExpression
 *                     elements: array
 *                       [...]: Literal
 *                         value: number
 *               # 2022 - current
 *               [1]: ObjectExpression
 *                 properties:
 *                   [...]: Property
 *               [2]: ArrowFunctionExpression
 * ```
 */
export function processChunk(ast: Program): Chunk {
    let main = ast.body[0];
    assert(
        main.type === "ExpressionStatement",
        "Program.body[0] must be of type ExpressionStatement."
    );

    let expr = main.expression;
    assert(
        expr.type === "CallExpression",
        "Program.body[0].expression must be of type CallExpression."
    );

    let callee = expr.callee;

    switch (callee.type) {
        // 2016 - early 2018
        case "Identifier":
            assert(
                callee.name === "webpackJsonp",
                "Callee.name must be webpackJsonp."
            );

            assert(
                expr.arguments.length >= 2 && expr.arguments.length <= 3,
                "Call to webpackJsonp must have 2-3 arguments."
            );
            assert(
                expr.arguments[0].type === "ArrayExpression" &&
                    checkElements(expr.arguments[0].elements, isLiteral),
                "First argument to webpackJsonp must be of type ArrayExpression with all its element of type Literal."
            );
            assert(
                expr.arguments[1].type === "ArrayExpression" &&
                    checkElements(
                        expr.arguments[1].elements,
                        (element): element is FunctionExpression | null =>
                            element === null ||
                            element.type === "FunctionExpression"
                    ),
                "Second argument to webpackJsonp must be of type ArrayExpression with all its element of type FunctionExpression or null."
            );
            // HACK: can't do undefined check in assert because TS doesn't like it
            typeof expr.arguments[2] === "undefined" &&
                (expr.arguments[2] = {
                    type: "ArrayExpression",
                    elements: [{ type: "Literal", value: "Fake" }],
                });
            assert(
                expr.arguments[2].type === "ArrayExpression" &&
                    checkElements(expr.arguments[2].elements, isLiteral),
                "Third argument to webpackJsonp must be of type ArrayExpression with all its elements of type Literal."
            );

            return {
                requiredChunks: expr.arguments[0].elements.map(
                    literal => literal.value as number
                ),
                modules: Object.fromEntries(
                    <[number, FunctionExpression][]>(
                        expr.arguments[1].elements
                            .map((element, idx) =>
                                element
                                    ? ([idx, element] as [
                                          number,
                                          FunctionExpression
                                      ])
                                    : null
                            )
                            .filter(element => element !== null)
                    )
                ),
                executeModules:
                    expr.arguments[2].elements[0].value !== "Fake"
                        ? expr.arguments[2].elements.map(
                              literal => literal.value as number
                          )
                        : null,
            };
        // late 2018 - current
        case "MemberExpression":
            let calleeObject = callee.object;
            assert(
                calleeObject.type === "AssignmentExpression",
                "Callee.object must be of type AssignmentExpression."
            );

            let calleeObjectLeft = calleeObject.left;
            assert(
                calleeObjectLeft.type === "MemberExpression",
                "Callee.object.left must be of type MemberExpression."
            );
            assert(
                isIdentifier(calleeObjectLeft.object, "window") ||
                    calleeObjectLeft.object.type === "ThisExpression",
                "Callee.object.left.object must be of type Identifier with name window or of type ThisExpression."
            );
            assert(
                isIdentifier(calleeObjectLeft.property),
                "Callee.object.left.property must be of type Identifier."
            );

            let calleeObjectRight = calleeObject.right;
            assert(
                calleeObjectRight.type === "LogicalExpression",
                "Callee.object.right must be of type LogcalExpresion."
            );
            assert(
                calleeObjectRight.left.type === "MemberExpression",
                "Callee.object.right.left must be of type MemberExpression."
            );
            assert(
                isIdentifier(calleeObjectRight.left.object, "window") ||
                    calleeObjectRight.left.object.type === "ThisExpression",
                "Callee.object.right.left.object must be of type Identifier with name window or of type ThisExpression."
            );
            assert(
                isIdentifier(calleeObjectRight.left.property),
                "Callee.object.right.left.property must be of type Identifier."
            );

            assert(
                calleeObjectLeft.property.name ===
                    calleeObjectRight.left.property.name,
                "Callee.object.left.property.name must be equal to Callee.object.right.left.property.name."
            );

            assert(
                isIdentifier(callee.property, "push"),
                "Callee.property must be of type Identifier with name push."
            );

            assert(
                expr.arguments.length === 1,
                "Push call's arguments must be of length 1."
            );
            assert(
                expr.arguments[0].type === "ArrayExpression",
                "Push call's arument must be of type ArrayExpression."
            );
            assert(
                expr.arguments[0].elements.length >= 2 &&
                    expr.arguments[0].elements.length <= 3,
                "Push call's argument array must be of length 2-3."
            );

            assert(
                expr.arguments[0].elements[0] &&
                    expr.arguments[0].elements[0].type === "ArrayExpression" &&
                    checkElements(
                        expr.arguments[0].elements[0].elements,
                        isLiteral
                    ),
                "First element of Push call's argument array must be of type ArrayExpression with all its elements of type Literal."
            );

            switch (calleeObjectLeft.property.name) {
                // 2019 - 2021 builds
                case "webpackJsonp":
                    assert(
                        expr.arguments[0].elements[1] &&
                            expr.arguments[0].elements[1].type ===
                                "ArrayExpression" &&
                            checkElements(
                                expr.arguments[0].elements[1].elements,
                                (
                                    element
                                ): element is FunctionExpression | null =>
                                    element === null ||
                                    element?.type === "FunctionExpression"
                            ),
                        "Second element of Push call's argument array must be of type ArrayExpression with all its elements of type FunctionExpression."
                    );
                    // HACK: can't do undefined check in assert because TS doesn't like it
                    typeof expr.arguments[0].elements[2]?.type ===
                        "undefined" &&
                        (expr.arguments[0].elements[2] = {
                            type: "ArrayExpression",
                            elements: [
                                {
                                    type: "ArrayExpression",
                                    elements: [
                                        { type: "Literal", value: "Fake" },
                                    ],
                                },
                            ],
                        });
                    assert(
                        expr.arguments[0].elements[2].type ===
                            "ArrayExpression" &&
                            checkElements(
                                expr.arguments[0].elements[2].elements,
                                (
                                    element
                                ): element is {
                                    elements: Literal[];
                                } & ArrayExpression =>
                                    element?.type === "ArrayExpression" &&
                                    checkElements(element.elements, isLiteral)
                            ),
                        "Third element of Push call's arument array must be of type ArrayExpression with all its elements of type ArrayExpression conaining elements of type Literal."
                    );

                    return {
                        requiredChunks:
                            expr.arguments[0].elements[0].elements.map(
                                element => element.value as number
                            ),
                        modules: Object.fromEntries(
                            <[number, FunctionExpression][]>(
                                expr.arguments[0].elements[1].elements
                                    .map((element, idx) =>
                                        element
                                            ? ([idx, element] as [
                                                  number,
                                                  FunctionExpression
                                              ])
                                            : null
                                    )
                                    .filter(element => element !== null)
                            )
                        ),
                        executeModules:
                            expr.arguments[0].elements[2].elements[0]
                                .elements[0].value !== "Fake"
                                ? expr.arguments[0].elements[2].elements.flatMap(
                                      elem =>
                                          elem.elements.map(
                                              elem => elem.value as number
                                          )
                                  )
                                : null,
                    };
                case "webpackChunkdiscord_app":
                    assert(
                        expr.arguments[0].elements[1] &&
                            expr.arguments[0].elements[1].type ===
                                "ObjectExpression" &&
                            checkElements(
                                expr.arguments[0].elements[1].properties,
                                (
                                    element
                                ): element is { key: Literal } & Property =>
                                    element.type === "Property" &&
                                    element.key.type === "Literal"
                            ),
                        "Second element of Push call's argument array must be of type ObjectExpression with all its properties of type Property."
                    );

                    assert(
                        typeof expr.arguments[0].elements[2] === "undefined" ||
                            (expr.arguments[0].elements[2] !== null &&
                                expr.arguments[0].elements[2].type ===
                                    "ArrowFunctionExpression"),
                        "Third element of Push call's argument array must be of type ArrowFunctionExpression."
                    );

                    return {
                        requiredChunks:
                            expr.arguments[0].elements[0].elements.map(
                                n => n.value as number
                            ),
                        modules: Object.fromEntries(
                            expr.arguments[0].elements[1].properties.map(
                                property => [
                                    property.key.value as number,
                                    property.value as ArrowFunctionExpression,
                                ]
                            )
                        ),
                        executeModules: expr.arguments[0].elements[2]
                            ? generate(expr.arguments[0].elements[2])
                            : null,
                    };
                default:
                    throw new Error(
                        `Unsupported property \`${calleeObjectLeft.property.name}\`. ` +
                            "Expected one of (webpackJsonp, webpackChunkdiscord_app)"
                    );
            }
        default:
            throw new Error(
                `Unsupported chunk expression type \`${callee.type}\`. ` +
                    "Expected one of (Identifier, MemberExpression)"
            );
    }
}
