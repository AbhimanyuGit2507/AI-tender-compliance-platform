// BidKaro Clean Data Store Schema
// Neutralized to prevent any dummy or template data leakage into the frontend

export const COMPANY = {
  name: 'Apex Infra Projects Pvt. Ltd.',
  gstin: '',
  businessType: 'Civil & EPC Infrastructure Contractor',
  location: 'Pune, Maharashtra',
  yearsInBusiness: 0,
  turnover: '₹0.00 Cr',
  turnoverValue: 0,
  netWorth: '₹0.00 Cr',
  contactPerson: 'Rajesh Sharma',
  email: 'rajesh@apexinfra.in',
  phone: '',
  stats: {
    documents: 0,
    projects: 0,
    certifications: 0,
    financialRecords: 0,
    previousResponses: 0,
  },
};

export const MAIN_TENDER = null;

export const TENDERS = [];

export const REQUIREMENTS = [];

export const COMPLIANCE_SUMMARY = {
  total: 0,
  passed: 0,
  flagged: 0,
  failed: 0,
  blockers: 0,
  score: 0,
};

export const PROJECTS = [];

export const CERTIFICATIONS = [];

export const COMPANY_DOCUMENTS = [];

export const FINANCIALS = [];

export const BOQ_ITEMS = [];

export const GENERATED_DOCUMENTS = [];

export const COPILOT_CONVERSATION = [];

export const MARKET_TENDERS = [];

export const POLICIES = [];

export const CORRIGENDUM = {
  items: [],
};

export const AUDIT_ITEMS = [];

export const NOTIFICATIONS = [];

export const ACTIVITY = [];

export default {
  COMPANY,
  MAIN_TENDER,
  TENDERS,
  REQUIREMENTS,
  COMPLIANCE_SUMMARY,
  PROJECTS,
  CERTIFICATIONS,
  COMPANY_DOCUMENTS,
  FINANCIALS,
  BOQ_ITEMS,
  GENERATED_DOCUMENTS,
  COPILOT_CONVERSATION,
  MARKET_TENDERS,
  POLICIES,
  CORRIGENDUM,
  AUDIT_ITEMS,
  NOTIFICATIONS,
  ACTIVITY,
};
