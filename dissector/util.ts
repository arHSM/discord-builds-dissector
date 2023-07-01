import * as es2022 from "../types/es2022";

type AnyNode =
    | es2022.Identifier
    | es2022.Literal
    | es2022.RegExpLiteral
    | es2022.Program
    | es2022.ExpressionStatement
    | es2022.Directive
    | es2022.BlockStatement
    | es2022.FunctionBody
    | es2022.EmptyStatement
    | es2022.DebuggerStatement
    | es2022.WithStatement
    | es2022.ReturnStatement
    | es2022.LabeledStatement
    | es2022.BreakStatement
    | es2022.ContinueStatement
    | es2022.IfStatement
    | es2022.SwitchStatement
    | es2022.SwitchCase
    | es2022.ThrowStatement
    | es2022.TryStatement
    | es2022.CatchClause
    | es2022.WhileStatement
    | es2022.DoWhileStatement
    | es2022.ForStatement
    | es2022.ForInStatement
    | es2022.FunctionDeclaration
    | es2022.VariableDeclaration
    | es2022.VariableDeclarator
    | es2022.ThisExpression
    | es2022.ArrayExpression
    | es2022.ObjectExpression
    | es2022.Property
    | es2022.FunctionExpression
    | es2022.UnaryExpression
    | es2022.UpdateExpression
    | es2022.BinaryExpression
    | es2022.AssignmentExpression
    | es2022.LogicalExpression
    | es2022.MemberExpression
    | es2022.ConditionalExpression
    | es2022.CallExpression
    | es2022.NewExpression
    | es2022.SequenceExpression
    | es2022.ForOfStatement
    | es2022.Super
    | es2022.SpreadElement
    | es2022.ArrowFunctionExpression
    | es2022.YieldExpression
    | es2022.TemplateLiteral
    | es2022.TaggedTemplateExpression
    | es2022.TemplateElement
    | es2022.AssignmentProperty
    | es2022.ObjectPattern
    | es2022.ArrayPattern
    | es2022.RestElement
    | es2022.AssignmentPattern
    | es2022.ClassBody
    | es2022.MethodDefinition
    | es2022.ClassDeclaration
    | es2022.ClassExpression
    | es2022.MetaProperty
    | es2022.ImportDeclaration
    | es2022.ImportSpecifier
    | es2022.ImportDefaultSpecifier
    | es2022.ImportNamespaceSpecifier
    | es2022.ExportNamedDeclaration
    | es2022.ExportSpecifier
    | es2022.AnonymousDefaultExportedFunctionDeclaration
    | es2022.AnonymousDefaultExportedClassDeclaration
    | es2022.ExportDefaultDeclaration
    | es2022.ExportAllDeclaration
    | es2022.AwaitExpression
    | es2022.BigIntLiteral
    | es2022.ChainExpression
    | es2022.ImportExpression
    | es2022.PropertyDefinition
    | es2022.PrivateIdentifier
    | es2022.StaticBlock;

export function checkElements<T, S extends T>(
    array: T[],
    predicate: (value: T) => value is S
): array is S[] {
    return !array.some(h => !predicate(h));
}

export function isIdentifier(
    node: AnyNode | null,
    name?: string
): node is es2022.Identifier {
    return node && node.type === "Identifier" && name
        ? node.name === name
        : true;
}

export function isLiteral(
    node: AnyNode | null,
    value?: string | boolean | null | number | RegExp | bigint
): node is es2022.Literal {
    return node && node.type === "Literal" && value
        ? node.value === value
        : true;
}
