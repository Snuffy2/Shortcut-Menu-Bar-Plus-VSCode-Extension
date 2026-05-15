jest.mock(
  'vscode',
  () => ({
    commands: {
      executeCommand: jest.fn(),
      registerCommand: jest.fn(),
    },
    ConfigurationTarget: {
      Global: 1,
      Workspace: 2,
    },
    Uri: {
      file: jest.fn((path: string) => ({ fsPath: path })),
    },
    ViewColumn: {
      One: 1,
    },
    window: {
      createWebviewPanel: jest.fn(),
      showErrorMessage: jest.fn(),
      showInformationMessage: jest.fn(),
    },
    workspace: {
      getConfiguration: jest.fn(),
    },
  }),
  { virtual: true }
);

jest.mock('fs', () => ({
  readdirSync: jest.fn(() => ['tools.svg', 'add.svg']),
}));

jest.mock('../src/iconGenerator', () => ({
  applyUserButtonIcon: jest.fn(),
  resetUserButtonIcon: jest.fn(),
}));

jest.mock('../src/manifestUpdater', () => ({
  applyButtonManifest: jest.fn(),
}));

import { commands, window, workspace } from 'vscode';
import { Script } from 'vm';
import { applyUserButtonIcon, resetUserButtonIcon } from '../src/iconGenerator';
import { applyButtonManifest } from '../src/manifestUpdater';
import {
  consumeConfiguratorButtonSave,
  getCodiconNames,
  registerConfiguratorCommand,
  renderConfiguratorHtml,
} from '../src/configuratorWebview';

