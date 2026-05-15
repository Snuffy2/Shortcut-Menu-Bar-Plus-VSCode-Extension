jest.mock(
  'vscode',
  () => ({
    commands: {
      executeCommand: jest.fn(),
      registerCommand: jest.fn(),
    },
    Uri: {
      file: jest.fn((path: string) => ({ fsPath: path })),
    },
    ViewColumn: {
      One: 1,
    },
    window: {
      createWebviewPanel: jest.fn(),
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
import { resetUserButtonIcon } from '../src/iconGenerator';
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
    expect(html).toContain('list="codicon-options"');
    expect(html).toContain('<option value="commands">commands</option>');
  });

  it('escapes user-controlled command, label, and icon values', () => {
    const html = renderConfiguratorHtml({
      nonce: 'abc"123',
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
    expect(html).toContain('data-button-id="save&quot;&lt;bad&gt;"');
    expect(html).toContain('save&quot;&lt;bad&gt;');
    expect(html).toContain('value="command&quot;&lt;script&gt;"');
    expect(html).toContain('&lt;Label&gt;');
    expect(html).toContain('value="x&#39; onclick=&#39;bad"');
    expect(html).toContain('<option value="x&quot;&lt;bad&gt;">x&quot;&lt;bad&gt;</option>');
  });

  it('does not wire save or reload messages before the save-flow task', () => {
    const html = renderConfiguratorHtml({
      nonce: 'abc123',
      buttons: [],
      codicons: [],
    });

    expect(html).not.toContain('acquireVsCodeApi');
    expect(html).not.toContain('postMessage');
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
        html: '',
        onDidReceiveMessage: jest.fn((handler) => {
          messageHandler = handler;
        }),
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
      false
    );
    expect(resetUserButtonIcon).toHaveBeenCalledWith('01', '/fake/ext');
    expect(applyButtonManifest).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ id: 'userButton01' }),
      ]),
      '/fake/ext'
    );
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
    const { getMessageHandler } = setupConfigurator();
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
});
