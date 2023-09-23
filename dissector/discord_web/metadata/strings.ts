import {
    ArrowFunctionExpression,
    AssignmentExpression,
    CallExpression,
    FunctionExpression,
    Identifier,
    Literal,
    ObjectExpression,
    Property,
} from "../../../types/es2022";
import {
    checkElements,
    isAssignmentExpression,
    isBlockStatement,
    isCallExpression,
    isExpressionStatement,
    isIdentifier,
    isLiteral,
    isMemberExpression,
    isObjectExpression,
    isProperty,
    isSequenceExpression,
} from "../../utils";

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
 * module: FunctionExpression | ArrowFunctionExpression
 *   # 2016 - early 2018
 *   params: array
 *     # Well [0] & [2] should also be an Identifier but it is irrelevant here
 *     [1]: Identifier
 *   body: BlockStatement
 *     body: array
 *       [1]: ExpressionStatement
 *         expression: SequenceStatement
 *           expressions: array
 *             [1]: AssignmentExpression
 *               left: MemberExpression
 *                 object: Identifier
 *                   name: string # MUST be module.params[1].name
 *                 # 2016
 *                 property: Literal
 *                   name: "default"
 *                 # 2017 - early 2018
 *                 property: Identifier
 *                   name: "default"
 *               right: ObjectExpression
 *                 properties: array
 *                   [...]: Property
 *                     # To verify if this is really a "string module" you can check
 *                     # if one of the keys one of
 *                     # ["DISCORD_DESC_SHORT", "DISCORD_NAME", "NOTIFICATION_BODY_ATTACHMENT"]
 *                     key: Identifier | Literal
 *                       # If type is Identifier
 *                       name: string
 *                       # If type is Literal
 *                       value: string
 *                     value: Literal
 *                       value: string
 *   # late 2018 - 2022 (pre-swc)
 *   # This also applies for post-swc but post-swc also has another AST structure
 *   # strings module, both must be considered
 *   params: array
 *     [0]: Identifier
 *       name: string
 *   body: BlockStatement
 *     body: array
 *       # If the first element is a "use strict" literal directive
 *       # then we need to index into the second element, else index into the first
 *       # one
 *       [0]: Literal
 *         value: "use strict"
 *       # or
 *       [0]: ExpressionStatement
 *         expression: Literal
 *           value: "use strict"
 *       [1]: ExpressionStatement
 *         expression: AssignmentExpression
 *           left: MemberExpression
 *             object: Identifier
 *               name: string # MUST be module.params[0].name
 *             property: Identifier
 *               name: "exports"
 *           right: CallExpression
 *             callee: MemberExpression
 *               object: Identifier
 *                 name: "Object"
 *               property: Identifier
 *                 name: "freeze"
 *             arguments: array
 *               [0]: ObjectExpression
 *                 properties: array
 *                   [...]: Property
 *                     # To verify if this is really a "string module" you can check
 *                     # if one of the keys one of
 *                     # ["DISCORD_DESC_SHORT", "DISCORD_NAME", "NOTIFICATION_BODY_ATTACHMENT"]
 *                     key: Identifier | Literal
 *                       # If type is Identifier
 *                       name: string
 *                       # If type is Literal
 *                       value: string
 *                     value: Literal
 *                       value: string
 *   # 2022 post-swc the other type of string module
 *   params: array
 *     [0]: Identifier
 *       name: string
 *   body: BlockStatement
 *     body: array
 *       [2]: ExpressionStatement
 *         expression: AssignmentExpression
 *           operator: "="
 *           left: MemberExpression
 *             object: Identifier
 *               name: string # MUST be module.params[0].name
 *             property: Identifier
 *               name: "exports"
 *           right: CallExpression
 *             callee: MemberExpression
 *               object: Identifier
 *                 name: "Object"
 *               property: Identifier
 *                 name: "freeze"
 *             arguments: array
 *               [0]: SequenceExpression
 *                 # To verify if this is really a "string module" you can check
 *                 # if one of the keys one of
 *                 # ["DISCORD_DESC_SHORT", "DISCORD_NAME", "NOTIFICATION_BODY_ATTACHMENT"]
 *                 expressions: array
 *                   [0]: CallExpression
 *                     arguments: array
 *                       [0]: AssignmentExpression
 *                         operator: "="
 *                         left: Identifier
 *                           name: string
 *                         right: ObjectExpression
 *                           properties: array
 *                             [...]: Property
 *                               key: Identifier
 *                                 name: string # Key
 *                               value: Literal
 *                                 value: string # Value
 *                       [1]: Literal
 *                         value: string # Key
 *                       [2]: Literal
 *                         value: string # Value
 *                   [...]: CallExpression
 *                     arguments: array
 *                       [0]: Identifier
 *                         name: string
 *                       [1]: Literal
 *                         value: string # Key
 *                       [2]: Literal
 *                         value: string # Value
 *                   [-1]: Identifier
 *                     name: string
 * ```
 */
export function getStrings(
    module: FunctionExpression | ArrowFunctionExpression
) {
    // prettier-ignore
    if (
        module.params.length >= 2 &&
        isIdentifier(module.params[1]) &&
        isBlockStatement(module.body) &&
        module.body.body.length >= 2 &&
        isExpressionStatement(module.body.body[1]) &&
        isSequenceExpression(module.body.body[1].expression) &&
        module.body.body[1].expression.expressions.length >= 2 &&
        isAssignmentExpression(module.body.body[1].expression.expressions[1]) &&
        isMemberExpression(module.body.body[1].expression.expressions[1].left) &&
        isIdentifier(module.body.body[1].expression.expressions[1].left.object, module.params[1].name) &&
        (
            isLiteral(module.body.body[1].expression.expressions[1].left.property, "default") ||
            isIdentifier(module.body.body[1].expression.expressions[1].left.property, "default")
        ) &&
        isObjectExpression(module.body.body[1].expression.expressions[1].right) &&
        checkElements(
            module.body.body[1].expression.expressions[1].right.properties,
            (prop): prop is { key: Identifier | Literal; value: Literal } & Property =>
                isProperty(prop) &&
                (isIdentifier(prop.key) || isLiteral(prop.key)) &&
                isLiteral(prop.value)
        ) &&
        module.body.body[1].expression.expressions[1].right.properties
            .some(
                prop => 
                    ["DISCORD_DESC_SHORT", "DISCORD_NAME", "NOTIFICATION_BODY_ATTACHMENT"]
                        .includes(isIdentifier(prop.key) ? prop.key.name : prop.key.value as string)
            )
    ) {
        return Object.fromEntries(
            module.body.body[1].expression.expressions[1].right.properties
                .map(
                    prop => [isIdentifier(prop.key) ? prop.key.name : prop.key.value, prop.value.value as string]
                )
        ) as Record<string, string>
    }

    let stmt;

    // prettier-ignore
    if (
        module.params.length >= 1 &&
        isIdentifier(module.params[0]) &&
        isBlockStatement(module.body) &&
        module.body.body.length >= 1 &&
        (
            stmt = module.body.body[
                (
                    isLiteral(module.body.body[0], "use strict") ||
                    (isExpressionStatement(module.body.body[0]) &&
                    isLiteral(module.body.body[0].expression, "use strict"))
                ) ? 1 : 0]
        ) &&
        isExpressionStatement(stmt) &&
        isAssignmentExpression(stmt.expression) &&
        isMemberExpression(stmt.expression.left) &&
        isIdentifier(stmt.expression.left.object, module.params[0].name) &&
        isIdentifier(stmt.expression.left.property, "exports") &&
        isCallExpression(stmt.expression.right) &&
        isMemberExpression(stmt.expression.right.callee) &&
        isIdentifier(stmt.expression.right.callee.object, "Object") &&
        isIdentifier(stmt.expression.right.callee.property, "freeze") &&
        stmt.expression.right.arguments.length === 1 &&
        isObjectExpression(stmt.expression.right.arguments[0]) &&
        checkElements(
            stmt.expression.right.arguments[0].properties,
            (prop): prop is { key: Identifier | Literal; value: Literal } & Property =>
                isProperty(prop) &&
                (isIdentifier(prop.key) || isLiteral(prop.key)) &&
                isLiteral(prop.value)
        ) &&
        stmt.expression.right.arguments[0].properties
            .some(
                prop => 
                    ["DISCORD_DESC_SHORT", "DISCORD_NAME", "NOTIFICATION_BODY_ATTACHMENT"]
                        .includes(isIdentifier(prop.key) ? prop.key.name : prop.key.value as string)
            )
    ) {
        return Object.fromEntries(
            stmt.expression.right.arguments[0].properties
                .map(
                    prop => [isIdentifier(prop.key) ? prop.key.name : prop.key.value, prop.value.value as string]
                )
        ) as Record<string, string>
    }

    let seq;

    // prettier-ignore
    if (
        module.params.length >= 1 &&
        isIdentifier(module.params[0]) &&
        isBlockStatement(module.body) &&
        module.body.body.length >= 3 &&
        isExpressionStatement(module.body.body[2]) &&
        isAssignmentExpression(module.body.body[2].expression) &&
        module.body.body[2].expression.operator === "=" &&
        isMemberExpression(module.body.body[2].expression.left) &&
        isIdentifier(module.body.body[2].expression.left.object, module.params[0].name) &&
        isIdentifier(module.body.body[2].expression.left.property, "exports") &&
        isCallExpression(module.body.body[2].expression.right) &&
        isMemberExpression(module.body.body[2].expression.right.callee) &&
        isIdentifier(module.body.body[2].expression.right.callee.object, "Object") &&
        isIdentifier(module.body.body[2].expression.right.callee.property, "freeze") &&
        module.body.body[2].expression.right.arguments.length === 1 &&
        isSequenceExpression(module.body.body[2].expression.right.arguments[0]) &&
        isIdentifier(module.body.body[2].expression.right.arguments[0].expressions.at(-1)) &&
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
                isCallExpression(expr) &&
                expr.arguments.length === 3 &&
                (
                    (
                        isAssignmentExpression(expr.arguments[0]) &&
                        isObjectExpression(expr.arguments[0].right) &&
                        checkElements(
                            expr.arguments[0].right.properties,
                            (
                                prop
                            ): prop is {
                                key: Identifier;
                                value: Literal;
                            } & Property => isProperty(prop)
                        )
                    ) ||
                    isIdentifier(expr.arguments[0])
                ) &&
                isLiteral(expr.arguments[1]) &&
                isLiteral(expr.arguments[2])
        )
    ) {
        const result: Record<string, string> = {};

        for (const { arguments: args } of seq) {
            if (isAssignmentExpression(args[0])) {
                for (const { key, value } of args[0].right.properties) {
                    result[key.name] = value.value as string;
                }
            }

            result[args[1].value as string] = args[2].value as string;
        }

        return result
    }
}
