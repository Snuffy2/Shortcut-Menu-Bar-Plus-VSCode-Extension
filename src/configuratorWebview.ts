import { readdirSync } from 'fs';
import { basename, join } from 'path';
import {
  commands,
  ConfigurationTarget,
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
  cspSource: string;
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
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${escapeHtml(input.cspSource)} 'unsafe-inline'; script-src 'nonce-${escapeHtml(input.nonce)}';">
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
      display: none;
      margin-top: 12px;
      padding: 10px;
    }

    .reload-banner.visible {
      display: block;
    }

    .button-row.dragging {
      opacity: 0.65;
    }

    .end-drop-zone {
      border: 1px dashed var(--vscode-panel-border);
      color: var(--vscode-descriptionForeground);
      list-style: none;
      padding: 8px;
      text-align: center;
    }
  </style>
</head>
<body>
  <h1>Shortcut Menu Bar Plus</h1>
  <div class="toolbar">
    <button id="save" type="button">Save</button>
    <button id="reload" type="button" disabled>Reload Window</button>
  </div>
  <datalist id="codicon-options">${codiconOptions}</datalist>
  <ul class="button-list">${rows}<li id="end-drop-zone" class="end-drop-zone">Drop here to move to end</li></ul>
  <div id="reload-banner" class="reload-banner">Reload VS Code to apply toolbar changes. Use Reload Window after saving.</div>
  <script nonce="${escapeHtml(input.nonce)}">
    const vscode = acquireVsCodeApi();
    let draggedRow = null;
    let canReload = false;

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

    document.getElementById('end-drop-zone').addEventListener('dragover', (event) => {
      event.preventDefault();
    });
    document.getElementById('end-drop-zone').addEventListener('drop', (event) => {
      event.preventDefault();
      if (!draggedRow) {
        return;
      }
      document.querySelector('.button-list').insertBefore(draggedRow, document.getElementById('end-drop-zone'));
    });

    document.getElementById('save').addEventListener('click', () => {
      vscode.postMessage({ type: 'save', buttons: serializeButtons() });
    });
    document.getElementById('reload').addEventListener('click', () => {
      if (!canReload) {
        return;
      }
      vscode.postMessage({ type: 'reload' });
    });
    window.addEventListener('message', (event) => {
      if (!event.data || event.data.type !== 'saved') {
        return;
      }
      canReload = event.data.needsReload === true;
      document.getElementById('reload').disabled = !canReload;
      document.getElementById('reload-banner').classList.toggle('visible', canReload);
    });
  </script>
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

function configurationTarget(): ConfigurationTarget {
  return workspace.workspaceFolders?.length
    ? ConfigurationTarget.Workspace
    : ConfigurationTarget.Global;
}

function nonce(): string {
  return Array.from({ length: 16 }, () =>
    Math.floor(Math.random() * 16).toString(16)
  ).join('');
}

function applyUserButtonIcons(buttons: readonly ButtonEntry[], extensionPath: string): boolean {
  let success = true;
  for (const entry of buttons) {
    if (entry.type !== 'user') {
      continue;
    }

    const buttonIndex = entry.id.replace('userButton', '');
    if (entry.icon) {
      success = applyUserButtonIcon(buttonIndex, entry.icon, extensionPath) && success;
    } else {
      success = resetUserButtonIcon(buttonIndex, extensionPath) && success;
    }
  }
  return success;
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
      let reloadPending = false;
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
        cspSource: panel.webview.cspSource,
        codicons: getCodiconNames(context.extensionPath),
      });

      panel.webview.onDidReceiveMessage(async (message: unknown) => {
        if (!isMessage(message)) {
          return;
        }

        if (message.type === 'reload') {
          if (!reloadPending) {
            return;
          }
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
            .update('buttons', next, configurationTarget());
        } catch (error) {
          if (needsReload) {
            clearConfiguratorButtonSave();
          }
          throw error;
        }
        const iconsApplied = applyUserButtonIcons(next, context.extensionPath);
        const manifestApplied = applyButtonManifest(next, context.extensionPath);
        if (!iconsApplied || !manifestApplied) {
          if (needsReload) {
            clearConfiguratorButtonSave();
          }
          reloadPending = false;
          await panel.webview.postMessage({ type: 'saved', needsReload: false });
          await window.showErrorMessage(
            'Shortcut Menu Bar Plus button changes were saved, but applying toolbar icons or order failed. Check the extension logs before reloading.'
          );
          return;
        }
        before = next;
        reloadPending = reloadPending || needsReload;
        await panel.webview.postMessage({ type: 'saved', needsReload: reloadPending });

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
