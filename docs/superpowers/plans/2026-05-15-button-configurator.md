# Button Configurator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a primary graphical button configurator that manages editor title button order, visibility, and the existing 10 user button customizations.

**Architecture:** Add a typed button model and manifest-apply helpers, then wire them into extension activation and a webview configurator command. The webview edits one structured setting, while existing per-button settings remain legacy migration inputs.

**Tech Stack:** VS Code extension API, TypeScript, Node fs/path APIs, Jest, existing npm scripts.

---

## File Structure

- Create: `src/buttonModel.ts`
  - Owns canonical built-in/user button metadata, structured setting types, defaults, legacy migration, model normalization, and change detection.
- Create: `src/manifestUpdater.ts`
  - Owns atomic `package.json` rewrites for command titles and `contributes.menus["editor/title"]` group order.
- Create: `src/configuratorWebview.ts`
  - Owns the `Shortcut Menu Bar Plus: Configure Buttons` webview panel, HTML, message handling, save flow, reload prompt, and codicon list loading.
- Modify: `src/packageUpdater.ts`
  - Re-export or delegate user-button title application through `manifestUpdater.ts` so existing tests and startup behavior keep working.
- Modify: `src/extension.ts`
  - Register the configurator command, use the structured model when present, preserve legacy fallback, and centralize user-button execution lookup.
- Modify: `package.json`
  - Add `ShortcutMenuBarPlus.buttons` setting.
  - Add `ShortcutMenuBarPlus.configureButtons` command contribution.
  - Keep existing legacy settings.
- Modify: `README.md`
  - Document the graphical configurator as the primary management workflow.
- Modify: `help.md`
  - Document contributor touch points for canonical button metadata and the manifest updater.
- Create: `tests/buttonModel.test.ts`
  - Covers defaults, legacy migration, normalization, and change detection.
- Create: `tests/manifestUpdater.test.ts`
  - Covers package title/order rewrites and content preservation.
- Create: `tests/configuratorWebview.test.ts`
  - Covers HTML/message helpers that can be tested outside the extension host.
- Modify: `tests/packageUpdater.test.ts`
  - Keep compatibility coverage for `applyUserButtonName`.

## Task 1: Add Typed Button Model

**Files:**
- Create: `src/buttonModel.ts`
- Test: `tests/buttonModel.test.ts`

- [ ] **Step 1: Write failing tests for default model generation**

```ts
import {
  BUILTIN_BUTTONS,
  USER_BUTTONS,
  createDefaultButtonModel,
} from '../src/buttonModel';

describe('button model defaults', () => {
  it('contains all built-in buttons followed by all user button slots', () => {
    const model = createDefaultButtonModel();

    expect(model.map((entry) => entry.id)).toEqual([
      ...BUILTIN_BUTTONS.map((button) => button.id),
      ...USER_BUTTONS.map((button) => button.id),
    ]);
  });

  it('marks user buttons disabled by default with empty editable fields', () => {
    const userButton = createDefaultButtonModel().find(
      (entry) => entry.id === 'userButton10'
    );

    expect(userButton).toEqual({
      id: 'userButton10',
      type: 'user',
      enabled: false,
      command: '',
      label: '',
      icon: '',
    });
  });
});
```

- [ ] **Step 2: Run the failing tests**

Run: `npm test -- tests/buttonModel.test.ts`

Expected: FAIL because `src/buttonModel.ts` does not exist.

- [ ] **Step 3: Implement the initial model definitions**

Create `src/buttonModel.ts` with:

```ts
export type ButtonType = 'builtin' | 'user';

export interface BuiltinButtonDefinition {
  readonly id: string;
  readonly type: 'builtin';
  readonly commandId: string;
  readonly defaultTitle: string;
  readonly icon: { readonly dark: string; readonly light: string };
  readonly when: string;
  readonly defaultEnabled: boolean;
}

export interface UserButtonDefinition {
  readonly id: `userButton${string}`;
  readonly type: 'user';
  readonly commandId: string;
  readonly buttonIndex: string;
  readonly defaultTitle: string;
  readonly defaultEnabled: boolean;
}

export type ButtonDefinition = BuiltinButtonDefinition | UserButtonDefinition;

export interface BuiltinButtonEntry {
  readonly id: string;
  readonly type: 'builtin';
  readonly enabled: boolean;
}

export interface UserButtonEntry {
  readonly id: `userButton${string}`;
  readonly type: 'user';
  readonly enabled: boolean;
  readonly command: string;
  readonly label: string;
  readonly icon: string;
}

export type ButtonEntry = BuiltinButtonEntry | UserButtonEntry;

export const BUILTIN_BUTTONS: readonly BuiltinButtonDefinition[] = [
  { id: 'switchHeaderSource', type: 'builtin', commandId: 'ShortcutMenuBarPlus.switchHeaderSource', defaultTitle: 'Switch header source', icon: { dark: 'images/switch.svg', light: 'images/switch_light.svg' }, when: 'editorTextFocus', defaultEnabled: false },
  { id: 'navigateBack', type: 'builtin', commandId: 'ShortcutMenuBarPlus.navigateBack', defaultTitle: 'Navigate back', icon: { dark: 'images/triangle-left.svg', light: 'images/triangle-left_light.svg' }, when: '', defaultEnabled: true },
  { id: 'navigateForward', type: 'builtin', commandId: 'ShortcutMenuBarPlus.navigateForward', defaultTitle: 'Navigate forward', icon: { dark: 'images/triangle-right.svg', light: 'images/triangle-right_light.svg' }, when: '', defaultEnabled: true },
  { id: 'save', type: 'builtin', commandId: 'ShortcutMenuBarPlus.save', defaultTitle: 'Save active file', icon: { dark: 'images/save.svg', light: 'images/save_light.svg' }, when: '!isInDiffEditor && !markdownPreviewFocus', defaultEnabled: false },
  { id: 'beautify', type: 'builtin', commandId: 'ShortcutMenuBarPlus.beautify', defaultTitle: 'Beautify selection/file', icon: { dark: 'images/format.svg', light: 'images/format_light.svg' }, when: '!isInDiffEditor && !markdownPreviewFocus', defaultEnabled: true },
  { id: 'toggleRenderWhitespace', type: 'builtin', commandId: 'ShortcutMenuBarPlus.toggleRenderWhitespace', defaultTitle: 'Toggle render whitespace', icon: { dark: 'images/whitespace.svg', light: 'images/whitespace_light.svg' }, when: '', defaultEnabled: false },
  { id: 'openFilesList', type: 'builtin', commandId: 'ShortcutMenuBarPlus.openFilesList', defaultTitle: 'show opened files list', icon: { dark: 'images/list.svg', light: 'images/list_light.svg' }, when: '!isInDiffEditor && !markdownPreviewFocus', defaultEnabled: true },
  { id: 'toggleTerminal', type: 'builtin', commandId: 'ShortcutMenuBarPlus.toggleTerminal', defaultTitle: 'Toggle terminal', icon: { dark: 'images/terminal.svg', light: 'images/terminal_light.svg' }, when: '', defaultEnabled: true },
  { id: 'toggleActivityBar', type: 'builtin', commandId: 'ShortcutMenuBarPlus.toggleActivityBar', defaultTitle: 'Toggle activity bar', icon: { dark: 'images/activitybar.svg', light: 'images/activitybar_light.svg' }, when: '', defaultEnabled: false },
  { id: 'quickOpen', type: 'builtin', commandId: 'ShortcutMenuBarPlus.quickOpen', defaultTitle: 'Quick open', icon: { dark: 'images/files-search.svg', light: 'images/files-search_light.svg' }, when: '', defaultEnabled: false },
  { id: 'findReplace', type: 'builtin', commandId: 'ShortcutMenuBarPlus.findReplace', defaultTitle: 'Find replace', icon: { dark: 'images/find.svg', light: 'images/find_light.svg' }, when: '', defaultEnabled: false },
  { id: 'undo', type: 'builtin', commandId: 'ShortcutMenuBarPlus.undo', defaultTitle: 'Undo', icon: { dark: 'images/undo.svg', light: 'images/undo_light.svg' }, when: 'textInputFocus && !editorReadonly', defaultEnabled: false },
  { id: 'redo', type: 'builtin', commandId: 'ShortcutMenuBarPlus.redo', defaultTitle: 'Redo', icon: { dark: 'images/redo.svg', light: 'images/redo_light.svg' }, when: 'textInputFocus && !editorReadonly', defaultEnabled: false },
  { id: 'commentLine', type: 'builtin', commandId: 'ShortcutMenuBarPlus.commentLine', defaultTitle: 'Toggle line comment', icon: { dark: 'images/commentLine.svg', light: 'images/commentLine_light.svg' }, when: 'editorTextFocus && !editorReadonly', defaultEnabled: false },
  { id: 'saveAll', type: 'builtin', commandId: 'ShortcutMenuBarPlus.saveAll', defaultTitle: 'Save all', icon: { dark: 'images/saveAll.svg', light: 'images/saveAll_light.svg' }, when: '', defaultEnabled: false },
  { id: 'formatWith', type: 'builtin', commandId: 'ShortcutMenuBarPlus.formatWith', defaultTitle: 'Format selection/file with', icon: { dark: 'images/formatWith.svg', light: 'images/formatWith_light.svg' }, when: '!isInDiffEditor && !markdownPreviewFocus', defaultEnabled: false },
  { id: 'openFile', type: 'builtin', commandId: 'ShortcutMenuBarPlus.openFile', defaultTitle: 'Open file', icon: { dark: 'images/openFile.svg', light: 'images/openFile_light.svg' }, when: '', defaultEnabled: false },
  { id: 'newFile', type: 'builtin', commandId: 'ShortcutMenuBarPlus.newFile', defaultTitle: 'New file', icon: { dark: 'images/newFile.svg', light: 'images/newFile_light.svg' }, when: '', defaultEnabled: false },
  { id: 'goToDefinition', type: 'builtin', commandId: 'ShortcutMenuBarPlus.goToDefinition', defaultTitle: 'Go to definition', icon: { dark: 'images/goToDefinition.svg', light: 'images/goToDefinition_light.svg' }, when: 'editorHasDefinitionProvider && editorTextFocus && !isInEmbeddedEditor', defaultEnabled: false },
  { id: 'cut', type: 'builtin', commandId: 'ShortcutMenuBarPlus.cut', defaultTitle: 'Cut', icon: { dark: 'images/cut.svg', light: 'images/cut_light.svg' }, when: '', defaultEnabled: false },
  { id: 'copy', type: 'builtin', commandId: 'ShortcutMenuBarPlus.copy', defaultTitle: 'Copy', icon: { dark: 'images/copy.svg', light: 'images/copy_light.svg' }, when: '', defaultEnabled: false },
  { id: 'paste', type: 'builtin', commandId: 'ShortcutMenuBarPlus.paste', defaultTitle: 'Paste', icon: { dark: 'images/paste.svg', light: 'images/paste_light.svg' }, when: '', defaultEnabled: false },
  { id: 'compareWithSaved', type: 'builtin', commandId: 'ShortcutMenuBarPlus.compareWithSaved', defaultTitle: 'Compare with saved', icon: { dark: 'images/compareWithSaved.svg', light: 'images/compareWithSaved_light.svg' }, when: '', defaultEnabled: false },
  { id: 'showCommands', type: 'builtin', commandId: 'ShortcutMenuBarPlus.showCommands', defaultTitle: 'Show commands', icon: { dark: 'images/commands.svg', light: 'images/commands_light.svg' }, when: '', defaultEnabled: false },
  { id: 'startDebugging', type: 'builtin', commandId: 'ShortcutMenuBarPlus.startDebugging', defaultTitle: 'Start debugging', icon: { dark: 'images/debug.svg', light: 'images/debug_light.svg' }, when: 'debuggersAvailable && !inDebugMode', defaultEnabled: false },
  { id: 'indentLines', type: 'builtin', commandId: 'ShortcutMenuBarPlus.indentLines', defaultTitle: 'Indent lines', icon: { dark: 'images/indentLines.svg', light: 'images/indentLines_light.svg' }, when: '', defaultEnabled: false },
  { id: 'outdentLines', type: 'builtin', commandId: 'ShortcutMenuBarPlus.outdentLines', defaultTitle: 'Outdent lines', icon: { dark: 'images/outdentLines.svg', light: 'images/outdentLines_light.svg' }, when: '', defaultEnabled: false },
  { id: 'openSettings', type: 'builtin', commandId: 'ShortcutMenuBarPlus.openSettings', defaultTitle: 'Open settings', icon: { dark: 'images/openSettings.svg', light: 'images/openSettings_light.svg' }, when: '', defaultEnabled: false },
  { id: 'toggleWordWrap', type: 'builtin', commandId: 'ShortcutMenuBarPlus.toggleWordWrap', defaultTitle: 'Toggle word wrap', icon: { dark: 'images/wordWrap.svg', light: 'images/wordWrap_light.svg' }, when: '', defaultEnabled: false },
  { id: 'changeEncoding', type: 'builtin', commandId: 'ShortcutMenuBarPlus.changeEncoding', defaultTitle: 'Change encoding', icon: { dark: 'images/changeEncoding.svg', light: 'images/changeEncoding_light.svg' }, when: '', defaultEnabled: false },
  { id: 'powershellRestartSession', type: 'builtin', commandId: 'ShortcutMenuBarPlus.powershellRestartSession', defaultTitle: 'PowerShell restart session', icon: { dark: 'images/powershellrestart.svg', light: 'images/powershellrestart_light.svg' }, when: '', defaultEnabled: false },
] as const;

export const USER_BUTTONS: readonly UserButtonDefinition[] = Array.from(
  { length: 10 },
  (_, index): UserButtonDefinition => {
    const buttonNumber = index + 1;
    const buttonIndex = buttonNumber < 10 ? `0${buttonNumber}` : '10';
    const defaultTitle = buttonIndex === '10' ? 'user action 0' : `user action ${buttonNumber}`;
    return {
      id: `userButton${buttonIndex}`,
      type: 'user',
      commandId: `ShortcutMenuBarPlus.userButton${buttonIndex}`,
      buttonIndex,
      defaultTitle,
      defaultEnabled: false,
    };
  }
);

export function createDefaultButtonModel(): ButtonEntry[] {
  return [
    ...BUILTIN_BUTTONS.map((button): BuiltinButtonEntry => ({
      id: button.id,
      type: 'builtin',
      enabled: button.defaultEnabled,
    })),
    ...USER_BUTTONS.map((button): UserButtonEntry => ({
      id: button.id,
      type: 'user',
      enabled: button.defaultEnabled,
      command: '',
      label: '',
      icon: '',
    })),
  ];
}
```

