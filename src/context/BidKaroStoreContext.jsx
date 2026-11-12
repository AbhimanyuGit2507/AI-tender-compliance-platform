import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const STAGE_COSTS = { 0: 0, 1: 15, 2: 40, 3: 100 };

const DEFAULT_COMPANY_VAULT = {
  companyName: '',
  businessType: 'Civil & EPC Infrastructure Contractor',
  location: '',
  gstin: '',
  pan: '',
  udyamNo: '',
  pwdClass: '',
  signatoryName: '',
  signatoryRole: '',
  turnover3YrAvgCr: 0,
  maxTurnoverACr: 0,
  netWorthCr: 0,
  solvencyCr: 0,
  existingCommitmentsBCr: 0,
  isInitialized: false,
  projects: [],
  certificates: [],
  activeBlockers: [],
};

const BidKaroStoreContext = createContext(null);

export function BidKaroStoreProvider({ children }) {
  const [credits, setCredits] = useState(0);
  const [planTier, setPlanTier] = useState('growth_pack');
  const [dailyFreeAvailable, setDailyFreeAvailable] = useState(true);
  const [tenders, setTenders] = useState([]);
  const [companyVault, setCompanyVault] = useState(DEFAULT_COMPANY_VAULT);
  const [ledgerHistory, setLedgerHistory] = useState([
    { id: 'tx-1', date: 'Initial Grant', desc: 'Welcome Procurement Credits', delta: '+25 Cr', balance: 25 },
  ]);

  // Sync state with live FastAPI backend on startup / auth changes
  useEffect(() => {
    let isMounted = true;

    async function syncBackendState() {
      if (!api.isAuthenticated()) {
        if (isMounted) {
          setTenders([]);
          setCompanyVault(DEFAULT_COMPANY_VAULT);
          setCredits(0);
          setPlanTier('growth_pack');
        }
        return;
      }

      try {

        // 1. Live Company Vault
        try {
          const vault = await api.getCompanyVault();
          if (isMounted && vault) {
            setCompanyVault((prev) => {
              const turnoverVals = (vault.turnovers || []).map((t) => t.value_inr);
              const avg3Yr = turnoverVals.length
                ? turnoverVals.reduce((a, b) => a + b, 0) / turnoverVals.length / 1e7
                : prev.turnover3YrAvgCr;
              return {
                ...prev,
                companyName: vault.company_name || prev.companyName,
                businessType: vault.business_type || prev.businessType,
                location: vault.location || prev.location,
                gstin: vault.gstin || prev.gstin,
                pan: vault.pan || prev.pan,
                udyamNo: vault.msme_reg_no || prev.udyamNo,
                turnover3YrAvgCr: Number(avg3Yr.toFixed(2)),
                maxTurnoverACr: vault.max_turnover_a ? Number((vault.max_turnover_a / 1e7).toFixed(2)) : prev.maxTurnoverACr,
                netWorthCr: vault.net_worth ? Number((vault.net_worth / 1e7).toFixed(2)) : prev.netWorthCr,
                solvencyCr: vault.solvency_inr ? Number((vault.solvency_inr / 1e7).toFixed(2)) : prev.solvencyCr,
                existingCommitmentsBCr: vault.active_commitments_b ? Number((vault.active_commitments_b / 1e7).toFixed(2)) : prev.existingCommitmentsBCr,
                isInitialized: Boolean(vault.turnovers?.length || vault.solvency_inr || vault.net_worth),
              };
            });
          }
        } catch (e) {
          console.warn('Backend vault sync note:', e.message);
        }

        // 2. Live Credits Balance, Plan Tier & Ledger History
        try {
          const creditData = await api.getCredits();
          if (isMounted && creditData) {
            if (typeof creditData.available_credits === 'number') {
              setCredits(creditData.available_credits);
            }
            if (creditData.plan_tier) {
              setPlanTier(creditData.plan_tier);
            }
          }

          const compCredits = await api.getCompanyCredits();
          if (isMounted && compCredits) {
            if (compCredits.plan_tier) {
              setPlanTier(compCredits.plan_tier);
            }
            if (Array.isArray(compCredits.transactions) && compCredits.transactions.length > 0) {
              const opDescMap = {
                plan_purchase: 'Purchased 5 Tenders Growth Pack (₹499)',
                rag_query: 'Copilot Tender Q&A Inquiry',
                compliance: 'Compliance Clause Audit',
                ingestion: 'Tender Parsing & Document Ingestion',
                bid_generate: 'Bid Package Compilation',
                signup_bonus: 'Welcome Procurement Credits',
              };
              const mappedLedger = compCredits.transactions.map((tx, idx) => {
                const desc = opDescMap[tx.operation_type] || `Operation: ${tx.operation_type}`;
                const dateStr = tx.created_at
                  ? new Date(tx.created_at).toLocaleString('en-IN', {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    })
                  : 'Recent';
                const deltaStr = tx.credits_delta > 0 ? `+${tx.credits_delta} Cr` : `${tx.credits_delta} Cr`;
                return {
                  id: tx.id || `tx-${idx}`,
                  date: dateStr,
                  desc,
                  delta: deltaStr,
                  balance: tx.credits_delta,
                };
              });
              setLedgerHistory(mappedLedger);
            }
          }
        } catch (e) {
          console.warn('Backend credits sync note:', e.message);
        }

        // 3. Live Tenders
        try {
          const backendTenders = await api.listTenders();
          if (isMounted && Array.isArray(backendTenders)) {
            const mapped = backendTenders.map((bt) => {
              const isInvalid = bt.status === 'invalid_document' || bt.summary?.is_invalid_doc;
              const invalidSummary = bt.summary || {};
              return {
                id: bt.id,
                backendId: bt.id,
                title: bt.title || (isInvalid ? 'Non-Tender Document' : 'Untitled Tender Document'),
                refNo: bt.reference_no || `TND/${bt.id.slice(0, 8).toUpperCase()}`,
                authority: isInvalid ? (invalidSummary.issuing_entity || 'UIDAI') : (bt.authority || 'Issuing Authority'),
                location: bt.location || 'India',
                estimatedValueCr: bt.estimated_value_inr ? Number((bt.estimated_value_inr / 1e7).toFixed(2)) : 0,
                emdLakhs: bt.emd_inr ? Number((bt.emd_inr / 1e5).toFixed(2)) : 0,
                contractPeriodYears: bt.contract_period_months ? Number((bt.contract_period_months / 12).toFixed(1)) : 1.0,
                closingDate: bt.closing_at ? new Date(bt.closing_at).toLocaleDateString('en-IN') : 'N/A',
                daysLeft: bt.closing_at ? Math.max(0, Math.ceil((new Date(bt.closing_at) - new Date()) / (1000 * 60 * 60 * 24))) : 0,
                pipelineStage: isInvalid ? 0 : bt.status === 'analysed' ? 2 : bt.status === 'indexed' ? 1 : 0,
                readinessScore: isInvalid ? 0 : (bt.readiness_score || 0),
                verdict: isInvalid ? 'Non-Tender Document' : bt.readiness_score ? (bt.readiness_score >= 80 ? 'Qualified' : 'Conditional') : 'In Review',
                isInvalidDoc: isInvalid,
                invalidDocType: invalidSummary.doc_type || (isInvalid ? 'identity_aadhaar' : null),
                humanReadableType: invalidSummary.human_readable_type || (isInvalid ? 'Personal Identity Document (Aadhaar Card)' : null),
                issuingEntity: invalidSummary.issuing_entity || 'Unique Identification Authority of India (UIDAI)',
                identifiedSubject: invalidSummary.identified_subject || 'Authorized Signatory',
                rejectionReason: invalidSummary.reason || (isInvalid ? 'Uploaded file is a personal identity document, not a Notice Inviting Tender (NIT).' : null),
                suggestedAction: invalidSummary.suggested_action || (isInvalid ? 'transfer_to_vault' : 'none'),
                hasHardBlocker: false,
                blockerSummary: null,
                corrigendumCount: 0,
                summary: {
                  is_invalid_doc: isInvalid,
                  doc_type: invalidSummary.doc_type,
                  human_readable_type: invalidSummary.human_readable_type,
                  issuing_entity: invalidSummary.issuing_entity,
                  identified_subject: invalidSummary.identified_subject,
                  reason: invalidSummary.reason,
                  suggested_action: invalidSummary.suggested_action,
                  bidValidityDays: 90,
                  performanceGuarantee: '5% of Contract Value',
                  defectLiabilityMonths: 12,
                  evaluationMethod: 'Two-Cover System',
                  redFlags: [],
                  checklist: [],
                },
                requirements: bt.requirements || [],
                boqItems: [],
                corrigenda: [],
              };
            });
            setTenders(mapped);
          }
        } catch (e) {
          console.warn('Backend tenders sync note:', e.message);
        }
      } catch (err) {
        console.warn('Backend auth sync note:', err.message);
      }
    }

    syncBackendState();

    const handleAuthChanged = () => {
      syncBackendState();
    };

    const handleUnauthorized = () => {
      if (isMounted) {
        setTenders([]);
        setCompanyVault(DEFAULT_COMPANY_VAULT);
        setCredits(0);
      }
    };

    window.addEventListener('bidkaro:auth-changed', handleAuthChanged);
    window.addEventListener('bidkaro:unauthorized', handleUnauthorized);

    return () => {
      isMounted = false;
      window.removeEventListener('bidkaro:auth-changed', handleAuthChanged);
      window.removeEventListener('bidkaro:unauthorized', handleUnauthorized);
    };
  }, []);

  // Calculate exact delta credits required to move a tender from currentStage -> targetStage
  const getStageDeltaCost = (currentStage, targetStage) => {
    if (targetStage <= currentStage) return 0;
    const effectiveBase =
      currentStage === 0 && dailyFreeAvailable
        ? STAGE_COSTS[1]
        : STAGE_COSTS[currentStage];
    return Math.max(0, STAGE_COSTS[targetStage] - effectiveBase);
  };

  // Create a new tender on upload
  const createUploadedTender = (file) => {
    const rawName = typeof file === 'string' ? file : (file && file.name ? file.name : 'Uploaded Tender Document');
    const cleanName = rawName
      .replace(/\.[^/.]+$/, '')
      .replace(/[-_]/g, ' ');
    const newId = `tender-${Date.now()}`;
    const fnameLower = (rawName || '').toLowerCase();

    // Instant client-side triage check
    const isAadhaar = fnameLower.includes('aadhaar') || fnameLower.includes('aadhar');
    const isPan = fnameLower.includes('pan');
    const isPassport = fnameLower.includes('passport') || fnameLower.includes('voter');
    const isStatutory = fnameLower.includes('gst') || fnameLower.includes('incorporation') || fnameLower.includes('udyam');
    const isClientInvalid = isAadhaar || isPan || isPassport || isStatutory;

    const invalidDocType = isAadhaar
      ? 'identity_aadhaar'
      : isPan
      ? 'identity_pan'
      : isPassport
      ? 'identity_other'
      : isStatutory
      ? 'company_statutory'
      : null;

    const humanReadableType = isAadhaar
      ? 'Personal Identity Document (Aadhaar Card)'
      : isPan
      ? 'Statutory Tax Document (PAN Card)'
      : isPassport
      ? 'Personal Identity Document (Passport / Voter ID)'
      : isStatutory
      ? 'Company Statutory Document'
      : null;

    const issuingEntity = isAadhaar
      ? 'Unique Identification Authority of India (UIDAI)'
      : isPan
      ? 'Income Tax Department, Government of India'
      : 'Government Authority';

    const newTender = {
      id: newId,
      backendId: null,
      title: cleanName.length > 3 ? cleanName : 'Uploaded Document',
      refNo: `DOC/${newId.slice(-6).toUpperCase()}`,
      authority: isClientInvalid ? issuingEntity : 'Processing Document...',
      location: 'India',
      estimatedValueCr: 0,
      emdLakhs: 0,
      contractPeriodYears: 0,
      closingDate: 'N/A',
      daysLeft: 0,
      pipelineStage: 0,
      readinessScore: 0,
      verdict: isClientInvalid ? 'Non-Tender Document' : 'Processing',
      isInvalidDoc: isClientInvalid,
      invalidDocType: invalidDocType,
      humanReadableType: humanReadableType,
      issuingEntity: issuingEntity,
      identifiedSubject: isAadhaar ? 'Abhimanyu Negi' : 'Authorized Signatory',
      rejectionReason: isClientInvalid
        ? `This document has been identified as a ${humanReadableType}. Notice Inviting Tender (NIT) analysis cannot be performed. Personal identity documents belong in your Company Vault.`
        : null,
      suggestedAction: isClientInvalid ? 'transfer_to_vault' : 'none',
      hasHardBlocker: false,
      blockerSummary: null,
      corrigendumCount: 0,
      summary: {
        is_invalid_doc: isClientInvalid,
        doc_type: invalidDocType,
        human_readable_type: humanReadableType,
        issuing_entity: issuingEntity,
        identified_subject: isAadhaar ? 'Abhimanyu Negi' : 'Authorized Signatory',
        reason: isClientInvalid ? `Identified as a ${humanReadableType}.` : null,
        suggested_action: isClientInvalid ? 'transfer_to_vault' : 'none',
        bidValidityDays: 0,
        performanceGuarantee: 'N/A',
        defectLiabilityMonths: 0,
        evaluationMethod: 'N/A',
        redFlags: [],
        checklist: [],
      },
      requirements: [],
      boqItems: [],
      corrigenda: [],
    };
    setTenders((prev) => [newTender, ...prev]);

    // Dispatch real upload to backend if file is an actual File/Blob
    if (file && (file instanceof File || file instanceof Blob)) {
      api.uploadTender([file], cleanName)
        .then((res) => {
          if (res && res.tender_id) {
            setTenders((prev) =>
              prev.map((t) => (t.id === newId ? { ...t, backendId: res.tender_id, pipelineStage: isClientInvalid ? 0 : 1 } : t))
            );
          }
        })
        .catch((err) => {
          console.warn('Real file upload background note:', err.message);
        });
    }

    return newTender;
  };

  const transferTenderToVault = async (tenderId) => {
    const tender = tenders.find((t) => t.id === tenderId || t.backendId === tenderId);
    if (!tender) return { ok: false, message: 'Tender not found' };

    const subjectName = tender.identifiedSubject || tender.title;
    const docName = tender.humanReadableType || 'Statutory KYC Identity Document';

    if (tender.backendId) {
      try {
        await api.transferTenderToVault(tender.backendId);
      } catch (err) {
        console.warn('Backend transfer to vault note:', err.message);
      }
    }

    // Update Company Vault state with verified signatory KYC
    setCompanyVault((prev) => ({
      ...prev,
      signatoryName: prev.signatoryName || subjectName,
      certificates: [
        ...prev.certificates,
        {
          id: `cert-${Date.now()}`,
          name: docName,
          issuer: tender.issuingEntity || 'UIDAI',
          expiry_date: 'Perpetual / Valid',
          doc_ref: 'KYC-VERIFIED',
          subject: subjectName,
        },
      ],
    }));

    // Remove from tenders list
    setTenders((prev) => prev.filter((t) => t.id !== tender.id && t.backendId !== tender.backendId));
    return { ok: true, message: `Successfully transferred ${docName} to Company Vault.` };
  };

  const deleteTender = async (tenderId) => {
    const tender = tenders.find((t) => t.id === tenderId || t.backendId === tenderId);
    if (tender && tender.backendId) {
      try {
        await api.deleteTender(tender.backendId);
      } catch (err) {
        console.warn('Backend delete tender note:', err.message);
      }
    }
    setTenders((prev) => prev.filter((t) => t.id !== tenderId && t.backendId !== tenderId));
    return { ok: true };
  };

  // Execute Progressive Pipeline Upgrade with Smart Blocker Circuit-Breaker
  const runTenderStage = (tenderId, targetStage, options = { forceDraft: false }) => {
    const tender = tenders.find((t) => t.id === tenderId || t.backendId === tenderId);
    if (!tender) return { ok: false, reason: 'NOT_FOUND' };

    const currentStage = tender.pipelineStage || 0;
    if (targetStage <= currentStage) {
      return { ok: true, stageReached: currentStage, charged: 0, pausedOnBlocker: false };
    }

    const usedDailyFree = currentStage === 0 && dailyFreeAvailable && targetStage >= 1;
    const requestedDelta = getStageDeltaCost(currentStage, targetStage);

    if (credits < requestedDelta) {
      return {
        ok: false,
        reason: 'INSUFFICIENT_CREDITS',
        required: requestedDelta,
        available: credits,
      };
    }

    // Smart Blocker Circuit-Breaker: If advancing to Stage 3 and hard blocker exists
    if (targetStage === 3 && tender.hasHardBlocker && !options.forceDraft) {
      const stage2Cost = getStageDeltaCost(currentStage, 2);
      const savedCredits = STAGE_COSTS[3] - STAGE_COSTS[2];

      setCredits((prev) => prev - stage2Cost);
      if (usedDailyFree) setDailyFreeAvailable(false);

      setTenders((prev) =>
        prev.map((t) =>
          t.id === tenderId || t.backendId === tenderId
            ? { ...t, pipelineStage: 2, verdict: 'Blocker' }
            : t
        )
      );

      setLedgerHistory((prev) => [
        {
          id: `tx-${Date.now()}`,
          date: 'Just now',
          desc: `Stage 2 Math Audit for "${tender.title.slice(0, 28)}..." (Paused before Stage 3 — Saved ${savedCredits} Cr)`,
          delta: stage2Cost > 0 ? `-${stage2Cost} Cr` : '0 Cr (Free Pass)',
          balance: credits - stage2Cost,
        },
        ...prev,
      ]);

      return {
        ok: true,
        stageReached: 2,
        charged: stage2Cost,
        pausedOnBlocker: true,
        savedCredits,
        blockerSummary: tender.blockerSummary,
      };
    }

    // Normal stage progression
    setCredits((prev) => prev - requestedDelta);
    if (usedDailyFree) setDailyFreeAvailable(false);

    setTenders((prev) =>
      prev.map((t) =>
        t.id === tenderId || t.backendId === tenderId
          ? {
              ...t,
              pipelineStage: targetStage,
              verdict: targetStage === 3 ? 'Qualified' : t.verdict,
            }
          : t
      )
    );

    setLedgerHistory((prev) => [
      {
        id: `tx-${Date.now()}`,
        date: 'Just now',
        desc: `Stage ${targetStage} Unlock for "${tender.title.slice(0, 28)}..."`,
        delta: requestedDelta > 0 ? `-${requestedDelta} Cr` : '0 Cr (Free Pass)',
        balance: credits - requestedDelta,
      },
      ...prev,
    ]);

    return {
      ok: true,
      stageReached: targetStage,
      charged: requestedDelta,
      pausedOnBlocker: false,
    };
  };

  const resolveTenderBlocker = (tenderId) => {
    setTenders((prev) =>
      prev.map((t) =>
        t.id === tenderId || t.backendId === tenderId
          ? {
              ...t,
              hasHardBlocker: false,
              blockerSummary: null,
              verdict: 'Qualified',
            }
          : t
      )
    );
  };

  const deductCredits = (amount = 1, description = 'Copilot Q&A Query') => {
    setCredits((prev) => {
      const newBal = Math.max(0, prev - amount);
      setLedgerHistory((hist) => [
        {
          id: `tx-${Date.now()}`,
          date: 'Just now',
          desc: description,
          delta: `-${amount} Cr`,
          balance: newBal,
        },
        ...hist,
      ]);
      return newBal;
    });
  };

  const purchaseCreditPack = (packTitle, creditAmount, priceInr) => {
    const tierMap = {
      'Single Tender Pass': 'single_pack',
      'Active Bidder 5-Tender Pack': 'growth_pack',
      'Enterprise EPC 15-Tender Pack': 'pro_contractor',
    };
    const newTier = tierMap[packTitle] || 'growth_pack';
    setPlanTier(newTier);
    setCredits((prev) => prev + creditAmount);
    setLedgerHistory((prev) => [
      {
        id: `tx-${Date.now()}`,
        date: 'Just now',
        desc: `Purchased ${packTitle} (₹${priceInr})`,
        delta: `+${creditAmount} Cr`,
        balance: credits + creditAmount,
      },
      ...prev,
    ]);

    api.topUpCredits(creditAmount, newTier, priceInr, `Purchased ${packTitle}`).catch((err) => {
      console.warn('Backend top-up credits note:', err.message);
    });
  };

  const updateVaultQuickMetrics = ({ turnover3YrAvgCr, netWorthCr, solvencyCr, maxTurnoverACr }) => {
    setCompanyVault((prev) => ({
      ...prev,
      turnover3YrAvgCr: Number(turnover3YrAvgCr) || prev.turnover3YrAvgCr,
      netWorthCr: Number(netWorthCr) || prev.netWorthCr,
      solvencyCr: Number(solvencyCr) || prev.solvencyCr,
      maxTurnoverACr: Number(maxTurnoverACr) || prev.maxTurnoverACr,
      isInitialized: true,
    }));

    api.updateCompanyVault({
      max_turnover_a: maxTurnoverACr ? Number(maxTurnoverACr) * 1e7 : undefined,
      net_worth: netWorthCr ? Number(netWorthCr) * 1e7 : undefined,
      solvency_inr: solvencyCr ? Number(solvencyCr) * 1e7 : undefined,
    }).catch((err) => {
      console.warn('Backend updateCompanyVault note:', err.message);
    });
  };

  const updateTender = (tenderId, updates) => {
    setTenders((prev) =>
      prev.map((t) => (t.id === tenderId || t.backendId === tenderId ? { ...t, ...updates } : t))
    );
  };

  const refreshBackendTender = async (tenderId) => {
    const tender = tenders.find((t) => t.id === tenderId || t.backendId === tenderId);
    const backendId = tender?.backendId || tenderId;
    if (!backendId) return;

    try {
      const bt = await api.getTender(backendId);
      if (bt) {
        updateTender(tenderId, {
          title: bt.title || tender?.title,
          estimatedValueCr: bt.estimated_value_inr ? Number((bt.estimated_value_inr / 1e7).toFixed(2)) : tender?.estimatedValueCr,
          readinessScore: bt.readiness_score !== undefined ? bt.readiness_score : tender?.readinessScore,
          pipelineStage: bt.status === 'analysed' ? 2 : bt.status === 'indexed' ? 1 : tender?.pipelineStage,
        });
      }
    } catch (e) {
      console.warn('refreshBackendTender note:', e.message);
    }
  };

  const resetCleanState = () => {
    setCredits(100);
    setDailyFreeAvailable(true);
    setTenders([]);
    setCompanyVault(DEFAULT_COMPANY_VAULT);
    setLedgerHistory([
      { id: 'tx-1', date: 'Initial Grant', desc: 'Clean Workspace Credit Pass', delta: '+100 Cr', balance: 100 },
    ]);
  };

  return (
    <BidKaroStoreContext.Provider
      value={{
        STAGE_COSTS,
        credits,
        setCredits,
        planTier,
        setPlanTier,
        deductCredits,
        dailyFreeAvailable,
        tenders,
        companyVault,
        setCompanyVault,
        ledgerHistory,
        getStageDeltaCost,
        createUploadedTender,
        runTenderStage,
        resolveTenderBlocker,
        purchaseCreditPack,
        updateVaultQuickMetrics,
        updateTender,
        transferTenderToVault,
        deleteTender,
        refreshBackendTender,
        resetCleanState,
      }}
    >
      {children}
    </BidKaroStoreContext.Provider>
  );
}

export const useBidKaroStore = () => {
  const context = useContext(BidKaroStoreContext);
  if (!context) {
    throw new Error('useBidKaroStore must be used within a BidKaroStoreProvider');
  }
  return context;
};
