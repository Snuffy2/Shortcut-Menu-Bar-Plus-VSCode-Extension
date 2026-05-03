# User Button Icon & Name Selector Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `userButtonXXName` and `userButtonXXIcon` settings for all 10 user buttons, allowing users to set a custom tooltip/Command Palette name and pick a codicon icon from a dropdown in the Settings UI.

**Architecture:** On configuration change, the extension generates dark/light SVG files from the selected codicon's path data (overwriting `images/userButtonXX.svg`) and updates the matching command `title` in the extension's own `package.json`. Both changes require a window reload, disclosed in every affected setting description. On activation, the extension silently re-applies all settings to restore them after an extension update.

**Tech Stack:** TypeScript, VSCode Extension API (`workspace.onDidChangeConfiguration`, `window.showInformationMessage`), Node.js `fs`, `@vscode/codicons` (runtime dep), `jest` + `ts-jest` (test dev deps)

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `src/iconGenerator.ts` | Create | Reads a codicon SVG, generates dark+light SVG files for a user button |
| `src/packageUpdater.ts` | Create | Updates a user button command `title` in the extension's `package.json` |
| `src/extension.ts` | Modify | Imports and calls both modules on activate + config change |
| `package.json` | Modify | Adds `@vscode/codicons` dependency, jest scripts, 20 new settings (name+icon × 10 buttons) |
| `tsconfig.test.json` | Create | TypeScript config for test files (extends main tsconfig, relaxes `rootDir`) |
| `jest.config.js` | Create | Jest configuration using ts-jest |
| `tests/iconGenerator.test.ts` | Create | Unit tests for iconGenerator |
| `tests/packageUpdater.test.ts` | Create | Unit tests for packageUpdater |

---

## Task 1: Install dependencies and set up test infrastructure

**Files:**
- Modify: `package.json`
- Create: `jest.config.js`
- Create: `tsconfig.test.json`

- [ ] **Step 1: Install @vscode/codicons as a runtime dependency**

```bash
npm install @vscode/codicons
```

Expected: `@vscode/codicons` appears in `dependencies` in `package.json`.

- [ ] **Step 2: Install jest and ts-jest as dev dependencies**

```bash
npm install --save-dev jest @types/jest ts-jest
```

Expected: `jest`, `@types/jest`, `ts-jest` appear in `devDependencies`.

- [ ] **Step 3: Add test scripts to package.json**

In `package.json`, inside `"scripts"`, add after `"compile"`:

```json
"test": "jest",
"test:watch": "jest --watch",
```

- [ ] **Step 4: Create jest.config.js**

Create `jest.config.js` at the project root:

```js
/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.ts'],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { tsconfig: 'tsconfig.test.json' }],
  },
};
```

- [ ] **Step 5: Create tsconfig.test.json**

Create `tsconfig.test.json` at the project root. The main `tsconfig.json` sets `rootDir: "src"`, which would reject test files. This separate config overrides that:

```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "rootDir": ".",
    "noImplicitAny": false
  },
  "include": ["src/**/*", "tests/**/*"]
}
```

- [ ] **Step 6: Verify test infrastructure works**

Create a temporary file `tests/smoke.test.ts`:

```ts
describe('smoke', () => {
  it('runs', () => {
    expect(1 + 1).toBe(2);
  });
});
```

Run:
```bash
npm test
```

Expected output:
```
PASS tests/smoke.test.ts
  smoke
    ✓ runs (Xms)

Tests: 1 passed, 1 total
```

- [ ] **Step 7: Delete smoke test and commit**

```bash
rm tests/smoke.test.ts
git add package.json package-lock.json jest.config.js tsconfig.test.json
git commit -m "feat: add @vscode/codicons dependency and jest test infrastructure"
```

---

## Task 2: Create src/iconGenerator.ts (TDD)

**Files:**
- Create: `tests/iconGenerator.test.ts`
- Create: `src/iconGenerator.ts`

- [ ] **Step 1: Create tests/iconGenerator.test.ts with failing tests**

