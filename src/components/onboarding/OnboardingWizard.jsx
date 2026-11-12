import React, { useState, useEffect, useCallback } from 'react';
import {
  X,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  CheckCircle2,
  Building2,
  TrendingUp,
  Upload,
  Sparkles,
  Zap,
  ArrowRight,
  FileText,
  Shield,
  Users,
  SkipForward,
} from 'lucide-react';
import api from '../../services/api';
import { useBidKaroStore } from '../../context/BidKaroStoreContext';

export const BUSINESS_TYPE_CATEGORIES = [
  {
    category: 'Civil & Infrastructure Works',
    options: [
      'Civil Works & Building Construction (Residential / Commercial / Institutional)',
      'Highways, Roads, Expressways & Bridges (NHAI / MoRTH / PWD)',
      'Turnkey EPC Infrastructure Contractor',
      'Water Supply, Sewerage, Drainage & Pipeline Works (PHED / Jal Jeevan Mission)',
      'Irrigation, Dams, Canals & Barrages (Water Resources / CWC)',
      'Railway Track, Signaling & Metro Infrastructure (RVNL / IRCON / DMRC)',
      'Bridges, Flyovers, ROBs & Elevated Corridors',
      'Airports, Runways & Aviation Infrastructure',
      'Ports, Harbors & Marine Works',
      'Earthworks, Excavation, Piling & Foundation Engineering',
      'Structural Steel Fabrication & Erection',
      'Precast Concrete & Modular Construction',
    ],
  },
  {
    category: 'Electrical, Power & Energy',
    options: [
      'Electrical Works — HT/LT Substation & Transmission Lines',
      'Solar PV, Wind & Renewable Energy EPC Contractor',
      'Building Electrification, Internal Wiring & Illumination',
      'Street Lighting, Smart Lighting & High Mast Systems',
      'Diesel Generators (DG Sets), UPS & Backup Power Systems',
      'Hydro / Thermal Power Plant Electrical & Instrumentation',
      'Electric Vehicle (EV) Charging Infrastructure',
    ],
  },
  {
    category: 'Mechanical, HVAC & Industrial Engineering',
    options: [
      'HVAC, Central Air Conditioning & Ventilation Systems',
      'Fire Fighting, Fire Hydrant & Sprinkler Systems',
      'Lifts, Escalators & Elevators Installation & Maintenance',
      'Piping, Boilers, Pressure Vessels & Industrial Utilities',
      'Water Treatment Plants (WTP), Sewage Treatment (STP) & ETP Works',
      'Mining, Heavy Machinery & Earthmoving Equipment Operations',
      'Target & Pivot Poles, Mast Fabrication & Specialized Hardware',
    ],
  },
  {
    category: 'Information Technology, Electronics & Telecom',
    options: [
      'IT Systems Integration, Hardware & Networking (GeM / CPPP)',
      'Software Development, Web Applications & Cloud Services',
      'CCTV, City Surveillance, SCADA & Smart City IoT Solutions',
      'Telecom Infrastructure, OFC Cable Laying & Tower Erection',
      'Audio-Visual, Public Address & Conference Systems',
      'Data Center Infrastructure, Colocation & Managed Services',
      'Biometrics, Access Control, RFID & Security Systems',
    ],
  },
  {
    category: 'Goods, Materials & Equipment Supply',
    options: [
      'Construction Materials Supplier (Cement, TMT Steel, Aggregates, Bitumen)',
      'Pipes & Fittings Supplier (DI, HDPE, GI, MS, PVC)',
      'Electrical Equipment & Cable Manufacturer / Dealer',
      'Medical Equipment, Hospital Furniture & Diagnostic Devices',
      'Pharmaceuticals, Drugs & Surgical Consumables Supplier',
      'Office Furniture, Modular Workstations & Interior Fixtures',
      'Heavy Vehicles, Fleet & Transportation Equipment Supplier',
      'Laboratory Instruments & Scientific Equipment Supplier',
      'General Order Supplier / GeM Registered Merchant Trader',
    ],
  },
  {
    category: 'Facility Management, Operations & Services',
    options: [
      'Integrated Facility Management (IFM) & Housekeeping Services',
      'Security Guarding & Industrial Security Services',
      'Manpower Outsourcing, Skilled Labor & Staffing Services',
      'Solid Waste Management, Door-to-Door Collection & Sanitation',
      'Hospitality, Catering, Canteen & Food Services',
      'Vehicle Hiring, Fleet Logistics & Ambulance Operations',
      'Horticulture, Landscaping & Forest Plantation Works',
    ],
  },
  {
    category: 'Consultancy, Architectural & Technical Services',
    options: [
      'Project Management Consultancy (PMC) & Owner\'s Engineer',
      'Architectural Design, Urban Planning & Master Planning',
      'Structural Engineering & Peer Review Consulting',
      'Geotechnical Investigation, Soil Testing & Material Lab Testing',
      'Topographical, Drone (UAV) & LiDAR Surveying',
      'Environmental Impact Assessment (EIA) & Forest Clearance Consulting',
      'Chartered Engineering & Valuation Services',
    ],
  },
  {
    category: 'Defense, Aerospace & Specialized',
    options: [
      'Defense, Ordnance & Tactical Equipment Supplier',
      'Aviation Spares, MRO & Drone Systems',
      'Disaster Management & Emergency Rescue Equipment',
      'Acoustics, Soundproofing & Auditorium Fit-Out',
      'Specialized Multi-Disciplinary Contractor',
    ],
  },
];

