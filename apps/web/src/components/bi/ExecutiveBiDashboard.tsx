import React, { useState } from 'react';
import { 
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, Cell, PieChart, Pie
} from 'recharts';
import { TrendingUp, Users, DollarSign, Activity, AlertCircle, FileText } from 'lucide-react';

const MOCK_LTV_DATA = [
  { cohort: 'Jan 26', m3: 15000, m6: 35000, m12: 55000 },
  { cohort: 'Feb 26', m3: 18000, m6: 42000, m12: 60000 },
  { cohort: 'Mar 26', m3: 14000, m6: 38000, m12: null },
  { cohort: 'Apr 26', m3: 19000, m6: null, m12: null },
];

const MOCK_FUNNEL_DATA = [
  { stage: 'Drafts', count: 120, fill: '#64748b' },
  { stage: 'Proposed', count: 95, fill: '#3b82f6' },
  { stage: 'Approved', count: 60, fill: '#10b981' },
  { stage: 'Active', count: 55, fill: '#f59e0b' },
  { stage: 'Completed', count: 40, fill: '#8b5cf6' },
];

const MOCK_DEBTORS_DATA = [
  { name: '1-30 Days', value: 450000, fill: '#f59e0b' },
  { name: '30-90 Days', value: 120000, fill: '#f97316' },
  { name: '> 90 Days', value: 55000, fill: '#ef4444' },
];

const MOCK_DOCTORS_DATA = [
  { name: 'Dr. Ivanov A.', revenue: 1200000, discountPercent: 4.5, materialCost: 240000, netProfit: 600000 },
  { name: 'Dr. Smirnov V.', revenue: 950000, discountPercent: 2.1, materialCost: 150000, netProfit: 550000 },
  { name: 'Dr. Petrov D.', revenue: 1500000, discountPercent: 8.0, materialCost: 400000, netProfit: 750000 },
];

