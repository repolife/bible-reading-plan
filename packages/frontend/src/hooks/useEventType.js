import { useEffect , useState} from "react";
import { useFamilyCalendarSelectors, useFamilyCalendarStore } from "../store/useFamilyCalendarStore";



export const useEventType = (eventId) => {
    const [eventTypeLabel, setEventTypeLabel] = useState('')
    const eventTypes = useFamilyCalendarSelectors.useEventTypes()
    const {fetchAllEvents, loading: fetchLoading} = useFamilyCalendarStore();
    const [events, setEvents] = useState([])
   
    useEffect(() => {
        const fetchEvents = async () => {
            const events = await fetchAllEvents()
            setEvents(events)
        }
        fetchEvents()
    }, [])


    useEffect(() => {
        if (!eventId) return
        if (eventTypes.length === 0) return;
        if(events.length === 0 || !events) return;

        const foundEvent = events.find(e => e.id === eventId)
        if (!foundEvent) return;

        const matchingType = eventTypes.find(t => t.id === foundEvent.event_type)
        const typeLabel = matchingType ? matchingType.label : (matchingType.label || 'Event')
        setEventTypeLabel(typeLabel)
    }, [eventId, eventTypes]    )
    return { eventTypeLabel, fetchLoading, events }
}