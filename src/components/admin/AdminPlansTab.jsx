import React from 'react';
import {
  Plus,
  CheckCircle2,
  Edit3,
  X,
  Trash2,
} from 'lucide-react';
import api from '../../services/api';

export function AdminPlansTab({
  plans,
  setEditingPlan,
  editingPlan,
  planForm,
  setPlanForm,
  newFeatureText,
  setNewFeatureText,
  handleSavePlan,
  planSaveSubmitting,
  showToast,
  fetchPlans,
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h3 style={{ fontSize: 16, fontWeight: 800 }}>Subscription & Credit Packs Configuration</h3>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
            All changes made here update database records immediately and synchronize live across user settings and checkout.
          </p>
        </div>
        <button
          onClick={() => {
            setEditingPlan(null);
            setPlanForm({
              id: `pack_${Date.now()}`,
              name: 'Custom Contractor Pack',
              badge: 'Special Offer',
              price_inr: 799.0,
              credits: 800,
              effective_per_tender: '₹79 / tender',
              features: ['Full Tender Lifecycle Analysis', 'Technical Compliance Matrix', 'DOCX Bid Bundles'],
              is_popular: false,
              is_active: true,
              sort_order: plans.length + 1,
            });
          }}
          className="btn btn-primary"
          style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}
        >
          <Plus size={14} />
          <span>Create New Plan</span>
        </button>
      </div>

      {/* Plans Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 }}>
        {plans.map((p) => (
          <div
            key={p.id}
            className="surface-card"
            style={{
              padding: 24,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              border: p.is_popular ? '1px solid var(--accent-primary)' : '1px solid var(--border-subtle)',
              position: 'relative',
            }}
          >
            {p.is_popular && (
              <div
                style={{
                  position: 'absolute',
                  top: 12,
                  right: 12,
                  padding: '2px 8px',
                  borderRadius: 999,
                  background: 'var(--accent-primary)',
                  color: '#FFFFFF',
                  fontSize: 10,
                  fontWeight: 800,
                }}
              >
                POPULAR
              </div>
            )}

            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent-primary)', textTransform: 'uppercase', marginBottom: 4 }}>
                {p.badge || 'Tender Pack'}
              </div>
              <h4 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 8 }}>
                {p.name}
              </h4>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 12 }}>
                <span style={{ fontSize: 28, fontWeight: 900, fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>
                  ₹{p.price_inr}
                </span>
                <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                  ({p.effective_per_tender || `${p.credits} Credits`})
                </span>
              </div>

              <div style={{ padding: '8px 12px', background: 'var(--bg-elevated)', borderRadius: 8, fontSize: 12, fontWeight: 600, color: '#10b981', marginBottom: 16 }}>
                ⚡ {p.credits} Procurement Credits Included
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
                {(p.features || []).map((feat, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--text-secondary)' }}>
                    <CheckCircle2 size={13} color="#10b981" />
                    <span>{feat}</span>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, borderTop: '1px solid var(--border-subtle)', paddingTop: 16 }}>
              <button
                onClick={() => {
                  setEditingPlan(p);
                  setPlanForm({ ...p, features: [...(p.features || [])] });
                }}
                className="btn btn-secondary"
                style={{ flex: 1, fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
              >
                <Edit3 size={13} /> Edit Plan
              </button>
              <button
                onClick={async () => {
                  try {
                    await api.updateAdminPlan(p.id, { ...p, is_active: !p.is_active });
                    showToast(`Plan ${p.name} ${p.is_active ? 'deactivated' : 'activated'}`);
                    fetchPlans();
                  } catch (err) {
                    showToast('Failed to toggle status', 'error');
                  }
                }}
                style={{
                  padding: '6px 12px',
                  borderRadius: 8,
                  border: '1px solid var(--border-subtle)',
                  background: p.is_active ? 'rgba(239,68,68,0.08)' : 'rgba(16,185,129,0.08)',
                  color: p.is_active ? '#ef4444' : '#10b981',
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {p.is_active ? 'Deactivate' : 'Activate'}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Plan Editor Modal */}
      {planForm && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.7)',
            backdropFilter: 'blur(8px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
          }}
        >
          <div
            className="surface-card animate-in"
            style={{
              maxWidth: 580,
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: 28,
              position: 'relative',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ fontSize: 18, fontWeight: 800 }}>
                {editingPlan ? `Edit Plan: ${editingPlan.name}` : 'Create Subscription Plan'}
              </h3>
              <button
                onClick={() => {
                  setPlanForm(null);
                  setEditingPlan(null);
                }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSavePlan} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
                    Plan ID (Slug) *
                  </label>
                  <input
                    type="text"
                    disabled={Boolean(editingPlan)}
                    value={planForm.id}
                    onChange={(e) => setPlanForm({ ...planForm, id: e.target.value })}
                    required
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      background: 'var(--bg-elevated)',
                      border: '1px solid var(--border-strong)',
                      borderRadius: 8,
                      color: 'var(--text-primary)',
                      fontFamily: 'var(--font-mono)',
                      fontSize: 12.5,
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
                    Display Name *
                  </label>
                  <input
                    type="text"
                    value={planForm.name}
                    onChange={(e) => setPlanForm({ ...planForm, name: e.target.value })}
                    required
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      background: 'var(--bg-elevated)',
                      border: '1px solid var(--border-strong)',
                      borderRadius: 8,
                      color: 'var(--text-primary)',
                      fontSize: 12.5,
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
                    Price in INR (₹) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={planForm.price_inr}
                    onChange={(e) => setPlanForm({ ...planForm, price_inr: parseFloat(e.target.value) || 0 })}
                    required
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      background: 'var(--bg-elevated)',
                      border: '1px solid var(--border-strong)',
                      borderRadius: 8,
                      color: 'var(--text-primary)',
                      fontFamily: 'var(--font-mono)',
                      fontSize: 13,
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
                    Credits Allotment *
                  </label>
                  <input
                    type="number"
                    value={planForm.credits}
                    onChange={(e) => setPlanForm({ ...planForm, credits: parseInt(e.target.value, 10) || 0 })}
                    required
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      background: 'var(--bg-elevated)',
                      border: '1px solid var(--border-strong)',
                      borderRadius: 8,
                      color: 'var(--text-primary)',
                      fontFamily: 'var(--font-mono)',
                      fontSize: 13,
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
                    Badge Label (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Best Value · 67% Off"
                    value={planForm.badge || ''}
                    onChange={(e) => setPlanForm({ ...planForm, badge: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      background: 'var(--bg-elevated)',
                      border: '1px solid var(--border-strong)',
                      borderRadius: 8,
                      color: 'var(--text-primary)',
                      fontSize: 12.5,
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
                    Effective Per Tender Note
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. ₹66.6 / tender"
                    value={planForm.effective_per_tender || ''}
                    onChange={(e) => setPlanForm({ ...planForm, effective_per_tender: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      background: 'var(--bg-elevated)',
                      border: '1px solid var(--border-strong)',
                      borderRadius: 8,
                      color: 'var(--text-primary)',
                      fontSize: 12.5,
                    }}
                  />
                </div>
              </div>

              {/* Features List Tags */}
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
                  Plan Features (Bullet Points)
                </label>
                <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                  <input
                    type="text"
                    placeholder="Add feature description..."
                    value={newFeatureText}
                    onChange={(e) => setNewFeatureText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (newFeatureText.trim()) {
                          setPlanForm({
                            ...planForm,
                            features: [...(planForm.features || []), newFeatureText.trim()],
                          });
                          setNewFeatureText('');
                        }
                      }
                    }}
                    style={{
                      flex: 1,
                      padding: '8px 12px',
                      background: 'var(--bg-elevated)',
                      border: '1px solid var(--border-strong)',
                      borderRadius: 8,
                      color: 'var(--text-primary)',
                      fontSize: 12.5,
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (newFeatureText.trim()) {
                        setPlanForm({
                          ...planForm,
                          features: [...(planForm.features || []), newFeatureText.trim()],
                        });
                        setNewFeatureText('');
                      }
                    }}
                    className="btn btn-secondary"
                    style={{ padding: '8px 14px', fontSize: 12 }}
                  >
                    Add
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {(planForm.features || []).map((feat, fIdx) => (
                    <div
                      key={fIdx}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '6px 10px',
                        background: 'var(--bg-elevated)',
                        borderRadius: 6,
                        fontSize: 12,
                      }}
                    >
                      <span>{feat}</span>
                      <button
                        type="button"
                        onClick={() => {
                          const updated = [...planForm.features];
                          updated.splice(fIdx, 1);
                          setPlanForm({ ...planForm, features: updated });
                        }}
                        style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Toggles */}
              <div style={{ display: 'flex', gap: 20, padding: '10px 0' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={planForm.is_popular}
                    onChange={(e) => setPlanForm({ ...planForm, is_popular: e.target.checked })}
                  />
                  <span>Mark as "Most Popular"</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={planForm.is_active}
                    onChange={(e) => setPlanForm({ ...planForm, is_active: e.target.checked })}
                  />
                  <span>Active & Available for Purchase</span>
                </label>
              </div>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 12 }}>
                <button
                  type="button"
                  onClick={() => {
                    setPlanForm(null);
                    setEditingPlan(null);
                  }}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={planSaveSubmitting}
                  className="btn btn-primary"
                  style={{ minWidth: 140 }}
                >
                  {planSaveSubmitting ? 'Publishing...' : 'Save & Publish Live'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