- [ ] **Step 4: Run tests for Task 1**

Run: `npm test -- tests/buttonModel.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit Task 1**

```bash
git add src/buttonModel.ts tests/buttonModel.test.ts
git commit -m "feat: add button configuration model"
```

## Task 2: Add Legacy Migration and Normalization

**Files:**
- Modify: `src/buttonModel.ts`
- Modify: `tests/buttonModel.test.ts`

- [ ] **Step 1: Add failing tests for migration and normalization**

Append to `tests/buttonModel.test.ts`:

```ts
import {
  buildModelFromLegacySettings,
  normalizeButtonModel,
} from '../src/buttonModel';

describe('legacy migration', () => {
  it('uses existing built-in booleans and user button fields', () => {
    const model = buildModelFromLegacySettings((key) => {
      const values: Record<string, unknown> = {
        save: true,
        userButton01Command: 'workbench.action.tasks.runTask|Build',
        userButton01Name: 'Build',
        userButton01Icon: 'tools',
      };
      return values[key];
    });

    expect(model.find((entry) => entry.id === 'save')).toMatchObject({
      enabled: true,
    });
    expect(model.find((entry) => entry.id === 'userButton01')).toEqual({
      id: 'userButton01',
      type: 'user',
      enabled: true,
      command: 'workbench.action.tasks.runTask|Build',
      label: 'Build',
      icon: 'tools',
    });
  });

  it('keeps whitespace-only user button commands disabled', () => {
    const model = buildModelFromLegacySettings((key) =>
      key === 'userButton02Command' ? '   ' : undefined
    );

    expect(model.find((entry) => entry.id === 'userButton02')).toMatchObject({
      enabled: false,
      command: '',
    });
  });
});

describe('model normalization', () => {
  it('removes unknown entries, keeps first duplicate, and appends missing entries', () => {
    const normalized = normalizeButtonModel([
      { id: 'save', type: 'builtin', enabled: true },
      { id: 'unknown', type: 'builtin', enabled: true },
      { id: 'save', type: 'builtin', enabled: false },
      {
        id: 'userButton01',
        type: 'user',
        enabled: true,
        command: 'workbench.action.showCommands',
        label: 'Commands',
        icon: 'commands',
      },
    ]);

    expect(normalized[0]).toEqual({ id: 'save', type: 'builtin', enabled: true });
    expect(normalized[1]).toEqual({
      id: 'userButton01',
      type: 'user',
      enabled: true,
      command: 'workbench.action.showCommands',
      label: 'Commands',
      icon: 'commands',
    });
    expect(normalized.some((entry) => entry.id === 'unknown')).toBe(false);
    expect(normalized.filter((entry) => entry.id === 'save')).toHaveLength(1);
    expect(normalized.map((entry) => entry.id)).toContain('userButton10');
  });
});
```

- [ ] **Step 2: Run tests to verify failure**

Run: `npm test -- tests/buttonModel.test.ts`

Expected: FAIL because `buildModelFromLegacySettings` and `normalizeButtonModel` are not defined.

- [ ] **Step 3: Implement migration and normalization**

Add to `src/buttonModel.ts`:

```ts
type LegacyGetter = (key: string) => unknown;

const BUILTIN_BY_ID = new Map(BUILTIN_BUTTONS.map((button) => [button.id, button]));
const USER_BY_ID = new Map(USER_BUTTONS.map((button) => [button.id, button]));