describe('renderConfiguratorHtml', () => {
  it('renders button rows, reload copy, and codicon picker controls', () => {
    const html = renderConfiguratorHtml({
      nonce: 'abc123',
      cspSource: 'vscode-resource:',
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
    expect(html).toContain(
      `Content-Security-Policy" content="default-src 'none'; style-src vscode-resource: 'unsafe-inline'; script-src 'nonce-abc123';`
    );
    expect(html).toContain('Reload VS Code to apply toolbar changes');
    expect(html).toContain('data-button-id="save"');
    expect(html).toContain('data-button-id="userButton01"');
    expect(html).toContain('list="codicon-options"');
    expect(html).toContain('<option value="commands">commands</option>');
  });

  it('escapes user-controlled command, label, and icon values', () => {
    const html = renderConfiguratorHtml({
      nonce: 'abc"123',
      cspSource: 'vscode-resource:"',
      buttons: [
        { id: 'save"<bad>', type: 'builtin', enabled: true },
        {
          id: 'userButton01',
          type: 'user',
          enabled: true,
          command: 'command"<script>',
          label: '<Label>',
          icon: "x' onclick='bad",
        },
      ],
      codicons: ['x"<bad>'],
    });

    expect(html).toContain('nonce="abc&quot;123"');
    expect(html).toContain("script-src 'nonce-abc&quot;123'");
    expect(html).toContain("style-src vscode-resource:&quot; 'unsafe-inline'");
    expect(html).toContain('data-button-id="save&quot;&lt;bad&gt;"');
    expect(html).toContain('save&quot;&lt;bad&gt;');
    expect(html).toContain('value="command&quot;&lt;script&gt;"');
    expect(html).toContain('&lt;Label&gt;');
    expect(html).toContain('value="x&#39; onclick=&#39;bad"');
    expect(html).toContain('<option value="x&quot;&lt;bad&gt;">x&quot;&lt;bad&gt;</option>');
  });

  it('includes drag, serialize, save, and reload client hooks', () => {
    const html = renderConfiguratorHtml({
      nonce: 'abc123',
      cspSource: 'vscode-resource:',
      buttons: [],
      codicons: [],
    });

    expect(html).toContain('const vscode = acquireVsCodeApi()');
    expect(html).toContain('function serializeButtons()');
    expect(html).toContain("addEventListener('dragstart'");
    expect(html).toContain("addEventListener('drop'");
    expect(html).toContain("type: 'save'");
    expect(html).toContain("type: 'reload'");
    expect(html).toContain("type !== 'user'");
    expect(html).toContain('command: row.querySelector');
    expect(html).toContain("event.data.type !== 'saved'");
    expect(html).toContain("classList.toggle('visible', canReload)");
    expect(html).toContain('<button id="reload" type="button" disabled>');
    expect(html).toContain('id="end-drop-zone"');
    expect(html).toContain("document.querySelector('.button-list').insertBefore");
  });

  it('enables reload and banner only after a reload-relevant saved ack', () => {
    const harness = runClientScript(
      renderConfiguratorHtml({
        nonce: 'abc123',
        cspSource: 'vscode-resource:',
        buttons: [],
        codicons: [],
      })
    );

    harness.elements.reload.click();
    expect(harness.messages).toEqual([]);

    harness.sendWindowMessage({ type: 'saved', needsReload: false });
    expect(harness.elements.reload.disabled).toBe(true);
    expect(harness.elements.reloadBanner.visible).toBe(false);
    harness.elements.reload.click();
    expect(harness.messages).toEqual([]);

    harness.sendWindowMessage({ type: 'saved', needsReload: true });
    expect(harness.elements.reload.disabled).toBe(false);
    expect(harness.elements.reloadBanner.visible).toBe(true);
    harness.elements.reload.click();
    expect(harness.messages).toEqual([{ type: 'reload' }]);
  });

  it('serializes built-in and user rows when saving', () => {
    const harness = runClientScript(
      renderConfiguratorHtml({
        nonce: 'abc123',
        cspSource: 'vscode-resource:',
        buttons: [],
        codicons: [],
      })
    );

    harness.elements.save.click();

    expect(harness.messages).toEqual([
      {
        type: 'save',
        buttons: [
          {
            id: 'save',
            type: 'builtin',
            enabled: true,
          },
          {
            id: 'userButton01',
            type: 'user',
            enabled: false,
            command: 'workbench.action.showCommands',
            label: 'Commands',
            icon: 'commands',
          },
        ],
      },
    ]);
  });

  it('moves rows before targets and to the end drop zone', () => {
    const harness = runClientScript(
      renderConfiguratorHtml({
        nonce: 'abc123',
        cspSource: 'vscode-resource:',
        buttons: [],
        codicons: [],
      })
    );

    harness.rows[0].dispatch('dragstart');
    harness.rows[1].dispatch('drop');

    expect(harness.list.insertBefore).toHaveBeenCalledWith(
      harness.rows[0],
      harness.rows[1]
    );

    harness.rows[0].dispatch('dragstart');
    harness.elements.endDropZone.dispatch('drop');

    expect(harness.list.insertBefore).toHaveBeenLastCalledWith(
      harness.rows[0],
      harness.elements.endDropZone
    );
  });
});

describe('getCodiconNames', () => {
  it('returns sorted svg basenames without extensions', () => {
    const names = getCodiconNames('/fake/ext', [
      'tools.svg',
      'add.svg',
      'README.md',
    ]);

    expect(names).toEqual(['add', 'tools']);
  });
});

describe('registerConfiguratorCommand', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    delete (workspace as unknown as { workspaceFolders?: unknown[] }).workspaceFolders;
    (applyUserButtonIcon as jest.Mock).mockReturnValue(true);
    (resetUserButtonIcon as jest.Mock).mockReturnValue(true);
    (applyButtonManifest as jest.Mock).mockReturnValue(true);
  });

  function setupConfigurator(configOverrides: Partial<{
    inspect: jest.Mock;
    get: jest.Mock;
    update: jest.Mock;
  }> = {}) {
    const subscriptions: unknown[] = [];
    let messageHandler: ((message: unknown) => Promise<void>) | undefined;
    const update = configOverrides.update ?? jest.fn().mockResolvedValue(undefined);
    const config = {
      inspect: configOverrides.inspect ?? jest.fn(() => ({ defaultValue: [] })),
      get: configOverrides.get ?? jest.fn(() => undefined),
      update,
    };
    const panel = {
      webview: {
        cspSource: 'vscode-resource:',
        html: '',
        onDidReceiveMessage: jest.fn((handler) => {
          messageHandler = handler;
        }),
        postMessage: jest.fn(),
      },
    };
    (workspace.getConfiguration as jest.Mock).mockReturnValue(config);
    (window.createWebviewPanel as jest.Mock).mockReturnValue(panel);
    (commands.registerCommand as jest.Mock).mockReturnValue({ dispose: jest.fn() });

    registerConfiguratorCommand({
      extensionPath: '/fake/ext',
      subscriptions,
    } as never);

    expect(commands.registerCommand).toHaveBeenCalledWith(
      'ShortcutMenuBarPlus.configureButtons',
      expect.any(Function)
    );
    expect(subscriptions).toHaveLength(1);

    const commandCallback = (commands.registerCommand as jest.Mock).mock.calls[0][1];
    commandCallback();

    return {
      config,
      getMessageHandler: () => messageHandler,
      panel,
      update,
    };
  }

  it('saves to global settings when no workspace is open', async () => {
    const { getMessageHandler, update } = setupConfigurator();

    await getMessageHandler()?.({
      type: 'save',
      buttons: [
        {
          id: 'userButton01',
          type: 'user',
          enabled: true,
          command: 'workbench.action.showCommands',
          label: 'Commands',
          icon: '',
        },
      ],
    });

    expect(update).toHaveBeenCalledWith('buttons', expect.any(Array), 1);
  });

  it('saves to workspace settings when a workspace is open', async () => {
    (workspace as unknown as { workspaceFolders?: unknown[] }).workspaceFolders = [
      { uri: { fsPath: '/workspace' } },
    ];
    const { getMessageHandler, update } = setupConfigurator();

    await getMessageHandler()?.({
      type: 'save',
      buttons: [
        {
          id: 'userButton01',
          type: 'user',
          enabled: true,
          command: 'workbench.action.showCommands',
          label: 'Commands',
          icon: '',
        },
      ],
    });

    expect(update).toHaveBeenCalledWith('buttons', expect.any(Array), 2);
    delete (workspace as unknown as { workspaceFolders?: unknown[] }).workspaceFolders;
  });

  it('registers the configure command and saves normalized buttons', async () => {
    const { getMessageHandler, panel, update } = setupConfigurator();

    expect(panel.webview.html).toContain('Shortcut Menu Bar Plus');
    expect(panel.webview.onDidReceiveMessage).toHaveBeenCalledWith(expect.any(Function));
    expect(getMessageHandler()).toBeDefined();

    await getMessageHandler()?.({
      type: 'save',
      buttons: [
        {
          id: 'userButton01',
          type: 'user',
          enabled: true,
          command: 'workbench.action.showCommands',
          label: 'Commands',
          icon: '',
        },
      ],
    });

    expect(update).toHaveBeenCalledWith(
      'buttons',
      expect.arrayContaining([
        expect.objectContaining({
          id: 'userButton01',
          type: 'user',
          enabled: true,
          command: 'workbench.action.showCommands',
          label: 'Commands',
          icon: '',
        }),
      ]),
      1
    );
    expect(resetUserButtonIcon).toHaveBeenCalledWith('01', '/fake/ext');
    expect(applyButtonManifest).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ id: 'userButton01' }),
      ]),
      '/fake/ext'
    );
    expect(panel.webview.postMessage).toHaveBeenCalledWith({
      type: 'saved',
      needsReload: true,
    });
    expect(window.showInformationMessage).toHaveBeenCalledTimes(1);
    expect(consumeConfiguratorButtonSave()).toBe(true);
    expect(consumeConfiguratorButtonSave()).toBe(false);
  });

  it('ignores malformed messages', async () => {
    const { getMessageHandler, update } = setupConfigurator();

    await getMessageHandler()?.({ type: 'save', buttons: 'not-an-array' });
    await getMessageHandler()?.({ type: 'unknown', buttons: [] });

    expect(update).not.toHaveBeenCalled();
    expect(applyButtonManifest).not.toHaveBeenCalled();
    expect(window.showInformationMessage).not.toHaveBeenCalled();
    expect(consumeConfiguratorButtonSave()).toBe(false);
  });

  it('ignores reload messages until a reload-relevant save succeeds', async () => {
    const { getMessageHandler } = setupConfigurator();

    await getMessageHandler()?.({ type: 'reload' });

    expect(commands.executeCommand).not.toHaveBeenCalledWith(
      'workbench.action.reloadWindow'
    );

    await getMessageHandler()?.({
      type: 'save',
      buttons: [
        {
          id: 'userButton01',
          type: 'user',
          enabled: true,
          command: 'workbench.action.showCommands',
          label: 'Commands',
          icon: '',
        },
      ],
    });
    await getMessageHandler()?.({ type: 'reload' });

    expect(commands.executeCommand).toHaveBeenCalledWith(
      'workbench.action.reloadWindow'
    );
    expect(consumeConfiguratorButtonSave()).toBe(true);
    expect(consumeConfiguratorButtonSave()).toBe(false);
  });

  it('uses explicitly configured empty buttons instead of legacy settings', () => {
    const get = jest.fn((key: string) => {
      if (key === 'buttons') {
        return [];
      }
      if (key === 'userButton01Command') {
        return 'legacy.command';
      }
      return undefined;
    });

    const { panel } = setupConfigurator({
      inspect: jest.fn(() => ({ globalValue: [] })),
      get,
    });

    expect(panel.webview.html).toContain('data-button-id="userButton01"');
    expect(panel.webview.html).not.toContain('legacy.command');
  });

  it('does not prompt again for an unchanged second save in the same panel', async () => {
    const { getMessageHandler, panel } = setupConfigurator();
    const message = {
      type: 'save',
      buttons: [
        {
          id: 'userButton01',
          type: 'user',
          enabled: true,
          command: 'workbench.action.showCommands',
          label: 'Commands',
          icon: '',
        },
      ],
    };

    await getMessageHandler()?.(message);
    await getMessageHandler()?.(message);

    expect(window.showInformationMessage).toHaveBeenCalledTimes(1);
    expect(panel.webview.postMessage).toHaveBeenLastCalledWith({
      type: 'saved',
      needsReload: true,
    });
    expect(consumeConfiguratorButtonSave()).toBe(true);
    expect(consumeConfiguratorButtonSave()).toBe(false);
  });

  it('clears the configurator marker when saving buttons fails', async () => {
    const updateError = new Error('settings write failed');
    const { getMessageHandler } = setupConfigurator({
      update: jest.fn().mockRejectedValue(updateError),
    });

    await expect(
      getMessageHandler()?.({
        type: 'save',
        buttons: [
          {
            id: 'userButton01',
            type: 'user',
            enabled: true,
            command: 'workbench.action.showCommands',
            label: 'Commands',
            icon: '',
          },
        ],
      })
    ).rejects.toThrow('settings write failed');

    expect(consumeConfiguratorButtonSave()).toBe(false);
  });

  it('disables reload and clears marker when manifest apply fails', async () => {
    (applyButtonManifest as jest.Mock).mockReturnValue(false);
    const { getMessageHandler, panel } = setupConfigurator();

    await getMessageHandler()?.({
      type: 'save',
      buttons: [
        {
          id: 'userButton01',
          type: 'user',
          enabled: true,
          command: 'workbench.action.showCommands',
          label: 'Commands',
          icon: '',
        },
      ],
    });

    expect(panel.webview.postMessage).toHaveBeenCalledWith({
      type: 'saved',
      needsReload: false,
    });
    expect(window.showInformationMessage).not.toHaveBeenCalled();
    expect(window.showErrorMessage).toHaveBeenCalledWith(
      expect.stringContaining('applying toolbar icons or order failed')
    );
    expect(consumeConfiguratorButtonSave()).toBe(false);
  });

  it('revokes pending reload after a later manifest apply failure', async () => {
    const { getMessageHandler, panel } = setupConfigurator();
    const message = {
      type: 'save',
      buttons: [
        {
          id: 'userButton01',
          type: 'user',
          enabled: true,
          command: 'workbench.action.showCommands',
          label: 'Commands',
          icon: '',
        },
      ],
    };

    await getMessageHandler()?.(message);
    (applyButtonManifest as jest.Mock).mockReturnValue(false);
    await getMessageHandler()?.({
      type: 'save',
      buttons: [
        {
          id: 'userButton02',
          type: 'user',
          enabled: true,
          command: 'workbench.action.showCommands',
          label: 'Commands 2',
          icon: '',
        },
      ],
    });

    expect(panel.webview.postMessage).toHaveBeenLastCalledWith({
      type: 'saved',
      needsReload: false,
    });
    await getMessageHandler()?.({ type: 'reload' });
    expect(commands.executeCommand).not.toHaveBeenCalledWith(
      'workbench.action.reloadWindow'
    );
    expect(consumeConfiguratorButtonSave()).toBe(false);
  });

  it('disables reload and clears marker when icon apply fails', async () => {
    (applyUserButtonIcon as jest.Mock).mockReturnValue(false);
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const { getMessageHandler, panel } = setupConfigurator();

    await getMessageHandler()?.({
      type: 'save',
      buttons: [
        {
          id: 'userButton01',
          type: 'user',
          enabled: true,
          command: 'workbench.action.showCommands',
          label: 'Commands',
          icon: 'commands',
        },
      ],
    });

    expect(panel.webview.postMessage).toHaveBeenCalledWith({
      type: 'saved',
      needsReload: false,
    });
    expect(window.showInformationMessage).not.toHaveBeenCalled();
    expect(window.showErrorMessage).toHaveBeenCalledWith(
      expect.stringContaining('applying toolbar icons or order failed')
    );
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('button indexes: 01')
    );
    expect(consumeConfiguratorButtonSave()).toBe(false);

    errorSpy.mockRestore();
  });

  it('attempts all user icon updates before reporting failed indexes', async () => {
    (applyUserButtonIcon as jest.Mock).mockImplementation((buttonIndex: string) =>
      buttonIndex !== '01'
    );
    (resetUserButtonIcon as jest.Mock).mockImplementation((buttonIndex: string) =>
      buttonIndex !== '03'
    );
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const { getMessageHandler } = setupConfigurator();

    await getMessageHandler()?.({
      type: 'save',
      buttons: [
        {
          id: 'userButton01',
          type: 'user',
          enabled: true,
          command: 'workbench.action.showCommands',
          label: 'Commands',
          icon: 'commands',
        },
        {
          id: 'userButton02',
          type: 'user',
          enabled: true,
          command: 'workbench.action.quickOpen',
          label: 'Quick Open',
          icon: 'search',
        },
        {
          id: 'userButton03',
          type: 'user',
          enabled: true,
          command: 'workbench.action.files.save',
          label: 'Save',
          icon: '',
        },
      ],
    });

    expect(applyUserButtonIcon).toHaveBeenCalledWith('01', 'commands', '/fake/ext');
    expect(applyUserButtonIcon).toHaveBeenCalledWith('02', 'search', '/fake/ext');
    expect(resetUserButtonIcon).toHaveBeenCalledWith('03', '/fake/ext');
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('button indexes: 01, 03')
    );

    errorSpy.mockRestore();
  });
});

