import React from "react";
import { UserPlus, UserCog, UserCheck, Trash2 } from "lucide-react";
import type { StaffEntry } from "../useOnboardingLogic";

export function Step2Team({
  staff,
  setStaff,
  accentColor,
  isDark,
  textColor,
}: {
  staff: StaffEntry[];
  setStaff: (s: StaffEntry[]) => void;
  accentColor: string;
  isDark: boolean;
  textColor: string;
}) {
  const addStaff = () => {
    setStaff([
      ...staff,
      {
        id: Math.random().toString(36).substring(7),
        fullName: "",
        role: "Медсестра",
        specialization: "Ассистент",
        percentage: 0,
        canSignMedicalRecords: false,
        canManageMoney: false,
        canManageImports: false,
      },
    ]);
  };

  const updateStaff = (id: string, field: keyof StaffEntry, value: any) => {
    setStaff(
      staff.map((s) => (s.id === id ? { ...s, [field]: value } : s))
    );
  };

  const removeStaff = (id: string) => {
    setStaff(staff.filter((s) => s.id !== id));
  };

  return (
    <div className="onboarding-step-fade-in flex-column gap-lg">
      <div style={{ textAlign: "center", marginBottom: 24 }}>
        <h2 style={{ fontSize: 22, marginBottom: 8, color: textColor }}>
          Кто работает с вами?
        </h2>
        <p style={{ opacity: 0.7, lineHeight: 1.5 }}>
          Добавьте медсестер, администраторов или других врачей. Выдадим им базовые права.
        </p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {staff.map((s, idx) => (
          <div
            key={s.id}
            style={{
              background: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.02)",
              border: `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"}`,
              padding: 16,
              borderRadius: 12,
              display: "flex",
              flexDirection: "column",
              gap: 12,
              position: "relative"
            }}
          >
            <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 12, opacity: 0.7, marginBottom: 4, display: "block" }}>ФИО сотрудника</label>
                <input
                  type="text"
                  value={s.fullName}
                  onChange={(e) => updateStaff(s.id, "fullName", e.target.value)}
                  placeholder="Петрова Анна Сергеевна"
                  style={{
                    width: "100%",
                    background: "transparent",
                    border: `1px solid ${isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.2)"}`,
                    padding: "8px 12px",
                    borderRadius: 8,
                    color: textColor,
                    outline: "none"
                  }}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 12, opacity: 0.7, marginBottom: 4, display: "block" }}>Роль</label>
                <select
                  value={s.role}
                  onChange={(e) => updateStaff(s.id, "role", e.target.value)}
                  style={{
                    width: "100%",
                    background: isDark ? "#2a2d3e" : "#f1f5f9",
                    border: `1px solid ${isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.2)"}`,
                    padding: "8px 12px",
                    borderRadius: 8,
                    color: textColor,
                    outline: "none",
                    height: 38
                  }}
                >
                  <option value="Врач">Врач</option>
                  <option value="Медсестра">Медсестра / Ассистент</option>
                  <option value="Администратор">Администратор</option>
                  <option value="Управляющий">Управляющий</option>
                </select>
              </div>
              <button
                onClick={() => removeStaff(s.id)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#ef4444",
                  cursor: "pointer",
                  padding: 8,
                  marginTop: 20
                }}
                title="Удалить"
              >
                <Trash2 size={18} />
              </button>
            </div>
            <div style={{ fontSize: 13, opacity: 0.8, background: `${accentColor}11`, padding: "8px 12px", borderRadius: 6 }}>
              {s.role === "Медсестра" && "Сможет видеть расписание, склад и карточки пациентов. Не имеет доступа к деньгам."}
              {s.role === "Администратор" && "Сможет управлять расписанием и платежами. Не может подписывать медицинские документы."}
              {s.role === "Врач" && "Имеет полный медицинский доступ к своим пациентам."}
              {s.role === "Управляющий" && "Имеет доступ ко всей статистике и финансам клиники."}
            </div>
          </div>
        ))}

        <button
          onClick={addStaff}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            padding: "16px",
            background: "transparent",
            border: `2px dashed ${accentColor}66`,
            color: accentColor,
            borderRadius: 12,
            cursor: "pointer",
            fontWeight: 600
          }}
        >
          <UserPlus size={18} />
          Добавить сотрудника
        </button>
      </div>
    </div>
  );
}
