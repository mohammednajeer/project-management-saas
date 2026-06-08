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
  TrendingUp,
  AlertTriangle,
  Gauge,
  Lock,
  Repeat,
  Search,
  Plus,
  ChevronLeft,
  ChevronRight,
  Clock,
  Activity,
  PartyPopper,
} from "lucide-react";
import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import "react-big-calendar/lib/css/react-big-calendar.css";
import "./CalendarPage.css";

const locales = {};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: (date) => startOfWeek(date, { weekStartsOn: 1 }),
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
    <div className={`calendar-event-card calendar-event-card--${event.tone}`} title={`${event.eventTypeLabel}: ${event.title}`}>
      <div className="event-card-header">
        <Icon size={10} className="event-card-icon" />
        <span className="event-card-tag">{event.eventTypeLabel}</span>
      </div>
      <p className="event-card-title">{event.title}</p>
    </div>
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
  const [searchQuery, setSearchQuery] = useState("");

  // Auxiliary data states
  const [members, setMembers] = useState([]);
  const [projects, setProjects] = useState([]);

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

  // Day Events Modal State
  const [showDayEventsModal, setShowDayEventsModal] = useState(false);
  const [dayEventsList, setDayEventsList] = useState([]);
  const [dayEventsDate, setDayEventsDate] = useState(null);

  // Team Pulse Modal State
  const [showTeamPulseModal, setShowTeamPulseModal] = useState(false);

  // Quick Leave Request Form State
  const [quickLeaveForm, setQuickLeaveForm] = useState({
    start_date: format(new Date(), "yyyy-MM-dd"),
    end_date: format(new Date(), "yyyy-MM-dd"),
    leave_type: "annual",
    reason: "",
  });
  const [submittingLeave, setSubmittingLeave] = useState(false);
  const [leaveMessage, setLeaveMessage] = useState("");

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

  const fetchAuxiliaryData = useCallback(async () => {
    try {
      const isManagerOrAdmin = isAdmin || isManager;
      const teamEndpoint = isManagerOrAdmin ? "/invitations/team/" : "/chat/users/";

      const [membersRes, projectsRes] = await Promise.all([
        api.get(teamEndpoint),
        api.get("/projects/"),
      ]);

      let membersList = Array.isArray(membersRes.data) ? membersRes.data : [];

      if (!isManagerOrAdmin) {
        // For employees, chat users returns other users. Add status 'active' to all of them.
        membersList = membersList.map((m) => ({ ...m, status: "active" }));
        // Also append the current logged-in employee to the members list
        if (user) {
          membersList.push({
            id: String(user.id),
            name: user.name,
            email: user.email,
            role: user.role,
            status: "active",
            profile_picture: user.profile_picture,
          });
        }
      }

      setMembers(membersList);
      setProjects(Array.isArray(projectsRes.data) ? projectsRes.data : []);
    } catch (err) {
      console.error("Failed to load auxiliary data:", err);
    }
  }, [isAdmin, isManager, user]);

  useEffect(() => {
    fetchEvents(date);
  }, [date, fetchEvents]);

  useEffect(() => {
    fetchAuxiliaryData();
  }, [fetchAuxiliaryData]);

  // Handle previous / next navigation programmatically
  const handleNavigate = (action) => {
    let newDate = new Date(date);
    if (action === "TODAY") {
      newDate = new Date();
    } else if (action === "PREV") {
      if (view === "month") newDate.setMonth(date.getMonth() - 1);
      else if (view === "week") newDate.setDate(date.getDate() - 7);
      else if (view === "day") newDate.setDate(date.getDate() - 1);
    } else if (action === "NEXT") {
      if (view === "month") newDate.setMonth(date.getMonth() + 1);
      else if (view === "week") newDate.setDate(date.getDate() + 7);
      else if (view === "day") newDate.setDate(date.getDate() + 1);
    }
    setDate(newDate);
  };

  // Filter events based on search input
  const filteredEvents = useMemo(() => {
    if (!searchQuery.trim()) return events;
    const q = searchQuery.toLowerCase();
    return events.filter(
      (e) =>
        e.title.toLowerCase().includes(q) ||
        (e.description && e.description.toLowerCase().includes(q))
    );
  }, [events, searchQuery]);

  const upcomingEvents = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return events
      .filter((event) => event.end >= today)
      .sort((a, b) => a.start - b.start || a.title.localeCompare(b.title))
      .slice(0, 5);
  }, [events]);

  // Dynamic calculations: Availability Heatmap
  const teamAvailabilityData = useMemo(() => {
    const activeMembers = members.filter((m) => m.status === "active");
    const totalCount = activeMembers.length || 1;

    // Start of the week for the currently navigated date
    const startOfCurrWeek = startOfWeek(date, { weekStartsOn: 1 }); // Monday
    const weekDays = Array.from({ length: 5 }, (_, i) => {
      const d = new Date(startOfCurrWeek);
      d.setDate(startOfCurrWeek.getDate() + i);
      return d;
    });

    const isDateInEventRange = (targetDate, event) => {
      const t = new Date(targetDate);
      t.setHours(0, 0, 0, 0);
      const start = new Date(event.start);
      start.setHours(0, 0, 0, 0);
      const end = new Date(event.end);
      end.setHours(23, 59, 59, 999);
      return t >= start && t <= end;
    };

    const daysAvail = weekDays.map((day) => {
      // Find leaves on this day
      const leavesCount = events.filter((e) => {
        return e.eventType === "leave" && isDateInEventRange(day, e);
      }).length;

      const availPercent = Math.max(
        0,
        Math.min(100, Math.round(((totalCount - leavesCount) / totalCount) * 100))
      );
      return {
        name: format(day, "EEE"), // Mon, Tue...
        avail: availPercent,
      };
    });

    // Current availability today
    const todayStr = format(new Date(), "EEE");
    const todayAvail = daysAvail.find((d) => d.name === todayStr)?.avail ?? 100;

    // Peak day
    const peak = daysAvail.reduce(
      (max, item) => (item.avail > max.avail ? item : max),
      daysAvail[0] || { name: "Thursday", avail: 100 }
    );

    return {
      days: daysAvail,
      todayValue: todayAvail,
      peakDayName: peak.name,
    };
  }, [date, events, members]);

  // Dynamic calculations: Resource Conflicts (overlapping events)
  const conflictsList = useMemo(() => {
    const list = [];
    const sorted = [...events].sort((a, b) => a.start - b.start);
    for (let i = 0; i < sorted.length; i++) {
      for (let j = i + 1; j < sorted.length; j++) {
        const e1 = sorted[i];
        const e2 = sorted[j];
        if (e2.start > e1.end) break; // events are sorted, no further overlaps possible

        if (e1.eventType !== "holiday" && e2.eventType !== "holiday") {
          list.push({ e1, e2 });
        }
      }
    }
    return list;
  }, [events]);

  // Dynamic calculations: Project Task Completion rate
  const projectStats = useMemo(() => {
    const totalCompleted = projects.reduce(
      (acc, p) => acc + (p.completed_tasks || 0),
      0
    );
    const totalTasks = projects.reduce((acc, p) => acc + (p.total_tasks || 0), 0);
    const pct = totalTasks > 0 ? Math.round((totalCompleted / totalTasks) * 100) : 0;

    let text = "Healthy progress. All systems normal.";
    if (pct >= 80) text = "Excellent team velocity. On track for all targets.";
    else if (pct < 50 && projects.length > 0)
      text = "Low velocity. Review active workloads.";

    return {
      percentage: pct,
      insightText: text,
    };
  }, [projects]);

  // Dynamic calculations: Productivity Intelligence
  const weeklyMeetingHours = useMemo(() => {
    const startOfCurrWeek = startOfWeek(date, { weekStartsOn: 1 });
    const endOfCurrWeek = new Date(startOfCurrWeek);
    endOfCurrWeek.setDate(startOfCurrWeek.getDate() + 6);

    // Meetings this week
    const meetings = events.filter(
      (e) => e.eventType === "meeting" && e.start >= startOfCurrWeek && e.start <= endOfCurrWeek
    );
    // Let's assume each meeting event takes 1.5 hours on average
    return meetings.length * 1.5;
  }, [date, events]);

  const meetingFreeHours = Math.max(0, 40 - weeklyMeetingHours);
  const deepWorkCapacity =
    meetingFreeHours >= 30 ? "High" : meetingFreeHours >= 20 ? "Moderate" : "Low";

  // Dynamic Celebrations (holidays or upcoming events in next 7 days)
  const upcomingCelebrations = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const nextWeek = new Date(today);
    nextWeek.setDate(today.getDate() + 7);

    return events
      .filter((e) => {
        return (
          e.start >= today &&
          e.start <= nextWeek &&
          (e.eventType === "holiday" || e.eventType === "announcement" || e.eventType === "leave")
        );
      })
      .slice(0, 2);
  }, [events]);

  // Dynamic Team Pulse availability status
  const teamPulseList = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return members
      .filter((m) => m.status === "active")
      .map((member) => {
        // Find if this member is currently on approved leave today
        const leaveEvent = events.find((e) => {
          if (e.eventType !== "leave" || !e.resource?.employee_data) return false;
          return (
            String(e.resource.employee_data.id) === String(member.id) &&
            today >= e.start &&
            today <= e.end
          );
        });

        // Find if this member has a meeting today
        const meetingEvent = events.find((e) => {
          if (e.eventType !== "meeting") return false;
          const isCreator =
            e.resource?.created_by_data &&
            String(e.resource.created_by_data.id) === String(member.id);
          return isCreator && today >= e.start && today <= e.end;
        });

        let statusText = "Active / Available";
        let statusColor = "green";
        if (leaveEvent) {
          statusText = `On Leave: ${leaveEvent.eventTypeLabel}`;
          statusColor = "amber";
        } else if (meetingEvent) {
          statusText = `Busy: ${meetingEvent.title}`;
          statusColor = "blue";
        }

        return {
          ...member,
          statusText,
          statusColor,
        };
      });
  }, [members, events]);

  const eventPropGetter = (event) => ({
    className: `calendar-rbc-event calendar-rbc-event--${event.tone}`,
  });

  const dayPropGetter = useCallback((date) => {
    const targetTime = new Date(date);
    targetTime.setHours(0, 0, 0, 0);

    const dayEvents = events.filter((e) => {
      const start = new Date(e.start);
      start.setHours(0, 0, 0, 0);
      const end = new Date(e.end);
      end.setHours(23, 59, 59, 999);
      return targetTime >= start && targetTime <= end;
    });

    if (dayEvents.length === 0) return {};

    const hasLeave = dayEvents.some((e) => e.eventType === "leave");
    const hasHoliday = dayEvents.some((e) => e.eventType === "holiday");
    const hasDeadline = dayEvents.some((e) => e.eventType === "deadline");
    const hasMilestone = dayEvents.some((e) => e.eventType === "milestone");
    const hasMeeting = dayEvents.some((e) => e.eventType === "meeting");

    if (hasLeave) {
      return { className: "rbc-day-bg-leave" };
    }
    if (hasHoliday) {
      return { className: "rbc-day-bg-holiday" };
    }
    if (hasDeadline) {
      return { className: "rbc-day-bg-deadline" };
    }
    if (hasMilestone) {
      return { className: "rbc-day-bg-milestone" };
    }
    if (hasMeeting) {
      return { className: "rbc-day-bg-meeting" };
    }

    return { className: "rbc-day-bg-event" };
  }, [events]);

  const openCreateModal = (start, end) => {
    const startStr = format(start, "yyyy-MM-dd");
    const adjustedEnd = end ? new Date(end.getTime() - 24 * 60 * 60 * 1000) : start;
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

  const handleSelectSlot = ({ start, end }) => {
    const dayEvents = events.filter(e => {
      const d = new Date(start);
      d.setHours(0,0,0,0);
      const s = new Date(e.start);
      s.setHours(0,0,0,0);
      const en = new Date(e.end);
      en.setHours(23,59,59,999);
      return d >= s && d <= en;
    });

    if (dayEvents.length > 0) {
      setDayEventsDate(start);
      setDayEventsList(dayEvents);
      setShowDayEventsModal(true);
    } else {
      if (!canEditEvents) {
        alert("Only admins and managers can create calendar events.");
        return;
      }
      openCreateModal(start, end);
    }
  };

  const handleShowMore = (showMoreEvents, date) => {
    setDayEventsDate(date);
    const dayEvents = events.filter(e => {
      const d = new Date(date);
      d.setHours(0,0,0,0);
      const s = new Date(e.start);
      s.setHours(0,0,0,0);
      const en = new Date(e.end);
      en.setHours(23,59,59,999);
      return d >= s && d <= en;
    });
    setDayEventsList(dayEvents);
    setShowDayEventsModal(true);
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

  // Quick Leave Request Form Submission
  const handleQuickLeaveChange = (e) => {
    const { name, value } = e.target;
    setQuickLeaveForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleQuickLeaveSubmit = async (e) => {
    e.preventDefault();
    if (!quickLeaveForm.reason.trim()) {
      setLeaveMessage("Please specify a reason.");
      return;
    }
    setSubmittingLeave(true);
    setLeaveMessage("");
    try {
      await api.post("/leave/requests/", {
        leave_type: quickLeaveForm.leave_type,
        start_date: quickLeaveForm.start_date,
        end_date: quickLeaveForm.end_date,
        reason: quickLeaveForm.reason,
      });
      setLeaveMessage("Request submitted successfully!");
      setQuickLeaveForm({
        start_date: format(new Date(), "yyyy-MM-dd"),
        end_date: format(new Date(), "yyyy-MM-dd"),
        leave_type: "annual",
        reason: "",
      });
      fetchEvents(date); // Refresh to include new leave request (once approved it will display, wait: only approved leaves show on calendar feed. In views.py, feed checks approved leaves)
    } catch (err) {
      setLeaveMessage(
        err.response?.data?.message ||
          err.response?.data?.end_date ||
          "Failed to submit request."
      );
    } finally {
      setSubmittingLeave(false);
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
      {/* Top Header / App Bar */}
      <header className="calendar-top-bar">
        <div className="top-bar-left">
          <div className="navigator-info">
            <h2>{format(date, "MMMM yyyy")}</h2>
            <div className="nav-arrows">
              <button
                type="button"
                className="nav-arrow-btn"
                onClick={() => handleNavigate("PREV")}
              >
                <ChevronLeft size={16} />
              </button>
              <button
                type="button"
                className="nav-today-btn"
                onClick={() => handleNavigate("TODAY")}
              >
                Today
              </button>
              <button
                type="button"
                className="nav-arrow-btn"
                onClick={() => handleNavigate("NEXT")}
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
          <div className="view-pills">
            {["month", "week", "day", "agenda"].map((v) => (
              <button
                key={v}
                type="button"
                className={`view-pill-btn ${view === v ? "is-active" : ""}`}
                onClick={() => setView(v)}
              >
                {v.charAt(0).toUpperCase() + v.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div className="top-bar-right">
          <div className="search-pill">
            <Search size={14} className="search-pill-icon" />
            <input
              type="text"
              placeholder="Search events..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <button
            type="button"
            className="header-refresh-btn"
            onClick={() => {
              fetchEvents(date);
              fetchAuxiliaryData();
            }}
            disabled={loading}
            title="Refresh Feed"
          >
            <RefreshCw size={14} className={loading ? "calendar-spin" : ""} />
          </button>
          {canEditEvents && (
            <button
              type="button"
              className="new-event-btn"
              onClick={() => {
                const todayStr = format(new Date(), "yyyy-MM-dd");
                setEventForm({
                  title: "",
                  description: "",
                  notes: "",
                  event_type: "company_event",
                  start_date: todayStr,
                  end_date: todayStr,
                  visibility: "organization",
                  is_recurring: false,
                  recurrence_pattern: "none",
                });
                setModalMode("create");
                setSelectedEvent(null);
                setShowModal(true);
              }}
            >
              <Plus size={14} />
              <span>New Event</span>
            </button>
          )}
        </div>
      </header>

      {error && (
        <div className="calendar-message calendar-message--error">
          <AlertCircle size={14} />
          <span>{error}</span>
        </div>
      )}

      {/* Main Responsive Grid Layout */}
      <div className="calendar-layout-container">
        {/* Left Side: Stats & Calendar */}
        <div className="calendar-left-section">
          {/* Smart Insights Row */}
          <section className="insights-grid">
            {/* Heatmap Card */}
            <article className="insight-card">
              <div className="insight-card-header">
                <span className="insight-card-eyebrow">Team Availability Heatmap</span>
                <TrendingUp size={14} className="icon-success" />
              </div>
              <div className="insight-card-body flex-row">
                <div className="heatmap-bars">
                  {teamAvailabilityData.days.map((item, idx) => (
                    <div key={idx} className="heatmap-bar-column" title={`${item.name}: ${item.avail}%`}>
                      <div className="heatmap-bar-track">
                        <div
                          className="heatmap-bar-fill"
                          style={{ height: `${item.avail}%` }}
                        />
                      </div>
                      <span className="heatmap-bar-label">{item.name[0]}</span>
                    </div>
                  ))}
                </div>
                <div className="insight-stat">
                  <span className="insight-stat-value">{teamAvailabilityData.todayValue}%</span>
                  <span className="insight-stat-label">Available Today</span>
                </div>
              </div>
              <p className="insight-card-footer">
                Peak capacity expected on {teamAvailabilityData.peakDayName}.
              </p>
            </article>

            {/* Resource Conflicts Card */}
            <article className="insight-card">
              <div className="insight-card-header">
                <span className="insight-card-eyebrow">Resource Conflicts</span>
                {conflictsList.length > 0 ? (
                  <AlertTriangle size={14} className="icon-error" />
                ) : (
                  <CheckCircle2 size={14} className="icon-success" />
                )}
              </div>
              <div className="insight-card-body flex-row items-center gap-3">
                <span
                  className={`insight-stat-value ${
                    conflictsList.length > 0 ? "text-error" : ""
                  }`}
                >
                  {conflictsList.length < 10
                    ? `0${conflictsList.length}`
                    : conflictsList.length}
                </span>
                <div className="conflict-avatars">
                  {conflictsList.length > 0 ? (
                    <div className="conflict-text-wrap">
                      <span className="conflict-tag truncate">
                        {conflictsList[0].e1.title} overlap
                      </span>
                    </div>
                  ) : (
                    <span className="insight-stat-label">All schedules aligned</span>
                  )}
                </div>
              </div>
              <button
                type="button"
                className="insight-action-btn"
                onClick={() => {
                  if (conflictsList.length > 0) {
                    setSearchQuery(conflictsList[0].e1.title);
                  } else {
                    alert("No conflicts detected! You are all clear.");
                  }
                }}
              >
                {conflictsList.length > 0 ? "Locate Conflicts" : "Schedule Health OK"}
              </button>
            </article>

            {/* Project Velocity Card */}
            <article className="insight-card">
              <div className="insight-card-header">
                <span className="insight-card-eyebrow">Project Velocity Impact</span>
                <Gauge size={14} className="icon-sky" />
              </div>
              <div className="insight-card-body">
                <div className="insight-stat items-baseline gap-1">
                  <span className="insight-stat-value">+{projectStats.percentage}%</span>
                  <span className="insight-stat-label">task completion</span>
                </div>
                <div className="velocity-track">
                  <div
                    className="velocity-fill"
                    style={{ width: `${projectStats.percentage}%` }}
                  />
                </div>
              </div>
              <p className="insight-card-footer">{projectStats.insightText}</p>
            </article>
          </section>

          {/* Calendar Card Grid */}
          <section className="calendar-card-board">
            <div className="calendar-board-wrapper" aria-busy={loading}>
              {loading && (
                <div className="calendar-board-loading">
                  <Loader2 size={20} className="calendar-spin" />
                  <span>Synchronizing calendar...</span>
                </div>
              )}

              <Calendar
                localizer={localizer}
                events={filteredEvents}
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
                onShowMore={handleShowMore}
                allDayAccessor="allDay"
                eventPropGetter={eventPropGetter}
                dayPropGetter={dayPropGetter}
                components={{ event: EventPill }}
                toolbar={false}
              />
            </div>
          </section>
        </div>

        {/* Right Side: Sidebar Widgets */}
        <aside className="calendar-right-sidebar">
          {/* Productivity Intelligence Widget */}
          <section className="sidebar-widget">
            <h3 className="widget-title">Productivity Intelligence</h3>
            <div className="widget-card-container">
              <div className="intelligence-row">
                <span className="intel-label">Meeting-free Hours</span>
                <span className="intel-value">{meetingFreeHours}h / week</span>
              </div>
              <div className="intel-progress-bg">
                <div
                  className="intel-progress-fill"
                  style={{ width: `${(meetingFreeHours / 40) * 100}%` }}
                />
              </div>
              <div className="intelligence-row">
                <span className="intel-label">Deep Work Capacity</span>
                <span className="intel-value font-bold text-success">
                  {deepWorkCapacity}
                </span>
              </div>
              <p className="intel-footer-note">
                Optimization: sync calls average {weeklyMeetingHours}h this week.
              </p>
            </div>
          </section>

          {/* Team Pulse Widget */}
          <section className="sidebar-widget">
            <h3 className="widget-title flex-row items-center justify-between">
              <span>Team Pulse</span>
              <span className="pulse-indicator">
                <span className="pulse-dot" />
              </span>
            </h3>
            <div className="pulse-list">
              {teamPulseList.length === 0 ? (
                <p className="pulse-empty">No active team members.</p>
              ) : (
                <>
                  {teamPulseList.slice(0, 3).map((member) => (
                    <div key={member.id} className="pulse-member-row">
                      <div className="pulse-avatar-wrap">
                        <div className="pulse-avatar-initials">
                          {(member.name || member.email || "?")
                            .split(/[\s@.]+/)
                            .slice(0, 2)
                            .map((p) => p[0].toUpperCase())
                            .join("")}
                        </div>
                        <span className={`pulse-status-badge pulse-status-badge--${member.statusColor}`} />
                      </div>
                      <div className="pulse-member-info">
                        <h4 className="pulse-member-name">{member.name || member.email}</h4>
                        <p className="pulse-member-status-text truncate">
                          {member.statusText}
                        </p>
                      </div>
                    </div>
                  ))}
                  {teamPulseList.length > 3 && (
                    <button
                      type="button"
                      className="pulse-more-btn"
                      onClick={() => setShowTeamPulseModal(true)}
                    >
                      + {teamPulseList.length - 3} extra
                    </button>
                  )}
                </>
              )}
            </div>
          </section>

          {/* Celebrations & Holidays Widget */}
          <section className="sidebar-widget">
            <h3 className="widget-title">Upcoming Celebrations</h3>
            <div className="celebrations-container">
              {upcomingCelebrations.length === 0 ? (
                <div className="celebration-empty-card">
                  <Activity size={18} className="celebration-icon-muted" />
                  <p>No celebrations or holidays scheduled this week.</p>
                </div>
              ) : (
                upcomingCelebrations.map((item) => (
                  <div
                    key={item.id}
                    className={`celebration-card celebration-card--${item.tone}`}
                  >
                    <PartyPopper size={16} />
                    <div className="celebration-card-details">
                      <h4>{item.title}</h4>
                      <p>
                        {format(item.start, "EEE, MMM d")} • {item.eventTypeLabel}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          {/* Quick Leave Request Form */}
          <section className="sidebar-widget leave-request-widget">
            <h3 className="widget-title text-white flex-row items-center gap-2">
              <span className="material-symbols-outlined font-normal text-[16px] text-sky-mid">
                bolt
              </span>
              <span>Quick Leave Request</span>
            </h3>
            {isAdmin ? (
              <div className="leave-locked-overlay" style={{ textAlign: "center", padding: "16px 8px", background: "rgba(255,255,255,0.05)", border: "1px dashed rgba(255,255,255,0.3)", borderRadius: "8px" }}>
                <Lock size={18} style={{ color: "rgba(255,255,255,0.6)", margin: "0 auto 6px" }} />
                <p style={{ fontSize: "11px", margin: 0, fontWeight: "bold", color: "#ffffff" }}>Leave Request Locked</p>
                <p style={{ fontSize: "10px", margin: "2px 0 0", color: "rgba(255,255,255,0.6)" }}>Administrators do not submit leave requests.</p>
              </div>
            ) : (
              <form onSubmit={handleQuickLeaveSubmit} className="leave-form">
                <div className="leave-form-grid">
                  <div className="leave-input-wrap">
                    <span className="leave-input-label">From</span>
                    <input
                      type="date"
                      name="start_date"
                      value={quickLeaveForm.start_date}
                      onChange={handleQuickLeaveChange}
                      required
                    />
                  </div>
                  <div className="leave-input-wrap">
                    <span className="leave-input-label">To</span>
                    <input
                      type="date"
                      name="end_date"
                      value={quickLeaveForm.end_date}
                      onChange={handleQuickLeaveChange}
                      required
                    />
                  </div>
                </div>
                <div className="leave-input-wrap">
                  <span className="leave-input-label">Type</span>
                  <select
                    name="leave_type"
                    value={quickLeaveForm.leave_type}
                    onChange={handleQuickLeaveChange}
                  >
                    <option value="annual">Annual Leave</option>
                    <option value="sick">Sick Leave</option>
                    <option value="casual">Casual Leave</option>
                    <option value="personal">Personal Leave</option>
                    <option value="vacation">Vacation Leave</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div className="leave-input-wrap">
                  <span className="leave-input-label">Reason</span>
                  <input
                    type="text"
                    name="reason"
                    placeholder="Specify brief reason..."
                    value={quickLeaveForm.reason}
                    onChange={handleQuickLeaveChange}
                    required
                  />
                </div>
                <button
                  type="submit"
                  className="leave-submit-btn"
                  disabled={submittingLeave}
                >
                  {submittingLeave ? "Submitting..." : "Submit Request"}
                </button>
                {leaveMessage && <p className="leave-status-message">{leaveMessage}</p>}
              </form>
            )}
          </section>
        </aside>
      </div>

      {/* EVENT DETAIL / CREATE / EDIT MODAL */}
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
                  <span
                    className={`calendar-status-label calendar-status-label--${selectedEvent?.tone}`}
                  >
                    {selectedEvent?.eventTypeLabel}
                  </span>
                  {selectedEvent?.resource?.visibility === "private" && (
                    <span className="calendar-status-label calendar-status-label--private">
                      Private Event
                    </span>
                  )}
                  {selectedEvent?.resource?.is_recurring && (
                    <span className="calendar-status-label calendar-status-label--recurring">
                      Repeats:{" "}
                      {
                        RECURRENCE_OPTIONS.find(
                          (o) => o.value === selectedEvent.resource.recurrence_pattern
                        )?.label
                      }
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
                    <p>{selectedEvent ? formatDateRange(selectedEvent) : ""}</p>
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
                  {selectedEvent?.resource?.employee_data ? (
                    <small>
                      Employee:{" "}
                      <strong>
                        {selectedEvent.resource.employee_data.name ||
                          selectedEvent.resource.employee_data.email}
                      </strong>
                    </small>
                  ) : (
                    selectedEvent?.resource?.created_by_data && (
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

      {/* DAY EVENTS LIST MODAL */}
      {showDayEventsModal && (
        <div className="calendar-modal-overlay">
          <div className="calendar-modal day-events-modal">
            <div className="calendar-modal-header">
              <h3>Events on {dayEventsDate ? format(dayEventsDate, "MMMM d, yyyy") : ""}</h3>
              <button
                type="button"
                className="calendar-modal-close"
                onClick={() => setShowDayEventsModal(false)}
              >
                &times;
              </button>
            </div>

            <div className="calendar-modal-body day-events-list-body">
              <div className="day-events-list">
                {dayEventsList.map((event) => {
                  const meta = EVENT_META[event.eventType] || EVENT_META.company_event;
                  const Icon = meta.icon;
                  return (
                    <div key={event.id} className={`day-event-row day-event-row--${event.tone}`}>
                      <div className="day-event-row-header">
                        <span className={`calendar-status-label calendar-status-label--${event.tone}`}>
                          <Icon size={10} style={{ marginRight: 4, display: "inline-block", verticalAlign: "middle" }} />
                          {event.eventTypeLabel}
                        </span>
                        <span className="day-event-time">{formatDateRange(event)}</span>
                      </div>
                      <h4 className="day-event-row-title">{event.title}</h4>
                      {event.description && <p className="day-event-row-desc">{event.description}</p>}
                      <button
                        type="button"
                        className="day-event-action-btn"
                        onClick={() => {
                          setShowDayEventsModal(false);
                          handleSelectEvent(event);
                        }}
                      >
                        View Details / Edit
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="calendar-modal-footer">
              {canEditEvents && (
                <button
                  type="button"
                  className="calendar-btn-save"
                  style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}
                  onClick={() => {
                    setShowDayEventsModal(false);
                    openCreateModal(dayEventsDate);
                  }}
                >
                  <Plus size={12} />
                  Add Event
                </button>
              )}
              <button
                type="button"
                className="calendar-btn-cancel"
                onClick={() => setShowDayEventsModal(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TEAM PULSE FULL LIST MODAL */}
      {showTeamPulseModal && (
        <div className="calendar-modal-overlay">
          <div className="calendar-modal team-pulse-modal">
            <div className="calendar-modal-header">
              <h3>Team Pulse Status</h3>
              <button
                type="button"
                className="calendar-modal-close"
                onClick={() => setShowTeamPulseModal(false)}
              >
                &times;
              </button>
            </div>

            <div className="calendar-modal-body team-pulse-modal-body">
              <div className="pulse-list" style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {teamPulseList.map((member) => (
                  <div key={member.id} className="pulse-member-row" style={{ display: "flex", alignItems: "center", gap: "12px", padding: "8px", borderRadius: "12px", background: "#f8fafc" }}>
                    <div className="pulse-avatar-wrap" style={{ position: "relative", flexShrink: 0 }}>
                      <div className="pulse-avatar-initials" style={{ width: "32px", height: "32px", borderRadius: "50%", background: "linear-gradient(135deg, #6354c4 0%, #9b7ff4 100%)", color: "#ffffff", fontSize: "11px", fontWeight: "700", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        {(member.name || member.email || "?")
                          .split(/[\s@.]+/)
                          .slice(0, 2)
                          .map((p) => p[0].toUpperCase())
                          .join("")}
                      </div>
                      <span className={`pulse-status-badge pulse-status-badge--${member.statusColor}`} />
                    </div>
                    <div className="pulse-member-info" style={{ minWidth: 0, flex: 1 }}>
                      <h4 className="pulse-member-name" style={{ margin: 0, fontSize: "12px", fontWeight: "700", color: "var(--calendar-text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{member.name || member.email}</h4>
                      <p className="pulse-member-status-text" style={{ margin: "2px 0 0", fontSize: "10px", color: "var(--calendar-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {member.statusText}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="calendar-modal-footer">
              <button
                type="button"
                className="calendar-btn-cancel"
                onClick={() => setShowTeamPulseModal(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