```ts
import * as fs from 'fs';
import * as path from 'path';
import { applyUserButtonIcon } from '../src/iconGenerator';

jest.mock('fs');

const mockFs = fs as jest.Mocked<typeof fs>;

const CODICON_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="16" height="16">' +
  '<path fill-rule="evenodd" clip-rule="evenodd" d="M8 1a7 7 0 100 14A7 7 0 008 1z"/>' +
  '</svg>';

describe('applyUserButtonIcon', () => {
  const extensionPath = '/fake/ext';

  beforeEach(() => {
    jest.clearAllMocks();
    (mockFs.readFileSync as jest.Mock).mockReturnValue(CODICON_SVG);
    (mockFs.writeFileSync as jest.Mock).mockImplementation(() => {});
  });

  it('reads the codicon SVG from the correct path', () => {
    applyUserButtonIcon('01', 'star', extensionPath);
    expect(mockFs.readFileSync).toHaveBeenCalledWith(
      path.join(extensionPath, 'node_modules', '@vscode', 'codicons', 'src', 'icons', 'star.svg'),
      'utf8'
    );
  });

  it('writes dark SVG with fill #C5C5C5 to images/userButtonXX.svg', () => {
    applyUserButtonIcon('01', 'star', extensionPath);
    const call = (mockFs.writeFileSync as jest.Mock).mock.calls.find(
      (c: unknown[]) => (c[0] as string).endsWith('userButton01.svg')
    );
    expect(call).toBeDefined();
    expect(call![1]).toContain('fill="#C5C5C5"');
    expect(call![2]).toBe('utf8');
  });

  it('writes light SVG with fill #424242 to images/userButtonXX_light.svg', () => {
    applyUserButtonIcon('01', 'star', extensionPath);
    const call = (mockFs.writeFileSync as jest.Mock).mock.calls.find(
      (c: unknown[]) => (c[0] as string).endsWith('userButton01_light.svg')
    );
    expect(call).toBeDefined();
    expect(call![1]).toContain('fill="#424242"');
    expect(call![2]).toBe('utf8');
  });

  it('uses correct file paths for button index 10', () => {
    applyUserButtonIcon('10', 'gear', extensionPath);
    expect(mockFs.writeFileSync).toHaveBeenCalledWith(
      path.join(extensionPath, 'images', 'userButton10.svg'),
      expect.any(String),
      'utf8'
    );
    expect(mockFs.writeFileSync).toHaveBeenCalledWith(
      path.join(extensionPath, 'images', 'userButton10_light.svg'),
      expect.any(String),
      'utf8'
    );
  });

  it('does not write files when codicon is not found, and logs a warning', () => {
    (mockFs.readFileSync as jest.Mock).mockImplementation(() => {
      throw new Error('ENOENT: no such file');
    });
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    applyUserButtonIcon('01', 'nonexistent-icon', extensionPath);

    expect(mockFs.writeFileSync).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('nonexistent-icon')
    );
    warnSpy.mockRestore();
  });

  it('strips existing fill attributes from the codicon SVG before adding new fill', () => {
    const svgWithFill =
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="16" height="16">' +
      '<path fill="#ff0000" d="M0 0h16v16H0z"/>' +
      '</svg>';
    (mockFs.readFileSync as jest.Mock).mockReturnValue(svgWithFill);

    applyUserButtonIcon('01', 'star', extensionPath);

    const darkCall = (mockFs.writeFileSync as jest.Mock).mock.calls.find(
      (c: unknown[]) => (c[0] as string).endsWith('userButton01.svg')
    );
    expect(darkCall![1]).not.toContain('fill="#ff0000"');
    expect(darkCall![1]).toContain('fill="#C5C5C5"');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail (module not found)**

```bash
npm test -- --testPathPattern=iconGenerator
```

Expected: FAIL with `Cannot find module '../src/iconGenerator'`

- [ ] **Step 3: Create src/iconGenerator.ts**

```ts
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
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test -- --testPathPattern=iconGenerator
```

Expected:
```
PASS tests/iconGenerator.test.ts
  applyUserButtonIcon
    ✓ reads the codicon SVG from the correct path
    ✓ writes dark SVG with fill #C5C5C5 to images/userButtonXX.svg
    ✓ writes light SVG with fill #424242 to images/userButtonXX_light.svg
    ✓ uses correct file paths for button index 10
    ✓ does not write files when codicon is not found, and logs a warning
    ✓ strips existing fill attributes from the codicon SVG before adding new fill

Tests: 6 passed, 6 total
```

- [ ] **Step 5: Commit**

```bash
git add src/iconGenerator.ts tests/iconGenerator.test.ts
git commit -m "feat: add iconGenerator to produce dark/light SVGs from codicons"
```

---

## Task 3: Create src/packageUpdater.ts (TDD)

**Files:**
- Create: `tests/packageUpdater.test.ts`
- Create: `src/packageUpdater.ts`

- [ ] **Step 1: Create tests/packageUpdater.test.ts with failing tests**

```ts
import * as fs from 'fs';
import * as path from 'path';
import { applyUserButtonName } from '../src/packageUpdater';

jest.mock('fs');

const mockFs = fs as jest.Mocked<typeof fs>;

function makePkg(title: string): string {
  return JSON.stringify(
    {
      contributes: {
        commands: [
          { command: 'ShortcutMenuBarPlus.userButton01', title },
          { command: 'ShortcutMenuBarPlus.userButton10', title: 'user action 0' },
        ],
      },
    },
    null,
    2
  );
}

