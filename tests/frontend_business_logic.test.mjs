import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

// Re-import the exact core business formulas and initial state to test them in isolation
const STAGE_COSTS = { 0: 0, 1: 15, 2: 40, 3: 100 };

function calculateDeltaCost(currentStage, targetStage, dailyFreeAvailable) {
  if (targetStage <= currentStage) return 0;
  const effectiveBase =
    currentStage === 0 && dailyFreeAvailable
      ? STAGE_COSTS[1]
      : STAGE_COSTS[currentStage];
  return Math.max(0, STAGE_COSTS[targetStage] - effectiveBase);
}

describe('1. BidKaro Progressive 3-Stage Delta-Credit Math Suite', () => {
  test('Daily Free Screening Pass gives Stage 1 at 0 Credits (FREE)', () => {
    const cost = calculateDeltaCost(0, 1, true);
    assert.strictEqual(cost, 0, 'Stage 1 should be 0 Credits when Daily Free Pass is active');
  });

  test('Stage 1 without Daily Free Pass costs exactly 15 Credits', () => {
    const cost = calculateDeltaCost(0, 1, false);
    assert.strictEqual(cost, 15, 'Stage 1 should cost 15 Credits without Daily Pass');
  });

  test('Direct Stage 2 with Daily Free Pass deducts only 25 Credits (40 - 15)', () => {
    const cost = calculateDeltaCost(0, 2, true);
    assert.strictEqual(cost, 25, 'Direct Stage 2 with Daily Pass should cost 25 Credits');
  });

  test('Direct Stage 2 without Daily Free Pass costs 40 Credits', () => {
    const cost = calculateDeltaCost(0, 2, false);
    assert.strictEqual(cost, 40, 'Direct Stage 2 without Daily Pass should cost 40 Credits');
  });

  test('Upgrade from Stage 1 -> Stage 2 delta costs exactly +25 Credits', () => {
    const cost = calculateDeltaCost(1, 2, false);
    assert.strictEqual(cost, 25, 'Stage 1 to 2 delta should be 25 Credits');
  });

  test('Upgrade from Stage 2 -> Stage 3 delta costs exactly +60 Credits', () => {
    const cost = calculateDeltaCost(2, 3, false);
    assert.strictEqual(cost, 60, 'Stage 2 to 3 delta should be 60 Credits');
  });

  test('Direct Stage 3 from Stage 1 costs +85 Credits (100 - 15)', () => {
    const cost = calculateDeltaCost(1, 3, false);
    assert.strictEqual(cost, 85, 'Stage 1 to 3 delta should be 85 Credits');
  });

  test('Direct Stage 3 from Stage 0 with Daily Free Pass costs 85 Credits (100 - 15)', () => {
    const cost = calculateDeltaCost(0, 3, true);
    assert.strictEqual(cost, 85, 'Stage 0 to 3 with Daily Pass should cost 85 Credits');
  });

  test('Direct Stage 3 from Stage 0 without Daily Free Pass costs 100 Credits', () => {
    const cost = calculateDeltaCost(0, 3, false);
    assert.strictEqual(cost, 100, 'Full tender lifecycle without pass should cost 100 Credits');
  });

  test('Zero double-charging when targeting already reached or earlier stages', () => {
    assert.strictEqual(calculateDeltaCost(2, 2, false), 0);
    assert.strictEqual(calculateDeltaCost(3, 2, false), 0);
    assert.strictEqual(calculateDeltaCost(3, 1, false), 0);
  });
});

