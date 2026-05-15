# Shortcut Menu Bar Plus Button Configurator Design

## Purpose

The extension's button customization should move from many individual settings to a primary graphical configuration UI. Users should manage button visibility, order, and user button customization from one command-driven UI instead of searching through dozens of settings.

The design keeps VS Code's extension constraints explicit: native editor title buttons still come from `package.json` menu contributions, so the custom UI configures the toolbar indirectly. Toolbar order, icons, and command titles may require a VS Code window reload after saving.

## Scope

This design covers:

- A new primary `Shortcut Menu Bar Plus: Configure Buttons` command.
- A webview-based configurator for all built-in buttons and the existing 10 user buttons.
- Reordering and enable/disable controls for every button.
- User button command, label, and codicon customization.
- Migration from current per-button settings into a compact structured model.
- Clear reload messaging after changes that need VS Code to reload contributed menu metadata.

This design does not cover:

- Arbitrary custom button counts beyond the existing 10 user button slots.
- Custom built-in button labels or icons.
- Direct drag/drop manipulation of VS Code's native toolbar DOM.
- PR publishing or release workflow changes.

## User Experience

Users open the configurator from the Command Palette with `Shortcut Menu Bar Plus: Configure Buttons`.

The configurator shows one ordered list containing built-in buttons and user buttons. Each row includes:

- The current icon preview.
- The display label.
- The button type: built-in or user.
- An enabled/disabled toggle.
- Reorder controls, including drag/drop and keyboard-accessible move up/down actions.

Built-in rows are intentionally constrained. Users can enable, disable, and reorder them, but cannot edit their label, icon, command ID, or behavior.

User button rows expose editable fields:

- Command string.
- Display label.
- Codicon selection.

The codicon selector should be graphical and searchable. It should show icon previews with codicon names and write the selected codicon name into the button model.

Saving changes writes the structured model and applies generated artifacts where needed. If saved changes affect native toolbar metadata, the UI must show a visible message explaining that a reload is required and must offer a `Reload Window` action. The message should not imply that toolbar changes are live until reload completes.

## Configuration Model

The primary backing setting is `ShortcutMenuBarPlus.buttons`, an array of button entries.

Built-in button entry:

```json
{
  "id": "save",
  "type": "builtin",
  "enabled": true
}
```

User button entry:

```json
{
  "id": "userButton01",
  "type": "user",
  "enabled": true,
  "command": "workbench.action.tasks.runTask|Build",
  "label": "Build",
  "icon": "tools"
}
```

The extension owns canonical built-in metadata in code:

- Stable model ID.
- Extension command ID.
- Default title.
- Default icon path or codicon-backed packaged icon.
- Default `when` clause.
- Default execution target or custom handler type.

The extension owns canonical user button metadata for `userButton01` through `userButton10`, preserving existing IDs, hotkeys, command names, and the `user action 0` title convention for button 10.

If `ShortcutMenuBarPlus.buttons` is missing, the extension creates an in-memory model from existing boolean settings and user button command/name/icon settings. The configurator can then save that migrated model. Existing settings remain readable for compatibility during the transition.

## Apply Flow

On save:

1. Validate the submitted model.
2. Preserve only known built-in IDs and known user button IDs.
3. Normalize duplicate or missing entries by appending missing known buttons in default order and ignoring duplicate IDs after the first occurrence.
4. Write `ShortcutMenuBarPlus.buttons`.
5. Generate user button icon SVGs for user buttons with custom icons.
6. Update user button command titles in the installed `package.json`.
7. Rewrite `contributes.menus["editor/title"]` groups so enabled ordered entries receive sequential `navigation@N` groups.
8. Preserve unrelated manifest content, two-space JSON indentation, and trailing newline.
9. Show reload-required UI when order, icon, label, or menu visibility changed.

The installed manifest rewrite should continue to use atomic file writes. Errors should be logged with command/button identity and surfaced in the configurator as actionable failure messages.

## Compatibility

The existing individual settings should not be removed in the first implementation. They should be treated as legacy inputs:

- Existing users keep their current button setup.
- The first configurator save writes the new structured model.
- Runtime startup uses the structured model when present.
- If the structured model is absent, runtime falls back to legacy settings.

Documentation should describe the configurator as the primary management path and mention that legacy settings may still exist for compatibility.

## Testing

Add focused Jest coverage for:

- Default model creation from canonical metadata.
- Legacy settings migration, including user button 10 title behavior.
- Model normalization for missing, duplicate, disabled, and unknown entries.
- Manifest menu rewrite order and preservation of unrelated manifest content.
- User button icon/title application from the structured model.
- Reload-required detection for order, icon, label, and visibility changes.

Run the existing TypeScript compile and Jest test commands before claiming implementation complete.

## Open Decisions

There are no open product decisions for this design. The approved constraints are:

- The configurator is the primary user-facing management UI.
- Built-in buttons support only reorder and enable/disable.
- User button customization is limited to the existing 10 slots.
- Reload after saving is acceptable when the UI clearly explains the requirement and provides a reload action.
