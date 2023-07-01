import {
    ArrowFunctionExpression,
    AssignmentExpression,
    CallExpression,
    FunctionExpression,
    Identifier,
    Literal,
    ObjectExpression,
    Property,
} from "../../types/es2022";
import { checkElements, isIdentifier, isLiteral } from "../util";

/**
 * If the given module is a "strings module" this function returns the strings
 * in the module.
 *
 * Here's what a "string module" looks like:
 *
 * ```js
 * // 2016 - early 2018
 * function(module, exports, __webpack_require__) {
 *   "use strict";
 *   (exports.__esModule = !0), (exports["default"] = {
 *     ...
 *   })
 * }
 *
 * // late 2018 - 2022 (pre-swc)
 * // function up-till 2021, arrwo function afterwards
 * (module, exports, __webpack_require__) => {
 *   "use strict";
 *   module.exports = Object.freeze({
 *     ...
 *   })
 * }
 *
 * // 2022 (post-swc) - current
 * (module, exports, __webpack_require__) => {
 *   ... // Some Expression
 *   ... // Some other expression
 *   module.exports = Object.freeze((
 *     t(strings = { ... }, "<NAME>", "<VALUE>"),
 *     t(strings, "<NAME>", "<VALUE>"),
 *     ...
 *   ))
 * }
 * ```
 *
 * Here's a YAML representation of the AST:
 *
 * ```yaml
 * # 2016 - early 2018
 * params: array
 *   # Well [0] & [2] should also be an Identifier but it is irrelevant here
 *   [1]: Identifier
 * body: BlockStatement
 *   body: array
 *     [1]: ExpressionStatement
 *       expression: SequenceStatement
 *         expressions: array
 *           [1]: AssignmentExpression
 *             left: MemberExpression
 *               object: Identifier
 *                 name: string # MUST be module.params[1].name
 *               # 2016
 *               property: Literal
 *                 name: "default"
 *               # 2017 - early 2018
 *               property: Identifier
 *                 name: "default"
 *             right: ObjectExpression
 *               properties: array
 *                 [...]: Property
 *                   # To verify if this is really a "string module" you can check
 *                   # if one of the keys one of
 *                   # ["DISCORD_DESC_SHORT", "DISCORD_NAME", "NOTIFICATION_BODY_ATTACHMENT"]
 *                   key: Identifier | Literal
 *                     # If type is Identifier
 *                     name: string
 *                     # If type is Literal
 *                     value: string
 *                   value: Literal
 *                     value: string
 * # late 2018 - 2022 (pre-swc)
 * # This also applies for post-swc but post-swc also has another AST structure
 * # strings module, both must be considered
 * params: array
 *   [0]: Identifier
 *     name: string
 * body: BlockStatement
 *   body: array
 *     # If the first element is a "use strict" literal directive
 *     # then we need to index into the second element, else index into the first
 *     # one
 *     [0]: Literal
 *       value: "use strict"
 *     [1]: ExpressionStatement
 *       expression: AssignmentExpression
 *         left: MemberExpression
 *           object: Identifier
 *             name: string # MUST be module.params[0].name
 *           property: Identifier
 *             name: "exports"
 *         right: CallExpression
 *           callee: MemberExpression
 *             object: Identifier
 *               name: "Object"
 *             property: Identifier
 *               name: "freeze"
 *           arguments: array
 *             [0]: ObjectExpression
 *               properties: array
 *                 [...]: Property
 *                   # To verify if this is really a "string module" you can check
 *                   # if one of the keys one of
 *                   # ["DISCORD_DESC_SHORT", "DISCORD_NAME", "NOTIFICATION_BODY_ATTACHMENT"]
 *                   key: Identifier | Literal
 *                     # If type is Identifier
 *                     name: string
 *                     # If type is Literal
 *                     value: string
 *                   value: Literal
 *                     value: string
 * # 2022 post-swc the other type of string module
 * params: array
 *   [0]: Identifier
 *     name: string
 * body: BlockStatement
 *   body: array
 *     [2]: ExpressionStatement
 *       expression: AssignmentExpression
 *         operator: "="
 *         left: MemberExpression
 *           object: Identifier
 *             name: string # MUST be module.params[0].name
 *           property: Identifier
 *             name: "exports"
 *         right: CallExpression
 *           callee: MemberExpression
 *             object: Identifier
 *               name: "Object"
 *             property: Identifier
 *               name: "freeze"
 *           arguments: array
 *             [0]: SequenceExpression
 *               # To verify if this is really a "string module" you can check
 *               # if one of the keys one of
 *               # ["DISCORD_DESC_SHORT", "DISCORD_NAME", "NOTIFICATION_BODY_ATTACHMENT"]
 *               expressions: array
 *                 [0]: CallExpression
 *                   arguments: array
 *                     [0]: AssignmentExpression
 *                       operator: "="
 *                       left: Identifier
 *                         name: string
 *                       right: ObjectExpression
 *                         properties: array
 *                           [...]: Property
 *                             key: Identifier
 *                               name: string # Key
 *                             value: Literal
 *                               value: string # Value
 *                     [1]: Literal
 *                       value: string # Key
 *                     [2]: Literal
 *                       value: string # Value
 *                 [...]: CallExpression
 *                   arguments: array
 *                     [0]: Identifier
 *                       name: string
 *                     [1]: Literal
 *                       value: string # Key
 *                     [2]: Literal
 *                       value: string # Value
 *                 [-1]: Identifier
 *                   name: string
 * ```
 */
