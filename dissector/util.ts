import { Identifier, Literal } from "../types/es2022";
import { AnyNode } from "../types/util";

export function checkElements<T, S extends T>(
    array: T[],
    predicate: (value: T) => value is S
): array is S[] {
    return !array.some(h => !predicate(h));
}

export function isIdentifier(
    node: AnyNode | null,
    name?: string
): node is Identifier {
    return node
        ? node.type === "Identifier" && (name ? node.name === name : true)
        : false;
}

export function isLiteral(
    node: AnyNode | null,
    value?: string | boolean | null | number | RegExp | bigint
): node is Literal {
    return node
        ? node.type === "Literal" && (value ? node.value === value : true)
        : false;
}