export const INDIAN_REGIONS = [
  'Pan-India',
  'Delhi NCR',
  'Maharashtra (Mumbai / Pune / Nagpur)',
  'Karnataka (Bengaluru / Mysuru)',
  'Gujarat (Ahmedabad / Surat / Vadodara)',
  'Tamil Nadu (Chennai / Coimbatore)',
  'Telangana (Hyderabad)',
  'Uttar Pradesh (Noida / Lucknow / Kanpur)',
  'West Bengal (Kolkata)',
  'Rajasthan (Jaipur / Jodhpur)',
  'Madhya Pradesh (Bhopal / Indore)',
  'Andhra Pradesh (Visakhapatnam / Amaravati)',
  'Punjab & Haryana (Chandigarh)',
  'Odisha (Bhubaneswar)',
  'Bihar & Jharkhand (Patna / Ranchi)',
  'Kerala (Kochi / Thiruvananthapuram)',
  'Assam & North East (Guwahati)',
  'Jammu & Kashmir / Ladakh',
  'Uttarakhand & Himachal Pradesh',
];

const STORAGE_KEY = 'bidkaro_onboarding_state';

// Save / load wizard progress to localStorage so it survives refresh
const saveProgress = (data) => {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch (_) {}
};
const loadProgress = () => {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null'); } catch (_) { return null; }
};
const clearProgress = () => {
  try { localStorage.removeItem(STORAGE_KEY); } catch (_) {}
};

// ─── Step components ──────────────────────────────────────────────────────────

