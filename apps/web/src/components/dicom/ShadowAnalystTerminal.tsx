import React, { useState, useEffect, useRef } from 'react';
import { Terminal, AlertTriangle, ShieldCheck, Zap, Activity } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid } from 'recharts';

export interface AnalystEvent {
  id: string;
  timestamp: number;
  type: 'INFO' | 'WARNING' | 'CRITICAL';
  message: string;
}

export interface BoneDensityPoint {
  depth: number;
  hu: number;
  zone: string; // D1, D2, D3, D4, D5
}

interface ShadowAnalystTerminalProps {
  events: AnalystEvent[];
  boneDensityProfile?: BoneDensityPoint[];
  isExpanded: boolean;
  onToggleExpand: () => void;
}

export function ShadowAnalystTerminal({ events, boneDensityProfile = [], isExpanded, onToggleExpand }: ShadowAnalystTerminalProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new event
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [events]);

  const getEventStyle = (type: string) => {
    switch (type) {
      case 'CRITICAL': return { color: '#ef4444', bg: 'rgba(239, 68, 68, 0.1)', border: 'rgba(239, 68, 68, 0.2)', icon: <AlertTriangle size={14} color="#ef4444" /> };
      case 'WARNING': return { color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.1)', border: 'rgba(245, 158, 11, 0.2)', icon: <Zap size={14} color="#f59e0b" /> };
      case 'INFO': default: return { color: '#10b981', bg: 'rgba(16, 185, 129, 0.1)', border: 'rgba(16, 185, 129, 0.2)', icon: <ShieldCheck size={14} color="#10b981" /> };
    }
  };

  return (
    <div 
      style={{ 
        width: isExpanded ? '300px' : '40px', 
        height: '100%', 
        backgroundColor: '#09090b', 
        borderLeft: '1px solid rgba(39,39,42,0.8)',
        transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        flexShrink: 0
      }}
    >
      {/* Header */}
      <div 
        style={{ 
          height: '40px', 
          borderBottom: '1px solid rgba(39,39,42,0.8)', 
          display: 'flex', 
          alignItems: 'center', 
          padding: '0 10px',
          cursor: 'pointer',
          backgroundColor: 'rgba(255,255,255,0.02)',
          justifyContent: isExpanded ? 'space-between' : 'center',
        }}
        onClick={onToggleExpand}
      >
        {isExpanded ? (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Terminal size={14} color="#a1a1aa" />
              <span style={{ color: '#e4e4e7', fontSize: '12px', fontWeight: 700, letterSpacing: '0.05em' }}>SHADOW ANALYST</span>
            </div>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10b981', boxShadow: '0 0 8px #10b981' }} />
          </>
        ) : (
          <Terminal size={16} color="#a1a1aa" />
        )}
      </div>

      {/* Log Content */}
      {isExpanded && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          
          {boneDensityProfile && boneDensityProfile.length > 0 && (
            <div style={{ padding: '12px', borderBottom: '1px solid rgba(39,39,42,0.8)', minHeight: '200px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
                <Activity size={12} color="#3b82f6" />
                <span style={{ color: '#e4e4e7', fontSize: '10px', fontWeight: 600 }}>BONE DENSITY (HU)</span>
              </div>
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={boneDensityProfile} layout="vertical" barSize={4} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(255,255,255,0.05)" />
                  <XAxis type="number" domain={[0, 2000]} tick={{ fill: '#71717a', fontSize: 9 }} stroke="#3f3f46" />
                  <YAxis type="category" dataKey="depth" reversed tick={{ fill: '#71717a', fontSize: 9 }} stroke="#3f3f46" interval={4} />
                  <Tooltip 
                    cursor={{fill: 'rgba(255,255,255,0.05)'}}
                    contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', fontSize: '10px', color: '#e4e4e7' }}
                    formatter={(value: any, name: any, props: any) => [`${value} HU`, `Глубина: ${props.payload.depth} мм`]}
                  />
                  <Bar dataKey="hu" isAnimationActive={false}>
                    {boneDensityProfile.map((entry, index) => {
                      let color = '#ef4444'; // D5
                      if (entry.hu > 1250) color = '#10b981'; // D1
                      else if (entry.hu > 850) color = '#3b82f6'; // D2
                      else if (entry.hu > 350) color = '#f59e0b'; // D3
                      else if (entry.hu > 150) color = '#f97316'; // D4
                      return <Cell key={`cell-${index}`} fill={color} />;
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px', fontSize: '9px', color: '#71717a' }}>
                <span style={{ color: '#10b981' }}>D1</span>
                <span style={{ color: '#3b82f6' }}>D2</span>
                <span style={{ color: '#f59e0b' }}>D3</span>
                <span style={{ color: '#f97316' }}>D4</span>
                <span style={{ color: '#ef4444' }}>D5</span>
              </div>
            </div>
          )}

          <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {events.length === 0 ? (
              <div style={{ color: '#52525b', fontSize: '11px', fontFamily: 'monospace', textAlign: 'center', marginTop: '20px' }}>
                Waiting for clinical events...
              </div>
            ) : (
              events.map((ev) => {
                const style = getEventStyle(ev.type);
                const date = new Date(ev.timestamp);
                const timeString = `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}:${date.getSeconds().toString().padStart(2, '0')}`;
                
                return (
                  <div key={ev.id} style={{ backgroundColor: style.bg, border: `1px solid ${style.border}`, borderRadius: '6px', padding: '8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: style.color, fontSize: '10px', fontWeight: 700 }}>
                        {style.icon} {ev.type}
                      </span>
                      <span style={{ color: '#71717a', fontSize: '10px', fontFamily: 'monospace' }}>{timeString}</span>
                    </div>
                    <div style={{ color: '#e4e4e7', fontSize: '11px', lineHeight: 1.4 }}>
                      {ev.message}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
