import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import json from "@eslint/json";
import tsparser from "@typescript-eslint/parser";
import { defineConfig } from "eslint/config";
import obsidianmd from "eslint-plugin-obsidianmd";
import { PlainTextParser } from "./node_modules/eslint-plugin-obsidianmd/dist/lib/plainTextParser.js";

const tsconfigRootDir = dirname(fileURLToPath(import.meta.url));
const obsidianRecommended = obsidianmd.configs.recommended.map((config) => {
	if (config.rules?.["obsidianmd/validate-manifest"] && !config.files) {
		return {
			...config,
			files: ["**/*.ts", "**/*.tsx"],
		};
	}

	return config;
});

export default defineConfig([
	{
		ignores: [
			"node_modules/**",
			"main.js",
			"*.map",
		],
	},
	...obsidianRecommended,
	{
		files: ["**/*.ts"],
		languageOptions: {
			parser: tsparser,
			parserOptions: {
				project: "./tsconfig.json",
				tsconfigRootDir,
			},
		},
	},
	{
		files: ["manifest.json"],
		language: "json/json",
		plugins: {
			json,
			obsidianmd,
		},
		rules: {
			"no-irregular-whitespace": "off",
			"obsidianmd/validate-manifest": "error",
		},
	},
	{
		files: ["LICENSE"],
		languageOptions: {
			parser: PlainTextParser,
		},
		plugins: {
			obsidianmd,
		},
		rules: {
			"obsidianmd/validate-license": "error",
		},
	},
]);
