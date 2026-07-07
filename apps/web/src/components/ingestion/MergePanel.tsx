import React, { useState } from 'react';
import { Users, AlertTriangle, ArrowRight, Check } from 'lucide-react';

export interface PatientRecord {
  id: string;
  fullName: string;
  birthDate?: string | null;
  phone?: string | null;
  source: string;
}

interface MergePanelProps {
  incoming: PatientRecord;
  existing: PatientRecord;
  confidenceScore: number;
  onMerge: (canonicalId: string) => void;
  onKeepSeparate: () => void;
}

export function MergePanel({ incoming, existing, confidenceScore, onMerge, onKeepSeparate }: MergePanelProps) {
  const [selectedCanonical, setSelectedCanonical] = useState<string>(existing.id);

  const renderField = (label: string, valInc: string | null | undefined, valEx: string | null | undefined) => {
    const isDifferent = valInc && valEx && valInc.toLowerCase().trim() !== valEx.toLowerCase().trim();
    
    return (
      <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr 1fr', gap: '16px', padding: '12px', borderBottom: '1px solid #27272a', alignItems: 'center' }}>
        <div style={{ fontSize: '13px', color: '#a1a1aa', fontWeight: 600 }}>{label}</div>
        <div style={{ 
          padding: '8px', 
          background: isDifferent ? 'rgba(239, 68, 68, 0.1)' : 'transparent',
          border: isDifferent ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid transparent',
          borderRadius: '6px',
          color: '#f4f4f5',
          fontSize: '14px'
        }}>
          {valInc || '-'}
        </div>
        <div style={{ 
          padding: '8px', 
          background: isDifferent ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
          border: isDifferent ? '1px solid rgba(59, 130, 246, 0.3)' : '1px solid transparent',
          borderRadius: '6px',
          color: '#f4f4f5',
          fontSize: '14px'
        }}>
          {valEx || '-'}
        </div>
      </div>
    );
  };

  return (
    <div style={{ padding: '24px', backgroundColor: '#09090b', color: '#e4e4e7', fontFamily: 'Inter, sans-serif', maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px', background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.3)', padding: '16px', borderRadius: '12px' }}>
        <AlertTriangle color="#f59e0b" size={24} />
        <div>
          <h2 style={{ margin: '0 0 4px 0', fontSize: '16px', color: '#f59e0b' }}>Merge Conflict Detected</h2>
          <p style={{ margin: 0, fontSize: '13px', color: '#fbbf24' }}>Confidence Score: <strong>{(confidenceScore * 100).toFixed(1)}%</strong>. Manual resolution required.</p>
        </div>
      </div>

      <div style={{ border: '1px solid #3f3f46', borderRadius: '12px', background: '#18181b', overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr 1fr', gap: '16px', padding: '16px', background: '#27272a', borderBottom: '1px solid #3f3f46', fontWeight: 600 }}>
          <div>Field</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }} onClick={() => setSelectedCanonical(incoming.id)}>
            <div style={{ width: '16px', height: '16px', borderRadius: '50%', border: '2px solid #a1a1aa', display: 'flex', alignItems: 'center', justifyContent: 'center', background: selectedCanonical === incoming.id ? '#10b981' : 'transparent', borderColor: selectedCanonical === incoming.id ? '#10b981' : '#a1a1aa' }}>
              {selectedCanonical === incoming.id && <Check size={10} color="#000" />}
            </div>
            Incoming ({incoming.source})
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }} onClick={() => setSelectedCanonical(existing.id)}>
            <div style={{ width: '16px', height: '16px', borderRadius: '50%', border: '2px solid #a1a1aa', display: 'flex', alignItems: 'center', justifyContent: 'center', background: selectedCanonical === existing.id ? '#3b82f6' : 'transparent', borderColor: selectedCanonical === existing.id ? '#3b82f6' : '#a1a1aa' }}>
              {selectedCanonical === existing.id && <Check size={10} color="#000" />}
            </div>
            Existing (Database)
          </div>
        </div>

        {renderField('Full Name', incoming.fullName, existing.fullName)}
        {renderField('Birth Date', incoming.birthDate, existing.birthDate)}
        {renderField('Phone Number', incoming.phone, existing.phone)}
        
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
        <button onClick={onKeepSeparate} style={{ background: 'transparent', border: '1px solid #3f3f46', color: '#a1a1aa', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}>
          Keep Separate (Create New)
        </button>
        <button onClick={() => onMerge(selectedCanonical)} style={{ background: '#10b981', color: '#000', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
          Merge Selected <ArrowRight size={16} />
        </button>
      </div>
    </div>
  );
}
