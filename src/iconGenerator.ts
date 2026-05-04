import { readFileSync, writeFileSync } from "fs";
import { join } from "path";

export function applyUserButtonIcon(
  buttonIndex: string,
  iconName: string,
  extensionPath: string
): boolean {
  const iconPath = join(
    extensionPath,
    "node_modules",
    "@vscode",
    "codicons",
    "src",
    "icons",
    `${iconName}.svg`
  );

  let codiconSvg: string;
  try {
    codiconSvg = readFileSync(iconPath, "utf8") as string;
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    if (err.code === "ENOENT") {
      console.warn(
        `[ShortcutMenuBarPlus] Codicon '${iconName}' not found at '${iconPath}' (code=${err.code}, message=${err.message}), leaving existing icon unchanged.`
      );
      return false;
    }
    console.error(
      `[ShortcutMenuBarPlus] Failed to read codicon '${iconName}' at '${iconPath}' (code=${err.code ?? "unknown"}, message=${err.message}).`,
      err
    );
    return false;
  }

  const darkTargetPath = join(
    extensionPath,
    "images",
    `userButton${buttonIndex}.svg`
  );
  const lightTargetPath = join(
    extensionPath,
    "images",
    `userButton${buttonIndex}_light.svg`
  );

  try {
    writeFileSync(darkTargetPath, generateSvg(codiconSvg, "#C5C5C5"), "utf8");
    writeFileSync(lightTargetPath, generateSvg(codiconSvg, "#424242"), "utf8");
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    console.error(
      `[ShortcutMenuBarPlus] Failed to write generated icon files for buttonIndex='${buttonIndex}' under '${extensionPath}' (dark='${darkTargetPath}', light='${lightTargetPath}', code=${err.code ?? "unknown"}, message=${err.message}).`,
      err
    );
    return false;
  }

  return true;
}

function generateSvg(codiconSvg: string, fill: string): string {
  const innerMatch = codiconSvg.match(/<svg[^>]*>([\s\S]*?)<\/svg>/);
  const inner = innerMatch ? innerMatch[1] : "";

  const coloredInner = inner
    .replace(/\s*fill="[^"]*"/g, "")
    .replace(
      /<(path|circle|rect|polygon|polyline|line|ellipse)\b/g,
      `<$1 fill="${fill}"`
    );

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="16" height="16">` +
    coloredInner +
    `</svg>`
  );
}