function StepWelcome({ persona, setPersona, onNext }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div
        style={{
          width: 64,
          height: 64,
          borderRadius: '50%',
          background: 'linear-gradient(135deg, rgba(139,92,246,0.2), rgba(6,182,212,0.15))',
          border: '1px solid rgba(139,92,246,0.3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 20px',
        }}
      >
        <Sparkles size={28} color="#8b5cf6" />
      </div>
      <h2
        style={{
          fontFamily: 'var(--font-heading, Cabinet Grotesk, sans-serif)',
          fontSize: 26,
          fontWeight: 900,
          marginBottom: 10,
          letterSpacing: '-0.02em',
        }}
      >
        Welcome to BidKaro
      </h2>
      <p style={{ fontSize: 14, color: 'var(--text-secondary, #94a3b8)', marginBottom: 32, lineHeight: 1.6 }}>
        Let's set up your account in under 2 minutes. Choose how you'd like to get started:
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 28 }}>
        {[
          {
            id: 'explorer',
            icon: <Zap size={18} color="#8b5cf6" />,
            title: 'Quick Explorer',
            desc: "I want to test BidKaro immediately — I'll add company details later.",
            color: '#8b5cf6',
          },
          {
            id: 'manager',
            icon: <Shield size={18} color="#06b6d4" />,
            title: 'Tender Manager',
            desc: "I'm setting up for production — guide me through a complete profile so AI results are accurate from day one.",
            color: '#06b6d4',
          },
        ].map(({ id, icon, title, desc, color }) => (
          <button
            key={id}
            onClick={() => setPersona(id)}
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 14,
              padding: '16px 18px',
              background: persona === id ? `${color}12` : 'rgba(255,255,255,0.02)',
              border: `1px solid ${persona === id ? color + '40' : 'rgba(255,255,255,0.08)'}`,
              borderRadius: 12,
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'all 0.15s ease',
              color: 'inherit',
            }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 9,
                background: persona === id ? `${color}20` : 'rgba(255,255,255,0.05)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              {icon}
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 3 }}>{title}</div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary, #94a3b8)', lineHeight: 1.5 }}>{desc}</div>
            </div>
            {persona === id && (
              <CheckCircle2 size={16} color={color} style={{ marginLeft: 'auto', flexShrink: 0, marginTop: 10 }} />
            )}
          </button>
        ))}
      </div>

      <button
        onClick={onNext}
        disabled={!persona}
        style={{
          width: '100%',
          padding: '13px 20px',
          background: persona ? 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)' : 'rgba(255,255,255,0.05)',
          border: 'none',
          borderRadius: 10,
          color: persona ? '#fff' : '#475569',
          fontSize: 14,
          fontWeight: 700,
          cursor: persona ? 'pointer' : 'not-allowed',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
        }}
      >
        Continue <ChevronRight size={16} />
      </button>
    </div>
  );
}

