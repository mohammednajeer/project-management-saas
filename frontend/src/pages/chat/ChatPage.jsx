import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CheckCheck,
  Clock3,
  MessageCircle,
  MoreVertical,
  Phone,
  Plus,
  Search,
  Send,
  Smile,
  Video,
  X,
  FileText,
  Hash,
  UserPlus,
} from "lucide-react";
import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import "./ChatPage.css";

const AVATAR_COLORS = [
  ["#C7D2FE", "#818CF8"],
  ["#FBCFE8", "#F472B6"],
  ["#BBF7D0", "#34D399"],
  ["#FDE68A", "#FBBF24"],
  ["#BFDBFE", "#60A5FA"],
  ["#DDD6FE", "#A78BFA"],
];

const RECONNECT_DELAYS = [600, 1200, 2500, 5000, 8000];
const MAX_MESSAGE_LENGTH = 4000;

function avatarColor(name = "") {
  const idx = (name.charCodeAt(0) || 0) % AVATAR_COLORS.length;
  return AVATAR_COLORS[idx];
}

function fmtTime(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return "";
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

function sameUser(left, right) {
  if (left == null || right == null) return false;
  return String(left) === String(right);
}

function isCurrentUserMessage(message, user) {
  return sameUser(message?.sender_data?.id ?? message?.sender, user?.id);
}

function getWebSocketBaseUrl() {
  const explicit = import.meta.env.VITE_WS_BASE_URL;
  if (explicit) return explicit.replace(/\/$/, "");

  const apiBase = import.meta.env.VITE_API_BASE_URL;
  if (apiBase) {
    try {
      const url = new URL(apiBase);
      url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
      url.pathname = url.pathname.replace(/\/api\/?$/, "");
      return url.toString().replace(/\/$/, "");
    } catch {
      // Fall through to the current host.
    }
  }

  const protocol = window.location.protocol === "https:" ? "wss" : "ws";
  return `${protocol}://${window.location.hostname}:8000`;
}

function normalizeConversation(conversation) {
  return {
    ...conversation,
    unread_count: Number(conversation?.unread_count || 0),
  };
}

function sortConversations(conversations) {
  return [...conversations].sort((a, b) => {
    const aDate = new Date(a.last_message?.created_at || a.updated_at || 0);
    const bDate = new Date(b.last_message?.created_at || b.updated_at || 0);
    return bDate - aDate;
  });
}

function Avatar({
      name = "",
      image = "",
      size = 38,
      className = "",
    }) {

      if (image) {

        return (

          <img
            src={image}
            alt={name}
            className={`cp-avatar ${className}`}
            style={{
              width: size,
              height: size,
              objectFit: "cover",
            }}
          />

        );
      }

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

function NewChatModal({ members, onStart, onClose }) {
  const [q, setQ] = useState("");
  const filtered = members.filter((member) =>
    `${member.name} ${member.email}`.toLowerCase().includes(q.toLowerCase())
  );

  return (
    <div className="cp-modal-backdrop" onClick={onClose}>
      <div className="cp-modal" onClick={(event) => event.stopPropagation()}>
        <div className="cp-modal-head">
          <h2>New Conversation</h2>
          <button className="cp-modal-close" onClick={onClose} type="button">
            <X size={16} />
          </button>
        </div>

        <div className="cp-modal-search">
          <Search size={14} className="cp-modal-search-icon" />
          <input
            autoFocus
            placeholder="Search team members"
            value={q}
            onChange={(event) => setQ(event.target.value)}
          />
        </div>

        <div className="cp-modal-list">
          {filtered.length === 0 && (
            <p className="cp-modal-empty">No members found.</p>
          )}

          {filtered.map((member) => (
            <button
              key={member.id}
              type="button"
              className="cp-modal-member"
              onClick={() => onStart(member.id)}
            >
              <Avatar
                name={member.name}
                image={member.profile_picture}
                size={38}
              />
              <div className="cp-modal-member-info">
                <strong>{member.name}</strong>
                <small>{member.email}</small>
              </div>
              <span className="cp-modal-member-role">{member.role}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function NewChannelModal({
  name,
  setName,
  desc,
  setDesc,
  projects,
  selectedProjectId,
  setSelectedProjectId,
  onSubmit,
  onClose,
}) {
  return (
    <div className="cp-modal-backdrop" onClick={onClose}>
      <form className="cp-modal" onSubmit={onSubmit} onClick={(event) => event.stopPropagation()}>
        <div className="cp-modal-head">
          <h2>Create Channel</h2>
          <button className="cp-modal-close" onClick={onClose} type="button">
            <X size={16} />
          </button>
        </div>

        <div className="cp-modal-field">
          <label htmlFor="channel-name">Channel Name</label>
          <input
            id="channel-name"
            autoFocus
            placeholder="e.g. dev-team"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <small>Names must be lowercase kebab-case (e.g. general, marketing-sync)</small>
        </div>

        <div className="cp-modal-field">
          <label htmlFor="channel-desc">Description (Optional)</label>
          <textarea
            id="channel-desc"
            placeholder="Describe the purpose of this room..."
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
          />
        </div>

        <div className="cp-modal-field">
          <label htmlFor="channel-project">Link to Project (Optional)</label>
          <select
            id="channel-project"
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            className="cp-modal-select"
            style={{
              width: "100%",
              padding: "10px",
              borderRadius: "8px",
              border: "1px solid var(--cp-border)",
              backgroundColor: "var(--cp-surface)",
              color: "var(--cp-on-surface)",
              outline: "none",
              fontSize: "14px",
              marginTop: "4px"
            }}
          >
            <option value="">-- No Project (Custom Channel) --</option>
            {projects.map((proj) => (
              <option key={proj.id} value={proj.id}>
                {proj.name}
              </option>
            ))}
          </select>
          <small>If linked, project members will automatically have access to this channel.</small>
        </div>

        <div className="cp-modal-actions">
          <button className="cp-modal-btn cp-modal-btn--cancel" onClick={onClose} type="button">
            Cancel
          </button>
          <button className="cp-modal-btn cp-modal-btn--submit" type="submit">
            Create
          </button>
        </div>
      </form>
    </div>
  );
}

function InviteChannelModal({
  members,
  currentMembers,
  selectedUsers,
  setSelectedUsers,
  searchQuery,
  setSearchQuery,
  onInvite,
  onClose,
}) {
  const currentMemberIds = new Set(currentMembers.map((m) => String(m.id)));
  
  const filtered = members.filter((member) => {
    const isAlreadyMember = currentMemberIds.has(String(member.id));
    const matchesSearch = `${member.name} ${member.email}`
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    return !isAlreadyMember && matchesSearch;
  });

  const toggleUserSelection = (userId) => {
    setSelectedUsers((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  return (
    <div className="cp-modal-backdrop" onClick={onClose}>
      <div className="cp-modal" onClick={(event) => event.stopPropagation()}>
        <div className="cp-modal-head">
          <h2>Invite Members</h2>
          <button className="cp-modal-close" onClick={onClose} type="button">
            <X size={16} />
          </button>
        </div>

        <div className="cp-modal-search">
          <Search size={14} className="cp-modal-search-icon" />
          <input
            autoFocus
            placeholder="Search workspace members..."
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
          />
        </div>

        <div className="cp-modal-list" style={{ maxHeight: "250px", overflowY: "auto" }}>
          {filtered.length === 0 && (
            <p className="cp-modal-empty">No eligible team members found.</p>
          )}

          {filtered.map((member) => {
            const isChecked = selectedUsers.includes(member.id);
            return (
              <div
                key={member.id}
                className="cp-modal-member-invite-row"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "8px 12px",
                  borderRadius: "6px",
                  cursor: "pointer",
                  transition: "background-color 0.2s",
                }}
                onClick={() => toggleUserSelection(member.id)}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <Avatar name={member.name} image={member.profile_picture} size={34} />
                  <div className="cp-modal-member-info" style={{ display: "flex", flexDirection: "column" }}>
                    <strong style={{ fontSize: "13px" }}>{member.name}</strong>
                    <small style={{ fontSize: "11px", color: "gray" }}>{member.email}</small>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => toggleUserSelection(member.id)}
                  onClick={(e) => e.stopPropagation()}
                  style={{ width: "auto", cursor: "pointer" }}
                />
              </div>
            );
          })}
        </div>

        <div className="cp-modal-actions" style={{ marginTop: "16px" }}>
          <button className="cp-modal-btn cp-modal-btn--cancel" onClick={onClose} type="button">
            Cancel
          </button>
          <button
            className="cp-modal-btn cp-modal-btn--submit"
            onClick={onInvite}
            type="button"
            disabled={selectedUsers.length === 0}
          >
            Invite ({selectedUsers.length})
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ChatPage() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [channels, setChannels] = useState([]);
  const [selected, setSelected] = useState(null);
  const [selectedChannel, setSelectedChannel] = useState(null);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [search, setSearch] = useState("");
  
  const [showModal, setShowModal] = useState(false);
  const [showChannelModal, setShowChannelModal] = useState(false);
  const [newChannelName, setNewChannelName] = useState("");
  const [newChannelDesc, setNewChannelDesc] = useState("");
  
  const [mentionSuggestions, setMentionSuggestions] = useState([]);
  const [showMentionList, setShowMentionList] = useState(false);
  const [mentionIndex, setMentionIndex] = useState(-1);

  const [members, setMembers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteChannelMembers, setInviteChannelMembers] = useState([]);
  const [selectedInviteUsers, setSelectedInviteUsers] = useState([]);
  const [inviteQuery, setInviteQuery] = useState("");

  const [loadingConversations, setLoadingConversations] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [socketStatus, setSocketStatus] = useState("idle");
  const [error, setError] = useState("");
  const [typingUsers, setTypingUsers] = useState({});
  const [presence, setPresence] = useState({});
  const [inputFocused, setInputFocused] = useState(false);
  const [peerTasks, setPeerTasks] = useState([]);
  const [loadingPeerTasks, setLoadingPeerTasks] = useState(false);

  const navigate = useNavigate();

  const socketRef = useRef(null);
  const connectSocketRef = useRef(null);
  const reconnectTimerRef = useRef(null);
  const reconnectAttemptRef = useRef(0);
  const shouldReconnectRef = useRef(false);
  const selectedIdRef = useRef(null);
  const selectedChannelIdRef = useRef(null);
  const messagesEndRef = useRef(null);
  const messagesPaneRef = useRef(null);
  const inputRef = useRef(null);
  const typingStopTimerRef = useRef(null);
  const isTypingRef = useRef(false);
  const pendingTimersRef = useRef(new Map());

  const peer = selected?.other_user;
  const currentUserName = user?.name || user?.email || "Me";
  const wsBaseUrl = useMemo(() => getWebSocketBaseUrl(), []);

  const sendSocketEvent = useCallback((payload) => {
    const socket = socketRef.current;
    if (!socket || socket.readyState !== WebSocket.OPEN) return false;
    socket.send(JSON.stringify(payload));
    return true;
  }, []);

  const clearTyping = useCallback(() => {
    if (typingStopTimerRef.current) {
      window.clearTimeout(typingStopTimerRef.current);
      typingStopTimerRef.current = null;
    }

    if (isTypingRef.current) {
      sendSocketEvent({ type: "typing", is_typing: false });
      isTypingRef.current = false;
    }
  }, [sendSocketEvent]);

  const markPendingResolved = useCallback((clientId) => {
    if (!clientId) return;

    const timer = pendingTimersRef.current.get(clientId);
    if (timer) {
      window.clearTimeout(timer);
      pendingTimersRef.current.delete(clientId);
    }
  }, []);

  const applyConversationMessage = useCallback(
    (message) => {
      const conversationId = String(message.conversation || selectedIdRef.current || "");
      const mine = isCurrentUserMessage(message, user);

      setConversations((prev) =>
        sortConversations(
          prev.map((conversation) => {
            if (String(conversation.id) !== conversationId) return conversation;

            const isOpen = String(selectedIdRef.current) === conversationId;
            const nextUnread = mine || isOpen
              ? 0
              : Number(conversation.unread_count || 0) + 1;

            return {
              ...conversation,
              unread_count: nextUnread,
              updated_at: message.created_at || new Date().toISOString(),
              last_message: {
                id: message.id,
                content: message.content,
                sender_id: message.sender_data?.id || message.sender,
                sender_name: message.sender_data?.name || "",
                created_at: message.created_at || new Date().toISOString(),
                is_seen: Boolean(message.is_seen),
              },
            };
          })
        )
      );
    },
    [user]
  );

  const applyChannelMessage = useCallback(
    (message) => {
      const channelId = String(message.channel || selectedChannelIdRef.current || "");
      setChannels((prev) =>
        prev.map((ch) => {
          if (String(ch.id) !== channelId) return ch;
          return {
            ...ch,
            updated_at: message.created_at || new Date().toISOString(),
            last_message: {
              id: message.id,
              content: message.content,
              sender_id: message.sender_data?.id || message.sender,
              sender_name: message.sender_data?.name || "",
              created_at: message.created_at || new Date().toISOString(),
            },
          };
        })
      );
    },
    []
  );

  const handleIncomingMessage = useCallback(
    (message) => {
      const conversationId = String(message.conversation || "");
      const channelId = String(message.channel || "");
      const activeConversation = String(selectedIdRef.current || "");
      const activeChannel = String(selectedChannelIdRef.current || "");

      markPendingResolved(message.client_id);
      
      if (conversationId) {
        applyConversationMessage(message);
        if (conversationId !== activeConversation) return;
      } else if (channelId) {
        applyChannelMessage(message);
        if (channelId !== activeChannel) return;
      }

      setMessages((prev) => {
        if (message.client_id) {
          const optimisticIndex = prev.findIndex(
            (item) => item.client_id === message.client_id
          );

          if (optimisticIndex >= 0) {
            const next = [...prev];
            next[optimisticIndex] = {
              ...message,
              delivery_status: "sent",
            };
            return next;
          }
        }

        if (prev.some((item) => String(item.id) === String(message.id))) {
          return prev;
        }

        return [...prev, message];
      });

      if (conversationId && !isCurrentUserMessage(message, user)) {
        sendSocketEvent({ type: "seen" });
      }
    },
    [applyConversationMessage, applyChannelMessage, markPendingResolved, sendSocketEvent, user]
  );

  const handleSocketPayload = useCallback(
    (payload) => {
      const payloadType = payload.type || "message";

      if (payloadType === "message") {
        handleIncomingMessage(payload.message || payload);
        return;
      }

      if (payloadType === "typing") {
        if (sameUser(payload.sender_id, user?.id)) return;

        const conversationMatch = payload.conversation_id && String(payload.conversation_id) === String(selectedIdRef.current);
        const channelMatch = payload.channel_id && String(payload.channel_id) === String(selectedChannelIdRef.current);

        if (conversationMatch || channelMatch) {
          setTypingUsers((prev) => ({
            ...prev,
            [payload.sender_id]: Boolean(payload.is_typing),
          }));
        }
        return;
      }

      if (payloadType === "presence") {
        if (sameUser(payload.user_id, user?.id)) return;

        setPresence((prev) => ({
          ...prev,
          [payload.user_id]: {
            online: payload.status === "online",
            last_seen: payload.last_seen || new Date().toISOString(),
          },
        }));
        return;
      }

      if (payloadType === "seen") {
        if (sameUser(payload.seen_by, user?.id)) return;

        setMessages((prev) =>
          prev.map((message) =>
            isCurrentUserMessage(message, user)
              ? { ...message, is_seen: true }
              : message
          )
        );
      }
    },
    [handleIncomingMessage, user]
  );

  const closeSocket = useCallback(() => {
    shouldReconnectRef.current = false;

    if (reconnectTimerRef.current) {
      window.clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }

    if (socketRef.current) {
      socketRef.current.onopen = null;
      socketRef.current.onmessage = null;
      socketRef.current.onerror = null;
      socketRef.current.onclose = null;

      if (
        socketRef.current.readyState === WebSocket.OPEN ||
        socketRef.current.readyState === WebSocket.CONNECTING
      ) {
        socketRef.current.close(1000, "Room changed");
      }
    }

    socketRef.current = null;
    setSocketStatus("idle");
  }, []);

  const connectSocket = useCallback(
    (targetId, isChannel = false) => {
      if (!targetId) return;

      const currentSocket = socketRef.current;
      if (
        currentSocket &&
        currentSocket.targetId === targetId &&
        currentSocket.isChannel === isChannel &&
        (currentSocket.readyState === WebSocket.OPEN ||
          currentSocket.readyState === WebSocket.CONNECTING)
      ) {
        return;
      }

      if (currentSocket) {
        currentSocket.onclose = null;
        currentSocket.close(1000, "Switching room");
      }

      shouldReconnectRef.current = true;
      setSocketStatus("connecting");

      const wsUrl = isChannel
        ? `${wsBaseUrl}/ws/chat/group-channel/${targetId}/`
        : `${wsBaseUrl}/ws/chat/${targetId}/`;

      const socket = new WebSocket(wsUrl);
      socket.targetId = targetId;
      socket.isChannel = isChannel;
      socketRef.current = socket;

      socket.onopen = () => {
        reconnectAttemptRef.current = 0;
        setSocketStatus("open");
        setError("");
        if (!isChannel) {
          sendSocketEvent({ type: "seen" });
        }
      };

      socket.onmessage = (event) => {
        try {
          handleSocketPayload(JSON.parse(event.data));
        } catch (socketError) {
          console.error("Invalid chat websocket payload", socketError);
        }
      };

      socket.onerror = () => {
        setSocketStatus("error");
      };

      socket.onclose = () => {
        if (socketRef.current === socket) {
          socketRef.current = null;
        }

        const activeId = isChannel ? selectedChannelIdRef.current : selectedIdRef.current;
        if (!shouldReconnectRef.current || activeId !== targetId) {
          setSocketStatus("idle");
          return;
        }

        const attempt = reconnectAttemptRef.current;
        const delay =
          RECONNECT_DELAYS[Math.min(attempt, RECONNECT_DELAYS.length - 1)];
        reconnectAttemptRef.current = attempt + 1;
        setSocketStatus("reconnecting");

        reconnectTimerRef.current = window.setTimeout(() => {
          const currentActiveId = isChannel ? selectedChannelIdRef.current : selectedIdRef.current;
          if (shouldReconnectRef.current && currentActiveId === targetId) {
            connectSocketRef.current?.(targetId, isChannel);
          }
        }, delay);
      };
    },
    [handleSocketPayload, sendSocketEvent, wsBaseUrl]
  );

  useEffect(() => {
    connectSocketRef.current = connectSocket;
  }, [connectSocket]);

  useEffect(() => {
    let active = true;

    async function loadConversations() {
      setLoadingConversations(true);

      try {
        const response = await api.get("/chat/");
        if (!active) return;
        setConversations(sortConversations(response.data.map(normalizeConversation)));
      } catch (loadError) {
        console.error(loadError);
        if (active) setError("Could not load conversations.");
      } finally {
        if (active) setLoadingConversations(false);
      }
    }

    async function loadChannels() {
      try {
        const response = await api.get("/chat/channels/");
        if (!active) return;
        setChannels(response.data);
      } catch (loadError) {
        console.error("Could not load channels", loadError);
      }
    }

    async function loadProjects() {
      try {
        const response = await api.get("/projects/?pagination=false");
        if (!active) return;
        setProjects(response.data || []);
      } catch (loadError) {
        console.error("Could not load projects", loadError);
      }
    }

    loadConversations();
    loadChannels();
    loadProjects();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    selectedIdRef.current = selected?.id ? String(selected.id) : null;
  }, [selected?.id]);

  useEffect(() => {
    selectedChannelIdRef.current = selectedChannel?.id ? String(selectedChannel.id) : null;
  }, [selectedChannel?.id]);

  useEffect(() => {
    if (!selected?.id && !selectedChannel?.id) {
      const resetTimer = window.setTimeout(() => {
        closeSocket();
        setMessages([]);
      }, 0);

      return () => window.clearTimeout(resetTimer);
    }

    let active = true;
    const isChannel = !!selectedChannel;
    const targetId = isChannel ? String(selectedChannel.id) : String(selected.id);

    async function loadMessages() {
      setLoadingMessages(true);
      setError("");
      setTypingUsers({});

      try {
        const url = isChannel
          ? `/chat/channels/${targetId}/messages/`
          : `/chat/${targetId}/messages/`;
        const response = await api.get(url);
        if (!active) return;
        setMessages(response.data);
        if (!isChannel) {
          setConversations((prev) =>
            prev.map((conversation) =>
              String(conversation.id) === targetId
                ? { ...conversation, unread_count: 0 }
                : conversation
            )
          );
        }
      } catch (loadError) {
        console.error(loadError);
        if (active) setError("Could not load messages.");
      } finally {
        if (active) setLoadingMessages(false);
      }
    }

    document.activeElement?.blur?.();
    loadMessages();
    connectSocket(targetId, isChannel);
    window.setTimeout(() => inputRef.current?.focus(), 120);

    return () => {
      active = false;
      clearTyping();
    };
  }, [clearTyping, closeSocket, connectSocket, selected?.id, selectedChannel?.id]);

  useEffect(() => {
    const pendingTimers = pendingTimersRef.current;

    return () => {
      closeSocket();
      pendingTimers.forEach((timer) => window.clearTimeout(timer));
      pendingTimers.clear();
    };
  }, [closeSocket]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "end",
    });
  }, [messages, typingUsers]);

  useEffect(() => {
    let active = true;
    const peerId = selected?.other_user?.id ? String(selected.other_user.id) : null;

    if (!peerId) {
      const timer = setTimeout(() => {
        if (active) setPeerTasks([]);
      }, 0);
      return () => {
        active = false;
        clearTimeout(timer);
      };
    }

    async function loadPeerTasks() {
      try {
        const projectsRes = await api.get("/projects/?pagination=false");
        if (!active) return;

        let allPeerTasks = [];
        for (const project of projectsRes.data) {
          const res = await api.get(`/tasks/project/${project.id}/?pagination=false`);
          if (!active) return;
          
          const filtered = res.data.filter((task) =>
            task.assigned_users?.some((u) => String(u.id) === peerId)
          ).map((task) => ({
            ...task,
            project_name: project.name,
            project_id: project.id
          }));

          allPeerTasks = [...allPeerTasks, ...filtered];
        }

        if (active) {
          setPeerTasks(allPeerTasks);
          setLoadingPeerTasks(false);
        }
      } catch (err) {
        console.error("Error loading peer tasks", err);
        if (active) setLoadingPeerTasks(false);
      }
    }

    const startTimer = setTimeout(() => {
      if (active) {
        setLoadingPeerTasks(true);
        loadPeerTasks();
      }
    }, 0);

    return () => {
      active = false;
      clearTimeout(startTimer);
    };
  }, [selected?.other_user?.id]);

  const openConversation = (conversation) => {
    setSelected(normalizeConversation(conversation));
    setSelectedChannel(null);
    setDraft("");
  };

  const openChannel = (channel) => {
    setSelectedChannel(channel);
    setSelected(null);
    setDraft("");
  };

  const openNewChat = async () => {
    try {
      const response = await api.get("/chat/users/");
      setMembers(response.data);
      setShowModal(true);
    } catch (modalError) {
      console.error(modalError);
      setError("Could not load team members.");
    }
  };

  const startConversation = async (memberId) => {
    try {
      const response = await api.post("/chat/start/", { user_id: memberId });
      const conversation = normalizeConversation(response.data);

      setShowModal(false);
      setConversations((prev) =>
        sortConversations([
          conversation,
          ...prev.filter((item) => String(item.id) !== String(conversation.id)),
        ])
      );
      openConversation(conversation);
    } catch (startError) {
      console.error(startError);
      setError("Could not start the conversation.");
    }
  };

  const fetchMentionSuggestions = async (q) => {
    try {
      const res = await api.get(`/chat/mentions-search/?q=${encodeURIComponent(q)}`);
      setMentionSuggestions(res.data);
    } catch (err) {
      console.error("Error fetching mentions suggestions", err);
    }
  };

  const handleSelectMention = (suggestion) => {
    const input = inputRef.current;
    if (!input) return;

    const cursorPosition = input.selectionStart;
    const textBeforeCursor = draft.slice(0, cursorPosition);
    const textAfterCursor = draft.slice(cursorPosition);
    const lastAtIdx = textBeforeCursor.lastIndexOf("@");

    if (lastAtIdx === -1) return;

    let mentionTag = "";
    if (suggestion.type === "task") {
      mentionTag = `[task:${suggestion.id}:${suggestion.title}] `;
    } else {
      mentionTag = `[subtask:${suggestion.id}:${suggestion.title}:${suggestion.parent_task_title}] `;
    }

    const newDraft = draft.slice(0, lastAtIdx) + mentionTag + textAfterCursor;
    setDraft(newDraft);
    setShowMentionList(false);
    
    setTimeout(() => {
      input.focus();
      const newCursorPos = lastAtIdx + mentionTag.length;
      input.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  const handleDraftChange = (event) => {
    const value = event.target.value;
    const nextValue = value.slice(0, MAX_MESSAGE_LENGTH);
    setDraft(nextValue);

    const targetId = selectedChannel?.id || selected?.id;
    if (!targetId || socketStatus !== "open") return;

    if (!isTypingRef.current) {
      sendSocketEvent({ type: "typing", is_typing: true });
      isTypingRef.current = true;
    }

    if (typingStopTimerRef.current) {
      window.clearTimeout(typingStopTimerRef.current);
    }

    typingStopTimerRef.current = window.setTimeout(() => {
      sendSocketEvent({ type: "typing", is_typing: false });
      isTypingRef.current = false;
    }, 900);

    // Mentions logic
    const selectionStart = event.target.selectionStart;
    const textBeforeCursor = value.slice(0, selectionStart);
    const lastAtIdx = textBeforeCursor.lastIndexOf("@");
    
    if (lastAtIdx !== -1 && lastAtIdx === textBeforeCursor.length - 1) {
      setShowMentionList(true);
      setMentionQuery("");
      setMentionIndex(0);
      fetchMentionSuggestions("");
    } else if (showMentionList && lastAtIdx !== -1 && lastAtIdx < selectionStart) {
      const query = textBeforeCursor.slice(lastAtIdx + 1);
      if (query.includes(" ")) {
        setShowMentionList(false);
      } else {
        setMentionQuery(query);
        fetchMentionSuggestions(query);
      }
    } else {
      setShowMentionList(false);
    }
  };

  const sendMessage = () => {
    const content = draft.trim();
    const isChannel = !!selectedChannel;
    const targetId = isChannel ? selectedChannel.id : selected?.id;
    if (!content || !targetId) return;

    if (socketStatus !== "open") {
      setError("Reconnecting to chat. Try again in a moment.");
      return;
    }

    const clientId = `client-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const now = new Date().toISOString();
    
    const optimisticMessage = isChannel ? {
      id: clientId,
      client_id: clientId,
      channel: targetId,
      content,
      created_at: now,
      sender_data: {
        id: user?.id,
        name: currentUserName,
        email: user?.email,
        role: user?.role,
        profile_picture: user?.profile_picture,
      },
    } : {
      id: clientId,
      client_id: clientId,
      conversation: targetId,
      content,
      created_at: now,
      is_seen: false,
      delivery_status: "sending",
      sender_data: {
        id: user?.id,
        name: currentUserName,
        email: user?.email,
        role: user?.role,
        profile_picture: user?.profile_picture,
      },
    };

    setMessages((prev) => [...prev, optimisticMessage]);
    
    if (isChannel) {
      applyChannelMessage(optimisticMessage);
    } else {
      applyConversationMessage(optimisticMessage);
    }
    
    setDraft("");
    clearTyping();
    setError("");

    const sent = sendSocketEvent({
      type: "message",
      content,
      client_id: clientId,
    });

    if (!sent) {
      setMessages((prev) =>
        prev.map((message) =>
          message.client_id === clientId
            ? { ...message, delivery_status: "failed" }
            : message
        )
      );
      return;
    }

    const failureTimer = window.setTimeout(() => {
      setMessages((prev) =>
        prev.map((message) =>
          message.client_id === clientId
            ? { ...message, delivery_status: "failed" }
            : message
        )
      );
      pendingTimersRef.current.delete(clientId);
    }, 12000);

    pendingTimersRef.current.set(clientId, failureTimer);
  };

  const handleKeyDown = (event) => {
    if (showMentionList && mentionSuggestions.length > 0) {
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setMentionIndex((prev) => (prev + 1) % mentionSuggestions.length);
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        setMentionIndex((prev) => (prev - 1 + mentionSuggestions.length) % mentionSuggestions.length);
      } else if (event.key === "Enter") {
        event.preventDefault();
        handleSelectMention(mentionSuggestions[mentionIndex]);
      } else if (event.key === "Escape") {
        event.preventDefault();
        setShowMentionList(false);
      }
    } else if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  };

  const handleCreateChannelSubmit = async (e) => {
    e.preventDefault();
    const name = newChannelName.trim();
    if (!name) return;

    try {
      const response = await api.post("/chat/channels/", {
        name,
        description: newChannelDesc,
        project_id: selectedProjectId || null,
      });
      setChannels((prev) => [...prev, response.data]);
      setShowChannelModal(false);
      setNewChannelName("");
      setNewChannelDesc("");
      setSelectedProjectId("");
      openChannel(response.data);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || "Could not create channel.");
    }
  };

  const openInviteModal = async () => {
    if (!selectedChannel) return;
    try {
      const usersResponse = await api.get("/chat/users/");
      setMembers(usersResponse.data || []);

      const membersResponse = await api.get(`/chat/channels/${selectedChannel.id}/members/`);
      setInviteChannelMembers(membersResponse.data || []);
      
      setSelectedInviteUsers([]);
      setInviteQuery("");
      setShowInviteModal(true);
    } catch (err) {
      console.error("Error opening invite modal:", err);
      setError("Could not load channel members.");
    }
  };

  const handleInviteSubmit = async () => {
    if (!selectedChannel || selectedInviteUsers.length === 0) return;
    try {
      await api.post(`/chat/channels/${selectedChannel.id}/invite/`, {
        user_ids: selectedInviteUsers,
      });
      setShowInviteModal(false);
      setSelectedInviteUsers([]);
    } catch (err) {
      console.error("Error inviting members:", err);
      setError(err.response?.data?.message || "Could not invite members.");
    }
  };

  const renderMessageContent = (content) => {
    if (!content) return null;

    const regex = /\[(task|subtask):([a-f0-9-]+):([^\]]+)\]/g;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(content)) !== null) {
      const matchIndex = match.index;

      if (matchIndex > lastIndex) {
        parts.push(content.substring(lastIndex, matchIndex));
      }

      const type = match[1];
      const id = match[2];
      const detailsStr = match[3];

      if (type === "task") {
        parts.push(
          <span
            key={`task-${id}-${matchIndex}`}
            className="cp-mention-link"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/dashboard/tasks/${id}`);
            }}
          >
            @{detailsStr}
          </span>
        );
      } else {
        const [title, parentTitle] = detailsStr.split(":");
        parts.push(
          <span
            key={`subtask-${id}-${matchIndex}`}
            className="cp-mention-link"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/dashboard/tasks/${id}`);
            }}
          >
            @{title} ({parentTitle || "Subtask"})
          </span>
        );
      }

      lastIndex = regex.lastIndex;
    }

    if (lastIndex < content.length) {
      parts.push(content.substring(lastIndex));
    }

    return parts.length > 0 ? parts : content;
  };

  const filteredConversations = conversations.filter((conversation) => {
    const name = conversation.other_user?.name || "";
    return name.toLowerCase().includes(search.toLowerCase());
  });

  const filteredChannels = channels.filter((channel) => {
    return channel.name.toLowerCase().includes(search.toLowerCase());
  });

  const isPeerTyping = peer?.id && typingUsers[peer.id];
  const peerPresence = peer?.id ? presence[peer.id] : null;
  const peerOnline = peerPresence?.online ?? false;

  const currentRoomName = selectedChannel ? `#${selectedChannel.name}` : peer?.name || "Chat Room";

  return (
    <div className="cp-root">
      {/* Column 1: Channels & Conversations List */}
      <aside className="cp-sidebar">
        <div className="cp-sidebar-header">
          <div className="cp-sidebar-title-row">
            <h1>Workspace Chat</h1>
          </div>

          <div className="cp-search-wrap">
            <Search size={16} className="cp-search-icon" />
            <input
              className="cp-search-input"
              placeholder="Search chat or channel..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
        </div>

        <div className="cp-conv-list">
          {/* Channels Section */}
          <div className="cp-section-header">
            <span>Channels</span>
            {user?.role in { admin: true, manager: true } && (
              <button
                type="button"
                className="cp-section-add-btn"
                onClick={() => setShowChannelModal(true)}
                title="Create Group Channel"
              >
                <Plus size={14} />
              </button>
            )}
          </div>

          <div className="cp-channels-sublist">
            {filteredChannels.map((channel) => {
              const isActive = String(selectedChannel?.id) === String(channel.id);
              return (
                <button
                  key={channel.id}
                  type="button"
                  className={`cp-channel-item ${isActive ? "cp-channel-item--active" : ""}`}
                  onClick={() => openChannel(channel)}
                >
                  <Hash size={16} className="cp-channel-hash" />
                  <span className="cp-channel-name">{channel.name}</span>
                </button>
              );
            })}
          </div>

          {/* Direct Messages Section */}
          <div className="cp-section-header">
            <span>Direct Messages</span>
            <button
              type="button"
              className="cp-section-add-btn"
              onClick={openNewChat}
              title="New DM"
            >
              <Plus size={14} />
            </button>
          </div>

          {loadingConversations && (
            <div className="cp-list-state">Loading messages...</div>
          )}

          {!loadingConversations && filteredConversations.length === 0 && filteredChannels.length === 0 && (
            <div className="cp-conv-empty">No conversations yet</div>
          )}

          {filteredConversations.map((conversation) => {
            const otherUser = conversation.other_user;
            const isActive = String(selected?.id) === String(conversation.id);
            const unreadCount = Number(conversation.unread_count || 0);
            const otherPresence = otherUser?.id ? presence[otherUser.id] : null;
            const online = otherPresence?.online ?? false;

            return (
              <button
                key={conversation.id}
                type="button"
                className={`cp-conv-item ${isActive ? "cp-conv-item--active" : ""}`}
                onClick={() => openConversation(conversation)}
              >
                <div className="cp-conv-avatar-wrap">
                  <Avatar
                    name={otherUser?.name}
                    image={otherUser?.profile_picture}
                    size={40}
                  />
                  {online && <span className="cp-online-dot" />}
                </div>

                <div className="cp-conv-body">
                  <div className="cp-conv-row">
                    <span className="cp-conv-name">
                      {otherUser?.name || "Unknown"}
                    </span>
                    <span className="cp-conv-time">
                      {fmtDate(conversation.last_message?.created_at || conversation.updated_at)}
                    </span>
                  </div>

                  <div className="cp-conv-preview-row">
                    <p className="cp-conv-preview">
                      {typingUsers[otherUser?.id]
                        ? "Typing..."
                        : conversation.last_message?.content || "No messages yet"}
                    </p>

                    {unreadCount > 0 && (
                      <span className="cp-unread-badge">
                        {unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </aside>

      {/* Column 2: Chat Thread */}
      <main className="cp-main">
        {selected || selectedChannel ? (
          <div className="cp-chat">
            <header className="cp-chat-header">
              <div className="cp-chat-header-left">
                {selectedChannel ? (
                  <div className="cp-channel-header-avatar">
                    <Hash size={20} />
                  </div>
                ) : (
                  <div className="cp-conv-avatar-wrap">
                    <Avatar
                      name={peer?.name}
                      image={peer?.profile_picture}
                      size={40}
                    />
                    {peerOnline && <span className="cp-online-dot" />}
                  </div>
                )}
                
                <div className="cp-chat-peer-info">
                  <h2 className="cp-chat-peer-name">
                    {currentRoomName}
                  </h2>
                  <span
                    className={`cp-chat-peer-status ${
                      !selectedChannel && peerOnline ? "cp-chat-peer-status--online" : ""
                    }`}
                  >
                    {selectedChannel
                      ? selectedChannel.description || "Group channel room"
                      : isPeerTyping
                        ? "Typing..."
                        : peerOnline
                          ? "Active now"
                          : peerPresence?.last_seen
                            ? `Last seen ${fmtDate(peerPresence.last_seen)}`
                            : "Offline"}
                  </span>
                </div>
              </div>

              <div className="cp-chat-header-actions">
                {!selectedChannel && (
                  <>
                    <button type="button" className="cp-header-btn" title="Voice call">
                      <Phone size={18} />
                    </button>
                    <button type="button" className="cp-header-btn" title="Video call">
                      <Video size={18} />
                    </button>
                    <span className="cp-header-divider" />
                  </>
                )}

                {selectedChannel && !selectedChannel.is_general && !selectedChannel.project && (
                  <button
                    type="button"
                    className="cp-header-btn"
                    onClick={openInviteModal}
                    title="Invite Members to Channel"
                  >
                    <UserPlus size={18} />
                  </button>
                )}
                
                <span className={`cp-connection-pill cp-connection-pill--${socketStatus}`}>
                  {socketStatus === "open"
                    ? "Live"
                    : socketStatus === "reconnecting"
                      ? "Reconnecting"
                      : socketStatus === "connecting"
                        ? "Connecting"
                        : "Offline"}
                </span>

                <button type="button" className="cp-header-btn" title="More options">
                  <MoreVertical size={18} />
                </button>
              </div>
            </header>

            <div className="cp-messages" ref={messagesPaneRef}>
              <div className="cp-messages-inner">
                {loadingMessages && (
                  <div className="cp-messages-state">Loading messages...</div>
                )}

                {!loadingMessages && messages.length > 0 && (
                  <div className="cp-load-more-row">
                    <button type="button" className="cp-load-more-btn" disabled>
                      Beginning of conversation
                    </button>
                  </div>
                )}

                {!loadingMessages && messages.length === 0 && (
                  <div className="cp-messages-empty">
                    <div className="cp-messages-empty-icon">
                      <MessageCircle size={32} />
                    </div>
                    <p>
                      {selectedChannel
                        ? `This is the start of the channel discussion in #${selectedChannel.name}.`
                        : `Start the conversation with ${peer?.name}.`}
                    </p>
                  </div>
                )}

                {messages.map((message, index) => {
                  const mine = isCurrentUserMessage(message, user);
                  const sender = message.sender_data?.name || "User";
                  const previous = messages[index - 1];
                  const showAvatar =
                    !mine &&
                    (!previous ||
                      !sameUser(previous.sender_data?.id, message.sender_data?.id));

                  return (
                    <div
                      key={message.client_id || message.id || index}
                      className={`cp-msg-row ${mine ? "cp-msg-row--mine" : ""}`}
                    >
                      {!mine &&
                        (showAvatar ? (
                          <Avatar
                            name={sender}
                            image={message.sender_data?.profile_picture}
                            size={32}
                            className="cp-msg-ava"
                          />
                        ) : (
                          <div className="cp-msg-ava-gap" />
                        ))}

                      <div className="cp-msg-group">
                        {!mine && showAvatar && (
                          <span className="cp-msg-sender">{sender}</span>
                        )}

                        <div className={`cp-bubble ${mine ? "cp-bubble-outgoing" : "cp-bubble-incoming"}`}>
                          <p className="cp-bubble-text">{renderMessageContent(message.content)}</p>
                        </div>

                        <span className={`cp-msg-time ${mine ? "cp-msg-time--mine" : ""}`}>
                          {fmtTime(message.created_at) || "Just now"}
                          {mine && message.delivery_status === "sending" && (
                            <>
                              <Clock3 size={10} className="cp-pending-icon" />
                              {" "}Sending
                            </>
                          )}
                          {mine && message.delivery_status === "failed" && (
                            <span className="cp-failed-label">{" "}Failed</span>
                          )}
                          {mine && !selectedChannel && !message.delivery_status && (
                            <CheckCheck
                              size={12}
                              className={`cp-read-icon ${
                                message.is_seen ? "cp-read-icon--seen" : ""
                              }`}
                            />
                          )}
                          {mine && message.delivery_status === "sent" && (
                            <CheckCheck size={12} className="cp-read-icon" />
                          )}
                        </span>
                      </div>
                    </div>
                  );
                })}

                {isPeerTyping && (
                  <div className="cp-msg-row">
                    <Avatar
                      name={peer?.name}
                      image={peer?.profile_picture}
                      size={32}
                      className="cp-msg-ava"
                    />
                    <div className="cp-typing-bubble" aria-label="Typing">
                      <span />
                      <span />
                      <span />
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>
            </div>

            {error && <div className="cp-error-line">{error}</div>}

            <div className="cp-input-footer">
              <div className="cp-input-area-wrap">
                {showMentionList && mentionSuggestions.length > 0 && (
                  <div className="cp-mention-dropdown">
                    {mentionSuggestions.map((suggestion, idx) => (
                      <button
                        key={suggestion.id}
                        type="button"
                        className={`cp-mention-item ${mentionIndex === idx ? "cp-mention-item--selected" : ""}`}
                        onClick={() => handleSelectMention(suggestion)}
                      >
                        <span className="cp-mention-display">{suggestion.display}</span>
                      </button>
                    ))}
                  </div>
                )}

                <div className={`cp-input-area ${inputFocused ? "cp-input-area--focused" : ""}`}>
                  <button type="button" className="cp-input-side-btn" title="Attach files">
                    <Plus size={20} />
                  </button>
                  <input
                    ref={inputRef}
                    className="cp-input"
                    placeholder={
                      socketStatus === "open"
                        ? "Type a message, use @ to mention a task or subtask..."
                        : "Connecting to chat..."
                    }
                    value={draft}
                    onChange={handleDraftChange}
                    onKeyDown={handleKeyDown}
                    onFocus={() => setInputFocused(true)}
                    onBlur={() => {
                      setInputFocused(false);
                      // Delayed hiding to allow click actions
                      setTimeout(() => setShowMentionList(false), 200);
                    }}
                    disabled={socketStatus !== "open" && socketStatus !== "reconnecting"}
                  />
                  <button type="button" className="cp-emoji-btn" title="Select emoji">
                    <Smile size={20} />
                  </button>
                  <button
                    type="button"
                    className="cp-send-btn"
                    onClick={sendMessage}
                    disabled={!draft.trim() || socketStatus !== "open"}
                    title="Send message"
                  >
                    <Send size={16} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="cp-welcome">
            <div className="cp-welcome-icon-wrap">
              <MessageCircle size={32} />
            </div>
            <h2 className="cp-welcome-title">Your Workspace Chat</h2>
            <p className="cp-welcome-sub">
              Select a project group channel or a direct message thread to start writing.
            </p>
            <div className="cp-welcome-actions">
              {user?.role in { admin: true, manager: true } && (
                <button type="button" className="cp-welcome-btn" onClick={() => setShowChannelModal(true)}>
                  <Plus size={14} />
                  Create Channel
                </button>
              )}
              <button type="button" className="cp-welcome-btn cp-welcome-btn--secondary" onClick={openNewChat}>
                <MessageCircle size={14} />
                Direct Message
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Column 3: Direct chat information sidebar */}
      {selected && (
        <section className="cp-info-panel">
          <div className="cp-profile-card">
            <div className="cp-profile-avatar-wrap">
              <Avatar
                name={peer?.name}
                image={peer?.profile_picture}
                size={96}
                className="cp-profile-avatar"
              />
              {peerOnline && <span className="cp-profile-online-dot" />}
            </div>
            <h3 className="cp-profile-name">{peer?.name || "Unknown"}</h3>
            <p className="cp-profile-role">{peer?.role || "Team Member"}</p>
            {peer?.email && <p className="cp-profile-email">{peer.email}</p>}
            
            <div className="cp-profile-actions">
              <button 
                type="button" 
                className="cp-profile-btn"
                onClick={() => navigate("/dashboard/team")}
              >
                View Full Team
              </button>
              <button type="button" className="cp-mute-btn">
                Mute Conversation
              </button>
            </div>
          </div>

          <div className="cp-assets-card">
            <div className="cp-assets-header">
              <h4 className="cp-assets-title">Active Tasks ({peerTasks.length})</h4>
              <button 
                type="button" 
                className="cp-assets-view-all"
                onClick={() => navigate("/dashboard/tasks")}
              >
                Board
              </button>
            </div>
            
            <div className="cp-assets-content">
              {loadingPeerTasks && (
                <div className="cp-list-state">Loading tasks...</div>
              )}

              {!loadingPeerTasks && peerTasks.length === 0 && (
                <div className="cp-feed-empty">
                  <p>No active tasks assigned.</p>
                </div>
              )}

              {!loadingPeerTasks && peerTasks.length > 0 && (
                <div className="cp-docs-list">
                  {peerTasks.slice(0, 5).map((task) => {
                    const isUrgent = task.priority === "critical" || task.priority === "high";
                    const isDone = task.status === "done";
                    
                    return (
                      <div 
                        key={task.id} 
                        className="cp-doc-item"
                        onClick={() => navigate(`/dashboard/tasks/${task.id}`)}
                      >
                        <div className={`cp-doc-icon-wrap ${isDone ? "cp-doc-icon-wrap--sky" : isUrgent ? "cp-doc-icon-wrap--apricot" : "cp-doc-icon-wrap--gray"}`}>
                          <FileText size={18} />
                        </div>
                        <div className="cp-doc-info">
                          <p className="cp-doc-name">{task.title}</p>
                          <p className="cp-doc-meta">
                            {task.project_name} • <span className={`cp-task-priority-label cp-task-priority-label--${task.priority}`}>{task.priority}</span>
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {showModal && (
        <NewChatModal
          members={members}
          onStart={startConversation}
          onClose={() => setShowModal(false)}
        />
      )}

      {showChannelModal && (
        <NewChannelModal
          name={newChannelName}
          setName={setNewChannelName}
          desc={newChannelDesc}
          setDesc={setNewChannelDesc}
          projects={projects}
          selectedProjectId={selectedProjectId}
          setSelectedProjectId={setSelectedProjectId}
          onSubmit={handleCreateChannelSubmit}
          onClose={() => setShowChannelModal(false)}
        />
      )}

      {showInviteModal && (
        <InviteChannelModal
          members={members}
          currentMembers={inviteChannelMembers}
          selectedUsers={selectedInviteUsers}
          setSelectedUsers={setSelectedInviteUsers}
          searchQuery={inviteQuery}
          setSearchQuery={setInviteQuery}
          onInvite={handleInviteSubmit}
          onClose={() => setShowInviteModal(false)}
        />
      )}
    </div>
  );
}
