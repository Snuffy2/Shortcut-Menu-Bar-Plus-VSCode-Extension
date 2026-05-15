import { readFileSync, writeFileSync } from "fs";
import { join } from "path";

const CODICON_NAME_PATTERN = /^[a-z0-9-]+$/;

export function applyUserButtonIcon(
  buttonIndex: string,
  iconName: string,
  extensionPath: string
): boolean {
  if (!isValidCodiconName(iconName)) {
    console.warn(
      `[ShortcutMenuBarPlus] Refusing invalid codicon name '${iconName}' for buttonIndex='${buttonIndex}'.`
    );
    return false;
  }

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

  return writeUserButtonIconFiles(
    buttonIndex,
    extensionPath,
    generateSvg(codiconSvg, "#C5C5C5"),
    generateSvg(codiconSvg, "#424242")
  );
}

function isValidCodiconName(iconName: string): boolean {
  return CODICON_NAME_PATTERN.test(iconName);
}

export function resetUserButtonIcon(
  buttonIndex: string,
  extensionPath: string
): boolean {
  const defaultPath = DEFAULT_USER_BUTTON_PATHS[buttonIndex];
  if (!defaultPath) {
    console.warn(
      `[ShortcutMenuBarPlus] Cannot reset icon for unsupported user button index '${buttonIndex}'.`
    );
    return false;
  }

  return writeUserButtonIconFiles(
    buttonIndex,
    extensionPath,
    generateDefaultSvg(defaultPath, "#c5c5c5"),
    generateDefaultSvg(defaultPath, "#424242")
  );
}

