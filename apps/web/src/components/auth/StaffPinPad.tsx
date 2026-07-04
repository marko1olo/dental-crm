import React, { useState } from 'react';
import { Lock, UserCheck, Delete, LogOut } from 'lucide-react';
import { showToast } from '../GlobalToast';

interface StaffPinPadProps {
  staffMembers: any[];
  onUnlockSuccess: (user: any) => void;
  onClinicLogout: () => void;
}

export function StaffPinPad({ staffMembers, onUnlockSuccess, onClinicLogout }: StaffPinPadProps) {
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [pin, setPin] = useState('');
  const [errorShake, setErrorShake] = useState(false);
  const [loading, setLoading] = useState(false);

  // Filter active staff members
  const activeStaff = staffMembers.filter(m => m.active);

  const handleKeyPress = (num: string) => {
    if (loading || pin.length >= 4) return;
    const newPin = pin + num;
    setPin(newPin);

    if (newPin.length === 4) {
      submitPin(newPin);
    }
  };

  const handleBackspace = () => {
    if (loading) return;
    setPin(pin.slice(0, -1));
  };

  const submitPin = async (completedPin: string) => {
    if (!selectedUser) return;
    setLoading(true);
    setErrorShake(false);

    try {
      const response = await fetch('/api/auth/staff/unlock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: selectedUser.id, pinCode: completedPin })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Неверный PIN-код");
      }

      localStorage.setItem("dente_staff_token", data.staffToken);
      showToast(`Добро пожаловать, ${data.user.fullName}!`, "success");
      onUnlockSuccess(data.user);
    } catch (err: any) {
      console.error(err);
      showToast(err.message || "Неверный PIN-код", "error");
      
      // Play error synth tone in client if playBeep exists on window/hook
      try {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const osc = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        osc.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(180, audioCtx.currentTime);
        gainNode.gain.setValueAtTime(0.08, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.15);
        osc.start(audioCtx.currentTime);
        osc.stop(audioCtx.currentTime + 0.15);
      } catch (e) {}

      // Trigger error shake animation
      setErrorShake(true);
      setTimeout(() => setErrorShake(false), 500);
      setPin('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-950/90 backdrop-blur-2xl select-none">
      
      {/* Background Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-indigo-600/5 rounded-full blur-[160px] pointer-events-none"></div>

      <div className={`w-full max-w-4xl px-6 flex flex-col md:flex-row gap-8 transition-transform duration-300 ${errorShake ? 'animate-shake' : ''}`}>
        
        {/* Left Side: Staff Profiles Selection */}
        <div className="flex-1 flex flex-col justify-center">
          <div className="mb-6 text-center md:text-left">
            <h3 className="text-xl font-bold text-white flex items-center justify-center md:justify-start gap-2">
              <UserCheck className="text-indigo-400" size={20} /> Выберите профиль сотрудника
            </h3>
            <p className="text-xs text-neutral-400 mt-1 uppercase tracking-wider">Для переключения или разблокировки смены</p>
          </div>

          <div className="grid grid-cols-2 gap-3 max-h-[360px] overflow-y-auto pr-2">
            {activeStaff.map((member) => {
              const isSelected = selectedUser?.id === member.id;
              return (
                <button
                  key={member.id}
                  onClick={() => {
                    setSelectedUser(member);
                    setPin('');
                  }}
                  className={`p-4 rounded-2xl border transition-all text-left flex items-center gap-3 ${
                    isSelected
                      ? 'bg-indigo-600/10 border-indigo-500 shadow-[0_0_15px_rgba(79,70,229,0.15)]'
                      : 'bg-neutral-900/40 border-neutral-800 hover:bg-neutral-800/40 hover:border-neutral-700'
                  }`}
                >
                  <div 
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold shrink-0"
                    style={{ backgroundColor: member.color || '#3b82f6' }}
                  >
                    {member.fullName.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-white truncate">{member.fullName}</div>
                    <div className="text-[10px] text-neutral-400 capitalize mt-0.5">{member.role === 'owner' ? 'владелец' : member.role === 'doctor' ? 'врач' : member.role === 'assistant' ? 'ассистент' : 'администратор'}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Side: Quick PIN pad */}
        <div className="w-full md:w-80 flex flex-col items-center justify-center bg-neutral-900/30 border border-neutral-850 p-6 rounded-3xl backdrop-blur-md">
          <div className="flex flex-col items-center mb-6">
            <div className="w-12 h-12 bg-neutral-800 text-neutral-300 rounded-full flex items-center justify-center mb-3">
              <Lock size={20} />
            </div>
            <h4 className="text-sm font-bold text-white">Введите код доступа</h4>
            {selectedUser ? (
              <span className="text-[11px] text-indigo-400 font-medium mt-1 truncate max-w-[200px]">{selectedUser.fullName}</span>
            ) : (
              <span className="text-[11px] text-neutral-500 mt-1">Сначала выберите сотрудника</span>
            )}
          </div>

          {/* Dots Indicator */}
          <div className="flex gap-4 mb-8">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className={`w-3 h-3 rounded-full transition-all duration-150 ${
                  i < pin.length
                    ? 'bg-indigo-500 scale-110 shadow-[0_0_8px_rgba(99,102,241,0.5)]'
                    : 'bg-neutral-800'
                }`}
              ></div>
            ))}
          </div>

          {/* Keypad Grid */}
          <div className="grid grid-cols-3 gap-3 w-full max-w-[240px]">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
              <button
                key={num}
                onClick={() => handleKeyPress(num)}
                disabled={!selectedUser || loading}
                className="w-16 h-16 rounded-full bg-neutral-900/60 border border-neutral-800 hover:bg-neutral-800 text-white font-semibold text-lg flex items-center justify-center transition-all disabled:opacity-40 active:scale-95"
              >
                {num}
              </button>
            ))}
            <button
              onClick={onClinicLogout}
              className="w-16 h-16 rounded-full text-red-400 hover:bg-red-500/10 flex items-center justify-center transition-all active:scale-95"
              title="Выйти из клиники"
            >
              <LogOut size={20} />
            </button>
            <button
              onClick={() => handleKeyPress('0')}
              disabled={!selectedUser || loading}
              className="w-16 h-16 rounded-full bg-neutral-900/60 border border-neutral-800 hover:bg-neutral-800 text-white font-semibold text-lg flex items-center justify-center transition-all disabled:opacity-40 active:scale-95"
            >
              0
            </button>
            <button
              onClick={handleBackspace}
              disabled={!selectedUser || loading || pin.length === 0}
              className="w-16 h-16 rounded-full text-neutral-400 hover:bg-neutral-800 flex items-center justify-center transition-all active:scale-95 disabled:opacity-40"
            >
              <Delete size={20} />
            </button>
          </div>

          <div className="mt-6 text-center">
            <span className="text-[10px] text-neutral-500">
              Коды по умолчанию:<br />
              Владелец: <code className="text-neutral-400 bg-neutral-950 px-1 py-0.5 rounded">0000</code> | Врачи/Сотрудники: <code className="text-neutral-400 bg-neutral-950 px-1 py-0.5 rounded">1234</code>
            </span>
          </div>
        </div>

      </div>
    </div>
  );
}
