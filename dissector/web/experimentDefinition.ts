import {
    AssignmentExpression,
    CallExpression,
    Identifier,
    Literal,
    MemberExpression,
    ObjectExpression,
    Property,
} from "../../types/es2022";
import {
    astToJS,
    checkElements,
    isArrayExpression,
    isCallExpression,
    isIdentifier,
    isLiteral,
    isMemberExpression,
    isObjectExpression,
    isProperty,
    isSequenceExpression,
} from "../utils";

export interface ExperimentDefinition {
    kind: "user" | "guild" | "unknown";
    id: string;
    label: string;
    description?: string;
    treatments: ExperimentDefinitionTreatment[];
    defaultConfig?: Record<string, any>;
}

export interface ExperimentDefinitionTreatment {
    id: number;
    label: string;
    config?: Record<string, any>;
}

/**
 * If the given ObjectExpression node is an "experiment definition" this function
 * returns the experiment definition as a JS object.
 *
 * Here's what an "experiment definition" looks like:
 *
 * ```js
 * // 2016 - 2017
 * x.Experiments = {
 *   SOME_EXPERIMENT: "experiment_name"
 * }
 *
 * // 2018 - 2019
 * x.Experiments = Object.freeze({
 *   SOME_EXPERIMENT: "experiment_name"
 * })
 *
 * // 2020 - 2022 (pre swc)
 * (0, x.registerUserExperiment)({
 *   id: y.SOME_EXPERIMENT,
 *   title: "Experiment Title",
 *   description: [ "Description 1", "Description 2", ... ],
 *   buckets: [ z.CONTROL, z.TREATMENT_1, ... ]
 * })
 * (0, x.registerGuildExperiment)({
 *   id: y.SOME_EXPERIMENT,
 *   title: "Experiment Title",
 *   description: [ "Description 1", "Description 2", ... ],
 *   buckets: [ z.CONTROL, z.TREATMENT_1, ... ]
 * })
 *
 * // 2021 - current
 * {
 *   kind: "guild|user",
 *   id: "experiment_name_here",
 *   label: "Experiment Title",
 *   defaultConfig: { ... },
 *   treatments: [ { id: 123, label: "Treatment Label" }, ... ]
 * }
 * ```
 */
