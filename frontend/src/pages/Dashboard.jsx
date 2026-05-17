import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Bot, MessageSquare, Database, Settings, LogOut, ArrowRight, History } from 'lucide-react';
import '../App.css';

const API_URL = 'http://localhost:8000';

export default function Dashboard() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [actions, setActions] = useState([]);
  
  useEffect(() => {
    const user = localStorage.getItem('username');
    if (!user) {
      navigate('/');
    } else {
      setUsername(user);
      fetchActions(user);
    }
  }, [navigate]);

  const fetchActions = async (user) => {
    try {
      const res = await axios.get(`${API_URL}/user/actions?username=${user}`);
      setActions(res.data.actions || []);
    } catch (err) {
      console.error("Failed to fetch actions");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('username');
    navigate('/');
  };

  return (
    <div className="app-container">
      {/* Sidebar for Dashboard */}
      <div className="sidebar glass-panel">
        <div className="brand">
          <Bot size={28} />
          <span>NeuroRAG</span>
        </div>
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '2rem' }}>
          <button className="btn" style={{ background: 'transparent', color: 'var(--text-secondary)', justifyContent: 'flex-start' }} onClick={() => navigate('/chat')}>
            <MessageSquare size={18} /> AI Chat Assistant
          </button>
          <button className="btn" style={{ background: 'rgba(99, 102, 241, 0.15)', color: 'white', justifyContent: 'flex-start', border: '1px solid rgba(99, 102, 241, 0.3)' }}>
            <Database size={18} /> Dashboard Overview
          </button>
        </nav>
        <div style={{ marginTop: 'auto' }}>
          <button className="btn" style={{ background: 'transparent', color: '#ef4444', width: '100%', justifyContent: 'flex-start' }} onClick={handleLogout}>
            <LogOut size={18} /> Sign Out
          </button>
        </div>
      </div>
      
      {/* Main Content */}
      <div className="chat-container" style={{ padding: '3rem', overflowY: 'auto' }}>
        <h1 style={{ marginBottom: '1rem', fontSize: '2.5rem', fontWeight: '700' }}>Welcome Back, {username}</h1>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '3rem', fontSize: '1.1rem' }}>Here is the status of your enterprise AI resources.</p>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem', marginBottom: '3rem' }}>
          <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: '12px', borderLeft: '4px solid #10b981' }}>
            <h3 style={{ color: 'var(--text-secondary)', marginBottom: '1rem', fontSize: '0.9rem', textTransform: 'uppercase' }}>Active Model</h3>
            <div style={{ fontSize: '1.75rem', fontWeight: '600' }}>Mistral (Local)</div>
          </div>
          <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: '12px', borderLeft: '4px solid #6366f1' }}>
            <h3 style={{ color: 'var(--text-secondary)', marginBottom: '1rem', fontSize: '0.9rem', textTransform: 'uppercase' }}>Vector Database</h3>
            <div style={{ fontSize: '1.75rem', fontWeight: '600' }}>FAISS Online</div>
          </div>
          <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: '12px', borderLeft: '4px solid #8b5cf6' }}>
            <h3 style={{ color: 'var(--text-secondary)', marginBottom: '1rem', fontSize: '0.9rem', textTransform: 'uppercase' }}>Recent Actions</h3>
            <div style={{ fontSize: '1.75rem', fontWeight: '600' }}>{actions.length}</div>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '2rem', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <div>
            <h2 style={{ marginBottom: '0.5rem' }}>Ready to interact with your data?</h2>
            <p style={{ color: 'var(--text-secondary)' }}>Launch the AI Chat interface to upload documents and begin extracting insights.</p>
          </div>
          <button className="btn" onClick={() => navigate('/chat')} style={{ padding: '1rem 2rem', fontSize: '1.1rem' }}>
            Start Chat <ArrowRight size={20} />
          </button>
        </div>

        {/* Activity Log */}
        <div>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
            <History size={24} /> Recent Activity
          </h2>
          {actions.length === 0 ? (
            <p style={{ color: 'var(--text-secondary)' }}>No recent activity found.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {actions.map((action, idx) => (
                <div key={idx} className="glass-panel" style={{ padding: '1.25rem', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontWeight: '600', color: action.action_type === 'upload' ? '#10b981' : '#8b5cf6' }}>
                      {action.action_type === 'upload' ? 'File Upload' : 'Chat Query'}
                    </span>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                      {new Date(action.timestamp).toLocaleString()}
                    </span>
                  </div>
                  <div><strong style={{ color: 'var(--text-secondary)' }}>Q:</strong> {action.query}</div>
                  <div><strong style={{ color: 'var(--text-secondary)' }}>A:</strong> {action.response.length > 100 ? action.response.substring(0, 100) + "..." : action.response}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
