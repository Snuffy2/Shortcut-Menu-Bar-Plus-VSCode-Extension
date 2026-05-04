![shortcut menu bar](images/1.jpg)

# Shortcut Menu Bar Plus - VSCode Extension

Add 35+ handy buttons like beautify, show opened files, save, toggle terminal, activity bar, Find replace etc to the editor menu bar in VSCode. You can also create your own buttons with custom commands, names, and icons.

[Forked](https://github.com/GorvGoyl/Shortcut-Menu-Bar-VSCode-Extension) from the great work of [Gourav Goyal](https://gourav.io)


#### [See on VSCode Marketplace](https://marketplace.visualstudio.com/items?itemName=snuffy2.shortcut-menu-bar-plus)

## 📷 Screenshot

![shortcut menu bar](images/intro.png)

## ⚙ Enable/Disable buttons from VSCode settings

Go to VSCode settings (`CTRL+,` or `CMD+,`) and search for `shortcut menu bar`. Toggle buttons from there.

![shortcut menu bar](images/settings.jpg)

## ✅ Currently added buttons

![shortcut menu bar](images/all_buttons.png)

✔ Save active file  
✔ Navigate back  
✔ Navigate forward  
✔ Beautify/format document or selection  
✔ Beautify/format document or selection with multiple formatters  
✔ Undo/Redo buttons  
✔ Open files list  
✔ Save all  
✔ show/hide terminal  
✔ show/hide render whitespace  
✔ Quick open (Ctrl+P)  
✔ show/hide activity bar  
✔ Find & replace in active file (Ctrl+H)  
✔ Switch header source (for .cpp files)  
✔ Toggle line comment  
✔ Open file, New file  
✔ Go to definition  
✔ Cut, Copy, Paste  
✔ Start Debugging  
✔ User-defined buttons (0-9)

## Create buttons with custom commands

You can create upto 10 user-defined buttons.  
By default buttons are shown as numbers (you can now rename them in settings).

![User Buttons](images/user-buttons.png)

You can also trigger a button by using corresponding hotkey combination (Windows: `Ctrl+Alt+0`, `Ctrl+Alt+1`, `Ctrl+Alt+2`, etc, Mac: `Shift+Cmd+0`, `Shift+Cmd+1`, `Shift+Cmd+2`, etc)

1. Got to extension settings (`Ctrl+,` or `Cmd+,`).
2. Look for `Shortcut Menu Bar Plus: User Button`
3. Add any [VSCode command](https://code.visualstudio.com/docs/getstarted/keybindings#_default-keyboard-shortcuts) or any other extension command in the input field. Button icon will be visible only when you add a command.

   ![Add Command](images/add-command.jpg)

Optionally, you can also:

- Pass command arguments: add command arguments separated by pipe (e.g. `workbench.action.tasks.runTask|My Task`)
- Run multiple commands: add comma-separated list of commands and those will get executed sequentially.
- Set a custom display name per button (`Shortcut Menu Bar Plus: User Button XX Name`)
- Set a custom codicon per button (`Shortcut Menu Bar Plus: User Button XX Icon`)

## User Button Customization (New)

Each user button (`01` to `10`) now supports:

- `...User Button XX Command`: command(s) to execute
- `...User Button XX Name`: custom label shown in tooltip and Command Palette
- `...User Button XX Icon`: custom codicon used for the toolbar icon

Notes:

- If name is empty, default labels are used (`user action 1` ... `user action 9`, `user action 0`).
- Icon/name changes prompt a reload action in VS Code.
- Custom icon/name settings are re-applied automatically on startup (for example after extension updates).



### FAQ 🙋‍

**I found a bug, where to report?**  
Please create a [new issue on Github](https://github.com/Snuffy2/Shortcut-Menu-Bar-Plus-VSCode-Extension/issues).

**How can I add my own/custom buttons?**  
Follow above [section](#create-buttons-with-custom-commands).

**Can I contribute new buttons to the extension repo?**  
Sure. To add buttons see ["Adding new buttons" section of `help.md` file in repo](help.md#adding-new-buttons).  
Go through the [repo](https://github.com/Snuffy2/Shortcut-Menu-Bar-Plus-VSCode-Extension/), it's fairly simple to understand code and add a button. Send me a PR!

**How can I disable/Enable a button?**  
Follow above [section](#-enabledisable-buttons-from-vscode-settings).
