import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, FileText, X, CheckCircle, Loader, ArrowRight, File } from 'lucide-react';

const INITIAL_FILES = [
  { name: 'NIT.pdf', size: '2.4 MB', type: 'pdf' },
  { name: 'Technical_Specifications.pdf', size: '12.8 MB', type: 'pdf' },
  { name: 'BOQ.xlsx', size: '1.8 MB', type: 'xlsx' },
  { name: 'Annexures.pdf', size: '9.2 MB', type: 'pdf' },
];

const PROCESSING_STEPS = [
  'Uploading files',
  'Reading documents',
  'Extracting requirements',
  'Building tender intelligence',
  'Indexing company evidence',
  'Tender workspace ready',
];

export function UploadTender({ showToast }) {
  const navigate = useNavigate();
  const fileRef = useRef(null);
  const [files, setFiles] = useState([]);
  const [dragging, setDragging] = useState(false);
  const [stage, setStage] = useState('idle'); // idle | files | processing | done
  const [processStep, setProcessStep] = useState(-1);

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    addFiles();
  };

  const addFiles = () => {
    setFiles(INITIAL_FILES);
    setStage('files');
  };

  const removeFile = (i) => {
    const next = files.filter((_, idx) => idx !== i);
    setFiles(next);
    if (next.length === 0) setStage('idle');
  };

  const startProcessing = () => {
    setStage('processing');
    setProcessStep(0);
    let step = 0;
    const interval = setInterval(() => {
      step++;
      setProcessStep(step);
      if (step >= PROCESSING_STEPS.length - 1) {
        clearInterval(interval);
        setTimeout(() => setStage('done'), 600);
      }
    }, 800);
  };

  const fileIcon = (type) => {
    if (type === 'xlsx') return <span style={{ fontSize: 11, fontWeight: 700, color: '#16A34A', background: '#F0FDF4', padding: '2px 5px', borderRadius: 4 }}>XLS</span>;
    return <span style={{ fontSize: 11, fontWeight: 700, color: '#DC2626', background: '#FEF2F2', padding: '2px 5px', borderRadius: 4 }}>PDF</span>;
  };

  return (
    <div className="page-content">
      <div style={{ maxWidth: 640, margin: '0 auto' }}>
        <div style={{ marginBottom: 40, textAlign: 'center' }}>
          <h1 className="page-title">Start a new tender.</h1>
          <p className="page-subtitle" style={{ marginTop: 8 }}>
            Upload your complete tender package and BidKaro will build your intelligent workspace.
          </p>
        </div>

        {stage === 'idle' && (
          <div
            className="card"
            style={{
              border: `2px dashed ${dragging ? 'var(--color-blue)' : 'var(--color-border)'}`,
              background: dragging ? 'var(--color-blue-subtle)' : 'var(--color-bg)',
              padding: 60,
              textAlign: 'center',
              cursor: 'pointer',
              transition: 'all 0.15s',
              borderRadius: 16,
            }}
            onDragOver={e => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => addFiles()}
          >
            <div style={{ width: 56, height: 56, borderRadius: 16, background: dragging ? 'var(--color-blue-subtle)' : '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', color: dragging ? 'var(--color-blue)' : 'var(--color-text-tertiary)' }}>
              <Upload size={26} />
            </div>
            <div style={{ fontFamily: 'var(--font-heading)', fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Drop your tender package here</div>
            <div style={{ color: 'var(--color-text-secondary)', fontSize: 14, marginBottom: 24 }}>PDF · DOCX · XLSX · ZIP</div>
            <button className="btn btn-primary" onClick={e => { e.stopPropagation(); addFiles(); }}>
              <File size={15} /> Choose Files
            </button>
          </div>
        )}

        {stage === 'files' && (
          <div>
            <div className="card" style={{ marginBottom: 16, padding: 0 }}>
              {files.map((f, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 20px', borderBottom: i < files.length - 1 ? '1px solid var(--color-border)' : 'none' }}>
                  <div style={{ width: 36, height: 36, borderRadius: 8, background: 'var(--color-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {fileIcon(f.type)}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{f.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 1 }}>{f.size}</div>
                  </div>
                  <span className="badge badge-success">Uploaded</span>
                  <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-tertiary)', padding: 4 }} onClick={() => removeFile(i)}>
                    <X size={16} />
                  </button>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <button className="btn btn-secondary" onClick={() => { setFiles([]); setStage('idle'); }}>Cancel</button>
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={startProcessing}>
                Analyze Tender <ArrowRight size={15} />
              </button>
            </div>
          </div>
        )}

        {(stage === 'processing' || stage === 'done') && (
          <div className="card" style={{ padding: 40 }}>
            <div style={{ marginBottom: 28, textAlign: 'center' }}>
              <div style={{ fontFamily: 'var(--font-heading)', fontSize: 20, fontWeight: 700, marginBottom: 6 }}>
                {stage === 'done' ? 'Tender workspace ready!' : 'Analyzing your tender...'}
              </div>
              <div style={{ color: 'var(--color-text-secondary)', fontSize: 14 }}>
                {stage === 'done' ? 'All documents have been processed and indexed.' : 'This usually takes about 30–60 seconds.'}
              </div>
            </div>

            <div style={{ marginBottom: 32 }}>
              {PROCESSING_STEPS.map((step, i) => {
                const isDone = processStep > i || stage === 'done';
                const isActive = processStep === i && stage !== 'done';
                return (
                  <div key={i} className="progress-step">
                    <div className={`progress-step-icon ${isDone ? 'done' : isActive ? 'active' : 'pending'}`}>
                      {isDone ? <CheckCircle size={14} /> : isActive ? <Loader size={14} className="spin" /> : <span style={{ fontSize: 11 }}>{i + 1}</span>}
                    </div>
                    <div className={`progress-step-text ${isDone ? 'done' : isActive ? 'active' : 'pending'}`}>{step}</div>
                  </div>
                );
              })}
            </div>

            {stage === 'done' && (
              <div style={{ textAlign: 'center' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 28 }}>
                  {[{ val: '25', label: 'Requirements Found' }, { val: '7', label: 'Source Documents' }, { val: '18', label: 'Compliant Items' }].map((s, i) => (
                    <div key={i} style={{ textAlign: 'center', padding: '16px 12px', background: 'var(--color-bg)', borderRadius: 10 }}>
                      <div style={{ fontFamily: 'var(--font-heading)', fontSize: 28, fontWeight: 800, color: 'var(--color-blue)' }}>{s.val}</div>
                      <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 4 }}>{s.label}</div>
                    </div>
                  ))}
                </div>
                <button className="btn btn-primary btn-lg" onClick={() => navigate('/tenders/mjp-water-pipeline/overview')}>
                  Open Tender Workspace <ArrowRight size={16} />
                </button>
              </div>
            )}
          </div>
        )}

        {/* Recent uploads */}
        {stage === 'idle' && (
          <div style={{ marginTop: 40 }}>
            <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--color-text-tertiary)', marginBottom: 12 }}>Recent Tenders</div>
            {[{ name: 'Municipal Water Pipeline Phase-II', status: 'Active', date: 'Sep 12, 2026' }, { name: 'Solar Rooftop EPC Package', status: 'Active', date: 'Sep 08, 2026' }].map((t, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: '1px solid var(--color-border)', cursor: 'pointer' }} onClick={() => navigate('/tenders/mjp-water-pipeline/overview')}>
                <FileText size={16} style={{ color: 'var(--color-text-secondary)' }} />
                <div style={{ flex: 1, fontSize: 13, fontWeight: 500 }}>{t.name}</div>
                <span className="badge badge-blue">{t.status}</span>
                <span style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>{t.date}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