function generateSvg(codiconSvg: string, fill: string): string {
  const innerMatch = codiconSvg.match(/<svg[^>]*>([\s\S]*?)<\/svg>/);
  if (!innerMatch) {
    console.warn(
      "[ShortcutMenuBarPlus] Invalid codiconSvg input while generating user button icon; leaving original SVG content unchanged."
    );
    return codiconSvg;
  }

  const inner = innerMatch[1];

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

function writeUserButtonIconFiles(
  buttonIndex: string,
  extensionPath: string,
  darkSvg: string,
  lightSvg: string
): boolean {
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
    writeFileIfChanged(darkTargetPath, darkSvg);
    writeFileIfChanged(lightTargetPath, lightSvg);
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

function writeFileIfChanged(targetPath: string, content: string): void {
  try {
    if ((readFileSync(targetPath, "utf8") as string) === content) {
      return;
    }
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    if (err.code !== "ENOENT") {
      throw err;
    }
  }

  writeFileSync(targetPath, content, "utf8");
}

function generateDefaultSvg(pathData: string, fill: string): string {
  return (
    `<svg height="16" width="16" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">\n` +
    `    <path\n` +
    `        d="${pathData}"\n` +
    `        fill="${fill}" />\n` +
    `</svg>\n`
  );
}

const DEFAULT_USER_BUTTON_PATHS: Record<string, string> = {
  "01":
    "M376 512V0h-99.902l-3.56 9.932c-9.419 26.294-27.202 49.746-52.837 69.697-26.528 20.684-51.211 34.849-73.359 42.1L136 125.112v114.771l19.702-6.519c36.387-12.012 69.448-29.268 98.672-51.445V512z",
  "02":
    "M436.879 148.037C436.879 74.355 384.071 0 266.093 0 160.785 0 99.218 53.555 88.026 154.878l-1.67 15.103 124.336 12.114 1.025-15.439c3.545-53.467 28.286-60.674 52.031-60.674 32.285 0 48.647 16.348 48.647 48.589 0 94.33-216.104 166.375-235.43 340.774L75.121 512h361.758V394.893H265.082c54.405-60.11 171.797-126.067 171.797-246.856z",
  "03":
    "M363.395 231.083c33.926-25.107 51.079-56.792 51.079-94.526C414.474 69.921 353.742 0 252.096 0 93.62 0 84.466 144.392 80.988 151.117l118.74 19.087c1.679-4.734-1.149-65.142 49.658-65.142 45.748 0 47.476 48.183 27.715 67.441-13.91 13.568-22.534 11.392-65.405 14.78l-15.601 109.058c14.685-3.471 39.459-12.041 61.758-12.041 25.591 0 51.416 18.164 51.416 58.755 0 43.682-27.524 63.237-54.8 63.237-57.998 0-55.866-65.857-57.524-70.195L75.158 350.072C76.722 353.074 79.134 512 255.143 512c101.895 0 181.699-73.085 181.699-165.092 0-52.207-27.934-94.936-73.447-115.825z",
  "04":
    "M379.018 0H282.03L76 314.106v99.697h187.852V512h115.166v-98.196H436V303.267h-56.982zm-178.14 303.267 62.974-97.5v97.5z",
  "05":
    "M272.399 153.729c-15.044 0-30 2.227-44.722 6.621l7.72-42.524h178.606V0H139.201l-53.54 278.621 99.727 14.077c4.191-3.409 26.049-35.874 66.929-35.874 37.383 0 57.964 25.972 57.964 73.11 0 49.248-20.669 78.647-55.283 78.647-55.767 0-54.844-65.602-56.279-68.613L74.997 352.464C76.586 355.547 81.567 512 253.986 512c118.872 0 183.018-94.644 183.018-183.706-.001-114.609-82.808-174.565-164.605-174.565z",
  "06":
    "M207.528 187.158c6.797-50.501 21.724-82.211 58.418-82.211 16.025 0 34.995 4.49 39.39 39.523l1.816 14.535 122.314-12.844-2.798-15.76C412.094 48.163 355.595 0 271.674 0 145.492 0 76 92.76 76 259.368 76 421.631 142.138 512 262.24 512 364.545 512 436 439.315 436 336.665c-.015-146.489-147.158-200.781-228.472-149.507zm54.712 76.875c32.93 0 51.064 26.14 51.064 73.594 0 31.374-8.042 68.783-46.348 68.783-26.382 0-54.771-24.041-54.771-76.802.002-41.053 18.708-65.575 50.055-65.575z",
  "07":
    "M76 118.646h203.628C167.899 268.348 156.197 393.156 143.28 512h123.516c20.146-158.928 47.398-305.069 164.531-416.411L436 91.165V0H76z",
  "08":
    "M359.389 233.456C389.55 211.015 407 177.118 407 137.128 407 54.438 346.732 0 254.447 0 162.147 0 102 54.438 102 137.128c0 41.118 17.652 74.736 49.381 97.017C112.68 260.482 91 302.641 91 353.412 91 447.675 158.31 512 258.49 512 357.363 512 421 443.696 421 349.56c0-49.6-22.119-90.66-61.611-116.104zm-103.697 54.199c33.706 0 48.794 29.165 48.794 58.066 0 39.36-17.769 62.856-47.549 62.856-24.038 0-49.731-16.772-49.731-63.823 0-21.21 10.21-57.099 48.486-57.099zm-1.245-102.085c-25.254 0-39.155-14.927-39.155-42.041 0-25.723 14.985-41.074 40.093-41.074 24.316 0 38.833 15.234 38.833 40.752 0 27.319-14.121 42.363-39.771 42.363z",
  "09":
    "M250.023 0C156.391 0 91 72.528 91 174.936c0 109.849 74.678 169.116 144.932 169.116 23.306 0 44.297-5.977 62.783-17.827-5.83 45.059-18.442 80.435-50.83 80.435-39.824 0-33.909-47.047-36.753-53.848L97.328 365.937C101.89 375.973 94.972 512 241.439 512 357.235 512 421 419.418 421 253.114 421 90.531 360.282 0 250.023 0zm44.444 182.304c0 10.972-2.109 65.742-43.828 65.742-40.664 0-45.059-51.123-45.059-73.11 0-31.597 7.017-69.272 40.459-69.272 35.537-.001 48.428 45.834 48.428 76.64z",
  "10":
    "M256 0C146.518 0 91 86.518 91 255.194 91 318.461 91 512 256 512c109.482 0 165-86.737 165-255.839C421 86.854 365.482 0 256 0zm0 105.707c45.26 0 42.349 104.904 42.349 150.454 0 45.233 3.176 150.132-42.349 150.132-45.361 0-42.349-104.514-42.349-150.132 0-45.363-3.228-150.454 42.349-150.454z",
};
