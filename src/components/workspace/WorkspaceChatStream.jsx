import React from 'react';
import {
  AlertTriangle,
  ShieldCheck,
  UploadCloud,
  X,
  Bot,
  ChevronUp,
  ChevronDown,
  CheckCircle2,
  Clock,
  FileText,
  Sparkles,
  Copy,
  Check,
  ThumbsUp,
  ThumbsDown,
  Paperclip,
  Send,
} from 'lucide-react';
import { GeminiThinkingBlock } from './GeminiThinkingBlock';
import { CopilotMarkdown } from './CopilotMarkdown';

export function WorkspaceChatStream({
  chatContainerRef,
  handleChatScroll,
  currentTender,
  transferTenderToVault,
  navigate,
  fileInputRef,
  deleteTender,
  traceOpen,
  setTraceOpen,
  userTurnover,
  availableBidCapacity,
  setVaultModalOpen,
  setCanvasTab,
  resolveTenderBlocker,
  handleSendMessage,
  messages,
  setFocusedClause,
  handleCopyMessage,
  copiedMsgId,
  handleFeedback,
  msgFeedback,
  isTyping,
  activeQuery,
  messagesEndRef,
  chatAttachInputRef,
  handleFileUpload,
  inputPrompt,
  setInputPrompt,
}) {
  return (
    <>
      {/* Scrollable Agent Chat & Timeline Stream */}
      <div
        ref={chatContainerRef}
        onScroll={handleChatScroll}
        className="chat-stream-scrollable"
        style={{
          flex: '1 1 0%',
          height: 0,
          minHeight: 0,
          overflowY: 'auto',
          overflowX: 'hidden',
          padding: '16px 20px',
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
          overscrollBehavior: 'contain',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {currentTender.isInvalidDoc ? (
          <div
            className="glass-pod animate-in"
            style={{
              padding: '16px 18px',
              border: '1px solid #ef4444',
              background: 'rgba(239, 68, 68, 0.04)',
              borderRadius: 10,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 12 }}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 8,
                  background: 'rgba(239, 68, 68, 0.12)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  color: '#ef4444',
                }}
              >
                <AlertTriangle size={20} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                  <span style={{ fontSize: 13.5, fontWeight: 700, color: '#ef4444' }}>
                    Non-Tender Document Detected
                  </span>
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      padding: '2px 7px',
                      borderRadius: 4,
                      background: '#ef4444',
                      color: '#fff',
                      letterSpacing: '0.04em',
                    }}
                  >
                    TRIAGE INTERCEPTED
                  </span>
                </div>
                <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>
                  {currentTender.humanReadableType || 'Personal Identity Document (Aadhaar Card)'}
                </div>
                <p style={{ fontSize: 11.5, color: 'var(--text-secondary)', lineHeight: 1.55, margin: 0 }}>
                  {currentTender.rejectionReason ||
                    'The uploaded file is an Indian Resident Identity Document issued by the Unique Identification Authority of India (UIDAI). BidKaro only analyzes Notices Inviting Tender (NIT), RFPs, and BOQs.'}
                </p>
              </div>
            </div>

            {/* Identified Details Grid */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
                gap: 8,
                padding: '10px 12px',
                background: 'var(--bg-elevated)',
                borderRadius: 6,
                fontSize: 11,
                fontFamily: 'var(--font-mono)',
                marginBottom: 14,
                border: '1px solid var(--border-subtle)',
              }}
            >
              <div>
                <span style={{ color: 'var(--text-tertiary)' }}>Signatory Name: </span>
                <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                  {currentTender.identifiedSubject || 'Authorized Signatory'}
                </span>
              </div>
              <div>
                <span style={{ color: 'var(--text-tertiary)' }}>Issuing Authority: </span>
                <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                  {currentTender.issuingEntity || 'UIDAI'}
                </span>
              </div>
              <div>
                <span style={{ color: 'var(--text-tertiary)' }}>Credits Deducted: </span>
                <span style={{ fontWeight: 700, color: 'var(--status-pass-text)' }}>0 Credits (Free)</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button
                className="btn-agent btn-agent-primary"
                style={{
                  fontSize: 11.5,
                  padding: '7px 14px',
                  background: 'var(--accent-cta)',
                  borderColor: 'var(--accent-cta)',
                  color: '#fff',
                }}
                onClick={async () => {
                  await transferTenderToVault(currentTender.id);
                  navigate('/vault');
                }}
              >
                <ShieldCheck size={13} /> Transfer to Company Vault (Signatory KYC)
              </button>
              <button
                className="btn-agent btn-agent-secondary"
                style={{ fontSize: 11.5, padding: '7px 12px' }}
                onClick={() => fileInputRef.current?.click()}
              >
                <UploadCloud size={13} /> Upload Valid Tender Document
              </button>
              <button
                className="btn-agent btn-agent-secondary"
                style={{ fontSize: 11.5, padding: '7px 12px', color: '#ef4444' }}
                onClick={async () => {
                  await deleteTender(currentTender.id);
                  navigate('/workspace');
                }}
              >
                <X size={13} /> Delete Document
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Agent Reasoning Trace Box */}
            <div className="agent-trace-box" style={{ padding: '10px 14px' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                  userSelect: 'none',
                }}
                onClick={() => setTraceOpen(!traceOpen)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontWeight: 600, color: 'var(--text-primary)', fontSize: 12 }}>
                  <Bot size={14} color="var(--accent-primary)" />
                  <span>AI Verification & Procurement Trace</span>
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 600,
                      padding: '1px 7px',
                      borderRadius: 999,
                      background: 'rgba(16, 185, 129, 0.15)',
                      color: '#10b981',
                      border: '1px solid rgba(16, 185, 129, 0.25)',
                      marginLeft: 4,
                    }}
                  >
                    {currentTender.pipelineStage ? `Stage ${currentTender.pipelineStage} Active` : 'Initialized'}
                  </span>
                </div>
                {traceOpen ? <ChevronUp size={14} color="var(--text-tertiary)" /> : <ChevronDown size={14} color="var(--text-tertiary)" />}
              </div>

              {traceOpen && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8, fontSize: 11.5 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, color: 'var(--text-primary)' }}>
                    <CheckCircle2 size={13} style={{ color: '#10b981', flexShrink: 0 }} />
                    <span>Analyzed tender clauses & extracted technical specifications</span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, color: userTurnover > 0 ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                    {userTurnover > 0 ? (
                      <>
                        <CheckCircle2 size={13} style={{ color: '#10b981', flexShrink: 0 }} />
                        <span>
                          Audited turnover (₹{userTurnover.toFixed(2)} Cr) verified · Bid capacity: ₹{availableBidCapacity.toFixed(2)} Cr
                        </span>
                      </>
                    ) : (
                      <>
                        <Clock size={13} style={{ color: '#f59e0b', flexShrink: 0 }} />
                        <span>
                          Company Vault: 3-year turnover profile pending{' '}
                          <button
                            onClick={() => setVaultModalOpen(true)}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: 'var(--accent-primary)',
                              textDecoration: 'underline',
                              cursor: 'pointer',
                              padding: 0,
                              fontSize: 11.5,
                            }}
                          >
                            (Configure Vault →)
                          </button>
                        </span>
                      </>
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, color: currentTender.hasHardBlocker ? '#ef4444' : 'var(--text-primary)' }}>
                    {currentTender.hasHardBlocker ? (
                      <>
                        <AlertTriangle size={13} style={{ color: '#ef4444', flexShrink: 0 }} />
                        <span>
                          <strong>Eligibility Alert:</strong> {currentTender.blockerSummary || 'Disqualification risk flagged'}
                        </span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 size={13} style={{ color: '#10b981', flexShrink: 0 }} />
                        <span>
                          <strong>Eligibility Check:</strong> Zero critical qualification blockers or debarments detected
                        </span>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Red Flags Radar Summary Card */}
            <div
              className="glass-pod"
              style={{
                padding: 16,
                borderLeft: currentTender.summary?.redFlags?.length ? '3px solid var(--status-warn)' : '3px solid var(--status-pass)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 7,
                    fontWeight: 700,
                    color: currentTender.summary?.redFlags?.length ? 'var(--status-warn-text)' : 'var(--status-pass-text)',
                    fontSize: 13.5,
                  }}
                >
                  {currentTender.summary?.redFlags?.length ? <AlertTriangle size={15} /> : <CheckCircle2 size={15} />}
                  <span>Commercial & Legal Risk Radar ({currentTender.summary?.redFlags?.length || 0})</span>
                </div>
                {currentTender.summary?.redFlags?.length > 0 && (
                  <span className="citation-pill" style={{ fontSize: 11.5, cursor: 'pointer' }} onClick={() => setCanvasTab('pdf')}>
                    Inspect Clauses
                  </span>
                )}
              </div>

              {currentTender.summary?.redFlags && currentTender.summary.redFlags.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {currentTender.summary.redFlags.map((flag, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: '10px 12px',
                        background: 'var(--bg-elevated)',
                        borderRadius: 8,
                        fontSize: 12.5,
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
                        <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{flag.title}</span>
                        <span style={{ fontSize: 11.5, color: 'var(--accent-primary)', fontFamily: 'var(--font-mono)' }}>{flag.clause}</span>
                      </div>
                      <div style={{ color: 'var(--text-secondary)', lineHeight: 1.5 }}>{flag.detail}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ color: 'var(--text-secondary)', fontSize: 12.5, lineHeight: 1.55 }}>
                  Zero critical commercial risks detected. All parsed liquidated damages caps, defect liability periods, and EMD provisions are within standard procurement parameters.
                </div>
              )}
            </div>
          </>
        )}

        {/* Smart Blocker Card */}
        {currentTender.hasHardBlocker && (
          <div
            className="glass-pod"
            style={{
              padding: 14,
              border: '1px solid var(--status-fail-border)',
              background: 'var(--status-fail-bg)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <AlertTriangle size={15} color="var(--status-fail)" />
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--status-fail-text)' }}>
                Eligibility Alert: Disqualification Risk Detected
              </span>
            </div>
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 12, lineHeight: 1.45 }}>
              {currentTender.blockerSummary || 'Disqualification blocker flagged.'}
              <br />
              <strong style={{ color: 'var(--text-primary)' }}>Bid generation paused to protect your budget</strong> until resolved.
            </p>

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button
                className="btn-agent btn-agent-primary"
                style={{ fontSize: 11.5, padding: '5px 11px' }}
                onClick={() => resolveTenderBlocker(currentTender.id)}
              >
                <CheckCircle2 size={13} /> Auto-Verify Requirement in Vault
              </button>
              <button
                className="btn-agent btn-agent-secondary"
                style={{ fontSize: 11.5, padding: '5px 11px' }}
                onClick={() => {
                  handleSendMessage(`Draft formal Pre-Bid Query requesting relaxation on: ${currentTender.blockerSummary || 'this qualification requirement'}`);
                  setCanvasTab('compiler');
                }}
              >
                <FileText size={13} /> Draft Pre-Bid Relaxation
              </button>
            </div>
          </div>
        )}

        {/* Conversational Stream Messages with Gemini Thinking Blocks */}
        {messages.map((msg) => {
          const isAgent = msg.role === 'agent';

          return (
            <div
              key={msg.id}
              className="animate-in"
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 6,
                alignSelf: isAgent ? 'flex-start' : 'flex-end',
                maxWidth: isAgent ? '100%' : '85%',
                width: isAgent ? '100%' : 'auto',
              }}
            >
              {/* Sender Header for AI */}
              {isAgent && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginLeft: 2, marginBottom: 2 }}>
                  <div
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#FFFFFF',
                      boxShadow: '0 2px 8px rgba(249, 115, 22, 0.3)',
                      flexShrink: 0,
                    }}
                  >
                    <Sparkles size={11} />
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>
                    BidKaro Copilot
                  </span>
                  <span
                    style={{
                      fontSize: 9.5,
                      padding: '1px 6px',
                      borderRadius: 4,
                      background: 'rgba(16, 185, 129, 0.1)',
                      color: '#10b981',
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#10b981' }} />
                    Gemini Grounded
                  </span>
                </div>
              )}

              {/* Gemini Thinking Accordion if thought exists */}
              {isAgent && msg.thought && (
                <GeminiThinkingBlock
                  isThinking={false}
                  thought={msg.thought}
                />
              )}

              {/* Message Body Capsule */}
              <div
                style={{
                  padding: isAgent ? '16px 20px' : '12px 18px',
                  borderRadius: isAgent ? '6px 16px 16px 16px' : '16px 16px 6px 16px',
                  background: isAgent ? 'var(--bg-surface)' : 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
                  color: isAgent ? 'var(--text-primary)' : '#FFFFFF',
                  border: isAgent ? '1px solid var(--border-subtle)' : 'none',
                  boxShadow: isAgent ? 'var(--shadow-card)' : '0 4px 14px rgba(249, 115, 22, 0.25)',
                  fontSize: 14,
                  lineHeight: 1.65,
                }}
              >
                {isAgent ? (
                  <CopilotMarkdown
                    content={msg.text}
                    onCitationClick={(cite) => {
                      setCanvasTab('pdf');
                      setFocusedClause(cite);
                    }}
                  />
                ) : (
                  (() => {
                    let textToRender = (msg.text || '').trimStart();
                    return textToRender.split('\n').map((line, lIdx) => (
                      <p key={lIdx} style={{ margin: line.trim() ? '4px 0' : '6px 0' }}>
                        {line}
                      </p>
                    ));
                  })()
                )}

                {/* Citations Bar */}
                {msg.citations && msg.citations.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 12, paddingTop: 10, borderTop: '1px dashed var(--border-subtle)' }}>
                    {msg.citations.map((cite, cIdx) => {
                      const clauseLabel = cite.clause_ref || (cite.clause_number ? `Clause ${cite.clause_number}` : (cite.section_path || 'Clause Evidence'));
                      const pageLabel = cite.page_number ? `· Page ${cite.page_number}` : '';
                      return (
                        <span
                          key={cIdx}
                          className="citation-pill"
                          onClick={() => {
                            setCanvasTab('pdf');
                            setFocusedClause(cite);
                          }}
                          style={{ cursor: 'pointer', fontSize: 11, display: 'inline-flex', alignItems: 'center', gap: 4 }}
                          title={`Jump to ${clauseLabel} on Page ${cite.page_number || 'scan'}`}
                        >
                          📄 {clauseLabel} {pageLabel}
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Action Toolbar for AI message */}
              {isAgent && !msg.isInitialBrief && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 4, marginTop: 1 }}>
                  <button
                    onClick={() => handleCopyMessage(msg.text, msg.id)}
                    className="btn-agent btn-agent-ghost"
                    style={{ fontSize: 10.5, padding: '2px 6px', color: 'var(--text-tertiary)' }}
                    title="Copy response"
                  >
                    {copiedMsgId === msg.id ? (
                      <>
                        <Check size={11} color="var(--status-pass)" /> Copied
                      </>
                    ) : (
                      <>
                        <Copy size={11} /> Copy
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => handleFeedback(msg.id, 'up')}
                    className="btn-agent btn-agent-ghost"
                    style={{
                      fontSize: 10.5,
                      padding: '2px 6px',
                      color: msgFeedback[msg.id] === 'up' ? '#10b981' : 'var(--text-tertiary)',
                    }}
                    title="Helpful response"
                  >
                    <ThumbsUp size={11} />
                  </button>
                  <button
                    onClick={() => handleFeedback(msg.id, 'down')}
                    className="btn-agent btn-agent-ghost"
                    style={{
                      fontSize: 10.5,
                      padding: '2px 6px',
                      color: msgFeedback[msg.id] === 'down' ? '#ef4444' : 'var(--text-tertiary)',
                    }}
                    title="Needs clarification"
                  >
                    <ThumbsDown size={11} />
                  </button>
                </div>
              )}
            </div>
          );
        })}

        {/* Active Gemini Thinking Wait Animation */}
        {isTyping && (
          <div className="animate-in" style={{ display: 'flex', flexDirection: 'column', gap: 6, maxWidth: '100%', width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginLeft: 2 }}>
              <div
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, rgba(99,102,241,0.25) 0%, rgba(139,92,246,0.20) 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#FFFFFF',
                  boxShadow: '0 0 12px rgba(249, 115, 22, 0.4)',
                  flexShrink: 0,
                }}
              >
                <Sparkles size={11} className="gemini-sparkle-spin" />
              </div>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>
                BidKaro Copilot
              </span>
              <span
                style={{
                  fontSize: 9.5,
                  padding: '1px 6px',
                  borderRadius: 4,
                  background: 'rgba(249, 115, 22, 0.1)',
                  color: 'var(--accent-primary)',
                  fontFamily: 'var(--font-mono)',
                  fontWeight: 700,
                }}
              >
                Active Reasoning
              </span>
            </div>

            <GeminiThinkingBlock
              isThinking={true}
              liveQuery={activeQuery}
              tenderTitle={currentTender.title}
            />
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Floating Bottom AI Capsule Prompt Dock */}
      <div
        style={{
          padding: '12px 18px',
          background: 'var(--bg-glass)',
          borderTop: '1px solid var(--border-subtle)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          flexShrink: 0,
        }}
      >
        {/* Quick AI Prompt Chips */}
        <div style={{ display: 'flex', gap: 7, overflowX: 'auto', paddingBottom: 10, scrollbarWidth: 'none' }}>
          <span
            className="ai-prompt-chip"
            onClick={() => handleSendMessage('Check EMD terms and whether MSME/Udyam exemption applies.')}
          >
            🛡️ EMD & MSME Waiver
          </span>
          <span
            className="ai-prompt-chip"
            onClick={() => handleSendMessage('What are the Liquidated Damages caps and delay penalties?')}
          >
            ⚠️ Liquidated Damages Cap
          </span>
          <span
            className="ai-prompt-chip"
            onClick={() => {
              setCanvasTab('telemetry');
              handleSendMessage('Show project experience and financial turnover qualification breakdown.');
            }}
          >
            📊 2AN-B Capacity Solver
          </span>
          <span
            className="ai-prompt-chip"
            onClick={() => {
              setCanvasTab('compiler');
              handleSendMessage('Compile Cover Letter and Non-Blacklisting Affidavit.');
            }}
          >
            📦 Draft Cover 1 Package
          </span>
          <span
            className="ai-prompt-chip"
            onClick={() => {
              setCanvasTab('boq');
              handleSendMessage('Identify the high-value 80/20 cost driver items in the BOQ.');
            }}
          >
            ⚡ High-Value BOQ Drivers
          </span>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="chat-input-capsule"
        >
          <input
            type="file"
            ref={chatAttachInputRef}
            onChange={(e) => handleFileUpload(e.target.files)}
            style={{ display: 'none' }}
            multiple
            accept=".pdf,.doc,.docx,.xls,.xlsx"
          />

          <button
            type="button"
            onClick={() => chatAttachInputRef.current?.click()}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-tertiary)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              padding: '4px 6px',
              borderRadius: 4,
              transition: 'color 120ms ease',
            }}
            title="Attach new tender document, corrigendum, or BOQ to configure actions"
          >
            <Paperclip size={16} />
          </button>

          <div style={{ color: 'var(--accent-primary)', display: 'flex', alignItems: 'center' }}>
            <Sparkles size={16} />
          </div>

          <input
            type="text"
            placeholder="Ask anything about tender clauses, EMD rules, BOQ rates, or compliance..."
            value={inputPrompt}
            onChange={(e) => setInputPrompt(e.target.value)}
            style={{
              flex: 1,
              border: 'none',
              background: 'transparent',
              outline: 'none',
              fontSize: 14,
              color: 'var(--text-primary)',
            }}
          />

          <button
            type="submit"
            disabled={!inputPrompt.trim() || isTyping}
            className={`btn-agent ${inputPrompt.trim() ? 'btn-agent-primary' : 'btn-agent-secondary'}`}
            style={{
              padding: '8px 16px',
              fontSize: 13,
              fontWeight: 600,
              borderRadius: 10,
              transition: 'all 150ms ease',
            }}
          >
            <Send size={14} />
            <span>Ask Copilot</span>
          </button>
        </form>
      </div>
    </>
  );
}
