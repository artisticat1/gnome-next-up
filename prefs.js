'use strict';

const { Adw, Gio, Gtk } = imports.gi;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();


function init() {
}

function fillPreferencesWindow(window) {
    // Use the same GSettings schema as in `extension.js`
    const settings = ExtensionUtils.getSettings(
        'org.gnome.shell.extensions.next-up');

    // Create a preferences page and group
    const page = new Adw.PreferencesPage();
    const group = new Adw.PreferencesGroup();
    page.add(group);

    // Create a new preferences row
    const row = new Adw.ActionRow({ title: "Panel to show indicator in" });
    group.add(row);

    const dropdown = new Gtk.DropDown({
        model: Gtk.StringList.new(["Left", "Center", "Right"]),
        valign: Gtk.Align.CENTER
    });

    settings.bind(
        "which-panel",
        dropdown,
        "selected",
        Gio.SettingsBindFlags.DEFAULT
    );


    row.add_suffix(dropdown);
    row.activatable_widget = dropdown;

    // Add our page to the window
    window.add(page);
}