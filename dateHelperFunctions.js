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


function getTimeOfEventAsText(event) {
    const eventDate = event.date;
    const hrs = eventDate.getHours();
    let mins = eventDate.getMinutes().toString();

    mins = mins.padEnd(2, "0"); // Show e.g. 11am as 11:00 instead of 11:0

    const time = `${hrs}:${mins}`;
    return time;
}


function getTimeToEventAsText(event) {
    const eventDate = event.date;

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