import * as fs from 'fs';
import * as path from 'path';
import { applyUserButtonIcon } from '../src/iconGenerator';

jest.mock('fs');

const mockFs = fs as jest.Mocked<typeof fs>;

const CODICON_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="16" height="16">' +
  '<path fill-rule="evenodd" clip-rule="evenodd" d="M8 1a7 7 0 100 14A7 7 0 008 1z"/>' +
  '</svg>';

describe('applyUserButtonIcon', () => {
  const extensionPath = '/fake/ext';

  beforeEach(() => {
    jest.clearAllMocks();
    (mockFs.readFileSync as jest.Mock).mockReturnValue(CODICON_SVG);
    (mockFs.writeFileSync as jest.Mock).mockImplementation(() => {});
  });

  it('reads the codicon SVG from the correct path', () => {
    applyUserButtonIcon('01', 'star', extensionPath);
    expect(mockFs.readFileSync).toHaveBeenCalledWith(
      path.join(extensionPath, 'node_modules', '@vscode', 'codicons', 'src', 'icons', 'star.svg'),
      'utf8'
    );
  });

  it('writes dark SVG with fill #C5C5C5 to images/userButtonXX.svg', () => {
    applyUserButtonIcon('01', 'star', extensionPath);
    const call = (mockFs.writeFileSync as jest.Mock).mock.calls.find(
      (c: unknown[]) => (c[0] as string).endsWith('userButton01.svg')
    );
    expect(call).toBeDefined();
    expect(call![1]).toContain('fill="#C5C5C5"');
    expect(call![2]).toBe('utf8');
  });

  it('writes light SVG with fill #424242 to images/userButtonXX_light.svg', () => {
    applyUserButtonIcon('01', 'star', extensionPath);
    const call = (mockFs.writeFileSync as jest.Mock).mock.calls.find(
      (c: unknown[]) => (c[0] as string).endsWith('userButton01_light.svg')
    );
    expect(call).toBeDefined();
    expect(call![1]).toContain('fill="#424242"');
    expect(call![2]).toBe('utf8');
  });

  it('uses correct file paths for button index 10', () => {
    applyUserButtonIcon('10', 'gear', extensionPath);
    expect(mockFs.writeFileSync).toHaveBeenCalledWith(
      path.join(extensionPath, 'images', 'userButton10.svg'),
      expect.any(String),
      'utf8'
    );
    expect(mockFs.writeFileSync).toHaveBeenCalledWith(
      path.join(extensionPath, 'images', 'userButton10_light.svg'),
      expect.any(String),
      'utf8'
    );
  });

  it('does not write files when codicon is not found, and logs a warning', () => {
    (mockFs.readFileSync as jest.Mock).mockImplementation(() => {
      throw new Error('ENOENT: no such file');
    });
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    applyUserButtonIcon('01', 'nonexistent-icon', extensionPath);

    expect(mockFs.writeFileSync).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('nonexistent-icon')
    );
    warnSpy.mockRestore();
  });

  it('strips existing fill attributes from the codicon SVG before adding new fill', () => {
    const svgWithFill =
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="16" height="16">' +
      '<path fill="#ff0000" d="M0 0h16v16H0z"/>' +
      '</svg>';
    (mockFs.readFileSync as jest.Mock).mockReturnValue(svgWithFill);

    applyUserButtonIcon('01', 'star', extensionPath);

    const darkCall = (mockFs.writeFileSync as jest.Mock).mock.calls.find(
      (c: unknown[]) => (c[0] as string).endsWith('userButton01.svg')
    );
    expect(darkCall![1]).not.toContain('fill="#ff0000"');
    expect(darkCall![1]).toContain('fill="#C5C5C5"');
  });
});
