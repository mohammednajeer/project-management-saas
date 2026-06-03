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
  Eye,
  Trash2,
  Save,
  Megaphone,
} from "lucide-react";
import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";
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
  announcement: { label: "Announcement", tone: "announcement", icon: Megaphone },
};

const RECURRENCE_OPTIONS = [
  { value: "none", label: "Does not repeat" },
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "biweekly", label: "Every Two Weeks" },
  { value: "monthly", label: "Monthly" },
  { value: "first_friday", label: "First Friday of Month" },
];

const startOfMonthRange = (date) => {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  start.setDate(start.getDate() - 14); // expand range to catch overflows
  return start;
};

const endOfMonthRange = (date) => {
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  end.setDate(end.getDate() + 14);
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
    id: item.id,
    rawId: item.rawId,
    title: item.title,
    description: item.description || "",
    notes: item.notes || "",
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
      <Icon size={11} />
      <span>{event.title}</span>
    </span>
  );
}

function AgendaItem({ event, onClick }) {
  const meta = EVENT_META[event.eventType] || EVENT_META.company_event;
  const Icon = meta.icon;

  return (
    <article
      className={`calendar-agenda-item calendar-agenda-item--${event.tone}`}
      onClick={onClick}
      style={{ cursor: "pointer" }}
    >
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
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const isManager = user?.role === "manager";
  const canEditEvents = isAdmin || isManager;

  const [events, setEvents] = useState([]);
  const [view, setView] = useState("month");
  const [date, setDate] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Modal event management state
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState("view"); // 'view' | 'create' | 'edit'
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [savingEvent, setSavingEvent] = useState(false);
  const [deletingEvent, setDeletingEvent] = useState(false);
  const [eventForm, setEventForm] = useState({
    title: "",
    description: "",
    notes: "",
    event_type: "company_event",
    start_date: "",
    end_date: "",
    visibility: "organization",
    is_recurring: false,
    recurrence_pattern: "none",
  });

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

  const counts = useMemo(() => {
    return events.reduce((acc, event) => {
      acc[event.eventType] = (acc[event.eventType] || 0) + 1;
      return acc;
    }, {});
  }, [events]);

  const eventPropGetter = (event) => ({
    className: `calendar-rbc-event calendar-rbc-event--${event.tone}`,
  });

  // Modal actions
  const handleSelectSlot = ({ start, end }) => {
    if (!canEditEvents) {
      alert("Only admins and managers can create calendar events.");
      return;
    }

    const startStr = format(start, "yyyy-MM-dd");
    // RBC end is exclusive, subtract 1 day to align date fields visually
    const adjustedEnd = new Date(end.getTime() - 24 * 60 * 60 * 1000);
    const endStr = format(adjustedEnd < start ? start : adjustedEnd, "yyyy-MM-dd");

    setEventForm({
      title: "",
      description: "",
      notes: "",
      event_type: "company_event",
      start_date: startStr,
      end_date: endStr,
      visibility: "organization",
      is_recurring: false,
      recurrence_pattern: "none",
    });
    setModalMode("create");
    setSelectedEvent(null);
    setShowModal(true);
  };

  const handleSelectEvent = (event) => {
    setSelectedEvent(event);
    setEventForm({
      title: event.title,
      description: event.description,
      notes: event.notes,
      event_type: event.eventType,
      start_date: format(event.start, "yyyy-MM-dd"),
      end_date: format(event.end, "yyyy-MM-dd"),
      visibility: event.resource?.visibility || "organization",
      is_recurring: event.resource?.is_recurring || false,
      recurrence_pattern: event.resource?.recurrence_pattern || "none",
    });
    setModalMode("view");
    setShowModal(true);
  };

  const handleFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    setEventForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSaveEvent = async (e) => {
    e.preventDefault();
    if (!eventForm.title.trim()) return;

    // Check manager holiday restriction
    if (isManager && eventForm.event_type === "holiday") {
      alert("Managers are not authorized to manage holidays.");
      return;
    }

    setSavingEvent(true);
    try {
      if (modalMode === "create") {
        await api.post("/calendar/events/", eventForm);
      } else {
        await api.patch(`/calendar/events/${selectedEvent.rawId}/`, eventForm);
      }
      setShowModal(false);
      fetchEvents(date);
    } catch (err) {
      alert(err.response?.data?.message || "Failed to save the calendar event.");
    } finally {
      setSavingEvent(false);
    }
  };

  const handleDeleteEvent = async () => {
    if (!selectedEvent || selectedEvent.source !== "calendar_event") return;
    if (!isAdmin) {
      alert("Only admins can delete company calendar events.");
      return;
    }

    if (!window.confirm("Are you sure you want to delete this event?")) return;

    setDeletingEvent(true);
    try {
      await api.delete(`/calendar/events/${selectedEvent.rawId}/`);
      setShowModal(false);
      fetchEvents(date);
    } catch (err) {
      alert(err.response?.data?.message || "Failed to delete the event.");
    } finally {
      setDeletingEvent(false);
    }
  };

  const isLeave = selectedEvent?.source === "leave_request";

  // Check editing permissions for calendar events
  const canModifySelected = useMemo(() => {
    if (!selectedEvent || isLeave) return false;
    if (isAdmin) return true;
    if (isManager) {
      // Managers cannot modify holiday events
      return selectedEvent.eventType !== "holiday";
    }
    return false;
  }, [selectedEvent, isAdmin, isManager, isLeave]);

  return (
    <div className="calendar-page">
      <header className="calendar-header">
        <div>
          <span className="calendar-eyebrow">
            <CalendarDays size={15} />
            Workspace Calendar
          </span>
          <h1>Company Calendar</h1>
          <p>
            Approve leaves, company events, milestones, holidays, and announcements in a unified grid.
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

      {/* STATS STRIP */}
      <section className="calendar-stat-grid">
        {Object.entries(EVENT_META).map(([type, meta]) => {
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

      {/* CORE CONTAINER */}
      <div className="calendar-shell">
        <section className="calendar-card calendar-main-card">
          <div className="calendar-toolbar">
            <div>
              <h2>{format(date, "MMMM yyyy")}</h2>
              <p>Schedule Navigator</p>
            </div>
            <div className="calendar-view-toggle">
              {["month", "week", "day", "agenda"].map((v) => (
                <button
                  key={v}
                  type="button"
                  className={view === v ? "is-active" : ""}
                  onClick={() => setView(v)}
                >
                  {v.charAt(0).toUpperCase() + v.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div className="calendar-board" aria-busy={loading}>
            {loading && (
              <div className="calendar-loading">
                <Loader2 size={22} className="calendar-spin" />
                <span>Synchronizing calendar...</span>
              </div>
            )}

            <Calendar
              localizer={localizer}
              events={events}
              startAccessor="start"
              endAccessor="end"
              date={date}
              view={view}
              views={["month", "week", "day", "agenda"]}
              onNavigate={setDate}
              onView={setView}
              selectable
              onSelectSlot={handleSelectSlot}
              onSelectEvent={handleSelectEvent}
              popup
              allDayAccessor="allDay"
              eventPropGetter={eventPropGetter}
              components={{ event: EventPill }}
              toolbar={false}
            />
          </div>
        </section>

        {/* SIDE PANEL */}
        <aside className="calendar-card calendar-side-card">
          <div className="calendar-side-header">
            <div>
              <h2>Upcoming Feed</h2>
              <p>Chronological agenda timeline</p>
            </div>
            <CalendarDays size={17} />
          </div>

          <div className="calendar-agenda-list">
            {loading ? (
              [1, 2, 3, 4].map((i) => <div key={i} className="calendar-agenda-skeleton" />)
            ) : upcomingEvents.length === 0 ? (
              <div className="calendar-agenda-empty">
                <CalendarDays size={22} />
                <p>No upcoming events on schedule.</p>
              </div>
            ) : (
              upcomingEvents.map((event) => (
                <AgendaItem
                  key={event.id}
                  event={event}
                  onClick={() => handleSelectEvent(event)}
                />
              ))
            )}
          </div>
        </aside>
      </div>

      {/* EVENT MODAL */}
      {showModal && (
        <div className="calendar-modal-overlay">
          <form className="calendar-modal" onSubmit={handleSaveEvent}>
            <div className="calendar-modal-header">
              <h3>
                {modalMode === "create"
                  ? "Create Event"
                  : modalMode === "edit"
                  ? "Edit Event"
                  : "Event Details"}
              </h3>
              <button
                type="button"
                className="calendar-modal-close"
                onClick={() => setShowModal(false)}
              >
                &times;
              </button>
            </div>

            <div className="calendar-modal-body">
              {/* Event Type / Badge (View Mode) */}
              {modalMode === "view" && (
                <div className="calendar-view-type-badge">
                  <span className={`calendar-status-label calendar-status-label--${selectedEvent?.tone}`}>
                    {selectedEvent?.eventTypeLabel}
                  </span>
                  {selectedEvent?.resource?.visibility === "private" && (
                    <span className="calendar-status-label calendar-status-label--private">
                      Private Event
                    </span>
                  )}
                  {selectedEvent?.resource?.is_recurring && (
                    <span className="calendar-status-label calendar-status-label--recurring">
                      Repeats: {RECURRENCE_OPTIONS.find(o => o.value === selectedEvent.resource.recurrence_pattern)?.label}
                    </span>
                  )}
                </div>
              )}

              {/* Title */}
              {modalMode === "view" ? (
                <h2 className="calendar-modal-title">{eventForm.title}</h2>
              ) : (
                <label>
                  <span>Title</span>
                  <input
                    type="text"
                    name="title"
                    value={eventForm.title}
                    onChange={handleFormChange}
                    required
                    placeholder="E.g., Sprint Planning Meeting"
                  />
                </label>
              )}

              {/* Event Type (Edit / Create) */}
              {modalMode !== "view" && (
                <label>
                  <span>Event Type</span>
                  <select
                    name="event_type"
                    value={eventForm.event_type}
                    onChange={handleFormChange}
                  >
                    <option value="company_event">Company Event</option>
                    <option value="meeting">Meeting</option>
                    <option value="deadline">Deadline</option>
                    <option value="milestone">Milestone</option>
                    <option value="announcement">Announcement</option>
                    {isAdmin && <option value="holiday">Public Holiday</option>}
                  </select>
                </label>
              )}

              {/* Dates */}
              <div className="calendar-modal-grid">
                {modalMode === "view" ? (
                  <div className="calendar-view-field">
                    <span>Date Range</span>
                    <p>{getDateRange(selectedEvent)}</p>
                  </div>
                ) : (
                  <>
                    <label>
                      <span>Start Date</span>
                      <input
                        type="date"
                        name="start_date"
                        value={eventForm.start_date}
                        onChange={handleFormChange}
                        required
                      />
                    </label>
                    <label>
                      <span>End Date</span>
                      <input
                        type="date"
                        name="end_date"
                        value={eventForm.end_date}
                        onChange={handleFormChange}
                        required
                      />
                    </label>
                  </>
                )}
              </div>

              {/* Description */}
              {modalMode === "view" ? (
                eventForm.description && (
                  <div className="calendar-view-field">
                    <span>Description</span>
                    <p>{eventForm.description}</p>
                  </div>
                )
              ) : (
                <label>
                  <span>Description</span>
                  <textarea
                    name="description"
                    value={eventForm.description}
                    onChange={handleFormChange}
                    placeholder="Short summary of the event..."
                  />
                </label>
              )}

              {/* Notes */}
              {modalMode === "view" ? (
                eventForm.notes && (
                  <div className="calendar-view-field calendar-view-field--notes">
                    <span>Event Notes</span>
                    <p>{eventForm.notes}</p>
                  </div>
                )
              ) : (
                <label>
                  <span>Event Notes</span>
                  <textarea
                    name="notes"
                    value={eventForm.notes}
                    onChange={handleFormChange}
                    placeholder="Detailed coordinates, links, or sub-activities..."
                  />
                </label>
              )}

              {/* Visibility & Recurrence (Edit / Create) */}
              {modalMode !== "view" && (
                <div className="calendar-modal-grid">
                  <label>
                    <span>Visibility</span>
                    <select
                      name="visibility"
                      value={eventForm.visibility}
                      onChange={handleFormChange}
                    >
                      <option value="organization">Organization (Shared)</option>
                      <option value="private">Private (Only Me)</option>
                    </select>
                  </label>

                  <label>
                    <span>Recurrence Pattern</span>
                    <select
                      name="recurrence_pattern"
                      value={eventForm.recurrence_pattern}
                      onChange={handleFormChange}
                    >
                      {RECURRENCE_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              )}

              {/* Checkboxes (Edit / Create) */}
              {modalMode !== "view" && (
                <label className="calendar-checkbox-label">
                  <input
                    type="checkbox"
                    name="is_recurring"
                    checked={eventForm.is_recurring}
                    onChange={handleFormChange}
                  />
                  <span>This is a recurring event</span>
                </label>
              )}

              {/* Metadata (View Mode) */}
              {modalMode === "view" && (
                <div className="calendar-view-meta">
                  {selectedEvent.resource?.employee_data ? (
                    <small>
                      Employee:{" "}
                      <strong>
                        {selectedEvent.resource.employee_data.name ||
                          selectedEvent.resource.employee_data.email}
                      </strong>
                    </small>
                  ) : (
                    selectedEvent.resource?.created_by_data && (
                      <small>
                        Created by:{" "}
                        <strong>{selectedEvent.resource.created_by_data.name}</strong>
                      </small>
                    )
                  )}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="calendar-modal-footer">
              {modalMode === "view" && canModifySelected && (
                <button
                  type="button"
                  className="calendar-btn-edit"
                  onClick={() => setModalMode("edit")}
                >
                  <Eye size={14} />
                  Edit Event
                </button>
              )}

              {modalMode === "view" && isAdmin && !isLeave && (
                <button
                  type="button"
                  className="calendar-btn-delete"
                  onClick={handleDeleteEvent}
                  disabled={deletingEvent}
                >
                  <Trash2 size={14} />
                  {deletingEvent ? "Deleting..." : "Delete"}
                </button>
              )}

              {modalMode !== "view" && (
                <>
                  <button
                    type="submit"
                    className="calendar-btn-save"
                    disabled={savingEvent}
                  >
                    <Save size={14} />
                    {savingEvent ? "Saving..." : "Save"}
                  </button>
                  <button
                    type="button"
                    className="calendar-btn-cancel"
                    onClick={() => {
                      if (modalMode === "create") {
                        setShowModal(false);
                      } else {
                        setModalMode("view");
                      }
                    }}
                  >
                    Cancel
                  </button>
                </>
              )}
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