export function ExecutiveBiDashboard() {
  const [activeTab, setActiveTab] = useState<'finance' | 'clinical' | 'logistics'>('finance');

  return (
    <div style={{ padding: '24px', backgroundColor: '#09090b', minHeight: '100%', color: '#e4e4e7', fontFamily: 'Inter, sans-serif' }}>
      <header style={{ marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 800, margin: '0 0 8px 0', letterSpacing: '-0.02em', background: 'linear-gradient(90deg, #fff, #a1a1aa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Executive BI Dashboard
          </h1>
          <p style={{ margin: 0, color: '#a1a1aa', fontSize: '14px' }}>Real-time financial and clinical intelligence</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button onClick={() => setActiveTab('finance')} style={tabStyle(activeTab === 'finance')}>Finance & Revenue</button>
          <button onClick={() => setActiveTab('clinical')} style={tabStyle(activeTab === 'clinical')}>Clinical & Funnel</button>
          <button onClick={() => setActiveTab('logistics')} style={tabStyle(activeTab === 'logistics')}>Lab Logistics</button>
        </div>
      </header>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '32px' }}>
        <KpiCard title="Total Revenue (YTD)" value="₽ 14,250,000" trend="+12.5%" icon={<DollarSign size={20} />} />
        <KpiCard title="Active Patients" value="2,450" trend="+4.2%" icon={<Users size={20} />} />
        <KpiCard title="Avg Treatment Plan" value="₽ 185,000" trend="+8.1%" icon={<FileText size={20} />} />
        <KpiCard title="Total Debt > 30d" value="₽ 175,000" trend="-2.4%" icon={<AlertCircle size={20} />} isNegative={false} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px', marginBottom: '24px' }}>
        {/* LTV Cohort Chart */}
        <div style={cardStyle}>
          <h3 style={cardTitleStyle}>Cohort LTV (Accumulated Revenue)</h3>
          <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer>
              <LineChart data={MOCK_LTV_DATA} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis dataKey="cohort" stroke="#71717a" fontSize={12} />
                <YAxis stroke="#71717a" fontSize={12} tickFormatter={(val) => `₽${val / 1000}k`} />
                <RechartsTooltip contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46', borderRadius: '8px' }} />
                <Legend />
                <Line type="monotone" dataKey="m3" name="3 Months" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                <Line type="monotone" dataKey="m6" name="6 Months" stroke="#10b981" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                <Line type="monotone" dataKey="m12" name="12 Months" stroke="#8b5cf6" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Debtors Map */}
        <div style={cardStyle}>
          <h3 style={cardTitleStyle}>Debtors Map</h3>
          <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie data={MOCK_DEBTORS_DATA} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value">
                  {MOCK_DEBTORS_DATA.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <RechartsTooltip contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46', borderRadius: '8px' }} formatter={(val: any) => `₽ ${Number(val).toLocaleString()}`} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '24px' }}>
        {/* Funnel */}
        <div style={cardStyle}>
          <h3 style={cardTitleStyle}>Treatment Plan Conversion</h3>
          <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer>
              <BarChart data={MOCK_FUNNEL_DATA} layout="vertical" margin={{ top: 20, right: 30, left: 40, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#27272a" />
                <XAxis type="number" stroke="#71717a" fontSize={12} />
                <YAxis dataKey="stage" type="category" stroke="#71717a" fontSize={12} />
                <RechartsTooltip contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46', borderRadius: '8px' }} cursor={{ fill: '#27272a' }} />
                <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                  {MOCK_FUNNEL_DATA.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Doctor Productivity Table */}
        <div style={cardStyle}>
          <h3 style={cardTitleStyle}>Doctor Productivity & Profitability</h3>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #3f3f46', color: '#a1a1aa', textAlign: 'left' }}>
                  <th style={{ padding: '12px 8px', fontWeight: 600 }}>Doctor</th>
                  <th style={{ padding: '12px 8px', fontWeight: 600 }}>Total Revenue</th>
                  <th style={{ padding: '12px 8px', fontWeight: 600 }}>Avg Discount</th>
                  <th style={{ padding: '12px 8px', fontWeight: 600 }}>Material Cost</th>
                  <th style={{ padding: '12px 8px', fontWeight: 600 }}>Net Profit</th>
                </tr>
              </thead>
              <tbody>
                {MOCK_DOCTORS_DATA.map((doc, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #27272a' }}>
                    <td style={{ padding: '12px 8px', fontWeight: 500, color: '#f4f4f5' }}>{doc.name}</td>
                    <td style={{ padding: '12px 8px' }}>₽ {doc.revenue.toLocaleString()}</td>
                    <td style={{ padding: '12px 8px', color: doc.discountPercent > 5 ? '#f59e0b' : '#10b981' }}>{doc.discountPercent}%</td>
                    <td style={{ padding: '12px 8px' }}>₽ {doc.materialCost.toLocaleString()}</td>
                    <td style={{ padding: '12px 8px', fontWeight: 600, color: '#2dd4bf' }}>₽ {doc.netProfit.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function KpiCard({ title, value, trend, icon, isNegative = false }: any) {
  return (
    <div style={{ ...cardStyle, display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', color: '#a1a1aa' }}>
        <span style={{ fontSize: '13px', fontWeight: 600 }}>{title}</span>
        <div style={{ color: '#3f3f46' }}>{icon}</div>
      </div>
      <div style={{ fontSize: '24px', fontWeight: 700, color: '#f4f4f5' }}>{value}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
        <TrendingUp size={14} color={isNegative ? '#ef4444' : '#10b981'} />
        <span style={{ color: isNegative ? '#ef4444' : '#10b981', fontWeight: 600 }}>{trend}</span>
        <span style={{ color: '#71717a' }}>vs last month</span>
      </div>
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

const cardTitleStyle: React.CSSProperties = {
  margin: '0 0 20px 0',
  fontSize: '15px',
  fontWeight: 600,
  color: '#e4e4e7'
};

const tabStyle = (active: boolean): React.CSSProperties => ({
  background: active ? '#27272a' : 'transparent',
  color: active ? '#f4f4f5' : '#a1a1aa',
  border: 'none',
  padding: '8px 16px',
  borderRadius: '8px',
  fontSize: '13px',
  fontWeight: 600,
  cursor: 'pointer',
  transition: 'all 0.2s',
  boxShadow: active ? '0 2px 8px rgba(0,0,0,0.2)' : 'none'
});
