import {
  BUILTIN_BUTTONS,
  USER_BUTTONS,
  ButtonEntry,
  LegacyGetter,
  buttonModelNeedsReload,
  createDefaultButtonModel,
  buildModelFromLegacySettings,
  normalizeButtonModel,
  getUserButtonCommand,
  hasStructuredButtonConfig,
  resolveUserButtonCommand,
} from '../src/buttonModel';
import { readFileSync } from 'fs';
import { resolve } from 'path';

type PackageContributesCommand = {
  command: string;
  title: string;
};

type PackageManifest = {
  contributes: {
    commands: PackageContributesCommand[];
  };
};

const packageJson = JSON.parse(
  readFileSync(resolve(process.cwd(), 'package.json'), 'utf8')
) as PackageManifest;

const titleByCommand = new Map<string, string>(
  packageJson.contributes.commands.map((command) => [command.command, command.title])
);

describe('button model defaults', () => {
  it('contains all built-in buttons followed by all user button slots', () => {
    const model = createDefaultButtonModel();

    expect(model.map((entry) => entry.id)).toEqual([
      ...BUILTIN_BUTTONS.map((button) => button.id),
      ...USER_BUTTONS.map((button) => button.id),
    ]);
  });

  it('preserves each builtin defaultEnabled in the default model', () => {
    const model = createDefaultButtonModel();

    for (const definition of BUILTIN_BUTTONS) {
      const entry = model.find((button) => button.id === definition.id);
      expect(entry).toEqual(
        expect.objectContaining({
          id: definition.id,
          type: 'builtin',
          enabled: definition.defaultEnabled,
        })
      );
    }
  });

  it('preserves current package titles for builtin defaults', () => {
    for (const definition of BUILTIN_BUTTONS) {
      expect(definition.defaultTitle).toBe(
        titleByCommand.get(definition.commandId)
      );
    }
  });

  it('preserves current package titles for user-button defaults', () => {
    for (const definition of USER_BUTTONS) {
      expect(definition.defaultTitle).toBe(
        titleByCommand.get(definition.commandId)
      );
    }
  });

  it('derives user button enabled values from USER_BUTTONS definitions', () => {
    const model = createDefaultButtonModel();

    for (const definition of USER_BUTTONS) {
      const entry = model.find((button) => button.id === definition.id);
      expect(entry).toEqual(
        expect.objectContaining({
          id: definition.id,
          type: 'user',
          enabled: definition.defaultEnabled,
        })
      );
    }
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

  describe('legacy migration', () => {
    it('builds model from builtin and user legacy settings', () => {
      const legacySettings: Record<string, unknown> = {
        save: true,
        userButton01: true,
        userButton01Command: 'workbench.action.tasks.runTask|Build',
        userButton01Name: 'Build',
        userButton01Icon: 'tools',
      };

      const getLegacyValue: LegacyGetter = (key) => legacySettings[key];
      const model = buildModelFromLegacySettings(getLegacyValue);

      const saveButton = model.find((button) => button.id === 'save');
      expect(saveButton).toEqual({
        id: 'save',
        type: 'builtin',
        enabled: true,
      });

      const userButton01 = model.find((button) => button.id === 'userButton01');
      expect(userButton01).toEqual({
        id: 'userButton01',
        type: 'user',
        enabled: true,
        command: 'workbench.action.tasks.runTask|Build',
        label: 'Build',
        icon: 'tools',
      });
    });

    it('treats whitespace-only user commands as disabled and empty', () => {
      const legacySettings: Record<string, unknown> = {
        userButton02: true,
        userButton02Command: '   ',
      };

      const getLegacyValue: LegacyGetter = (key) => legacySettings[key];
      const model = buildModelFromLegacySettings(getLegacyValue);

      const userButton02 = model.find((button) => button.id === 'userButton02');
      expect(userButton02).toEqual({
        id: 'userButton02',
        type: 'user',
        enabled: false,
        command: '',
        label: '',
        icon: '',
      });
    });

    it('enables user buttons from non-empty command even without legacy boolean', () => {
      const legacySettings: Record<string, unknown> = {
        userButton03Command: 'workbench.action.tasks.build',
      };

      const getLegacyValue: LegacyGetter = (key) => legacySettings[key];
      const model = buildModelFromLegacySettings(getLegacyValue);

      const userButton03 = model.find((button) => button.id === 'userButton03');
      expect(userButton03).toEqual({
        id: 'userButton03',
        type: 'user',
        enabled: true,
        command: 'workbench.action.tasks.build',
        label: '',
        icon: '',
      });
    });
  });

  describe('normalization', () => {
    it('removes unknown entries and keeps first duplicate', () => {
      const userFirst: ButtonEntry = {
        id: 'userButton01',
        type: 'user',
        enabled: true,
        command: 'git.checkout',
        label: 'first',
        icon: 'one',
      };
      const userSecond: ButtonEntry = {
        id: 'userButton01',
        type: 'user',
        enabled: false,
        command: 'git.pull',
        label: 'second',
        icon: 'two',
      };
      const duplicateWithUnknown: ButtonEntry[] = [
        ...createDefaultButtonModel().slice(0, 1),
        { id: 'unknown', type: 'builtin', enabled: true },
        userFirst,
        userSecond,
      ];

      const result = normalizeButtonModel(duplicateWithUnknown);

      expect(result[0]).toEqual({
        id: 'switchHeaderSource',
        type: 'builtin',
        enabled: false,
      });
      expect(result[1]).toEqual(userFirst);
      expect(result.filter((button) => button.id === 'userButton01')).toHaveLength(
        1
      );
      expect(result.some((button) => button.id === 'unknown')).toBe(false);
    });

    it('appends missing known entries in default order', () => {
      const modelInput: ButtonEntry[] = [
        {
          id: 'userButton03',
          type: 'user',
          enabled: true,
          command: 'git status',
          label: 'status',
          icon: 'info',
        },
      ];

      const result = normalizeButtonModel(modelInput);

      const userButton03 = result[0];
      const expectedSecond = BUILTIN_BUTTONS[0];
      expect(userButton03).toEqual({
        id: 'userButton03',
        type: 'user',
        enabled: true,
        command: 'git status',
        label: 'status',
        icon: 'info',
      });
      expect(result[1].id).toEqual(expectedSecond.id);
      expect(result[result.length - 1]).toEqual({
        id: USER_BUTTONS[USER_BUTTONS.length - 1].id,
        type: 'user',
        enabled: false,
        command: '',
        label: '',
        icon: '',
      });
      expect(result).toHaveLength(BUILTIN_BUTTONS.length + USER_BUTTONS.length);
    });

    it('normalizes builtin entries to id, type, enabled', () => {
      const modelInput: ButtonEntry[] = [
        {
          id: 'save',
          type: 'builtin',
          enabled: false,
        },
        {
          id: 'undo',
          type: 'builtin',
          enabled: true,
        },
      ];

      const result = normalizeButtonModel(modelInput);
      expect(result[0]).toEqual({
        id: 'save',
        type: 'builtin',
        enabled: false,
      });
    });

    it('normalizes user fields and enforces enabled only when command is present', () => {
      const modelInput: ButtonEntry[] = [
        {
          id: 'userButton10',
          type: 'user',
          enabled: true,
          command: '   workbench.action.openSettings   ',
          label: '  Open settings ',
          icon: 'gear  ',
        },
        {
          id: 'userButton09',
          type: 'user',
          enabled: true,
          command: '   ',
          label: 'no command',
          icon: 'gear',
        },
      ];

      const result = normalizeButtonModel(modelInput);
      expect(result[0]).toEqual({
        id: 'userButton10',
        type: 'user',
        enabled: true,
        command: 'workbench.action.openSettings',
        label: 'Open settings',
        icon: 'gear',
      });
      expect(result[1]).toEqual({
        id: 'userButton09',
        type: 'user',
        enabled: false,
        command: '',
        label: 'no command',
        icon: 'gear',
      });
    });

    it('drops malformed persisted items and appends defaults without throwing', () => {
      const modelInput: unknown[] = [
        null,
        undefined,
        'bad',
        42,
        { id: 'save', enabled: true },
        { type: 'user' },
      ];

      const result = normalizeButtonModel(modelInput);

      expect(result).toEqual(createDefaultButtonModel());
    });

    it('returns normalized user command for an enabled user button index', () => {
      const modelInput: ButtonEntry[] = [
        {
          id: 'userButton01',
          type: 'user',
          enabled: true,
          command: '   workbench.action.openSettings   ',
          label: 'Open settings',
          icon: 'gear',
        },
      ];

      expect(getUserButtonCommand(modelInput, 1)).toBe(
        'workbench.action.openSettings'
      );
      expect(getUserButtonCommand(modelInput, '1')).toBe(
        'workbench.action.openSettings'
      );
    });

    it('returns undefined for disabled or empty user buttons', () => {
      const modelInput: ButtonEntry[] = [
        {
          id: 'userButton01',
          type: 'user',
          enabled: true,
          command: '   ',
          label: '',
          icon: '',
        },
        {
          id: 'userButton02',
          type: 'user',
          enabled: false,
          command: 'workbench.action.openSettings',
          label: '',
          icon: '',
        },
      ];

      expect(getUserButtonCommand(modelInput, 1)).toBeUndefined();
      expect(getUserButtonCommand(modelInput, 2)).toBeUndefined();
    });

    it('uses structured button config when present even if legacy command exists', () => {
      const modelInput: ButtonEntry[] = [
        {
          id: 'userButton01',
          type: 'user',
          enabled: true,
          command: 'workbench.action.openSettings',
          label: '',
          icon: '',
        },
      ];

      expect(
        resolveUserButtonCommand({
          configuredButtons: modelInput,
          hasStructuredButtons: true,
          legacyCommand: 'workbench.action.files.save',
          buttonIndex: 1,
        })
      ).toBe('workbench.action.openSettings');
    });

    it('returns undefined when structured config disables a button even with legacy command', () => {
      const modelInput: ButtonEntry[] = [
        {
          id: 'userButton01',
          type: 'user',
          enabled: false,
          command: 'workbench.action.openSettings',
          label: '',
          icon: '',
        },
      ];

      expect(
        resolveUserButtonCommand({
          configuredButtons: modelInput,
          hasStructuredButtons: true,
          legacyCommand: 'workbench.action.files.save',
          buttonIndex: '01',
        })
      ).toBeUndefined();
    });

    it('does not fallback when structured config is present but empty', () => {
      expect(
        resolveUserButtonCommand({
          configuredButtons: [],
          hasStructuredButtons: true,
          legacyCommand: 'workbench.action.files.save',
          buttonIndex: 1,
        })
      ).toBeUndefined();
    });

    it('does not treat the contributed default buttons array as configured', () => {
      expect(
        hasStructuredButtonConfig({
          defaultValue: [],
        })
      ).toBe(false);
    });

    it('treats an explicitly configured empty buttons array as structured config', () => {
      expect(
        hasStructuredButtonConfig({
          workspaceValue: [],
        })
      ).toBe(true);
    });

    it('falls back to legacy when structured config is absent', () => {
      const modelInput: ButtonEntry[] = [];

      expect(
        resolveUserButtonCommand({
          configuredButtons: modelInput,
          hasStructuredButtons: false,
          legacyCommand: '   workbench.action.openSettings   ',
          buttonIndex: 1,
        })
      ).toBe('workbench.action.openSettings');
    });

    it('falls back to getUserButtonCommand from configuredButtons when hasStructuredButtons is false and legacyCommand is undefined', () => {
      const modelInput: ButtonEntry[] = [
        {
          id: 'userButton01',
          type: 'user',
          enabled: true,
          command: 'workbench.action.openSettings',
          label: '',
          icon: '',
        },
      ];

      expect(
        resolveUserButtonCommand({
          configuredButtons: modelInput,
          hasStructuredButtons: false,
          legacyCommand: undefined,
          buttonIndex: 1,
        })
      ).toBe('workbench.action.openSettings');
    });

    it('returns undefined when hasStructuredButtons is false, legacyCommand is undefined, and button is missing', () => {
      expect(
        resolveUserButtonCommand({
          configuredButtons: [],
          hasStructuredButtons: false,
          legacyCommand: undefined,
          buttonIndex: 5,
        })
      ).toBeUndefined();
    });

    it('returns undefined when legacyCommand is empty string and no structured button exists', () => {
      expect(
        resolveUserButtonCommand({
          configuredButtons: [],
          hasStructuredButtons: false,
          legacyCommand: '   ',
          buttonIndex: 1,
        })
      ).toBeUndefined();
    });

    it('looks up userButton10 by numeric index 10', () => {
      const modelInput: ButtonEntry[] = [
        {
          id: 'userButton10',
          type: 'user',
          enabled: true,
          command: 'workbench.action.openRecent',
          label: '',
          icon: '',
        },
      ];

      expect(getUserButtonCommand(modelInput, 10)).toBe(
        'workbench.action.openRecent'
      );
    });

    it('looks up userButton10 by string index "10"', () => {
      const modelInput: ButtonEntry[] = [
        {
          id: 'userButton10',
          type: 'user',
          enabled: true,
          command: 'workbench.action.openRecent',
          label: '',
          icon: '',
        },
      ];

      expect(getUserButtonCommand(modelInput, '10')).toBe(
        'workbench.action.openRecent'
      );
    });

    it('hasStructuredButtonConfig returns true for globalValue array', () => {
      expect(hasStructuredButtonConfig({ globalValue: [] })).toBe(true);
    });

    it('hasStructuredButtonConfig returns true for workspaceFolderValue array', () => {
      expect(hasStructuredButtonConfig({ workspaceFolderValue: [] })).toBe(true);
    });

    it('hasStructuredButtonConfig returns true for globalLanguageValue array', () => {
      expect(hasStructuredButtonConfig({ globalLanguageValue: [] })).toBe(true);
    });

    it('hasStructuredButtonConfig returns true for workspaceLanguageValue array', () => {
      expect(hasStructuredButtonConfig({ workspaceLanguageValue: [] })).toBe(true);
    });

    it('hasStructuredButtonConfig returns true for workspaceFolderLanguageValue array', () => {
      expect(
        hasStructuredButtonConfig({ workspaceFolderLanguageValue: [] })
      ).toBe(true);
    });

    it('hasStructuredButtonConfig returns false when all non-default fields are non-array', () => {
      expect(
        hasStructuredButtonConfig({
          defaultValue: [],
          globalValue: 'not-an-array',
          workspaceValue: null,
          workspaceFolderValue: undefined,
        })
      ).toBe(false);
    });

    it('hasStructuredButtonConfig returns false for undefined inspection', () => {
      expect(hasStructuredButtonConfig(undefined)).toBe(false);
    });

    it('normalizeButtonModel drops entry whose type does not match a known type for its id', () => {
      const input = [
        { id: 'save', type: 'user', enabled: true, command: 'cmd', label: '', icon: '' },
      ];

      const result = normalizeButtonModel(input);

      expect(result.find((entry) => entry.id === 'save')).toEqual({
        id: 'save',
        type: 'builtin',
        enabled: false,
      });
    });
  });

  describe('buttonModelNeedsReload', () => {
    it('detects order changes', () => {
      const baseModel = createDefaultButtonModel();
      const reordered = [...baseModel.slice(1), baseModel[0]];

      expect(buttonModelNeedsReload(baseModel, reordered)).toBe(true);
    });

    it('detects user icon and label changes', () => {
      const baseModel = createDefaultButtonModel().map((entry) =>
        entry.id === 'userButton01' && entry.type === 'user'
          ? {
              ...entry,
              enabled: true,
              command: 'cmd.one',
              label: 'Build',
              icon: 'tools',
            }
          : entry
      );
      const modified = baseModel.map((entry) =>
        entry.id === 'userButton01' && entry.type === 'user'
          ? {
              ...entry,
              command: 'cmd.one',
              enabled: true,
              label: 'Run',
              icon: 'gear',
            }
          : entry
      );

      expect(buttonModelNeedsReload(baseModel, modified)).toBe(true);
    });

    it('returns false for command-only changes', () => {
      const baseModel = createDefaultButtonModel().map((entry) =>
        entry.id === 'userButton01' && entry.type === 'user'
          ? {
              ...entry,
              enabled: true,
              command: 'cmd.one',
              label: 'Build',
              icon: 'tools',
            }
          : entry
      );
      const commandChanged = baseModel.map((entry) =>
        entry.id === 'userButton01' && entry.type === 'user'
          ? {
              ...entry,
              command: 'cmd.two',
            }
          : entry
      );

      expect(buttonModelNeedsReload(baseModel, commandChanged)).toBe(false);
    });

    it('detects clearing a user icon', () => {
      const baseModel = createDefaultButtonModel().map((entry) =>
        entry.id === 'userButton01' && entry.type === 'user'
          ? {
              ...entry,
              enabled: true,
              icon: 'tools',
            }
          : entry
      );
      const clearedIcon = baseModel.map((entry) =>
        entry.id === 'userButton01' && entry.type === 'user'
          ? {
              ...entry,
              icon: '',
            }
          : entry
      );

      expect(buttonModelNeedsReload(baseModel, clearedIcon)).toBe(true);
    });
  });
});
