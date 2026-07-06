import React, { useMemo, useState } from 'react';
import { estimateDualPlan, detectCariesBundle, type PlanEstimate, type ImplantSystem } from '../../utils/planEstimator';

interface Props {
  toothFdi: number;
  primarySystem: ImplantSystem;
  cariesSurfaces?: string[]; // e.g. ['M', 'O', 'D']
  showMarginPanel?: boolean;  // admin-only flag
}

const PHASE_ICONS: Record<number, string> = { 1: '🩺', 2: '🔩', 3: '👑' };

function formatRub(n: number): string {
  return n.toLocaleString('ru-RU') + ' ₽';
}

function MarginBar({ pct }: { pct: number }) {
  const color = pct >= 60 ? '#22c55e' : pct >= 40 ? '#f59e0b' : '#ef4444';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
      <div style={{ flex: 1, height: '6px', background: '#27272a', borderRadius: '3px', overflow: 'hidden' }}>
        <div style={{ width: `${Math.min(pct, 100)}%`, height: '100%', background: color, borderRadius: '3px', transition: 'width 0.4s ease' }} />
      </div>
      <span style={{ fontSize: '11px', fontWeight: 700, color, minWidth: '36px', textAlign: 'right' }}>{pct}%</span>
    </div>
  );
}

function PlanCard({ plan, isSelected, onSelect, showMargin }: {
  plan: PlanEstimate;
  isSelected: boolean;
  onSelect: () => void;
  showMargin: boolean;
}) {
  const tierColor = plan.tier === 'premium' ? '#f59e0b' : '#22d3ee';
  const tierLabel = plan.tier === 'premium' ? 'ПРЕМИУМ' : 'СТАНДАРТ';

  return (
    <div
      onClick={onSelect}
      style={{
        flex: 1,
        minWidth: 0,
        background: isSelected ? '#0c0c10' : '#09090b',
        border: `2px solid ${isSelected ? tierColor : '#27272a'}`,
        borderRadius: '12px',
        padding: '16px',
        cursor: 'pointer',
        transition: 'border-color 0.2s, background 0.2s',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
        <div>
          <div style={{ fontSize: '10px', fontWeight: 800, color: tierColor, letterSpacing: '1px', marginBottom: '2px' }}>
            {tierLabel}
          </div>
          <div style={{ fontSize: '12px', color: '#a1a1aa' }}>{plan.systemName}</div>
        </div>
        <div style={{ fontSize: '20px', fontWeight: 800, color: '#e4e4e7' }}>{formatRub(plan.totalRevenue)}</div>
      </div>

      {/* Phases */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '12px' }}>
        {plan.phases.map(ph => (
          <div key={ph.phase} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 8px', background: '#18181b', borderRadius: '6px' }}>
            <span style={{ fontSize: '11px', color: '#71717a' }}>{PHASE_ICONS[ph.phase]} {ph.name}</span>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <span style={{ fontSize: '10px', color: '#52525b' }}>{ph.durationMinutes}мин</span>
              <span style={{ fontSize: '11px', fontWeight: 600, color: '#a1a1aa' }}>{formatRub(ph.revenue)}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Margin (admin only) */}
      {showMargin && (
        <div style={{ borderTop: '1px solid #27272a', paddingTop: '10px' }}>
          <div style={{ fontSize: '10px', color: '#52525b', marginBottom: '2px' }}>
            Маржа клиники (после материалов)
          </div>
          <div style={{ fontSize: '13px', fontWeight: 700, color: '#22c55e' }}>
            {formatRub(plan.grossProfit)}
          </div>
          <MarginBar pct={plan.grossMarginPct} />
          <div style={{ fontSize: '10px', color: '#52525b', marginTop: '4px' }}>
            Материалы: {formatRub(plan.totalMaterialCost)}
          </div>
        </div>
      )}

      {/* Selection indicator */}
      {isSelected && (
        <div style={{ marginTop: '10px', textAlign: 'center', fontSize: '11px', color: tierColor, fontWeight: 700 }}>
          ✓ Выбран пациентом
        </div>
      )}
    </div>
  );
}

export function PlanEstimatorPanel({ toothFdi, primarySystem, cariesSurfaces = [], showMarginPanel = false }: Props) {
  const [selectedTier, setSelectedTier] = useState<'standard' | 'premium'>('standard');

  const { standard, premium } = useMemo(
    () => estimateDualPlan(toothFdi, primarySystem),
    [toothFdi, primarySystem]
  );

  const bundle = useMemo(
    () => cariesSurfaces.length > 0 ? detectCariesBundle(cariesSurfaces) : null,
    [cariesSurfaces]
  );

  return (
    <div style={{ fontFamily: 'monospace', fontSize: '12px' }}>
      {/* Header */}
      <div style={{ padding: '12px 16px', borderBottom: '1px solid #27272a', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: '12px', fontWeight: 700, color: '#e4e4e7' }}>
            💰 Сметы лечения — Зуб FDI {toothFdi}
          </div>
          <div style={{ fontSize: '10px', color: '#52525b', marginTop: '2px' }}>Две альтернативы для пациента</div>
        </div>
        {showMarginPanel && (
          <div style={{ fontSize: '10px', background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', color: '#86efac', padding: '3px 8px', borderRadius: '4px' }}>
            👁 РЕЖИМ АДМИНИСТРАТОРА
          </div>
        )}
      </div>

      {/* Smart Bundle Warning */}
      {bundle?.isComplex && (
        <div style={{ margin: '12px 16px 0', padding: '10px 12px', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: '8px' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#fbbf24', marginBottom: '4px' }}>
            ⚠ Умный пакет услуг (Smart Bundle)
          </div>
          <div style={{ fontSize: '10px', color: '#d97706', lineHeight: 1.5 }}>
            Выявлено {bundle.surfaceCount} поверхности кариеса ({bundle.surfaces.join('+')}).
            Рекомендована: <strong>{bundle.recommendedName}</strong>
          </div>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#fbbf24', marginTop: '4px' }}>
            {formatRub(bundle.basePrice)}
          </div>
        </div>
      )}

      {/* Plan cards */}
      <div style={{ display: 'flex', gap: '12px', padding: '16px' }}>
        <PlanCard
          plan={standard}
          isSelected={selectedTier === 'standard'}
          onSelect={() => setSelectedTier('standard')}
          showMargin={showMarginPanel}
        />
        <PlanCard
          plan={premium}
          isSelected={selectedTier === 'premium'}
          onSelect={() => setSelectedTier('premium')}
          showMargin={showMarginPanel}
        />
      </div>

      {/* Selected plan CTA */}
      <div style={{ padding: '0 16px 16px' }}>
        <button
          style={{
            width: '100%',
            padding: '10px',
            background: selectedTier === 'premium' ? 'linear-gradient(135deg, #f59e0b, #d97706)' : 'linear-gradient(135deg, #22d3ee, #0891b2)',
            color: '#000',
            fontWeight: 800,
            fontSize: '12px',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            letterSpacing: '0.5px',
          }}
        >
          ✓ Утвердить {selectedTier === 'premium' ? 'Премиум' : 'Стандарт'} план и создать задачи в календарь
        </button>
      </div>
    </div>
  );
}
