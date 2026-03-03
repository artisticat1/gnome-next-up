#!/usr/bin/env -S gjs -m

import Gio from "gi://Gio";
import GLib from "gi://GLib";
import System from "system";

const CALENDAR_SERVER_XML = `<?xml version="1.0"?>
<node>
  <interface name="org.gnome.Shell.CalendarServer">
    <method name="SetTimeRange">
      <arg type="x" name="since" direction="in"/>
      <arg type="x" name="until" direction="in"/>
      <arg type="b" name="force_reload" direction="in"/>
    </method>
    <signal name="EventsAddedOrUpdated">
      <arg type="a(ssxxa{sv})" name="events" direction="out"/>
    </signal>
    <signal name="EventsRemoved">
      <arg type="as" name="ids" direction="out"/>
    </signal>
    <signal name="ClientDisappeared">
      <arg type="s" name="source_uid" direction="out"/>
    </signal>
    <property name="HasCalendars" type="b" access="read"/>
  </interface>
</node>`;

const CalendarServerInfo = Gio.DBusInterfaceInfo.new_for_xml(CALENDAR_SERVER_XML);

function monthRange(now = new Date()) {
  const begin = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 1, 0, 0, 0, 0);
  return { begin, end };
}

function formatDate(date) {
  return date.toISOString().replace("T", " ").replace(".000Z", "Z");
}

function removeByPrefix(eventMap, idPrefix) {
  for (const id of [...eventMap.keys()]) {
    if (id.startsWith(idPrefix)) {
      eventMap.delete(id);
    }
  }
}

async function main() {
  const waitMs = Number.parseInt(ARGV[0] ?? "2000", 10);
  const { begin, end } = monthRange();
  const beginUnix = Math.floor(begin.getTime() / 1000);
  const endUnix = Math.floor(end.getTime() / 1000);

  const proxy = new Gio.DBusProxy({
    g_connection: Gio.DBus.session,
    g_interface_name: CalendarServerInfo.name,
    g_interface_info: CalendarServerInfo,
    g_name: "org.gnome.Shell.CalendarServer",
    g_object_path: "/org/gnome/Shell/CalendarServer",
  });
  await proxy.init_async(GLib.PRIORITY_DEFAULT, null);

  print(`HasCalendars: ${proxy.get_cached_property("HasCalendars")?.unpack() ?? false}`);
  print(`Range begin: ${begin.toString()}`);
  print(`Range end:   ${end.toString()}`);
  print(`Waiting ${waitMs} ms for DBus events...`);

  const events = new Map();

  proxy.connectSignal("EventsAddedOrUpdated", (_proxy, _sender, [items = []]) => {
    for (const item of items) {
      const [id, summary, startUnix, endUnixTs] = item;

      // Recurring event update: clear previous occurrences from the same parent id.
      if (!id.endsWith("\n")) {
        const parentId = id.substring(0, id.lastIndexOf("\n") + 1);
        if (parentId.length > 0) {
          removeByPrefix(events, parentId);
        }
      }

      events.set(id, {
        id,
        summary,
        start: new Date(Number(startUnix) * 1000),
        end: new Date(Number(endUnixTs) * 1000),
      });
    }
  });

  proxy.connectSignal("EventsRemoved", (_proxy, _sender, [ids = []]) => {
    for (const id of ids) {
      removeByPrefix(events, id);
    }
  });

  proxy.call_sync(
    "SetTimeRange",
    new GLib.Variant("(xxb)", [beginUnix, endUnix, true]),
    Gio.DBusCallFlags.NONE,
    -1,
    null
  );

  const loop = new GLib.MainLoop(null, false);
  GLib.timeout_add(GLib.PRIORITY_DEFAULT, waitMs, () => {
    loop.quit();
    return GLib.SOURCE_REMOVE;
  });
  loop.run();

  const sorted = [...events.values()]
    .filter((e) => e.end > begin && e.start < end)
    .sort((a, b) => a.start - b.start);

  print("");
  print(`Events returned: ${sorted.length}`);
  for (const e of sorted) {
    print(
      `- ${formatDate(e.start)} -> ${formatDate(e.end)} | ${e.summary} | ${e.id}`
    );
  }
}

main().catch((err) => {
  printerr(`Error: ${err.message}`);
  System.exit(1);
});
