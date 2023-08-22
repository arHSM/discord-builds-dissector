import { Identifier, ObjectExpression, Property } from "../../types/es2022";
import {
    astToJS,
    checkElements,
    isArrayExpression,
    isIdentifier,
    isLiteral,
    isObjectExpression,
    isProperty,
} from "../utils";

export interface ExperimentDefinition {
    kind: "user" | "guild";
    id: string;
    label: string;
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
 * // 2016 - 2019
 * // [mention Experiments constant]
 *
 * // 2020
 * // [mention createExperiment and register{User|Guild}Experiment function usage]
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
export function getExperimentDefinition(node: ObjectExpression) {
    const definition: ExperimentDefinition = {
        // @ts-ignore
        kind: undefined,
        // @ts-ignore
        id: undefined,
        // @ts-ignore
        label: undefined,
        treatments: [],
        defaultConfig: undefined,
    };

    if (
        !checkElements(
            node.properties,
            (prop): prop is { key: Identifier } & Property =>
                isProperty(prop) && isIdentifier(prop.key)
        )
    )
        return;

    for (const prop of node.properties) {
        switch (prop.key.name) {
            case "kind":
                if (
                    (isLiteral(prop.value, "user") ||
                        isLiteral(prop.value, "guild")) &&
                    typeof prop.value.value === "string"
                ) {
                    definition.kind = prop.value.value as "user" | "guild";
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
                            properties: ({ key: Identifier } & Property)[];
                        } & ObjectExpression =>
                            isObjectExpression(elem) &&
                            checkElements(
                                elem.properties,
                                (
                                    prop
                                ): prop is { key: Identifier } & Property =>
                                    isProperty(prop) && isIdentifier(prop.key)
                            )
                    )
                ) {
                    for (const treatmentObj of prop.value.elements) {
                        const treatment: ExperimentDefinitionTreatment = {
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
                                        isLiteral(treatmentProp.value) &&
                                        typeof treatmentProp.value.value ===
                                            "number"
                                    ) {
                                        treatment.id =
                                            treatmentProp.value.value;
                                    }
                                    break;
                                case "label":
                                    if (
                                        isLiteral(treatmentProp.value) &&
                                        typeof treatmentProp.value.value ===
                                            "string"
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
                definition.defaultConfig = astToJS(prop.value) as Record<
                    string,
                    any
                >;
                break;
        }
    }

    if (
        typeof definition.kind === "undefined" ||
        typeof definition.id === "undefined" ||
        typeof definition.label === "undefined"
    )
        return;

    return definition;
}
