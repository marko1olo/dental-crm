import React, { useEffect, useState } from "react";
import { PhoneIncoming, X, User } from "lucide-react";
import { useWebsocket } from "../hooks/useWebsocket";
import { usePatientStore } from "../store/patientStore";
import { useAppStore } from "../store/appStore";

export function IncomingCallToast() {
  const [incomingCall, setIncomingCall] = useState<{
    phone: string;
    patientName: string;
    patientId: string | null;
    timestamp: string;
  } | null>(null);

  const { lastMessage } = useWebsocket(
    (import.meta as any).env.VITE_WS_URL || "ws://localhost:4100/api/ws/schedule"
  );
  
  const setSelectedPatientId = usePatientStore((s) => s.setSelectedPatientId);
  const setCurrentView = useAppStore((s) => s.setCurrentView);

  useEffect(() => {
    if (lastMessage?.type === "TELEPHONY_INCOMING_CALL" && lastMessage.payload) {
      setIncomingCall(lastMessage.payload);
      
      // Auto-hide after 30 seconds
      const timer = setTimeout(() => {
        setIncomingCall(null);
      }, 30000);
      return () => clearTimeout(timer);
    }
  }, [lastMessage]);

  if (!incomingCall) return null;

  return (
    <div style={{
      position: 'fixed',
      bottom: '24px',
      right: '24px',
      backgroundColor: '#fff',
      borderLeft: '4px solid #10b981',
      boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
      borderRadius: '8px',
      padding: '16px',
      width: '320px',
      zIndex: 999999,
      display: 'flex',
      flexDirection: 'column',
      gap: '12px'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', color: '#10b981' }}>
          <PhoneIncoming size={20} className="animate-pulse" />
          <span style={{ fontWeight: 600, fontSize: '14px' }}>Входящий звонок</span>
        </div>
        <button 
          onClick={() => setIncomingCall(null)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af' }}
        >
          <X size={16} />
        </button>
      </div>
      
      <div>
        <div style={{ fontWeight: 600, fontSize: '16px', color: '#111827', marginBottom: '4px' }}>
          {incomingCall.phone}
        </div>
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center', color: '#4b5563', fontSize: '14px' }}>
          <User size={14} />
          {incomingCall.patientName}
        </div>
      </div>

      {incomingCall.patientId && (
        <button
          onClick={() => {
            setSelectedPatientId(incomingCall.patientId);
            setCurrentView("patients");
            setIncomingCall(null);
          }}
          style={{
            marginTop: '4px',
            backgroundColor: '#f3f4f6',
            color: '#374151',
            border: 'none',
            borderRadius: '6px',
            padding: '8px 12px',
            fontSize: '14px',
            fontWeight: 500,
            cursor: 'pointer',
            transition: 'background-color 0.2s',
          }}
          onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#e5e7eb')}
          onMouseOut={(e) => (e.currentTarget.style.backgroundColor = '#f3f4f6')}
        >
          Открыть карту пациента
        </button>
      )}
    </div>
  );
}
