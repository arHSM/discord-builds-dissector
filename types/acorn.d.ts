import { Options } from "acorn";
import { Program } from "./types/es2022";

declare module "acorn" {
    export function parse(input: string, options: Options): Program;
}
