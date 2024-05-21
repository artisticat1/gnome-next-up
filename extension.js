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

import GLib from "gi://GLib";
import GObject from "gi://GObject";

import * as Main from "resource:///org/gnome/shell/ui/main.js";
import { Extension } from "resource:///org/gnome/shell/extensions/extension.js";

import Indicator from "./src/indicator.js";
import * as DateHelperFunctions from "./src/date.js";

const IndicatorInstance = GObject.registerClass(Indicator);

export default class NextUpExtension extends Extension {
  enable() {
    this._indicator = new IndicatorInstance();

    this._settings = this.getSettings();
    this._settingChangedSignal = this._settings.connect(
      "changed::which-panel",
      () => {
        this.unloadIndicator();
        this.loadIndicator();
      }
    );

    // Wait 3 seconds before loading the indicator
    // So that it isn't loaded too early and positioned after other elements in the panel
    this.delaySourceId = GLib.timeout_add_seconds(
      GLib.PRIORITY_DEFAULT,
      3,
      () => {
        this.loadIndicator();
        this._startLoop();

        return false;
      }
    );
  }

  _startLoop() {
    this.sourceId = GLib.timeout_add_seconds(
      GLib.PRIORITY_DEFAULT,
      5, // seconds to wait
      () => {
        this.refreshIndicator();

        return GLib.SOURCE_CONTINUE;
      }
    );
  }

  loadIndicator() {
    const boxes = [
      Main.panel._leftBox,
      Main.panel._centerBox,
      Main.panel._rightBox,
    ];

    const whichPanel = this._settings.get_int("which-panel");

    boxes[whichPanel].insert_child_at_index(this._indicator.container, 0);
  }

  unloadIndicator() {
    this._indicator.container
      .get_parent()
      .remove_child(this._indicator.container);
  }

  refreshIndicator() {
    const todaysEvents = DateHelperFunctions.getTodaysEvents(
      this._indicator._calendarSource
    );
    const eventStatus =
      DateHelperFunctions.getNextEventsToDisplay(todaysEvents);
    const text = DateHelperFunctions.eventStatusToIndicatorText(eventStatus);

    if (eventStatus.currentEvent === null && eventStatus.nextEvent === null) {
      this._indicator.showConfettiIcon();
    } else {
      this._indicator.showAlarmIcon();
    }

    this._indicator.setText(text);
  }

  disable() {
    Main.panel._centerBox.remove_child(this._indicator.container);

    this._settings.disconnect(this._settingChangedSignal);

    this._indicator.destroy();
    this._indicator = null;

    if (this.sourceId) {
      GLib.Source.remove(this.sourceId);
      this.sourceId = null;
    }

    if (this.delaySourceId) {
      GLib.Source.remove(this.delaySourceId);
      this.delaySourceId = null;
    }
  }
}
