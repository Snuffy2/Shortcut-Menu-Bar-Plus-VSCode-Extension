export type ButtonType = 'builtin' | 'user';

export interface BuiltinButtonDefinition {
  id: string;
  type: 'builtin';
  commandId: string;
  defaultTitle: string;
  defaultEnabled: boolean;
  icon?: string;
  when?: string;
}

export interface UserButtonDefinition {
  id: string;
  type: 'user';
  commandId: string;
  defaultTitle: string;
  defaultEnabled: boolean;
}

export type ButtonDefinition = BuiltinButtonDefinition | UserButtonDefinition;

export interface BuiltinButtonEntry {
  id: string;
  type: 'builtin';
  enabled: boolean;
}

export interface UserButtonEntry {
  id: string;
  type: 'user';
  enabled: boolean;
  command: string;
  label: string;
  icon: string;
}

export type ButtonEntry = BuiltinButtonEntry | UserButtonEntry;

export const BUILTIN_BUTTONS: BuiltinButtonDefinition[] = [
  {
    id: 'switchHeaderSource',
    type: 'builtin',
    commandId: 'ShortcutMenuBarPlus.switchHeaderSource',
    defaultTitle: 'Switch Header/Source',
    defaultEnabled: false,
  },
  {
    id: 'navigateBack',
    type: 'builtin',
    commandId: 'ShortcutMenuBarPlus.navigateBack',
    defaultTitle: 'Navigate back',
    defaultEnabled: true,
  },
  {
    id: 'navigateForward',
    type: 'builtin',
    commandId: 'ShortcutMenuBarPlus.navigateForward',
    defaultTitle: 'Navigate forward',
    defaultEnabled: true,
  },
  {
    id: 'save',
    type: 'builtin',
    commandId: 'ShortcutMenuBarPlus.save',
    defaultTitle: 'Save',
    defaultEnabled: false,
  },
  {
    id: 'beautify',
    type: 'builtin',
    commandId: 'ShortcutMenuBarPlus.beautify',
    defaultTitle: 'Beautify',
    defaultEnabled: true,
  },
  {
    id: 'toggleRenderWhitespace',
    type: 'builtin',
    commandId: 'ShortcutMenuBarPlus.toggleRenderWhitespace',
    defaultTitle: 'Toggle render whitespace',
    defaultEnabled: false,
  },
  {
    id: 'openFilesList',
    type: 'builtin',
    commandId: 'ShortcutMenuBarPlus.openFilesList',
    defaultTitle: 'Show opened files list',
    defaultEnabled: true,
  },
  {
    id: 'toggleTerminal',
    type: 'builtin',
    commandId: 'ShortcutMenuBarPlus.toggleTerminal',
    defaultTitle: 'Toggle terminal',
    defaultEnabled: true,
  },
  {
    id: 'toggleActivityBar',
    type: 'builtin',
    commandId: 'ShortcutMenuBarPlus.toggleActivityBar',
    defaultTitle: 'Toggle activity bar',
    defaultEnabled: false,
  },
  {
    id: 'quickOpen',
    type: 'builtin',
    commandId: 'ShortcutMenuBarPlus.quickOpen',
    defaultTitle: 'Quick open',
    defaultEnabled: false,
  },
  {
    id: 'findReplace',
    type: 'builtin',
    commandId: 'ShortcutMenuBarPlus.findReplace',
    defaultTitle: 'Find replace',
    defaultEnabled: false,
  },
  {
    id: 'undo',
    type: 'builtin',
    commandId: 'ShortcutMenuBarPlus.undo',
    defaultTitle: 'Undo',
    defaultEnabled: false,
  },
  {
    id: 'redo',
    type: 'builtin',
    commandId: 'ShortcutMenuBarPlus.redo',
    defaultTitle: 'Redo',
    defaultEnabled: false,
  },
  {
    id: 'commentLine',
    type: 'builtin',
    commandId: 'ShortcutMenuBarPlus.commentLine',
    defaultTitle: 'Toggle line comment',
    defaultEnabled: false,
  },
  {
    id: 'saveAll',
    type: 'builtin',
    commandId: 'ShortcutMenuBarPlus.saveAll',
    defaultTitle: 'Save all',
    defaultEnabled: false,
  },
  {
    id: 'formatWith',
    type: 'builtin',
    commandId: 'ShortcutMenuBarPlus.formatWith',
    defaultTitle: 'Format document with...',
    defaultEnabled: false,
  },
  {
    id: 'openFile',
    type: 'builtin',
    commandId: 'ShortcutMenuBarPlus.openFile',
    defaultTitle: 'Open file',
    defaultEnabled: false,
  },
  {
    id: 'newFile',
    type: 'builtin',
    commandId: 'ShortcutMenuBarPlus.newFile',
    defaultTitle: 'New file',
    defaultEnabled: false,
  },
  {
    id: 'goToDefinition',
    type: 'builtin',
    commandId: 'ShortcutMenuBarPlus.goToDefinition',
    defaultTitle: 'Go to definition',
    defaultEnabled: false,
  },
  {
    id: 'cut',
    type: 'builtin',
    commandId: 'ShortcutMenuBarPlus.cut',
    defaultTitle: 'Cut',
    defaultEnabled: false,
  },
  {
    id: 'copy',
    type: 'builtin',
    commandId: 'ShortcutMenuBarPlus.copy',
    defaultTitle: 'Copy',
    defaultEnabled: false,
  },
  {
    id: 'paste',
    type: 'builtin',
    commandId: 'ShortcutMenuBarPlus.paste',
    defaultTitle: 'Paste',
    defaultEnabled: false,
  },
  {
    id: 'compareWithSaved',
    type: 'builtin',
    commandId: 'ShortcutMenuBarPlus.compareWithSaved',
    defaultTitle: 'Compare with saved',
    defaultEnabled: false,
  },
  {
    id: 'showCommands',
    type: 'builtin',
    commandId: 'ShortcutMenuBarPlus.showCommands',
    defaultTitle: 'Open command palette',
    defaultEnabled: false,
  },
  {
    id: 'startDebugging',
    type: 'builtin',
    commandId: 'ShortcutMenuBarPlus.startDebugging',
    defaultTitle: 'Start debugging',
    defaultEnabled: false,
  },
  {
    id: 'indentLines',
    type: 'builtin',
    commandId: 'ShortcutMenuBarPlus.indentLines',
    defaultTitle: 'Indent lines',
    defaultEnabled: false,
  },
  {
    id: 'outdentLines',
    type: 'builtin',
    commandId: 'ShortcutMenuBarPlus.outdentLines',
    defaultTitle: 'Outdent lines',
    defaultEnabled: false,
  },
  {
    id: 'openSettings',
    type: 'builtin',
    commandId: 'ShortcutMenuBarPlus.openSettings',
    defaultTitle: 'Open settings',
    defaultEnabled: false,
  },
  {
    id: 'toggleWordWrap',
    type: 'builtin',
    commandId: 'ShortcutMenuBarPlus.toggleWordWrap',
    defaultTitle: 'Toggle word wrap',
    defaultEnabled: false,
  },
  {
    id: 'changeEncoding',
    type: 'builtin',
    commandId: 'ShortcutMenuBarPlus.changeEncoding',
    defaultTitle: 'Change file encoding',
    defaultEnabled: false,
  },
  {
    id: 'powershellRestartSession',
    type: 'builtin',
    commandId: 'ShortcutMenuBarPlus.powershellRestartSession',
    defaultTitle: 'Restart PowerShell session',
    defaultEnabled: false,
  },
];

