import {
  BUILTIN_BUTTONS,
  USER_BUTTONS,
  createDefaultButtonModel,
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
});
