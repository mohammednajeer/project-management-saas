import { useEffect, useState, useRef } from "react";
import api from "../../services/api";
import "./ChatPage.css";
import { useAuth } from "../../context/AuthContext";

// Icons as inline SVGs to avoid adding dependencies
const SearchIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
  </svg>
);
const PlusIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 5v14M5 12h14"/>
  </svg>
);
const SendIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/>
  </svg>
);
const AttachIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
  </svg>
);
const EmojiIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><path d="M8 13s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/>
  </svg>
);
const VideoIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m22 8-6 4 6 4V8Z"/><rect width="14" height="12" x="2" y="6" rx="2" ry="2"/>
  </svg>
);
const PhoneIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.4 2 2 0 0 1 3.6 1.22h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.91 9a16 16 0 0 0 6 6l.92-.92a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92Z"/>
  </svg>
);
const DotsIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/>
  </svg>
);
const MessageIcon = () => (
  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
  </svg>
);

// Deterministic avatar color per name
const AVATAR_GRADIENTS = [
  ["#c4b5fd", "#a78bfa"],
  ["#fbcfe8", "#f9a8d4"],
  ["#bfdbfe", "#93c5fd"],
  ["#bbf7d0", "#86efac"],
  ["#fde68a", "#fcd34d"],
  ["#fed7aa", "#fdba74"],
];
function avatarGradient(name = "") {
  const idx = (name.charCodeAt(0) || 0) % AVATAR_GRADIENTS.length;
  return AVATAR_GRADIENTS[idx];
}