export function getExperimentDefinition(
    node: AssignmentExpression | CallExpression | ObjectExpression
) {
    const definition: ExperimentDefinition = {
        // @ts-ignore
        kind: undefined,
        // @ts-ignore
        id: undefined,
        // @ts-ignore
        label: undefined,
        description: undefined,
        treatments: [],
        defaultConfig: undefined,
    };

    switch (node.type) {
        case "AssignmentExpression":
            let object;
            if (
                isMemberExpression(node.left) &&
                isIdentifier(node.left.property, "Experiments") &&
                ((isObjectExpression(node.right) && (object = node.right)) ||
                    (isCallExpression(node.right) &&
                        isMemberExpression(node.right.callee) &&
                        isIdentifier(node.right.callee.object, "Object") &&
                        isIdentifier(node.right.callee.property, "freeze") &&
                        isObjectExpression(node.right.arguments[0]) &&
                        (object = node.right.arguments[0]))) &&
                checkElements(
                    object.properties,
                    (
                        elem
                    ): elem is {
                        value: { value: string } & Literal;
                    } & Property =>
                        isProperty(elem) &&
                        isLiteral(elem.value) &&
                        typeof elem.value.value === "string"
                )
            ) {
                const definitions: ExperimentDefinition[] = [];

                for (const property of object.properties) {
                    definitions.push({
                        kind: "unknown",
                        id: property.value.value,
                        label: property.value.value,
                        treatments: [],
                        defaultConfig: undefined,
                    });
                }

                return definitions;
            }
            break;
        case "CallExpression":
            if (
                isSequenceExpression(node.callee) &&
                node.callee.expressions.length === 2 &&
                isLiteral(node.callee.expressions[0], 0) &&
                isMemberExpression(node.callee.expressions[1]) &&
                (isIdentifier(
                    node.callee.expressions[1].property,
                    "registerUserExperiment"
                ) ||
                    isIdentifier(
                        node.callee.expressions[1].property,
                        "registerGuildExperiment"
                    )) &&
                node.arguments.length === 1 &&
                isObjectExpression(node.arguments[0]) &&
                checkElements(
                    node.arguments[0].properties,
                    (prop): prop is { key: Identifier } & Property =>
                        isProperty(prop) && isIdentifier(prop.key)
                )
            ) {
                definition.kind =
                    node.callee.expressions[1].property.name ===
                    "registerUserExperiment"
                        ? "user"
                        : "guild";
                const descriptions: string[] = [];
                const buckets: number[] = [];

                for (const prop of node.arguments[0].properties) {
                    switch (prop.key.name) {
                        case "id":
                            if (
                                isMemberExpression(prop.value) &&
                                isIdentifier(prop.value.property)
                            ) {
                                // TODO: do we really need to resolve the actual experiment names?
                                // (yes)
                                definition.id = prop.value.property.name;
                            }
                            break;
                        case "title":
                            if (
                                isLiteral(prop.value) &&
                                typeof prop.value.value === "string"
                            ) {
                                definition.label = prop.value.value;
                            }
                            break;
                        case "description":
                            if (
                                isArrayExpression(prop.value) &&
                                checkElements(
                                    prop.value.elements,
                                    (
                                        elem
                                    ): elem is { value: string } & Literal =>
                                        isLiteral(elem) &&
                                        typeof elem.value === "string"
                                )
                            ) {
                                descriptions.push(
                                    ...prop.value.elements.map(
                                        elem => elem.value
                                    )
                                );
                            }
                            break;
                        case "buckets":
                            if (
                                isArrayExpression(prop.value) &&
                                checkElements(
                                    prop.value.elements,
                                    (
                                        elem
                                    ): elem is {
                                        property: Identifier;
                                    } & MemberExpression =>
                                        isMemberExpression(elem) &&
                                        isIdentifier(elem.property)
                                )
                            ) {
                                buckets.push(
                                    ...prop.value.elements.map(elem =>
                                        elem.property.name === "NOT_ELIGIBLE"
                                            ? -1
                                            : elem.property.name === "CONTROL"
                                            ? 0
                                            : parseInt(
                                                  elem.property.name
                                                      .split("_")
                                                      .at(-1)!
                                              )
                                    )
                                );
                            }
                            break;
                    }
                }

                const descriptionSlice = descriptions.slice(
                    descriptions.length - buckets.length
                );

                definition.treatments.push(
                    ...buckets.map<ExperimentDefinitionTreatment>(
                        (id, index) => ({
                            id,
                            label: descriptionSlice[index],
                        })
                    )
                );
            }
            break;
        case "ObjectExpression":
            if (
                checkElements(
                    node.properties,
                    (prop): prop is { key: Identifier } & Property =>
                        isProperty(prop) && isIdentifier(prop.key)
                )
            ) {
                for (const prop of node.properties) {
                    switch (prop.key.name) {
                        case "kind":
                            if (
                                (isLiteral(prop.value, "user") ||
                                    isLiteral(prop.value, "guild")) &&
                                typeof prop.value.value === "string"
                            ) {
                                definition.kind = prop.value.value as
                                    | "user"
                                    | "guild";
                            }
                            break;
                        case "id":
                            if (
                                isLiteral(prop.value) &&
                                typeof prop.value.value === "string"
                            ) {
                                definition.id = prop.value.value;
                            }
                            break;
                        case "label":
                            if (
                                isLiteral(prop.value) &&
                                typeof prop.value.value === "string"
                            ) {
                                definition.label = prop.value.value;
                            }
                            break;
                        case "treatments":
                            if (
                                isArrayExpression(prop.value) &&
                                checkElements(
                                    prop.value.elements,
                                    (
                                        elem
                                    ): elem is {
                                        properties: ({
                                            key: Identifier;
                                        } & Property)[];
                                    } & ObjectExpression =>
                                        isObjectExpression(elem) &&
                                        checkElements(
                                            elem.properties,
                                            (
                                                prop
                                            ): prop is {
                                                key: Identifier;
                                            } & Property =>
                                                isProperty(prop) &&
                                                isIdentifier(prop.key)
                                        )
                                )
                            ) {
                                for (const treatmentObj of prop.value
                                    .elements) {
                                    const treatment: ExperimentDefinitionTreatment =
                                        {
                                            // @ts-ignore
                                            id: undefined,
                                            // @ts-ignore
                                            label: undefined,
                                            config: undefined,
                                        };

                                    for (const treatmentProp of treatmentObj.properties) {
                                        switch (treatmentProp.key.name) {
                                            case "id":
                                                if (
                                                    isLiteral(
                                                        treatmentProp.value
                                                    ) &&
                                                    typeof treatmentProp.value
                                                        .value === "number"
                                                ) {
                                                    treatment.id =
                                                        treatmentProp.value.value;
                                                }
                                                break;
                                            case "label":
                                                if (
                                                    isLiteral(
                                                        treatmentProp.value
                                                    ) &&
                                                    typeof treatmentProp.value
                                                        .value === "string"
                                                ) {
                                                    treatment.label =
                                                        treatmentProp.value.value;
                                                }
                                                break;
                                            case "config":
                                                treatment.config = astToJS(
                                                    treatmentProp.value
                                                ) as Record<string, any>;
                                                break;
                                        }
                                    }

                                    if (
                                        typeof treatment.id !== "undefined" &&
                                        typeof treatment.label !== "undefined"
                                    ) {
                                        definition.treatments.push(treatment);
                                    }
                                }
                            }
                            break;
                        case "defaultConfig":
                            definition.defaultConfig = astToJS(
                                prop.value
                            ) as Record<string, any>;
                            break;
                    }
                }
            }
            break;
    }

    if (
        typeof definition.kind === "undefined" ||
        typeof definition.id === "undefined" ||
        typeof definition.label === "undefined"
    )
        return;

    return definition;
}
