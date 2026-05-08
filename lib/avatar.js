import { randomUUID } from "node:crypto";
import { readFile, unlink, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import ts from "typescript";

const tsModuleUrl = new URL("./avatar.ts", import.meta.url);
const tsModulePath = fileURLToPath(tsModuleUrl);
const source = await readFile(tsModulePath, "utf8");

const { outputText } = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.NodeNext,
    target: ts.ScriptTarget.ES2022,
    esModuleInterop: true,
  },
  fileName: tsModulePath,
});

const tempFilename = `.avatar.test-${process.pid}-${randomUUID()}.mjs`;
const tempFilePath = join(dirname(tsModulePath), tempFilename);
await writeFile(tempFilePath, outputText, "utf8");

let moduleNamespace;
try {
  moduleNamespace = await import(pathToFileURL(tempFilePath).href);
} finally {
  await unlink(tempFilePath).catch(() => {});
}

export const getInitials = moduleNamespace.getInitials;
export const getAvatarColor = moduleNamespace.getAvatarColor;
