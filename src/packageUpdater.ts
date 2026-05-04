import { readFileSync, renameSync, writeFileSync } from "fs";
import { join } from "path";

const DEFAULT_TITLES: Record<string, string> = {
  "01": "user action 1",
  "02": "user action 2",
  "03": "user action 3",
  "04": "user action 4",
  "05": "user action 5",
  "06": "user action 6",
  "07": "user action 7",
  "08": "user action 8",
  "09": "user action 9",
  "10": "user action 0",
};

export function applyUserButtonName(
  buttonIndex: string,
  name: string | null | undefined,
  extensionPath: string
): void {
  const pkgPath = join(extensionPath, "package.json");
  const commandId = `ShortcutMenuBarPlus.userButton${buttonIndex}`;
  try {
    const pkgContent = readFileSync(pkgPath, "utf8") as string;
    const pkg = JSON.parse(pkgContent);
    const command = pkg.contributes?.commands?.find(
      (c: { command: string; title: string }) => c.command === commandId
    );

    if (!command) {
      console.warn(
        `[ShortcutMenuBarPlus] Command '${commandId}' not found in package.json.`
      );
      return;
    }

    command.title =
      name?.trim() ||
      DEFAULT_TITLES[buttonIndex] ||
      `user action ${Number.parseInt(buttonIndex, 10)}`;

    const tempPkgPath = `${pkgPath}.tmp`;
    writeFileSync(tempPkgPath, JSON.stringify(pkg, null, 2) + "\n", "utf8");
    renameSync(tempPkgPath, pkgPath);
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    console.error(
      `[ShortcutMenuBarPlus] Failed to update package command '${commandId}' (code=${err.code ?? "unknown"}, message=${err.message}).`,
      err
    );
    return;
  }
}
