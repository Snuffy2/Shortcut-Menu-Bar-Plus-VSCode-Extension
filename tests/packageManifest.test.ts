import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('extension package metadata', () => {
  it('activates after startup so saved manifest customizations are restored', () => {
    const pkg = JSON.parse(
      readFileSync(resolve(process.cwd(), 'package.json'), 'utf8')
    );

    expect(pkg.activationEvents).toContain('onStartupFinished');
  });

  it('excludes internal agent and planning files from the VSIX package', () => {
    const vscodeIgnore = readFileSync(
      resolve(process.cwd(), '.vscodeignore'),
      'utf8'
    );

    expect(vscodeIgnore).toContain('AGENTS.md');
    expect(vscodeIgnore).toContain('MEMORY.md');
    expect(vscodeIgnore).toContain('docs/superpowers/**');
    expect(vscodeIgnore).toContain('*.vsix');
  });
});
