import {
    ArrowFunctionExpression,
    FunctionExpression,
    Identifier,
    Literal,
    Property,
} from "../../../types/es2022";
import {
    checkElements,
    isAssignmentExpression,
    isBlockStatement,
    isExpressionStatement,
    isIdentifier,
    isLiteral,
    isMemberExpression,
    isObjectExpression,
    isProperty,
} from "../../utils";

export function getClassNameMappings(
    module: FunctionExpression | ArrowFunctionExpression
) {
    // prettier-ignore
    if (
        module.params.length >= 1 &&
        isIdentifier(module.params[0]) &&
        isBlockStatement(module.body) &&
        module.body.body.length === 1 &&
        isExpressionStatement(module.body.body[0]) &&
        isAssignmentExpression(module.body.body[0].expression) &&
        isMemberExpression(module.body.body[0].expression.left) &&
        isIdentifier(module.body.body[0].expression.left.object, module.params[0].name) &&
        isIdentifier(module.body.body[0].expression.left.property, "exports") &&
        isObjectExpression(module.body.body[0].expression.right) &&
        checkElements(
            module.body.body[0].expression.right.properties,
            (
                prop
            ): prop is {
                key: Identifier | ({ value: string } & Literal);
                value: { value: string } & Literal;
            } & Property =>
                isProperty(prop) &&
                (
                    isIdentifier(prop.key) ||
                    (isLiteral(prop.key) && typeof prop.key.value === "string")
                ) &&
                isLiteral(prop.value) &&
                typeof prop.value.value === "string"
        )
    ) {
        return Object.fromEntries(
            module.body.body[0].expression.right.properties.map(prop => [
                prop.key.type === "Identifier" ? prop.key.name : prop.key.value,
                prop.value.value,
            ]) 
        ) as Record<string, string>;
    }
}
