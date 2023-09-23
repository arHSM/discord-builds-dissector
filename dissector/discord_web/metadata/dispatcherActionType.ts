import {
    CallExpression,
    ObjectExpression,
    Property,
} from "../../../types/es2022";
import {
    isIdentifier,
    isMemberExpression,
    isObjectExpression,
    isProperty,
} from "../../utils";

type RecursiveRecord<T> = { [key: string]: RecursiveRecord<T> | null };

export interface ActionType {
    type: string;
    partialProps: RecursiveRecord<string | null>;
}

/**
 * If the given CallExpression node is a FluxDispatcher "dispatch call" this
 * function returns the experiment definition as a JS object.
 *
 * Here's what a "dispatch call" looks like:
 *
 * ```js
 * // 2016 - 2022 pre-swc
 * x.dispatch({
 *   type: y.ActionTypes.ACTION_TYPE,
 *   ... // props
 * })
 * x.dirtyDispatch({
 *   type: y.ActionTypes.ACTION_TYPE,
 *   ... // props
 * })
 *
 * // 2022 post-swc - current
 * x.dispatch({
 *   type: "ACTION_TYPE",
 *   ... // props
 * })
 * ```
 *
 * Here's a yaml representation of the AST:
 *
 * ```yaml
 * node: CallExpression
 *   callee: MemberExpression
 *     property: Identifier
 *       name: "dispatch" | "dirtyDispatch"
 *   arguments:
 *     [0]: ObjectExpression
 *       [...]: Property
 *         value: MemberExpression
 *           object: MemberExpression
 *             property: Identifier
 *               name: "ActionTypes"
 *           property: Identifier
 *             name: string // Name of the action type
 *         value: Literal
 *           vaue: string // Name of the action type
 *       // Rest of the properties are the props used in the payload
 * ```
 */
export function getDispatcherActionType(node: CallExpression) {
    const actionType: ActionType = {
        // @ts-ignore
        type: undefined,
        partialProps: {},
    };

    let typeProp: Property;

    // prettier-ignore
    if (
        isMemberExpression(node.callee) &&
        (isIdentifier(node.callee.property, "dispatch") || isIdentifier(node.callee.property, "dirtyDispatch")) &&
        node.arguments.length === 1 &&
        isObjectExpression(node.arguments[0]) &&
        (typeProp = node.arguments[0].properties.find(prop => isProperty(prop) && isIdentifier(prop.key, "type")) as Property)
    ) {
        switch (typeProp.value.type) {
            case "MemberExpression":
                if (
                    isMemberExpression(typeProp.value.object) &&
                    isIdentifier(typeProp.value.object.property, "ActionTypes") &&
                    isIdentifier(typeProp.value.property)
                ) {
                    actionType.type = typeProp.value.property.name
                }
                break;
            case "Literal":
                if (typeof typeProp.value.value === "string") {
                    actionType.type = typeProp.value.value;
                }
                break;
        }

        // Above switch could fail in populating the value in the case of
        // unexpected AST.
        if (typeof actionType.type === "undefined") {
            return;
        }

        for (const prop of node.arguments[0].properties) {
            if (isProperty(prop) && isIdentifier(prop.key)) {
                if (prop.key.name === "type") continue;

                actionType.partialProps[prop.key.name] = isObjectExpression(prop.value) ? dumpObjectProps(prop.value) : null;
            }
        }
    }

    if (typeof actionType.type !== "undefined") {
        return actionType;
    }
}

function dumpObjectProps(node: ObjectExpression) {
    const ret: RecursiveRecord<string | null> = {};

    for (const prop of node.properties) {
        if (isProperty(prop)) {
            let key;

            switch (prop.key.type) {
                case "Literal":
                    if (typeof prop.key.value === "string") {
                        key = prop.key.value;
                    }
                    break;
                case "Identifier":
                    key = prop.key.name;
                    break;
            }

            if (typeof key === "undefined") continue;

            ret[key] = isObjectExpression(prop.value)
                ? dumpObjectProps(prop.value)
                : null;
        }
    }

    return ret;
}