export const USER_BUTTONS: UserButtonDefinition[] = [
  {
    id: 'userButton01',
    type: 'user',
    commandId: 'ShortcutMenuBarPlus.userButton01',
    defaultTitle: 'user action 1',
    defaultEnabled: false,
  },
  {
    id: 'userButton02',
    type: 'user',
    commandId: 'ShortcutMenuBarPlus.userButton02',
    defaultTitle: 'user action 2',
    defaultEnabled: false,
  },
  {
    id: 'userButton03',
    type: 'user',
    commandId: 'ShortcutMenuBarPlus.userButton03',
    defaultTitle: 'user action 3',
    defaultEnabled: false,
  },
  {
    id: 'userButton04',
    type: 'user',
    commandId: 'ShortcutMenuBarPlus.userButton04',
    defaultTitle: 'user action 4',
    defaultEnabled: false,
  },
  {
    id: 'userButton05',
    type: 'user',
    commandId: 'ShortcutMenuBarPlus.userButton05',
    defaultTitle: 'user action 5',
    defaultEnabled: false,
  },
  {
    id: 'userButton06',
    type: 'user',
    commandId: 'ShortcutMenuBarPlus.userButton06',
    defaultTitle: 'user action 6',
    defaultEnabled: false,
  },
  {
    id: 'userButton07',
    type: 'user',
    commandId: 'ShortcutMenuBarPlus.userButton07',
    defaultTitle: 'user action 7',
    defaultEnabled: false,
  },
  {
    id: 'userButton08',
    type: 'user',
    commandId: 'ShortcutMenuBarPlus.userButton08',
    defaultTitle: 'user action 8',
    defaultEnabled: false,
  },
  {
    id: 'userButton09',
    type: 'user',
    commandId: 'ShortcutMenuBarPlus.userButton09',
    defaultTitle: 'user action 9',
    defaultEnabled: false,
  },
  {
    id: 'userButton10',
    type: 'user',
    commandId: 'ShortcutMenuBarPlus.userButton10',
    defaultTitle: 'user action 0',
    defaultEnabled: false,
  },
];

