import { readFileSync, writeFileSync } from "fs";
import { join } from "path";

export function applyUserButtonIcon(
  buttonIndex: string,
  iconName: string,
  extensionPath: string
): void {
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
  } catch {
    console.warn(
      `[ShortcutMenuBarPlus] Codicon '${iconName}' not found, leaving existing icon unchanged.`
    );
    return;
  }

  writeFileSync(
    join(extensionPath, "images", `userButton${buttonIndex}.svg`),
    generateSvg(codiconSvg, "#C5C5C5"),
    "utf8"
  );
  writeFileSync(
    join(extensionPath, "images", `userButton${buttonIndex}_light.svg`),
    generateSvg(codiconSvg, "#424242"),
    "utf8"
  );
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
