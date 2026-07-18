import React from "react";
import { User, Stethoscope, Baby, Smile, Bone, Scissors, Microscope } from "lucide-react";
import { OptionCard } from "../ui/SharedOnboardingUI";

const SPECIALIZATIONS = [
  { id: "therapy", title: "Терапия", icon: <Stethoscope size={20} />, desc: "Лечение кариеса, пульпита" },
  { id: "surgery", title: "Хирургия", icon: <Scissors size={20} />, desc: "Удаления, операции" },
  { id: "orthopedics", title: "Ортопедия", icon: <Bone size={20} />, desc: "Коронки, протезирование" },
  { id: "orthodontics", title: "Ортодонтия", icon: <Smile size={20} />, desc: "Брекеты, элайнеры" },
  { id: "pediatrics", title: "Детский прием", icon: <Baby size={20} />, desc: "Молочные зубы, адаптация" },
  { id: "implantology", title: "Имплантология", icon: <User size={20} />, desc: "Установка имплантатов" },
  { id: "gnathology", title: "Гнатология", icon: <Microscope size={20} />, desc: "Суставы, сплинт-терапия" },
];

export function Step1Doctor({
  doctorName,
  setDoctorName,
  specs,
  toggleSpec,
  canSign,
  setCanSign,
  accentColor,
  isDark,
  textColor,
}: {
  doctorName: string;
  setDoctorName: (val: string) => void;
  specs: string[];
  toggleSpec: (id: string) => void;
  canSign: boolean;
  setCanSign: (val: boolean) => void;
  accentColor: string;
  isDark: boolean;
  textColor: string;
}) {
  return (
    <div className="onboarding-step-fade-in flex-column gap-lg">
      <div style={{ textAlign: "center", marginBottom: 24 }}>
        <h2 style={{ fontSize: 22, marginBottom: 8, color: textColor }}>
          Расскажите о себе
        </h2>
        <p style={{ opacity: 0.7, lineHeight: 1.5 }}>
          Это настроит стартовый прайс-лист, зубную формулу и медицинские модули.
        </p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <label style={{ fontSize: 13, fontWeight: 600, opacity: 0.8 }}>
          Ваше ФИО (как будет в документах)
        </label>
        <input
          type="text"
          value={doctorName}
          onChange={(e) => setDoctorName(e.target.value)}
          placeholder="Иванов Иван Иванович"
          style={{
            background: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.02)",
            border: `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"}`,
            padding: "12px 16px",
            borderRadius: 12,
            color: textColor,
            fontSize: 16,
            outline: "none",
          }}
          autoFocus
        />
      </div>

      <div style={{ marginTop: 16 }}>
        <label style={{ fontSize: 13, fontWeight: 600, opacity: 0.8, display: "block", marginBottom: 12 }}>
          Ваши специализации
        </label>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 12,
          }}
        >
          {SPECIALIZATIONS.map((spec) => (
            <OptionCard
              key={spec.id}
              selected={specs.includes(spec.id)}
              onClick={() => toggleSpec(spec.id)}
              icon={spec.icon}
              title={spec.title}
              desc={spec.desc}
              accentColor={accentColor}
              isDark={isDark}
              textColor={textColor}
            />
          ))}
        </div>
      </div>

      <div style={{ marginTop: 24, display: "flex", alignItems: "center", gap: 12 }}>
        <input 
          type="checkbox" 
          checked={canSign} 
          onChange={(e) => setCanSign(e.target.checked)} 
          id="canSignCb"
          style={{ width: 20, height: 20, accentColor }}
        />
        <label htmlFor="canSignCb" style={{ cursor: "pointer", fontSize: 15, opacity: 0.9 }}>
          Я подписываю медицинские документы (ИДС, планы лечения)
        </label>
      </div>
    </div>
  );
}
