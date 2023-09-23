import {
    ArrowFunctionExpression,
    FunctionExpression,
} from "../../../types/es2022";
import {
    isAssignmentExpression,
    isBinaryExpression,
    isBlockStatement,
    isExpressionStatement,
    isIdentifier,
    isLiteral,
    isMemberExpression,
} from "../../utils";

/**
 * If the given module is a "cdn asset module" this function returns the asset
 * name.
 *
 * Here's what a "cdn asset module" looks like:
 *
 * ```js
 * // 2016 - 2021
 * function(module, exports, __webpack_require__) { module.exports = __webpack_require__.p + "<asset>" }
 *
 * // 2022 - current
 * (module, exports, __webpack_require__) => { module.exports = __webpack_require__.p + "<asset>" }
 * ```
 *
 * The (arrow) function MUST accept 3 arguments, it MUST have only 1 statment in
 * it's body and it must follow to format: `arg1.exports = arg3.p + "<asset>"`
 *
 * Here's a yaml representation of the AST:
 *
 * ```yaml
 * module: FunctionExpression | ArrowFunctionExpression
 *   params: array
 *     [0]: Identifier
 *       name: string
 *     # Well [1] should also be an Identifier but it is irrelevant here
 *     [2]: Identifier
 *       name: string
 *   body: BlockStatement
 *     body: array
 *       [0]: ExpressionStatement
 *         expression: AssignmentExpression
 *           operator: "="
 *           left: MemberExpression
 *             object: Identifier
 *               name: string # MUST be module.params[0].name
 *             property: Identifier
 *               name: "exports"
 *           right: BinaryExpression
 *             operator: "+"
 *             left: MemberExpression
 *               object: Identifier
 *                 name: string # MUST be module.params[2].name
 *               property: Identifier
 *                 name: "p"
 *             right: Literal
 *               value: string
 * ```
 */
export function getCDNAsset(
    module: FunctionExpression | ArrowFunctionExpression
) {
    // prettier-ignore
    if (
        module.params.length === 3 &&
        isIdentifier(module.params[0]) &&
        isIdentifier(module.params[2]) &&
        isBlockStatement(module.body) &&
        module.body.body.length === 1 &&
        isExpressionStatement(module.body.body[0]) &&
        isAssignmentExpression(module.body.body[0].expression) &&
        module.body.body[0].expression.operator === "=" &&
        isMemberExpression(module.body.body[0].expression.left) &&
        isIdentifier(module.body.body[0].expression.left.object, module.params[0].name) &&
        isIdentifier(module.body.body[0].expression.left.property, "exports") &&
        isBinaryExpression(module.body.body[0].expression.right) &&
        module.body.body[0].expression.right.operator === "+" &&
        isMemberExpression(module.body.body[0].expression.right.left) &&
        isIdentifier(module.body.body[0].expression.right.left.object, module.params[2].name) &&
        isIdentifier(module.body.body[0].expression.right.left.property, "p") &&
        isLiteral(module.body.body[0].expression.right.right) &&
        typeof module.body.body[0].expression.right.right.value === "string"
    ) {
        return module.body.body[0].expression.right.right.value
    }
}
