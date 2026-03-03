const MAX_EVENT_SUMMARY_LENGTH = 35;
export const EVENT_LOOKAHEAD = {
  TODAY: 0,
  WEEK: 1,
  MONTH: 2,
};

function pluralize(value, singular, plural) {
  return `${value} ${value === 1 ? singular : plural}`;
}

function trimLongEventName(summary) {
  if (summary.length > MAX_EVENT_SUMMARY_LENGTH) {
    return summary.substring(0, MAX_EVENT_SUMMARY_LENGTH) + "...";
  } else {
    return summary;
  }
}

function notFullDayEvent(event) {
  return !(
    event.date.getHours() === 0 &&
    event.date.getMinutes() === 0 &&
    event.end.getHours() === 0 &&
    event.end.getMinutes() === 0
  );
}

function getLookaheadDays(lookaheadMode) {
  switch (lookaheadMode) {
    case EVENT_LOOKAHEAD.WEEK:
      return 7;
    case EVENT_LOOKAHEAD.MONTH:
      return 30;
    case EVENT_LOOKAHEAD.TODAY:
    default:
      return 1;
  }
}

function getNoEventsText(lookaheadMode) {
  switch (lookaheadMode) {
    case EVENT_LOOKAHEAD.WEEK:
      return "No more events this week!";
    case EVENT_LOOKAHEAD.MONTH:
      return "No upcoming events this month!";
    case EVENT_LOOKAHEAD.TODAY:
    default:
      return "Done for today!";
  }
}

export function getEventsForLookahead(calendarSource, lookaheadMode = 0) {
  const src = calendarSource;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const days = getLookaheadDays(lookaheadMode);
  const rangeEnd = new Date(today);
  rangeEnd.setDate(today.getDate() + days);

  // Ask GNOME Shell CalendarServer to populate/update this range before reading.
  src.requestRange(today, rangeEnd);

  const events = src.getEvents(today, rangeEnd).filter(notFullDayEvent);
  events.sort((a, b) => {
    const startDiff = a.date.valueOf() - b.date.valueOf();
    if (startDiff !== 0) {
      return startDiff;
    }

    return a.end.valueOf() - b.end.valueOf();
  });

  return events;
}

export function getTodaysEvents(calendarSource) {
  return getEventsForLookahead(calendarSource, EVENT_LOOKAHEAD.TODAY);
}

export function getNextEventsToDisplay(events) {
  const now = new Date();
  const N = events.length;

  let currentEvent = null; // The calendar event the user is currently in
  let nextEvent = null; // The next calendar event coming up
  let done = false;

  for (let i = 0; i < N; i++) {
    if (done) break;

    const event = events[i];
    const eventStart = event.date;
    const eventEnd = event.end;

    if (now < eventStart) {
      nextEvent = event;
      break;
    } else if (now < eventEnd) {
      currentEvent = event;

      // Check whether there's an event after this one
      if (i < N - 1) {
        let someNextEvent;

        for (let j = i + 1; j < N; j++) {
          someNextEvent = events[j];

          // Check whether the next event overlaps the current event
          // or whether they start at the same time

          if (!(someNextEvent.date.valueOf() === currentEvent.date.valueOf())) {
            nextEvent = someNextEvent;
            done = true;
            break;
          }
        }
      }
    }
  }

  return {
    currentEvent: currentEvent,
    nextEvent: nextEvent,
  };
}

