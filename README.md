![shortcut menu bar](images/1.jpg)

# Shortcut Menu Bar Plus - VSCode Extension

Add 35+ handy buttons like beautify, show opened files, save, toggle terminal, activity bar, Find replace etc to the editor menu bar in VSCode. You can also create your own buttons with custom commands, names, and icons.

[Forked](https://github.com/GorvGoyl/Shortcut-Menu-Bar-VSCode-Extension) from the great work of [Gourav Goyal](https://gourav.io)


#### [See on VSCode Marketplace](https://marketplace.visualstudio.com/items?itemName=snuffy2.shortcut-menu-bar-plus)

## 📷 Screenshot

![shortcut menu bar](images/intro.png)

## Configure buttons

Run `Shortcut Menu Bar Plus: Configure Buttons` from the Command Palette to manage the toolbar.

The configurator lets you:

- Enable or disable built-in and user buttons.
- Rearrange all toolbar buttons in one ordered list.
- Edit commands, labels, and codicons for the 10 user buttons.
- Pick user-button codicons from a suggestion list instead of typing setting values by hand.

After saving toolbar visibility, order, label, or icon changes, reload VS Code when prompted. VS Code applies editor title menu contributions during window load, so these toolbar changes are not visible until after reload. Command-only edits do not require a reload.

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

You can create up to 10 user-defined buttons in `Shortcut Menu Bar Plus: Configure Buttons`.
By default buttons are shown as numbers, and the configurator can set each button's label and icon.

![User Buttons](images/user-buttons.png)

You can also trigger a button by using corresponding hotkey combination (Windows: `Ctrl+Alt+0`, `Ctrl+Alt+1`, `Ctrl+Alt+2`, etc, Mac: `Shift+Cmd+0`, `Shift+Cmd+1`, `Shift+Cmd+2`, etc)

1. Run `Shortcut Menu Bar Plus: Configure Buttons`.
2. Enable one of the user buttons.
3. Add any [VSCode command](https://code.visualstudio.com/docs/getstarted/keybindings#_default-keyboard-shortcuts) or any other extension command in the command field.
4. Optionally set a label and codicon.
5. Save, then reload VS Code if prompted.

   ![Add Command](images/add-command.jpg)

User buttons also support:

- Pass command arguments: add command arguments separated by pipe (e.g. `workbench.action.tasks.runTask|My Task`)
- Run multiple commands: add comma-separated list of commands and those will get executed sequentially.
- If the label is empty, default labels are used (`user action 1` ... `user action 9`, `user action 0`).

Legacy per-user-button settings remain available for compatibility, but the configurator is the primary way to manage buttons.


### FAQ 🙋‍

**I found a bug, where to report?**  
Please create a [new issue on Github](https://github.com/Snuffy2/Shortcut-Menu-Bar-Plus-VSCode-Extension/issues).

**How can I add my own/custom buttons?**  
Follow above [section](#create-buttons-with-custom-commands).

**Can I contribute new buttons to the extension repo?**  
Sure. To add buttons see ["Adding new buttons" section of `help.md` file in repo](help.md#adding-new-buttons).  
Go through the [repo](https://github.com/Snuffy2/Shortcut-Menu-Bar-Plus-VSCode-Extension/), it's fairly simple to understand code and add a button. Send me a PR!

**How can I disable/Enable a button?**  
Follow above [section](#configure-buttons).
