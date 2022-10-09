/* extension.js
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 2 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 *
 * SPDX-License-Identifier: GPL-2.0-or-later
 */

/* exported init */

const GETTEXT_DOMAIN = 'my-indicator-extension';

const { GObject, St, Clutter, GLib } = imports.gi;

const ExtensionUtils = imports.misc.extensionUtils;
const Main = imports.ui.main;
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;

const _ = ExtensionUtils.gettext;


const Calendar = imports.ui.calendar;

const Me = ExtensionUtils.getCurrentExtension();
const DateHelperFunctions = Me.imports.dateHelperFunctions;


const Indicator = GObject.registerClass(
class Indicator extends PanelMenu.Button {
    _init() {
        super._init(0.0, _('Next Up Indicator'));

        this._calendarSource = new Calendar.DBusEventSource();
        
        this._loadGUI();
    }



    _loadGUI() {
        this._menuLayout = new St.BoxLayout({
            vertical: false,
            clip_to_allocation: true,
            x_align: Clutter.ActorAlign.START,
            y_align: Clutter.ActorAlign.CENTER,
            reactive: true,
            x_expand: true,
            pack_start: false
        });
        
        const icon = new St.Icon({
            icon_name: 'alarm-symbolic',
            style_class: 'system-status-icon'
        });
        this.text = new St.Label({
            text: "Loading",
            style_class: "system-status-text",
            y_expand: true,
            y_align: Clutter.ActorAlign.CENTER
        });


        this._menuLayout.add_actor(icon);
        this._menuLayout.add_actor(this.text);
        this.add_actor(this._menuLayout);

        return;
    }


    displayEvent(event) {
        const timeText = DateHelperFunctions.getTimeOfEventAsText(event);
        const diffText = DateHelperFunctions.getTimeToEventAsText(event);

        this.text.set_text(`In ${diffText}: ${event.summary} at ${timeText}`);
    }
    
    displayNoEvents() {
        this.text.set_text("Done for today!");
    }

});



class Extension {
    constructor(uuid) {
        this._uuid = uuid;

        ExtensionUtils.initTranslations(GETTEXT_DOMAIN);
    }

    enable() {
        this._indicator = new Indicator();
        
        Main.panel._centerBox.insert_child_at_index(this._indicator.container, 0);


        this._startLoop();        
    }

    _startLoop() {
        this.sourceId = GLib.timeout_add_seconds(
            GLib.PRIORITY_DEFAULT,
            5,                               // seconds to wait
            () => {
                const todaysEvents = DateHelperFunctions.getTodaysEvents(this._indicator._calendarSource);
                const nextEvent = DateHelperFunctions.getNextEvent(todaysEvents);

                if (nextEvent != null) {
                    this._indicator.displayEvent(nextEvent);
                }
                else {
                    this._indicator.displayNoEvents();
                }

                return GLib.SOURCE_CONTINUE;
            }
        );
    }

    _stopLoop() {
        GLib.Source.remove(this.sourceId);
    }

    disable() {
        Main.panel._centerBox.remove_child(this._indicator.container);

        this._indicator.destroy();
        this._indicator = null;

        this._stopLoop();
    }
}



function init(meta) {
    return new Extension(meta.uuid);
}