interface ClientElement {
  addEventListener: (event: string, handler: (event?: { data?: unknown }) => void) => void;
  checked?: boolean;
  click: () => void;
  classList: {
    add: (className: string) => void;
    remove: (className: string) => void;
    toggle: (className: string, force?: boolean) => void;
  };
  dataset: Record<string, string>;
  disabled?: boolean;
  dispatch: (event: string) => void;
  parentElement?: {
    insertBefore: jest.Mock;
  };
  querySelector: (selector: string) => ClientElement;
  value?: string;
  visible?: boolean;
}

function runClientScript(html: string): {
  elements: Record<string, ClientElement>;
  list: {
    insertBefore: jest.Mock;
  };
  messages: unknown[];
  rows: ClientElement[];
  sendWindowMessage: (data: unknown) => void;
} {
  const scriptMatch = html.match(/<script\b[^>]*>([\s\S]*?)<\/script\s*>/i);
  if (!scriptMatch) {
    throw new Error('Expected rendered HTML to include a script.');
  }

  const messages: unknown[] = [];
  const listeners = new Map<string, Array<(event?: { data?: unknown }) => void>>();
  const list = {
    insertBefore: jest.fn(),
  };
  const rows = [
    createRow({
      id: 'save',
      type: 'builtin',
      enabled: true,
      parentElement: list,
    }),
    createRow({
      id: 'userButton01',
      type: 'user',
      enabled: false,
      command: 'workbench.action.showCommands',
      label: 'Commands',
      icon: 'commands',
      parentElement: list,
    }),
  ];
  const elements: Record<string, ClientElement> = {
    save: createElement(),
    reload: createElement({ disabled: true }),
    reloadBanner: createElement(),
    endDropZone: createElement(),
  };

  const documentStub = {
    getElementById: (id: string) => {
      if (id === 'reload-banner') {
        return elements.reloadBanner;
      }
      if (id === 'end-drop-zone') {
        return elements.endDropZone;
      }
      return elements[id];
    },
    querySelector: (selector: string) => (selector === '.button-list' ? list : undefined),
    querySelectorAll: (selector: string) =>
      selector === '.button-row' ? rows : [],
  };
  const windowStub = {
    addEventListener: (
      event: string,
      handler: (event?: { data?: unknown }) => void
    ) => {
      listeners.set(event, [...(listeners.get(event) ?? []), handler]);
    },
  };

  new Script(scriptMatch[1]).runInNewContext({
    acquireVsCodeApi: () => ({
      postMessage: (message: unknown) => {
        messages.push(message);
      },
    }),
    document: documentStub,
    window: windowStub,
  });

  return {
    elements,
    list,
    messages,
    rows,
    sendWindowMessage: (data: unknown) => {
      for (const handler of listeners.get('message') ?? []) {
        handler({ data });
      }
    },
  };
}

