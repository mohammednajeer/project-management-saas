import { useEffect, useRef, useState } from "react";
import {
  MessageCircle,
  Paperclip,
  Phone,
  Plus,
  Search,
  Send,
  Smile,
  Video,
  MoreVertical,
  X,
  Users,
  Hash,
  CheckCheck,
} from "lucide-react";
import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import "./ChatPage.css";

/* ─── HELPERS ────────────────────────────────────────────────────────────── */
const AVATAR_COLORS = [
  ["#C7D2FE", "#818CF8"],
  ["#FBCFE8", "#F472B6"],
  ["#BBF7D0", "#34D399"],
  ["#FDE68A", "#FBBF24"],
  ["#BFDBFE", "#60A5FA"],
  ["#DDD6FE", "#A78BFA"],
];

function avatarColor(name = "") {
  const idx = (name.charCodeAt(0) || 0) % AVATAR_COLORS.length;
  return AVATAR_COLORS[idx];
}

function fmtTime(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d)) return "";
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function fmtDate(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  const now = new Date();
  const isToday =
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear();
  if (isToday) return fmtTime(dateStr);
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

/* ─── AVATAR ─────────────────────────────────────────────────────────────── */
function Avatar({ name = "", size = 38, className = "" }) {
  const [c1, c2] = avatarColor(name);
  return (
    <div
      className={`cp-avatar ${className}`}
      style={{
        width: size,
        height: size,
        background: `linear-gradient(135deg, ${c1}, ${c2})`,
        fontSize: size * 0.37,
      }}
    >
      {name?.[0]?.toUpperCase() || "?"}
    </div>
  );
}

/* ─── NEW CHAT MODAL ─────────────────────────────────────────────────────── */
function NewChatModal({ members, onStart, onClose }) {
  const [q, setQ] = useState("");
  const filtered = members.filter((m) =>
    `${m.name} ${m.email}`.toLowerCase().includes(q.toLowerCase())
  );

  return (
    <div className="cp-modal-backdrop" onClick={onClose}>
      <div className="cp-modal" onClick={(e) => e.stopPropagation()}>
        <div className="cp-modal-head">
          <h2>New Conversation</h2>
          <button className="cp-modal-close" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <div className="cp-modal-search">
          <Search size={14} className="cp-modal-search-icon" />
          <input
            autoFocus
            placeholder="Search team members…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>

        <div className="cp-modal-list">
          {filtered.length === 0 && (
            <p className="cp-modal-empty">No members found.</p>
          )}
          {filtered.map((m) => (
            <button
              key={m.id}
              type="button"
              className="cp-modal-member"
              onClick={() => onStart(m.id)}
            >
              <Avatar name={m.name} size={38} />
              <div className="cp-modal-member-info">
                <strong>{m.name}</strong>
                <small>{m.email}</small>
              </div>
              <span className="cp-modal-member-role">{m.role}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════════════════════ */
export default function ChatPage() {
  const { user }                            = useAuth();
  const [conversations, setConversations]   = useState([]);
  const [selected,      setSelected]        = useState(null);
  const [messages,      setMessages]        = useState([]);
  const [draft,         setDraft]           = useState("");
  const [socket,        setSocket]          = useState(null);
  const [search,        setSearch]          = useState("");
  const [showModal,     setShowModal]       = useState(false);
  const [members,       setMembers]         = useState([]);

  const messagesEndRef = useRef(null);
  const inputRef       = useRef(null);

  /* ── Scroll messages to bottom — only inside the messages container ── */
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  /* ── Load conversations ── */
  useEffect(() => {
    (async () => {
      try {
        const res = await api.get("/chat/");
        setConversations(res.data);
      } catch (err) {
        console.error(err);
      }
    })();
  }, []);

  /* ── Open a conversation ── */
  const openConversation = async (conv) => {
    // ── FIX: blur to prevent browser auto-scroll-to-focused-element ──
    document.activeElement?.blur?.();

    setSelected(conv);
    setMessages([]);

    try {
      const res = await api.get(`/chat/${conv.id}/messages/`);
      setMessages(res.data);
    } catch (err) {
      console.error(err);
    }

    // Close old socket
    if (socket) socket.close();

    const ws = new WebSocket(`ws://localhost:8000/ws/chat/${conv.id}/`);

    ws.onmessage = (e) => {
      const data = JSON.parse(e.data);
      setMessages((prev) =>
        prev.some((m) => m.id === data.id) ? prev : [...prev, data]
      );
    };

    setSocket(ws);
    setTimeout(() => inputRef.current?.focus(), 120);
  };

  /* ── Send message ── */
  const sendMessage = () => {
    if (!draft.trim() || !socket || socket.readyState !== WebSocket.OPEN) return;
    socket.send(JSON.stringify({ content: draft.trim() }));
    setDraft("");
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  /* ── New chat modal ── */
  const openNewChat = async () => {
    try {
      const res = await api.get("/chat/users/");
      setMembers(res.data);
      setShowModal(true);
    } catch (err) {
      console.error(err);
    }
  };

  const startConversation = async (memberId) => {
    try {
      const res = await api.post("/chat/start/", { user_id: memberId });
      setShowModal(false);
      const fresh = await api.get("/chat/");
      setConversations(fresh.data);
      openConversation(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  /* ── Derived ── */
  const filteredConvs = conversations.filter((c) => {
    const name = c.participants_data?.[0]?.name || "";
    return name.toLowerCase().includes(search.toLowerCase());
  });

  const peer = selected?.participants_data?.[0];

  /* ─────────────────────────────────────────────────────────────────────── */
  return (
    <div className="cp-root">
      {/* Ambient blobs */}
      <div className="cp-blob cp-blob--1" />
      <div className="cp-blob cp-blob--2" />

      {/* ══════════════════════════════
          LEFT — Conversation list
          ══════════════════════════════ */}
      <aside className="cp-sidebar">

        {/* Header */}
        <div className="cp-sidebar-header">
          <div className="cp-sidebar-title">
            <MessageCircle size={16} className="cp-sidebar-title-icon" />
            <span>Messages</span>
            <span className="cp-conv-count">{conversations.length}</span>
          </div>
          <button
            type="button"
            className="cp-new-btn"
            onClick={openNewChat}
            title="New conversation"
          >
            <Plus size={14} />
            New
          </button>
        </div>

        {/* Search */}
        <div className="cp-search-wrap">
          <Search size={13} className="cp-search-icon" />
          <input
            className="cp-search-input"
            placeholder="Search conversations…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Conversation list */}
        <div className="cp-conv-list">
          {filteredConvs.length === 0 && (
            <div className="cp-conv-empty">No conversations yet</div>
          )}

          {filteredConvs.map((conv, idx) => {
            const p       = conv.participants_data?.[0];
            const isActive = selected?.id === conv.id;
            const online   = idx % 3 !== 2; // demo presence

            return (
              <button
                key={conv.id}
                type="button"
                className={`cp-conv-item ${isActive ? "cp-conv-item--active" : ""}`}
                onClick={() => openConversation(conv)}
              >
                <div className="cp-conv-avatar-wrap">
                  <Avatar name={p?.name} size={42} />
                  {online && <span className="cp-online-dot" />}
                </div>
                <div className="cp-conv-body">
                  <div className="cp-conv-row">
                    <span className="cp-conv-name">{p?.name || "Unknown"}</span>
                    <span className="cp-conv-time">
                      {fmtDate(conv.last_message?.created_at)}
                    </span>
                  </div>
                  <div className="cp-conv-row">
                    <span className="cp-conv-preview">
                      {conv.last_message?.content || "No messages yet"}
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </aside>

      {/* ══════════════════════════════
          MAIN — Chat area
          ══════════════════════════════ */}
      <main className="cp-main">
        {selected ? (
          <div className="cp-chat">

            {/* ── Chat header ── */}
            <header className="cp-chat-header">
              <div className="cp-chat-header-left">
                <Avatar name={peer?.name} size={40} />
                <div className="cp-chat-peer-info">
                  <span className="cp-chat-peer-name">{peer?.name || "Unknown"}</span>
                  <span className="cp-chat-peer-status">
                    <span className="cp-status-dot" />
                    Online
                  </span>
                </div>
              </div>
              <div className="cp-chat-header-actions">
                <button type="button" className="cp-header-btn" title="Voice call">
                  <Phone size={16} />
                </button>
                <button type="button" className="cp-header-btn" title="Video call">
                  <Video size={16} />
                </button>
                <button type="button" className="cp-header-btn" title="More">
                  <MoreVertical size={16} />
                </button>
              </div>
            </header>

            {/* ── Messages ── */}
            <div className="cp-messages">
              <div className="cp-messages-inner">
                {messages.length === 0 && (
                  <div className="cp-messages-empty">
                    <div className="cp-messages-empty-icon">
                      <MessageCircle size={36} />
                    </div>
                    <p>Start the conversation with {peer?.name}!</p>
                  </div>
                )}

                {messages.map((msg, idx) => {
                  const isMine  = msg.sender_data?.id === user?.id;
                  const sender  = msg.sender_data?.name || "User";
                  const showAvatar =
                    !isMine &&
                    (idx === 0 || messages[idx - 1]?.sender_data?.id !== msg.sender_data?.id);

                  return (
                    <div
                      key={msg.id || idx}
                      className={`cp-msg-row ${isMine ? "cp-msg-row--mine" : ""}`}
                    >
                      {/* Spacer if same sender, avatar if new sender */}
                      {!isMine && (
                        showAvatar
                          ? <Avatar name={sender} size={30} className="cp-msg-ava" />
                          : <div className="cp-msg-ava-gap" />
                      )}

                      <div className="cp-msg-group">
                        {!isMine && showAvatar && (
                          <span className="cp-msg-sender">{sender}</span>
                        )}
                        <div className={`cp-bubble ${isMine ? "cp-bubble--mine" : ""}`}>
                          <span className="cp-bubble-text">{msg.content}</span>
                        </div>
                        <span className={`cp-msg-time ${isMine ? "cp-msg-time--mine" : ""}`}>
                          {fmtTime(msg.created_at) || "Just now"}
                          {isMine && <CheckCheck size={11} className="cp-read-icon" />}
                        </span>
                      </div>

                      {isMine && (
                        <Avatar name={user?.name || "Me"} size={30} className="cp-msg-ava" />
                      )}
                    </div>
                  );
                })}

                <div ref={messagesEndRef} />
              </div>
            </div>

            {/* ── Input ── */}
            <div className="cp-input-area">
              <button type="button" className="cp-input-side-btn" title="Attach">
                <Paperclip size={17} />
              </button>

              <div className="cp-input-wrap">
                <input
                  ref={inputRef}
                  className="cp-input"
                  placeholder="Type a message…"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={handleKeyDown}
                />
                <button type="button" className="cp-emoji-btn" title="Emoji">
                  <Smile size={17} />
                </button>
              </div>

              <button
                type="button"
                className={`cp-send-btn ${draft.trim() ? "cp-send-btn--active" : ""}`}
                onClick={sendMessage}
                title="Send"
              >
                <Send size={16} />
              </button>
            </div>
          </div>
        ) : (
          /* ── Welcome screen ── */
          <div className="cp-welcome">
            <div className="cp-welcome-icon-wrap">
              <MessageCircle size={32} />
            </div>
            <h2 className="cp-welcome-title">Your Messages</h2>
            <p className="cp-welcome-sub">
              Select a conversation from the left or start a new one.
            </p>
            <button
              type="button"
              className="cp-welcome-btn"
              onClick={openNewChat}
            >
              <Plus size={14} />
              New Conversation
            </button>
          </div>
        )}
      </main>

      {/* ── New Chat Modal ── */}
      {showModal && (
        <NewChatModal
          members={members}
          onStart={startConversation}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  );
}