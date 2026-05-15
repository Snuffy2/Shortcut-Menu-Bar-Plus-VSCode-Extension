jest.mock(
  'vscode',
  () => ({
    commands: {
      executeCommand: jest.fn(() => Promise.resolve()),
      getCommands: jest.fn(() => Promise.resolve([])),
      registerCommand: jest.fn(),
    },
    ConfigurationTarget: {
      Global: 1,
      Workspace: 2,
    },
    Disposable: jest.fn(),
    env: {
      openExternal: jest.fn(),
    },
    extensions: {
      getExtension: jest.fn(() => ({ packageJSON: { version: '3.2.0' } })),
    },
    Uri: {
      file: jest.fn((path: string) => ({ fsPath: path })),
      parse: jest.fn((value: string) => ({ value })),
    },
    ViewColumn: {
      One: 1,
    },
    window: {
      createQuickPick: jest.fn(() => ({
        items: [],
        onDidChangeSelection: jest.fn(),
        onDidHide: jest.fn(),
        show: jest.fn(),
      })),
      createWebviewPanel: jest.fn(),
      showErrorMessage: jest.fn(),
      showInformationMessage: jest.fn(),
    },
    workspace: {
      getConfiguration: jest.fn(),
      onDidChangeConfiguration: jest.fn(),
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

jest.mock('../src/packageUpdater', () => ({
  applyUserButtonName: jest.fn(),
}));

import { commands, window, workspace } from 'vscode';
import { resetUserButtonIcon } from '../src/iconGenerator';
import { applyButtonManifest } from '../src/manifestUpdater';
import { activate } from '../src/extension';

describe('extension configurator integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (resetUserButtonIcon as jest.Mock).mockReturnValue(true);
    (applyButtonManifest as jest.Mock).mockReturnValue(true);
  });

  it('does not reapply or reprompt when the configurator save triggers the global buttons listener', async () => {
    let buttonsValue: unknown;
    const config = {
      inspect: jest.fn(() =>
        buttonsValue === undefined
          ? { defaultValue: [] }
          : { defaultValue: [], globalValue: buttonsValue }
      ),
      get: jest.fn((key: string) => (key === 'buttons' ? buttonsValue : undefined)),
      update: jest.fn(async (_key: string, value: unknown) => {
        buttonsValue = value;
      }),
    };
    const registeredCommands = new Map<string, (...args: unknown[]) => unknown>();
    let configChangeHandler:
      | ((event: { affectsConfiguration: (section: string) => boolean }) => void)
      | undefined;
    let messageHandler: ((message: unknown) => Promise<void>) | undefined;
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
    (workspace.onDidChangeConfiguration as jest.Mock).mockImplementation((handler) => {
      configChangeHandler = handler;
      return { dispose: jest.fn() };
    });
    (commands.registerCommand as jest.Mock).mockImplementation((command, handler) => {
      registeredCommands.set(command, handler);
      return { dispose: jest.fn() };
    });
    (window.createWebviewPanel as jest.Mock).mockReturnValue(panel);
    (window.showInformationMessage as jest.Mock).mockResolvedValue(undefined);

    activate({
      extensionPath: '/fake/ext',
      globalState: {
        get: jest.fn(() => '3.2.0'),
        update: jest.fn(),
      },
      subscriptions: [],
    } as never);

    registeredCommands.get('ShortcutMenuBarPlus.configureButtons')?.();
    await messageHandler?.({
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

    expect(applyButtonManifest).toHaveBeenCalledTimes(2);
    expect(window.showInformationMessage).toHaveBeenCalledTimes(1);

    configChangeHandler?.({
      affectsConfiguration: (section: string) =>
        section === 'ShortcutMenuBarPlus.buttons',
    });

    expect(applyButtonManifest).toHaveBeenCalledTimes(2);
    expect(window.showInformationMessage).toHaveBeenCalledTimes(1);
  });

  it('resets generated icons and prompts reload when a legacy icon setting is cleared', () => {
    const config = {
      inspect: jest.fn(() => ({ defaultValue: [] })),
      get: jest.fn((key: string) =>
        key === 'userButton01Icon' ? '' : undefined
      ),
    };
    let configChangeHandler:
      | ((event: { affectsConfiguration: (section: string) => boolean }) => void)
      | undefined;

    (workspace.getConfiguration as jest.Mock).mockReturnValue(config);
    (workspace.onDidChangeConfiguration as jest.Mock).mockImplementation((handler) => {
      configChangeHandler = handler;
      return { dispose: jest.fn() };
    });
    (commands.registerCommand as jest.Mock).mockReturnValue({ dispose: jest.fn() });
    (window.showInformationMessage as jest.Mock).mockResolvedValue(undefined);

    activate({
      extensionPath: '/fake/ext',
      globalState: {
        get: jest.fn(() => '3.2.0'),
        update: jest.fn(),
      },
      subscriptions: [],
    } as never);

    jest.clearAllMocks();
    (workspace.getConfiguration as jest.Mock).mockReturnValue(config);
    (window.showInformationMessage as jest.Mock).mockResolvedValue(undefined);

    configChangeHandler?.({
      affectsConfiguration: (section: string) =>
        section === 'ShortcutMenuBarPlus.userButton01Icon',
    });

    expect(resetUserButtonIcon).toHaveBeenCalledWith('01', '/fake/ext');
    expect(window.showInformationMessage).toHaveBeenCalledWith(
      'User button settings updated. A window reload is required to apply changes.',
      'Reload Window'
    );
  });

  it('uses cached structured buttons until the buttons setting changes', () => {
    let buttonsValue: unknown = [
      {
        id: 'userButton01',
        type: 'user',
        enabled: true,
        command: 'workbench.action.showCommands',
        label: '',
        icon: '',
      },
    ];
    const config = {
      inspect: jest.fn(() => ({ defaultValue: [], globalValue: buttonsValue })),
      get: jest.fn((key: string) => (key === 'buttons' ? buttonsValue : undefined)),
    };
    const registeredCommands = new Map<string, (...args: unknown[]) => unknown>();
    let configChangeHandler:
      | ((event: { affectsConfiguration: (section: string) => boolean }) => void)
      | undefined;

    (workspace.getConfiguration as jest.Mock).mockReturnValue(config);
    (workspace.onDidChangeConfiguration as jest.Mock).mockImplementation((handler) => {
      configChangeHandler = handler;
      return { dispose: jest.fn() };
    });
    (commands.registerCommand as jest.Mock).mockImplementation((command, handler) => {
      registeredCommands.set(command, handler);
      return { dispose: jest.fn() };
    });
    (window.showInformationMessage as jest.Mock).mockResolvedValue(undefined);

    activate({
      extensionPath: '/fake/ext',
      globalState: {
        get: jest.fn(() => '3.2.0'),
        update: jest.fn(),
      },
      subscriptions: [],
    } as never);

    jest.clearAllMocks();

    registeredCommands.get('ShortcutMenuBarPlus.userButton01')?.();
    expect(commands.executeCommand).toHaveBeenLastCalledWith(
      'workbench.action.showCommands'
    );

    buttonsValue = [
      {
        id: 'userButton01',
        type: 'user',
        enabled: true,
        command: 'workbench.action.quickOpen',
        label: '',
        icon: '',
      },
    ];
    registeredCommands.get('ShortcutMenuBarPlus.userButton01')?.();
    expect(commands.executeCommand).toHaveBeenLastCalledWith(
      'workbench.action.showCommands'
    );

    configChangeHandler?.({
      affectsConfiguration: (section: string) =>
        section === 'ShortcutMenuBarPlus.buttons',
    });
    registeredCommands.get('ShortcutMenuBarPlus.userButton01')?.();
    expect(commands.executeCommand).toHaveBeenLastCalledWith(
      'workbench.action.quickOpen'
    );
  });

  it('refreshes cached legacy button commands and reapplies manifest when legacy command settings change', () => {
    let legacyCommand = 'workbench.action.showCommands';
    const config = {
      inspect: jest.fn(() => ({ defaultValue: [] })),
      get: jest.fn((key: string) =>
        key === 'userButton01Command' ? legacyCommand : undefined
      ),
    };
    const registeredCommands = new Map<string, (...args: unknown[]) => unknown>();
    let configChangeHandler:
      | ((event: { affectsConfiguration: (section: string) => boolean }) => void)
      | undefined;

    (workspace.getConfiguration as jest.Mock).mockReturnValue(config);
    (workspace.onDidChangeConfiguration as jest.Mock).mockImplementation((handler) => {
      configChangeHandler = handler;
      return { dispose: jest.fn() };
    });
    (commands.registerCommand as jest.Mock).mockImplementation((command, handler) => {
      registeredCommands.set(command, handler);
      return { dispose: jest.fn() };
    });
    (window.showInformationMessage as jest.Mock).mockResolvedValue(undefined);

    activate({
      extensionPath: '/fake/ext',
      globalState: {
        get: jest.fn(() => '3.2.0'),
        update: jest.fn(),
      },
      subscriptions: [],
    } as never);

    jest.clearAllMocks();

    registeredCommands.get('ShortcutMenuBarPlus.userButton01')?.();
    expect(commands.executeCommand).toHaveBeenLastCalledWith(
      'workbench.action.showCommands'
    );

    legacyCommand = 'workbench.action.quickOpen';
    registeredCommands.get('ShortcutMenuBarPlus.userButton01')?.();
    expect(commands.executeCommand).toHaveBeenLastCalledWith(
      'workbench.action.showCommands'
    );

    configChangeHandler?.({
      affectsConfiguration: (section: string) =>
        section === 'ShortcutMenuBarPlus.userButton01Command',
    });
    registeredCommands.get('ShortcutMenuBarPlus.userButton01')?.();
    expect(commands.executeCommand).toHaveBeenLastCalledWith(
      'workbench.action.quickOpen'
    );
    expect(applyButtonManifest).toHaveBeenCalledTimes(1);
    expect(window.showInformationMessage).not.toHaveBeenCalled();
  });

  it('reapplies manifest and prompts reload when a legacy user command becomes enabled', () => {
    let legacyCommand = '';
    const config = {
      inspect: jest.fn(() => ({ defaultValue: [] })),
      get: jest.fn((key: string) =>
        key === 'userButton01Command' ? legacyCommand : undefined
      ),
    };
    let configChangeHandler:
      | ((event: { affectsConfiguration: (section: string) => boolean }) => void)
      | undefined;

    (workspace.getConfiguration as jest.Mock).mockReturnValue(config);
    (workspace.onDidChangeConfiguration as jest.Mock).mockImplementation((handler) => {
      configChangeHandler = handler;
      return { dispose: jest.fn() };
    });
    (commands.registerCommand as jest.Mock).mockReturnValue({ dispose: jest.fn() });
    (window.showInformationMessage as jest.Mock).mockResolvedValue(undefined);

    activate({
      extensionPath: '/fake/ext',
      globalState: {
        get: jest.fn(() => '3.2.0'),
        update: jest.fn(),
      },
      subscriptions: [],
    } as never);

    jest.clearAllMocks();

    legacyCommand = 'workbench.action.showCommands';
    configChangeHandler?.({
      affectsConfiguration: (section: string) =>
        section === 'ShortcutMenuBarPlus.userButton01Command',
    });

    expect(applyButtonManifest).toHaveBeenCalledTimes(1);
    expect(window.showInformationMessage).toHaveBeenCalledWith(
      'User button settings updated. A window reload is required to apply changes.',
      'Reload Window'
    );
  });

  it('reapplies manifest when a legacy built-in visibility setting changes', () => {
    let saveEnabled = false;
    const config = {
      inspect: jest.fn(() => ({ defaultValue: [] })),
      get: jest.fn((key: string) =>
        key === 'save' ? saveEnabled : undefined
      ),
    };
    let configChangeHandler:
      | ((event: { affectsConfiguration: (section: string) => boolean }) => void)
      | undefined;

    (workspace.getConfiguration as jest.Mock).mockReturnValue(config);
    (workspace.onDidChangeConfiguration as jest.Mock).mockImplementation((handler) => {
      configChangeHandler = handler;
      return { dispose: jest.fn() };
    });
    (commands.registerCommand as jest.Mock).mockReturnValue({ dispose: jest.fn() });
    (window.showInformationMessage as jest.Mock).mockResolvedValue(undefined);

    activate({
      extensionPath: '/fake/ext',
      globalState: {
        get: jest.fn(() => '3.2.0'),
        update: jest.fn(),
      },
      subscriptions: [],
    } as never);

    jest.clearAllMocks();

    saveEnabled = true;
    configChangeHandler?.({
      affectsConfiguration: (section: string) =>
        section === 'ShortcutMenuBarPlus.save',
    });

    expect(applyButtonManifest).toHaveBeenCalledTimes(1);
    expect(window.showInformationMessage).toHaveBeenCalledWith(
      'User button settings updated. A window reload is required to apply changes.',
      'Reload Window'
    );
  });
});
