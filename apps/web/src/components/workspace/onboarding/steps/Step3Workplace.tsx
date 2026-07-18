import React from "react";
import { Clock, MousePointerClick } from "lucide-react";

export function Step3Workplace({
  chairs,
  setChairs,
  workHours,
  setWorkHours,
  defaultDuration,
  setDefaultDuration,
  practiceType,
  accentColor,
  isDark,
  textColor,
}: {
  chairs: number;
  setChairs: (val: number) => void;
  workHours: [number, number];
  setWorkHours: (val: [number, number]) => void;
  defaultDuration: number;
  setDefaultDuration: (val: number) => void;
  practiceType: string;
  accentColor: string;
  isDark: boolean;
  textColor: string;
}) {
  return (
    <div className="onboarding-step-fade-in flex-column gap-lg">
      <div style={{ textAlign: "center", marginBottom: 24 }}>
        <h2 style={{ fontSize: 22, marginBottom: 8, color: textColor }}>
          Рабочее пространство
        </h2>
        <p style={{ opacity: 0.7, lineHeight: 1.5 }}>
          Настройте расписание и количество кресел.
        </p>
      </div>

      {practiceType !== "solo" && practiceType !== "solo_with_team" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
          <label style={{ fontSize: 13, fontWeight: 600, opacity: 0.8 }}>
            Количество стоматологических установок (кресел)
          </label>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <input
              type="range"
              min={1}
              max={10}
              value={chairs}
              onChange={(e) => setChairs(parseInt(e.target.value))}
              style={{ flex: 1, accentColor }}
            />
            <span style={{ fontSize: 18, fontWeight: "bold", width: 40, textAlign: "center" }}>
              {chairs}
            </span>
          </div>
          <div style={{ fontSize: 12, opacity: 0.6 }}>
            От этого зависит количество колонок в расписании на день.
          </div>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
        <label style={{ fontSize: 13, fontWeight: 600, opacity: 0.8, display: "flex", alignItems: "center", gap: 6 }}>
          <Clock size={16} /> Рабочие часы
        </label>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <input
            type="number"
            min={0}
            max={23}
            value={workHours[0]}
            onChange={(e) => setWorkHours([parseInt(e.target.value), workHours[1]])}
            style={{
              background: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.02)",
              border: `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"}`,
              padding: "8px 12px",
              borderRadius: 8,
              color: textColor,
              width: 80,
              outline: "none",
              textAlign: "center"
            }}
          />
          <span style={{ opacity: 0.5 }}>до</span>
          <input
            type="number"
            min={1}
            max={24}
            value={workHours[1]}
            onChange={(e) => setWorkHours([workHours[0], parseInt(e.target.value)])}
            style={{
              background: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.02)",
              border: `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"}`,
              padding: "8px 12px",
              borderRadius: 8,
              color: textColor,
              width: 80,
              outline: "none",
              textAlign: "center"
            }}
          />
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <label style={{ fontSize: 13, fontWeight: 600, opacity: 0.8, display: "flex", alignItems: "center", gap: 6 }}>
          <MousePointerClick size={16} /> Длительность приема по умолчанию (минуты)
        </label>
        <select
          value={defaultDuration}
          onChange={(e) => setDefaultDuration(parseInt(e.target.value))}
          style={{
            background: isDark ? "#2a2d3e" : "#f1f5f9",
            border: `1px solid ${isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.2)"}`,
            padding: "8px 12px",
            borderRadius: 8,
            color: textColor,
            outline: "none",
            height: 38,
            maxWidth: 200
          }}
        >
          <option value={15}>15 минут</option>
          <option value={30}>30 минут</option>
          <option value={45}>45 минут</option>
          <option value={60}>60 минут (1 час)</option>
        </select>
        <div style={{ fontSize: 12, opacity: 0.6 }}>
          При создании записи этот слот будет предлагаться первым.
        </div>
      </div>
    </div>
  );
}
