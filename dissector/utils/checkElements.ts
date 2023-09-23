export function checkElements<T, S extends T>(
    array: T[],
    predicate: (value: T) => value is S
): array is S[] {
    return !array.some(h => !predicate(h));
}