function StepCompanyBasics({ data, onChange, onNext, onBack, persona }) {
  const { companyName, businessType = '', location = '', gstin = '' } = data;
  const canProceed = companyName?.trim().length > 1;

  // Helper to determine the category for a given businessType
  const getCategoryForType = (val) => {
    if (!val) return 'Civil & Infrastructure Works';
    for (const cat of BUSINESS_TYPE_CATEGORIES) {
      if (cat.options.includes(val)) return cat.category;
    }
    return 'All Sectors';
  };

  const isKnownStandardOption = BUSINESS_TYPE_CATEGORIES.some((c) =>
    c.options.includes(businessType)
  );

  const [selectedCategory, setSelectedCategory] = useState(() => {
    if (!businessType) return 'Civil & Infrastructure Works';
    return getCategoryForType(businessType);
  });

  const [isCustomMode, setIsCustomMode] = useState(() => {
    return Boolean(businessType && !isKnownStandardOption);
  });

  const [customValue, setCustomValue] = useState(() => {
    return !isKnownStandardOption ? businessType : '';
  });

  // Handle Sector / Category Change
  const handleCategoryChange = (newCat) => {
    setSelectedCategory(newCat);
    if (newCat === 'All Sectors') {
      return;
    }
    const catObj = BUSINESS_TYPE_CATEGORIES.find((c) => c.category === newCat);
    if (catObj && catObj.options.length > 0) {
      if (!catObj.options.includes(businessType)) {
        setIsCustomMode(false);
        onChange({ ...data, industrySector: newCat, businessType: catObj.options[0] });
      } else {
        onChange({ ...data, industrySector: newCat });
      }
    }
  };

  // Handle Specific Business Type Change
  const handleTypeChange = (newVal) => {
    if (newVal === '__OTHER__') {
      setIsCustomMode(true);
      onChange({ ...data, businessType: customValue || '' });
    } else {
      setIsCustomMode(false);
      onChange({ ...data, businessType: newVal });
    }
  };

  // Handle Custom Text Change
  const handleCustomChange = (text) => {
    setCustomValue(text);
    onChange({ ...data, businessType: text });
  };

  // Compute active options to show in dropdown
  const activeCategoryObj = BUSINESS_TYPE_CATEGORIES.find((c) => c.category === selectedCategory);
  const activeOptions = activeCategoryObj ? activeCategoryObj.options : [];

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <Building2 size={18} color="#8b5cf6" />
          <h3 style={{ fontSize: 18, fontWeight: 800 }}>Company Basics</h3>
        </div>
        <p style={{ fontSize: 13, color: 'var(--text-secondary, #94a3b8)' }}>
          This lets BidKaro personalise compliance checks to your organisation.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <FormField
          label="Company / Firm Name *"
          placeholder="e.g. Sharma Constructions Pvt Ltd"
          value={companyName}
          onChange={(v) => onChange({ ...data, companyName: v })}
          required
        />

        {/* 1. Industry / Major Sector Dropdown */}
        <SelectField
          label="Industry / Major Sector"
          value={selectedCategory}
          onChange={handleCategoryChange}
          helperText="Filter business specializations"
        >
          <option value="All Sectors" style={{ background: '#1e293b', color: '#f8fafc' }}>
            All Sectors (Browse Full Directory)
          </option>
          {BUSINESS_TYPE_CATEGORIES.map((cat) => (
            <option key={cat.category} value={cat.category} style={{ background: '#1e293b', color: '#f8fafc' }}>
              {cat.category}
            </option>
          ))}
        </SelectField>

        {/* 2. Primary Business Type Dropdown */}
        <SelectField
          label="Primary Business Type *"
          value={isCustomMode ? '__OTHER__' : (businessType || (activeOptions[0] || ''))}
          onChange={handleTypeChange}
          helperText={`${selectedCategory === 'All Sectors' ? 'All' : activeOptions.length} verified options`}
        >
          {selectedCategory === 'All Sectors' ? (
            BUSINESS_TYPE_CATEGORIES.map((cat) => (
              <optgroup key={cat.category} label={cat.category} style={{ background: '#0f172a', color: '#8b5cf6', fontWeight: 700 }}>
                {cat.options.map((opt) => (
                  <option key={opt} value={opt} style={{ background: '#1e293b', color: '#f8fafc', fontWeight: 400 }}>
                    {opt}
                  </option>
                ))}
              </optgroup>
            ))
          ) : (
            activeOptions.map((opt) => (
              <option key={opt} value={opt} style={{ background: '#1e293b', color: '#f8fafc' }}>
                {opt}
              </option>
            ))
          )}
          <option value="__OTHER__" style={{ background: '#1e293b', color: '#8b5cf6', fontWeight: 600 }}>
            + Other (Please specify custom...)
          </option>
        </SelectField>

        {/* 3. Conditional Custom Business Type input */}
        {isCustomMode && (
          <FormField
            label="Specify Custom Business Type"
            placeholder="e.g. Specialized Marine Dredging or Custom Automation"
            value={customValue}
            onChange={handleCustomChange}
            required
          />
        )}

        <FormField
          label="City / Region of Operations"
          placeholder="e.g. Delhi NCR, Maharashtra"
          value={location}
          onChange={(v) => onChange({ ...data, location: v })}
          list="indian-regions-list"
        />
        <datalist id="indian-regions-list">
          {INDIAN_REGIONS.map((reg) => (
            <option key={reg} value={reg} />
          ))}
        </datalist>

        <FormField
          label="GSTIN (optional)"
          placeholder="e.g. 07AABCU9603R1ZX"
          value={gstin}
          onChange={(v) => onChange({ ...data, gstin: v })}
          mono
        />
      </div>

      <StepNav onBack={onBack} onNext={onNext} canNext={canProceed} />
    </div>
  );
}

