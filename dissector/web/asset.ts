import {
    ArrowFunctionExpression,
    FunctionExpression,
} from "../../types/es2022";
import { isIdentifier, isLiteral } from "../util";

/**
 * If the given module is an "asset module" this fucction returns the asset name.
 *
 * Here's what an "asset module" looks like:
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
 * params: array
 *   [0]: Identifier
 *     name: string
 *   # Well [1] should also be an Identifier but it is irrelevant here
 *   [2]: Identifier
 *     name: string
 * body: BlockStatement
 *   body: array
 *     [0]: ExpressionStatement
 *       expression: AssignmentExpression
 *         operator: "="
 *         left: MemberExpression
 *           object: Identifier
 *             name: string # MUST be module.params[0].name
 *           property: Identifier
 *             name: "exports"
 *         right: BinaryExpression
 *           operator: "+"
 *           left: MemberExpression
 *             object: Identifier
 *               name: string # MUST be module.params[2].name
 *             property: Identifier
 *               name: "p"
 *           right: Literal
 *             value: string
 * ```
 */
export function getAsset(module: FunctionExpression | ArrowFunctionExpression) {
    // prettier-ignore
    if (
        module.params.length === 3 &&
        isIdentifier(module.params[0]) &&
        isIdentifier(module.params[2]) &&
        module.body.type === "BlockStatement" &&
        module.body.body.length === 1 &&
        module.body.body[0].type === "ExpressionStatement" &&
        module.body.body[0].expression.type === "AssignmentExpression" &&
        module.body.body[0].expression.operator === "=" &&
        module.body.body[0].expression.left.type === "MemberExpression" &&
        isIdentifier(module.body.body[0].expression.left.object, module.params[0].name) &&
        isIdentifier(module.body.body[0].expression.left.property, "exports") &&
        module.body.body[0].expression.right.type === "BinaryExpression" &&
        module.body.body[0].expression.right.operator === "+" &&
        module.body.body[0].expression.right.left.type === "MemberExpression" &&
        isIdentifier(module.body.body[0].expression.right.left.object, module.params[2].name) &&
        isIdentifier(module.body.body[0].expression.right.left.property, "p") &&
        isLiteral(module.body.body[0].expression.right.right) &&
        typeof module.body.body[0].expression.right.right.value === "string"
    ) {
        return module.body.body[0].expression.right.right.value
    }
}
