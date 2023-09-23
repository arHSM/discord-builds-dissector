import {
    AssignmentExpression,
    CallExpression,
    Identifier,
    Literal,
    MemberExpression,
    ObjectExpression,
    Property,
} from "../../../types/es2022";
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
} from "../../utils";

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
 * If the given node is an "experiment definition" this function returns the
 * experiment definition as a JS object.
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
 *
 * Here's a yaml representation of the AST:
 *
 * ```yaml
 * node: AssignmentExpression
 *   left: MemberExpression
 *     property: Identifier
 *       name: "Experiments"
 *   right: ObjectExpression
 *     properties:
 *       [...]: Property
 *         value: Literal
 *           value: string // ID of the experiment, kind, label, etc unknown
 *   right: CallExpression
 *     callee: MemberExpression
 *       object: Identifier
 *         name: "Object"
 *       property: Identifier
 *         name: "freeze"
 *     arguments:
 *       [0]: ObjectExpression
 *         properties:
 *           [...]: Property
 *             value: Literal
 *               value: string // ID of the experiment, kind, label, etc unknown
 * node: CallExpression
 *   callee: SequenceExpression
 *     expressions:
 *       [0]: Literal
 *         value: 0
 *       [1]: MemberExpression
 *         property: Identifier
 *           name: "registerUserExperiment" | "registerGuildExperiment"
 *   arguments:
 *     [0]: ObjectExpression
 *       properties:
 *         [...]: Property
 *           key: Identifier
 *             name: "id"
 *           value: MemberExpression
 *             property: Identifier // ID of the experiment
 *         [...]: Property
 *           key: Identifier
 *             name: "title"
 *           value: Literal
 *             value: string // label of the experiment
 *         [...]: Property
 *           key: Identifier
 *             name: "description"
 *           // Descriptions can be mapped to top level description and
 *           // bucket/treatment description by
 *           // treatments = buckets.map((index) => descriptions.slice(descriptions.length - buckets.length)[index])
 *           value: ArrayExpression
 *             [...]: Literal
 *               value: string
 *         [...]: Property
 *           key: Identifier
 *             name: "buckets"
 *           value: ArrayExpression
 *             [...]: MemberExpression
 *               property: Identifier
 *                  // synonymous to treatment id
 *                  // "NOT_ELEGIBLE": -1
 *                  // "CONTROL": 0
 *                  // for others split at "_" and parse the last value as int
 *                  name: string
 * node: ObjectExpression
 *   [...]: Property
 *     key: Identifier
 *       name: "kind"
 *     value: Literal
 *       value: "user" | "guild"
 *   [...]: Property
 *     key: Identifier
 *       name: "id"
 *     value: Literal
 *       value: string // ID of the experiment
 *   [...]: Property
 *     key: Identifier
 *       name: "label"
 *     value: Literal
 *       value: string // Label (could be used as description too)
 *   [...]: Property
 *     key: Identifier
 *       name: "treatments"
 *     value: ArrayExpression
 *       [...]: ObjectExpression
 *         properties:
 *           [...]: Property
 *             key: Identifier
 *               name: "id"
 *             value: Literal
 *               value: number // Treatment ID
 *           [...]: Property
 *             key: Identifier
 *               name: "label"
 *             value: Literal
 *               value: string // Label of the treatment
 *           [...]: Property
 *             key: Identifier
 *               name: "config"
 *             value: AnyNode
 *   [...]: Property
 *     key: Identifier
 *       name: "defaultConfig"
 *     value: AnyNode
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

                if (descriptionSlice.length !== descriptions.length) {
                    definition.description = descriptions
                        .slice(0, descriptions.length - descriptionSlice.length)
                        .join("\n");
                }

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
