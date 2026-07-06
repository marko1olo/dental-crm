import React from 'react';
import { useAppLogicContext } from '../../logic/AppLogicContext';

export function OnboardingWizard() {
  const {
    onboardingStep,
    onboardingSteps,
    clinicName,
    handleFinishOnboarding,
    setResetting,
    handleSelectDemoMode,
    resetting,
    handleSelectZeroMode,
    clinicProfileDraft,
    updateClinicProfileDraft,
    roleFocusOrder,
    selectedWorkspaceRole,
    setSelectedWorkspaceRole,
    staffRoleLabels,
    newStaffName,
    setNewStaffName,
    newChairName,
    setNewChairName,
    previousOnboardingStep,
    moveOnboardingTo,
    nextOnboardingStep,
  } = useAppLogicContext();

  return (
      <main className="app-shell onboarding-fullscreen" style={{ display: "flex", flexDirection: "column", minHeight: "100vh", padding: "40px 20px", background: "linear-gradient(135deg, #0d9488 0%, #111827 100%)", overflowY: "auto" }}>
        <section className="workspace onboarding-only-workspace" id="workspace-content" style={{ maxWidth: "800px", width: "100%", margin: "auto", padding: "0", background: "none", boxShadow: "none" }}>
          <section className="onboarding-shell" aria-label="Первичная настройка клиники" style={{ width: "100%", background: "#ffffff", borderRadius: "16px", boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)", padding: "32px", border: "1px solid #e5e7eb" }}>
            
            {/* Onboarding Header */}
            <div className="onboarding-head" style={{ borderBottom: "1px solid #f3f4f6", paddingBottom: "20px", marginBottom: "24px" }}>
              <div>
                <p className="eyebrow" style={{ textTransform: "uppercase", fontSize: "12px", letterSpacing: "0.05em", color: "#0d9488", fontWeight: "600" }}>Первый запуск</p>
                <h2 style={{ fontSize: "24px", fontWeight: "700", color: "#111827", marginTop: "4px" }}>Быстрая настройка CRM Dente</h2>
              </div>
            </div>

            {/* Step list if not intro */}
            {onboardingStep !== "intro" ? (
              <div className="wizard-step-list" style={{ display: "flex", gap: "12px", marginBottom: "32px" }}>
                {onboardingSteps.map((step, index) => (
                  <div
                    key={step.id}
                    style={{
                      flex: "1",
                      padding: "10px",
                      borderRadius: "8px",
                      background: step.id === onboardingStep ? "#f0fdfa" : "#f9fafb",
                      border: "1px solid",
                      borderColor: step.id === onboardingStep ? "#0d9488" : "#e5e7eb",
                      display: "flex",
                      flexDirection: "column",
                      gap: "2px"
                    }}
                  >
                    <span style={{ fontSize: "11px", color: step.id === onboardingStep ? "#0d9488" : "#6b7280", fontWeight: "600" }}>Шаг {index + 1}</span>
                    <strong style={{ fontSize: "14px", color: step.id === onboardingStep ? "#0f766e" : "#374151" }}>{step.title}</strong>
                    <span style={{ fontSize: "11px", color: "#6b7280" }}>{step.detail}</span>
                  </div>
                ))}
              </div>
            ) : null}

            {/* Intro Step */}
            {onboardingStep === "intro" ? (
              <div className="onboarding-panel" style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
                <div>
                  <h3 style={{ fontSize: "20px", fontWeight: "600", marginBottom: "8px" }}>Режим запуска приложения</h3>
                  <p style={{ color: "#4b5563" }}>
                    Выберите, в каком режиме вы хотите запустить CRM. Для быстрого тестирования используйте демо-режим, для реальной работы — чистый запуск.
                  </p>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
                  <button
                    type="button"
                    onClick={async () => {
                      setResetting(true);
                      await handleSelectDemoMode();
                      setResetting(false);
                    }}
                    disabled={resetting}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "flex-start",
                      textAlign: "left",
                      padding: "20px",
                      background: "linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%)",
                      border: "2px solid #38bdf8",
                      borderRadius: "12px",
                      cursor: "pointer",
                      transition: "transform 0.2s, box-shadow 0.2s"
                    }}
                  >
                    <span style={{ fontSize: "28px", marginBottom: "12px" }}>🚀</span>
                    <strong style={{ fontSize: "16px", color: "#0369a1", marginBottom: "6px" }}>Попробовать демо-режим</strong>
                    <span style={{ fontSize: "13px", color: "#0c4a6e" }}>
                      Запустить систему с готовыми демонстрационными данными (тестовые пациенты, расписание, приемы и оплаты), чтобы быстро ознакомиться с возможностями.
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={async () => {
                      setResetting(true);
                      await handleSelectZeroMode();
                      setResetting(false);
                    }}
                    disabled={resetting}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "flex-start",
                      textAlign: "left",
                      padding: "20px",
                      background: "linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)",
                      border: "2px solid #4ade80",
                      borderRadius: "12px",
                      cursor: "pointer",
                      transition: "transform 0.2s, box-shadow 0.2s"
                    }}
                  >
                    <span style={{ fontSize: "28px", marginBottom: "12px" }}>✨</span>
                    <strong style={{ fontSize: "16px", color: "#15803d", marginBottom: "6px" }}>Начать с чистого листа</strong>
                    <span style={{ fontSize: "13px", color: "#14532d" }}>
                      Полностью пустая база данных для настройки клиники с нуля. Вы сможете ввести свои данные, добавить врачей и кабинеты шаг за шагом.
                    </span>
                  </button>
                </div>
              </div>
            ) : null}

            {/* Clinic step */}
            {onboardingStep === "clinic" ? (
              <div className="onboarding-panel" style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                <div>
                  <h3 style={{ fontSize: "18px", fontWeight: "600", marginBottom: "6px" }}>О клинике</h3>
                  <p style={{ color: "#4b5563" }}>Название и телефон понадобятся для генерации договоров и медицинских карт.</p>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    <label style={{ fontSize: "14px", fontWeight: "500", color: "#374151" }}>Название клиники</label>
                    <input
                      id="onboarding-clinic-name"
                      style={{ padding: "10px", borderRadius: "8px", border: "1px solid #d1d5db", fontSize: "15px" }}
                      value={clinicProfileDraft.clinicName}
                      onChange={(event) => updateClinicProfileDraft("clinicName", event.target.value)}
                      placeholder="Стоматология..."
                    />
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    <label style={{ fontSize: "14px", fontWeight: "500", color: "#374151" }}>Телефон для связи</label>
                    <input
                      id="onboarding-clinic-phone"
                      style={{ padding: "10px", borderRadius: "8px", border: "1px solid #d1d5db", fontSize: "15px" }}
                      value={clinicProfileDraft.phone}
                      onChange={(event) => updateClinicProfileDraft("phone", event.target.value)}
                      placeholder="89..."
                    />
                  </div>
                </div>
              </div>
            ) : null}

            {/* Team step */}
            {onboardingStep === "team" ? (
              <div className="onboarding-panel" style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                <div>
                  <h3 style={{ fontSize: "18px", fontWeight: "600", marginBottom: "6px" }}>Ваша роль и данные</h3>
                  <p style={{ color: "#4b5563" }}>Укажите свою рабочую роль в клинике и личные данные для настройки интерфейса.</p>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    <label style={{ fontSize: "14px", fontWeight: "500", color: "#374151" }}>Ваша рабочая роль</label>
                    <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                      {roleFocusOrder.map((role) => (
                        <button
                          className={selectedWorkspaceRole === role ? "active" : ""}
                          key={role}
                          type="button"
                          aria-pressed={selectedWorkspaceRole === role}
                          onClick={() => setSelectedWorkspaceRole(role)}
                          style={{
                            padding: "8px 16px",
                            borderRadius: "20px",
                            border: "1px solid",
                            borderColor: selectedWorkspaceRole === role ? "#0d9488" : "#d1d5db",
                            background: selectedWorkspaceRole === role ? "#0d9488" : "#ffffff",
                            color: selectedWorkspaceRole === role ? "#ffffff" : "#374151",
                            fontWeight: "500",
                            cursor: "pointer"
                          }}
                        >
                          {staffRoleLabels[role]}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    <label style={{ fontSize: "14px", fontWeight: "500", color: "#374151" }}>
                      {selectedWorkspaceRole === "owner" ? "ФИО владельца клиники" :
                       selectedWorkspaceRole === "doctor" ? "ФИО врача" :
                       selectedWorkspaceRole === "administrator" ? "ФИО администратора" :
                       selectedWorkspaceRole === "assistant" ? "ФИО ассистента" :
                       "ФИО сотрудника"}
                    </label>
                    <input
                      id="onboarding-staff-name"
                      style={{ padding: "10px", borderRadius: "8px", border: "1px solid #d1d5db", fontSize: "15px" }}
                      value={newStaffName}
                      onChange={(event) => setNewStaffName(event.target.value)}
                      placeholder="Иванов Иван Иванович"
                    />
                  </div>
                  {(selectedWorkspaceRole === "doctor" || selectedWorkspaceRole === "assistant") && (
                    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                      <label style={{ fontSize: "14px", fontWeight: "500", color: "#374151" }}>Название кабинета/кресла</label>
                      <input
                        id="onboarding-chair-name"
                        style={{ padding: "10px", borderRadius: "8px", border: "1px solid #d1d5db", fontSize: "15px" }}
                        value={newChairName}
                        onChange={(event) => setNewChairName(event.target.value)}
                        placeholder="Кабинет терапевта"
                      />
                    </div>
                  )}
                </div>
              </div>
            ) : null}

            {/* Done step */}
            {onboardingStep === "done" ? (
              <div className="onboarding-panel" style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                <div>
                  <h3 style={{ fontSize: "20px", fontWeight: "600", marginBottom: "8px" }}>Все готово к запуску!</h3>
                  <p style={{ color: "#4b5563" }}>
                    Проверьте параметры перед открытием рабочей смены. Вы сможете изменить любые настройки позже.
                  </p>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: (selectedWorkspaceRole === "doctor" || selectedWorkspaceRole === "assistant") ? "1fr 1fr" : "1fr", gap: "16px", background: "#f9fafb", padding: "20px", borderRadius: "12px", border: "1px solid #e5e7eb" }}>
                  <div>
                    <span style={{ fontSize: "12px", textTransform: "uppercase", color: "#6b7280", display: "block" }}>Название клиники</span>
                    <strong style={{ fontSize: "15px", color: "#111827" }}>{clinicProfileDraft.clinicName || "Новая стоматология"}</strong>
                  </div>
                  <div>
                    <span style={{ fontSize: "12px", textTransform: "uppercase", color: "#6b7280", display: "block" }}>Ваша рабочая роль</span>
                    <strong style={{ fontSize: "15px", color: "#111827" }}>{staffRoleLabels[selectedWorkspaceRole]}</strong>
                  </div>
                  <div>
                    <span style={{ fontSize: "12px", textTransform: "uppercase", color: "#6b7280", display: "block" }}>Первый специалист</span>
                    <strong style={{ fontSize: "15px", color: "#111827" }}>{newStaffName || "Администратор"}</strong>
                  </div>
                  {(selectedWorkspaceRole === "doctor" || selectedWorkspaceRole === "assistant") && (
                    <div>
                      <span style={{ fontSize: "12px", textTransform: "uppercase", color: "#6b7280", display: "block" }}>Кабинет / кресло</span>
                      <strong style={{ fontSize: "15px", color: "#111827" }}>{newChairName || "Кабинет №1"}</strong>
                    </div>
                  )}
                </div>
              </div>
            ) : null}

            {/* Actions Footer */}
            <div className="onboarding-actions" style={{ display: "flex", justifyContent: "flex-end", gap: "12px", marginTop: "24px" }}>
              {onboardingStep !== "intro" && previousOnboardingStep ? (
                <button
                  className="secondary-button"
                  type="button"
                  onClick={() => void moveOnboardingTo(previousOnboardingStep.id)}
                  style={{
                    padding: "10px 20px",
                    borderRadius: "8px",
                    border: "1px solid #d1d5db",
                    background: "#ffffff",
                    color: "#374151",
                    fontWeight: "500",
                    cursor: "pointer"
                  }}
                >
                  Назад
                </button>
              ) : null}
              {onboardingStep !== "intro" && nextOnboardingStep ? (
                <button
                  className="primary-button"
                  type="button"
                  onClick={() => void moveOnboardingTo(nextOnboardingStep.id)}
                  style={{
                    padding: "10px 24px",
                    borderRadius: "8px",
                    border: "none",
                    background: "#0d9488",
                    color: "#ffffff",
                    fontWeight: "600",
                    cursor: "pointer"
                  }}
                >
                  Дальше
                </button>
              ) : null}
              {onboardingStep === "done" ? (
                <button
                  className="primary-button"
                  type="button"
                  onClick={() => void handleFinishOnboarding(newStaffName, newChairName)}
                  style={{
                    padding: "10px 24px",
                    borderRadius: "8px",
                    border: "none",
                    background: "#0d9488",
                    color: "#ffffff",
                    fontWeight: "600",
                    cursor: "pointer"
                  }}
                >
                  Начать работу
                </button>
              ) : null}
            </div>

          </section>
        </section>
      </main>
  );
}