function eventStatusToText(eventStatus, lookaheadMode, getDiffText) {
  function displayNextEvent(event) {
    const timeText = getTimeOfEventAsText(event.date);
    const diffText = getDiffText(event.date);

    const summary = trimLongEventName(event.summary);

    return `In ${diffText}: ${summary} at ${timeText}`;
  }

  function displayCurrentEventAndNextEvent(currentEvent, nextEvent) {
    const endsInText = getDiffText(currentEvent.end);
    const timeText = getTimeOfEventAsText(nextEvent.date);

    const summary = trimLongEventName(nextEvent.summary);

    return `Ends in ${endsInText}. Next: ${summary} at ${timeText}`;
  }

  function displayCurrentEvent(event) {
    const endsInText = getDiffText(event.end);
    const summary = trimLongEventName(event.summary);

    return `Ends in ${endsInText}: ${summary}`;
  }

  const { currentEvent, nextEvent } = eventStatus;

  if (currentEvent != null) {
    if (nextEvent != null) {
      return displayCurrentEventAndNextEvent(currentEvent, nextEvent);
    } else {
      return displayCurrentEvent(currentEvent);
    }
  } else {
    if (nextEvent != null) {
      return displayNextEvent(nextEvent);
    } else {
      return getNoEventsText(lookaheadMode);
    }
  }
}

export function eventStatusToIndicatorText(eventStatus, lookaheadMode = 0) {
  return eventStatusToText(eventStatus, lookaheadMode, getTimeToEventAsText);
}

export function eventStatusToLockScreenText(eventStatus, lookaheadMode = 0) {
  return eventStatusToText(eventStatus, lookaheadMode, getTimeToEventAsLongText);
}

export function eventStatusToTimerText(eventStatus, lookaheadMode = 0) {
  const { currentEvent, nextEvent } = eventStatus;

  if (currentEvent != null) {
    return `Ends in ${getTimeToEventAsText(currentEvent.end)}`;
  }
  if (nextEvent != null) {
    return `In ${getTimeToEventAsText(nextEvent.date)}`;
  }

  return getNoEventsText(lookaheadMode);
}

export function eventsToDesktopText(
  events,
  maxEventsToShow = 1,
  lookaheadMode = 0
) {
  const now = new Date();
  const clampedMaxEventsToShow = Math.max(1, Math.min(6, maxEventsToShow));
  const upcomingEvents = events
    .filter((event) => event.date > now)
    .slice(0, clampedMaxEventsToShow);

  if (upcomingEvents.length === 0) {
    return getNoEventsText(lookaheadMode);
  }

  return upcomingEvents
    .map((event) => {
      const timeText = getTimeOfEventAsText(event.date);
      const diffText = getTimeToEventAsLongText(event.date);
      const summary = trimLongEventName(event.summary);
      return `${timeText} - ${summary} (in ${diffText})`;
    })
    .join("\n");
}

function getTimeOfEventAsText(eventDate) {
  const hrs = eventDate.getHours().toString().padStart(2, "0");
  const mins = eventDate.getMinutes().toString().padStart(2, "0");

  return `${hrs}:${mins}`;
}

function getTimeToEventParts(eventDate) {
  const now = new Date();
  const diff = Math.abs(eventDate - now);
  const totalMinutes = Math.max(0, Math.ceil(diff / (1000 * 60)));
  const days = Math.floor(totalMinutes / (24 * 60));
  const remainingMinutesAfterDays = totalMinutes % (24 * 60);
  const hours = Math.floor(remainingMinutesAfterDays / 60);
  const minutes = remainingMinutesAfterDays % 60;

  return { days, hours, minutes };
}

function getTimeToEventAsText(eventDate) {
  const { days, hours, minutes } = getTimeToEventParts(eventDate);

  if (days > 0) {
    return pluralize(days, "day", "days");
  }

  if (hours > 0) {
    return `${hours} hr ${minutes} min`;
  }

  return `${minutes} min`;
}

function getTimeToEventAsLongText(eventDate) {
  const { days, hours, minutes } = getTimeToEventParts(eventDate);

  if (days > 0) {
    return `${pluralize(days, "day", "days")}, ${pluralize(hours, "hour", "hours")}, ${pluralize(minutes, "minute", "minutes")}`;
  }

  if (hours > 0) {
    return `${pluralize(hours, "hour", "hours")}, ${pluralize(minutes, "minute", "minutes")}`;
  }

  return pluralize(minutes, "minute", "minutes");
}
