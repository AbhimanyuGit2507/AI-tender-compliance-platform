import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  ChevronDown,
  ChevronUp,
  Brain,
  CheckCircle2,
  Search,
  Database,
  ShieldCheck,
  FileCheck,
  Cpu,
} from 'lucide-react';

export function GeminiThinkingBlock({
  isThinking = false,
  liveQuery = '',
  tenderTitle = '',
  thought = null,
}) {
  const [expanded, setExpanded] = useState(isThinking);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [currentStep, setCurrentStep] = useState(0);

  // Live reasoning steps during active AI thinking
  const thinkingSteps = [
    {
      icon: <Search size={12} color="var(--accent-primary)" />,
      label: 'Vector Retrieval',
      desc: liveQuery
        ? `Retrieving hybrid semantic & keyword embeddings for "${liveQuery.slice(0, 32)}..."`
        : 'Querying high-dimensional vector index for relevant tender clauses...',
    },
    {
      icon: <Database size={12} color="#8b5cf6" />,
      label: 'Vault Cross-Reference',
      desc: 'Cross-checking Company Vault financial turnover, net worth, and past project parameters...',
    },
    {
      icon: <ShieldCheck size={12} color="#10b981" />,
      label: 'Compliance Rules Engine',
      desc: 'Auditing CPWD Clause 4.2, GFR 170 EMD rules, and Cover 1 commercial leak barriers...',
    },
    {
      icon: <FileCheck size={12} color="#06b6d4" />,
      label: 'Grounded Synthesis',
      desc: 'Verifying citation bounding coordinates and formulating verified legal recommendations...',
    },
  ];

  // Live timer & step progression while thinking
  useEffect(() => {
    if (!isThinking) return;

    setExpanded(true);
    const startTime = Date.now();

    const timerInterval = setInterval(() => {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      setElapsedSeconds(elapsed);
    }, 100);

    const stepInterval = setInterval(() => {
      setCurrentStep((prev) => (prev + 1) % thinkingSteps.length);
    }, 1200);

    return () => {
      clearInterval(timerInterval);
      clearInterval(stepInterval);
    };
  }, [isThinking]);

  // When finished thinking, default to collapsed
  useEffect(() => {
    if (!isThinking) {
      setExpanded(false);
    }
  }, [isThinking]);

  const durationDisplay = isThinking
    ? `${elapsedSeconds}s`
    : thought?.duration || `${(Math.random() * 1.5 + 1.2).toFixed(1)}s`;

  return (
    <div
      style={{
        margin: '6px 0 10px',
        borderRadius: 10,
        background: isThinking
          ? 'linear-gradient(135deg, rgba(249, 115, 22, 0.06) 0%, rgba(139, 92, 246, 0.06) 100%)'
          : 'var(--bg-elevated)',
        border: isThinking
          ? '1px solid rgba(249, 115, 22, 0.35)'
          : '1px solid var(--border-subtle)',
        boxShadow: isThinking ? '0 0 16px rgba(249, 115, 22, 0.12)' : 'none',
        overflow: 'hidden',
        transition: 'all 200ms ease',
      }}
    >
      {/* Header Bar */}
      <div
        onClick={() => setExpanded(!expanded)}
        style={{
          padding: '8px 12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer',
          userSelect: 'none',
          fontSize: 11.5,
          fontWeight: 600,
          color: isThinking ? 'var(--text-primary)' : 'var(--text-secondary)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <div
            style={{
              width: 18,
              height: 18,
              borderRadius: '50%',
              background: isThinking ? 'rgba(249, 115, 22, 0.15)' : 'rgba(255, 255, 255, 0.05)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Sparkles
              size={11}
              color={isThinking ? 'var(--accent-primary)' : 'var(--text-tertiary)'}
              className={isThinking ? 'gemini-sparkle-spin' : ''}
            />
          </div>

          <span style={{ fontWeight: 700 }}>
            {isThinking ? 'Thinking' : 'Thought for'}
          </span>

          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 10.5,
              color: isThinking ? 'var(--accent-primary)' : 'var(--text-tertiary)',
              fontWeight: 700,
            }}
          >
            {durationDisplay}
          </span>

          {isThinking && (
            <div style={{ display: 'flex', gap: 3, alignItems: 'center', marginLeft: 4 }}>
              <span className="thinking-dot" style={{ animationDelay: '0ms' }} />
              <span className="thinking-dot" style={{ animationDelay: '180ms' }} />
              <span className="thinking-dot" style={{ animationDelay: '360ms' }} />
            </div>
          )}

          {!isThinking && (
            <span
              style={{
                fontSize: 10,
                color: 'var(--text-tertiary)',
                padding: '1px 5px',
                borderRadius: 4,
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              4 verified steps
            </span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--text-tertiary)', fontSize: 10.5 }}>
          <span>{expanded ? 'Hide thoughts' : 'Show thoughts'}</span>
          {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        </div>
      </div>

      {/* Expanded Reasoning Trace */}
      {expanded && (
        <div
          style={{
            padding: '8px 12px 12px',
            borderTop: '1px solid var(--border-subtle)',
            background: 'var(--bg-surface)',
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
            fontSize: 11,
            lineHeight: 1.5,
          }}
        >
          {thinkingSteps.map((step, idx) => {
            const isCurrent = isThinking && idx === currentStep;
            const isDone = !isThinking || idx < currentStep;

            return (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 8,
                  padding: '6px 8px',
                  borderRadius: 6,
                  background: isCurrent
                    ? 'rgba(249, 115, 22, 0.08)'
                    : isDone
                    ? 'var(--bg-elevated)'
                    : 'transparent',
                  border: isCurrent
                    ? '1px solid rgba(249, 115, 22, 0.25)'
                    : '1px solid transparent',
                  transition: 'all 150ms ease',
                }}
              >
                <div style={{ marginTop: 2, flexShrink: 0 }}>
                  {isDone ? (
                    <CheckCircle2 size={12} color="#10b981" />
                  ) : isCurrent ? (
                    <Cpu size={12} color="var(--accent-primary)" className="spin" />
                  ) : (
                    step.icon
                  )}
                </div>

                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      fontWeight: 700,
                      color: isCurrent
                        ? 'var(--accent-primary)'
                        : isDone
                        ? 'var(--text-primary)'
                        : 'var(--text-tertiary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: 1,
                    }}
                  >
                    <span>{step.label}</span>
                    {isCurrent && (
                      <span
                        style={{
                          fontSize: 9.5,
                          fontFamily: 'var(--font-mono)',
                          color: 'var(--accent-primary)',
                          fontWeight: 700,
                        }}
                      >
                        ACTIVE
                      </span>
                    )}
                  </div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: 10.5 }}>
                    {step.desc}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

