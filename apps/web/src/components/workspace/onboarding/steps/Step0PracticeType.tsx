import React from "react";
import { User, Users, Building2 } from "lucide-react";
import { OptionCard } from "../ui/SharedOnboardingUI";

export function Step0PracticeType({
  practiceType,
  handleSelectPracticeType,
  accentColor,
  isDark,
  textColor,
}: {
  practiceType: "solo" | "solo_with_team" | "small_clinic";
  handleSelectPracticeType: (p: "solo" | "solo_with_team" | "small_clinic") => void;
  accentColor: string;
  isDark: boolean;
  textColor: string;
}) {
  return (
    <div className="onboarding-step-fade-in flex-column gap-lg">
      <div style={{ textAlign: "center", marginBottom: 24 }}>
        <h2 style={{ fontSize: 22, marginBottom: 8, color: textColor }}>
          Как вы работаете?
        </h2>
        <p style={{ opacity: 0.7, lineHeight: 1.5 }}>
          Это поможет нам настроить DENTE именно под вас. Мы скроем лишнее и оставим только то, что нужно для вашей практики.
        </p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <OptionCard
          selected={practiceType === "solo"}
          onClick={() => handleSelectPracticeType("solo")}
          icon={<User size={24} />}
          title="Я работаю один"
          desc="Частная практика. Врач сам себе администратор и медсестра. Минимум настроек, максимум скорости."
          accentColor={accentColor}
          isDark={isDark}
          textColor={textColor}
        />
        <OptionCard
          selected={practiceType === "solo_with_team"}
          onClick={() => handleSelectPracticeType("solo_with_team")}
          icon={<Users size={24} />}
          title="Я врач, но есть помощники"
          desc="Один врач, но работают ассистенты или администратор. Добавятся роли и склад."
          accentColor={accentColor}
          isDark={isDark}
          textColor={textColor}
        />
        <OptionCard
          selected={practiceType === "small_clinic"}
          onClick={() => handleSelectPracticeType("small_clinic")}
          icon={<Building2 size={24} />}
          title="У нас кабинет / клиника"
          desc="Несколько врачей и кресел. Добавятся графики смен, продвинутая аналитика и зарплаты."
          accentColor={accentColor}
          isDark={isDark}
          textColor={textColor}
        />
      </div>
    </div>
  );
}
