import { readFileSync, renameSync, writeFileSync } from "fs";
import { join } from "path";

import {
  BUILTIN_BUTTONS,
  ButtonEntry,
  USER_BUTTONS,
  normalizeButtonModel,
} from "./buttonModel";

type PackageManifest = {
  contributes?: {
    commands?: Array<{
      command: string;
      title: string;
      [key: string]: unknown;
    }>;
    menus?: {
      "editor/title"?: Array<{ [key: string]: unknown }>;
      [key: string]: unknown;
    };
    [key: string]: unknown;
  };
  [key: string]: unknown;
};

type ManifestMenuItem = {
  command?: string;
  [key: string]: unknown;
};

const MANAGED_BUTTONS = [...BUILTIN_BUTTONS, ...USER_BUTTONS];
const COMMAND_IDS = MANAGED_BUTTONS.map((button) => button.commandId);
const COMMAND_IDS_BY_ID = new Map<string, string>(
  MANAGED_BUTTONS.map((button) => [button.id, button.commandId])
);
const ID_BY_COMMAND = new Map<string, string>(
  MANAGED_BUTTONS.map((button) => [button.commandId, button.id])
);
const USER_BUTTON_BY_ID = new Map(USER_BUTTONS.map((button) => [button.id, button]));
const HIDDEN_WHEN = "false";
const ORIGINAL_WHEN_KEY = "shortcutMenuBarPlusOriginalWhen";
const MISSING_ORIGINAL_WHEN = "__shortcutMenuBarPlusMissingWhen__";

function asString(value: unknown): value is string {
  return typeof value === "string";
}

function findMissingManagedCommands(commands: Array<{ command?: unknown }>): string[] {
  return MANAGED_BUTTONS.filter(
    (button) => !commands.some((command) => asString(command.command) && command.command === button.commandId)
  ).map((button) => button.commandId);
}

function findMissingMenuContributions(menuItems: Array<{ command?: unknown }>): string[] {
  return COMMAND_IDS.filter(
    (commandId) =>
      !menuItems.some((menu) => asString(menu.command) && menu.command === commandId)
  );
}

function titleForUserButton(entry: ButtonEntry): string {
  if (entry.type !== "user") {
    return "";
  }

  return entry.label.trim() || USER_BUTTON_BY_ID.get(entry.id)?.defaultTitle || "";
}

function cloneMenuItem(item: { [key: string]: unknown }): ManifestMenuItem {
  return { ...(item as ManifestMenuItem) };
}

function isKnownCommand(commandId: unknown): commandId is string {
  return asString(commandId);
}

export function applyButtonManifest(
  entries: readonly ButtonEntry[],
  extensionPath: string
): boolean {
  const pkgPath = join(extensionPath, "package.json");

  try {
    const pkgContent = readFileSync(pkgPath, "utf8") as string;
    const pkg = JSON.parse(pkgContent) as PackageManifest;
    const commands = pkg.contributes?.commands;
    const editorTitleMenus = pkg.contributes?.menus?.["editor/title"];

    if (!Array.isArray(commands) || !Array.isArray(editorTitleMenus)) {
      console.warn(
        "[ShortcutMenuBarPlus] package.json is missing command or editor/title contributions."
      );
      return false;
    }

    const missingManagedCommands = findMissingManagedCommands(commands);
    const missingMenuContributions = findMissingMenuContributions(editorTitleMenus);
    if (missingManagedCommands.length > 0 || missingMenuContributions.length > 0) {
      const parts: string[] = [];
      if (missingManagedCommands.length > 0) {
        parts.push(`missingManagedCommands=[${missingManagedCommands.join(", ")}]`);
      }
      if (missingMenuContributions.length > 0) {
        parts.push(`missingEditorTitleCommands=[${missingMenuContributions.join(", ")}]`);
      }
      console.warn(
        `[ShortcutMenuBarPlus] package.json missing required managed manifest contributions. ${parts.join(" ")}`
      );
      return false;
    }

    const normalized = normalizeButtonModel(entries);
    const normalizedById = new Map(normalized.map((entry) => [entry.id, entry]));
    const menuByCommand = new Map<string, ManifestMenuItem>(
      editorTitleMenus
        .filter((menu): menu is ManifestMenuItem => asString(menu.command))
        .map((menu) => [menu.command as string, cloneMenuItem(menu)])
    );

    const managedMenusVisible: ManifestMenuItem[] = [];
    const managedMenusHidden: ManifestMenuItem[] = [];

    for (const entry of normalized) {
      const commandId = COMMAND_IDS_BY_ID.get(entry.id);
      if (!commandId) {
        continue;
      }

      const managedMenu = menuByCommand.get(commandId);
      if (!managedMenu) {
        continue;
      }

      const managedId = ID_BY_COMMAND.get(commandId) ?? "";
      const managedEntry = normalizedById.get(managedId);
      if (managedEntry?.enabled) {
        managedMenusVisible.push(
          manifestMenuWithGroup(manifestMenuWithEnabled(managedMenu), managedMenusVisible.length + 1)
        );
        continue;
      }

      managedMenusHidden.push(manifestMenuWithHiddenWhen(managedMenu));
    }

    managedMenusHidden.forEach((menu, index) => {
      menu.group = `navigation@${managedMenusVisible.length + index + 1}`;
    });

    const knownCommandIds = new Set(COMMAND_IDS);
    const unknownMenus = editorTitleMenus
      .filter((menu) => {
        const commandId = menu.command;
        return !isKnownCommand(commandId) || !knownCommandIds.has(commandId);
      })
      .map((menu) => cloneMenuItem(menu));

    pkg.contributes!.menus!["editor/title"] = [
      ...managedMenusVisible,
      ...managedMenusHidden,
      ...unknownMenus,
    ];

    for (const entry of normalized) {
      if (entry.type !== "user") {
        continue;
      }

      const commandId = COMMAND_IDS_BY_ID.get(entry.id);
      if (!commandId) {
        continue;
      }

      const command = commands.find((candidate) => candidate.command === commandId);
      if (!command) {
        continue;
      }

      command.title = titleForUserButton(entry);
    }

    const nextPkgContent = `${JSON.stringify(pkg, null, 2)}\n`;
    if (pkgContent === nextPkgContent) {
      return true;
    }

    const tempPkgPath = `${pkgPath}.tmp`;
    writeFileSync(tempPkgPath, nextPkgContent, "utf8");
    renameSync(tempPkgPath, pkgPath);
    return true;
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    console.error(
      `[ShortcutMenuBarPlus] Failed to update button manifest at '${pkgPath}' (code=${err.code ?? "unknown"}, message=${err.message}).`,
      err
    );
    return false;
  }
}

