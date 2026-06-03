import { useCallback, useEffect, useMemo, useState } from "react";
import { Calendar, dateFnsLocalizer } from "react-big-calendar";
import { format, getDay, parse, startOfWeek } from "date-fns";
import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Flag,
  Loader2,
  RefreshCw,
  Sparkles,
  Target,
  Users,
} from "lucide-react";
import api from "../../services/api";
import "react-big-calendar/lib/css/react-big-calendar.css";
import "./CalendarPage.css";

const locales = {};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

const EVENT_META = {
  holiday: { label: "Holiday", tone: "holiday", icon: Sparkles },
  company_event: { label: "Company Event", tone: "event", icon: Users },
  deadline: { label: "Deadline", tone: "deadline", icon: Clock3 },
  milestone: { label: "Milestone", tone: "milestone", icon: Flag },
  leave: { label: "Approved Leave", tone: "leave", icon: CheckCircle2 },
  meeting: { label: "Meeting", tone: "meeting", icon: CalendarDays },
};

const startOfMonthRange = (date) => {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  start.setDate(start.getDate() - 7);
  return start;
};

const endOfMonthRange = (date) => {
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  end.setDate(end.getDate() + 7);
  return end;
};

const toApiDate = (date) => format(date, "yyyy-MM-dd");

const parseLocalDate = (value, endOfDay = false) => {
  if (!value) return new Date();
  const [year, month, day] = String(value).split("-").map(Number);

  if (!year || !month || !day) {
    const fallback = new Date(value);
    return Number.isNaN(fallback.getTime()) ? new Date() : fallback;
  }

  return new Date(
    year,
    month - 1,
    day,
    endOfDay ? 23 : 0,
    endOfDay ? 59 : 0,
    endOfDay ? 59 : 0
  );
};

const formatDateRange = (event) => {
  const start = format(event.start, "MMM d, yyyy");
  const end = format(event.end, "MMM d, yyyy");
  return start === end ? start : `${start} - ${end}`;
};

const buildCalendarEvent = (item) => {
  const eventType = item.event_type || "company_event";
  const meta = EVENT_META[eventType] || EVENT_META.company_event;

  return {
    id: `${item.source}-${item.id}`,
    rawId: item.id,
    title: item.title,
    description: item.description || "",
    eventType,
    eventTypeLabel: item.event_type_label || meta.label,
    source: item.source,
    start: parseLocalDate(item.start_date),
    end: parseLocalDate(item.end_date || item.start_date, true),
    allDay: true,
    resource: item,
    tone: meta.tone,
  };
};

function EventPill({ event }) {
  const meta = EVENT_META[event.eventType] || EVENT_META.company_event;
  const Icon = meta.icon;

  return (
    <span className={`calendar-event-pill calendar-event-pill--${event.tone}`}>
      <Icon size={12} />
      <span>{event.title}</span>
    </span>
  );
}

function AgendaItem({ event }) {
  const meta = EVENT_META[event.eventType] || EVENT_META.company_event;
  const Icon = meta.icon;

  return (
    <article className={`calendar-agenda-item calendar-agenda-item--${event.tone}`}>
      <div className="calendar-agenda-icon">
        <Icon size={16} />
      </div>
      <div className="calendar-agenda-body">
        <div className="calendar-agenda-topline">
          <h3>{event.title}</h3>
          <span>{event.eventTypeLabel}</span>
        </div>
        <p>{formatDateRange(event)}</p>
        {event.description && <small>{event.description}</small>}
      </div>
    </article>
  );
}

