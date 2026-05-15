import { renderConfiguratorHtml } from '../src/configuratorWebview';

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
