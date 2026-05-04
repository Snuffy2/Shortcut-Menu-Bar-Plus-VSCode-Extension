import * as fs from 'fs';
import * as path from 'path';
import { applyUserButtonName } from '../src/packageUpdater';

jest.mock('fs');

const mockFs = fs as jest.Mocked<typeof fs>;

function makePkg(title: string): string {
  return JSON.stringify(
    {
      contributes: {
        commands: [
          { command: 'ShortcutMenuBarPlus.userButton01', title },
          { command: 'ShortcutMenuBarPlus.userButton10', title: 'user action 0' },
        ],
      },
    },
    null,
    2
  );
}

describe('applyUserButtonName', () => {
  const extensionPath = '/fake/ext';

  beforeEach(() => {
    jest.clearAllMocks();
    (mockFs.readFileSync as jest.Mock).mockReturnValue(makePkg('user action 1'));
    (mockFs.writeFileSync as jest.Mock).mockImplementation(() => {});
  });

  it('reads package.json from extensionPath', () => {
    applyUserButtonName('01', 'My Button', extensionPath);
    expect(mockFs.readFileSync).toHaveBeenCalledWith(
      path.join(extensionPath, 'package.json'),
      'utf8'
    );
  });

  it('writes updated package.json with the custom name', () => {
    applyUserButtonName('01', 'My Button', extensionPath);
    const written = JSON.parse(
      (mockFs.writeFileSync as jest.Mock).mock.calls[0][1] as string
    );
    expect(written.contributes.commands[0].title).toBe('My Button');
  });

  it('resets to default title when name is null', () => {
    (mockFs.readFileSync as jest.Mock).mockReturnValue(makePkg('My Button'));
    applyUserButtonName('01', null, extensionPath);
    const written = JSON.parse(
      (mockFs.writeFileSync as jest.Mock).mock.calls[0][1] as string
    );
    expect(written.contributes.commands[0].title).toBe('user action 1');
  });

  it('resets to default title when name is empty string', () => {
    applyUserButtonName('01', '', extensionPath);
    const written = JSON.parse(
      (mockFs.writeFileSync as jest.Mock).mock.calls[0][1] as string
    );
    expect(written.contributes.commands[0].title).toBe('user action 1');
  });

  it('resets button 10 to "user action 0" when name is cleared', () => {
    (mockFs.readFileSync as jest.Mock).mockReturnValue(makePkg('custom'));
    applyUserButtonName('10', null, extensionPath);
    const written = JSON.parse(
      (mockFs.writeFileSync as jest.Mock).mock.calls[0][1] as string
    );
    const cmd = written.contributes.commands.find(
      (c: { command: string }) => c.command === 'ShortcutMenuBarPlus.userButton10'
    );
    expect(cmd.title).toBe('user action 0');
  });

  it('does not write when command is not found, and logs a warning', () => {
    (mockFs.readFileSync as jest.Mock).mockReturnValue(
      JSON.stringify({ contributes: { commands: [] } })
    );
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    applyUserButtonName('01', 'My Button', extensionPath);

    expect(mockFs.writeFileSync).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('userButton01')
    );
    warnSpy.mockRestore();
  });

  it('does not throw when contributes is missing, and logs a warning', () => {
    (mockFs.readFileSync as jest.Mock).mockReturnValue(
      JSON.stringify({})
    );
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    applyUserButtonName('01', 'My Button', extensionPath);

    expect(mockFs.writeFileSync).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('userButton01')
    );
    warnSpy.mockRestore();
  });

  it('writes JSON with 2-space indentation', () => {
    applyUserButtonName('01', 'My Button', extensionPath);
    const raw = (mockFs.writeFileSync as jest.Mock).mock.calls[0][1] as string;
    expect(raw).toMatch(/^{\n  /);
  });
});
