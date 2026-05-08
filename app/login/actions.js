import { randomUUID } from "node:crypto";
import { readFile, unlink, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import ts from "typescript";

const tsModuleUrl = new URL("./actions.ts", import.meta.url);
const tsModulePath = fileURLToPath(tsModuleUrl);
const source = await readFile(tsModulePath, "utf8");

const { outputText } = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.NodeNext,
    target: ts.ScriptTarget.ES2022,
    esModuleInterop: true,
    jsx: ts.JsxEmit.ReactJSX,
  },
  fileName: tsModulePath,
});

const resolvedOutput = outputText.replace(
  /from "(\.\.?\/[^"\n]+)"/g,
  (fullMatch, specifier) => {
    if (/\.(?:[cm]?js|ts|tsx|json)$/.test(specifier)) {
      return fullMatch;
    }
    return fullMatch.replace(specifier, `${specifier}.js`);
  }
);

const tempFilename = `.actions.test-${process.pid}-${randomUUID()}.mjs`;
const tempFilePath = join(dirname(tsModulePath), tempFilename);
await writeFile(tempFilePath, resolvedOutput, "utf8");

let moduleNamespace;
try {
  moduleNamespace = await import(pathToFileURL(tempFilePath).href);
} finally {
  await unlink(tempFilePath).catch(() => {});
}

export const login = moduleNamespace.login;
export const signup = moduleNamespace.signup;
export const signout = moduleNamespace.signout;
export const verifyOtp = moduleNamespace.verifyOtp;
export const resendOtp = moduleNamespace.resendOtp;
export const sendPasswordResetLink = moduleNamespace.sendPasswordResetLink;
export const resetPassword = moduleNamespace.resetPassword;
export const completeProfile = moduleNamespace.completeProfile;
