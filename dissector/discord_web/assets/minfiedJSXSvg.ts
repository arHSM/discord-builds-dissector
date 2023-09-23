import {
    CallExpression,
    ObjectExpression,
    Property,
} from "../../../types/es2022";
import {
    astToJS,
    isCallExpression,
    isConditionalExpression,
    isIdentifier,
    isLiteral,
    isObjectExpression,
    isProperty,
} from "../../utils";

export interface ReactElement {
    type: string;
    props: Record<string, any>;
    children: ReactElement[];
}

export function getMinfiedJSXSvg(node: CallExpression) {
    if (node.arguments.length >= 2 && isLiteral(node.arguments[0], "svg")) {
        const svg = resolveMinifiedJSXElement(node);

        // WHAT ARE WE EVEN DOING AT THIS POINT
        if (typeof svg === "undefined") return;

        if (
            svg.children.length > 0 &&
            (svg.children.every(el => el.type === "g")
                ? !svg.children.some(el => el.children.length === 0)
                : true)
        ) {
            if (!/\d+\s+\d+\s+\d+\s+\d+/.test(svg.props["viewBox"] as string)) {
                delete svg.props["viewBox"];
            }

            svg.props = {
                xlmns: "http://www.w3.org/2000/svg",
                ...svg.props,
                comment: "discord-builds-dissector",
            };

            return svg;
        }
    }
}

function resolveMinifiedJSXElement(node: CallExpression) {
    if (node.arguments.length >= 2 && isLiteral(node.arguments[0])) {
        const element: ReactElement = {
            type: node.arguments[0].value as string,
            props: {},
            children: [],
        };

        let propChildren: Property | undefined;

        switch (node.arguments[1].type) {
            case "ObjectExpression":
                element.props = astToJS(node.arguments[1], [
                    "children",
                ]) as Record<string, any>;

                propChildren = node.arguments[1].properties.find(
                    prop =>
                        isProperty(prop) && isIdentifier(prop.key, "children")
                ) as Property;

                break;
            case "CallExpression":
                const filtered = node.arguments[1].arguments.filter(arg =>
                    isObjectExpression(arg)
                ) as ObjectExpression[];

                if (filtered.length > 0) {
                    Object.assign(
                        element.props,
                        ...filtered.map(node => {
                            if (typeof propChildren === "undefined") {
                                propChildren = node.properties.find(
                                    prop =>
                                        isProperty(prop) &&
                                        isIdentifier(prop.key, "children")
                                ) as Property;
                            }

                            return astToJS(node, ["children"]);
                        })
                    );
                }

                break;
        }

        // Classnames are useless
        delete element.props["className"];

        // pre-swc children are passed as aruments
        // post-swc children are passed as props
        if (typeof propChildren !== "undefined") {
            switch (propChildren.value.type) {
                case "ArrayExpression":
                    for (const childElement of propChildren.value.elements) {
                        if (isCallExpression(childElement)) {
                            const child =
                                resolveMinifiedJSXElement(childElement);

                            if (typeof child !== "undefined") {
                                element.children.push(child);
                            }
                        }

                        if (isConditionalExpression(childElement)) {
                            for (const condChild of [
                                childElement.consequent,
                                childElement.alternate,
                            ]) {
                                if (isCallExpression(condChild)) {
                                    const child =
                                        resolveMinifiedJSXElement(condChild);

                                    if (typeof child !== "undefined") {
                                        element.children.push(child);
                                    }
                                }
                            }
                        }
                    }

                    break;
                case "CallExpression":
                    const singleChild = resolveMinifiedJSXElement(
                        propChildren.value
                    );

                    if (typeof singleChild !== "undefined") {
                        element.children.push(singleChild);
                    }
                    break;
            }
        } else {
            for (const arg of node.arguments.slice(2)) {
                if (isCallExpression(arg)) {
                    const child = resolveMinifiedJSXElement(arg);

                    if (typeof child !== "undefined") {
                        element.children.push(child);
                    }
                }
            }
        }

        return element;
    }
}