function StepFinancials({ data, onChange, onNext, onBack }) {
  const { turnoverCr, netWorthCr, solvencyCr, maxProjectCr } = data;

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <TrendingUp size={18} color="#06b6d4" />
          <h3 style={{ fontSize: 18, fontWeight: 800 }}>Financial Fingerprint</h3>
        </div>
        <p style={{ fontSize: 13, color: 'var(--text-secondary, #94a3b8)' }}>
          Used to compute max eligible bid value and check financial qualifications. All figures in
          ₹ Crores (approximate is fine).
        </p>
      </div>

      <div
        style={{
          background: 'rgba(6,182,212,0.06)',
          border: '1px solid rgba(6,182,212,0.15)',
          borderRadius: 10,
          padding: '10px 14px',
          fontSize: 12,
          color: '#67e8f9',
          marginBottom: 18,
        }}
      >
        💡 BidKaro uses CPWD/PWD financial rules: max bid ≈ 2× average annual turnover minus existing commitments.
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <FormField
          label="Avg Annual Turnover (3yr) — ₹ Cr"
          placeholder="e.g. 12"
          value={turnoverCr}
          onChange={(v) => onChange({ ...data, turnoverCr: v })}
          type="number"
        />
        <FormField
          label="Net Worth — ₹ Cr"
          placeholder="e.g. 5"
          value={netWorthCr}
          onChange={(v) => onChange({ ...data, netWorthCr: v })}
          type="number"
        />
        <FormField
          label="Solvency Certificate — ₹ Cr"
          placeholder="e.g. 4"
          value={solvencyCr}
          onChange={(v) => onChange({ ...data, solvencyCr: v })}
          type="number"
        />
        <FormField
          label="Largest Single Project — ₹ Cr"
          placeholder="e.g. 8"
          value={maxProjectCr}
          onChange={(v) => onChange({ ...data, maxProjectCr: v })}
          type="number"
        />
      </div>

      <StepNav onBack={onBack} onNext={onNext} canNext={true} skipLabel="Skip for now" />
    </div>
  );
}