export function getStrings(
    module: FunctionExpression | ArrowFunctionExpression
) {
    // prettier-ignore
    if (
        module.params.length >= 2 &&
        isIdentifier(module.params[1]) &&
        module.body.type === "BlockStatement" &&
        module.body.body.length >= 2 &&
        module.body.body[1].type === "ExpressionStatement" &&
        module.body.body[1].expression.type === "SequenceExpression" &&
        module.body.body[1].expression.expressions.length >= 2 &&
        module.body.body[1].expression.expressions[1].type === "AssignmentExpression" &&
        module.body.body[1].expression.expressions[1].left.type === "MemberExpression" &&
        isIdentifier(module.body.body[1].expression.expressions[1].left.object, module.params[1].name) &&
        (
            isLiteral(module.body.body[1].expression.expressions[1].left.property, "default") ||
            isIdentifier(module.body.body[1].expression.expressions[1].left.property, "default")
        ) &&
        module.body.body[1].expression.expressions[1].right.type === "ObjectExpression" &&
        checkElements(
            module.body.body[1].expression.expressions[1].right.properties,
            (prop): prop is { key: Identifier | Literal; value: Literal } & Property =>
                prop.type === "Property" &&
                (isIdentifier(prop.key) || isLiteral(prop.key)) &&
                isLiteral(prop.value)
        ) &&
        module.body.body[1].expression.expressions[1].right.properties
            .some(
                prop => 
                    ["DISCORD_DESC_SHORT", "DISCORD_NAME", "NOTIFICATION_BODY_ATTACHMENT"]
                        .includes(prop.key.type === "Identifier" ? prop.key.name : prop.key.value as string)
            )
    ) {
        return Object.fromEntries(
            module.body.body[1].expression.expressions[1].right.properties
                .map(
                    prop => [prop.key.type === "Identifier" ? prop.key.name : prop.key.value, prop.value.value as string]
                )
        )
    }

    let stmt;

    // prettier-ignore
    if (
        module.params.length >= 1 &&
        isIdentifier(module.params[0]) &&
        module.body.type === "BlockStatement" &&
        module.body.body.length >= 1 &&
        (stmt = module.body.body[isLiteral(module.body.body[0], "use strict") ? 1 : 0]) &&
        stmt.type === "ExpressionStatement" &&
        stmt.expression.type === "AssignmentExpression" &&
        stmt.expression.left.type === "MemberExpression" &&
        isIdentifier(stmt.expression.left.object, module.params[0].name) &&
        isIdentifier(stmt.expression.left.property, "exports") &&
        stmt.expression.right.type === "CallExpression" &&
        stmt.expression.right.callee.type === "MemberExpression" &&
        isIdentifier(stmt.expression.right.callee.object, "Object") &&
        isIdentifier(stmt.expression.right.callee.property, "freeze") &&
        stmt.expression.right.arguments.length === 1 &&
        stmt.expression.right.arguments[0].type === "ObjectExpression" &&
        checkElements(
            stmt.expression.right.arguments[0].properties,
            (prop): prop is { key: Identifier | Literal; value: Literal } & Property =>
                prop.type === "Property" &&
                (isIdentifier(prop.key) || isLiteral(prop.key)) &&
                isLiteral(prop.value)
        ) &&
        stmt.expression.right.arguments[0].properties
            .some(
                prop => 
                    ["DISCORD_DESC_SHORT", "DISCORD_NAME", "NOTIFICATION_BODY_ATTACHMENT"]
                        .includes(prop.key.type === "Identifier" ? prop.key.name : prop.key.value as string)
            )
    ) {
        return Object.fromEntries(
            stmt.expression.right.arguments[0].properties
                .map(
                    prop => [prop.key.type === "Identifier" ? prop.key.name : prop.key.value, prop.value.value as string]
                )
        )
    }

    let seq;

    // prettier-ignore
    if (
        module.params.length >= 1 &&
        isIdentifier(module.params[0]) &&
        module.body.type === "BlockStatement" &&
        module.body.body.length >= 3 &&
        module.body.body[2].type === "ExpressionStatement" &&
        module.body.body[2].expression.type === "AssignmentExpression" &&
        module.body.body[2].expression.operator === "=" &&
        module.body.body[2].expression.left.type === "MemberExpression" &&
        isIdentifier(module.body.body[2].expression.left.object, module.params[0].name) &&
        isIdentifier(module.body.body[2].expression.left.property, "exports") &&
        module.body.body[2].expression.right.type === "CallExpression" &&
        module.body.body[2].expression.right.callee.type === "MemberExpression" &&
        isIdentifier(module.body.body[2].expression.right.callee.object, "Object") &&
        isIdentifier(module.body.body[2].expression.right.callee.property, "freeze") &&
        module.body.body[2].expression.right.arguments.length === 1 &&
        module.body.body[2].expression.right.arguments[0].type === "SequenceExpression" &&
        module.body.body[2].expression.right.arguments[0].expressions.at(-1)?.type === "Identifier" &&
        (seq = module.body.body[2].expression.right.arguments[0].expressions.slice(0, -1)) &&
        checkElements(
            seq,
            (
                expr
            ): expr is {
                arguments: [
                    (
                        | ({
                              right: {
                                  properties: ({
                                      key: Identifier;
                                      value: Literal;
                                  } & Property)[];
                              } & ObjectExpression;
                          } & AssignmentExpression)
                        | Identifier
                    ),
                    Literal,
                    Literal
                ];
            } & CallExpression =>
                expr.type === "CallExpression" &&
                expr.arguments.length === 3 &&
                (
                    (
                        expr.arguments[0].type === "AssignmentExpression" &&
                        expr.arguments[0].right.type === "ObjectExpression" &&
                        checkElements(
                            expr.arguments[0].right.properties,
                            (
                                prop
                            ): prop is {
                                key: Identifier;
                                value: Literal;
                            } & Property => prop.type === "Property"
                        )
                    ) ||
                    expr.arguments[0].type === "Identifier"
                ) &&
                expr.arguments[1].type === "Literal" &&
                expr.arguments[2].type === "Literal"
        )
    ) {
        const result: Record<string, string> = {};

        for (const { arguments: args } of seq) {
            if (args[0].type === "AssignmentExpression") {
                for (const { key, value } of args[0].right.properties) {
                    result[key.name] = value.value as string;
                }
            }

            result[args[1].value as string] = args[2].value as string;
        }

        return result
    }
}
