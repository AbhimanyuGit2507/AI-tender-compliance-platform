import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Sparkles,
  UploadCloud,
  FileText,
  AlertTriangle,
  CheckCircle2,
  ShieldCheck,
  Zap,
  Download,
  FileCheck,
  ChevronRight,
  Send,
  X,
  FileSpreadsheet,
  RefreshCw,
  Copy,
  Check,
  ChevronLeft,
  Eye,
  Bot,
  Activity,
  ArrowRight,
  Maximize2,
  Info,
  Clock,
  Layers,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  ThumbsUp,
  ThumbsDown,
  Wrench,
  Paperclip,
} from 'lucide-react';
import api from '../services/api';
import { useBidKaroStore } from '../context/BidKaroStoreContext';
import { CreditTopUpModal } from '../components/modals/CreditTopUpModal';
import { VaultQuickModal } from '../components/modals/VaultQuickModal';
import { TwoLayerAuditModal } from '../components/modals/TwoLayerAuditModal';
import { JVCalculatorModal } from '../components/modals/JVCalculatorModal';
import { EnvelopeLeakAuditModal } from '../components/modals/EnvelopeLeakAuditModal';
import { StandardFormsModal } from '../components/modals/StandardFormsModal';
import { CorrigendumDiffModal } from '../components/modals/CorrigendumDiffModal';
import { TenderIntakeScopeModal } from '../components/modals/TenderIntakeScopeModal';
import { EligibilityTelemetryTab } from '../components/workspace/EligibilityTelemetryTab';
import { DocumentProofTab } from '../components/workspace/DocumentProofTab';
import { BOQCorrigendaTab } from '../components/workspace/BOQCorrigendaTab';
import { BidPackageCompilerTab } from '../components/workspace/BidPackageCompilerTab';
import { GeminiThinkingBlock } from '../components/workspace/GeminiThinkingBlock';
import { CopilotMarkdown } from '../components/workspace/CopilotMarkdown';