function stringValue(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function booleanValue(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

export function buildModelFromLegacySettings(getLegacyValue: LegacyGetter): ButtonEntry[] {
  return [
    ...BUILTIN_BUTTONS.map((button): BuiltinButtonEntry => ({
      id: button.id,
      type: 'builtin',
      enabled: booleanValue(getLegacyValue(button.id), button.defaultEnabled),
    })),
    ...USER_BUTTONS.map((button): UserButtonEntry => {
      const command = stringValue(getLegacyValue(`${button.id}Command`));
      return {
        id: button.id,
        type: 'user',
        enabled: command.length > 0,
        command,
        label: stringValue(getLegacyValue(`${button.id}Name`)),
        icon: stringValue(getLegacyValue(`${button.id}Icon`)),
      };
    }),
  ];
}

export function normalizeButtonModel(entries: readonly ButtonEntry[]): ButtonEntry[] {
  const seen = new Set<string>();
  const normalized: ButtonEntry[] = [];

  for (const entry of entries) {
    if (seen.has(entry.id)) {
      continue;
    }

    const builtin = BUILTIN_BY_ID.get(entry.id);
    if (builtin && entry.type === 'builtin') {
      normalized.push({
        id: builtin.id,
        type: 'builtin',
        enabled: Boolean(entry.enabled),
      });
      seen.add(entry.id);
      continue;
    }

    const user = USER_BY_ID.get(entry.id);
    if (user && entry.type === 'user') {
      normalized.push({
        id: user.id,
        type: 'user',
        enabled: Boolean(entry.enabled) && stringValue(entry.command).length > 0,
        command: stringValue(entry.command),
        label: stringValue(entry.label),
        icon: stringValue(entry.icon),
      });
      seen.add(entry.id);
    }
  }

  for (const defaultEntry of createDefaultButtonModel()) {
    if (!seen.has(defaultEntry.id)) {
      normalized.push(defaultEntry);
    }
  }

  return normalized;
}
```

- [ ] **Step 4: Run tests for Task 2**

Run: `npm test -- tests/buttonModel.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit Task 2**

```bash
git add src/buttonModel.ts tests/buttonModel.test.ts
git commit -m "feat: migrate legacy button settings"
```

## Task 3: Add Manifest Updater

**Files:**
- Create: `src/manifestUpdater.ts`
- Modify: `src/packageUpdater.ts`
- Create: `tests/manifestUpdater.test.ts`
- Modify: `tests/packageUpdater.test.ts`

- [ ] **Step 1: Write failing tests for manifest rewriting**

Create `tests/manifestUpdater.test.ts`:

```ts
import * as fs from 'fs';
import * as path from 'path';
import { applyButtonManifest } from '../src/manifestUpdater';

jest.mock('fs');

const mockFs = fs as jest.Mocked<typeof fs>;

function makePackageJson(): string {
  return JSON.stringify(
    {
      unrelated: true,
      contributes: {
        commands: [
          { command: 'ShortcutMenuBarPlus.save', title: 'Save active file' },
          { command: 'ShortcutMenuBarPlus.navigateBack', title: 'Navigate back' },
          { command: 'ShortcutMenuBarPlus.userButton01', title: 'user action 1' },
        ],
        menus: {
          'editor/title': [
            {
              when: 'config.ShortcutMenuBarPlus.save',
              command: 'ShortcutMenuBarPlus.save',
              group: 'navigation@4',
            },
            {
              when: 'config.ShortcutMenuBarPlus.navigateBack',
              command: 'ShortcutMenuBarPlus.navigateBack',
              group: 'navigation@2',
            },
            {
              when: 'config.ShortcutMenuBarPlus.userButton01Command',
              command: 'ShortcutMenuBarPlus.userButton01',
              group: 'navigation@30',
            },
          ],
        },
      },
    },
    null,
    2
  );
}

describe('applyButtonManifest', () => {
  const extensionPath = '/fake/ext';

  beforeEach(() => {
    jest.clearAllMocks();
    (mockFs.readFileSync as jest.Mock).mockReturnValue(makePackageJson());
    (mockFs.writeFileSync as jest.Mock).mockImplementation(() => {});
    (mockFs.renameSync as jest.Mock).mockImplementation(() => {});
  });

  it('rewrites editor title order and user button title atomically', () => {
    applyButtonManifest(
      [
        { id: 'navigateBack', type: 'builtin', enabled: true },
        { id: 'save', type: 'builtin', enabled: true },
        {
          id: 'userButton01',
          type: 'user',
          enabled: true,
          command: 'workbench.action.showCommands',
          label: 'Commands',
          icon: 'commands',
        },
      ],
      extensionPath
    );

    expect(mockFs.writeFileSync).toHaveBeenCalledWith(
      path.join(extensionPath, 'package.json.tmp'),
      expect.any(String),
      'utf8'
    );
    expect(mockFs.renameSync).toHaveBeenCalledWith(
      path.join(extensionPath, 'package.json.tmp'),
      path.join(extensionPath, 'package.json')
    );

    const written = JSON.parse((mockFs.writeFileSync as jest.Mock).mock.calls[0][1]);
    expect(written.unrelated).toBe(true);
    expect(written.contributes.commands[2].title).toBe('Commands');
    expect(written.contributes.menus['editor/title']).toEqual([
      {
        when: 'config.ShortcutMenuBarPlus.navigateBack',
        command: 'ShortcutMenuBarPlus.navigateBack',
        group: 'navigation@1',
      },
      {
        when: 'config.ShortcutMenuBarPlus.save',
        command: 'ShortcutMenuBarPlus.save',
        group: 'navigation@2',
      },
      {
        when: 'config.ShortcutMenuBarPlus.userButton01Command',
        command: 'ShortcutMenuBarPlus.userButton01',
        group: 'navigation@3',
      },
    ]);
  });
});
```

- [ ] **Step 2: Run tests to verify failure**

Run: `npm test -- tests/manifestUpdater.test.ts`

Expected: FAIL because `src/manifestUpdater.ts` does not exist.

- [ ] **Step 3: Implement manifest updater**

Create `src/manifestUpdater.ts`:

```ts
import { readFileSync, renameSync, writeFileSync } from 'fs';
import { join } from 'path';
import {
  BUILTIN_BUTTONS,
  ButtonEntry,
  USER_BUTTONS,
  UserButtonEntry,
  normalizeButtonModel,
} from './buttonModel';

const DEFAULT_TITLES = new Map(USER_BUTTONS.map((button) => [button.id, button.defaultTitle]));
const COMMAND_BY_ID = new Map([
  ...BUILTIN_BUTTONS.map((button) => [button.id, button.commandId] as const),
  ...USER_BUTTONS.map((button) => [button.id, button.commandId] as const),
]);

interface PackageJson {
  contributes?: {
    commands?: Array<{ command: string; title?: string }>;
    menus?: Record<string, Array<{ command: string; when?: string; group?: string }>>;
  };
}

function titleForUserButton(entry: UserButtonEntry): string {
  return entry.label.trim() || DEFAULT_TITLES.get(entry.id) || entry.id;
}

export function applyButtonManifest(entries: readonly ButtonEntry[], extensionPath: string): boolean {
  const pkgPath = join(extensionPath, 'package.json');
  try {
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf8') as string) as PackageJson;
    const commands = pkg.contributes?.commands;
    const editorTitle = pkg.contributes?.menus?.['editor/title'];

    if (!commands || !editorTitle) {
      console.warn('[ShortcutMenuBarPlus] package.json is missing command or editor/title contributions.');
      return false;
    }

    const normalized = normalizeButtonModel(entries);
    const enabledCommandIds = new Set(
      normalized
        .filter((entry) => entry.enabled)
        .map((entry) => COMMAND_BY_ID.get(entry.id))
        .filter((commandId): commandId is string => Boolean(commandId))
    );
    const menuByCommand = new Map(editorTitle.map((menu) => [menu.command, menu]));
    const orderedMenus = normalized
      .filter((entry) => entry.enabled)
      .map((entry) => COMMAND_BY_ID.get(entry.id))
      .filter((commandId): commandId is string => Boolean(commandId))
      .map((commandId, index) => {
        const current = menuByCommand.get(commandId);
        return current ? { ...current, group: `navigation@${index + 1}` } : undefined;
      })
      .filter((menu): menu is { command: string; when?: string; group?: string } => Boolean(menu));

    const otherMenus = editorTitle.filter((menu) => !enabledCommandIds.has(menu.command));
    pkg.contributes!.menus!['editor/title'] = [...orderedMenus, ...otherMenus];

    for (const entry of normalized) {
      if (entry.type !== 'user') {
        continue;
      }
      const commandId = COMMAND_BY_ID.get(entry.id);
      const command = commands.find((candidate) => candidate.command === commandId);
      if (command) {
        command.title = titleForUserButton(entry);
      }
    }

    const tempPkgPath = `${pkgPath}.tmp`;
    writeFileSync(tempPkgPath, `${JSON.stringify(pkg, null, 2)}\n`, 'utf8');
    renameSync(tempPkgPath, pkgPath);
    return true;
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    console.error(
      `[ShortcutMenuBarPlus] Failed to update button manifest at '${pkgPath}' (code=${err.code ?? 'unknown'}, message=${err.message}).`,
      err
    );
    return false;
  }
}
```

- [ ] **Step 4: Delegate packageUpdater through manifest-compatible default title logic**

Modify `src/packageUpdater.ts` only if needed to keep `applyUserButtonName` behavior intact. If tests still pass without changes, leave it alone for this task.

- [ ] **Step 5: Run manifest and package updater tests**

Run: `npm test -- tests/manifestUpdater.test.ts tests/packageUpdater.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit Task 3**

```bash
git add src/manifestUpdater.ts src/packageUpdater.ts tests/manifestUpdater.test.ts tests/packageUpdater.test.ts
git commit -m "feat: apply button model to manifest"
```

## Task 4: Add Structured Setting and Configurator Command Contribution

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Add `ShortcutMenuBarPlus.buttons` setting**

In `package.json`, under `contributes.configuration[0].properties`, add:

```json
"ShortcutMenuBarPlus.buttons": {
  "title": "Buttons",
  "type": "array",
  "default": [],
  "markdownDescription": "Structured button configuration used by **Shortcut Menu Bar Plus: Configure Buttons**. Prefer the graphical configurator instead of editing this setting by hand.",
  "items": {
    "type": "object",
    "required": ["id", "type", "enabled"],
    "properties": {
      "id": {
        "type": "string"
      },
      "type": {
        "type": "string",
        "enum": ["builtin", "user"]
      },
      "enabled": {
        "type": "boolean"
      },
      "command": {
        "type": "string"
      },
      "label": {
        "type": "string"
      },
      "icon": {
        "type": "string"
      }
    }
  }
}
```

- [ ] **Step 2: Add configurator command contribution**

In `package.json`, under `contributes.commands`, add:

```json
{
  "command": "ShortcutMenuBarPlus.configureButtons",
  "title": "Shortcut Menu Bar Plus: Configure Buttons",
  "category": "Shortcut Menu Bar Plus"
}
```

- [ ] **Step 3: Run package JSON validation through compile**

Run: `npm run compile`

Expected: PASS with TypeScript compilation complete.

- [ ] **Step 4: Commit Task 4**

```bash
git add package.json
git commit -m "feat: contribute button configurator settings"
```

## Task 5: Integrate Structured Model in Extension Runtime

**Files:**
- Modify: `src/extension.ts`
- Modify: `src/buttonModel.ts`
- Test: `tests/buttonModel.test.ts`

- [ ] **Step 1: Add tests for retrieving user button commands from structured entries**

Append to `tests/buttonModel.test.ts`:

```ts
import { getUserButtonCommand } from '../src/buttonModel';

describe('user button command lookup', () => {
  it('returns the structured command for an enabled user button', () => {
    expect(
      getUserButtonCommand(
        [
          {
            id: 'userButton01',
            type: 'user',
            enabled: true,
            command: 'workbench.action.showCommands',
            label: 'Commands',
            icon: 'commands',
          },
        ],
        '01'
      )
    ).toBe('workbench.action.showCommands');
  });

  it('returns undefined for disabled or empty user buttons', () => {
    expect(
      getUserButtonCommand(
        [
          {
            id: 'userButton01',
            type: 'user',
            enabled: false,
            command: 'workbench.action.showCommands',
            label: 'Commands',
            icon: 'commands',
          },
        ],
        '01'
      )
    ).toBeUndefined();
  });
});
```

- [ ] **Step 2: Implement user button command lookup**

Add to `src/buttonModel.ts`:

```ts
export function getUserButtonCommand(
  entries: readonly ButtonEntry[],
  buttonIndex: string
): string | undefined {
  const id = `userButton${buttonIndex}`;
  const entry = normalizeButtonModel(entries).find(
    (candidate): candidate is UserButtonEntry =>
      candidate.type === 'user' && candidate.id === id
  );
  if (!entry?.enabled || entry.command.trim().length === 0) {
    return undefined;
  }
  return entry.command;
}
```

- [ ] **Step 3: Run model tests**

Run: `npm test -- tests/buttonModel.test.ts`

Expected: PASS.

- [ ] **Step 4: Update `src/extension.ts` imports**

Add:

```ts
import {
  ButtonEntry,
  buildModelFromLegacySettings,
  getUserButtonCommand,
  normalizeButtonModel,
} from "./buttonModel";
```

- [ ] **Step 5: Add a helper in `src/extension.ts` for current model resolution**

Place near local functions:

```ts
function getConfiguredButtons(): ButtonEntry[] {
  const config = workspace.getConfiguration("ShortcutMenuBarPlus");
  const configured = config.get<ButtonEntry[]>("buttons");
  if (Array.isArray(configured) && configured.length > 0) {
    return normalizeButtonModel(configured);
  }
  return buildModelFromLegacySettings((key) => config.get(key));
}
```

- [ ] **Step 6: Update user button command registration to use the model first**

Replace the current user button command lookup inside the `for (let index = 1; index <= 10; index++)` command callback with:

```ts
const configuredButtons = getConfiguredButtons();
const command =
  getUserButtonCommand(configuredButtons, printIndex) ??
  workspace
    .getConfiguration("ShortcutMenuBarPlus")
    .get<string>(`${action}Command`);

if (!command || command.trim().length === 0) {
  return;
}

const palettes = command.split(",");
executeNext(action, palettes, 0);
```

- [ ] **Step 7: Run compile**

Run: `npm run compile`

Expected: PASS.

- [ ] **Step 8: Commit Task 5**

```bash
git add src/extension.ts src/buttonModel.ts tests/buttonModel.test.ts
git commit -m "feat: read user buttons from structured model"
```

## Task 6: Apply Model Icons, Titles, and Order on Startup

**Files:**
- Modify: `src/extension.ts`
- Modify: `src/buttonModel.ts`
- Modify: `tests/buttonModel.test.ts`

- [ ] **Step 1: Add tests for reload-required change detection**

Append to `tests/buttonModel.test.ts`:

```ts
import { buttonModelNeedsReload } from '../src/buttonModel';

describe('buttonModelNeedsReload', () => {
  it('detects order changes', () => {
    expect(
      buttonModelNeedsReload(
        [
          { id: 'save', type: 'builtin', enabled: true },
          { id: 'navigateBack', type: 'builtin', enabled: true },
        ],
        [
          { id: 'navigateBack', type: 'builtin', enabled: true },
          { id: 'save', type: 'builtin', enabled: true },
        ]
      )
    ).toBe(true);
  });

  it('detects user icon and label changes', () => {
    expect(
      buttonModelNeedsReload(
        [
          {
            id: 'userButton01',
            type: 'user',
            enabled: true,
            command: 'a',
            label: 'A',
            icon: 'add',
          },
        ],
        [
          {
            id: 'userButton01',
            type: 'user',
            enabled: true,
            command: 'a',
            label: 'B',
            icon: 'beaker',
          },
        ]
      )
    ).toBe(true);
  });
});
```

- [ ] **Step 2: Implement reload detection**

Add to `src/buttonModel.ts`:

```ts
function reloadSignature(entries: readonly ButtonEntry[]): string {
  return normalizeButtonModel(entries)
    .map((entry) =>
      entry.type === 'user'
        ? `${entry.id}:${entry.enabled}:${entry.label}:${entry.icon}`
        : `${entry.id}:${entry.enabled}`
    )
    .join('|');
}

export function buttonModelNeedsReload(
  previous: readonly ButtonEntry[],
  next: readonly ButtonEntry[]
): boolean {
  return reloadSignature(previous) !== reloadSignature(next);
}
```

- [ ] **Step 3: Apply structured model on startup**

In `src/extension.ts`, replace the startup icon/name loop with logic that resolves the current model and applies user icons/titles plus manifest order:

```ts
const extensionPath = context.extensionPath;
const startupButtons = getConfiguredButtons();
for (const entry of startupButtons) {
  if (entry.type !== "user") {
    continue;
  }
  const buttonIndex = entry.id.replace("userButton", "");
  if (entry.icon) {
    try {
      applyUserButtonIcon(buttonIndex, entry.icon, extensionPath);
    } catch (error) {
      console.error(
        `[ShortcutMenuBarPlus] Failed to apply startup icon for ${entry.id}.`,
        error
      );
    }
  }
  try {
    applyUserButtonName(buttonIndex, entry.label || null, extensionPath);
  } catch (error) {
    console.error(
      `[ShortcutMenuBarPlus] Failed to apply startup name for ${entry.id}.`,
      error
    );
  }
}
```

Then import and call `applyButtonManifest(startupButtons, extensionPath)` after the loop.

- [ ] **Step 4: Keep legacy per-button change listener temporarily**

Do not remove the existing listener for `userButtonXXIcon` and `userButtonXXName` yet. It remains the compatibility path until the webview save flow is in place.

- [ ] **Step 5: Run tests and compile**

Run: `npm test -- tests/buttonModel.test.ts tests/manifestUpdater.test.ts tests/packageUpdater.test.ts`

Expected: PASS.

Run: `npm run compile`

Expected: PASS.

- [ ] **Step 6: Commit Task 6**

```bash
git add src/extension.ts src/buttonModel.ts tests/buttonModel.test.ts
git commit -m "feat: apply button model on startup"
```

## Task 7: Add Configurator Webview Helpers

**Files:**
- Create: `src/configuratorWebview.ts`
- Create: `tests/configuratorWebview.test.ts`

- [ ] **Step 1: Write failing tests for webview HTML generation**

Create `tests/configuratorWebview.test.ts`:

```ts
import { renderConfiguratorHtml } from '../src/configuratorWebview';

describe('renderConfiguratorHtml', () => {
  it('renders button rows, reload copy, and codicon picker controls', () => {
    const html = renderConfiguratorHtml({
      nonce: 'abc123',
      buttons: [
        { id: 'save', type: 'builtin', enabled: true },
        {
          id: 'userButton01',
          type: 'user',
          enabled: true,
          command: 'workbench.action.showCommands',
          label: 'Commands',
          icon: 'commands',
        },
      ],
      codicons: ['add', 'commands'],
    });

    expect(html).toContain('Shortcut Menu Bar Plus');
    expect(html).toContain('Reload VS Code to apply toolbar changes');
    expect(html).toContain('data-button-id="save"');
    expect(html).toContain('data-button-id="userButton01"');
    expect(html).toContain('commands');
  });
});
```

- [ ] **Step 2: Run tests to verify failure**

Run: `npm test -- tests/configuratorWebview.test.ts`

Expected: FAIL because `src/configuratorWebview.ts` does not exist.

- [ ] **Step 3: Implement initial render helper**

Create `src/configuratorWebview.ts` with:

```ts
import { commands, ExtensionContext, Uri, ViewColumn, WebviewPanel, window, workspace } from 'vscode';
import { readdirSync } from 'fs';
import { join, basename } from 'path';
import { applyUserButtonIcon } from './iconGenerator';
import { applyButtonManifest } from './manifestUpdater';
import {
  ButtonEntry,
  buildModelFromLegacySettings,
  buttonModelNeedsReload,
  normalizeButtonModel,
} from './buttonModel';

export interface ConfiguratorHtmlInput {
  readonly nonce: string;
  readonly buttons: readonly ButtonEntry[];
  readonly codicons: readonly string[];
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function buttonLabel(entry: ButtonEntry): string {
  if (entry.type === 'builtin') {
    return entry.id;
  }
  return entry.label || entry.id;
}

export function renderConfiguratorHtml(input: ConfiguratorHtmlInput): string {
  const rows = input.buttons
    .map(
      (entry) => `
        <li class="button-row" draggable="true" data-button-id="${escapeHtml(entry.id)}">
          <span class="drag-handle" title="Drag to reorder">::</span>
          <label>
            <input type="checkbox" class="enabled-toggle" ${entry.enabled ? 'checked' : ''}>
            <span>${escapeHtml(buttonLabel(entry))}</span>
          </label>
          <span class="button-type">${entry.type}</span>
          ${
            entry.type === 'user'
              ? `<input class="command-input" placeholder="Command" value="${escapeHtml(entry.command)}">
                 <input class="label-input" placeholder="Label" value="${escapeHtml(entry.label)}">
                 <input class="icon-input" placeholder="Codicon" value="${escapeHtml(entry.icon)}">`
              : ''
          }
        </li>`
    )
    .join('');

  const codiconOptions = input.codicons
    .map((icon) => `<option value="${escapeHtml(icon)}">${escapeHtml(icon)}</option>`)
    .join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Shortcut Menu Bar Plus</title>
  <style>
    body { font-family: var(--vscode-font-family); color: var(--vscode-foreground); background: var(--vscode-editor-background); padding: 16px; }
    .toolbar { display: flex; gap: 8px; margin-bottom: 12px; }
    .button-list { list-style: none; margin: 0; padding: 0; display: grid; gap: 6px; }
    .button-row { display: grid; grid-template-columns: 24px 1fr 80px; gap: 8px; align-items: center; padding: 8px; border: 1px solid var(--vscode-panel-border); }
    .button-row input[type="text"], .button-row input:not([type]) { width: 100%; }
    .reload-banner { display: none; margin-top: 12px; padding: 10px; border: 1px solid var(--vscode-notificationsWarningIcon-foreground); }
    .reload-banner.visible { display: block; }
  </style>
</head>
<body>
  <h1>Shortcut Menu Bar Plus</h1>
  <div class="toolbar">
    <button id="save">Save</button>
    <button id="reload">Reload Window</button>
  </div>
  <datalist id="codicons">${codiconOptions}</datalist>
  <ul class="button-list">${rows}</ul>
  <div id="reload-banner" class="reload-banner">Reload VS Code to apply toolbar changes. Use the Reload Window button after saving.</div>
  <script nonce="${escapeHtml(input.nonce)}">
    const vscode = acquireVsCodeApi();
    document.getElementById('save').addEventListener('click', () => vscode.postMessage({ type: 'save', buttons: [] }));
    document.getElementById('reload').addEventListener('click', () => vscode.postMessage({ type: 'reload' }));
  </script>
</body>
</html>`;
}
```

- [ ] **Step 4: Run webview tests**

Run: `npm test -- tests/configuratorWebview.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit Task 7**

```bash
git add src/configuratorWebview.ts tests/configuratorWebview.test.ts
git commit -m "feat: render button configurator webview"
```

## Task 8: Implement Configurator Save Flow and Register Command

**Files:**
- Modify: `src/configuratorWebview.ts`
- Modify: `src/extension.ts`
- Modify: `tests/configuratorWebview.test.ts`

- [ ] **Step 1: Add tests for codicon listing helper**

Append to `tests/configuratorWebview.test.ts`:

```ts
import { getCodiconNames } from '../src/configuratorWebview';

describe('getCodiconNames', () => {
  it('returns sorted svg basenames without extensions', () => {
    const names = getCodiconNames('/fake/ext', ['tools.svg', 'add.svg', 'README.md']);
    expect(names).toEqual(['add', 'tools']);
  });
});
```

- [ ] **Step 2: Implement codicon helper and panel command**

Add to `src/configuratorWebview.ts`:

```ts
export function getCodiconNames(
  extensionPath: string,
  fileNames = readdirSync(join(extensionPath, 'node_modules', '@vscode', 'codicons', 'src', 'icons'))
): string[] {
  return fileNames
    .filter((fileName) => fileName.endsWith('.svg'))
    .map((fileName) => basename(fileName, '.svg'))
    .sort((a, b) => a.localeCompare(b));
}

function currentButtons(): ButtonEntry[] {
  const config = workspace.getConfiguration('ShortcutMenuBarPlus');
  const configured = config.get<ButtonEntry[]>('buttons');
  if (Array.isArray(configured) && configured.length > 0) {
    return normalizeButtonModel(configured);
  }
  return buildModelFromLegacySettings((key) => config.get(key));
}

function nonce(): string {
  return Array.from({ length: 16 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
}

export function registerConfiguratorCommand(context: ExtensionContext): void {
  context.subscriptions.push(
    commands.registerCommand('ShortcutMenuBarPlus.configureButtons', () => {
      const panel = window.createWebviewPanel(
        'shortcutMenuBarPlusButtons',
        'Shortcut Menu Bar Plus Buttons',
        ViewColumn.One,
        { enableScripts: true, localResourceRoots: [Uri.file(context.extensionPath)] }
      );
      const before = currentButtons();
      panel.webview.html = renderConfiguratorHtml({
        nonce: nonce(),
        buttons: before,
        codicons: getCodiconNames(context.extensionPath),
      });
      panel.webview.onDidReceiveMessage(async (message: { type: string; buttons?: ButtonEntry[] }) => {
        if (message.type === 'reload') {
          await commands.executeCommand('workbench.action.reloadWindow');
          return;
        }
        if (message.type !== 'save' || !Array.isArray(message.buttons)) {
          return;
        }

        const next = normalizeButtonModel(message.buttons);
        await workspace
          .getConfiguration('ShortcutMenuBarPlus')
          .update('buttons', next, false);

        for (const entry of next) {
          if (entry.type === 'user' && entry.icon) {
            applyUserButtonIcon(entry.id.replace('userButton', ''), entry.icon, context.extensionPath);
          }
        }
        applyButtonManifest(next, context.extensionPath);

        if (buttonModelNeedsReload(before, next)) {
          const selection = await window.showInformationMessage(
            'Shortcut Menu Bar Plus button changes saved. Reload VS Code to apply toolbar order, labels, and icons.',
            'Reload Window'
          );
          if (selection === 'Reload Window') {
            await commands.executeCommand('workbench.action.reloadWindow');
          }
        }
      });
    })
  );
}
```

- [ ] **Step 3: Register configurator command in `src/extension.ts`**

Import:

```ts
import { registerConfiguratorCommand } from "./configuratorWebview";
```

Call near the top of `activate` after the release notification:

```ts
registerConfiguratorCommand(context);
```

- [ ] **Step 4: Run tests and compile**

Run: `npm test -- tests/configuratorWebview.test.ts tests/buttonModel.test.ts tests/manifestUpdater.test.ts`

Expected: PASS.

Run: `npm run compile`

Expected: PASS.

- [ ] **Step 5: Commit Task 8**

```bash
git add src/configuratorWebview.ts src/extension.ts tests/configuratorWebview.test.ts
git commit -m "feat: save button configurator changes"
```

## Task 9: Complete Webview Client Behavior

**Files:**
- Modify: `src/configuratorWebview.ts`
- Modify: `tests/configuratorWebview.test.ts`

- [ ] **Step 1: Add HTML tests for drag/drop and row serialization hooks**

Append to `tests/configuratorWebview.test.ts`:

```ts
describe('webview client script hooks', () => {
  it('includes drag, move, serialize, and save handlers', () => {
    const html = renderConfiguratorHtml({
      nonce: 'abc123',
      buttons: [],
      codicons: [],
    });

    expect(html).toContain('function serializeButtons()');
    expect(html).toContain("addEventListener('dragstart'");
    expect(html).toContain("addEventListener('drop'");
    expect(html).toContain("type: 'save'");
  });
});
```

- [ ] **Step 2: Replace the initial script with full client behavior**

Inside `renderConfiguratorHtml`, replace the `<script>` body with:

```js
const vscode = acquireVsCodeApi();
let draggedRow = null;

function serializeButtons() {
  return Array.from(document.querySelectorAll('.button-row')).map((row) => {
    const type = row.dataset.buttonType;
    const base = {
      id: row.dataset.buttonId,
      type,
      enabled: row.querySelector('.enabled-toggle').checked,
    };
    if (type !== 'user') {
      return base;
    }
    return {
      ...base,
      command: row.querySelector('.command-input').value,
      label: row.querySelector('.label-input').value,
      icon: row.querySelector('.icon-input').value,
    };
  });
}

for (const row of document.querySelectorAll('.button-row')) {
  row.addEventListener('dragstart', () => {
    draggedRow = row;
    row.classList.add('dragging');
  });
  row.addEventListener('dragend', () => {
    row.classList.remove('dragging');
    draggedRow = null;
  });
  row.addEventListener('dragover', (event) => {
    event.preventDefault();
  });
  row.addEventListener('drop', (event) => {
    event.preventDefault();
    if (!draggedRow || draggedRow === row) {
      return;
    }
    row.parentElement.insertBefore(draggedRow, row);
  });
}

document.getElementById('save').addEventListener('click', () => {
  vscode.postMessage({ type: 'save', buttons: serializeButtons() });
  document.getElementById('reload-banner').classList.add('visible');
});
document.getElementById('reload').addEventListener('click', () => {
  vscode.postMessage({ type: 'reload' });
});
```

Also add `data-button-type="${escapeHtml(entry.type)}"` to each row and set user icon inputs to `list="codicons"`.

- [ ] **Step 3: Run webview tests**

Run: `npm test -- tests/configuratorWebview.test.ts`

Expected: PASS.

- [ ] **Step 4: Commit Task 9**

```bash
git add src/configuratorWebview.ts tests/configuratorWebview.test.ts
git commit -m "feat: add configurator drag and save UI"
```

## Task 10: Documentation Updates

**Files:**
- Modify: `README.md`
- Modify: `help.md`

- [ ] **Step 1: Update README primary workflow**

In `README.md`, replace the settings-first customization wording with:

```md
## Configure buttons

Run `Shortcut Menu Bar Plus: Configure Buttons` from the Command Palette to manage the toolbar.

The configurator lets you:

- Enable or disable built-in and user buttons.
- Rearrange all toolbar buttons in one ordered list.
- Edit commands, labels, and codicons for the 10 user buttons.
- Search and preview codicons before assigning them to a user button.

After saving toolbar order, label, or icon changes, reload VS Code when prompted. VS Code applies editor title menu contributions during window load, so these toolbar changes are not visible until after reload.
```

- [ ] **Step 2: Update help.md contributor notes**

Add a section:

```md
## Button configurator architecture

Button metadata lives in `src/buttonModel.ts`.

When adding a built-in button:

1. Add its canonical entry to `BUILTIN_BUTTONS`.
2. Add the command contribution and editor/title menu contribution in `package.json`.
3. Register the command behavior in `src/extension.ts`.
4. Update tests for default model and manifest ordering.

The graphical configurator writes `ShortcutMenuBarPlus.buttons`. Legacy per-button settings remain for compatibility, but new user-facing customization should go through the configurator.
```

- [ ] **Step 3: Commit Task 10**

```bash
git add README.md help.md
git commit -m "docs: document button configurator workflow"
```

## Task 11: Final Validation

**Files:**
- No source files expected.

- [ ] **Step 1: Run focused Jest tests**

Run:

```bash
npm test -- tests/buttonModel.test.ts tests/manifestUpdater.test.ts tests/configuratorWebview.test.ts tests/packageUpdater.test.ts tests/iconGenerator.test.ts
```

Expected: PASS.

- [ ] **Step 2: Run full Jest suite**

Run: `npm test`

Expected: PASS.

- [ ] **Step 3: Run compile**

Run: `npm run compile`

Expected: PASS.

- [ ] **Step 4: Run lint**

Run: `npm run lint`

Expected: PASS. If ESLint reports pre-existing warnings outside touched files, record the exact output and do not hide it.

- [ ] **Step 5: Inspect final diff**

Run: `git diff main...HEAD --stat`

Expected: New model, manifest updater, configurator webview, tests, docs, and package contribution changes are present.

Run: `git diff main...HEAD -- package.json src tests README.md help.md`

Expected: No unrelated rewrites beyond the planned files.

- [ ] **Step 6: Commit any validation-only fixes**

If validation required small fixes, commit them:

```bash
git add package.json src tests README.md help.md
git commit -m "fix: polish button configurator validation"
```

Skip this commit if Step 1 through Step 5 required no changes.

## Self-Review Notes

- Spec coverage: Tasks cover primary command, webview configurator, reorder/enable controls, user button command/label/icon customization, structured model, legacy migration, manifest/menu order application, reload messaging, tests, and docs.
- Scope: The plan keeps the user button cap at 10 and does not customize built-in labels/icons.
- Known implementation risk: Native editor title menu behavior depends on VS Code re-reading manifest contributions on reload. The UI and docs must stay explicit that Save writes configuration and generated manifest data, while visible toolbar changes land after reload.
