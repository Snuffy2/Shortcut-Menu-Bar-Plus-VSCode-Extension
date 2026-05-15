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
  normalizeButtonModel,
} from './buttonModel';

export interface ConfiguratorHtmlInput {
  nonce: string;
  buttons: readonly ButtonEntry[];
  cspSource: string;
  codiconStyleUri: string;
  codicons: readonly string[];
}

export interface ConfiguratorCommandOptions {
  allowExtensionFileMutation?: boolean;
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

function codiconClass(icon: string): string {
  return /^[a-z0-9-]+$/.test(icon) ? ` codicon-${escapeHtml(icon)}` : '';
}

export function renderConfiguratorHtml(input: ConfiguratorHtmlInput): string {
  const codiconOptions = input.codicons
    .map(
      (icon) =>
        `<button class="icon-option" type="button" data-icon="${escapeHtml(icon)}">
          <span class="codicon${codiconClass(icon)}" aria-hidden="true"></span>
          <span class="icon-option-name">${escapeHtml(icon)}</span>
        </button>`
    )
    .join('');
  const rows = input.buttons
    .map((button) => renderButtonRow(button, codiconOptions))
    .join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${escapeHtml(input.cspSource)} 'unsafe-inline'; font-src ${escapeHtml(input.cspSource)}; script-src 'nonce-${escapeHtml(input.nonce)}';">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Shortcut Menu Bar Plus</title>
  <link rel="stylesheet" href="${escapeHtml(input.codiconStyleUri)}">
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

    .toolbar.bottom {
      margin-bottom: 0;
      margin-top: 12px;
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

    .icon-picker {
      display: grid;
      grid-template-columns: 24px minmax(0, 1fr) 28px;
      position: relative;
    }

    .icon-preview {
      align-items: center;
      border: 1px solid var(--vscode-input-border, transparent);
      border-right: 0;
      display: inline-flex;
      justify-content: center;
      min-width: 24px;
    }

    .icon-picker .icon-input {
      min-width: 0;
    }

    .icon-toggle {
      align-items: center;
      display: inline-flex;
      justify-content: center;
      min-width: 28px;
      padding: 0;
    }

    .icon-menu {
      background: var(--vscode-dropdown-background);
      border: 1px solid var(--vscode-dropdown-border);
      box-shadow: 0 4px 12px var(--vscode-widget-shadow);
      display: none;
      grid-column: 1 / -1;
      left: 0;
      max-height: 220px;
      overflow-y: auto;
      position: absolute;
      right: 0;
      top: calc(100% + 2px);
      z-index: 10;
    }

    .icon-menu.open {
      display: grid;
    }

    .icon-option {
      align-items: center;
      background: transparent;
      border: 0;
      color: var(--vscode-dropdown-foreground);
      display: grid;
      gap: 8px;
      grid-template-columns: 20px minmax(0, 1fr);
      padding: 4px 8px;
      text-align: left;
    }

    .icon-option[hidden] {
      display: none;
    }

    .icon-option:hover,
    .icon-option:focus {
      background: var(--vscode-list-hoverBackground);
      outline: none;
    }

    .icon-option-name {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
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
    <button class="save-button" type="button">Save</button>
    <button class="reload-button" type="button" disabled>Reload Window</button>
  </div>
  <ul class="button-list">${rows}<li id="end-drop-zone" class="end-drop-zone">Drop here to move to end</li></ul>
  <div class="toolbar bottom">
    <button class="save-button" type="button">Save</button>
    <button class="reload-button" type="button" disabled>Reload Window</button>
  </div>
  <div id="reload-banner" class="reload-banner">Reload VS Code to apply toolbar changes. Use Reload Window after saving.</div>
  <script nonce="${escapeHtml(input.nonce)}">
    const vscode = acquireVsCodeApi();
    let draggedRow = null;
    let canReload = false;

    function closeIconMenus() {
      for (const menu of document.querySelectorAll('.icon-menu')) {
        menu.classList.remove('open');
      }
    }

    function setIconMenuOptions(picker, filter) {
      const normalizedFilter = filter.trim().toLowerCase();
      for (const option of picker.querySelectorAll('.icon-option')) {
        const icon = (option.dataset.icon || '').toLowerCase();
        option.hidden = normalizedFilter !== '' && !icon.includes(normalizedFilter);
      }
    }

    function updateSelectedIconPreview(picker) {
      const input = picker.querySelector('.icon-input');
      const preview = picker.querySelector('.icon-preview');
      const icon = input.value.trim();
      preview.className = /^[a-z0-9-]+$/.test(icon)
        ? 'icon-preview codicon codicon-' + icon
        : 'icon-preview codicon';
    }

    function openIconMenu(picker, filter) {
      closeIconMenus();
      setIconMenuOptions(picker, filter);
      picker.querySelector('.icon-menu').classList.add('open');
    }

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

    for (const saveButton of document.querySelectorAll('.save-button')) {
      saveButton.addEventListener('click', () => {
        vscode.postMessage({ type: 'save', buttons: serializeButtons() });
      });
    }
    for (const reloadButton of document.querySelectorAll('.reload-button')) {
      reloadButton.addEventListener('click', () => {
        if (!canReload) {
          return;
        }
        vscode.postMessage({ type: 'reload' });
      });
    }
    for (const picker of document.querySelectorAll('.icon-picker')) {
      const input = picker.querySelector('.icon-input');
      const toggle = picker.querySelector('.icon-toggle');
      updateSelectedIconPreview(picker);
      input.addEventListener('input', () => {
        updateSelectedIconPreview(picker);
        openIconMenu(picker, input.value);
      });
      input.addEventListener('focus', () => {
        openIconMenu(picker, input.value);
      });
      toggle.addEventListener('click', (event) => {
        event.stopPropagation();
        closeIconMenus();
        openIconMenu(picker, '');
        input.focus();
      });
      for (const option of picker.querySelectorAll('.icon-option')) {
        option.addEventListener('click', () => {
          input.value = option.dataset.icon || '';
          updateSelectedIconPreview(picker);
          closeIconMenus();
        });
      }
    }
    document.addEventListener('click', (event) => {
      if (!event.target.closest('.icon-picker')) {
        closeIconMenus();
      }
    });
    window.addEventListener('message', (event) => {
      if (!event.data || event.data.type !== 'saved') {
        return;
      }
      canReload = event.data.needsReload === true;
      for (const reloadButton of document.querySelectorAll('.reload-button')) {
        reloadButton.disabled = !canReload;
      }
      document.getElementById('reload-banner').classList.toggle('visible', canReload);
    });
  </script>
</body>
</html>`;
}

function renderButtonRow(entry: ButtonEntry, codiconOptions: string): string {
  const userFields =
    entry.type === 'user'
      ? `<div class="user-fields">
          <input class="command-input" placeholder="Command" value="${escapeHtml(entry.command)}">
          <input class="label-input" placeholder="Label" value="${escapeHtml(entry.label)}">
          <div class="icon-picker">
            <span class="icon-preview codicon${codiconClass(entry.icon)}" aria-hidden="true"></span>
            <input class="icon-input" placeholder="Codicon" value="${escapeHtml(entry.icon)}">
            <button class="icon-toggle" type="button" aria-label="Show codicons">v</button>
            <div class="icon-menu">${codiconOptions}</div>
          </div>
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
  fileNames?: string[]
): string[] {
  let files = fileNames;

  if (!files) {
    try {
      files = readdirSync(
        join(extensionPath, 'node_modules', '@vscode', 'codicons', 'src', 'icons')
      );
    } catch (error) {
      console.error(
        '[ShortcutMenuBarPlus] Failed to enumerate bundled codicons.',
        error
      );
      return [];
    }
  }

  return files
    .filter((fileName) => fileName.endsWith('.svg'))
    .map((fileName) => basename(fileName, '.svg'))
    .sort((a, b) => a.localeCompare(b));
}

function currentButtons(): ButtonEntry[] {
  const config = workspace.getConfiguration('ShortcutMenuBarPlus');
  const inspectedButtons = config.inspect('buttons');

  if (Array.isArray(inspectedButtons?.globalValue)) {
    return normalizeButtonModel(inspectedButtons.globalValue);
  }

  return buildModelFromLegacySettings((key) => config.get(key));
}

function configurationTarget(): ConfigurationTarget {
  return ConfigurationTarget.Global;
}

function nonce(): string {
  return Array.from({ length: 16 }, () =>
    Math.floor(Math.random() * 16).toString(16)
  ).join('');
}

function applyUserButtonIcons(buttons: readonly ButtonEntry[], extensionPath: string): boolean {
  const failedButtonIndexes: string[] = [];

  for (const entry of buttons) {
    if (entry.type !== 'user') {
      continue;
    }

    const buttonIndex = entry.id.replace('userButton', '');
    let iconApplied: boolean;
    if (entry.icon) {
      iconApplied = applyUserButtonIcon(buttonIndex, entry.icon, extensionPath);
    } else {
      iconApplied = resetUserButtonIcon(buttonIndex, extensionPath);
    }

    if (!iconApplied) {
      failedButtonIndexes.push(buttonIndex);
    }
  }

  if (failedButtonIndexes.length > 0) {
    console.error(
      `[ShortcutMenuBarPlus] Failed to apply generated user button icons for button indexes: ${failedButtonIndexes.join(', ')}.`
    );
    return false;
  }

  return true;
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

export function registerConfiguratorCommand(
  context: ExtensionContext,
  options: ConfiguratorCommandOptions = {}
): void {
  const allowExtensionFileMutation = options.allowExtensionFileMutation ?? true;

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
        codiconStyleUri: panel.webview
          .asWebviewUri(
            Uri.file(
              join(
                context.extensionPath,
                'node_modules',
                '@vscode',
                'codicons',
                'dist',
                'codicon.css'
              )
            )
          )
          .toString(),
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
          reloadPending = false;
          await panel.webview.postMessage({ type: 'saved', needsReload: false });
          await window.showErrorMessage(
            `Failed to save Shortcut Menu Bar Plus button configuration: ${
              error instanceof Error ? error.message : String(error)
            }`
          );
          return;
        }

        if (!allowExtensionFileMutation) {
          if (needsReload) {
            clearConfiguratorButtonSave();
          }
          before = next;
          reloadPending = false;
          await panel.webview.postMessage({ type: 'saved', needsReload: false });
          return;
        }

        const iconsApplied = applyUserButtonIcons(next, context.extensionPath);
        const manifestApplied = applyButtonManifest(next, context.extensionPath, {
          visibilityMode: 'structured',
        });
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
