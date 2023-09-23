import { Lottie, ReactElement } from "../../dissector/discord_web/assets";
import {
    ActionType,
    ExperimentDefinition,
} from "../../dissector/discord_web/metadata";

export interface WebManifest {
    build: {
        build_hash: string;
        build_number: number;
        global_env: Record<string, any>;
    };
    assets: {
        css_chunks: {
            primary: string | null;
            secondary: Record<string, string>;
        };
        js_chunks: {
            primary: {
                loader: string;
                class_mappings: string | null;
                vendor: string | null;
                main: string;
            };
            secondary: Record<string, string>;
        };
        cdn: {
            js: string[];
            css: string[];
        };
        minified_jsx_svg: ReactElement[];
        lottie: Lottie[];
    };
    metadata: {
        class_name_mappings: Record<string, string>;
        experiments: ExperimentDefinition[];
        strings: Record<string, string>;
        locale_strings: Record<string, Record<string, string>>;
        action_types: Record<string, ActionType["partialProps"]>;
        enums: {
            Endpoints: Record<string, string>;
            Routes: Record<string, string>;
            // TODO: Add more enums (flags, types, etc.)
        };
    };
    webpack_chunks: Record<
        string,
        {
            module_dependencies: Record<string, string[]>;
            required_chunks: number[];
            execute_modules: string | number[] | null;
        }
    >;
}
