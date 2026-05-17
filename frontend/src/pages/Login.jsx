import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Bot, Key, UserPlus } from 'lucide-react';
import '../App.css';

const API_URL = 'http://localhost:8000';

export default function Login() {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    try {
      const endpoint = isLogin ? '/login' : '/register';
      const res = await axios.post(`${API_URL}${endpoint}`, { username, password });
      
      if (res.status === 200) {
        localStorage.setItem('username', username);
        navigate('/dashboard');
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'An error occurred. Please try again.');
    }
  };

  return (
    <div style={{ display: 'flex', width: '100vw', height: '100vh', alignItems: 'center', justifyContent: 'center' }}>
      <div className="login-container glass-panel" style={{ width: '100%', maxWidth: '400px', padding: '2.5rem', textAlign: 'center', borderRadius: '12px' }}>
        <div className="brand" style={{ justifyContent: 'center', marginBottom: '1.5rem', fontSize: '1.75rem' }}>
          <Bot size={40} />
          <span>NeuroRAG Core</span>
        </div>
        <h2 style={{ marginBottom: '2rem', fontWeight: '500', color: 'var(--text-secondary)' }}>
          {isLogin ? 'Sign in to continue' : 'Create an account'}
        </h2>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={{ position: 'relative' }}>
            <input 
              type="text" 
              placeholder="Username" 
              className="chat-input" 
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              style={{ width: '100%', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '1rem' }}
              required
            />
          </div>
          <div style={{ position: 'relative' }}>
            <input 
              type="password" 
              placeholder="Password" 
              className="chat-input" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{ width: '100%', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '1rem' }}
              required
            />
          </div>
          
          {error && <div style={{ color: '#ef4444', fontSize: '0.85rem' }}>{error}</div>}

          <button type="submit" className="btn" style={{ justifyContent: 'center', marginTop: '1rem', padding: '1rem' }}>
            {isLogin ? <><Key size={18} /> Sign In</> : <><UserPlus size={18} /> Sign Up</>}
          </button>
        </form>
        
        <div style={{ marginTop: '1.5rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
          {isLogin ? "Don't have an account? " : "Already have an account? "}
          <span 
            style={{ color: 'var(--accent-color)', cursor: 'pointer', fontWeight: '600' }}
            onClick={() => { setIsLogin(!isLogin); setError(''); }}
          >
            {isLogin ? "Sign Up" : "Sign In"}
          </span>
        </div>
      </div>
    </div>
  );
}