function StepFirstTender({ onNext, onBack, onSkip, onFileSelect, tenderFile, isUploading }) {
  const fileRef = React.useRef(null);
  const [drag, setDrag] = useState(false);

  const handleDrop = (e) => {
    e.preventDefault();
    setDrag(false);
    const f = e.dataTransfer.files[0];
    if (f?.type === 'application/pdf') onFileSelect(f);
  };

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <Sparkles size={18} color="#8b5cf6" />
          <h3 style={{ fontSize: 18, fontWeight: 800 }}>Analyze Your First Tender</h3>
        </div>
        <p style={{ fontSize: 13, color: 'var(--text-secondary, #94a3b8)' }}>
          Upload a tender PDF to see BidKaro in action right now. You can always do this later.
        </p>
      </div>

      <div
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={handleDrop}
        onClick={() => fileRef.current?.click()}
        style={{
          border: `2px dashed ${drag || tenderFile ? '#8b5cf6' : 'rgba(255,255,255,0.12)'}`,
          borderRadius: 14,
          padding: '36px 20px',
          textAlign: 'center',
          cursor: 'pointer',
          background: drag ? 'rgba(139,92,246,0.06)' : tenderFile ? 'rgba(139,92,246,0.04)' : 'rgba(255,255,255,0.02)',
          marginBottom: 20,
          transition: 'all 0.2s',
        }}
      >
        <input ref={fileRef} type="file" accept=".pdf" style={{ display: 'none' }} onChange={(e) => onFileSelect(e.target.files?.[0])} />
        {tenderFile ? (
          <>
            <FileText size={28} color="#8b5cf6" style={{ margin: '0 auto 12px' }} />
            <p style={{ fontSize: 14, fontWeight: 700 }}>{tenderFile.name}</p>
            <p style={{ fontSize: 12, color: 'var(--text-tertiary, #64748b)', marginTop: 4 }}>
              {(tenderFile.size / (1024 * 1024)).toFixed(1)}MB · Click to change
            </p>
          </>
        ) : (
          <>
            <Upload size={28} color="#64748b" style={{ margin: '0 auto 12px' }} />
            <p style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>Drop your tender PDF here</p>
            <p style={{ fontSize: 12, color: 'var(--text-tertiary, #64748b)' }}>PDF only · Max 50MB</p>
          </>
        )}
      </div>

      <div style={{ display: 'flex', gap: 10 }}>
        <button
          onClick={onBack}
          style={{ padding: '11px 16px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: 'var(--text-secondary)', fontSize: 13, cursor: 'pointer' }}
        >
          <ChevronLeft size={15} />
        </button>
        <button
          onClick={onSkip}
          style={{ padding: '11px 16px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, color: 'var(--text-secondary)', fontSize: 13, cursor: 'pointer', flex: 1 }}
        >
          Skip — Go to Workspace
        </button>
        <button
          onClick={onNext}
          disabled={!tenderFile || isUploading}
          style={{
            flex: 2,
            padding: '11px 16px',
            background: tenderFile && !isUploading ? 'linear-gradient(135deg, #8b5cf6, #6d28d9)' : 'rgba(255,255,255,0.05)',
            border: 'none',
            borderRadius: 10,
            color: tenderFile && !isUploading ? '#fff' : '#475569',
            fontSize: 14,
            fontWeight: 700,
            cursor: tenderFile && !isUploading ? 'pointer' : 'not-allowed',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
          }}
        >
          {isUploading ? 'Uploading...' : <>Upload & Analyze <ArrowRight size={15} /></>}
        </button>
      </div>
    </div>
  );
}

// ─── Shared helpers ────────────────────────────────────────────────────────────

function FormField({ label, placeholder, value, onChange, type = 'text', mono = false, required = false, list = undefined }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary, #94a3b8)', marginBottom: 6, letterSpacing: '0.03em' }}>
        {label}
      </label>
      <input
        type={type}
        list={list}
        placeholder={placeholder}
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        style={{
          width: '100%',
          padding: '10px 12px',
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border-strong)',
          borderRadius: 8,
          color: 'var(--text-primary)',
          fontSize: 13,
          fontFamily: mono ? 'monospace' : 'inherit',
          outline: 'none',
          boxSizing: 'border-box',
          transition: 'border-color 0.15s, box-shadow 0.15s',
        }}
        onFocus={(e) => {
          e.target.style.borderColor = '#8b5cf6';
          e.target.style.boxShadow = '0 0 0 3px rgba(139, 92, 246, 0.15)';
        }}
        onBlur={(e) => {
          e.target.style.borderColor = 'var(--border-strong)';
          e.target.style.boxShadow = 'none';
        }}
      />
    </div>
  );
}

function SelectField({ label, value, onChange, children, required = false, helperText }) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary, #94a3b8)', letterSpacing: '0.03em' }}>
          {label}
        </label>
        {helperText && (
          <span style={{ fontSize: 11, color: 'var(--text-tertiary, #64748b)' }}>{helperText}</span>
        )}
      </div>
      <div style={{ position: 'relative' }}>
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required={required}
          style={{
            width: '100%',
            padding: '10px 36px 10px 12px',
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border-strong)',
            borderRadius: 8,
            color: 'var(--text-primary)',
            fontSize: 13,
            outline: 'none',
            boxSizing: 'border-box',
            appearance: 'none',
            WebkitAppearance: 'none',
            cursor: 'pointer',
            transition: 'border-color 0.15s, box-shadow 0.15s',
          }}
          onFocus={(e) => {
            e.target.style.borderColor = '#8b5cf6';
            e.target.style.boxShadow = '0 0 0 3px rgba(139, 92, 246, 0.15)';
          }}
          onBlur={(e) => {
            e.target.style.borderColor = 'var(--border-strong)';
            e.target.style.boxShadow = 'none';
          }}
        >
          {children}
        </select>
        <ChevronDown
          size={15}
          color="var(--text-tertiary, #94a3b8)"
          style={{
            position: 'absolute',
            right: 12,
            top: '50%',
            transform: 'translateY(-50%)',
            pointerEvents: 'none',
          }}
        />
      </div>
    </div>
  );
}

