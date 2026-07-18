import React from "react";
import { TrendingUp, MessageSquare, Megaphone } from "lucide-react";
import { OptionCard } from "../ui/SharedOnboardingUI";

export function Step6Growth({
  growth,
  toggleGrowth,
  accentColor,
  isDark,
  textColor,
}: {
  growth: any;
  toggleGrowth: (k: string) => void;
  accentColor: string;
  isDark: boolean;
  textColor: string;
}) {
  return (
    <div className="onboarding-step-fade-in flex-column gap-lg">
      <div style={{ textAlign: "center", marginBottom: 24 }}>
        <h2 style={{ fontSize: 22, marginBottom: 8, color: textColor }}>
          Рост и Аналитика
        </h2>
        <p style={{ opacity: 0.7, lineHeight: 1.5 }}>
          Дополнительные инструменты для привлечения и удержания пациентов.
        </p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <OptionCard
          selected={growth.crm}
          onClick={() => toggleGrowth("crm")}
          icon={<MessageSquare size={24} />}
          title="СRM: Задачи и Напоминания"
          desc="Автоматические напоминания о визите, списки обзвона."
          accentColor={accentColor}
          isDark={isDark}
          textColor={textColor}
        />
        <OptionCard
          selected={growth.analytics}
          onClick={() => toggleGrowth("analytics")}
          icon={<TrendingUp size={24} />}
          title="Глубокая Аналитика"
          desc="Финансовые отчеты, конверсия первичных пациентов, загрузка кресел."
          accentColor={accentColor}
          isDark={isDark}
          textColor={textColor}
        />
        <OptionCard
          selected={growth.omnichannel}
          onClick={() => toggleGrowth("omnichannel")}
          icon={<Megaphone size={24} />}
          title="Маркетинг и Омниканальность"
          desc="Воронки продаж, интеграция с WhatsApp и IP-телефонией."
          accentColor={accentColor}
          isDark={isDark}
          textColor={textColor}
        />
      </div>
    </div>
  );
}
