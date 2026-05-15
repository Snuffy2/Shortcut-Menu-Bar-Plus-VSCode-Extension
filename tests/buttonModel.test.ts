import {
  BUILTIN_BUTTONS,
  USER_BUTTONS,
  ButtonEntry,
  LegacyGetter,
  createDefaultButtonModel,
  buildModelFromLegacySettings,
  normalizeButtonModel,
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
  });
});