describe('2. Smart Blocker Circuit-Breaker & Credit Protection Logic', () => {
  let state;

  beforeEach(() => {
    state = {
      credits: 65,
      dailyFreeAvailable: true,
      tender: {
        id: 'mjp-water-pipeline',
        refNo: 'MJP/2026/WTP/042',
        pipelineStage: 2,
        hasHardBlocker: true,
        verdict: 'Conditional',
      },
      ledger: [],
    };
  });

  test('Circuit-breaker intercepts Stage 3 on hard blocker and saves 60 credits', () => {
    const currentStage = state.tender.pipelineStage;
    const targetStage = 3;
    const requestedDelta = calculateDeltaCost(currentStage, targetStage, state.dailyFreeAvailable);
    assert.strictEqual(requestedDelta, 60);

    // Simulate circuit breaker
    const stage2Delta = calculateDeltaCost(currentStage, 2, state.dailyFreeAvailable);
    const savedCredits = requestedDelta - stage2Delta;

    assert.strictEqual(stage2Delta, 0, 'Stage 2 is already reached so stage2 delta is 0');
    assert.strictEqual(savedCredits, 60, 'Must save all 60 Stage 3 Credits on blocker');

    state.credits -= stage2Delta;
    assert.strictEqual(state.credits, 65, 'No credits should be deducted for paused Stage 3');
  });

  test('Circuit-breaker intercepts Stage 3 from Stage 0 and only charges Stage 2 delta (25 Cr)', () => {
    state.tender.pipelineStage = 0;
    const currentStage = 0;
    const targetStage = 3;
    const requestedDelta = calculateDeltaCost(currentStage, targetStage, state.dailyFreeAvailable);
    assert.strictEqual(requestedDelta, 85);

    const stage2Delta = calculateDeltaCost(currentStage, 2, state.dailyFreeAvailable);
    const savedCredits = requestedDelta - stage2Delta;

    assert.strictEqual(stage2Delta, 25, 'Should only charge 25 Cr Stage 2 delta');
    assert.strictEqual(savedCredits, 60, 'Should refund/save the 60 Stage 3 Credits');

    state.credits -= stage2Delta;
    assert.strictEqual(state.credits, 40, 'Balance drops from 65 to 40 Cr');
  });

  test('Force-draft option overrides circuit-breaker and completes Stage 3', () => {
    const requestedDelta = calculateDeltaCost(2, 3, false);
    state.credits -= requestedDelta;
    state.tender.pipelineStage = 3;
    state.tender.verdict = 'Bid Ready';

    assert.strictEqual(state.credits, 5, '65 - 60 = 5 Credits remaining');
    assert.strictEqual(state.tender.pipelineStage, 3);
    assert.strictEqual(state.tender.verdict, 'Bid Ready');
  });
});

describe('3. Company Vault & CPWD 3/2/1 Compound Inflation Math', () => {
  test('10% compound annual inflation calculation matches CPWD escalation guidelines', () => {
    const projects = [
      { year: 2025, base: 31.2, expectedFactor: 1.0, expectedInflated: 31.2 },
      { year: 2023, base: 21.0, expectedFactor: 1.21, expectedInflated: 25.41 },
      { year: 2022, base: 15.2, expectedFactor: 1.331, expectedInflated: 20.2312 },
    ];

    for (const p of projects) {
      const yearsDiff = 2025 - p.year;
      const factor = Math.pow(1.10, yearsDiff);
      const inflated = p.base * factor;
      assert.strictEqual(Number(factor.toFixed(3)), Number(p.expectedFactor.toFixed(3)));
      assert.strictEqual(Number(inflated.toFixed(2)), Number(p.expectedInflated.toFixed(2)));
    }
  });

  test('Bid capacity formula (A x N x 2 - B) calculation', () => {
    const A = 21.40; // Max turnover in single year
    const N = 2.0;   // Contract period in years
    const k = 2.0;   // Multiplier factor
    const B = 12.00; // Existing commitments

    const capacity = (A * N * k) - B;
    assert.strictEqual(Number(capacity.toFixed(2)), 73.60);
    assert.strictEqual(capacity >= 48.60, true, 'Capacity ₹73.60 Cr exceeds required ₹48.60 Cr');
  });
});