function formatTime(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d)) return "";
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function ChatPage() {
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageInput, setMessageInput] = useState("");
  const [socket, setSocket] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [teamMembers, setTeamMembers] = useState([]);
  const [memberSearch, setMemberSearch] = useState("");
  const { user } = useAuth();

  useEffect(() => {
    loadConversations();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const loadConversations = async () => {
    try {
      const response = await api.get("/chat/");
      setConversations(response.data);
    } catch (err) {
      console.log(err);
    }
  };

  const loadMessages = async (conversationId) => {
    try {
      const response = await api.get(`/chat/${conversationId}/messages/`);
      setMessages(response.data);
    } catch (err) {
      console.log(err);
    }
  };

  const openConversation = async (conversation) => {
    setSelectedConversation(conversation);
    await loadMessages(conversation.id);

    if (socket) socket.close();

    const wsProtocol = window.location.protocol === "https:" ? "wss" : "ws";
    const wsBaseUrl = import.meta.env.VITE_API_BASE_URL;

    const ws = new WebSocket(
      `${wsProtocol}://${wsBaseUrl}/ws/chat/${conversation.id}/`
    );
    ws.onopen = () => {
      console.log("WebSocket connected");
    };
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      setMessages((prev) => {

        const exists = prev.some(
          (msg) => msg.id === data.id
        );

        if (exists) return prev;

        return [...prev, data];
      });
    };
    setSocket(ws);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const sendMessage = () => {

    if (!messageInput.trim()) {
      return;
    }

    if (!socket) {
      console.log("Socket not found");
      return;
    }

    if (socket.readyState !== WebSocket.OPEN) {
      console.log("WebSocket still connecting...");
      return;
    }

    socket.send(
      JSON.stringify({
        content: messageInput,
      })
    );

    setMessageInput("");
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };
  const openNewChatModal = async () => {
      try {
        setShowNewChatModal(true);

        const response = await api.get(
          "/chat/users/"
        );

        setTeamMembers(response.data);

      } catch (err) {
        console.log(err);
      }
    };

    const startConversation = async (
      memberId
    ) => {
      try {

        const response = await api.post(
          "/chat/start/",
          {
            user_id: memberId,
          }
        );

        const newConversation =
          response.data;

        setShowNewChatModal(false);

        await loadConversations();

        openConversation(newConversation);

      } catch (err) {
        console.log(err);
      }
    };

  const filteredConversations = conversations.filter((conv) => {
    const name = conv.participants_data?.[0]?.name || "";
    return name.toLowerCase().includes(searchQuery.toLowerCase());
  });


  const filteredMembers =
    teamMembers.filter((member) => {

      const fullText = `
        ${member.name}
        ${member.email}
      `.toLowerCase();

      return fullText.includes(
        memberSearch.toLowerCase()
      );
    });

console.log("socket result" ,socket);

  const activeUser = selectedConversation?.participants_data?.[0];
  const [g1, g2] = avatarGradient(activeUser?.name);

  return (
    <div className="cp-root">
      {/* Ambient background orbs */}
      <div className="cp-orb cp-orb--1" />
      <div className="cp-orb cp-orb--2" />
      <div className="cp-orb cp-orb--3" />

      {/* ── LEFT SIDEBAR ── */}
      <aside className="cp-sidebar">
        <div className="cp-sidebar-inner">
          {/* Header */}
          <div className="cp-sidebar-top">
            <div className="cp-sidebar-title">
              <span className="cp-sidebar-title-text">Messages</span>
              <span className="cp-sidebar-count">{conversations.length}</span>
            </div>
            <button className="cp-new-chat-btn" title="New conversation"  onClick={openNewChatModal}>
              <PlusIcon />
              <span>New Chat</span>
            </button>
          </div>

          {/* Search */}
          <div className="cp-search-wrap">
            <span className="cp-search-icon"><SearchIcon /></span>
            <input
              className="cp-search-input"
              type="text"
              placeholder="Search conversations…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Conversation list */}
          <div className="cp-conv-list">
            {filteredConversations.length === 0 && (
              <div className="cp-conv-empty">No conversations found</div>
            )}
            {filteredConversations.map((conversation, i) => {
              const user = conversation.participants_data?.[0];
              const isActive = selectedConversation?.id === conversation.id;
              const [c1, c2] = avatarGradient(user?.name);
              const isOnline = i % 3 !== 2; // UI demo: simulate online status

              return (
                <button
                type="button"
                  key={conversation.id}
                  className={`cp-conv-card${isActive ? " cp-conv-card--active" : ""}`}
                  onClick={() => openConversation(conversation)}
                >
                  <div className="cp-conv-avatar-wrap">
                    <div
                      className="cp-conv-avatar"
                      style={{ background: `linear-gradient(135deg, ${c1}, ${c2})` }}
                    >
                      {user?.name?.[0]?.toUpperCase() || "U"}
                    </div>
                    {isOnline && <span className="cp-online-dot" />}
                  </div>
                  <div className="cp-conv-info">
                    <div className="cp-conv-row">
                      <span className="cp-conv-name">{user?.name || "Unknown"}</span>
                      <span className="cp-conv-time">
                        {formatTime(conversation.last_message?.created_at) || ""}
                      </span>
                    </div>
                    <div className="cp-conv-row">
                      <span className="cp-conv-preview">
                        {conversation.last_message?.content || "No messages yet"}
                      </span>
                      {/* Unread badge UI */}
                      
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </aside>

      {/* ── MAIN CHAT AREA ── */}
      <section className="cp-main">
        {selectedConversation ? (
          <div className="cp-chat-wrap">
            {/* Chat Header */}
            <header className="cp-chat-header">
              <div className="cp-chat-header-left">
                <div
                  className="cp-chat-header-avatar"
                  style={{ background: `linear-gradient(135deg, ${g1}, ${g2})` }}
                >
                  {activeUser?.name?.[0]?.toUpperCase() || "U"}
                </div>
                <div className="cp-chat-header-info">
                  <span className="cp-chat-header-name">{activeUser?.name || "Unknown"}</span>
                  <span className="cp-chat-header-status">
                    <span className="cp-status-dot" />
                    Online
                  </span>
                </div>
              </div>
              <div className="cp-chat-header-actions">
                <button className="cp-header-action-btn" title="Voice call"><PhoneIcon /></button>
                <button className="cp-header-action-btn" title="Video call"><VideoIcon /></button>
                <button className="cp-header-action-btn" title="More options"><DotsIcon /></button>
              </div>
            </header>

            {/* Messages */}
            <div className="cp-messages-area">
              <div className="cp-messages-inner">
                {messages.length === 0 && (
                  <div className="cp-messages-empty">
                    <div className="cp-messages-empty-icon"><MessageIcon /></div>
                    <p>Say hello to {activeUser?.name}!</p>
                  </div>
                )}
                {messages.map((message, idx) => {
                  const isMine = message?.sender_data?.id === user?.id;
                  const senderName = message?.sender_data?.name || "User";
                  const [mc1, mc2] = avatarGradient(senderName);

                  return (
                    <div
                      key={message.id || idx}
                      className={`cp-msg-row${isMine ? " cp-msg-row--mine" : ""}`}
                    >
                      {!isMine && (
                        <div
                          className="cp-msg-avatar"
                          style={{ background: `linear-gradient(135deg, ${mc1}, ${mc2})` }}
                        >
                          {senderName[0]?.toUpperCase()}
                        </div>
                      )}
                      <div className="cp-msg-group">
                        {!isMine && (
                          <span className="cp-msg-sender">{senderName}</span>
                        )}
                        <div className={`cp-bubble${isMine ? " cp-bubble--mine" : ""}`}>
                          <span className="cp-bubble-text">{message.content}</span>
                        </div>
                        <span className="cp-msg-time">
                          {formatTime(message.created_at) || "Just now"}
                        </span>
                      </div>
                      {isMine && (
                        <div className="cp-msg-avatar cp-msg-avatar--mine"
                          style={{ background: "linear-gradient(135deg, #c4b5fd, #a78bfa)" }}
                        >
                          Me
                        </div>
                      )}
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>
            </div>

            {/* Input Area */}
            <div className="cp-input-area">
              <div className="cp-input-wrap">
                <button className="cp-input-icon-btn" title="Attach file">
                  <AttachIcon />
                </button>
                <input
                  ref={inputRef}
                  className="cp-message-input"
                  type="text"
                  placeholder="Type a message…"
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                />
                <button className="cp-input-icon-btn" title="Emoji">
                  <EmojiIcon />
                </button>
                <button
                  className={`cp-send-btn${messageInput.trim() ? " cp-send-btn--active" : ""}`}
                  onClick={sendMessage}
                  title="Send message"
                >
                  <SendIcon />
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="cp-welcome">
            <div className="cp-welcome-icon">
              <MessageIcon />
            </div>
            <h2 className="cp-welcome-title">Your Messages</h2>
            <p className="cp-welcome-sub">Select a conversation to start chatting</p>
          </div>
        )}
      </section>
      {showNewChatModal && (
        <div className="cp-modal-overlay">

          <div className="cp-modal">

            <div className="cp-modal-header">
              <h3>Start New Chat</h3>

              <button
                onClick={() =>
                  setShowNewChatModal(false)
                }
              >
                ✕
              </button>
            </div>

            <div className="cp-modal-search">
              <input
                type="text"
                placeholder="Search team members..."
                value={memberSearch}
                onChange={(e) =>
                  setMemberSearch(e.target.value)
                }
              />
            </div>

            <div className="cp-modal-members">

              {filteredMembers.map((member) => {

                const [m1, m2] =
                  avatarGradient(member.name);

                return (

                  <button
                    key={member.id}
                    className="cp-member-card"
                    onClick={() =>
                      startConversation(member.id)
                    }
                  >

                    <div
                      className="cp-member-avatar"
                      style={{
                        background:
                          `linear-gradient(135deg, ${m1}, ${m2})`
                      }}
                    >
                      {member.name?.[0]}
                    </div>

                    <div className="cp-member-info">
                      <span>{member.name}</span>
                      <small>{member.email}</small>
                    </div>

                  </button>
                );
              })}

            </div>

          </div>

        </div>
      )}
    </div>
  );
}