export function createDefaultButtonModel(): ButtonEntry[] {
  const builtinEntries: BuiltinButtonEntry[] = BUILTIN_BUTTONS.map((button) => ({
    id: button.id,
    type: 'builtin',
    enabled: button.defaultEnabled,
  }));

  const userEntries: UserButtonEntry[] = USER_BUTTONS.map((button) => ({
    id: button.id,
    type: 'user',
    enabled: button.defaultEnabled,
    command: '',
    label: '',
    icon: '',
  }));

  return [...builtinEntries, ...userEntries];
}

export type LegacyGetter = (key: string) => unknown;

function booleanValue(value: unknown, fallbackValue: boolean): boolean {
  return typeof value === 'boolean' ? value : fallbackValue;
}

function stringValue(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

export function buildModelFromLegacySettings(
  getLegacyValue: LegacyGetter
): ButtonEntry[] {
  const entries: ButtonEntry[] = [];

  for (const button of BUILTIN_BUTTONS) {
    const enabled = booleanValue(getLegacyValue(button.id), button.defaultEnabled);
    entries.push({
      id: button.id,
      type: 'builtin',
      enabled,
    });
  }

  for (const button of USER_BUTTONS) {
    const command = stringValue(getLegacyValue(`${button.id}Command`));
    const label = stringValue(getLegacyValue(`${button.id}Name`));
    const icon = stringValue(getLegacyValue(`${button.id}Icon`));
    const enabled = command !== '';
    entries.push({
      id: button.id,
      type: 'user',
      enabled,
      command,
      label,
      icon,
    });
  }

  return entries;
}

export function normalizeButtonModel(entries: readonly unknown[]): ButtonEntry[] {
  const builtinById = new Map(BUILTIN_BUTTONS.map((button) => [button.id, button]));
  const userById = new Map(USER_BUTTONS.map((button) => [button.id, button]));
  const seen = new Set<string>();
  const normalizedEntries: ButtonEntry[] = [];

  for (const entry of entries) {
    if (!isRecord(entry) || typeof entry.type !== 'string' || typeof entry.id !== 'string') {
      continue;
    }
    if (seen.has(entry.id)) {
      continue;
    }

    if (
      entry.type === 'builtin' &&
      builtinById.has(entry.id)
    ) {
      const definition = builtinById.get(entry.id);
      if (definition) {
        seen.add(entry.id);
        normalizedEntries.push({
          id: definition.id,
          type: 'builtin',
          enabled: booleanValue(entry.enabled, definition.defaultEnabled),
        });
      }
      continue;
    }

    if (entry.type === 'user' && userById.has(entry.id)) {
      const definition = userById.get(entry.id);
      if (definition) {
        const command = stringValue(entry.command);
        const label = stringValue(entry.label);
        const icon = stringValue(entry.icon);
        const enabled =
          booleanValue(entry.enabled, definition.defaultEnabled) && command !== '';
        seen.add(entry.id);
        normalizedEntries.push({
          id: definition.id,
          type: 'user',
          enabled,
          command,
          label,
          icon,
        });
      }
    }
  }

  for (const button of BUILTIN_BUTTONS) {
    if (!seen.has(button.id)) {
      normalizedEntries.push({
        id: button.id,
        type: 'builtin',
        enabled: button.defaultEnabled,
      });
      seen.add(button.id);
    }
  }

  for (const button of USER_BUTTONS) {
    if (!seen.has(button.id)) {
      normalizedEntries.push({
        id: button.id,
        type: 'user',
        enabled: false,
        command: '',
        label: '',
        icon: '',
      });
      seen.add(button.id);
    }
  }

  return normalizedEntries;
}

export function buttonModelNeedsReload(
  previousModel: readonly unknown[],
  nextModel: readonly unknown[]
): boolean {
  const previous = normalizeButtonModel(previousModel);
  const next = normalizeButtonModel(nextModel);

  if (previous.length !== next.length) {
    return true;
  }

  for (let index = 0; index < previous.length; index += 1) {
    const previousEntry = previous[index];
    const nextEntry = next[index];

    if (previousEntry.id !== nextEntry.id) {
      return true;
    }

    if (previousEntry.enabled !== nextEntry.enabled) {
      return true;
    }

    if (previousEntry.type !== 'user' || nextEntry.type !== 'user') {
      continue;
    }

    if (previousEntry.label !== nextEntry.label) {
      return true;
    }

    if (previousEntry.icon !== nextEntry.icon) {
      return true;
    }
  }

  return false;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function getUserButtonCommand(
  entries: readonly unknown[],
  buttonIndex: number | string
): string | undefined {
  const normalizedIndex = String(buttonIndex).padStart(2, '0');
  const normalizedEntries = normalizeButtonModel(entries);
  const command = normalizedEntries.find(
    (entry): entry is UserButtonEntry =>
      entry.type === 'user' &&
      entry.id === `userButton${normalizedIndex}` &&
      entry.enabled
  )?.command?.trim();

  if (!command) {
    return undefined;
  }

  return command;
}

export interface UserButtonCommandResolverInput {
  configuredButtons: readonly unknown[];
  hasStructuredButtons: boolean;
  legacyCommand?: string | undefined;
  buttonIndex: number | string;
}

export interface ButtonConfigInspection {
  defaultValue?: unknown;
  globalValue?: unknown;
  workspaceValue?: unknown;
  workspaceFolderValue?: unknown;
  globalLanguageValue?: unknown;
  workspaceLanguageValue?: unknown;
  workspaceFolderLanguageValue?: unknown;
}

export function hasStructuredButtonConfig(
  inspection: ButtonConfigInspection | undefined
): boolean {
  if (!inspection) {
    return false;
  }

  return [
    inspection.globalValue,
    inspection.workspaceValue,
    inspection.workspaceFolderValue,
    inspection.globalLanguageValue,
    inspection.workspaceLanguageValue,
    inspection.workspaceFolderLanguageValue,
  ].some((value) => Array.isArray(value));
}

export function resolveUserButtonCommand({
  configuredButtons,
  hasStructuredButtons,
  legacyCommand,
  buttonIndex,
}: UserButtonCommandResolverInput): string | undefined {
  if (hasStructuredButtons) {
    return getUserButtonCommand(configuredButtons, buttonIndex);
  }

  const candidate =
    legacyCommand?.trim() ?? getUserButtonCommand(configuredButtons, buttonIndex);
  return candidate === undefined || candidate === '' ? undefined : candidate;
}
