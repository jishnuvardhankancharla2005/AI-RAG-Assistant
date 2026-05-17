import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { useNavigate, useParams } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import { 
  Bot, Send, Database, User, Cpu, LayoutDashboard, Paperclip, X, FileText, Copy, Check, MessageSquarePlus, MessageSquare, Trash2
} from 'lucide-react';
import '../App.css';

const API_URL = 'http://localhost:8000';

export default function Chat() {
  const navigate = useNavigate();
  const { sessionId } = useParams();
  const [username, setUsername] = useState('guest');
  
  const [sessions, setSessions] = useState([]);
  const [currentSessionId, setCurrentSessionId] = useState(null);
  
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [copiedId, setCopiedId] = useState(null);
  
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  // Initialization
  useEffect(() => {
    const user = localStorage.getItem('username');
    if (!user) {
      navigate('/');
      return;
    } 
    setUsername(user);
    
    const fetchSessions = async () => {
      try {
        const res = await axios.get(`${API_URL}/sessions?username=${user}`);
        // Backend uses session_id, frontend uses id. Map them properly.
        const parsed = res.data.sessions.map(s => ({...s, id: s.session_id})) || [];
        
        if (parsed.length > 0) {
          setSessions(parsed);
          if (sessionId) {
            const session = parsed.find(s => s.id === sessionId);
            if (session) {
              setCurrentSessionId(session.id);
              setMessages(session.messages);
            } else {
              navigate(`/chat/${parsed[0].id}`);
            }
          } else {
            navigate(`/chat/${parsed[0].id}`);
          }
        } else {
          // Prevent infinite loop if URL is empty but we have no sessions
          if (parsed.length === 0) createNewSession(user);
        }
      } catch (err) {
        console.error("Failed to fetch sessions from database", err);
        createNewSession(user);
      }
    };
    
    fetchSessions();
  }, [navigate, sessionId]);

  // Sync messages to session
  useEffect(() => {
    if (!currentSessionId || messages.length === 0) return;
    
    setSessions(prev => {
      let isChanged = false;
      let sessionToSave = null;
      
      const updated = prev.map(s => {
        if (s.id === currentSessionId) {
          isChanged = true;
          let newTitle = s.title;
          if (newTitle === 'New Chat' && messages.length > 1) {
            const firstUserMsg = messages.find(m => m.role === 'user');
            if (firstUserMsg) {
              newTitle = firstUserMsg.content.length > 25 ? firstUserMsg.content.substring(0, 25) + '...' : firstUserMsg.content;
            }
          }
          sessionToSave = { ...s, title: newTitle, messages: messages };
          return sessionToSave;
        }
        return s;
      });
      
      if (isChanged && sessionToSave) {
        axios.post(`${API_URL}/sessions`, {
          username: username,
          session_id: sessionToSave.id,
          title: sessionToSave.title,
          messages: sessionToSave.messages
        }).catch(err => console.error("Failed to sync session to DB", err));
      }
      return updated;
    });
  }, [messages, currentSessionId, username]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const createNewSession = (user) => {
    const newId = Date.now().toString();
    const defaultMsg = [{
      role: 'assistant',
      content: 'Hello! I am your Enterprise AI Assistant. Upload documents to build knowledge, and then ask me anything about them.'
    }];
    const newSession = {
      id: newId,
      title: 'New Chat',
      messages: defaultMsg
    };
    
    setSessions(prev => {
      const updated = [newSession, ...prev];
      return updated;
    });
    
    axios.post(`${API_URL}/sessions`, {
       username: user, 
       session_id: newId, 
       title: 'New Chat', 
       messages: defaultMsg
    }).catch(err => console.error(err));
    
    navigate(`/chat/${newId}`);
  };

  const switchSession = (id) => {
    navigate(`/chat/${id}`);
  };

  const deleteSession = (e, id) => {
    e.stopPropagation();
    
    let remainingSessions = [];
    setSessions(prev => {
      remainingSessions = prev.filter(s => s.id !== id);
      return remainingSessions;
    });
    
    axios.delete(`${API_URL}/sessions/${id}?username=${username}`).catch(err => console.error(err));
    
    if (currentSessionId === id) {
      if (sessions.length > 1) {
        const nextSession = sessions.find(s => s.id !== id);
        navigate(`/chat/${nextSession.id}`);
      } else {
        createNewSession(username);
      }
    }
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    setSelectedFiles(prev => [...prev, ...files]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeFile = (index) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleCopy = (content, idx) => {
    navigator.clipboard.writeText(content);
    setCopiedId(idx);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim() && selectedFiles.length === 0) return;

    let hasUploaded = false;
    let fileNames = [];

    if (selectedFiles.length > 0) {
      setIsTyping(true);
      const formData = new FormData();
      selectedFiles.forEach(f => {
        formData.append('files', f);
        fileNames.push(f.name);
      });
      formData.append('username', username);

      try {
        await axios.post(`${API_URL}/upload`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        hasUploaded = true;
        setMessages(prev => [...prev, { 
          role: 'user', 
          content: `Uploaded files: ${fileNames.join(', ')}`,
          isFileUpload: true 
        }]);
      } catch (err) {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: `Failed to upload files: ${fileNames.join(', ')}`
        }]);
      }
      setSelectedFiles([]); 
      if (!input.trim()) setIsTyping(false);
    }

    if (input.trim()) {
      const userMsg = input;
      setInput('');
      
      // Always add the user's text to the chat
      setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
      
      setIsTyping(true);

      try {
        const historyPayload = messages.filter(m => !m.isFileUpload).slice(-6).map(m => ({ role: m.role, content: m.content }));
        const res = await axios.post(`${API_URL}/chat`, { query: userMsg, username, chat_history: historyPayload });
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: res.data.answer,
          sources: res.data.sources,
          isHallucination: res.data.flagged_hallucination
        }]);
      } catch (err) {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: 'Sorry, I encountered an error connecting to the server.'
        }]);
      } finally {
        setIsTyping(false);
      }
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="app-container">
      {/* Sidebar for Chat History */}
      <div className="sidebar glass-panel" style={{ width: '300px', display: 'flex', flexDirection: 'column' }}>
        <div className="brand" style={{ cursor: 'pointer', marginBottom: '1.5rem' }} onClick={() => navigate('/dashboard')}>
          <Bot size={28} />
          <span>NeuroRAG Core</span>
        </div>
        
        <button className="btn" style={{ background: 'var(--accent-color)', color: 'white', justifyContent: 'center', marginBottom: '1.5rem', width: '100%', borderRadius: '8px' }} onClick={() => createNewSession(username)}>
          <MessageSquarePlus size={18} /> New Chat
        </button>

        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem', paddingRight: '0.5rem' }}>
          {sessions.map(s => (
            <div 
              key={s.id} 
              onClick={() => switchSession(s.id)}
              style={{ 
                padding: '0.75rem', 
                borderRadius: '8px', 
                cursor: 'pointer',
                background: currentSessionId === s.id ? 'rgba(99, 102, 241, 0.2)' : 'transparent',
                border: currentSessionId === s.id ? '1px solid rgba(99, 102, 241, 0.5)' : '1px solid transparent',
                color: currentSessionId === s.id ? 'white' : 'var(--text-secondary)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontSize: '0.9rem',
                transition: 'all 0.2s',
                justifyContent: 'space-between'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', overflow: 'hidden' }}>
                <MessageSquare size={16} style={{ flexShrink: 0 }} />
                <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.title}</span>
              </div>
              <button 
                onClick={(e) => deleteSession(e, s.id)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex' }}
                title="Delete Chat"
                onMouseOver={(e) => e.currentTarget.style.color = '#ef4444'}
                onMouseOut={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
        
        <button className="btn" style={{ background: 'transparent', color: 'var(--text-secondary)', justifyContent: 'flex-start', marginTop: '1rem', border: '1px solid rgba(255,255,255,0.1)' }} onClick={() => navigate('/dashboard')}>
          <LayoutDashboard size={18} /> Back to Dashboard
        </button>
      </div>

      {/* Main Chat Area */}
      <div className="chat-container">
        <div className="chat-header glass-panel">
          <div className="chat-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {sessions.find(s => s.id === currentSessionId)?.title || 'AI Chat Assistant'}
          </div>
          <div className="chat-status">
            <div className="status-dot"></div>
            System Online
          </div>
        </div>

        <div className="chat-messages">
          {messages.map((msg, idx) => (
            <div key={idx} className={`message ${msg.role} ${msg.isFileUpload ? 'file-upload-msg' : ''}`} style={{ position: 'relative' }}>
              {msg.role === 'assistant' && (
                <div className="avatar">
                  <Cpu size={20} color="white" />
                </div>
              )}
              <div className="message-content" style={msg.isFileUpload ? { background: 'rgba(16, 185, 129, 0.1)', borderColor: 'rgba(16, 185, 129, 0.3)' } : {}}>
                {msg.isFileUpload && <Database size={16} style={{ display: 'inline', marginRight: '8px', color: '#10b981' }}/>}
                
                {msg.role === 'assistant' && !msg.isFileUpload ? (
                  <div style={{ paddingRight: '2rem', width: '100%' }}>
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                    
                    {msg.isHallucination && (
                      <div className="hallucination-warning" style={{ marginTop: '1rem', padding: '0.75rem', background: 'rgba(239, 68, 68, 0.1)', borderLeft: '3px solid #ef4444', color: '#fca5a5', fontSize: '0.85rem' }}>
                         ⚠️ Warning: This response may contain information not found in your uploaded documents.
                      </div>
                    )}
                    
                    {msg.sources && msg.sources.length > 0 && (
                      <div className="sources-container" style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px dashed rgba(255, 255, 255, 0.1)' }}>
                        <div className="sources-title" style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>SOURCES:</div>
                        <div>
                          {msg.sources.map((src, i) => (
                            <span key={i} className="source-badge" style={{ background: 'rgba(99, 102, 241, 0.2)', color: '#a5b4fc', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', marginRight: '0.5rem', display: 'inline-block' }}>
                              {src.source || 'Unknown File'}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    <button 
                      onClick={() => handleCopy(msg.content, idx)}
                      style={{ position: 'absolute', top: '1.25rem', right: '1rem', background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
                      title="Copy to clipboard"
                    >
                      {copiedId === idx ? <Check size={16} color="#10b981" /> : <Copy size={16} />}
                    </button>
                  </div>
                ) : (
                  <div style={{ whiteSpace: 'pre-wrap', display: 'inline' }}>{msg.content}</div>
                )}
              </div>
            </div>
          ))}
          {isTyping && (
            <div className="message assistant">
              <div className="avatar">
                <Cpu size={20} color="white" />
              </div>
              <div className="message-content">
                <div className="typing-indicator">
                  <div className="dot"></div>
                  <div className="dot"></div>
                  <div className="dot"></div>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="input-area" style={{ display: 'flex', flexDirection: 'column', padding: '1.5rem 0' }}>
          {selectedFiles.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.75rem', width: '100%', maxWidth: '800px', padding: '0 1rem' }}>
              {selectedFiles.map((file, i) => (
                <div key={i} className="glass-panel" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0.75rem', borderRadius: '8px', fontSize: '0.85rem' }}>
                  <FileText size={16} color="var(--accent-color)" />
                  <span style={{ maxWidth: '150px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{file.name}</span>
                  <button type="button" onClick={() => removeFile(i)} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}

          <form className="input-form" onSubmit={handleSubmit} style={{ display: 'flex', alignItems: 'center', padding: '0.5rem 1rem' }}>
            <button 
              type="button" 
              onClick={() => fileInputRef.current?.click()}
              style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '0.5rem', display: 'flex', alignItems: 'center', transition: '0.2s' }}
              title="Attach files"
            >
              <Paperclip size={20} />
            </button>
            <input 
              type="file" 
              ref={fileInputRef}
              onChange={handleFileSelect} 
              style={{ display: 'none' }} 
              accept=".pdf,.txt"
              multiple
            />
            <textarea
              className="chat-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Message NeuroRAG or attach a file..."
              rows={1}
              style={{ border: 'none', outline: 'none', background: 'transparent', flex: 1, resize: 'none', padding: '0.75rem', minHeight: '40px', maxHeight: '150px' }}
            />
            <button type="submit" className="send-btn" disabled={(!input.trim() && selectedFiles.length === 0) || isTyping}>
              <Send size={20} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
