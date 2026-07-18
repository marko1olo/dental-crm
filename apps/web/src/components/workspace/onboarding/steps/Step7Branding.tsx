import React from "react";
import { Upload, Download, CheckCircle2 } from "lucide-react";
import { THEME_COLORS } from "../ui/SharedOnboardingUI";

import type { ThemeColor } from "../useOnboardingLogic";

export function Step7Branding({
  theme,
  setTheme,
  migrationStatus,
  setMigrationStatus,
  logoUploaded,
  setLogoUploaded,
  accentColor,
  isDark,
  textColor,
}: {
  theme: ThemeColor;
  setTheme: (t: ThemeColor) => void;
  migrationStatus: "idle" | "analyzing" | "done";
  setMigrationStatus: (s: "idle" | "analyzing" | "done") => void;
  logoUploaded: boolean;
  setLogoUploaded: (s: boolean) => void;
  accentColor: string;
  isDark: boolean;
  textColor: string;
}) {
  return (
    <div className="onboarding-step-fade-in flex-column gap-lg">
      <div style={{ textAlign: "center", marginBottom: 24 }}>
        <h2 style={{ fontSize: 22, marginBottom: 8, color: textColor }}>
          Внешний вид и Данные
        </h2>
        <p style={{ opacity: 0.7, lineHeight: 1.5 }}>
          Настройте цвета DENTE под ваш бренд и перенесите базу из старой системы.
        </p>
      </div>

      <div>
        <label style={{ fontSize: 13, fontWeight: 600, opacity: 0.8, display: "block", marginBottom: 12 }}>
          Цветовая тема
        </label>
        <div style={{ display: "flex", gap: 12 }}>
          {Object.entries(THEME_COLORS).map(([key, val]) => (
            <button
              key={key}
              onClick={() => setTheme(key as ThemeColor)}
              style={{
                width: 40,
                height: 40,
                borderRadius: "50%",
                background: val,
                border: theme === key ? "3px solid white" : "none",
                outline: theme === key ? `2px solid ${val}` : "none",
                cursor: "pointer",
                transition: "all 0.2s"
              }}
            />
          ))}
        </div>
      </div>

      <div style={{ marginTop: 24 }}>
        <label style={{ fontSize: 13, fontWeight: 600, opacity: 0.8, display: "block", marginBottom: 12 }}>
          Логотип (будет на печатных формах)
        </label>
        <div
          onClick={() => setLogoUploaded(!logoUploaded)}
          style={{
            border: `2px dashed ${logoUploaded ? accentColor : (isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.2)")}`,
            padding: 24,
            borderRadius: 12,
            textAlign: "center",
            cursor: "pointer",
            background: logoUploaded ? `${accentColor}11` : "transparent",
            transition: "all 0.3s"
          }}
        >
          {logoUploaded ? (
            <div style={{ color: accentColor, display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
              <CheckCircle2 size={32} />
              <span style={{ fontWeight: 600 }}>Логотип загружен</span>
            </div>
          ) : (
            <div style={{ color: textColor, opacity: 0.7, display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
              <Upload size={32} />
              <span>Нажмите, чтобы выбрать файл</span>
            </div>
          )}
        </div>
      </div>

      <div style={{ marginTop: 24 }}>
        <label style={{ fontSize: 13, fontWeight: 600, opacity: 0.8, display: "block", marginBottom: 12 }}>
          Перенос базы пациентов (Миграция)
        </label>
        <div style={{ display: "flex", gap: 12 }}>
          <button
            onClick={() => setMigrationStatus(migrationStatus === "idle" ? "analyzing" : "idle")}
            style={{
              flex: 1,
              padding: "16px",
              background: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.02)",
              border: `1px solid ${migrationStatus !== "idle" ? accentColor : (isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)")}`,
              borderRadius: 12,
              color: textColor,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
            }}
          >
            {migrationStatus === "idle" ? (
              <>
                <Download size={18} />
                <span>Загрузить Excel / 1C</span>
              </>
            ) : (
              <>
                <CheckCircle2 size={18} color={accentColor} />
                <span style={{ color: accentColor }}>База будет перенесена</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
