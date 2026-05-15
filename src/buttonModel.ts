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
    defaultTitle: 'Format document with..',
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
    defaultTitle: 'Open command pallet',
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
    defaultTitle: 'open settings',
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
