import { readdirSync } from 'fs';
import { basename, join } from 'path';
import {
  commands,
  ExtensionContext,
  Uri,
  ViewColumn,
  window,
  workspace,
} from 'vscode';
import { applyUserButtonIcon, resetUserButtonIcon } from './iconGenerator';
import { applyButtonManifest } from './manifestUpdater';
import { ButtonEntry } from './buttonModel';
import {
  buttonModelNeedsReload,
  buildModelFromLegacySettings,
  hasStructuredButtonConfig,
  normalizeButtonModel,
} from './buttonModel';

export interface ConfiguratorHtmlInput {
  nonce: string;
  buttons: readonly ButtonEntry[];
  codicons: readonly string[];
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
  if (entry.type === 'user') {
    return entry.label || entry.id;
  }

  return entry.id;
}

export function renderConfiguratorHtml(input: ConfiguratorHtmlInput): string {
  const codiconOptions = input.codicons
    .map((icon) => `<option value="${escapeHtml(icon)}">${escapeHtml(icon)}</option>`)
    .join('');
  const rows = input.buttons.map(renderButtonRow).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Shortcut Menu Bar Plus</title>
  <style>
    body {
      background: var(--vscode-editor-background);
      color: var(--vscode-foreground);
      font-family: var(--vscode-font-family);
      margin: 0;
      padding: 16px;
    }

    h1 {
      font-size: 20px;
      font-weight: 600;
      margin: 0 0 12px;
    }

    .toolbar {
      align-items: center;
      display: flex;
      gap: 8px;
      margin-bottom: 12px;
    }

    .button-list {
      display: grid;
      gap: 6px;
      list-style: none;
      margin: 0;
      padding: 0;
    }

    .button-row {
      align-items: center;
      border: 1px solid var(--vscode-panel-border);
      display: grid;
      gap: 8px;
      grid-template-columns: 24px minmax(140px, 1fr) 72px;
      padding: 8px;
    }

    .drag-handle {
      color: var(--vscode-descriptionForeground);
      cursor: grab;
      text-align: center;
    }

    .button-main {
      align-items: center;
      display: flex;
      gap: 8px;
      min-width: 0;
    }

    .button-label {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .button-type {
      color: var(--vscode-descriptionForeground);
      font-size: 12px;
      text-transform: uppercase;
    }

    .user-fields {
      display: grid;
      gap: 6px;
      grid-column: 2 / -1;
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }

    .user-fields input {
      width: 100%;
    }

    .reload-banner {
      border: 1px solid var(--vscode-notificationsWarningIcon-foreground);
      margin-top: 12px;
      padding: 10px;
    }
  </style>
</head>
<body>
  <h1>Shortcut Menu Bar Plus</h1>
  <div class="toolbar">
    <button id="save" type="button">Save</button>
    <button id="reload" type="button">Reload Window</button>
  </div>
  <datalist id="codicon-options">${codiconOptions}</datalist>
  <ul class="button-list">${rows}</ul>
  <div id="reload-banner" class="reload-banner">Reload VS Code to apply toolbar changes. Use Reload Window after saving.</div>
  <script nonce="${escapeHtml(input.nonce)}"></script>
</body>
</html>`;
}

function renderButtonRow(entry: ButtonEntry): string {
  const userFields =
    entry.type === 'user'
      ? `<div class="user-fields">
          <input class="command-input" placeholder="Command" value="${escapeHtml(entry.command)}">
          <input class="label-input" placeholder="Label" value="${escapeHtml(entry.label)}">
          <input class="icon-input" placeholder="Codicon" list="codicon-options" value="${escapeHtml(entry.icon)}">
        </div>`
      : '';

  return `<li class="button-row" draggable="true" data-button-id="${escapeHtml(entry.id)}" data-button-type="${entry.type}">
    <span class="drag-handle" title="Drag to reorder">::</span>
    <label class="button-main">
      <input type="checkbox" class="enabled-toggle"${entry.enabled ? ' checked' : ''}>
      <span class="button-label">${escapeHtml(buttonLabel(entry))}</span>
    </label>
    <span class="button-type">${entry.type}</span>
    ${userFields}
  </li>`;
}

export function getCodiconNames(
  extensionPath: string,
  fileNames = readdirSync(
    join(extensionPath, 'node_modules', '@vscode', 'codicons', 'src', 'icons')
  )
): string[] {
  return fileNames
    .filter((fileName) => fileName.endsWith('.svg'))
    .map((fileName) => basename(fileName, '.svg'))
    .sort((a, b) => a.localeCompare(b));
}

function currentButtons(): ButtonEntry[] {
  const config = workspace.getConfiguration('ShortcutMenuBarPlus');
  const hasStructuredButtons = hasStructuredButtonConfig(config.inspect('buttons'));

  if (hasStructuredButtons) {
    const configured = config.get<unknown>('buttons');
    return normalizeButtonModel(Array.isArray(configured) ? configured : []);
  }

  return buildModelFromLegacySettings((key) => config.get(key));
}

function nonce(): string {
  return Array.from({ length: 16 }, () =>
    Math.floor(Math.random() * 16).toString(16)
  ).join('');
}

function applyUserButtonIcons(buttons: readonly ButtonEntry[], extensionPath: string): void {
  for (const entry of buttons) {
    if (entry.type !== 'user') {
      continue;
    }

    const buttonIndex = entry.id.replace('userButton', '');
    if (entry.icon) {
      applyUserButtonIcon(buttonIndex, entry.icon, extensionPath);
    } else {
      resetUserButtonIcon(buttonIndex, extensionPath);
    }
  }
}

let pendingConfiguratorButtonSave = false;

export function consumeConfiguratorButtonSave(): boolean {
  if (!pendingConfiguratorButtonSave) {
    return false;
  }

  pendingConfiguratorButtonSave = false;
  return true;
}

function markConfiguratorButtonSave(): void {
  pendingConfiguratorButtonSave = true;
}

function clearConfiguratorButtonSave(): void {
  pendingConfiguratorButtonSave = false;
}

export function registerConfiguratorCommand(context: ExtensionContext): void {
  context.subscriptions.push(
    commands.registerCommand('ShortcutMenuBarPlus.configureButtons', () => {
      let before = currentButtons();
      const panel = window.createWebviewPanel(
        'shortcutMenuBarPlusButtons',
        'Shortcut Menu Bar Plus Buttons',
        ViewColumn.One,
        {
          enableScripts: true,
          localResourceRoots: [Uri.file(context.extensionPath)],
        }
      );

      panel.webview.html = renderConfiguratorHtml({
        nonce: nonce(),
        buttons: before,
        codicons: getCodiconNames(context.extensionPath),
      });

      panel.webview.onDidReceiveMessage(async (message: unknown) => {
        if (!isMessage(message)) {
          return;
        }

        if (message.type === 'reload') {
          await commands.executeCommand('workbench.action.reloadWindow');
          return;
        }

        const next = normalizeButtonModel(message.buttons);
        const needsReload = buttonModelNeedsReload(before, next);
        if (needsReload) {
          markConfiguratorButtonSave();
        }
        try {
          await workspace
            .getConfiguration('ShortcutMenuBarPlus')
            .update('buttons', next, false);
        } catch (error) {
          if (needsReload) {
            clearConfiguratorButtonSave();
          }
          throw error;
        }
        applyUserButtonIcons(next, context.extensionPath);
        applyButtonManifest(next, context.extensionPath);
        before = next;

        if (needsReload) {
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

function isMessage(
  value: unknown
): value is { type: 'reload' } | { type: 'save'; buttons: unknown[] } {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const message = value as { type?: unknown; buttons?: unknown };
  if (message.type === 'reload') {
    return true;
  }

  return message.type === 'save' && Array.isArray(message.buttons);
}
