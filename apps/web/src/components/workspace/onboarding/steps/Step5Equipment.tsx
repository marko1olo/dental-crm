import React from "react";
import { Camera, FlaskConical, Microscope, Box, ShieldCheck } from "lucide-react";
import { OptionCard } from "../ui/SharedOnboardingUI";

export function Step5Equipment({
  equipment,
  toggleEquipment,
  accentColor,
  isDark,
  textColor,
}: {
  equipment: any;
  toggleEquipment: (k: string) => void;
  accentColor: string;
  isDark: boolean;
  textColor: string;
}) {
  return (
    <div className="onboarding-step-fade-in flex-column gap-lg">
      <div style={{ textAlign: "center", marginBottom: 24 }}>
        <h2 style={{ fontSize: 22, marginBottom: 8, color: textColor }}>
          Оборудование и модули
        </h2>
        <p style={{ opacity: 0.7, lineHeight: 1.5 }}>
          Включите нужные разделы системы. Мы уже предвыбрали их на основе ваших специализаций.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <OptionCard
          selected={equipment.xray}
          onClick={() => toggleEquipment("xray")}
          icon={<Camera size={24} />}
          title="Рентген / КЛКТ"
          desc="Архив снимков в карточке пациента с разметкой."
          accentColor={accentColor}
          isDark={isDark}
          textColor={textColor}
        />
        <OptionCard
          selected={equipment.lab}
          onClick={() => toggleEquipment("lab")}
          icon={<FlaskConical size={24} />}
          title="Зуботехническая лаборатория"
          desc="Заказ-наряды, статусы работ, учет долгов перед техниками."
          accentColor={accentColor}
          isDark={isDark}
          textColor={textColor}
        />
        <OptionCard
          selected={equipment.microscope}
          onClick={() => toggleEquipment("microscope")}
          icon={<Microscope size={24} />}
          title="Микроскоп"
          desc="Позволяет указывать лечение под микроскопом в протоколах."
          accentColor={accentColor}
          isDark={isDark}
          textColor={textColor}
        />
        <OptionCard
          selected={equipment.cso}
          onClick={() => toggleEquipment("cso")}
          icon={<ShieldCheck size={24} />}
          title="ЦСО (Стерилизация)"
          desc="Журналы стерилизации, контроль циклов автоклава."
          accentColor={accentColor}
          isDark={isDark}
          textColor={textColor}
        />
        <OptionCard
          selected={equipment.inventory}
          onClick={() => toggleEquipment("inventory")}
          icon={<Box size={24} />}
          title="Складской учет"
          desc="Приход, списание материалов, критические остатки."
          accentColor={accentColor}
          isDark={isDark}
          textColor={textColor}
        />
      </div>
    </div>
  );
}
