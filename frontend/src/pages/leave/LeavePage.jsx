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
  Edit2,
  Users,
  Clock,
  ShieldAlert,
} from "lucide-react";
import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import "./LeavePage.css";

const LEAVE_TYPES = [
  { value: "annual", label: "Annual Leave" },
  { value: "sick", label: "Sick Leave" },
  { value: "casual", label: "Casual Leave" },
  { value: "personal", label: "Personal Leave" },
  { value: "other", label: "Other" },
];

const STATUS_OPTIONS = [
  { value: "", label: "All Statuses" },
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
  leave_type: "annual",
  start_date: "",
  end_date: "",
  reason: "",
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
  const isAdmin = user?.role === "admin";
  const isManager = user?.role === "manager";
  const canReview = isAdmin || isManager;

  const [requests, setRequests] = useState([]);
  const [balances, setBalances] = useState([]);
  const [team, setTeam] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [balancesLoading, setBalancesLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState(null);

  // Filters for review tab
  const [reviewFilterStatus, setReviewFilterStatus] = useState("");
  const [reviewFilterEmployee, setReviewFilterEmployee] = useState("");

  // Rejection state
  const [rejectingId, setRejectingId] = useState(null);
  const [rejectionReason, setRejectionReason] = useState("");

  // Edit allocation state (Admins only)
  const [editingBalance, setEditingBalance] = useState(null);
  const [allocatedDaysInput, setAllocatedDaysInput] = useState("");
  const [updatingAllocation, setUpdatingAllocation] = useState(false);

  // Tab navigation for Admin/Manager view
  const [activeTab, setActiveTab] = useState("approvals"); // 'approvals' | 'on_leave' | 'allocations'

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const res = await api.get("/leave/requests/");
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

  const fetchBalances = async () => {
    setBalancesLoading(true);
    try {
      const res = await api.get("/leave/balances/");
      setBalances(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("Failed to load leave balances.", err);
    } finally {
      setBalancesLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
    fetchBalances();

    if (canReview) {
      api.get("/organizations/team/")
        .then((res) => setTeam(Array.isArray(res.data) ? res.data : []))
        .catch(() => setTeam([]));
    }
  }, [canReview]);

  const handleRefresh = () => {
    fetchRequests();
    fetchBalances();
  };

  // Split requests into personal and reviewable
  const personalRequests = useMemo(() => {
    return requests.filter((r) => r.employee_data?.id === user?.id);
  }, [requests, user]);

  const reviewableRequests = useMemo(() => {
    if (!canReview) return [];
    // Admins see all requests except their own.
    // Managers see only employee requests.
    return requests.filter((r) => {
      if (r.employee_data?.id === user?.id) return false;
      if (isManager && r.employee_data?.role !== "employee") return false;
      return true;
    });
  }, [requests, canReview, isManager, user]);

  // Derived Statistics based on role
  const stats = useMemo(() => {
    const targetRequests = canReview ? reviewableRequests : personalRequests;
    const next = {
      pending: 0,
      approved: 0,
      rejected: 0,
    };
    targetRequests.forEach((r) => {
      if (r.status === "pending") next.pending += 1;
      if (r.status === "approved") next.approved += 1;
      if (r.status === "rejected") next.rejected += 1;
    });
    return next;
  }, [personalRequests, reviewableRequests, canReview]);

  // Visual balance breakdown (Self)
  const myBalances = useMemo(() => {
    return balances.filter((b) => b.employee === user?.id);
  }, [balances, user]);

  // Filtered review requests
  const filteredReviewRequests = useMemo(() => {
    return reviewableRequests.filter((r) => {
      const matchStatus = !reviewFilterStatus || r.status === reviewFilterStatus;
      const matchEmployee = !reviewFilterEmployee || r.employee_data?.id === reviewFilterEmployee;
      return matchStatus && matchEmployee;
    });
  }, [reviewableRequests, reviewFilterStatus, reviewFilterEmployee]);

  // Active / Upcoming Leaves
  const activeLeaves = useMemo(() => {
    const todayStr = new Date().toISOString().split("T")[0];
    return requests.filter((r) => {
      return (
        r.status === "approved" &&
        r.start_date <= todayStr &&
        r.end_date >= todayStr
      );
    });
  }, [requests]);

  const upcomingLeaves = useMemo(() => {
    const todayStr = new Date().toISOString().split("T")[0];
    return requests.filter((r) => {
      return r.status === "approved" && r.start_date > todayStr;
    });
  }, [requests]);

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage(null);

    try {
      await api.post("/leave/requests/", form);
      setForm(emptyForm);
      setMessage({
        type: "success",
        text: "Leave request submitted successfully.",
      });
      fetchRequests();
      fetchBalances();
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
      fetchRequests();
      fetchBalances();
    } catch (err) {
      setMessage({
        type: "error",
        text: err.response?.data?.message || "Failed to update leave request.",
      });
    }
  };

  const handleUpdateAllocation = async (e) => {
    e.preventDefault();
    if (!editingBalance) return;
    setUpdatingAllocation(true);
    try {
      await api.patch(`/leave/balances/${editingBalance.id}/`, {
        allocated_days: parseInt(allocatedDaysInput, 10),
      });
      setEditingBalance(null);
      fetchBalances();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to update allocation.");
    } finally {
      setUpdatingAllocation(false);
    }
  };

  return (
    <div className="leave-page">
      {/* HEADER */}
      <header className="leave-header">
        <div>
          <span className="leave-eyebrow">
            <PlaneTakeoff size={15} />
            Leave Management
          </span>
          <h1>{canReview ? "Leave Center" : "My Leave"}</h1>
          <p>
            {canReview
              ? "Approve employee requests, view time-off schedules, and configure leave balances."
              : "Submit new leave requests, monitor approvals, and review your leave balance."}
          </p>
        </div>
        <button type="button" className="leave-btn-sec" onClick={handleRefresh}>
          <RefreshCw size={14} />
          Refresh
        </button>
      </header>

      {/* FEEDBACK MESSAGES */}
      {message && (
        <div className={`leave-message leave-message--${message.type}`}>
          {message.type === "success" ? (
            <CheckCircle2 size={16} />
          ) : (
            <AlertCircle size={16} />
          )}
          {message.text}
        </div>
      )}

      {/* STATS GRID */}
      <section className="leave-stat-grid">
        {/* Visual Leave Balances */}
        <div className="leave-stat-card leave-stat-card--balance">
          <span className="leave-stat-title">My Leave Balances</span>
          {balancesLoading ? (
            <div className="leave-balance-skeleton-list">
              {[1, 2].map((i) => (
                <div key={i} className="leave-balance-skeleton-row" />
              ))}
            </div>
          ) : myBalances.length === 0 ? (
            <div className="leave-balance-empty">No balances allocated yet.</div>
          ) : (
            <div className="leave-balance-bar-list">
              {myBalances.map((b) => {
                const pct = b.allocated_days > 0 ? (b.remaining_days / b.allocated_days) * 100 : 0;
                return (
                  <div key={b.id} className="leave-balance-row">
                    <div className="leave-balance-info">
                      <span>{b.leave_type_label}</span>
                      <strong>{b.remaining_days} / {b.allocated_days} days left</strong>
                    </div>
                    <div className="leave-progress-bg">
                      <div
                        className="leave-progress-fill"
                        style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Counts */}
        <div className="leave-stat-card">
          <span className="leave-stat-title">{canReview ? "Pending Approvals" : "My Pending Requests"}</span>
          <div className="leave-stat-value-wrap">
            <strong className="text-warning">{stats.pending}</strong>
            <Clock size={20} className="text-warning" />
          </div>
          <span className="leave-stat-caption">Awaiting review</span>
        </div>

        <div className="leave-stat-card">
          <span className="leave-stat-title">{canReview ? "Approved Leaves" : "My Approved Requests"}</span>
          <div className="leave-stat-value-wrap">
            <strong className="text-success">{stats.approved}</strong>
            <CheckCircle2 size={20} className="text-success" />
          </div>
          <span className="leave-stat-caption">Time off scheduled</span>
        </div>

        <div className="leave-stat-card">
          <span className="leave-stat-title">{canReview ? "Rejected Leaves" : "My Rejected Requests"}</span>
          <div className="leave-stat-value-wrap">
            <strong className="text-danger">{stats.rejected}</strong>
            <XCircle size={20} className="text-danger" />
          </div>
          <span className="leave-stat-caption">Not approved</span>
        </div>
      </section>

      {/* ADMIN/MANAGER SECTION */}
      {canReview && (
        <section className="leave-admin-panel leave-card-wrap">
          <div className="leave-tabs">
            <button
              type="button"
              className={activeTab === "approvals" ? "is-active" : ""}
              onClick={() => setActiveTab("approvals")}
            >
              <CalendarCheck size={15} />
              Review Approvals ({reviewableRequests.filter((r) => r.status === "pending").length})
            </button>
            <button
              type="button"
              className={activeTab === "on_leave" ? "is-active" : ""}
              onClick={() => setActiveTab("on_leave")}
            >
              <Users size={15} />
              On Leave Today ({activeLeaves.length})
            </button>
            <button
              type="button"
              className={activeTab === "allocations" ? "is-active" : ""}
              onClick={() => setActiveTab("allocations")}
            >
              <Edit2 size={15} />
              {isAdmin ? "Configure Allocations" : "Leave Balances"}
            </button>
          </div>

          <div className="leave-tab-content">
            {/* TAB: APPROVALS */}
            {activeTab === "approvals" && (
              <div className="leave-review-pane">
                <div className="leave-pane-filters">
                  <select
                    value={reviewFilterStatus}
                    onChange={(e) => setReviewFilterStatus(e.target.value)}
                  >
                    {STATUS_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  <select
                    value={reviewFilterEmployee}
                    onChange={(e) => setReviewFilterEmployee(e.target.value)}
                  >
                    <option value="">All Employees</option>
                    {team.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name || t.email}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="leave-list" aria-busy={loading}>
                  {loading ? (
                    [1, 2].map((i) => <div key={i} className="leave-skeleton" />)
                  ) : filteredReviewRequests.length === 0 ? (
                    <div className="leave-empty-pane">
                      <CheckCircle2 size={32} />
                      <p>No leave requests found matching filters.</p>
                    </div>
                  ) : (
                    filteredReviewRequests.map((r) => (
                      <article key={r.id} className="leave-request-card">
                        <div className="leave-req-header">
                          <div>
                            <h3>{r.leave_type_label}</h3>
                            <span className="leave-req-user">
                              Requested by: <strong>{r.employee_data?.name || r.employee_data?.email}</strong>
                            </span>
                          </div>
                          <StatusBadge status={r.status} />
                        </div>
                        <div className="leave-req-body">
                          <div className="leave-req-dates">
                            <strong>Dates:</strong> {getDateRange(r)}
                          </div>
                          <div className="leave-req-reason">
                            <strong>Reason:</strong> {r.reason}
                          </div>
                          {r.rejection_reason && (
                            <div className="leave-req-rejected">
                              <strong>Rejection Reason:</strong> {r.rejection_reason}
                            </div>
                          )}
                        </div>

                        {r.status === "pending" && (
                          <div className="leave-req-actions">
                            <button
                              type="button"
                              className="leave-btn-approve"
                              onClick={() => runAction(r.id, "approve")}
                            >
                              Approve
                            </button>
                            <button
                              type="button"
                              className="leave-btn-reject"
                              onClick={() => setRejectingId(r.id)}
                            >
                              Reject
                            </button>
                          </div>
                        )}

                        {rejectingId === r.id && (
                          <div className="leave-rejection-form">
                            <input
                              type="text"
                              value={rejectionReason}
                              onChange={(e) => setRejectionReason(e.target.value)}
                              placeholder="Provide rejection reason..."
                              required
                            />
                            <div className="leave-rejection-form-actions">
                              <button
                                type="button"
                                className="leave-btn-confirm-reject"
                                onClick={() =>
                                  runAction(r.id, "reject", {
                                    rejection_reason: rejectionReason,
                                  })
                                }
                              >
                                Confirm Reject
                              </button>
                              <button
                                type="button"
                                className="leave-btn-cancel-action"
                                onClick={() => setRejectingId(null)}
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        )}
                      </article>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* TAB: ON LEAVE */}
            {activeTab === "on_leave" && (
              <div className="leave-schedule-pane">
                <div className="leave-schedule-section">
                  <h4>Currently On Leave Today ({activeLeaves.length})</h4>
                  {activeLeaves.length === 0 ? (
                    <p className="leave-no-list">No employees are currently on leave today.</p>
                  ) : (
                    <div className="leave-schedule-grid">
                      {activeLeaves.map((l) => (
                        <div key={l.id} className="leave-schedule-card">
                          <strong>{l.employee_data?.name || l.employee_data?.email}</strong>
                          <span>{l.leave_type_label}</span>
                          <small>{getDateRange(l)}</small>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="leave-schedule-section" style={{ marginTop: "24px" }}>
                  <h4>Upcoming Scheduled Leaves ({upcomingLeaves.length})</h4>
                  {upcomingLeaves.length === 0 ? (
                    <p className="leave-no-list">No upcoming scheduled leaves.</p>
                  ) : (
                    <div className="leave-schedule-grid">
                      {upcomingLeaves.map((l) => (
                        <div key={l.id} className="leave-schedule-card leave-schedule-card--upcoming">
                          <strong>{l.employee_data?.name || l.employee_data?.email}</strong>
                          <span>{l.leave_type_label}</span>
                          <small>{getDateRange(l)}</small>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB: ALLOCATIONS */}
            {activeTab === "allocations" && (
              <div className="leave-allocations-pane">
                <div className="leave-allocations-header">
                  <h4>All Employee Leave Balances</h4>
                  {!isAdmin && (
                    <div className="leave-info-badge">
                      <ShieldAlert size={14} />
                      <span>Managers have view-only access to leave configurations.</span>
                    </div>
                  )}
                </div>

                {balancesLoading ? (
                  <div className="leave-allocations-loading">
                    <Loader2 className="leave-spin" />
                    <span>Loading allocations...</span>
                  </div>
                ) : (
                  <div className="leave-allocations-table-wrapper">
                    <table className="leave-allocations-table">
                      <thead>
                        <tr>
                          <th>Employee</th>
                          <th>Leave Type</th>
                          <th>Allocated Days</th>
                          <th>Used</th>
                          <th>Remaining</th>
                          {isAdmin && <th>Actions</th>}
                        </tr>
                      </thead>
                      <tbody>
                        {balances.map((b) => (
                          <tr key={b.id}>
                            <td>
                              <strong>{b.employee_name || "Unknown"}</strong>
                              <br />
                              <small>{b.employee_email}</small>
                            </td>
                            <td>{b.leave_type_label}</td>
                            <td>{b.allocated_days} days</td>
                            <td>{b.used_days} days</td>
                            <td>
                              <span
                                className={`leave-table-remaining ${
                                  b.remaining_days === 0 ? "is-zero" : ""
                                }`}
                              >
                                {b.remaining_days} days
                              </span>
                            </td>
                            {isAdmin && (
                              <td>
                                <button
                                  type="button"
                                  className="leave-btn-edit-alloc"
                                  onClick={() => {
                                    setEditingBalance(b);
                                    setAllocatedDaysInput(b.allocated_days.toString());
                                  }}
                                >
                                  Edit Allocation
                                </button>
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* EDIT ALLOCATION MODAL / DRAWER */}
                {editingBalance && (
                  <div className="leave-alloc-modal-overlay">
                    <form className="leave-alloc-modal" onSubmit={handleUpdateAllocation}>
                      <h3>Edit Leave Allocation</h3>
                      <p>
                        Configureallocated days for{" "}
                        <strong>{editingBalance.employee_name}</strong> -{" "}
                        <strong>{editingBalance.leave_type_label}</strong>.
                      </p>

                      <label>
                        <span>Allocated Days</span>
                        <input
                          type="number"
                          min="0"
                          value={allocatedDaysInput}
                          onChange={(e) => setAllocatedDaysInput(e.target.value)}
                          required
                        />
                      </label>

                      <div className="leave-alloc-modal-actions">
                        <button
                          type="submit"
                          className="leave-btn-approve"
                          disabled={updatingAllocation}
                        >
                          {updatingAllocation ? "Saving..." : "Save Changes"}
                        </button>
                        <button
                          type="button"
                          className="leave-btn-cancel"
                          onClick={() => setEditingBalance(null)}
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>
      )}

      {/* CORE FORM AND HISTORY LAYOUT */}
      <div className="leave-layout">
        {/* SUBMIT REQUEST */}
        <form className="leave-card leave-form" onSubmit={handleSubmit}>
          <div className="leave-card-header">
            <div>
              <h2>Create Leave Request</h2>
              <p>Submit dates and context for approval.</p>
            </div>
            <CalendarCheck size={18} />
          </div>

          <label>
            <span>Leave Type</span>
            <select name="leave_type" value={form.leave_type} onChange={handleFormChange}>
              {LEAVE_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </label>

          <div className="leave-form-grid">
            <label>
              <span>Start Date</span>
              <input
                type="date"
                name="start_date"
                value={form.start_date}
                onChange={handleFormChange}
                required
              />
            </label>
            <label>
              <span>End Date</span>
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
              placeholder="Provide a reason for the leave..."
              required
            />
          </label>

          <button type="submit" className="leave-btn-submit" disabled={submitting}>
            {submitting ? (
              <Loader2 size={16} className="leave-spin" />
            ) : (
              <Send size={14} />
            )}
            {submitting ? "Submitting..." : "Submit Leave Request"}
          </button>
        </form>

        {/* MY REQUESTS HISTORY */}
        <section className="leave-card leave-table-card">
          <div className="leave-card-header">
            <div>
              <h2>My Leave History</h2>
              <p>View history and status of your leave requests.</p>
            </div>
            <Filter size={18} />
          </div>

          <div className="leave-request-list" aria-busy={loading}>
            {loading ? (
              [1, 2, 3].map((i) => <div key={i} className="leave-skeleton" />)
            ) : personalRequests.length === 0 ? (
              <div className="leave-empty">
                <PlaneTakeoff size={24} />
                <p>You haven't requested any leaves yet.</p>
              </div>
            ) : (
              personalRequests.map((r) => (
                <article key={r.id} className="leave-request">
                  <div className="leave-request-main">
                    <div>
                      <h3>{r.leave_type_label}</h3>
                      <p>{r.reason}</p>
                    </div>
                    <StatusBadge status={r.status} />
                  </div>
                  <div className="leave-request-meta">
                    <span>{getDateRange(r)}</span>
                    {r.rejection_reason && (
                      <span className="leave-rejection-inline">
                        Rejection Reason: {r.rejection_reason}
                      </span>
                    )}
                  </div>
                  {r.status === "pending" && (
                    <div className="leave-actions">
                      <button
                        type="button"
                        className="leave-btn-cancel-req"
                        onClick={() => runAction(r.id, "cancel")}
                      >
                        <XCircle size={13} />
                        Cancel Request
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