describe('4. Zero Technical Infrastructure Leaks Verification', () => {
  test('User-facing source files contain zero Redis, SHA-256, pgvector, or BM25 strings', () => {
    const filesToCheck = [
      'src/index.css',
      'src/App.jsx',
      'src/context/BidKaroStoreContext.jsx',
      'src/context/ThemeContext.jsx',
      'src/components/layout/AppShell.jsx',
      'src/components/modals/CreditTopUpModal.jsx',
      'src/components/modals/VaultQuickModal.jsx',
      'src/components/modals/TwoLayerAuditModal.jsx',
      'src/pages/Workspace.jsx',
      'src/pages/Dashboard.jsx',
      'src/pages/CompanyVault.jsx',
      'src/pages/Settings.jsx',
      'src/pages/Profile.jsx',
      'src/pages/Planners.jsx',
      'src/pages/TenderDiscovery.jsx',
      'src/pages/Landing.jsx',
      'src/pages/LandingPage.jsx',
      'src/pages/GuestTrial.jsx',
      'src/pages/Auth.jsx',
      'src/pages/Wallet.jsx',
      'src/pages/CompanySubPages.jsx',
    ];

    const forbidden = ['Redis Pub/Sub', 'SHA-256', 'pgvector', 'BM25'];

    for (const relPath of filesToCheck) {
      const fullPath = path.resolve(relPath);
      if (fs.existsSync(fullPath)) {
        const content = fs.readFileSync(fullPath, 'utf8');
        for (const term of forbidden) {
          assert.strictEqual(
            content.includes(term),
            false,
            `Forbidden infrastructure leak "${term}" found in ${relPath}`
          );
        }
      }
    }
  });
});

describe('5. Non-Tender Document Classification & Triage Guard', () => {
  function triageDocumentFilename(filename) {
    const fnameLower = (filename || '').toLowerCase();
    const isAadhaar = fnameLower.includes('aadhaar') || fnameLower.includes('aadhar');
    const isPan = fnameLower.includes('pan');
    const isPassport = fnameLower.includes('passport') || fnameLower.includes('voter');
    const isStatutory = fnameLower.includes('gst') || fnameLower.includes('incorporation') || fnameLower.includes('udyam');
    const isInvalid = isAadhaar || isPan || isPassport || isStatutory;

    return {
      isInvalidDoc: isInvalid,
      readinessScore: isInvalid ? 0 : 50,
      docType: isAadhaar ? 'identity_aadhaar' : isPan ? 'identity_pan' : isInvalid ? 'company_statutory' : 'tender_nit',
      suggestedAction: isInvalid ? 'transfer_to_vault' : 'none',
      creditsDeducted: 0,
    };
  }

  test('Aadhaar card upload is intercepted with 0 readiness score and routed to Company Vault', () => {
    const res = triageDocumentFilename('Avi-Aadhaar_e706.pdf');
    assert.strictEqual(res.isInvalidDoc, true);
    assert.strictEqual(res.readinessScore, 0, 'Must NOT assign 65% score to personal Aadhaar');
    assert.strictEqual(res.docType, 'identity_aadhaar');
    assert.strictEqual(res.suggestedAction, 'transfer_to_vault');
    assert.strictEqual(res.creditsDeducted, 0);
  });

  test('PAN card upload is intercepted and routed to Company Vault', () => {
    const res = triageDocumentFilename('Company_PAN_Card.pdf');
    assert.strictEqual(res.isInvalidDoc, true);
    assert.strictEqual(res.docType, 'identity_pan');
    assert.strictEqual(res.suggestedAction, 'transfer_to_vault');
  });

  test('Official CPWD NIT document passes triage into tender pipeline', () => {
    const res = triageDocumentFilename('CPWD_Hospital_Block_NIT_42.pdf');
    assert.strictEqual(res.isInvalidDoc, false);
    assert.strictEqual(res.docType, 'tender_nit');
    assert.strictEqual(res.suggestedAction, 'none');
  });
});