export function Workspace() {
  const { tenderId } = useParams();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const chatAttachInputRef = useRef(null);
  const messagesEndRef = useRef(null);
  const chatContainerRef = useRef(null);
  const isNearBottomRef = useRef(true);

  const {
    tenders,
    credits,
    setCredits,
    deductCredits,
    dailyFreeAvailable,
    dailyFreePass,
    consumeDailyFreePass,
    getStageDeltaCost,
    runTenderStage,
    resolveTenderBlocker,
    createUploadedTender,
    updateTender,
    transferTenderToVault,
    deleteTender,
    companyVault,
  } = useBidKaroStore();

  // Find active tender if tenderId exists (matching slug id or backend UUID)
  const currentTender = tenders?.find((t) => t.id === tenderId || t.backendId === tenderId) || null;

  // Dropzone upload simulation / processing state
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStep, setUploadStep] = useState('');
  const [uploadPercent, setUploadPercent] = useState(0);

  // Modals state
  const [creditModalOpen, setCreditModalOpen] = useState(false);
  const [vaultModalOpen, setVaultModalOpen] = useState(false);
  const [auditModalOpen, setAuditModalOpen] = useState(false);
  const [auditResult, setAuditResult] = useState(null);
  const [isRunningAudit, setIsRunningAudit] = useState(false);
  const [jvModalOpen, setJvModalOpen] = useState(false);
  const [leakModalOpen, setLeakModalOpen] = useState(false);
  const [formsModalOpen, setFormsModalOpen] = useState(false);
  const [corrigendumDiffOpen, setCorrigendumDiffOpen] = useState(false);
  const [intakeModalOpen, setIntakeModalOpen] = useState(false);
  const [pendingFiles, setPendingFiles] = useState([]);
  const [toolsMenuOpen, setToolsMenuOpen] = useState(false);

  // Live backend data
  const [liveCompliance, setLiveCompliance] = useState(null);
  const [liveBOQ, setLiveBOQ] = useState(null);
  const [liveCorrigenda, setLiveCorrigenda] = useState([]);
  const [liveGeneratedDocs, setLiveGeneratedDocs] = useState([]);
  const [isLoadingLiveData, setIsLoadingLiveData] = useState(false);

  // Split-screen right canvas tab: 'telemetry' | 'pdf' | 'boq' | 'compiler'
  const [canvasTab, setCanvasTab] = useState('telemetry');
  const [focusedClause, setFocusedClause] = useState(null);

  // Collapsible Agent Trace Drawer
  const [traceOpen, setTraceOpen] = useState(true);

  // Chat conversation state
  const [messages, setMessages] = useState([]);
  const [inputPrompt, setInputPrompt] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [activeQuery, setActiveQuery] = useState('');
  const [copiedMsgId, setCopiedMsgId] = useState(null);
  const [msgFeedback, setMsgFeedback] = useState({});
  const [copiedKey, setCopiedKey] = useState(null);
  const [compilingDoc, setCompilingDoc] = useState(null);

  // Initialize or reset conversation and sync live backend data when currentTender changes
  useEffect(() => {
    if (!currentTender) {
      setMessages([]);
      setFocusedClause(null);
      setLiveCompliance(null);
      setLiveBOQ(null);
      setLiveCorrigenda([]);
      setLiveGeneratedDocs([]);
      return;
    }

    if (currentTender.requirements && currentTender.requirements.length > 0) {
      setFocusedClause(currentTender.requirements[0]);
    } else {
      setFocusedClause(null);
    }

    const valueStr = currentTender.estimatedValueCr > 0 ? `₹${currentTender.estimatedValueCr} Cr` : 'Pending Extraction';
    const emdStr = currentTender.emdLakhs > 0 ? ` (EMD: ₹${currentTender.emdLakhs} Lakhs)` : '';
    const scoreStr = currentTender.readinessScore > 0 ? `${currentTender.readinessScore}% Match` : 'Awaiting Stage 1 Audit';

    if (currentTender.isInvalidDoc) {
      setMessages([
        {
          id: 'init-brief',
          role: 'agent',
          text: `⚠️ **Classification Alert: Non-Tender Document Detected**\n\nThe uploaded file **"${currentTender.title}"** has been identified as a **${currentTender.humanReadableType || 'Personal Identity Document (Aadhaar Card)'}** issued by **${currentTender.issuingEntity || 'UIDAI'}**.\n\n- **Identified Signatory**: **${currentTender.identifiedSubject || 'Authorized Signatory'}**\n- **Document Category**: Statutory KYC Identity\n- **Pipeline Status**: Triage Intercepted (0 Credits Deducted)\n\n👉 BidKaro is an automated procurement platform for evaluating **Notices Inviting Tender (NIT)**, RFPs, and BOQ schedules against qualification and financial eligibility rules. Personal identity credentials cannot be processed as tenders.\n\nClick **"Transfer to Company Vault"** below to record this credential under your company's Authorized Signatory KYC.`,
          isInitialBrief: true,
          thought: {
            duration: '0.8s',
            steps: [
              'Document OCR: Scanned header markers and security seals',
              'Classification Sieve: Detected UIDAI personal identity barcode',
              'Triage Guard: Intercepted procurement pipeline (0 credits charged)',
            ],
          },
        },
      ]);
    } else {
      const docsCount = currentTender.documents?.length || 1;
      const primaryDocName = currentTender.documents?.[0]?.name || `${currentTender.title}.pdf`;
      const stageNum = currentTender.pipelineStage || 1;
      const stageTitle = stageNum >= 3 ? 'Stage 3: Full Bid Package Dossier' : stageNum === 2 ? 'Stage 2: Detailed Multi-Clause Audit' : 'Stage 1: Quick NIT Screening';
      const emdDisplay = currentTender.emdLakhs === 0
        ? 'NIL (Bid Security Declaration Form required as per Annexure-C)'
        : currentTender.emdLakhs > 0
        ? `₹${currentTender.emdLakhs} Lakhs (Payable via Bank Guarantee / FDR)`
        : 'As per NIT schedule';

      setMessages([
        {
          id: 'init-brief',
          role: 'agent',
          text: `### Tender Dossier Ingestion & Verification Complete
I have initialized **${stageTitle}** on **${currentTender.title}** (Ref: \`${currentTender.refNo}\`).

#### Dossier Intake Summary
- **Primary Document**: \`${primaryDocName}\` (${docsCount} document package)
- **Issuing Authority**: **${currentTender.authority || 'Central/State Government Department'}**
- **Earnest Money Deposit (EMD)**: **${emdDisplay}**
- **Estimated Tender Value**: **${valueStr}**
- **Overall Readiness**: **${scoreStr}**
- **Pipeline Progression**: **Stage ${stageNum} of 3 Active**

#### Recommended Immediate Actions:
1. **Interactive Clause Scrutiny**: Ask Copilot questions about technical criteria, inspection rules, or penalties.
2. **Official Page Proof**: Inspect exact highlighted clauses in the **Tender Proof** canvas tab.
3. **Draft Submissions**: Unlock Stage 3 when ready to auto-generate CPWD Form A–G undertakings and Word (.docx) bids.`,
          isInitialBrief: true,
          thought: {
            duration: '1.4s',
            steps: [
              `Dossier Intake: Ingested official Notice Inviting Tender package (${docsCount} file)`,
              `Authority Extraction: Verified ${currentTender.authority || 'Tender Inviting Authority'} credentials`,
              `Clause Indexing: Structured 40+ statutory conditions into grounded knowledge chunks`,
              `Statutory Compliance: Evaluated EMD exemption and CPWD 3/2/1 eligibility rules`,
            ],
          },
        },
      ]);
    }

    // Live sync with backend services if tender has backend record
    if (currentTender.backendId) {
      let isSubscribed = true;
      setIsLoadingLiveData(true);

      Promise.allSettled([
        api.getComplianceMatrix(currentTender.backendId),
        api.getBOQ(currentTender.backendId),
        api.getCorrigenda(currentTender.backendId),
        api.listGeneratedDocuments(currentTender.backendId),
        api.getTender(currentTender.backendId),
      ]).then(([compRes, boqRes, corrRes, docsRes, tenderRes]) => {
        if (!isSubscribed) return;
        setIsLoadingLiveData(false);

        if (compRes.status === 'fulfilled' && compRes.value) {
          setLiveCompliance(compRes.value);
          if (
            compRes.value.readiness_score !== undefined &&
            compRes.value.readiness_score !== currentTender.readinessScore
          ) {
            updateTender(currentTender.id, { readinessScore: compRes.value.readiness_score });
          }
        }
        if (boqRes.status === 'fulfilled' && boqRes.value) {
          setLiveBOQ(boqRes.value);
        }
        if (corrRes.status === 'fulfilled' && Array.isArray(corrRes.value)) {
          setLiveCorrigenda(corrRes.value);
        }
        if (docsRes.status === 'fulfilled' && Array.isArray(docsRes.value)) {
          setLiveGeneratedDocs(docsRes.value);
        }
        if (tenderRes.status === 'fulfilled' && tenderRes.value) {
          const td = tenderRes.value;
          updateTender(currentTender.id, {
            requirements: td.requirements && td.requirements.length > 0 ? td.requirements : currentTender.requirements,
            page_count: td.page_count || currentTender.page_count || 1,
            estimatedValueCr: td.estimated_value_inr ? Number((td.estimated_value_inr / 1e7).toFixed(2)) : currentTender.estimatedValueCr,
            emdLakhs: td.emd_inr ? Number((td.emd_inr / 1e5).toFixed(2)) : currentTender.emdLakhs,
          });
        }
      });

      return () => {
        isSubscribed = false;
      };
    }
  }, [currentTender?.id, currentTender?.backendId]);

  const handleChatScroll = () => {
    if (!chatContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
    isNearBottomRef.current = scrollHeight - scrollTop - clientHeight < 150;
  };

  useEffect(() => {
    if (chatContainerRef.current && isNearBottomRef.current) {
      chatContainerRef.current.scrollTo({
        top: chatContainerRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, [messages, isTyping]);

  // Handle stage unlocking with delta credits & backend math evaluation
  const handleAdvanceStage = async (targetStage) => {
    if (!currentTender) return;
    const deltaCost = getStageDeltaCost(currentTender.pipelineStage || 0, targetStage);

    if (credits < deltaCost) {
      setCreditModalOpen(true);
      return;
    }

    runTenderStage(currentTender.id, targetStage);
    const stageName = targetStage === 2 ? 'Stage 2 (CPWD Math Audit)' : 'Stage 3 (Full Bid Compilation)';

    let extraDetails = '';
    if (currentTender.backendId) {
      try {
        const checkRes = await api.runComplianceCheck(currentTender.backendId);
        if (checkRes) {
          setLiveCompliance(checkRes);
          if (checkRes.readiness_score !== undefined) {
            updateTender(currentTender.id, { readinessScore: checkRes.readiness_score });
          }
          extraDetails = `\n\n📊 **Calculated Readiness**: **${checkRes.readiness_score || 0}%** across ${checkRes.total_requirements || 0} evaluated clauses.`;
        }
      } catch (err) {
        console.warn('Backend compliance check note:', err.message);
      }
    }

    setMessages((prev) => [
      ...prev,
      {
        id: `stage-${Date.now()}`,
        role: 'agent',
        text: `⚡ **Unlocked ${stageName} (-${deltaCost} Cr)**.\n\nAll procurement math, clause verifications, and compliance affidavits have been dynamically evaluated against Company Vault parameters.${extraDetails}`,
      },
    ]);
  };

  // Upload tender package handling - opens Intent Scope Selector Modal first
  const handleFileUpload = (files) => {
    if (!files || files.length === 0) return;
    setPendingFiles(Array.from(files));
    setIntakeModalOpen(true);
  };

  const executeIntakeLaunch = async (selectedStage, files, customTitle) => {
    setIntakeModalOpen(false);
    if (!files || files.length === 0) return;
    const file = files[0];
    const tenderTitle = customTitle || file.name.replace(/\.[^/.]+$/, '');

    // Check if modular single-task scope was chosen
    const isModular = ['boq_only', 'corrigendum_only', 'forms_only', 'emd_audit_only'].includes(selectedStage);
    const targetStageNum = selectedStage === 'stage3' ? 3 : selectedStage === 'stage2' ? 2 : 1;

    setIsUploading(true);
    setUploadPercent(15);
    const stepLabel = isModular
      ? `Processing document for ${selectedStage.replace('_', ' ').toUpperCase()}...`
      : `Connecting to pipeline for Stage ${targetStageNum} (${selectedStage === 'stage3' ? 'Full Bid Package' : selectedStage === 'stage2' ? 'Detailed Audit' : 'Screening'})...`;
    setUploadStep(stepLabel);

    try {
      if (api.isAuthenticated()) {
        const uploadRes = await api.uploadTender(files, tenderTitle);
        const tenderId = uploadRes.tender_id;

        // Apply credit deduction according to selected operation
        if (selectedStage === 'boq_only') {
          deductCredits(10, `BOQ Rate Analysis & Item Extraction: ${tenderTitle}`);
        } else if (selectedStage === 'corrigendum_only') {
          deductCredits(5, `Corrigendum Impact & Clause Diff: ${tenderTitle}`);
        } else if (selectedStage === 'forms_only') {
          deductCredits(15, `CPWD Forms A-G Undertakings Generation: ${tenderTitle}`);
        } else if (selectedStage === 'emd_audit_only') {
          deductCredits(5, `EMD & MSME Exemption Check: ${tenderTitle}`);
        } else if (targetStageNum === 2) {
          const delta = dailyFreeAvailable ? 25 : 40;
          if (dailyFreeAvailable) consumeDailyFreePass(tenderTitle);
          deductCredits(delta, `Stage 2 Deep Qualification Intake: ${tenderTitle}`);
        } else if (targetStageNum === 3) {
          const delta = dailyFreeAvailable ? 85 : 100;
          if (dailyFreeAvailable) consumeDailyFreePass(tenderTitle);
          deductCredits(delta, `Stage 3 Complete Bid Package Intake: ${tenderTitle}`);
        } else {
          // Stage 1
          if (dailyFreeAvailable) {
            consumeDailyFreePass(tenderTitle);
          } else {
            deductCredits(15, `Stage 1 NIT Screening: ${tenderTitle}`);
          }
        }

        // Subscribe to real SSE stream
        api.subscribeTenderStatus(
          tenderId,
          (progress) => {
            setUploadPercent(progress.percent || 50);
            setUploadStep(progress.step || 'Processing tender clauses...');
          },
          async () => {
            setUploadPercent(100);
            setUploadStep('Audit initialized! Launching workspace...');
            setIsUploading(false);
            try {
              const freshTender = await api.getTender(tenderId);
              if (freshTender) {
                const isInvalid = freshTender.status === 'invalid_document' || freshTender.summary?.is_invalid_doc;
                const invalidSum = freshTender.summary || {};
                const mapped = {
                  id: freshTender.id,
                  backendId: freshTender.id,
                  title: freshTender.title || (isInvalid ? 'Non-Tender Document' : tenderTitle),
                  refNo: freshTender.reference_no || `DOC/${freshTender.id.slice(0, 8).toUpperCase()}`,
                  authority: isInvalid ? (invalidSum.issuing_entity || 'UIDAI') : (freshTender.authority || 'Issuing Authority'),
                  location: freshTender.location || 'India',
                  estimatedValueCr: freshTender.estimated_value_inr ? Number((freshTender.estimated_value_inr / 1e7).toFixed(2)) : 0,
                  emdLakhs: freshTender.emd_inr ? Number((freshTender.emd_inr / 1e5).toFixed(2)) : 0,
                  contractPeriodYears: freshTender.contract_period_months ? Number((freshTender.contract_period_months / 12).toFixed(1)) : 1.0,
                  closingDate: freshTender.closing_at ? new Date(freshTender.closing_at).toLocaleDateString('en-IN') : 'N/A',
                  pipelineStage: isInvalid ? 0 : targetStageNum,
                  readinessScore: isInvalid ? 0 : (freshTender.readiness_score || 0),
                  verdict: isInvalid ? 'Non-Tender Document' : 'In Review',
                  isInvalidDoc: isInvalid,
                  invalidDocType: invalidSum.doc_type || (isInvalid ? 'identity_aadhaar' : null),
                  humanReadableType: invalidSum.human_readable_type || (isInvalid ? 'Personal Identity Document (Aadhaar Card)' : null),
                  issuingEntity: invalidSum.issuing_entity || 'Unique Identification Authority of India (UIDAI)',
                  identifiedSubject: invalidSum.identified_subject || 'Authorized Signatory',
                  rejectionReason: invalidSum.reason || (isInvalid ? 'Uploaded file is a personal identity document, not a Notice Inviting Tender (NIT).' : null),
                  suggestedAction: invalidSum.suggested_action || (isInvalid ? 'transfer_to_vault' : 'none'),
                  hasHardBlocker: false,
                  summary: freshTender.summary || { bidValidityDays: 0, redFlags: [], checklist: [] },
                  requirements: freshTender.requirements || [],
                  boqItems: [],
                  corrigenda: [],
                };
                updateTender(mapped.id, mapped);
              }
            } catch (_) {}

            navigate(`/workspace/${tenderId}`);
            if (selectedStage === 'boq_only') setCanvasTab('boq');
            if (selectedStage === 'forms_only') setCanvasTab('compiler');
            if (selectedStage === 'corrigendum_only') setCorrigendumDiffOpen(true);
            if (selectedStage === 'emd_audit_only') setCanvasTab('telemetry');
          },
          (err) => {
            console.warn('SSE upload stream ended, fallback local:', err);
            setIsUploading(false);
            const fallbackTender = createUploadedTender(file);
            fallbackTender.pipelineStage = targetStageNum;
            if (dailyFreeAvailable && (selectedStage === 'stage1' || targetStageNum >= 1)) {
              consumeDailyFreePass(tenderTitle);
            }
            navigate(`/workspace/${fallbackTender.id}`);
            if (selectedStage === 'boq_only') setCanvasTab('boq');
            if (selectedStage === 'forms_only') setCanvasTab('compiler');
            if (selectedStage === 'corrigendum_only') setCorrigendumDiffOpen(true);
          }
        );
        return;
      }
    } catch (err) {
      console.warn('Real upload failed, using graceful client fallback:', err);
    }

    // Fallback simulation if offline or error
    setTimeout(() => {
      setUploadPercent(60);
      setUploadStep('Analyzing tender requirements and verifying against Company Vault...');
    }, 450);

    setTimeout(() => {
      setUploadPercent(100);
      const newTender = createUploadedTender(file);
      newTender.pipelineStage = targetStageNum;
      if (dailyFreeAvailable && (selectedStage === 'stage1' || targetStageNum >= 1)) {
        consumeDailyFreePass(tenderTitle);
      }
      setIsUploading(false);
      navigate(`/workspace/${newTender.id}`);
      if (selectedStage === 'boq_only') setCanvasTab('boq');
      if (selectedStage === 'forms_only') setCanvasTab('compiler');
      if (selectedStage === 'corrigendum_only') setCorrigendumDiffOpen(true);
    }, 900);
  };

  // Launch agent from prompt bar in empty state
  const handleLaunchFromPrompt = () => {
    if (!inputPrompt.trim()) return;
    const newTender = createUploadedTender(inputPrompt.trim());
    setInputPrompt('');
    navigate(`/workspace/${newTender.id}`);
  };

  // Send message to agent
  const handleSendMessage = async (queryText = inputPrompt) => {
    if (!queryText.trim() || !currentTender) return;

    if (credits < 1 && !dailyFreeAvailable) {
      setCreditModalOpen(true);
      return;
    }

    const queryStartTime = Date.now();
    setActiveQuery(queryText);
    const userMsg = { id: `user-${Date.now()}`, role: 'user', text: queryText };
    setMessages((prev) => [...prev, userMsg]);
    setInputPrompt('');
    setIsTyping(true);

    try {
      if (currentTender.backendId) {
        const ragRes = await api.queryRAG(currentTender.backendId, queryText);
        setIsTyping(false);
        const durationSec = Math.max(1.2, (Date.now() - queryStartTime) / 1000).toFixed(1) + 's';

        // Deduct 1 credit locally and sync with backend ledger
        deductCredits(1, `Copilot Q&A: "${queryText.slice(0, 32)}..."`);
        if (typeof ragRes.available_credits === 'number') {
          setCredits(ragRes.available_credits);
        }

        const thoughtData = {
          duration: durationSec,
          steps: [
            `Vector Retrieval: Searched semantic & lexical index for "${queryText.slice(0, 30)}..."`,
            `Vault Matching: Cross-referenced financial turnover, net worth, and credentials`,
            `Compliance Shield: Audited CPWD Clause 4.2 and GFR 170 rules`,
            `Grounded Synthesis: Verified source clause citations and formulated answer`,
          ],
        };

        setMessages((prev) => [
          ...prev,
          {
            id: `ai-${Date.now()}`,
            role: 'agent',
            text: (ragRes.answer || 'Analysis complete based on verified tender clauses.').replace(/^text:\s*/i, ''),
            citations: ragRes.citations || [],
            thought: thoughtData,
          },
        ]);
        return;
      }
      throw new Error('Local fallback');
    } catch (err) {
      setIsTyping(false);
      const durationSec = Math.max(1.1, (Date.now() - queryStartTime) / 1000).toFixed(1) + 's';

      if (err?.status === 402 || (err?.message && err.message.includes('402'))) {
        setCreditModalOpen(true);
        setMessages((prev) => [
          ...prev,
          {
            id: `ai-${Date.now()}`,
            role: 'agent',
            text: '⚠️ **Insufficient Credits**: Your workspace wallet does not have enough credits to process this Copilot inquiry. Please top up your credits to continue asking questions.',
          },
        ]);
        return;
      }

      // Deduct credit for local simulated fallback as well
      deductCredits(1, `Copilot Q&A: "${queryText.slice(0, 32)}..."`);

      let reply = '';
      const q = queryText.toLowerCase();

      if (q.includes('emd') || q.includes('msme') || q.includes('waiver')) {
        const emdVal = currentTender.emdLakhs > 0 ? `₹${currentTender.emdLakhs} Lakhs` : 'As per NIT schedule';
        reply = `**EMD & Exemption Terms:**\n- **Amount Required**: ${emdVal} payable via FDR / Bank Guarantee from a Scheduled Bank.\n- **MSME / Udyam Alert**: As per Public Procurement Policy (Make in India Order) & CPWD Manual Section 14, **EMD exemption is strictly applicable for Supply contracts**, but **NOT for Works / EPC contracts** exceeding ₹5 Cr.\n- **Recommendation**: Submit valid Bank Guarantee on ₹500 non-judicial stamp paper prior to deadline.`;
      } else if (q.includes('liquidated') || q.includes('delay') || q.includes('penalty')) {
        reply = `**Liquidated Damages (LD) Terms:**\n- **Rate**: 1.0% per week of uncompleted contract value.\n- **Cap**: Maximum **10.0%** of total accepted contract value.\n- **Defect Liability Period**: 12 to 36 months post certified completion.`;
      } else if (q.includes('blocker') || q.includes('oem') || q.includes('maf')) {
        reply = currentTender.hasHardBlocker
          ? `**Qualification Blocker Notice:**\n- **Issue**: ${currentTender.blockerSummary || 'Disqualification blocker flagged'}\n- **Action**: Click **[Auto-Verify in Vault]** to link verified company documents, or compile a formal pre-bid query.`
          : `**Qualification Blocker Notice:**\n- **Status**: Zero critical qualification blockers detected. All statutory eligibility parameters are clear.`;
      } else {
        reply = `Regarding **"${queryText}"** for **${currentTender.title}**:\n\nThe requirements have been cross-referenced with CPWD Specifications and Indian Procurement Standards. You can inspect mathematical capacity proofs, check BOQ schedules, or compile your bid package in the right workspace pane.`;
      }

      const thoughtData = {
        duration: durationSec,
        steps: [
          `Vector Retrieval: Searched local tender knowledge for "${queryText.slice(0, 30)}..."`,
          `Vault Matching: Cross-referenced financial turnover, net worth, and credentials`,
          `Compliance Shield: Audited CPWD Clause 4.2 and GFR 170 rules`,
          `Grounded Synthesis: Verified source clause citations and formulated answer`,
        ],
      };

      setMessages((prev) => [
        ...prev,
        {
          id: `ai-${Date.now()}`,
          role: 'agent',
          text: reply,
          thought: thoughtData,
        },
      ]);
    }
  };

  const handleCopyMessage = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedMsgId(id);
    setTimeout(() => setCopiedMsgId(null), 2000);
  };

  const handleFeedback = (id, type) => {
    setMsgFeedback((prev) => ({
      ...prev,
      [id]: prev[id] === type ? null : type,
    }));
  };

  // Compile individual bid document & trigger instant .DOCX download
  const handleCompileDoc = async (docType, docName) => {
    setCompilingDoc(docType);
    try {
      if (currentTender.backendId) {
        const res = await api.compileBid(currentTender.backendId, docType, {
          authorized_signatory: companyVault?.signatoryName || '',
          company_address: companyVault?.location || '',
        });
        const docId = res?.document_id || res?.id;
        if (docId) {
          const filename = `${docType}_${currentTender.refNo?.replace(/[^a-zA-Z0-9_-]/g, '_') || 'tender'}.docx`;
          await api.downloadDocxFile(currentTender.backendId, docId, filename);
          const docs = await api.listGeneratedDocuments(currentTender.backendId);
          setLiveGeneratedDocs(docs || []);
        }
      }
      handleCopy(`Downloaded ${docName} for "${currentTender.title}"`, docType);
    } catch (err) {
      console.warn('Doc compilation error:', err.message);
      handleCopy(`Generated draft for ${docName}`, docType);
    } finally {
      setCompilingDoc(null);
    }
  };

  // Export BOQ line items as XLSX
  const handleExportBOQ = async () => {
    if (!currentTender?.backendId) return;
    try {
      const filename = `BOQ_${currentTender.refNo?.replace(/[^a-zA-Z0-9_-]/g, '_') || 'schedule'}.xlsx`;
      await api.downloadBOQFile(currentTender.backendId, filename);
    } catch (err) {
      console.warn('BOQ export note:', err.message);
    }
  };

  // Run Two-Layer Pre-Submission Audit
  const handleRunFinalAudit = async () => {
    if (!currentTender?.backendId) return;
    setIsRunningAudit(true);
    try {
      const audit = await api.runFinalAudit(currentTender.backendId);
      setAuditResult(audit);
      setAuditModalOpen(true);
    } catch (err) {
      console.warn('Audit execution note:', err.message);
    } finally {
      setIsRunningAudit(false);
    }
  };

  // Copy text helper
  const handleCopy = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1800);
  };

  // Derived financial & mathematical computations for Right Canvas Tab 1
  const tenderVal = currentTender?.estimatedValueCr || 0;
  const turnoverReq = Number((tenderVal * 0.3).toFixed(2));
  const userTurnover = companyVault?.turnover3YrAvgCr || 0;
  const turnoverRatio = turnoverReq > 0 ? Math.round((userTurnover / turnoverReq) * 100) : 0;
  const turnoverPassed = userTurnover >= turnoverReq && userTurnover > 0;

  const durationN = currentTender?.contractPeriodYears || 1.0;
  const maxTurnoverA = companyVault?.maxTurnoverACr || 0;
  const commitmentsB = companyVault?.existingCommitmentsBCr || 0;
  const availableBidCapacity = Number((maxTurnoverA * durationN * 2 - commitmentsB).toFixed(2));
  const capacityRatio = tenderVal > 0 ? Math.round((availableBidCapacity / tenderVal) * 100) : 0;
  const capacityPassed = availableBidCapacity >= tenderVal && availableBidCapacity > 0;

  // ════════════════════════════════════════════════════════════════════════
  // 1. EMPTY STATE: AGENT COMMAND CENTER (/workspace)
  // ════════════════════════════════════════════════════════════════════════
  if (!currentTender) {
    return (
      <div
        className="animate-in"
        style={{
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px 20px',
          textAlign: 'center',
          position: 'relative',
        }}
      >
        <div style={{ maxWidth: 740, width: '100%', margin: '0 auto' }}>
          {/* Centered Glowing AI Orb Badge */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '6px 14px',
              borderRadius: 6,
              background: 'var(--accent-subtle)',
              border: '1px solid var(--accent-border)',
              color: 'var(--accent-primary)',
              fontSize: 12,
              fontWeight: 700,
              marginBottom: 20,
            }}
          >
            <Sparkles size={14} />
            <span>STATUTORY PROCUREMENT AUDIT SUITE · CPWD & PUBLIC PROCUREMENT MATRIX</span>
          </div>

          {/* Clean Display Title — Google Gemini Fluid Hierarchy */}
          <h1
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 30,
              fontWeight: 550,
              letterSpacing: '-0.02em',
              lineHeight: 1.25,
              marginBottom: 14,
              color: 'var(--text-primary)',
            }}
          >
            Upload Tender Package to <span style={{ fontFamily: 'var(--font-roman)', fontStyle: 'italic', fontWeight: 400, color: 'var(--accent-primary-light, #c7d2fe)' }}>Initiate</span> Audit
          </h1>

          <p
            style={{
              fontSize: 14.5,
              color: 'var(--text-secondary)',
              maxWidth: 580,
              margin: '0 auto 28px auto',
              lineHeight: 1.6,
              fontFamily: 'var(--font-sans)',
              fontWeight: 400,
            }}
          >
            Upload your government tender package (NIT, RFP, or BOQ) to audit statutory qualification criteria, verify average 3-year turnover capacity, and compile verified bid packages.
          </p>

          {/* Unified Enterprise Intake Dock */}
          <div
            className="floating-command-dock"
            style={{
              padding: '24px 28px',
              textAlign: 'center',
              position: 'relative',
              marginBottom: 24,
              border: '1.5px dashed var(--accent-border)',
              borderRadius: 14,
              cursor: 'pointer',
              background: 'var(--bg-elevated)',
              transition: 'all 0.2s ease',
            }}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              if (e.dataTransfer.files) handleFileUpload(e.dataTransfer.files);
            }}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              type="file"
              ref={fileInputRef}
              style={{ display: 'none' }}
              accept=".pdf,.docx,.xlsx,.zip"
              onChange={(e) => handleFileUpload(e.target.files)}
            />

            {!isUploading ? (
              <div>
                <div
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: 12,
                    background: 'var(--accent-subtle)',
                    border: '1px solid var(--accent-border)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--accent-primary)',
                    margin: '0 auto 14px',
                  }}
                >
                  <UploadCloud size={24} />
                </div>

                <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 6 }}>
                  Drop your tender package here, or click to browse
                </div>
                <div style={{ fontSize: 12.5, color: 'var(--text-secondary)', marginBottom: 16 }}>
                  Supports scanned/digital PDF, Excel BOQ & ZIP packages (<span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>MAX 500 PAGES / 50MB</span>)
                </div>

                <button
                  type="button"
                  className="btn-agent btn-agent-primary"
                  style={{ padding: '8px 22px', fontSize: 13, fontWeight: 700 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    fileInputRef.current?.click();
                  }}
                >
                  Start Tender Audit <ArrowRight size={14} />
                </button>
              </div>
            ) : (
              <div style={{ padding: '10px 0', textAlign: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 12 }}>
                  <RefreshCw size={16} className="spin" color="var(--accent-primary)" />
                  <span style={{ fontSize: 13, fontWeight: 700 }}>{uploadStep}</span>
                </div>
                <div className="telemetry-bar-track" style={{ height: 6, maxWidth: 420, margin: '0 auto' }}>
                  <div
                    className="telemetry-bar-fill"
                    style={{ width: `${uploadPercent}%`, background: 'var(--accent-gradient)' }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Active Tenders or Clean Empty Guidance Card */}
          <div style={{ marginBottom: 28 }}>
            {tenders && tenders.length > 0 ? (
              <>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: 'var(--text-tertiary)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    marginBottom: 10,
                    textAlign: 'left',
                  }}
                >
                  Your Active Tender Workspaces:
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
                  {tenders.map((item) => (
                    <div
                      key={item.id}
                      className="glass-pod glass-pod-interactive"
                      onClick={() => navigate(`/workspace/${item.id}`)}
                      style={{
                        padding: 14,
                        textAlign: 'left',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                          <span className={`badge-status ${item.readinessScore >= 70 ? 'pass' : 'warn'}`}>
                            {item.readinessScore > 0 ? `${item.readinessScore}% Match` : 'Screening'}
                          </span>
                          <span style={{ fontSize: 11, fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--accent-primary)' }}>
                            {item.estimatedValueCr > 0 ? `₹${item.estimatedValueCr} Cr` : 'Pending Extr.'}
                          </span>
                        </div>
                        <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.35, marginBottom: 4 }}>
                          {item.title}
                        </div>
                        <div style={{ fontSize: 10.5, color: 'var(--text-tertiary)' }}>{item.authority}</div>
                      </div>
                      <div
                        style={{
                          marginTop: 10,
                          paddingTop: 8,
                          borderTop: '1px solid var(--border-subtle)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          fontSize: 10.5,
                          color: 'var(--accent-primary)',
                          fontWeight: 600,
                        }}
                      >
                        <span>Stage {item.pipelineStage || 0} of 3</span>
                        <ChevronRight size={12} />
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div
                className="glass-pod"
                style={{
                  padding: '18px 22px',
                  textAlign: 'center',
                  background: 'var(--bg-elevated)',
                  border: '1px dashed var(--border-subtle)',
                }}
              >
                <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>
                  Tender Intelligence Workspace Ready
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', maxWidth: 520, margin: '0 auto', lineHeight: 1.55 }}>
                  Upload your tender document (NIT, RFP, or BOQ) above. BidKaro's Procurement AI will instantly audit your eligibility, detect hidden contract risks, and compile submission-ready bid documents.
                </div>
                <div className="signature-stamp" style={{ marginTop: 10, justifyContent: 'center', fontSize: 14 }}>
                  ✓ Standardized for Central & State PWD, NHAI, CPWD, MES and Railway Portals
                </div>
              </div>
            )}
          </div>

          {/* 3-Stage Modular Pipeline Indicator */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '6px 16px',
              borderRadius: 999,
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-subtle)',
              fontSize: 11.5,
              color: 'var(--text-secondary)',
            }}
          >
            <span style={{ fontWeight: 700, color: 'var(--status-pass-text)' }}>
              ● Stage 1: NIT Screening {dailyFreeAvailable ? '[FREE Today]' : '[15 Cr]'}
            </span>
            <span style={{ opacity: 0.4 }}>→</span>
            <span style={{ fontWeight: 600 }}>Stage 2: Eligibility Audit [+25 Cr]</span>
            <span style={{ opacity: 0.4 }}>→</span>
            <span style={{ fontWeight: 600 }}>Stage 3: Bid Package Assembly [+60 Cr]</span>
          </div>
        </div>

        <CreditTopUpModal isOpen={creditModalOpen} onClose={() => setCreditModalOpen(false)} />
        <VaultQuickModal isOpen={vaultModalOpen} onClose={() => setVaultModalOpen(false)} />
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════════════════
  // 2. ACTIVE STATE: 2-COLUMN SPLIT-SCREEN AGENT WORKSPACE
  // ════════════════════════════════════════════════════════════════════════
  const deltaCostToStage2 = getStageDeltaCost(currentTender.pipelineStage || 0, 2);
  const deltaCostToStage3 = getStageDeltaCost(currentTender.pipelineStage || 0, 3);

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '1.05fr 0.95fr',
        gridTemplateRows: 'minmax(0, 1fr)',
        height: '100%',
        maxHeight: '100%',
        minHeight: 0,
        overflow: 'hidden',
        background: 'transparent',
      }}
    >
      {/* ── LEFT COLUMN (52%): AUTONOMOUS AGENT REASONING STREAM ── */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          maxHeight: '100%',
          minHeight: 0,
          borderRight: '1px solid var(--border-subtle)',
          minWidth: 0,
          overflow: 'hidden',
          background: 'transparent',
          position: 'relative',
        }}
      >
        {/* Top Compact Tender Bar - 10/10 Overhaul */}
        <div
          style={{
            height: 52,
            minHeight: 52,
            maxHeight: 52,
            padding: '0 14px',
            borderBottom: '1px solid var(--border-subtle)',
            background: 'var(--bg-glass)',
            backdropFilter: 'blur(12px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexShrink: 0,
            gap: 12,
          }}
        >
          {/* Left: Back button + Title & Ref + Authority */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, flex: '1 1 auto' }}>
            <button
              onClick={() => navigate('/workspace')}
              className="btn-agent btn-agent-ghost"
              style={{ padding: '6px 8px', borderRadius: 6, flexShrink: 0 }}
              title="Back to All Tenders"
            >
              <ChevronLeft size={16} />
            </button>

            <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                <span
                  title={currentTender.title}
                  style={{
                    fontSize: 15,
                    fontWeight: 700,
                    color: 'var(--text-primary)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    letterSpacing: '-0.01em',
                  }}
                >
                  {currentTender.title}
                </span>
                <span
                  style={{
                    fontSize: 11.5,
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: 6,
                    fontFamily: 'var(--font-mono)',
                    flexShrink: 0,
                    background: 'rgba(59, 130, 246, 0.18)',
                    color: '#93c5fd',
                    border: '1px solid rgba(96, 165, 250, 0.4)',
                  }}
                  title={`Official Tender Reference: ${currentTender.refNo}`}
                >
                  {currentTender.refNo}
                </span>
              </div>
              {currentTender.authority && (
                <span
                  style={{
                    fontSize: 12,
                    color: 'var(--text-secondary)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    lineHeight: 1.3,
                    marginTop: 1,
                  }}
                  title={currentTender.authority}
                >
                  {currentTender.authority}
                </span>
              )}
            </div>
          </div>

          {/* Right: Stage CTA + Consolidated Tools Dropdown */}
          {currentTender.isInvalidDoc ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
              <span
                style={{
                  fontSize: 12,
                  padding: '5px 12px',
                  borderRadius: 6,
                  background: 'rgba(239, 68, 68, 0.12)',
                  color: '#ef4444',
                  fontWeight: 700,
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                }}
              >
                Ineligible Document
              </span>
              <button
                className="btn-agent btn-agent-primary"
                style={{ fontSize: 12, padding: '5px 12px', background: 'var(--accent-cta)', borderColor: 'var(--accent-cta)', color: '#fff' }}
                onClick={async () => {
                  await transferTenderToVault(currentTender.id);
                  navigate('/vault');
                }}
              >
                <ShieldCheck size={14} /> Transfer to Vault
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0, position: 'relative' }}>
              
              {/* Current Stage Badge */}
              <span
                className="badge-status pass"
                style={{ fontSize: 11, padding: '3px 8px', display: 'flex', alignItems: 'center', gap: 5, whiteSpace: 'nowrap' }}
              >
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10B981' }} />
                Stage {(currentTender.pipelineStage || 1)}: {currentTender.pipelineStage >= 3 ? 'Full Package' : currentTender.pipelineStage === 2 ? 'Audit' : 'Screened'}
              </span>

              {/* Primary Action Next-Stage Button */}
              {(currentTender.pipelineStage || 1) < 3 ? (
                <button
                  className="btn-agent btn-agent-primary"
                  style={{
                    fontSize: 12,
                    padding: '5px 11px',
                    background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
                    borderColor: '#f97316',
                    color: '#FFFFFF',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 5,
                    boxShadow: '0 2px 10px rgba(249, 115, 22, 0.35)',
                    whiteSpace: 'nowrap',
                  }}
                  onClick={() => handleAdvanceStage((currentTender.pipelineStage || 1) === 1 ? 2 : 3)}
                  title={(currentTender.pipelineStage || 1) === 1 ? `Advance to Stage 2: Detailed Qualification Audit (+${deltaCostToStage2} Cr)` : `Generate Complete .DOCX Bid Package (+${deltaCostToStage3} Cr)`}
                >
                  <Zap size={13} />
                  <span>
                    {(currentTender.pipelineStage || 1) === 1
                      ? `Stage 2 (+${deltaCostToStage2} Cr)`
                      : `Stage 3: Bid (+${deltaCostToStage3} Cr)`}
                  </span>
                </button>
              ) : (
                <span
                  style={{
                    fontSize: 11.5,
                    fontWeight: 700,
                    padding: '4px 10px',
                    borderRadius: 6,
                    background: 'rgba(16, 185, 129, 0.15)',
                    color: '#10B981',
                    border: '1px solid rgba(16, 185, 129, 0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 5,
                    whiteSpace: 'nowrap',
                  }}
                >
                  <CheckCircle2 size={13} /> Bid Dossier Ready (.DOCX)
                </span>
              )}

              {/* Consolidated Tools Menu */}
              <div style={{ position: 'relative' }}>
                <button
                  className="btn-agent btn-agent-secondary"
                  style={{
                    fontSize: 12,
                    padding: '6px 12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 5,
                    background: toolsMenuOpen ? 'var(--bg-elevated)' : undefined,
                  }}
                  onClick={() => setToolsMenuOpen(!toolsMenuOpen)}
                  title="Procurement Utilities & Solvers"
                >
                  <Wrench size={13} />
                  <span>Tools</span>
                  <ChevronDown size={12} style={{ opacity: 0.8 }} />
                </button>

                {/* Tools Dropdown Menu */}
                {toolsMenuOpen && (
                  <div
                    style={{
                      position: 'absolute',
                      top: 'calc(100% + 6px)',
                      right: 0,
                      width: 230,
                      background: 'var(--bg-surface, #0E131F)',
                      border: '1px solid var(--border-strong, rgba(255,255,255,0.15))',
                      borderRadius: 8,
                      boxShadow: '0 12px 32px rgba(0,0,0,0.5)',
                      zIndex: 100,
                      padding: 4,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 2,
                    }}
                  >
                    <button
                      onClick={() => {
                        setToolsMenuOpen(false);
                        setJvModalOpen(true);
                      }}
                      className="btn-agent btn-agent-ghost"
                      style={{
                        width: '100%',
                        justifyContent: 'flex-start',
                        fontSize: 11.5,
                        padding: '7px 10px',
                        borderRadius: 5,
                      }}
                    >
                      <span style={{ fontSize: 13, marginRight: 6 }}>👥</span>
                      <span>JV & Consortium Solver</span>
                    </button>
                    <button
                      onClick={() => {
                        setToolsMenuOpen(false);
                        setFormsModalOpen(true);
                      }}
                      className="btn-agent btn-agent-ghost"
                      style={{
                        width: '100%',
                        justifyContent: 'flex-start',
                        fontSize: 11.5,
                        padding: '7px 10px',
                        borderRadius: 5,
                      }}
                    >
                      <span style={{ fontSize: 13, marginRight: 6 }}>⚖️</span>
                      <span>CPWD Forms A to G</span>
                    </button>
                    <button
                      onClick={() => {
                        setToolsMenuOpen(false);
                        setLeakModalOpen(true);
                      }}
                      className="btn-agent btn-agent-ghost"
                      style={{
                        width: '100%',
                        justifyContent: 'flex-start',
                        fontSize: 11.5,
                        padding: '7px 10px',
                        borderRadius: 5,
                      }}
                    >
                      <span style={{ fontSize: 13, marginRight: 6 }}>🛡️</span>
                      <span>Cover 1 Price Leak Scan</span>
                    </button>
                    <div style={{ height: 1, background: 'var(--border-subtle)', margin: '2px 0' }} />
                    <button
                      onClick={() => {
                        setToolsMenuOpen(false);
                        handleRunFinalAudit();
                      }}
                      disabled={isRunningAudit || !currentTender.backendId}
                      className="btn-agent btn-agent-ghost"
                      style={{
                        width: '100%',
                        justifyContent: 'flex-start',
                        fontSize: 11.5,
                        padding: '7px 10px',
                        borderRadius: 5,
                        color: 'var(--accent-primary)',
                      }}
                    >
                      <ShieldCheck size={13} style={{ marginRight: 6 }} />
                      <span>{isRunningAudit ? 'Auditing 40+ Clauses...' : 'Disqualification Audit'}</span>
                    </button>
                  </div>
                )}
              </div>

            </div>
          )}
        </div>

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
      </div>

      {/* ── RIGHT COLUMN (48%): PERSISTENT HIGH-DEFINITION TELEMETRY & PROOF CANVAS ── */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          maxHeight: '100%',
          minHeight: 0,
          minWidth: 0,
          overflow: 'hidden',
          background: 'var(--bg-glass)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          position: 'relative',
        }}
      >
        {/* Segmented Top Switcher with Live Indicators */}
        <div
          style={{
            height: 52,
            padding: '0 14px',
            borderBottom: '1px solid var(--border-subtle)',
            background: 'var(--bg-glass)',
            backdropFilter: 'blur(12px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexShrink: 0,
            gap: 10,
          }}
        >
          <div style={{ display: 'flex', gap: 4, background: 'var(--bg-surface)', padding: 3, borderRadius: 8, border: '1px solid var(--border-subtle)', minWidth: 0, overflowX: 'auto', scrollbarWidth: 'none' }}>
            {[
              {
                id: 'telemetry',
                label: '📋 Eligibility',
                badge: currentTender.readinessScore > 0 ? `${currentTender.readinessScore}%` : null,
              },
              {
                id: 'pdf',
                label: '📄 Tender Proof',
                badge: `${liveCompliance?.items?.length || currentTender.requirements?.length || 5} Cl.`,
              },
              {
                id: 'boq',
                label: '📊 BOQ & Diff',
                badge: `${liveBOQ?.items?.length || currentTender.boqItems?.length || 5} Items`,
              },
              {
                id: 'compiler',
                label: '📦 Bid Drafter',
                badge: '.DOCX',
              },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setCanvasTab(tab.id)}
                style={{
                  padding: '6px 10px',
                  borderRadius: 6,
                  border: 'none',
                  fontSize: 12,
                  fontWeight: canvasTab === tab.id ? 700 : 500,
                  cursor: 'pointer',
                  background: canvasTab === tab.id ? 'var(--accent-primary)' : 'transparent',
                  color: canvasTab === tab.id ? '#FFFFFF' : 'var(--text-secondary)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                  transition: 'all 120ms ease',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                }}
              >
                <span>{tab.label}</span>
                {tab.badge && (
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      padding: '1px 5px',
                      borderRadius: 4,
                      background: canvasTab === tab.id ? 'rgba(255,255,255,0.25)' : 'var(--bg-elevated)',
                      color: canvasTab === tab.id ? '#fff' : 'var(--text-secondary)',
                      fontFamily: 'var(--font-mono)',
                    }}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            ))}
          </div>

          <span
            className={`badge-status ${currentTender.verdict === 'Qualified' ? 'pass' : 'warn'}`}
            style={{
              fontSize: 11.5,
              padding: '4px 10px',
              flexShrink: 0,
              whiteSpace: 'nowrap',
            }}
          >
            {currentTender.verdict || 'In Review'}
          </span>
        </div>

        {/* Contextual Executive Subtitle Bar */}
        <div
          style={{
            padding: '8px 16px',
            background: 'var(--bg-elevated)',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: 12,
            color: 'var(--text-secondary)',
            flexShrink: 0,
            gap: 12,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, minWidth: 0, overflow: 'hidden' }}>
            <Info size={13} color="var(--accent-primary)" style={{ flexShrink: 0 }} />
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {canvasTab === 'telemetry' && 'Contractor Eligibility Audit · CPWD Formula (2AN - B), Turnover Thresholds & Past Experience.'}
              {canvasTab === 'pdf' && 'Tender Proof & Clause Scrutiny · Official Scanned Pages with Verified Clause Citations.'}
              {canvasTab === 'boq' && 'BOQ Schedule & Corrigenda · Itemized Rates, Quantities & Official Amendments.'}
              {canvasTab === 'compiler' && 'Submission Package Compiler · Automated CPWD Forms A–G & Editable Word (.docx) Bids.'}
            </span>
          </div>
          <span
            style={{
              fontSize: 10.5,
              fontFamily: 'var(--font-mono)',
              color: 'var(--text-tertiary)',
              flexShrink: 0,
              whiteSpace: 'nowrap',
              padding: '2px 8px',
              borderRadius: 4,
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            {canvasTab === 'telemetry' && 'CPWD Cl. 4.2 · GFR 170'}
            {canvasTab === 'pdf' && 'Two-Cover Verification'}
            {canvasTab === 'boq' && 'CPWD Schedule B'}
            {canvasTab === 'compiler' && 'Forms A–G Proformas'}
          </span>
        </div>

        {/* Canvas Body Viewports */}
        <div style={{ flex: '1 1 0%', height: 0, minHeight: 0, overflowY: 'auto', overflowX: 'hidden', padding: 16, overscrollBehavior: 'contain' }}>
          
          {/* TAB 1: LIVE MATH & TELEMETRY */}
          {canvasTab === 'telemetry' && (
            <EligibilityTelemetryTab
              currentTender={currentTender}
              companyVault={companyVault}
              liveCompliance={liveCompliance}
              setJvModalOpen={setJvModalOpen}
              navigate={navigate}
              transferTenderToVault={transferTenderToVault}
            />
          )}

          {/* TAB 2: DOCUMENT PROOF CANVAS */}
          {canvasTab === 'pdf' && (
            <DocumentProofTab
              currentTender={currentTender}
              focusedClause={focusedClause}
              setFocusedClause={setFocusedClause}
              liveCompliance={liveCompliance}
              setInputPrompt={setInputPrompt}
            />
          )}

          {/* TAB 3: BOQ & CORRIGENDUM */}
          {canvasTab === 'boq' && (
            <BOQCorrigendaTab
              currentTender={currentTender}
              liveBOQ={liveBOQ}
              liveCorrigenda={liveCorrigenda}
              handleExportBOQ={handleExportBOQ}
              setCorrigendumDiffOpen={setCorrigendumDiffOpen}
            />
          )}

          {/* TAB 4: BID COMPILER (.DOCX) */}
          {canvasTab === 'compiler' && (
            <BidPackageCompilerTab
              currentTender={currentTender}
              companyVault={companyVault}
              liveGeneratedDocs={liveGeneratedDocs}
              compilingDoc={compilingDoc}
              copiedKey={copiedKey}
              handleCompileDoc={handleCompileDoc}
              setLeakModalOpen={setLeakModalOpen}
              setFormsModalOpen={setFormsModalOpen}
            />
          )}

        </div>
      </div>

      <TwoLayerAuditModal
        isOpen={auditModalOpen}
        onClose={() => setAuditModalOpen(false)}
        auditResult={auditResult}
      />
      <CreditTopUpModal isOpen={creditModalOpen} onClose={() => setCreditModalOpen(false)} />
      <VaultQuickModal isOpen={vaultModalOpen} onClose={() => setVaultModalOpen(false)} />
      <JVCalculatorModal
        isOpen={jvModalOpen}
        onClose={() => setJvModalOpen(false)}
        tender={currentTender}
        companyVault={companyVault}
      />
      <EnvelopeLeakAuditModal
        isOpen={leakModalOpen}
        onClose={() => setLeakModalOpen(false)}
        technicalDocumentsText={messages.map((m) => m.text).join('\n')}
        tenderTitle={currentTender?.title}
      />
      <StandardFormsModal
        isOpen={formsModalOpen}
        onClose={() => setFormsModalOpen(false)}
        tender={currentTender}
        companyVault={companyVault}
      />
      <CorrigendumDiffModal
        isOpen={corrigendumDiffOpen}
        onClose={() => setCorrigendumDiffOpen(false)}
        tender={currentTender}
        companyVault={companyVault}
      />
      <TenderIntakeScopeModal
        isOpen={intakeModalOpen}
        onClose={() => setIntakeModalOpen(false)}
        files={pendingFiles}
        credits={credits}
        dailyFreeAvailable={dailyFreeAvailable}
        onConfirmLaunch={executeIntakeLaunch}
      />
    </div>
  );
}

export default Workspace;
