import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CalendarCheck,
  CheckCircle2,
  Filter,
  Loader2,
  PlaneTakeoff,
  RefreshCw,
  Send,
  XCircle,
} from "lucide-react";
import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import "./LeavePage.css";

const LEAVE_TYPES = [
  { value: "sick", label: "Sick Leave" },
  { value: "casual", label: "Casual Leave" },
  { value: "vacation", label: "Vacation Leave" },
  { value: "personal", label: "Personal Leave" },
  { value: "other", label: "Other" },
];

const STATUS_OPTIONS = [
  { value: "", label: "All statuses" },
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "cancelled", label: "Cancelled" },
];

const STATUS_META = {
  pending: { label: "Pending", tone: "warning" },
  approved: { label: "Approved", tone: "success" },
  rejected: { label: "Rejected", tone: "danger" },
  cancelled: { label: "Cancelled", tone: "neutral" },
};

const emptyForm = {
  leave_type: "sick",
  start_date: "",
  end_date: "",
  reason: "",
};

const emptyFilters = {
  status: "",
  employee: "",
  start_date: "",
  end_date: "",
};

const formatDate = (value) => {
  if (!value) return "No date";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const getDateRange = (request) => {
  const start = formatDate(request.start_date);
  const end = formatDate(request.end_date);
  return start === end ? start : `${start} - ${end}`;
};

function StatusBadge({ status }) {
  const meta = STATUS_META[status] || STATUS_META.pending;

  return (
    <span className={`leave-status leave-status--${meta.tone}`}>
      {meta.label}
    </span>
  );
}

export default function LeavePage() {
  const { user } = useAuth();
  const canReview = ["admin", "manager"].includes(user?.role);
  const [requests, setRequests] = useState([]);
  const [team, setTeam] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [filters, setFilters] = useState(emptyFilters);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState(null);
  const [rejectingId, setRejectingId] = useState(null);
  const [rejectionReason, setRejectionReason] = useState("");

  const fetchRequests = async (nextFilters = filters) => {
    setLoading(true);

    try {
      const params = Object.fromEntries(
        Object.entries(nextFilters).filter(([, value]) => value)
      );
      const res = await api.get("/leave/requests/", { params });
      setRequests(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      setMessage({
        type: "error",
        text: err.response?.data?.message || "Failed to load leave requests.",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests(emptyFilters);

    if (canReview) {
      api.get("/organizations/team/")
        .then((res) => setTeam(Array.isArray(res.data) ? res.data : []))
        .catch(() => setTeam([]));
    }
  }, [canReview]);

  const counts = useMemo(() => {
    const next = {
      pending: 0,
      approved: 0,
      rejected: 0,
      cancelled: 0,
    };

    requests.forEach((request) => {
      if (next[request.status] !== undefined) next[request.status] += 1;
    });

    return next;
  }, [requests]);

  const pendingRequests = useMemo(
    () => requests.filter((request) => request.status === "pending"),
    [requests]
  );

  const handleFormChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleFilterChange = (event) => {
    const { name, value } = event.target;
    const nextFilters = { ...filters, [name]: value };
    setFilters(nextFilters);
    fetchRequests(nextFilters);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setMessage(null);

    try {
      await api.post("/leave/requests/", form);
      setForm(emptyForm);
      setMessage({
        type: "success",
        text: "Leave request submitted.",
      });
      fetchRequests(filters);
    } catch (err) {
      setMessage({
        type: "error",
        text:
          err.response?.data?.message ||
          err.response?.data?.end_date ||
          "Failed to submit leave request.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const runAction = async (leaveId, action, payload = {}) => {
    setMessage(null);

    try {
      await api.patch(`/leave/requests/${leaveId}/${action}/`, payload);
      setRejectingId(null);
      setRejectionReason("");
      fetchRequests(filters);
    } catch (err) {
      setMessage({
        type: "error",
        text: err.response?.data?.message || "Leave request update failed.",
      });
    }
  };

  return (
    <div className="leave-page">
      <header className="leave-header">
        <div>
          <span className="leave-eyebrow">
            <PlaneTakeoff size={15} />
            Leave Management
          </span>
          <h1>{canReview ? "Leave Approval" : "My Leave"}</h1>
          <p>
            {canReview
              ? "Review requests, approve time off, and keep team capacity visible."
              : "Request time away and track every leave status in one place."}
          </p>
        </div>
        <button type="button" onClick={() => fetchRequests(filters)}>
          <RefreshCw size={16} />
          Refresh
        </button>
      </header>

      {message && (
        <div className={`leave-message leave-message--${message.type}`}>
          {message.type === "success" ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          {message.text}
        </div>
      )}

      <section className="leave-stat-grid">
        {Object.entries(counts).map(([status, value]) => (
          <div key={status} className={`leave-stat leave-stat--${STATUS_META[status].tone}`}>
            <span>{STATUS_META[status].label}</span>
            <strong>{value}</strong>
          </div>
        ))}
      </section>

      <div className="leave-layout">
        <form className="leave-card leave-form" onSubmit={handleSubmit}>
          <div className="leave-card-header">
            <div>
              <h2>Create Leave Request</h2>
              <p>Submit dates and context for approval.</p>
            </div>
            <CalendarCheck size={18} />
          </div>

          <label>
            <span>Leave type</span>
            <select name="leave_type" value={form.leave_type} onChange={handleFormChange}>
              {LEAVE_TYPES.map((type) => (
                <option key={type.value} value={type.value}>{type.label}</option>
              ))}
            </select>
          </label>

          <div className="leave-form-grid">
            <label>
              <span>Start date</span>
              <input
                type="date"
                name="start_date"
                value={form.start_date}
                onChange={handleFormChange}
                required
              />
            </label>
            <label>
              <span>End date</span>
              <input
                type="date"
                name="end_date"
                value={form.end_date}
                onChange={handleFormChange}
                required
              />
            </label>
          </div>

          <label>
            <span>Reason</span>
            <textarea
              name="reason"
              value={form.reason}
              onChange={handleFormChange}
              required
            />
          </label>

          <button type="submit" disabled={submitting}>
            {submitting ? <Loader2 size={16} className="leave-spin" /> : <Send size={16} />}
            {submitting ? "Submitting..." : "Submit Request"}
          </button>
        </form>

        <section className="leave-card leave-table-card">
          <div className="leave-card-header">
            <div>
              <h2>{canReview ? "Approval Dashboard" : "Leave Requests"}</h2>
              <p>
                {canReview
                  ? `${pendingRequests.length} request${pendingRequests.length === 1 ? "" : "s"} pending review.`
                  : "Your pending, approved, rejected, and cancelled requests."}
              </p>
            </div>
            <Filter size={18} />
          </div>

          {canReview && (
            <div className="leave-filters">
              <select name="status" value={filters.status} onChange={handleFilterChange}>
                {STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
              <select name="employee" value={filters.employee} onChange={handleFilterChange}>
                <option value="">All employees</option>
                {team.map((member) => (
                  <option key={member.id} value={member.id}>{member.name || member.email}</option>
                ))}
              </select>
              <input type="date" name="start_date" value={filters.start_date} onChange={handleFilterChange} />
              <input type="date" name="end_date" value={filters.end_date} onChange={handleFilterChange} />
            </div>
          )}

          <div className="leave-request-list" aria-busy={loading}>
            {loading ? (
              [1, 2, 3].map((item) => <div key={item} className="leave-skeleton" />)
            ) : requests.length === 0 ? (
              <div className="leave-empty">
                <PlaneTakeoff size={24} />
                <p>No leave requests found.</p>
              </div>
            ) : (
              requests.map((request) => (
                <article key={request.id} className="leave-request">
                  <div className="leave-request-main">
                    <div>
                      <h3>{request.leave_type_label}</h3>
                      <p>{canReview ? request.employee_data?.name : request.reason}</p>
                    </div>
                    <StatusBadge status={request.status} />
                  </div>
                  <div className="leave-request-meta">
                    <span>{getDateRange(request)}</span>
                    {canReview && <span>{request.reason}</span>}
                    {request.rejection_reason && <span>Reason: {request.rejection_reason}</span>}
                  </div>
                  <div className="leave-actions">
                    {request.status === "pending" && !canReview && (
                      <button type="button" onClick={() => runAction(request.id, "cancel")}>
                        <XCircle size={15} />
                        Cancel
                      </button>
                    )}
                    {request.status === "pending" && canReview && (
                      <>
                        <button type="button" className="leave-approve" onClick={() => runAction(request.id, "approve")}>
                          <CheckCircle2 size={15} />
                          Approve
                        </button>
                        <button type="button" className="leave-reject" onClick={() => setRejectingId(request.id)}>
                          <XCircle size={15} />
                          Reject
                        </button>
                      </>
                    )}
                  </div>
                  {rejectingId === request.id && (
                    <div className="leave-rejection-box">
                      <input
                        value={rejectionReason}
                        onChange={(event) => setRejectionReason(event.target.value)}
                        placeholder="Rejection reason"
                      />
                      <button
                        type="button"
                        onClick={() => runAction(request.id, "reject", { rejection_reason: rejectionReason })}
                      >
                        Confirm
                      </button>
                    </div>
                  )}
                </article>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

