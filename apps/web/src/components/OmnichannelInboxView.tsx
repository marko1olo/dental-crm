import { useEffect, useState, useRef } from "react";
import { MessageSquare, Phone, Send, Search, UserCircle, CheckCheck } from "lucide-react";
import "./OmnichannelInboxView.css";

export function OmnichannelInboxView() {
  const [chats, setChats] = useState<any[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [inputText, setInputText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/communications/inbox")
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setChats(data);
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (!selectedPatientId) return;
    fetch(`/api/communications/inbox/${selectedPatientId}`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setMessages(data);
        scrollToBottom();
      })
      .catch(console.error);
  }, [selectedPatientId]);

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !selectedPatientId) return;

    try {
      const res = await fetch(`/api/communications/inbox/${selectedPatientId}/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: inputText,
          channel: "whatsapp" // Default channel for MVP
        })
      });
      
      if (res.ok) {
        const newMessage = await res.json();
        setMessages([...messages, newMessage]);
        setInputText("");
        scrollToBottom();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case "whatsapp": return <span className="channel-icon whatsapp">WA</span>;
      case "telegram": return <span className="channel-icon telegram">TG</span>;
      default: return <MessageSquare size={14} />;
    }
  };

  const selectedChat = chats.find(c => c.patientId === selectedPatientId);

  return (
    <div className="inbox-container">
      <div className="inbox-sidebar">
        <div className="inbox-sidebar-header">
          <h2>Сообщения</h2>
          <div className="inbox-search">
            <Search size={16} />
            <input type="text" placeholder="Поиск пациента..." />
          </div>
        </div>
        
        <div className="inbox-chat-list">
          {chats.map(chat => (
            <div 
              key={chat.patientId} 
              className={`inbox-chat-item ${selectedPatientId === chat.patientId ? "active" : ""}`}
              onClick={() => setSelectedPatientId(chat.patientId)}
            >
              <div className="chat-avatar">
                <UserCircle size={36} />
                <div className="chat-channel-badge">{getChannelIcon(chat.channel)}</div>
              </div>
              <div className="chat-preview">
                <div className="chat-preview-header">
                  <span className="chat-name">{chat.patientName || "Неизвестный пациент"}</span>
                  <span className="chat-time">
                    {new Date(chat.createdAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <div className="chat-preview-text">{chat.message}</div>
              </div>
            </div>
          ))}
          {chats.length === 0 && <div className="inbox-empty-state">Нет входящих сообщений</div>}
        </div>
      </div>

      <div className="inbox-main">
        {selectedPatientId ? (
          <>
            <div className="inbox-main-header">
              <div className="header-patient-info">
                <UserCircle size={40} className="text-gray-400" />
                <div>
                  <h3>{selectedChat?.patientName || "Пациент"}</h3>
                  <p className="status-online">Активный диалог</p>
                </div>
              </div>
              <div className="header-actions">
                <button className="icon-btn"><Phone size={20}/></button>
              </div>
            </div>

            <div className="inbox-messages-area">
              {messages.map(msg => {
                const isOutbound = msg.direction === "outbound";
                return (
                  <div key={msg.id} className={`message-bubble ${isOutbound ? "outbound" : "inbound"}`}>
                    <div className="message-content">{msg.message}</div>
                    <div className="message-meta">
                      {new Date(msg.createdAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                      {isOutbound && <CheckCheck size={14} className="message-status" />}
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            <form className="inbox-input-area" onSubmit={handleSend}>
              <button type="button" className="icon-btn attach-btn">+</button>
              <input 
                type="text" 
                placeholder="Введите сообщение..." 
                value={inputText}
                onChange={e => setInputText(e.target.value)}
              />
              <button type="submit" className="send-btn" disabled={!inputText.trim()}>
                <Send size={18} />
              </button>
            </form>
          </>
        ) : (
          <div className="inbox-no-selection">
            <MessageSquare size={64} className="empty-icon" />
            <p>Выберите чат для начала общения</p>
          </div>
        )}
      </div>
    </div>
  );
}
