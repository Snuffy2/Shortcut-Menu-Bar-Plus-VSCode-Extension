import { readFileSync, writeFileSync } from "fs";
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
  const pkgContent = readFileSync(pkgPath, "utf8") as string;
  const pkg = JSON.parse(pkgContent);

  const commandId = `ShortcutMenuBarPlus.userButton${buttonIndex}`;
  const command = pkg.contributes.commands.find(
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
    `user action ${parseInt(buttonIndex)}`;

  writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n", "utf8");
}
