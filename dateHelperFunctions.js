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