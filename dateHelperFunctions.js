function getTodaysEvents(calendarSource) {

    const src = calendarSource;
    src._loadEvents(true);

    const today = new Date();
    today.setHours(0, 0, 0, 0); // Get event from today at midnight

    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    const todaysEvents = src.getEvents(today, tomorrow);

    return todaysEvents;
}


function getNextEvent(todaysEvents) {
    const now = new Date();

    for (const event of todaysEvents) {
        const eventDate = event.date;

        if (now < eventDate) {
            return event;
        }
    }

    return null;
}


function getNextEventsToDisplay(todaysEvents) {
    const now = new Date();
    const N = todaysEvents.length;

    let currentEvent = null; // The calendar event the user is currently in
    let nextEvent = null; // The next calendar event coming up

    for (let i = 0; i < N; i++) {
        const event = todaysEvents[i];
        const eventStart = event.date;
        const eventEnd = event.end;

        if (now < eventStart) {
            
            nextEvent = event;
            break;
        }
        else if (now < eventEnd) {

            currentEvent = event;

            // Check whether there's an event after this one
            if (i < N - 1) {
                nextEvent = todaysEvents[i+1];
            }

            break;
        }
    }

    
    return {
            currentEvent: currentEvent,
            nextEvent: nextEvent
        };
}



function eventStatusToIndicatorText(eventStatus) {
    
    function displayNextEvent(event) {
        const timeText = getTimeOfEventAsText(event.date);
        const diffText = getTimeToEventAsText(event.date);
        
        return `In ${diffText}: ${event.summary} at ${timeText}`;
    }

    function displayCurrentEventAndNextEvent(currentEvent, nextEvent) {
        const endsInText = getTimeToEventAsText(currentEvent.end);
        const timeText = getTimeOfEventAsText(nextEvent.date);
        
        return `Ends in ${endsInText}. Next: ${nextEvent.summary} at ${timeText}`;
    }

    function displayCurrentEvent(event) {
        const endsInText = getTimeToEventAsText(event.end);
        
        return `${event.summary}: Ends in ${endsInText}`;
    }

    function displayNoEvents() {
        return "Done for today!";
    }


    const { currentEvent, nextEvent } = eventStatus;

    if (currentEvent != null) {
        if (nextEvent != null) {
            return displayCurrentEventAndNextEvent(currentEvent, nextEvent);
        }
        else {
            return displayCurrentEvent(currentEvent);
        }
    }
    else {
        if (nextEvent != null) {
            return displayNextEvent(nextEvent);
        }
        else {
            return displayNoEvents();
        }
    }
}



function getTimeOfEventAsText(eventDate) {
    const hrs = eventDate.getHours();
    let mins = eventDate.getMinutes().toString();

    mins = mins.padEnd(2, "0"); // Show e.g. 11am as 11:00 instead of 11:0

    const time = `${hrs}:${mins}`;
    return time;
}


function getTimeToEventAsText(eventDate) {

    const now = new Date();
    const diff = Math.abs(eventDate - now);
    const diffInMins = diff / (1000*60);

    const hrDiff = Math.floor(diffInMins / 60);
    const minDiff = Math.floor(diffInMins % 60);

    let diffText;
    if (hrDiff === 0) {
        diffText = minDiff + " min";
    }
    else {
        diffText = hrDiff + " hr " + minDiff + " min";
    }

    return diffText;
}