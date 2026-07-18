import React from "react";
import { CreditCard, ShieldPlus, FileText } from "lucide-react";
import { OptionCard } from "../ui/SharedOnboardingUI";

export function Step4Services({
  services,
  toggleService,
  legal,
  setLegal,
  accentColor,
  isDark,
  textColor,
}: {
  services: any;
  toggleService: (k: string) => void;
  legal: any;
  setLegal: (val: any) => void;
  accentColor: string;
  isDark: boolean;
  textColor: string;
}) {
  return (
    <div className="onboarding-step-fade-in flex-column gap-lg">
      <div style={{ textAlign: "center", marginBottom: 24 }}>
        <h2 style={{ fontSize: 22, marginBottom: 8, color: textColor }}>
          Финансы и Услуги
        </h2>
        <p style={{ opacity: 0.7, lineHeight: 1.5 }}>
          Как пациенты будут оплачивать ваши услуги?
        </p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <OptionCard
          selected={services.installments}
          onClick={() => toggleService("installments")}
          icon={<CreditCard size={24} />}
          title="Рассрочки"
          desc="Позволяет разбивать платежи за лечение на несколько месяцев. Добавит вкладку 'Планы оплат'."
          accentColor={accentColor}
          isDark={isDark}
          textColor={textColor}
        />
        <OptionCard
          selected={services.insurance}
          onClick={() => toggleService("insurance")}
          icon={<ShieldPlus size={24} />}
          title="Работа по ДМС"
          desc="Гарантийные письма, страховые компании, сложные акты выполненных работ."
          accentColor={accentColor}
          isDark={isDark}
          textColor={textColor}
        />
      </div>

      <div style={{ marginTop: 32 }}>
        <h3 style={{ fontSize: 16, marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
          <FileText size={18} /> Юридические данные
        </h3>
        <p style={{ fontSize: 13, opacity: 0.7, marginBottom: 16 }}>
          Эти данные будут автоматически подставляться в договоры и акты для пациентов.
        </p>
        
        <div style={{ display: "flex", gap: 16, marginBottom: 16 }}>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: 12, opacity: 0.7, marginBottom: 4, display: "block" }}>ИНН</label>
            <input
              type="text"
              value={legal.inn}
              onChange={(e) => setLegal({ ...legal, inn: e.target.value })}
              placeholder="1234567890"
              style={{
                width: "100%",
                background: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.02)",
                border: `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"}`,
                padding: "10px 14px",
                borderRadius: 8,
                color: textColor,
                outline: "none"
              }}
            />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: 12, opacity: 0.7, marginBottom: 4, display: "block" }}>ОГРН / ОГРНИП</label>
            <input
              type="text"
              value={legal.ogrn}
              onChange={(e) => setLegal({ ...legal, ogrn: e.target.value })}
              placeholder="1234567890123"
              style={{
                width: "100%",
                background: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.02)",
                border: `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"}`,
                padding: "10px 14px",
                borderRadius: 8,
                color: textColor,
                outline: "none"
              }}
            />
          </div>
        </div>
        
        <div>
          <label style={{ fontSize: 12, opacity: 0.7, marginBottom: 4, display: "block" }}>Юридический адрес</label>
          <input
            type="text"
            value={legal.address}
            onChange={(e) => setLegal({ ...legal, address: e.target.value })}
            placeholder="г. Москва, ул. Ленина, д. 1"
            style={{
              width: "100%",
              background: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.02)",
              border: `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"}`,
              padding: "10px 14px",
              borderRadius: 8,
              color: textColor,
              outline: "none"
            }}
          />
        </div>
      </div>
    </div>
  );
}
