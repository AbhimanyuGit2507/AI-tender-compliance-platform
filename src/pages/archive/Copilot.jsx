import { useState, useRef, useEffect } from 'react';
import { Send, FileText, CheckCircle, Zap, Shield, Search, ChevronRight, Paperclip, Loader2, Bot, ArrowUpRight } from 'lucide-react';
import { useOutletContext } from 'react-router-dom';
import { CopilotMarkdown } from '../components/workspace/CopilotMarkdown';

const SUGGESTED_PROMPTS = [
  { text: "What is the EMD amount and bank guarantee requirement?", icon: FileText, color: "blue" },
  { text: "List the similar work experience required", icon: Search, color: "teal" },
  { text: "Are we eligible based on our current profile?", icon: Shield, color: "success" },
  { text: "Generate the technical methodology document", icon: Zap, color: "warning" },
];

export function Copilot() {
  const { showToast } = useOutletContext();
  const [messages, setMessages] = useState([
    {
      id: 1, role: 'ai',
      text: "Hi Rajesh! I've analysed the **MJP Water Pipeline Phase-II** tender. I found **2 red flags** regarding the pipe material specifications, and we need to verify your turnover eligibility.\n\nWhat would you like to do first?",
      actions: [
        { label: 'View Red Flags', action: 'flags' },
        { label: 'Check Turnover Eligibility', action: 'eligibility' }
      ]
    }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  function handleSend(text = input) {
    if (!text.trim()) return;
    
    // Add user message
    setMessages(prev => [...prev, { id: Date.now(), role: 'user', text }]);
    setInput('');
    setIsTyping(true);

    // Mock AI response
    setTimeout(() => {
      setIsTyping(false);
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        role: 'ai',
        text: "Based on Section 4.2 (Eligibility), the bidder must have a minimum average annual turnover of **₹15.00 Cr** in the last 3 financial years.\n\nAccording to your profile (Audited Financials 2024-25), your average is **₹18.20 Cr**. ✅ **You meet this criteria.**",
        citations: [
          { doc: 'RFP_Vol_1.pdf', meta: 'Page 24 · Clause 4.2' },
          { doc: 'Audited Financials 2024-25.pdf', meta: 'Your Evidence Base' }
        ]
      }]);
    }, 1500);
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--color-bg)', overflow: 'hidden' }}>
      
      {/* ── MAIN CHAT AREA ── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '24px 32px' }}>
        <div style={{ maxWidth: 840, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24 }}>
          
          {messages.map(msg => (
            <div key={msg.id} className={`chat-bubble-wrapper ${msg.role}`}>
              <div className={`chat-avatar ${msg.role}`}>
                {msg.role === 'ai' ? <Bot size={16} /> : 'RS'}
              </div>
              
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: msg.role === 'ai' ? 'var(--color-text-secondary)' : 'var(--color-text-primary)', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 8, justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                  {msg.role === 'ai' ? 'BidKaro AI' : 'You'}
                  {msg.role === 'ai' && <span style={{ fontSize: 10, background: 'var(--color-success-subtle)', color: 'var(--color-success)', padding: '2px 6px', borderRadius: 4, letterSpacing: '0.02em' }}>Verified</span>}
                </div>
                
                <div className={`chat-bubble ${msg.role}`} style={{ marginLeft: msg.role === 'user' ? 'auto' : 0 }}>
                  {msg.role === 'ai' ? (
                    <CopilotMarkdown content={msg.text} />
                  ) : (
                    <div style={{ whiteSpace: 'pre-wrap' }}>{msg.text}</div>
                  )}
                  
                  {/* Actions */}
                  {msg.actions && (
                    <div className="chat-bubble-actions">
                      {msg.actions.map(act => (
                        <button key={act.label} className="btn btn-secondary btn-sm" onClick={() => handleSend(act.label)}>
                          {act.label} <ArrowUpRight size={12} />
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Citations */}
                  {msg.citations && (
                    <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
                      {msg.citations.map((c, i) => (
                        <div key={i} className="source-citation" style={{ cursor: 'pointer', padding: '6px 10px' }} onClick={() => showToast && showToast('Opening document...', 'info')}>
                          <div className={`source-citation-icon ${i === 0 ? 'blue' : 'teal'}`} style={{ width: 22, height: 22 }}>
                            <FileText size={10} />
                          </div>
                          <div>
                            <div className="source-citation-doc" style={{ fontSize: 11 }}>{c.doc}</div>
                            <div className="source-citation-meta" style={{ fontSize: 9 }}>{c.meta}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}

          {isTyping && (
            <div className="chat-bubble-wrapper ai">
              <div className="chat-avatar ai"><Bot size={16} /></div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: 6 }}>BidKaro AI</div>
                <div className="chat-bubble ai" style={{ padding: '8px 0' }}>
                  <div className="typing-dots">
                    <div className="typing-dot" />
                    <div className="typing-dot" />
                    <div className="typing-dot" />
                  </div>
                </div>
              </div>
            </div>
          )}
          
          <div ref={endRef} />
        </div>
      </div>

      {/* ── INPUT AREA ── */}
      <div style={{ padding: '0 32px 32px', background: 'linear-gradient(180deg, transparent 0%, var(--color-bg) 20%)' }}>
        <div style={{ maxWidth: 840, margin: '0 auto' }}>
          
          {/* Suggested Prompts */}
          {messages.length === 1 && !isTyping && (
            <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 16, scrollbarWidth: 'none' }}>
              {SUGGESTED_PROMPTS.map((p, i) => {
                const Icon = p.icon;
                return (
                  <button
                    key={i}
                    onClick={() => handleSend(p.text)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      padding: '8px 14px', background: 'var(--color-surface)',
                      border: '1px solid var(--color-border)', borderRadius: 99,
                      fontSize: 12, fontWeight: 500, color: 'var(--color-text-secondary)',
                      whiteSpace: 'nowrap', cursor: 'pointer', transition: 'all 0.15s',
                      boxShadow: 'var(--shadow-xs)'
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--color-blue)'; e.currentTarget.style.color = 'var(--color-blue)'; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--color-border)'; e.currentTarget.style.color = 'var(--color-text-secondary)'; }}
                  >
                    <Icon size={12} color={`var(--color-${p.color})`} />
                    {p.text}
                  </button>
                )
              })}
            </div>
          )}

          {/* Input Box */}
          <div style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border-strong)',
            borderRadius: 16,
            padding: '8px 8px 8px 16px',
            display: 'flex', alignItems: 'flex-end', gap: 10,
            boxShadow: 'var(--shadow-md)',
            transition: 'border-color 0.2s, box-shadow 0.2s',
          }}
            onFocus={e => { e.currentTarget.style.borderColor = 'var(--color-blue)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(37,99,235,0.1)'; }}
            onBlur={e => { e.currentTarget.style.borderColor = 'var(--color-border-strong)'; e.currentTarget.style.boxShadow = 'var(--shadow-md)'; }}
          >
            <button className="btn btn-ghost" style={{ padding: 6, color: 'var(--color-text-tertiary)', marginBottom: 2 }}>
              <Paperclip size={18} />
            </button>
            <textarea
              placeholder="Ask anything about this tender or generate documents..."
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              style={{
                flex: 1, border: 'none', outline: 'none', background: 'transparent',
                fontSize: 14, color: 'var(--color-text-primary)',
                resize: 'none', minHeight: 24, maxHeight: 120, padding: '8px 0',
                lineHeight: 1.5, fontFamily: 'var(--font-body)'
              }}
              rows={1}
            />
            <button
              className="btn btn-primary"
              style={{ width: 36, height: 36, padding: 0, borderRadius: 10, flexShrink: 0, opacity: input.trim() ? 1 : 0.5, pointerEvents: input.trim() ? 'auto' : 'none' }}
              onClick={() => handleSend()}
            >
              <Send size={16} style={{ marginLeft: 2 }} />
            </button>
          </div>
          <div style={{ textAlign: 'center', marginTop: 10, fontSize: 11, color: 'var(--color-text-tertiary)' }}>
            BidKaro AI can make mistakes. Please verify critical requirements.
          </div>
        </div>
      </div>

    </div>
  );
}
