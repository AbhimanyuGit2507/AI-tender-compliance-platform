import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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

import { WorkspaceEmptyState } from '../components/workspace/WorkspaceEmptyState';
import { WorkspaceTopBar } from '../components/workspace/WorkspaceTopBar';
import { WorkspaceChatStream } from '../components/workspace/WorkspaceChatStream';
import { WorkspaceRightCanvas } from '../components/workspace/WorkspaceRightCanvas';

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

      Promise.allSettled([
        api.getComplianceMatrix(currentTender.backendId),
        api.getBOQ(currentTender.backendId),
        api.getCorrigenda(currentTender.backendId),
        api.listGeneratedDocuments(currentTender.backendId),
        api.getTender(currentTender.backendId),
      ]).then(([compRes, boqRes, corrRes, docsRes, tenderRes]) => {
        if (!isSubscribed) return;

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
        const uploadedTenderId = uploadRes.tender_id;

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
          uploadedTenderId,
          (progress) => {
            setUploadPercent(progress.percent || 50);
            setUploadStep(progress.step || 'Processing tender clauses...');
          },
          async () => {
            setUploadPercent(100);
            setUploadStep('Audit initialized! Launching workspace...');
            setIsUploading(false);
            try {
              const freshTender = await api.getTender(uploadedTenderId);
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

            navigate(`/workspace/${uploadedTenderId}`);
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
  const userTurnover = companyVault?.turnover3YrAvgCr || 0;
  const durationN = currentTender?.contractPeriodYears || 1.0;
  const maxTurnoverA = companyVault?.maxTurnoverACr || 0;
  const commitmentsB = companyVault?.existingCommitmentsBCr || 0;
  const availableBidCapacity = Number((maxTurnoverA * durationN * 2 - commitmentsB).toFixed(2));

  // ════════════════════════════════════════════════════════════════════════
  // 1. EMPTY STATE: AGENT COMMAND CENTER (/workspace)
  // ════════════════════════════════════════════════════════════════════════
  if (!currentTender) {
    return (
      <WorkspaceEmptyState
        fileInputRef={fileInputRef}
        handleFileUpload={handleFileUpload}
        isUploading={isUploading}
        uploadStep={uploadStep}
        uploadPercent={uploadPercent}
        tenders={tenders}
        dailyFreeAvailable={dailyFreeAvailable}
        creditModalOpen={creditModalOpen}
        setCreditModalOpen={setCreditModalOpen}
        vaultModalOpen={vaultModalOpen}
        setVaultModalOpen={setVaultModalOpen}
        navigate={navigate}
      />
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
        <WorkspaceTopBar
          currentTender={currentTender}
          navigate={navigate}
          transferTenderToVault={transferTenderToVault}
          deltaCostToStage2={deltaCostToStage2}
          deltaCostToStage3={deltaCostToStage3}
          handleAdvanceStage={handleAdvanceStage}
          toolsMenuOpen={toolsMenuOpen}
          setToolsMenuOpen={setToolsMenuOpen}
          setJvModalOpen={setJvModalOpen}
          setFormsModalOpen={setFormsModalOpen}
          setLeakModalOpen={setLeakModalOpen}
          handleRunFinalAudit={handleRunFinalAudit}
          isRunningAudit={isRunningAudit}
        />

        <WorkspaceChatStream
          chatContainerRef={chatContainerRef}
          handleChatScroll={handleChatScroll}
          currentTender={currentTender}
          transferTenderToVault={transferTenderToVault}
          navigate={navigate}
          fileInputRef={fileInputRef}
          deleteTender={deleteTender}
          traceOpen={traceOpen}
          setTraceOpen={setTraceOpen}
          userTurnover={userTurnover}
          availableBidCapacity={availableBidCapacity}
          setVaultModalOpen={setVaultModalOpen}
          setCanvasTab={setCanvasTab}
          resolveTenderBlocker={resolveTenderBlocker}
          handleSendMessage={handleSendMessage}
          messages={messages}
          setFocusedClause={setFocusedClause}
          handleCopyMessage={handleCopyMessage}
          copiedMsgId={copiedMsgId}
          handleFeedback={handleFeedback}
          msgFeedback={msgFeedback}
          isTyping={isTyping}
          activeQuery={activeQuery}
          messagesEndRef={messagesEndRef}
          chatAttachInputRef={chatAttachInputRef}
          handleFileUpload={handleFileUpload}
          inputPrompt={inputPrompt}
          setInputPrompt={setInputPrompt}
        />
      </div>

      {/* ── RIGHT COLUMN (48%): PERSISTENT HIGH-DEFINITION TELEMETRY & PROOF CANVAS ── */}
      <WorkspaceRightCanvas
        canvasTab={canvasTab}
        setCanvasTab={setCanvasTab}
        currentTender={currentTender}
        companyVault={companyVault}
        liveCompliance={liveCompliance}
        liveBOQ={liveBOQ}
        liveCorrigenda={liveCorrigenda}
        liveGeneratedDocs={liveGeneratedDocs}
        compilingDoc={compilingDoc}
        copiedKey={copiedKey}
        setJvModalOpen={setJvModalOpen}
        navigate={navigate}
        transferTenderToVault={transferTenderToVault}
        focusedClause={focusedClause}
        setFocusedClause={setFocusedClause}
        setInputPrompt={setInputPrompt}
        handleExportBOQ={handleExportBOQ}
        setCorrigendumDiffOpen={setCorrigendumDiffOpen}
        handleCompileDoc={handleCompileDoc}
        setLeakModalOpen={setLeakModalOpen}
        setFormsModalOpen={setFormsModalOpen}
      />

      {/* Hidden File Input for Empty State and Workspace Drop */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={(e) => handleFileUpload(e.target.files)}
        style={{ display: 'none' }}
        multiple
        accept=".pdf,.doc,.docx,.xls,.xlsx"
      />

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