export default function CalendarPage() {
  const [events, setEvents] = useState([]);
  const [view, setView] = useState("month");
  const [date, setDate] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchEvents = useCallback(async (targetDate = date) => {
    setLoading(true);
    setError("");

    try {
      const res = await api.get("/calendar/feed/", {
        params: {
          start_date: toApiDate(startOfMonthRange(targetDate)),
          end_date: toApiDate(endOfMonthRange(targetDate)),
        },
      });

      const nextEvents = Array.isArray(res.data)
        ? res.data.map(buildCalendarEvent)
        : [];

      setEvents(nextEvents);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Failed to load the company calendar."
      );
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => {
    fetchEvents(date);
  }, [date, fetchEvents]);

  const upcomingEvents = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return events
      .filter((event) => event.end >= today)
      .sort((a, b) => a.start - b.start || a.title.localeCompare(b.title))
      .slice(0, 8);
  }, [events]);

  const counts = useMemo(() => (
    events.reduce((acc, event) => {
      acc[event.eventType] = (acc[event.eventType] || 0) + 1;
      return acc;
    }, {})
  ), [events]);

  const eventPropGetter = (event) => ({
    className: `calendar-rbc-event calendar-rbc-event--${event.tone}`,
  });

  return (
    <div className="calendar-page">
      <header className="calendar-header">
        <div>
          <span className="calendar-eyebrow">
            <CalendarDays size={15} />
            Company Calendar
          </span>
          <h1>Calendar</h1>
          <p>
            Company holidays, events, deadlines, milestones, and approved leave in one shared schedule.
          </p>
        </div>

        <button
          type="button"
          className="calendar-refresh"
          onClick={() => fetchEvents(date)}
          disabled={loading}
        >
          {loading ? <Loader2 size={16} className="calendar-spin" /> : <RefreshCw size={16} />}
          Refresh
        </button>
      </header>

      {error && (
        <div className="calendar-message calendar-message--error">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      <section className="calendar-stat-grid">
        {Object.entries(EVENT_META)
          .filter(([type]) => ["holiday", "company_event", "deadline", "milestone", "leave"].includes(type))
          .map(([type, meta]) => {
            const Icon = meta.icon;
            return (
              <div key={type} className={`calendar-stat calendar-stat--${meta.tone}`}>
                <div className="calendar-stat-icon">
                  <Icon size={18} />
                </div>
                <div>
                  <strong>{loading ? "-" : counts[type] || 0}</strong>
                  <span>{meta.label}</span>
                </div>
              </div>
            );
          })}
      </section>

      <div className="calendar-shell">
        <section className="calendar-card calendar-main-card">
          <div className="calendar-toolbar">
            <div>
              <h2>{format(date, "MMMM yyyy")}</h2>
              <p>{view === "month" ? "Month view" : "Week view"}</p>
            </div>
            <div className="calendar-view-toggle" aria-label="Calendar view">
              <button
                type="button"
                className={view === "month" ? "is-active" : ""}
                onClick={() => setView("month")}
              >
                Month
              </button>
              <button
                type="button"
                className={view === "week" ? "is-active" : ""}
                onClick={() => setView("week")}
              >
                Week
              </button>
            </div>
          </div>

          <div className="calendar-board" aria-busy={loading}>
            {loading && (
              <div className="calendar-loading">
                <Loader2 size={22} className="calendar-spin" />
                <span>Loading calendar...</span>
              </div>
            )}

            {!loading && events.length === 0 && !error && (
              <div className="calendar-empty">
                <Target size={26} />
                <h3>No calendar items found</h3>
                <p>There are no holidays, events, deadlines, milestones, or approved leaves in this range.</p>
              </div>
            )}

            <Calendar
              localizer={localizer}
              events={events}
              startAccessor="start"
              endAccessor="end"
              date={date}
              view={view}
              views={["month", "week"]}
              onNavigate={setDate}
              onView={setView}
              popup
              allDayAccessor="allDay"
              eventPropGetter={eventPropGetter}
              components={{ event: EventPill }}
              toolbar
            />
          </div>
        </section>

        <aside className="calendar-card calendar-side-card">
          <div className="calendar-side-header">
            <div>
              <h2>Upcoming</h2>
              <p>Next visible calendar items</p>
            </div>
            <CalendarDays size={17} />
          </div>

          <div className="calendar-agenda-list">
            {loading ? (
              [1, 2, 3, 4].map((item) => (
                <div key={item} className="calendar-agenda-skeleton" />
              ))
            ) : upcomingEvents.length === 0 ? (
              <div className="calendar-agenda-empty">
                <CalendarDays size={22} />
                <p>No upcoming items in this range.</p>
              </div>
            ) : (
              upcomingEvents.map((event) => (
                <AgendaItem key={event.id} event={event} />
              ))
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
