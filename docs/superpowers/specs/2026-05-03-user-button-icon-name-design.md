# User Button Icon & Name Selector — Design Spec

**Date:** 2026-05-03
**Status:** Approved

## Problem

User buttons (01–10) currently have fixed, generic SVG icons (`userButton01.svg` … `userButton10.svg`) and fixed titles (`"user action 1"` … `"user action 0"`) defined statically in `package.json`. Users can only configure the command each button runs. There is no way to distinguish buttons visually or give them meaningful names.

## Goal

Allow users to assign a custom icon (from VSCode's built-in codicons) and a custom display name to each user button via the Settings UI. Both appear in the editor toolbar — the icon visually, the name as the tooltip and Command Palette entry.

## Approach

**Dynamic metadata via SVG file generation + `package.json` title update, both requiring a window reload.**

- Icons: generate dark/light SVG files from the selected codicon's path data and overwrite the existing `images/userButtonXX.svg` files.
- Names: update the `title` field of the matching command entry in the extension's own `package.json`.
- Both changes are re-applied silently on activation so extension updates don't permanently lose user settings.
- Reload is disclosed in the `markdownDescription` of every affected setting.

This approach was chosen over a purely-organizational name (no tooltip) and over a Webview-based toolbar rewrite.

---

## Settings

For each user button `XX` from `01` to `10`, two new settings are added alongside the existing `userButtonXXCommand`:

### `ShortcutMenuBarPlus.userButtonXXName`

| Field | Value |
|---|---|
| type | `string` |
| default | `null` |
| markdownDescription | Display name for User Button XX. Appears as the toolbar tooltip and in the Command Palette. _Requires a window reload to take effect._ |

### `ShortcutMenuBarPlus.userButtonXXIcon`

| Field | Value |
|---|---|
| type | `string` |
| default | `null` |
| enum | Curated list of ~120 codicon names (see below) |
| markdownDescription | Codicon icon for User Button XX. _Requires a window reload to take effect._ |

### Curated Codicon Enum

The enum covers commonly useful categories:

- **Actions:** `play`, `stop`, `debug-start`, `run`, `run-all`, `debug-pause`, `debug-stop`, `debug-restart`
- **Files:** `save`, `save-all`, `file`, `file-code`, `file-text`, `folder-opened`, `folder`, `new-file`, `new-folder`
- **Editing:** `edit`, `trash`, `copy`, `clippy`, `symbol-color`, `replace`, `replace-all`, `wand`
- **Navigation:** `arrow-left`, `arrow-right`, `arrow-up`, `arrow-down`, `go-to-file`, `search`, `search-fuzzy`, `find-replace`
- **Code:** `terminal`, `terminal-bash`, `code`, `bracket`, `bracket-dot`, `git-commit`, `git-merge`, `git-branch`, `source-control`
- **UI:** `gear`, `settings-gear`, `extensions`, `bell`, `bell-slash`, `eye`, `eye-closed`, `split-horizontal`, `split-vertical`, `layout`
- **Symbols:** `symbol-class`, `symbol-method`, `symbol-variable`, `symbol-field`, `symbol-interface`, `symbol-key`, `symbol-namespace`
- **Thematic:** `star`, `star-full`, `heart`, `zap`, `rocket`, `shield`, `flame`, `pinned`, `pin`, `tag`, `bookmark`, `key`, `lock`, `unlock`, `bug`, `beaker`, `microscope`, `pulse`, `cloud`, `cloud-download`, `cloud-upload`, `sync`, `refresh`, `check`, `check-all`, `close`, `error`, `warning`, `info`, `question`, `circle-filled`, `circle-outline`, `circle-slash`

---

## New Modules

### `src/iconGenerator.ts`

**Responsibility:** Turn a codicon name into a dark/light SVG file pair for a given user button.

**Interface:**
```ts
export function applyUserButtonIcon(
  buttonIndex: string,   // "01" .. "10"
  iconName: string,
  extensionPath: string
): void
```

**Logic:**
1. Read `node_modules/@vscode/codicons/src/icons/<iconName>.svg` (relative to `extensionPath`)
2. Extract the `<path d="..."/>` element(s) via regex or simple string parse
3. Wrap in a 16×16 SVG template:
   - Dark: `fill="#C5C5C5"` → write to `images/userButton<XX>.svg`
   - Light: `fill="#424242"` → write to `images/userButton<XX>_light.svg`
4. If the codicon file is not found, log a warning and leave the existing icon files unchanged (do not crash)

### `src/packageUpdater.ts`

**Responsibility:** Update a user button command's `title` in the extension's `package.json`.

**Interface:**
```ts
export function applyUserButtonName(
  buttonIndex: string,   // "01" .. "10"
  name: string | null,
  extensionPath: string
): void
```

**Logic:**
1. Read and parse `package.json` from `extensionPath`
2. Find the entry in `contributes.commands` where `command === "ShortcutMenuBarPlus.userButton<XX>"`
3. Set `title` to `name` if non-null/non-empty, else reset to the default (`"user action <N>"`)
4. Write back with 2-space indentation

---

## Wiring in `extension.ts`

### On `activate(context)`

After existing setup, iterate buttons 01–10:

```
for each button XX:
  if userButtonXXIcon is set → applyUserButtonIcon(XX, icon, extensionPath)
  if userButtonXXName is set → applyUserButtonName(XX, name, extensionPath)
```

Silent — no notification on activation (changes were already applied before last reload).

### Configuration Change Listener

Register `workspace.onDidChangeConfiguration` and push to `context.subscriptions`.

On each change event, for each button XX:
- If `userButtonXXIcon` changed → call `applyUserButtonIcon`, set `iconChanged = true`
- If `userButtonXXName` changed → call `applyUserButtonName`, set `nameChanged = true`

After processing all buttons, if any changes occurred show a single notification:

```
"User button settings updated. A window reload is required to apply changes."
[Reload Window]  →  commands.executeCommand("workbench.action.reloadWindow")
```

---

## File Changes Summary

| File | Change |
|---|---|
| `package.json` | Add `userButtonXXName` and `userButtonXXIcon` settings for buttons 01–10; add `@vscode/codicons` to `dependencies` |
| `src/extension.ts` | Import and call `applyUserButtonIcon` / `applyUserButtonName` on activate; register config change listener |
| `src/iconGenerator.ts` | New file |
| `src/packageUpdater.ts` | New file |

---

## Constraints & Caveats

- **Reload required:** Both icon and name changes require a window reload. This is disclosed in every affected setting's `markdownDescription`.
- **Extension updates:** An extension update resets `images/userButtonXX.svg` and `package.json` titles. The activation re-apply step restores all user settings on next launch.
- **No bundler:** The extension compiles with plain `tsc`. `@vscode/codicons` is a runtime dependency read from `node_modules`, which is included in the VSIX package.
- **Codicon availability:** If a codicon name in a user's settings no longer exists in a future version of `@vscode/codicons`, `applyUserButtonIcon` logs a warning and leaves the existing icon unchanged rather than crashing.
- **Enum verification:** The curated codicon list must be cross-checked against the actual `@vscode/codicons` package during implementation; any names that do not exist as files must be removed from the enum.
