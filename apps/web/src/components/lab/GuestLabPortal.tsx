import React, { useState, useEffect } from 'react';
import { Upload, CheckCircle, Package, Clock, ShieldAlert } from 'lucide-react';

// For the sake of UI we simulate a URL parameter `secureToken`
const MOCK_LAB_ORDER = {
  id: 'lab-123',
  clinicName: 'DENTE Premium',
  doctorName: 'Dr. Ivanov Ivan',
  toothFdi: '46',
  material: 'E.max CAD',
  colorVita: 'A2',
  dueDate: '2026-07-15T12:00:00Z',
  status: 'sent', // sent, in_progress, shipped
  clinicalNotes: 'Пациент просит сделать чуть светлее к режущему краю.',
};

export const GuestLabPortal: React.FC = () => {
  const [status, setStatus] = useState(MOCK_LAB_ORDER.status);
  const [wsMessage, setWsMessage] = useState('');
  const [photoUploaded, setPhotoUploaded] = useState(false);

  // Simulate WebSocket broadcast
  useEffect(() => {
    if (status !== MOCK_LAB_ORDER.status) {
      setWsMessage(`[WS] Broadcast sent to ${MOCK_LAB_ORDER.clinicName}: Order status changed to ${status}`);
      const timer = setTimeout(() => setWsMessage(''), 3000);
      return () => clearTimeout(timer);
    }
  }, [status]);

  return (
    <div className="min-h-screen bg-zinc-950 p-8 text-zinc-100 font-sans flex justify-center items-center">
      <div className="max-w-3xl w-full">
        {/* Secure Header */}
        <div className="bg-cyan-900/20 border border-cyan-500/30 p-4 rounded-t-2xl flex justify-between items-center backdrop-blur-md">
          <div className="flex items-center space-x-3">
            <ShieldAlert className="text-cyan-400" />
            <div>
              <h1 className="text-lg font-bold text-cyan-50">DENTE Защищенный Портал Лаборатории</h1>
              <p className="text-xs text-cyan-400/80">Токенизированный доступ (Read-Only + Status Mutation)</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm font-semibold">{MOCK_LAB_ORDER.clinicName}</p>
            <p className="text-xs text-zinc-400">{MOCK_LAB_ORDER.doctorName}</p>
          </div>
        </div>

        {/* Order Details */}
        <div className="bg-zinc-900/50 border-x border-b border-zinc-800 p-8 rounded-b-2xl shadow-2xl backdrop-blur-xl">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
            <div>
              <p className="text-xs text-zinc-500 uppercase tracking-widest mb-1">Зуб (FDI)</p>
              <p className="text-2xl font-black text-white">{MOCK_LAB_ORDER.toothFdi}</p>
            </div>
            <div>
              <p className="text-xs text-zinc-500 uppercase tracking-widest mb-1">Материал</p>
              <p className="text-xl font-bold text-zinc-300">{MOCK_LAB_ORDER.material}</p>
            </div>
            <div>
              <p className="text-xs text-zinc-500 uppercase tracking-widest mb-1">Цвет (Vita)</p>
              <div className="inline-block px-3 py-1 bg-zinc-800 rounded border border-zinc-700 font-mono text-lg text-emerald-400">
                {MOCK_LAB_ORDER.colorVita}
              </div>
            </div>
            <div>
              <p className="text-xs text-zinc-500 uppercase tracking-widest mb-1">Срок сдачи</p>
              <p className="text-sm font-semibold text-rose-400 flex items-center gap-1 mt-1">
                <Clock className="w-4 h-4" /> 15 Июля 12:00
              </p>
            </div>
          </div>

          <div className="bg-zinc-950/50 p-4 rounded-xl border border-zinc-800/50 mb-8">
            <p className="text-xs text-zinc-500 uppercase tracking-widest mb-2">Комментарий врача</p>
            <p className="text-sm text-zinc-300 italic">«{MOCK_LAB_ORDER.clinicalNotes}»</p>
          </div>

          <hr className="border-zinc-800 my-8" />

          {/* Action Zone */}
          <div className="flex flex-col md:flex-row gap-6">
            <div className="flex-1">
              <h3 className="text-sm font-bold text-white mb-4">Управление статусом (Отправка в клинику)</h3>
              <div className="flex space-x-3">
                <button 
                  onClick={() => setStatus('in_progress')}
                  className={`flex-1 py-3 px-4 rounded-xl flex flex-col items-center justify-center gap-2 border transition-all ${
                    status === 'in_progress' ? 'bg-amber-500/20 border-amber-500/50 text-amber-400' : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:bg-zinc-800'
                  }`}
                >
                  <Package className="w-5 h-5" />
                  <span className="text-xs font-semibold uppercase">В работе</span>
                </button>
                <button 
                  onClick={() => setStatus('shipped')}
                  className={`flex-1 py-3 px-4 rounded-xl flex flex-col items-center justify-center gap-2 border transition-all ${
                    status === 'shipped' ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.2)]' : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:bg-zinc-800'
                  }`}
                >
                  <CheckCircle className="w-5 h-5" />
                  <span className="text-xs font-semibold uppercase">Отправлен</span>
                </button>
              </div>
              
              {wsMessage && (
                <div className="mt-4 p-3 bg-cyan-900/20 border border-cyan-500/30 rounded-lg animate-pulse">
                  <p className="text-xs font-mono text-cyan-400">{wsMessage}</p>
                </div>
              )}
            </div>

            <div className="flex-1">
              <h3 className="text-sm font-bold text-white mb-4">Прикрепить фото (Опционально)</h3>
              {!photoUploaded ? (
                <button 
                  onClick={() => setPhotoUploaded(true)}
                  className="w-full h-[88px] border-2 border-dashed border-zinc-700 hover:border-zinc-500 hover:bg-zinc-800/50 rounded-xl flex flex-col items-center justify-center text-zinc-400 transition-colors"
                >
                  <Upload className="w-5 h-5 mb-1" />
                  <span className="text-xs">Загрузить фото коронки</span>
                </button>
              ) : (
                <div className="w-full h-[88px] bg-emerald-900/20 border border-emerald-500/30 rounded-xl flex items-center justify-center text-emerald-400">
                  <CheckCircle className="w-5 h-5 mr-2" />
                  <span className="text-sm font-semibold">Фото успешно прикреплено</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
