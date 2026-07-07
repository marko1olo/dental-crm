import React, { useState } from 'react';
import { Database, Zap, CheckCircle, AlertTriangle, ArrowRight, Table } from 'lucide-react';

interface SchemaMapperDashboardProps {
  extractedTables: Record<string, string[]>;
  aiMapping: Record<string, string>;
  onApprove: (mapping: Record<string, string>) => void;
}

const CANONICAL_FIELDS = [
  'patients.fullName',
  'patients.birthDate',
  'patients.phone',
  'patients.email',
  'visits.scheduledAt',
  'visits.status',
  'procedures.price',
  'procedures.name',
  'procedures.tooth'
];

export function SchemaMapperDashboard({ extractedTables, aiMapping, onApprove }: SchemaMapperDashboardProps) {
  const [mapping, setMapping] = useState<Record<string, string>>(aiMapping);
  const [testResult, setTestResult] = useState<any[] | null>(null);

  const handleTestRun = () => {
    // Simulate test run
    setTestResult([
      { fullName: 'ИВАНОВ ИВАН ИВАНОВИЧ', birthDate: '1980-01-01', phone: '+79991234567' },
      { fullName: 'ПЕТРОВА АННА СЕРГЕЕВНА', birthDate: '1992-05-15', phone: '+79001112233' },
    ]);
  };

  return (
    <div style={{ padding: '24px', backgroundColor: '#09090b', minHeight: '100%', color: '#e4e4e7', fontFamily: 'Inter, sans-serif' }}>
      <header style={{ marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, margin: '0 0 8px 0', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Zap color="#eab308" />
            AI Schema Mapper
          </h1>
          <p style={{ margin: 0, color: '#a1a1aa', fontSize: '14px' }}>Map external database columns to Dente CRM canonical fields</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button onClick={handleTestRun} style={{ background: '#27272a', color: '#f4f4f5', border: '1px solid #3f3f46', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}>
            Test Run (10 Rows)
          </button>
          <button onClick={() => onApprove(mapping)} style={{ background: '#10b981', color: '#000', border: 'none', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: 700 }}>
            Approve & Save Template
          </button>
        </div>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 60px 1fr', gap: '20px', alignItems: 'start' }}>
        {/* Source Schema */}
        <div style={cardStyle}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Database size={16} /> Source Schema (Extracted)
          </h3>
          {Object.entries(extractedTables).map(([tableName, columns]) => (
            <div key={tableName} style={{ marginBottom: '16px' }}>
              <div style={{ padding: '8px 12px', background: 'rgba(63, 63, 70, 0.4)', borderRadius: '6px 6px 0 0', fontSize: '13px', fontWeight: 600, border: '1px solid #3f3f46', borderBottom: 'none' }}>
                <Table size={12} style={{ display: 'inline', marginRight: '6px' }} /> {tableName}
              </div>
              <div style={{ border: '1px solid #3f3f46', borderRadius: '0 0 6px 6px', background: '#18181b' }}>
                {columns.map(col => {
                  const sourceKey = `${tableName}.${col}`;
                  const isMapped = !!mapping[sourceKey];
                  return (
                    <div key={col} style={{ padding: '8px 12px', fontSize: '13px', display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #27272a', alignItems: 'center' }}>
                      <span style={{ color: '#e4e4e7' }}>{col}</span>
                      {isMapped && <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 8px #10b981' }} />}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Links Area */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: '100px', gap: '40px' }}>
          <ArrowRight color="#52525b" size={32} />
          <ArrowRight color="#52525b" size={32} />
          <ArrowRight color="#52525b" size={32} />
        </div>

        {/* Canonical Schema */}
        <div style={cardStyle}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '15px', display: 'flex', alignItems: 'center', gap: '8px', color: '#10b981' }}>
            <CheckCircle size={16} /> Canonical Dente Entities
          </h3>
          <div style={{ border: '1px solid #3f3f46', borderRadius: '8px', background: '#18181b', padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {CANONICAL_FIELDS.map(field => {
              // Find what maps to this
              const mappedSources = Object.entries(mapping).filter(([_, target]) => target === field).map(([src]) => src);
              
              return (
                <div key={field} style={{ padding: '10px', background: mappedSources.length > 0 ? 'rgba(16, 185, 129, 0.1)' : '#27272a', border: `1px solid ${mappedSources.length > 0 ? '#10b981' : '#3f3f46'}`, borderRadius: '6px', fontSize: '13px' }}>
                  <div style={{ fontWeight: 600, color: '#f4f4f5', marginBottom: '4px' }}>{field}</div>
                  {mappedSources.length > 0 ? (
                    <div style={{ fontSize: '11px', color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      ← Mapped from: {mappedSources.join(', ')}
                    </div>
                  ) : (
                    <div style={{ fontSize: '11px', color: '#71717a' }}>Unmapped</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {testResult && (
        <div style={{ marginTop: '24px', ...cardStyle }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '15px', color: '#eab308' }}>Test Run Preview</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #3f3f46', color: '#a1a1aa', textAlign: 'left' }}>
                <th style={{ padding: '12px 8px' }}>Full Name</th>
                <th style={{ padding: '12px 8px' }}>Birth Date</th>
                <th style={{ padding: '12px 8px' }}>Phone</th>
              </tr>
            </thead>
            <tbody>
              {testResult.map((row, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid #27272a' }}>
                  <td style={{ padding: '12px 8px', color: '#f4f4f5' }}>{row.fullName}</td>
                  <td style={{ padding: '12px 8px' }}>{row.birthDate}</td>
                  <td style={{ padding: '12px 8px' }}>{row.phone}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const cardStyle: React.CSSProperties = {
  background: 'rgba(24, 24, 27, 0.6)',
  border: '1px solid rgba(63, 63, 70, 0.5)',
  borderRadius: '16px',
  padding: '20px',
  boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
  backdropFilter: 'blur(12px)'
};