function StepNav({ onBack, onNext, canNext = true, skipLabel }) {
  return (
    <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
      {onBack && (
        <button
          onClick={onBack}
          style={{ padding: '11px 16px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: 'var(--text-secondary)', fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
        >
          <ChevronLeft size={15} /> Back
        </button>
      )}
      {skipLabel && (
        <button
          onClick={onNext}
          style={{ flex: 1, padding: '11px 16px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, color: 'var(--text-secondary)', fontSize: 13, cursor: 'pointer' }}
        >
          {skipLabel}
        </button>
      )}
      <button
        onClick={onNext}
        disabled={!canNext}
        style={{
          flex: skipLabel ? 1 : 'auto',
          padding: '11px 20px',
          background: canNext ? 'linear-gradient(135deg, #8b5cf6, #6d28d9)' : 'rgba(255,255,255,0.05)',
          border: 'none',
          borderRadius: 10,
          color: canNext ? '#fff' : '#475569',
          fontSize: 14,
          fontWeight: 700,
          cursor: canNext ? 'pointer' : 'not-allowed',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          minWidth: 120,
          justifyContent: 'center',
        }}
      >
        Continue <ChevronRight size={15} />
      </button>
    </div>
  );
}

// ─── Progress bar ─────────────────────────────────────────────────────────────

function ProgressBar({ step, total, steps }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
        {steps.map((label, i) => (
          <div
            key={label}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 11,
              fontWeight: i <= step ? 600 : 400,
              color: i < step ? '#22c55e' : i === step ? '#a78bfa' : 'var(--text-tertiary, #64748b)',
            }}
          >
            <div
              style={{
                width: 20,
                height: 20,
                borderRadius: '50%',
                background:
                  i < step
                    ? '#22c55e'
                    : i === step
                    ? 'linear-gradient(135deg, #8b5cf6, #6d28d9)'
                    : 'rgba(255,255,255,0.06)',
                border: i === step ? 'none' : `1px solid ${i < step ? '#22c55e' : 'rgba(255,255,255,0.1)'}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 10,
                fontWeight: 800,
                color: i <= step ? '#fff' : '#475569',
                flexShrink: 0,
              }}
            >
              {i < step ? '✓' : i + 1}
            </div>
            <span style={{ display: 'none' }}>{label}</span>
          </div>
        ))}
      </div>
      <div style={{ height: 3, background: 'rgba(255,255,255,0.06)', borderRadius: 99 }}>
        <div
          style={{
            height: '100%',
            background: 'linear-gradient(90deg, #8b5cf6, #06b6d4)',
            borderRadius: 99,
            width: `${((step) / (total - 1)) * 100}%`,
            transition: 'width 0.4s ease',
          }}
        />
      </div>
    </div>
  );
}

// ─── Main wizard ──────────────────────────────────────────────────────────────

export function OnboardingWizard({ onComplete }) {
  const { updateVaultQuickMetrics, createUploadedTender } = useBidKaroStore();

  // Restore from localStorage
  const saved = loadProgress();
  const [step, setStep] = useState(saved?.step ?? 0);
  const [persona, setPersona] = useState(saved?.persona ?? null);
  const [companyData, setCompanyData] = useState(saved?.companyData ?? { companyName: '', businessType: '', location: '', gstin: '' });
  const [financialData, setFinancialData] = useState(saved?.financialData ?? { turnoverCr: '', netWorthCr: '', solvencyCr: '', maxProjectCr: '' });
  const [tenderFile, setTenderFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  // Compute step list based on persona
  const allSteps = persona === 'explorer'
    ? ['Welcome', 'Basics', 'Tender']
    : ['Welcome', 'Basics', 'Financials', 'Tender'];

  const totalSteps = allSteps.length;

  // Persist progress whenever state changes
  useEffect(() => {
    saveProgress({ step, persona, companyData, financialData });
  }, [step, persona, companyData, financialData]);

  const syncVaultToBackend = useCallback(async () => {
    try {
      // Sync company basics
      if (companyData.companyName) {
        await api.updateCompanyVault({
          company_name: companyData.companyName,
          gstin: companyData.gstin || undefined,
          business_type: companyData.businessType || undefined,
          location: companyData.location || undefined,
        }).catch(() => {});
      }

      // Sync financials
      if (financialData.turnoverCr) {
        updateVaultQuickMetrics({
          turnover3YrAvgCr: Number(financialData.turnoverCr) || 0,
          netWorthCr: Number(financialData.netWorthCr) || 0,
          solvencyCr: Number(financialData.solvencyCr) || 0,
          maxTurnoverACr: Number(financialData.maxProjectCr) || 0,
        });
      }
    } catch (_) {}
  }, [companyData, financialData, updateVaultQuickMetrics]);

  const handleFinalComplete = useCallback(async () => {
    await syncVaultToBackend();
    try { await api.completeOnboarding(); } catch (_) {}
    clearProgress();
    onComplete?.();
  }, [syncVaultToBackend, onComplete]);

  const handleTenderUpload = useCallback(async () => {
    if (!tenderFile) return;
    setIsUploading(true);
    try {
      createUploadedTender(tenderFile);
      await syncVaultToBackend();
      await api.completeOnboarding().catch(() => {});
      clearProgress();
      onComplete?.({ navigateTo: '/dashboard' });
    } catch (_) {
      onComplete?.();
    } finally {
      setIsUploading(false);
    }
  }, [tenderFile, createUploadedTender, syncVaultToBackend, onComplete]);

  const advance = () => setStep((s) => Math.min(s + 1, totalSteps - 1));
  const retreat = () => setStep((s) => Math.max(s - 1, 0));

  // Map step index → component
  const renderStep = () => {
    const stepLabel = allSteps[step];

    if (stepLabel === 'Welcome') {
      return <StepWelcome persona={persona} setPersona={setPersona} onNext={advance} />;
    }
    if (stepLabel === 'Basics') {
      return (
        <StepCompanyBasics
          data={companyData}
          onChange={setCompanyData}
          onNext={advance}
          onBack={retreat}
          persona={persona}
        />
      );
    }
    if (stepLabel === 'Financials') {
      return (
        <StepFinancials
          data={financialData}
          onChange={setFinancialData}
          onNext={advance}
          onBack={retreat}
        />
      );
    }
    if (stepLabel === 'Tender') {
      return (
        <StepFirstTender
          onNext={handleTenderUpload}
          onBack={retreat}
          onSkip={handleFinalComplete}
          onFileSelect={setTenderFile}
          tenderFile={tenderFile}
          isUploading={isUploading}
        />
      );
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(5, 8, 16, 0.72)',
          backdropFilter: 'blur(8px)',
          zIndex: 9000,
        }}
      />

      {/* Modal */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 9001,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 20,
        }}
      >
        <div
          className="modal-card animate-modal"
          style={{
            background: 'var(--bg-surface-solid)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 20,
            padding: '32px 28px',
            maxWidth: 520,
            width: '100%',
            maxHeight: '90vh',
            overflowY: 'auto',
            boxShadow: 'var(--shadow-float)',
            color: 'var(--text-primary)',
            position: 'relative',
          }}
        >
          {/* Glow orb */}
          <div
            style={{
              position: 'absolute',
              top: -40,
              left: '50%',
              transform: 'translateX(-50%)',
              width: 200,
              height: 100,
              borderRadius: '50%',
              background: 'radial-gradient(ellipse, rgba(139,92,246,0.25) 0%, transparent 70%)',
              pointerEvents: 'none',
            }}
          />

          {/* Progress */}
          {step > 0 && (
            <ProgressBar step={step} total={totalSteps} steps={allSteps} />
          )}

          {/* Step content */}
          <div style={{ position: 'relative' }}>{renderStep()}</div>
        </div>
      </div>
    </>
  );
}

export default OnboardingWizard;
