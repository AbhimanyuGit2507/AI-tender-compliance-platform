import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, Loader, Eye, Download, RefreshCw, FileText, Bot, ArrowLeftRight } from 'lucide-react';

const GEN_STEPS = ['Preparing tender requirements', 'Retrieving company evidence', 'Drafting response', 'Validating requirements'];

const TECH_PROPOSAL_CONTENT = `TECHNICAL METHODOLOGY STATEMENT

Municipal Water Pipeline Phase-II
Maharashtra Jeevan Pradhikaran · MJP/2026/WTP/042

Prepared by: Apex Infra Projects Pvt. Ltd.

1. INTRODUCTION

Apex Infra Projects Pvt. Ltd. (hereinafter referred to as "the Bidder") submits this Technical Methodology Statement in response to the requirements specified under Section 7.0 of the Technical Specifications for the MJP Municipal Water Pipeline Phase-II project.

The Bidder has extensive experience in similar pipeline infrastructure projects, having successfully completed over 3 comparable water supply pipeline projects in Maharashtra, with a total pipeline length exceeding 54 kilometers.

2. PIPELINE INSTALLATION METHODOLOGY

2.1 Pre-Construction Activities
The Bidder shall conduct a detailed topographic survey of the entire pipeline alignment prior to commencement of works. GPS-based survey data shall be used to prepare working drawings, identify utility crossings, and plan trench locations.

2.2 Trench Excavation
Trenches shall be excavated using mechanised excavators with manual excavation at utility crossings. Trench dimensions shall conform to IS:7634 with minimum cover of 0.9m over the crown of the pipe.

2.3 Pipe Installation
HDPE pipes shall be jointed using butt fusion welding equipment with certified operators. DI pipes shall be jointed using push-in type rubber ring joints conforming to IS:8329.

3. PRESSURE TESTING AND COMMISSIONING

3.1 Hydrostatic Pressure Testing (As per IS:3114 and Corrigendum 01)
Following completion of each pipeline section, hydrostatic pressure testing shall be conducted at 1.5 times the design working pressure for a duration of 24 hours, as specified in the revised clause of Corrigendum 01.

The test shall be conducted in sections not exceeding 500m. Any leakage observed shall be immediately rectified and the test repeated.

3.2 Leakage Test
Following successful pressure testing, a leakage test shall be conducted for all pipe materials per IS:3114 requirements.

4. QUALITY CONTROL PLAN

The Bidder's ISO 9001:2015 certified quality management system shall be applied throughout the project. Third-party testing of materials shall be conducted at NABL-accredited laboratories.

5. HSE PLAN

A comprehensive HSE plan shall be implemented including daily toolbox talks, PPE requirements, and traffic management procedures.`;