function manifestMenuWithGroup(menu: ManifestMenuItem, groupIndex: number): ManifestMenuItem {
  return {
    ...menu,
    group: `navigation@${groupIndex}`,
  };
}

function manifestMenuWithHiddenWhen(menu: ManifestMenuItem): ManifestMenuItem {
  const nextMenu = {
    ...menu,
  };
  if (!Object.prototype.hasOwnProperty.call(nextMenu, ORIGINAL_WHEN_KEY)) {
    if (Object.prototype.hasOwnProperty.call(nextMenu, "when")) {
      const currentWhen = nextMenu.when;
      nextMenu[ORIGINAL_WHEN_KEY] = asString(currentWhen)
        ? currentWhen
        : MISSING_ORIGINAL_WHEN;
    } else {
      nextMenu[ORIGINAL_WHEN_KEY] = MISSING_ORIGINAL_WHEN;
    }
  }

  return {
    ...nextMenu,
    when: HIDDEN_WHEN,
  };
}

function manifestMenuWithEnabled(menu: ManifestMenuItem): ManifestMenuItem {
  const nextMenu = {
    ...menu,
  };
  const managedId = asString(nextMenu.command)
    ? ID_BY_COMMAND.get(nextMenu.command)
    : undefined;

  if (Object.prototype.hasOwnProperty.call(nextMenu, ORIGINAL_WHEN_KEY)) {
    const originalWhen = nextMenu[ORIGINAL_WHEN_KEY];
    if (originalWhen === MISSING_ORIGINAL_WHEN) {
      delete nextMenu.when;
    } else if (asString(originalWhen)) {
      setEnabledWhen(nextMenu, originalWhen, managedId);
    }
    delete nextMenu[ORIGINAL_WHEN_KEY];
  } else if (asString(nextMenu.when)) {
    setEnabledWhen(nextMenu, nextMenu.when, managedId);
  }

  return nextMenu;
}

function setEnabledWhen(
  menu: ManifestMenuItem,
  originalWhen: string,
  managedId: string | undefined
): void {
  const enabledWhen = removeManagedVisibilityPredicate(originalWhen, managedId);
  if (enabledWhen) {
    menu.when = enabledWhen;
    return;
  }

  delete menu.when;
}

function removeManagedVisibilityPredicate(
  whenClause: string,
  managedId: string | undefined
): string | undefined {
  if (!managedId) {
    return whenClause;
  }

  const visibilityKey = managedId.startsWith("userButton")
    ? `${managedId}Command`
    : managedId;
  const legacyPredicate = `config.ShortcutMenuBarPlus.${visibilityKey}`;
  const predicates = whenClause
    .split(/\s*&&\s*/)
    .map((predicate) => predicate.trim())
    .filter((predicate) => predicate !== "" && predicate !== legacyPredicate);

  return predicates.length > 0 ? predicates.join(" && ") : undefined;
}
