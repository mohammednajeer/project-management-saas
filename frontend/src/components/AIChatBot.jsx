import { useState, useEffect, useRef } from "react";
import { Bot, Send, X, Sparkles, Loader } from "lucide-react";
import api from "../services/api";
import "./AIChatBot.css";

const INITIAL_BOT_MESSAGE = {
  sender: "bot",
  text: "Hello! I am your ProjectFlow AI Workspace Co-pilot. I have live context about your active projects, tasks, and organization issues. How can I help you today?",
  timestamp: new Date()
};

const SUGGESTIONS = [
  "What are my active tasks?",
  "Tell me about active projects in our org.",
  "Are there any open issues I should know about?",
  "How can I balance my workload?"
];

export default function AIChatBot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([INITIAL_BOT_MESSAGE]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      inputRef.current?.focus();
    }
  }, [isOpen, messages]);

  const handleSend = async (textToSend) => {
    const text = textToSend || input.trim();
    if (!text || loading) return;

    // Add user message
    const userMessage = {
      sender: "user",
      text: text,
      timestamp: new Date()
    };
    
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    // Format chat history for Gemini API
    const history = messages
      .slice(1) // exclude initial bot message
      .map((msg) => ({
        role: msg.sender === "user" ? "user" : "model",
        text: msg.text
      }));

    try {
      const res = await api.post("/ai/chat/", {
        message: text,
        history: history
      });

      const botResponse = {
        sender: "bot",
        text: res.data.response || "I couldn't generate a response. Please try again.",
        timestamp: new Date()
      };
      setMessages((prev) => [...prev, botResponse]);
    } catch (err) {
      const errorMessage = {
        sender: "bot",
        text: err.response?.data?.message || "AI Co-pilot is temporarily offline. Please check your connection.",
        timestamp: new Date(),
        isError: true
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const clearChat = () => {
    setMessages([INITIAL_BOT_MESSAGE]);
  };

  return (
    <div className={`ai-bot-wrapper ${isOpen ? "is-open" : ""}`}>
      {/* ── Chat launcher button ── */}
      <button
        type="button"
        className="ai-bot-launcher"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Toggle AI Workspace Assistant"
      >
        {isOpen ? <X size={22} /> : <Sparkles size={22} className="ai-pulse-icon" />}
      </button>

      {/* ── Chat box window ── */}
      {isOpen && (
        <div className="ai-bot-window">
          {/* Header */}
          <header className="ai-bot-header">
            <div className="ai-bot-header-left">
              <span className="ai-bot-header-icon">
                <Bot size={18} />
              </span>
              <div>
                <h3>Workspace Co-pilot</h3>
                <span className="ai-bot-header-status">
                  <span className="ai-status-pulse" />
                  Gemini Active
                </span>
              </div>
            </div>
            <div className="ai-bot-header-right">
              <button
                type="button"
                className="ai-bot-header-clear"
                onClick={clearChat}
                title="Reset conversation"
              >
                Reset
              </button>
              <button
                type="button"
                className="ai-bot-header-close"
                onClick={() => setIsOpen(false)}
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>
          </header>

          {/* Messages Area */}
          <div className="ai-bot-messages">
            {messages.map((msg, index) => (
              <div
                key={index}
                className={`ai-bot-msg-row ${
                  msg.sender === "user" ? "is-user" : "is-bot"
                }`}
              >
                {msg.sender === "bot" && (
                  <span className="ai-bot-bubble-avatar">
                    <Bot size={12} />
                  </span>
                )}
                <div
                  className={`ai-bot-bubble ${
                    msg.isError ? "is-error" : ""
                  }`}
                >
                  <p>{msg.text}</p>
                  <span className="ai-bot-msg-time">
                    {msg.timestamp.toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit"
                    })}
                  </span>
                </div>
              </div>
            ))}
            
            {loading && (
              <div className="ai-bot-msg-row is-bot">
                <span className="ai-bot-bubble-avatar ai-spin">
                  <Loader size={12} />
                </span>
                <div className="ai-bot-bubble is-loading">
                  <span className="ai-dot" />
                  <span className="ai-dot" />
                  <span className="ai-dot" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Suggestions row */}
          {messages.length === 1 && !loading && (
            <div className="ai-bot-suggestions">
              {SUGGESTIONS.map((sug, i) => (
                <button
                  key={i}
                  type="button"
                  className="ai-bot-sug-btn"
                  onClick={() => handleSend(sug)}
                >
                  {sug}
                </button>
              ))}
            </div>
          )}

          {/* Input Area */}
          <footer className="ai-bot-footer">
            <textarea
              ref={inputRef}
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask me anything..."
              disabled={loading}
            />
            <button
              type="button"
              className="ai-bot-send-btn"
              onClick={() => handleSend()}
              disabled={!input.trim() || loading}
              aria-label="Send message"
            >
              <Send size={15} />
            </button>
          </footer>
        </div>
      )}
    </div>
  );
}