export function DocumentGenerate({ showToast }) {
  const navigate = useNavigate();
  const [docType, setDocType] = useState('Technical Response');
  const [tone, setTone] = useState('Professional');
  const [length, setLength] = useState('Detailed');
  const [useEvidence, setUseEvidence] = useState(true);
  const [usePrevVersion, setUsePrevVersion] = useState(true);
  const [genState, setGenState] = useState('idle'); // idle | generating | done
  const [genStep, setGenStep] = useState(-1);
  const [showCompare, setShowCompare] = useState(false);

  const startGenerate = () => {
    setGenState('generating');
    setGenStep(0);
    let step = 0;
    const iv = setInterval(() => {
      step++;
      setGenStep(step);
      if (step >= GEN_STEPS.length) {
        clearInterval(iv);
        setTimeout(() => {
          setGenState('done');
          showToast && showToast('Technical Response v2 generated successfully!', 'success');
        }, 400);
      }
    }, 900);
  };

  return (
    <div className="page-content">
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 className="page-title">Generate Document</h1>
          <p className="page-subtitle">Create tender-specific documents using AI and your company evidence.</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-secondary" onClick={() => navigate('/tenders/mjp-water-pipeline/generated')}>View Generated Docs</button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr 300px', gap: 20, height: 'calc(100vh - 240px)' }}>
        {/* LEFT: Requirements & Evidence */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="card" style={{ padding: 0, flex: 0 }}>
            <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--color-border)', background: '#FAFBFC' }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--color-text-tertiary)' }}>Requirement</div>
            </div>
            <div style={{ padding: '12px 14px' }}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Technical Methodology</div>
              <div style={{ fontSize: 12, color: 'var(--color-blue)' }}>Section 7.0 · Page 68</div>
              <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 6, lineHeight: 1.5 }}>Pipeline installation, testing, commissioning and QC plan required.</div>
            </div>
          </div>
          <div className="card" style={{ padding: 0, flex: 1, overflow: 'hidden' }}>
            <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--color-border)', background: '#FAFBFC' }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--color-text-tertiary)' }}>Evidence</div>
            </div>
            <div style={{ padding: '12px 14px', overflowY: 'auto' }}>
              {['Nagpur Water Pipeline Upgrade', 'Pune Municipal Pipeline Network', 'Nashik Water Infrastructure'].map((p, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0', borderBottom: '1px solid var(--color-border)' }}>
                  <CheckCircle size={12} color="var(--color-teal)" />
                  <div style={{ fontSize: 12, fontWeight: 500 }}>{p}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* CENTER: Preview */}
        <div className="card" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--color-border)', background: '#FAFBFC', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontSize: 13, fontWeight: 600 }}>
              {genState === 'done' ? 'Technical Response v2 — Ready for Review' : 'Technical Response v1 — Draft'}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              {genState === 'done' && <button className="btn btn-secondary btn-sm" onClick={() => setShowCompare(true)}><ArrowLeftRight size={12} /> Compare</button>}
              <button className="btn btn-ghost btn-sm"><Download size={12} /></button>
            </div>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px', fontFamily: 'Georgia, serif', fontSize: 13, lineHeight: 1.8, color: 'var(--color-text-primary)', background: 'white' }}>
            {genState === 'idle' && (
              <div style={{ color: 'var(--color-text-secondary)', fontFamily: 'var(--font-body)', fontStyle: 'italic' }}>
                Configure options on the right and click "Generate" to create a document.
              </div>
            )}
            {genState === 'generating' && (
              <div style={{ fontFamily: 'var(--font-body)' }}>
                {GEN_STEPS.map((step, i) => (
                  <div key={i} className="progress-step">
                    <div className={`progress-step-icon ${genStep > i ? 'done' : genStep === i ? 'active' : 'pending'}`}>
                      {genStep > i ? <CheckCircle size={12} /> : genStep === i ? <Loader size={12} className="spin" /> : i + 1}
                    </div>
                    <div className={`progress-step-text ${genStep > i ? 'done' : genStep === i ? 'active' : 'pending'}`}>{step}</div>
                  </div>
                ))}
              </div>
            )}
            {genState === 'done' && (
              <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'Georgia, serif', fontSize: 13, lineHeight: 1.8 }}>{TECH_PROPOSAL_CONTENT}</pre>
            )}
          </div>
        </div>

        {/* RIGHT: Controls */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="card">
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 16 }}>Generate Document</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="form-group">
                <label className="form-label">Document Type</label>
                <select className="form-select" value={docType} onChange={e => setDocType(e.target.value)}>
                  {['Technical Response', 'Company Profile', 'Compliance Matrix', 'OEM Undertaking', 'Project Experience Summary', 'Declaration'].map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Tone</label>
                <select className="form-select" value={tone} onChange={e => setTone(e.target.value)}>
                  {['Professional', 'Formal', 'Technical', 'Concise'].map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Length</label>
                <select className="form-select" value={length} onChange={e => setLength(e.target.value)}>
                  {['Detailed', 'Standard', 'Concise'].map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 13, fontWeight: 500 }}>Use Company Evidence</span>
                <div style={{ width: 40, height: 22, borderRadius: 99, background: useEvidence ? 'var(--color-blue)' : 'var(--color-border)', cursor: 'pointer', position: 'relative', transition: 'background 0.2s' }} onClick={() => setUseEvidence(v => !v)}>
                  <div style={{ width: 16, height: 16, borderRadius: 99, background: 'white', position: 'absolute', top: 3, left: useEvidence ? 21 : 3, transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.15)' }} />
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 13, fontWeight: 500 }}>Use Previous Version</span>
                <div style={{ width: 40, height: 22, borderRadius: 99, background: usePrevVersion ? 'var(--color-blue)' : 'var(--color-border)', cursor: 'pointer', position: 'relative', transition: 'background 0.2s' }} onClick={() => setUsePrevVersion(v => !v)}>
                  <div style={{ width: 16, height: 16, borderRadius: 99, background: 'white', position: 'absolute', top: 3, left: usePrevVersion ? 21 : 3, transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.15)' }} />
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 20 }}>
              <button className="btn btn-primary" onClick={startGenerate} disabled={genState === 'generating'}>
                {genState === 'generating' ? <><Loader size={14} className="spin" /> Generating...</> : genState === 'done' ? <><RefreshCw size={14} /> Generate Version 3</> : 'Generate'}
              </button>
              {genState === 'done' && (
                <>
                  <button className="btn btn-secondary" onClick={() => setShowCompare(true)}><ArrowLeftRight size={14} /> Compare Versions</button>
                  <button className="btn btn-teal" onClick={() => navigate('/tenders/mjp-water-pipeline/compliance')}><CheckCircle size={14} /> Run Compliance Check</button>
                </>
              )}
            </div>
          </div>

          <div className="card" style={{ padding: '14px 16px' }}>
            <div className="ai-indicator" style={{ marginBottom: 10 }}>
              <span className="ai-indicator-dot" />
              BidKaro Intelligence
            </div>
            <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
              This document will be generated using the tender requirements, your company's project evidence, and the specific corrigendum updates.
            </div>
          </div>
        </div>
      </div>

      {/* Compare modal */}
      {showCompare && (
        <div className="modal-overlay" onClick={() => setShowCompare(false)}>
          <div className="modal modal-lg" onClick={e => e.stopPropagation()} style={{ maxWidth: 900, maxHeight: '80vh' }}>
            <div className="modal-header">
              <div className="modal-title">Compare Versions</div>
              <button className="modal-close" onClick={() => setShowCompare(false)}><Eye size={16} /></button>
            </div>
            <div className="modal-body" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
              {['Version 1 — Draft', 'Version 2 — Ready for Review'].map((v, i) => (
                <div key={i}>
                  <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 10, color: i === 1 ? 'var(--color-blue)' : 'var(--color-text-secondary)' }}>{v}</div>
                  <div style={{ fontFamily: 'Georgia, serif', fontSize: 12, lineHeight: 1.7, color: 'var(--color-text-primary)', padding: '16px', background: 'var(--color-bg)', borderRadius: 8, maxHeight: 400, overflowY: 'auto' }}>
                    {i === 0 ? 'Pressure testing shall be conducted at 1.5× working pressure for 2 hours. [Original clause]\n\nQuality control plan to be submitted separately.' : '✦ Pressure testing shall be conducted at 1.5× working pressure for a duration of 24 hours, as per IS:3114 and revised per Corrigendum 01.\n\n✦ Quality control plan (ISO 9001:2015 certified system applied). Third-party testing at NABL-accredited labs.'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