describe('applyUserButtonName', () => {
  const extensionPath = '/fake/ext';

  beforeEach(() => {
    jest.clearAllMocks();
    (mockFs.readFileSync as jest.Mock).mockReturnValue(makePkg('user action 1'));
    (mockFs.writeFileSync as jest.Mock).mockImplementation(() => {});
  });

  it('reads package.json from extensionPath', () => {
    applyUserButtonName('01', 'My Button', extensionPath);
    expect(mockFs.readFileSync).toHaveBeenCalledWith(
      path.join(extensionPath, 'package.json'),
      'utf8'
    );
  });

  it('writes updated package.json with the custom name', () => {
    applyUserButtonName('01', 'My Button', extensionPath);
    const written = JSON.parse(
      (mockFs.writeFileSync as jest.Mock).mock.calls[0][1] as string
    );
    expect(written.contributes.commands[0].title).toBe('My Button');
  });

  it('resets to default title when name is null', () => {
    (mockFs.readFileSync as jest.Mock).mockReturnValue(makePkg('My Button'));
    applyUserButtonName('01', null, extensionPath);
    const written = JSON.parse(
      (mockFs.writeFileSync as jest.Mock).mock.calls[0][1] as string
    );
    expect(written.contributes.commands[0].title).toBe('user action 1');
  });

  it('resets to default title when name is empty string', () => {
    applyUserButtonName('01', '', extensionPath);
    const written = JSON.parse(
      (mockFs.writeFileSync as jest.Mock).mock.calls[0][1] as string
    );
    expect(written.contributes.commands[0].title).toBe('user action 1');
  });

  it('resets button 10 to "user action 0" when name is cleared', () => {
    (mockFs.readFileSync as jest.Mock).mockReturnValue(makePkg('custom'));
    applyUserButtonName('10', null, extensionPath);
    const written = JSON.parse(
      (mockFs.writeFileSync as jest.Mock).mock.calls[0][1] as string
    );
    const cmd = written.contributes.commands.find(
      (c: { command: string }) => c.command === 'ShortcutMenuBarPlus.userButton10'
    );
    expect(cmd.title).toBe('user action 0');
  });

  it('does not write when command is not found, and logs a warning', () => {
    (mockFs.readFileSync as jest.Mock).mockReturnValue(
      JSON.stringify({ contributes: { commands: [] } })
    );
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    applyUserButtonName('01', 'My Button', extensionPath);

    expect(mockFs.writeFileSync).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('userButton01')
    );
    warnSpy.mockRestore();
  });

  it('writes JSON with 2-space indentation', () => {
    applyUserButtonName('01', 'My Button', extensionPath);
    const raw = (mockFs.writeFileSync as jest.Mock).mock.calls[0][1] as string;
    expect(raw).toMatch(/^{\n  /);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test -- --testPathPattern=packageUpdater
```

Expected: FAIL with `Cannot find module '../src/packageUpdater'`

- [ ] **Step 3: Create src/packageUpdater.ts**

```ts
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
    name?.trim() || DEFAULT_TITLES[buttonIndex] || `user action ${parseInt(buttonIndex)}`;

  writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n", "utf8");
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test -- --testPathPattern=packageUpdater
```

Expected:
```
PASS tests/packageUpdater.test.ts
  applyUserButtonName
    ✓ reads package.json from extensionPath
    ✓ writes updated package.json with the custom name
    ✓ resets to default title when name is null
    ✓ resets to default title when name is empty string
    ✓ resets button 10 to "user action 0" when name is cleared
    ✓ does not write when command is not found, and logs a warning
    ✓ writes JSON with 2-space indentation

Tests: 7 passed, 7 total
```

- [ ] **Step 5: Run the full test suite to confirm nothing regressed**

```bash
npm test
```

Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/packageUpdater.ts tests/packageUpdater.test.ts
git commit -m "feat: add packageUpdater to write custom user button titles to package.json"
```

---

## Task 4: Add Name and Icon settings to package.json

**Files:**
- Modify: `package.json` (the `contributes.configuration.properties` section)

The `properties` object currently ends after `userButton10Command`. Add the following 20 new entries after `userButton10Command`. The icon enum is identical for all 10 buttons — only the title/description index changes.

The full icon enum value to use for all 10 buttons (copy this exactly once and re-use):

```json
["", "add", "archive", "arrow-down", "arrow-left", "arrow-right", "arrow-up",
 "beaker", "bell", "bell-slash", "bookmark", "bracket", "broadcast", "bug",
 "check", "check-all", "checklist",
 "chevron-down", "chevron-left", "chevron-right", "chevron-up",
 "circle-filled", "circle-outline", "circle-slash",
 "clear-all", "clippy", "close", "cloud", "cloud-download", "cloud-upload",
 "code", "coffee", "copy", "credit-card",
 "database", "debug", "debug-pause", "debug-restart", "debug-start",
 "debug-step-into", "debug-step-out", "debug-step-over", "debug-stop",
 "diff", "edit", "error", "extensions", "eye", "eye-closed",
 "file", "file-add", "file-code", "file-text", "filter", "find-replace",
 "flame", "folder", "folder-opened", "gear",
 "git-branch", "git-commit", "git-merge", "git-pull-request",
 "go-to-file", "graph", "heart", "info", "key", "layout",
 "light-bulb", "link", "link-external", "lock",
 "megaphone", "merge", "milestone", "new-file", "new-folder",
 "package", "paintcan", "pause", "pin", "pinned",
 "play", "play-circle", "plug", "plus", "pulse",
 "question", "radio-tower", "record", "redo", "refresh", "remove", "rocket",
 "run", "run-all", "save", "save-all", "search", "server", "settings-gear",
 "shield", "source-control", "split-horizontal", "split-vertical",
 "star", "star-full", "stop",
 "symbol-class", "symbol-field", "symbol-function", "symbol-interface",
 "symbol-key", "symbol-method", "symbol-namespace", "symbol-variable",
 "tag", "terminal", "terminal-bash", "tools", "trash", "type-hierarchy",
 "undo", "unlock", "vm", "wand", "warning", "watch", "wrench",
 "zap", "zoom-in", "zoom-out"]
```

- [ ] **Step 1: Add Name and Icon settings for buttons 01–05**

In `package.json`, after the `"ShortcutMenuBarPlus.userButton10Command"` block (which ends with `}`), add a comma and then these entries:

```json
"ShortcutMenuBarPlus.userButton01Name": {
  "title": "name",
  "type": "string",
  "default": "",
  "markdownDescription": "Display name for 'user button 1'. Appears as the toolbar tooltip and in the Command Palette. _Requires a window reload to take effect._"
},
"ShortcutMenuBarPlus.userButton01Icon": {
  "title": "icon",
  "type": "string",
  "default": "",
  "markdownDescription": "Codicon icon for 'user button 1'. _Requires a window reload to take effect._",
  "enum": ["", "add", "archive", "arrow-down", "arrow-left", "arrow-right", "arrow-up", "beaker", "bell", "bell-slash", "bookmark", "bracket", "broadcast", "bug", "check", "check-all", "checklist", "chevron-down", "chevron-left", "chevron-right", "chevron-up", "circle-filled", "circle-outline", "circle-slash", "clear-all", "clippy", "close", "cloud", "cloud-download", "cloud-upload", "code", "coffee", "copy", "credit-card", "database", "debug", "debug-pause", "debug-restart", "debug-start", "debug-step-into", "debug-step-out", "debug-step-over", "debug-stop", "diff", "edit", "error", "extensions", "eye", "eye-closed", "file", "file-add", "file-code", "file-text", "filter", "find-replace", "flame", "folder", "folder-opened", "gear", "git-branch", "git-commit", "git-merge", "git-pull-request", "go-to-file", "graph", "heart", "info", "key", "layout", "light-bulb", "link", "link-external", "lock", "megaphone", "merge", "milestone", "new-file", "new-folder", "package", "paintcan", "pause", "pin", "pinned", "play", "play-circle", "plug", "plus", "pulse", "question", "radio-tower", "record", "redo", "refresh", "remove", "rocket", "run", "run-all", "save", "save-all", "search", "server", "settings-gear", "shield", "source-control", "split-horizontal", "split-vertical", "star", "star-full", "stop", "symbol-class", "symbol-field", "symbol-function", "symbol-interface", "symbol-key", "symbol-method", "symbol-namespace", "symbol-variable", "tag", "terminal", "terminal-bash", "tools", "trash", "type-hierarchy", "undo", "unlock", "vm", "wand", "warning", "watch", "wrench", "zap", "zoom-in", "zoom-out"]
},
"ShortcutMenuBarPlus.userButton02Name": {
  "title": "name",
  "type": "string",
  "default": "",
  "markdownDescription": "Display name for 'user button 2'. Appears as the toolbar tooltip and in the Command Palette. _Requires a window reload to take effect._"
},
"ShortcutMenuBarPlus.userButton02Icon": {
  "title": "icon",
  "type": "string",
  "default": "",
  "markdownDescription": "Codicon icon for 'user button 2'. _Requires a window reload to take effect._",
  "enum": ["", "add", "archive", "arrow-down", "arrow-left", "arrow-right", "arrow-up", "beaker", "bell", "bell-slash", "bookmark", "bracket", "broadcast", "bug", "check", "check-all", "checklist", "chevron-down", "chevron-left", "chevron-right", "chevron-up", "circle-filled", "circle-outline", "circle-slash", "clear-all", "clippy", "close", "cloud", "cloud-download", "cloud-upload", "code", "coffee", "copy", "credit-card", "database", "debug", "debug-pause", "debug-restart", "debug-start", "debug-step-into", "debug-step-out", "debug-step-over", "debug-stop", "diff", "edit", "error", "extensions", "eye", "eye-closed", "file", "file-add", "file-code", "file-text", "filter", "find-replace", "flame", "folder", "folder-opened", "gear", "git-branch", "git-commit", "git-merge", "git-pull-request", "go-to-file", "graph", "heart", "info", "key", "layout", "light-bulb", "link", "link-external", "lock", "megaphone", "merge", "milestone", "new-file", "new-folder", "package", "paintcan", "pause", "pin", "pinned", "play", "play-circle", "plug", "plus", "pulse", "question", "radio-tower", "record", "redo", "refresh", "remove", "rocket", "run", "run-all", "save", "save-all", "search", "server", "settings-gear", "shield", "source-control", "split-horizontal", "split-vertical", "star", "star-full", "stop", "symbol-class", "symbol-field", "symbol-function", "symbol-interface", "symbol-key", "symbol-method", "symbol-namespace", "symbol-variable", "tag", "terminal", "terminal-bash", "tools", "trash", "type-hierarchy", "undo", "unlock", "vm", "wand", "warning", "watch", "wrench", "zap", "zoom-in", "zoom-out"]
},
"ShortcutMenuBarPlus.userButton03Name": {
  "title": "name",
  "type": "string",
  "default": "",
  "markdownDescription": "Display name for 'user button 3'. Appears as the toolbar tooltip and in the Command Palette. _Requires a window reload to take effect._"
},
"ShortcutMenuBarPlus.userButton03Icon": {
  "title": "icon",
  "type": "string",
  "default": "",
  "markdownDescription": "Codicon icon for 'user button 3'. _Requires a window reload to take effect._",
  "enum": ["", "add", "archive", "arrow-down", "arrow-left", "arrow-right", "arrow-up", "beaker", "bell", "bell-slash", "bookmark", "bracket", "broadcast", "bug", "check", "check-all", "checklist", "chevron-down", "chevron-left", "chevron-right", "chevron-up", "circle-filled", "circle-outline", "circle-slash", "clear-all", "clippy", "close", "cloud", "cloud-download", "cloud-upload", "code", "coffee", "copy", "credit-card", "database", "debug", "debug-pause", "debug-restart", "debug-start", "debug-step-into", "debug-step-out", "debug-step-over", "debug-stop", "diff", "edit", "error", "extensions", "eye", "eye-closed", "file", "file-add", "file-code", "file-text", "filter", "find-replace", "flame", "folder", "folder-opened", "gear", "git-branch", "git-commit", "git-merge", "git-pull-request", "go-to-file", "graph", "heart", "info", "key", "layout", "light-bulb", "link", "link-external", "lock", "megaphone", "merge", "milestone", "new-file", "new-folder", "package", "paintcan", "pause", "pin", "pinned", "play", "play-circle", "plug", "plus", "pulse", "question", "radio-tower", "record", "redo", "refresh", "remove", "rocket", "run", "run-all", "save", "save-all", "search", "server", "settings-gear", "shield", "source-control", "split-horizontal", "split-vertical", "star", "star-full", "stop", "symbol-class", "symbol-field", "symbol-function", "symbol-interface", "symbol-key", "symbol-method", "symbol-namespace", "symbol-variable", "tag", "terminal", "terminal-bash", "tools", "trash", "type-hierarchy", "undo", "unlock", "vm", "wand", "warning", "watch", "wrench", "zap", "zoom-in", "zoom-out"]
},
"ShortcutMenuBarPlus.userButton04Name": {
  "title": "name",
  "type": "string",
  "default": "",
  "markdownDescription": "Display name for 'user button 4'. Appears as the toolbar tooltip and in the Command Palette. _Requires a window reload to take effect._"
},
"ShortcutMenuBarPlus.userButton04Icon": {
  "title": "icon",
  "type": "string",
  "default": "",
  "markdownDescription": "Codicon icon for 'user button 4'. _Requires a window reload to take effect._",
  "enum": ["", "add", "archive", "arrow-down", "arrow-left", "arrow-right", "arrow-up", "beaker", "bell", "bell-slash", "bookmark", "bracket", "broadcast", "bug", "check", "check-all", "checklist", "chevron-down", "chevron-left", "chevron-right", "chevron-up", "circle-filled", "circle-outline", "circle-slash", "clear-all", "clippy", "close", "cloud", "cloud-download", "cloud-upload", "code", "coffee", "copy", "credit-card", "database", "debug", "debug-pause", "debug-restart", "debug-start", "debug-step-into", "debug-step-out", "debug-step-over", "debug-stop", "diff", "edit", "error", "extensions", "eye", "eye-closed", "file", "file-add", "file-code", "file-text", "filter", "find-replace", "flame", "folder", "folder-opened", "gear", "git-branch", "git-commit", "git-merge", "git-pull-request", "go-to-file", "graph", "heart", "info", "key", "layout", "light-bulb", "link", "link-external", "lock", "megaphone", "merge", "milestone", "new-file", "new-folder", "package", "paintcan", "pause", "pin", "pinned", "play", "play-circle", "plug", "plus", "pulse", "question", "radio-tower", "record", "redo", "refresh", "remove", "rocket", "run", "run-all", "save", "save-all", "search", "server", "settings-gear", "shield", "source-control", "split-horizontal", "split-vertical", "star", "star-full", "stop", "symbol-class", "symbol-field", "symbol-function", "symbol-interface", "symbol-key", "symbol-method", "symbol-namespace", "symbol-variable", "tag", "terminal", "terminal-bash", "tools", "trash", "type-hierarchy", "undo", "unlock", "vm", "wand", "warning", "watch", "wrench", "zap", "zoom-in", "zoom-out"]
},
"ShortcutMenuBarPlus.userButton05Name": {
  "title": "name",
  "type": "string",
  "default": "",
  "markdownDescription": "Display name for 'user button 5'. Appears as the toolbar tooltip and in the Command Palette. _Requires a window reload to take effect._"
},
"ShortcutMenuBarPlus.userButton05Icon": {
  "title": "icon",
  "type": "string",
  "default": "",
  "markdownDescription": "Codicon icon for 'user button 5'. _Requires a window reload to take effect._",
  "enum": ["", "add", "archive", "arrow-down", "arrow-left", "arrow-right", "arrow-up", "beaker", "bell", "bell-slash", "bookmark", "bracket", "broadcast", "bug", "check", "check-all", "checklist", "chevron-down", "chevron-left", "chevron-right", "chevron-up", "circle-filled", "circle-outline", "circle-slash", "clear-all", "clippy", "close", "cloud", "cloud-download", "cloud-upload", "code", "coffee", "copy", "credit-card", "database", "debug", "debug-pause", "debug-restart", "debug-start", "debug-step-into", "debug-step-out", "debug-step-over", "debug-stop", "diff", "edit", "error", "extensions", "eye", "eye-closed", "file", "file-add", "file-code", "file-text", "filter", "find-replace", "flame", "folder", "folder-opened", "gear", "git-branch", "git-commit", "git-merge", "git-pull-request", "go-to-file", "graph", "heart", "info", "key", "layout", "light-bulb", "link", "link-external", "lock", "megaphone", "merge", "milestone", "new-file", "new-folder", "package", "paintcan", "pause", "pin", "pinned", "play", "play-circle", "plug", "plus", "pulse", "question", "radio-tower", "record", "redo", "refresh", "remove", "rocket", "run", "run-all", "save", "save-all", "search", "server", "settings-gear", "shield", "source-control", "split-horizontal", "split-vertical", "star", "star-full", "stop", "symbol-class", "symbol-field", "symbol-function", "symbol-interface", "symbol-key", "symbol-method", "symbol-namespace", "symbol-variable", "tag", "terminal", "terminal-bash", "tools", "trash", "type-hierarchy", "undo", "unlock", "vm", "wand", "warning", "watch", "wrench", "zap", "zoom-in", "zoom-out"]
}
```

- [ ] **Step 2: Add Name and Icon settings for buttons 06–10**

Continue adding after the button 05 Icon entry:

```json
"ShortcutMenuBarPlus.userButton06Name": {
  "title": "name",
  "type": "string",
  "default": "",
  "markdownDescription": "Display name for 'user button 6'. Appears as the toolbar tooltip and in the Command Palette. _Requires a window reload to take effect._"
},
"ShortcutMenuBarPlus.userButton06Icon": {
  "title": "icon",
  "type": "string",
  "default": "",
  "markdownDescription": "Codicon icon for 'user button 6'. _Requires a window reload to take effect._",
  "enum": ["", "add", "archive", "arrow-down", "arrow-left", "arrow-right", "arrow-up", "beaker", "bell", "bell-slash", "bookmark", "bracket", "broadcast", "bug", "check", "check-all", "checklist", "chevron-down", "chevron-left", "chevron-right", "chevron-up", "circle-filled", "circle-outline", "circle-slash", "clear-all", "clippy", "close", "cloud", "cloud-download", "cloud-upload", "code", "coffee", "copy", "credit-card", "database", "debug", "debug-pause", "debug-restart", "debug-start", "debug-step-into", "debug-step-out", "debug-step-over", "debug-stop", "diff", "edit", "error", "extensions", "eye", "eye-closed", "file", "file-add", "file-code", "file-text", "filter", "find-replace", "flame", "folder", "folder-opened", "gear", "git-branch", "git-commit", "git-merge", "git-pull-request", "go-to-file", "graph", "heart", "info", "key", "layout", "light-bulb", "link", "link-external", "lock", "megaphone", "merge", "milestone", "new-file", "new-folder", "package", "paintcan", "pause", "pin", "pinned", "play", "play-circle", "plug", "plus", "pulse", "question", "radio-tower", "record", "redo", "refresh", "remove", "rocket", "run", "run-all", "save", "save-all", "search", "server", "settings-gear", "shield", "source-control", "split-horizontal", "split-vertical", "star", "star-full", "stop", "symbol-class", "symbol-field", "symbol-function", "symbol-interface", "symbol-key", "symbol-method", "symbol-namespace", "symbol-variable", "tag", "terminal", "terminal-bash", "tools", "trash", "type-hierarchy", "undo", "unlock", "vm", "wand", "warning", "watch", "wrench", "zap", "zoom-in", "zoom-out"]
},
"ShortcutMenuBarPlus.userButton07Name": {
  "title": "name",
  "type": "string",
  "default": "",
  "markdownDescription": "Display name for 'user button 7'. Appears as the toolbar tooltip and in the Command Palette. _Requires a window reload to take effect._"
},
"ShortcutMenuBarPlus.userButton07Icon": {
  "title": "icon",
  "type": "string",
  "default": "",
  "markdownDescription": "Codicon icon for 'user button 7'. _Requires a window reload to take effect._",
  "enum": ["", "add", "archive", "arrow-down", "arrow-left", "arrow-right", "arrow-up", "beaker", "bell", "bell-slash", "bookmark", "bracket", "broadcast", "bug", "check", "check-all", "checklist", "chevron-down", "chevron-left", "chevron-right", "chevron-up", "circle-filled", "circle-outline", "circle-slash", "clear-all", "clippy", "close", "cloud", "cloud-download", "cloud-upload", "code", "coffee", "copy", "credit-card", "database", "debug", "debug-pause", "debug-restart", "debug-start", "debug-step-into", "debug-step-out", "debug-step-over", "debug-stop", "diff", "edit", "error", "extensions", "eye", "eye-closed", "file", "file-add", "file-code", "file-text", "filter", "find-replace", "flame", "folder", "folder-opened", "gear", "git-branch", "git-commit", "git-merge", "git-pull-request", "go-to-file", "graph", "heart", "info", "key", "layout", "light-bulb", "link", "link-external", "lock", "megaphone", "merge", "milestone", "new-file", "new-folder", "package", "paintcan", "pause", "pin", "pinned", "play", "play-circle", "plug", "plus", "pulse", "question", "radio-tower", "record", "redo", "refresh", "remove", "rocket", "run", "run-all", "save", "save-all", "search", "server", "settings-gear", "shield", "source-control", "split-horizontal", "split-vertical", "star", "star-full", "stop", "symbol-class", "symbol-field", "symbol-function", "symbol-interface", "symbol-key", "symbol-method", "symbol-namespace", "symbol-variable", "tag", "terminal", "terminal-bash", "tools", "trash", "type-hierarchy", "undo", "unlock", "vm", "wand", "warning", "watch", "wrench", "zap", "zoom-in", "zoom-out"]
},
"ShortcutMenuBarPlus.userButton08Name": {
  "title": "name",
  "type": "string",
  "default": "",
  "markdownDescription": "Display name for 'user button 8'. Appears as the toolbar tooltip and in the Command Palette. _Requires a window reload to take effect._"
},
"ShortcutMenuBarPlus.userButton08Icon": {
  "title": "icon",
  "type": "string",
  "default": "",
  "markdownDescription": "Codicon icon for 'user button 8'. _Requires a window reload to take effect._",
  "enum": ["", "add", "archive", "arrow-down", "arrow-left", "arrow-right", "arrow-up", "beaker", "bell", "bell-slash", "bookmark", "bracket", "broadcast", "bug", "check", "check-all", "checklist", "chevron-down", "chevron-left", "chevron-right", "chevron-up", "circle-filled", "circle-outline", "circle-slash", "clear-all", "clippy", "close", "cloud", "cloud-download", "cloud-upload", "code", "coffee", "copy", "credit-card", "database", "debug", "debug-pause", "debug-restart", "debug-start", "debug-step-into", "debug-step-out", "debug-step-over", "debug-stop", "diff", "edit", "error", "extensions", "eye", "eye-closed", "file", "file-add", "file-code", "file-text", "filter", "find-replace", "flame", "folder", "folder-opened", "gear", "git-branch", "git-commit", "git-merge", "git-pull-request", "go-to-file", "graph", "heart", "info", "key", "layout", "light-bulb", "link", "link-external", "lock", "megaphone", "merge", "milestone", "new-file", "new-folder", "package", "paintcan", "pause", "pin", "pinned", "play", "play-circle", "plug", "plus", "pulse", "question", "radio-tower", "record", "redo", "refresh", "remove", "rocket", "run", "run-all", "save", "save-all", "search", "server", "settings-gear", "shield", "source-control", "split-horizontal", "split-vertical", "star", "star-full", "stop", "symbol-class", "symbol-field", "symbol-function", "symbol-interface", "symbol-key", "symbol-method", "symbol-namespace", "symbol-variable", "tag", "terminal", "terminal-bash", "tools", "trash", "type-hierarchy", "undo", "unlock", "vm", "wand", "warning", "watch", "wrench", "zap", "zoom-in", "zoom-out"]
},
"ShortcutMenuBarPlus.userButton09Name": {
  "title": "name",
  "type": "string",
  "default": "",
  "markdownDescription": "Display name for 'user button 9'. Appears as the toolbar tooltip and in the Command Palette. _Requires a window reload to take effect._"
},
"ShortcutMenuBarPlus.userButton09Icon": {
  "title": "icon",
  "type": "string",
  "default": "",
  "markdownDescription": "Codicon icon for 'user button 9'. _Requires a window reload to take effect._",
  "enum": ["", "add", "archive", "arrow-down", "arrow-left", "arrow-right", "arrow-up", "beaker", "bell", "bell-slash", "bookmark", "bracket", "broadcast", "bug", "check", "check-all", "checklist", "chevron-down", "chevron-left", "chevron-right", "chevron-up", "circle-filled", "circle-outline", "circle-slash", "clear-all", "clippy", "close", "cloud", "cloud-download", "cloud-upload", "code", "coffee", "copy", "credit-card", "database", "debug", "debug-pause", "debug-restart", "debug-start", "debug-step-into", "debug-step-out", "debug-step-over", "debug-stop", "diff", "edit", "error", "extensions", "eye", "eye-closed", "file", "file-add", "file-code", "file-text", "filter", "find-replace", "flame", "folder", "folder-opened", "gear", "git-branch", "git-commit", "git-merge", "git-pull-request", "go-to-file", "graph", "heart", "info", "key", "layout", "light-bulb", "link", "link-external", "lock", "megaphone", "merge", "milestone", "new-file", "new-folder", "package", "paintcan", "pause", "pin", "pinned", "play", "play-circle", "plug", "plus", "pulse", "question", "radio-tower", "record", "redo", "refresh", "remove", "rocket", "run", "run-all", "save", "save-all", "search", "server", "settings-gear", "shield", "source-control", "split-horizontal", "split-vertical", "star", "star-full", "stop", "symbol-class", "symbol-field", "symbol-function", "symbol-interface", "symbol-key", "symbol-method", "symbol-namespace", "symbol-variable", "tag", "terminal", "terminal-bash", "tools", "trash", "type-hierarchy", "undo", "unlock", "vm", "wand", "warning", "watch", "wrench", "zap", "zoom-in", "zoom-out"]
},
"ShortcutMenuBarPlus.userButton10Name": {
  "title": "name",
  "type": "string",
  "default": "",
  "markdownDescription": "Display name for 'user button 0 (10)'. Appears as the toolbar tooltip and in the Command Palette. _Requires a window reload to take effect._"
},
"ShortcutMenuBarPlus.userButton10Icon": {
  "title": "icon",
  "type": "string",
  "default": "",
  "markdownDescription": "Codicon icon for 'user button 0 (10)'. _Requires a window reload to take effect._",
  "enum": ["", "add", "archive", "arrow-down", "arrow-left", "arrow-right", "arrow-up", "beaker", "bell", "bell-slash", "bookmark", "bracket", "broadcast", "bug", "check", "check-all", "checklist", "chevron-down", "chevron-left", "chevron-right", "chevron-up", "circle-filled", "circle-outline", "circle-slash", "clear-all", "clippy", "close", "cloud", "cloud-download", "cloud-upload", "code", "coffee", "copy", "credit-card", "database", "debug", "debug-pause", "debug-restart", "debug-start", "debug-step-into", "debug-step-out", "debug-step-over", "debug-stop", "diff", "edit", "error", "extensions", "eye", "eye-closed", "file", "file-add", "file-code", "file-text", "filter", "find-replace", "flame", "folder", "folder-opened", "gear", "git-branch", "git-commit", "git-merge", "git-pull-request", "go-to-file", "graph", "heart", "info", "key", "layout", "light-bulb", "link", "link-external", "lock", "megaphone", "merge", "milestone", "new-file", "new-folder", "package", "paintcan", "pause", "pin", "pinned", "play", "play-circle", "plug", "plus", "pulse", "question", "radio-tower", "record", "redo", "refresh", "remove", "rocket", "run", "run-all", "save", "save-all", "search", "server", "settings-gear", "shield", "source-control", "split-horizontal", "split-vertical", "star", "star-full", "stop", "symbol-class", "symbol-field", "symbol-function", "symbol-interface", "symbol-key", "symbol-method", "symbol-namespace", "symbol-variable", "tag", "terminal", "terminal-bash", "tools", "trash", "type-hierarchy", "undo", "unlock", "vm", "wand", "warning", "watch", "wrench", "zap", "zoom-in", "zoom-out"]
}
```

- [ ] **Step 3: Validate package.json is valid JSON**

```bash
node -e "JSON.parse(require('fs').readFileSync('package.json','utf8')); console.log('valid')"
```

Expected: `valid`

- [ ] **Step 4: Compile to catch any TypeScript issues**

```bash
npm run compile
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add package.json
git commit -m "feat: add userButtonXXName and userButtonXXIcon settings for all 10 user buttons"
```

---

## Task 5: Wire activation re-apply in extension.ts

**Files:**
- Modify: `src/extension.ts`

- [ ] **Step 1: Add imports for the two new modules**

At the top of `src/extension.ts`, after the existing imports, add:

```ts
import { applyUserButtonIcon } from "./iconGenerator";
import { applyUserButtonName } from "./packageUpdater";
```

- [ ] **Step 2: Add the activation re-apply block**

In the `activate` function, after the line `context.subscriptions.push(disposableUserButtonCommand);` (the last line inside the `for` loop that registers user button commands, around line 233), add the following **after the closing brace of that for loop**:

```ts
// Re-apply user button icons and names from settings (restores after extension updates)
const extensionPath = context.extensionPath;
const startupConfig = workspace.getConfiguration("ShortcutMenuBarPlus");
for (let i = 1; i <= 10; i++) {
  const idx = i < 10 ? "0" + i : "" + i;
  const icon = startupConfig.get<string>(`userButton${idx}Icon`);
  const name = startupConfig.get<string>(`userButton${idx}Name`);
  if (icon) {
    applyUserButtonIcon(idx, icon, extensionPath);
  }
  if (name) {
    applyUserButtonName(idx, name, extensionPath);
  }
}
```

- [ ] **Step 3: Compile**

```bash
npm run compile
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/extension.ts
git commit -m "feat: re-apply user button icons and names on extension activation"
```

---

## Task 6: Wire configuration change listener in extension.ts

**Files:**
- Modify: `src/extension.ts`

- [ ] **Step 1: Add the onDidChangeConfiguration listener**

In `src/extension.ts`, at the end of the `activate` function (after the for loop added in Task 5, before the closing `}`), add:

```ts
// Listen for user button icon/name setting changes and prompt reload
context.subscriptions.push(
  workspace.onDidChangeConfiguration((e) => {
    const config = workspace.getConfiguration("ShortcutMenuBarPlus");
    let changed = false;

    for (let i = 1; i <= 10; i++) {
      const idx = i < 10 ? "0" + i : "" + i;

      if (e.affectsConfiguration(`ShortcutMenuBarPlus.userButton${idx}Icon`)) {
        const icon = config.get<string>(`userButton${idx}Icon`);
        if (icon) {
          applyUserButtonIcon(idx, icon, extensionPath);
        }
        changed = true;
      }

      if (e.affectsConfiguration(`ShortcutMenuBarPlus.userButton${idx}Name`)) {
        const name = config.get<string>(`userButton${idx}Name`) ?? null;
        applyUserButtonName(idx, name, extensionPath);
        changed = true;
      }
    }

    if (changed) {
      window
        .showInformationMessage(
          "User button settings updated. A window reload is required to apply changes.",
          "Reload Window"
        )
        .then((selection) => {
          if (selection === "Reload Window") {
            commands.executeCommand("workbench.action.reloadWindow");
          }
        });
    }
  })
);
```

- [ ] **Step 2: Compile**

```bash
npm run compile
```

Expected: no errors.

- [ ] **Step 3: Run all tests**

```bash
npm test
```

Expected: all tests pass (tests don't cover extension.ts wiring, but no regressions).

- [ ] **Step 4: Commit**

```bash
git add src/extension.ts
git commit -m "feat: prompt reload when user button icon or name settings change"
```

---

## Task 7: Verify codicon enum against installed package

The enum was written from memory. Some entries might not exist as SVG files in the installed `@vscode/codicons` package (e.g. `undo`, `wand`, `terminal-bash` may or may not be present). This task validates and prunes the list.

**Files:**
- Modify: `package.json` (remove any invalid enum entries)

- [ ] **Step 1: Run validation script inline**

```bash
node -e "
const fs = require('fs');
const path = require('path');
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const iconDir = path.join('node_modules', '@vscode', 'codicons', 'src', 'icons');
const enum01 = pkg.contributes.configuration[0].properties['ShortcutMenuBarPlus.userButton01Icon'].enum;
const missing = enum01.filter(name => name !== '' && !fs.existsSync(path.join(iconDir, name + '.svg')));
console.log('Missing icons:', missing.length ? missing.join(', ') : 'none');
"
```

Expected: either `Missing icons: none` or a list of names to remove.

- [ ] **Step 2: Remove any invalid names from all 10 icon enums in package.json**

For each name listed as missing in Step 1, remove it from the `enum` array in all 10 `userButtonXXIcon` settings. After editing, re-validate:

```bash
node -e "JSON.parse(require('fs').readFileSync('package.json','utf8')); console.log('valid')"
```

Expected: `valid`

- [ ] **Step 3: Commit if changes were made**

```bash
git add package.json
git commit -m "fix: remove unavailable codicon names from userButtonXXIcon enum"
```

If no changes were needed, skip this commit.

---

## Task 8: Manual integration test

- [ ] **Step 1: Open the Extension Development Host**

Press `F5` in VS Code (or use Run > Start Debugging). A new VS Code window opens with the extension loaded from source.

- [ ] **Step 2: Configure userButton01**

In the Extension Development Host, open Settings (`Cmd+,` / `Ctrl+,`) and search for `ShortcutMenuBarPlus userButton01`.

Set:
- `userButton01Command` → `workbench.action.files.save`
- `userButton01Name` → `Save File`
- `userButton01Icon` → `save`

Expected: info notification appears: _"User button settings updated. A window reload is required to apply changes."_ with a **Reload Window** button.

- [ ] **Step 3: Reload and verify**

Click **Reload Window** (or `Cmd+Shift+P` → "Developer: Reload Window").

Expected:
- A `save`-shaped icon appears in the editor title bar (where user button 1 would be)
- Hovering over the icon shows tooltip: **"Save File"**
- Opening Command Palette and searching "Save File" shows the user button 1 command

- [ ] **Step 4: Verify icon SVG was written**

In the terminal (not the Extension Development Host):

```bash
head -1 images/userButton01.svg
```

Expected: an SVG line beginning with `<svg xmlns=...` containing `fill="#C5C5C5"` and the path data from the `save` codicon.

```bash
head -1 images/userButton01_light.svg
```

Expected: same structure with `fill="#424242"`.

- [ ] **Step 5: Test clearing settings**

In the Extension Development Host Settings, clear `userButton01Name` (set to empty). Reload.

Expected: tooltip reverts to `"user action 1"`.

Clear `userButton01Icon` (set to empty). Reload.

Expected: the icon reverts to the original `userButton01.svg` — note: the SVG was already overwritten, so you may want to verify the file is regenerated from the default on a fresh install. For now, verify that no crash occurs and the extension activates cleanly.

- [ ] **Step 6: Test with a second button**

Set `userButton02Command` → `workbench.action.terminal.toggleTerminal`, `userButton02Name` → `Toggle Terminal`, `userButton02Icon` → `terminal`. Reload.

Expected: second user button icon shows a terminal icon, tooltip says `"Toggle Terminal"`.

- [ ] **Step 7: Final commit — bump version**

In `package.json`, increment `"version"` from `"3.1.0"` to `"3.2.0"`.

```bash
git add package.json
git commit -m "feat: release 3.2.0 — user button icon and name selector"
```