function createElement(
  options: Partial<Pick<ClientElement, 'checked' | 'dataset' | 'disabled' | 'value' | 'parentElement'>> = {}
): ClientElement {
  const handlers = new Map<string, Array<(event?: { data?: unknown }) => void>>();
  const element: ClientElement = {
    addEventListener: (event, handler) => {
      handlers.set(event, [...(handlers.get(event) ?? []), handler]);
    },
    checked: options.checked,
    classList: {
      add: (className) => {
        if (className === 'visible') {
          element.visible = true;
        }
      },
      remove: (className) => {
        if (className === 'visible') {
          element.visible = false;
        }
      },
      toggle: (className, force) => {
        if (className === 'visible') {
          element.visible = force;
        }
      },
    },
    click: () => {
      for (const handler of handlers.get('click') ?? []) {
        handler();
      }
    },
    dataset: options.dataset ?? {},
    disabled: options.disabled,
    dispatch: (event) => {
      for (const handler of handlers.get(event) ?? []) {
        handler({
          data: undefined,
          preventDefault: jest.fn(),
        } as never);
      }
    },
    parentElement: options.parentElement,
    querySelector: () => {
      throw new Error('querySelector not configured for element.');
    },
    value: options.value,
    visible: false,
  };
  return element;
}

function createRow(input: {
  command?: string;
  enabled: boolean;
  icon?: string;
  id: string;
  label?: string;
  parentElement: { insertBefore: jest.Mock };
  type: string;
}): ClientElement {
  const controls: Record<string, ClientElement> = {
    '.enabled-toggle': createElement({ checked: input.enabled }),
    '.command-input': createElement({ value: input.command ?? '' }),
    '.label-input': createElement({ value: input.label ?? '' }),
    '.icon-input': createElement({ value: input.icon ?? '' }),
  };
  const row = createElement({
    dataset: {
      buttonId: input.id,
      buttonType: input.type,
    },
    parentElement: input.parentElement,
  });
  row.querySelector = (selector) => controls[selector];
  return row;
}
