import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom/client";

import "./styles/tailwind.css";
import "./styles/main.css";
import "./styles/themes.css";
import "./styles/theme-overrides.css";
import "./styles/touch-targets.css";
import "./styles/modules/mobile-touch.css";
import "./styles/modules/mobile-patients-list.css";
import "./styles/modules/mobile-patient-profile.css";
import "./components/schedule/scheduleMobileAgenda.css";
import "./components/mobile/mobileHigPrimitives.css";
import "./components/billing/paymentModalStudio.css";

import { ScheduleMobileAgendaView } from "./components/schedule/mobile";
import { MobilePatientsGroupedList } from "./components/patients/mobile";
import { MobileChairsideEHR } from "./components/mobile";
import { MobileChairsideVisitWorkspace } from "./components/visit/MobileChairsideVisitWorkspace";
import { MobilePatientProfileWorkspace } from "./components/patients/MobilePatientProfileWorkspace";
import { PaymentModal } from "./components/billing/PaymentModal";

import type { Appointment, Dashboard, Patient } from "@dental/shared";

const todayIso = new Date().toISOString().slice(0, 10);

const mockDashboard: Dashboard = {
  clinicName: "Стоматология ДЕНТЕ Премиум",
  todayIso,
  clinicSettings: {
    profile: {
      id: "c-1",
      organizationId: "00000000-0000-0000-0000-000000000001",
      clinicName: "Стоматология ДЕНТЕ Премиум",
      mode: "small_clinic",
      defaultVisitMinutes: 45,
      scheduleDefaults: {
        workingDays: [1, 2, 3, 4, 5, 6],
        workdayStart: "08:00",
        workdayEnd: "21:00",
        appointmentBufferMinutes: 10,
      },
      timezone: "Europe/Moscow",
      phone: "+7 (495) 123-45-67",
      address: "Москва, Столярный переулок, 14",
      inn: "7701234567",
      updatedAt: new Date().toISOString(),
    },
    staff: [
      {
        id: "doc-1",
        organizationId: "00000000-0000-0000-0000-000000000001",
        fullName: "Д-р Воронов Алексей Владимирович",
        role: "doctor",
        specialties: ["therapist", "orthopedist"],
        active: true,
        color: "#0d9488",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: "doc-2",
        organizationId: "00000000-0000-0000-0000-000000000001",
        fullName: "Д-р Смирнова Елена Викторовна",
        role: "doctor",
        specialties: ["surgery"],
        active: true,
        color: "#0284c7",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ],
    chairs: [
      {
        id: "chair-1",
        organizationId: "00000000-0000-0000-0000-000000000001",
        name: "Кабинет 1 (Терапия)",
        room: "1",
        defaultDoctorId: "doc-1",
        active: true,
        hasXraySensor: true,
        hasMicroscope: true,
        hasSurgeryKit: false,
      },
      {
        id: "chair-2",
        organizationId: "00000000-0000-0000-0000-000000000001",
        name: "Кабинет 2 (Хирургия)",
        room: "2",
        defaultDoctorId: "doc-2",
        active: true,
        hasXraySensor: true,
        hasMicroscope: false,
        hasSurgeryKit: true,
      },
    ],
    integrationPresets: [],
    workspaceProfiles: [],
    roleAccessPolicies: [],
    modeHints: [],
    soloDoctorMode: false,
  },
  patients: [
    {
      id: "pat-1",
      organizationId: "00000000-0000-0000-0000-000000000001",
      fullName: "Алексеева Виктория Игоревна",
      phone: "+7 (916) 123-45-67",
      birthDate: "1994-05-14",
      status: "active",
      balanceRub: 0,
      notes: "ВНИМАНИЕ: Аллергия на лидокаин и пенициллины!",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: "pat-2",
      organizationId: "00000000-0000-0000-0000-000000000001",
      fullName: "Кузнецов Дмитрий Сергеевич",
      phone: "+7 (926) 777-88-99",
      birthDate: "1988-11-20",
      status: "active",
      balanceRub: -12500,
      notes: "Лечение пульпита 16 зуба, второй этап.",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: "pat-3",
      organizationId: "00000000-0000-0000-0000-000000000001",
      fullName: "Морозова София Михайловна",
      phone: "+7 (903) 444-55-66",
      birthDate: "2001-08-03",
      status: "active",
      balanceRub: 4500,
      notes: "Гигиеническая чистка и осмотр.",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ],
  appointments: [
    {
      id: "appt-1",
      organizationId: "00000000-0000-0000-0000-000000000001",
      patientId: "pat-1",
      doctorUserId: "doc-1",
      chairId: "chair-1",
      startsAt: `${todayIso}T09:00:00.000Z`,
      endsAt: `${todayIso}T10:00:00.000Z`,
      status: "in_treatment",
      reason: "Лечение кариеса 26 зуба, анестезия без лидокаина",
      source: "phone",
      history: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: "appt-2",
      organizationId: "00000000-0000-0000-0000-000000000001",
      patientId: "pat-2",
      doctorUserId: "doc-1",
      chairId: "chair-1",
      startsAt: `${todayIso}T10:30:00.000Z`,
      endsAt: `${todayIso}T11:45:00.000Z`,
      status: "confirmed",
      reason: "Эндодонтия 16 зуба (распломбировка каналов)",
      source: "phone",
      history: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: "appt-3",
      organizationId: "00000000-0000-0000-0000-000000000001",
      patientId: "pat-3",
      doctorUserId: "doc-2",
      chairId: "chair-2",
      startsAt: `${todayIso}T13:00:00.000Z`,
      endsAt: `${todayIso}T14:00:00.000Z`,
      status: "arrived",
      reason: "Профессиональная гигиена полости рта AirFlow",
      source: "phone",
      history: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ],
  bills: [],
  patientInsights: [],
  daySummary: {
    occupancyPercent: 80,
    expectedRevenueRub: 35000,
    arrivedCount: 1,
    inTreatmentCount: 1,
    completedCount: 0,
    cancelledCount: 0,
  },
} as any;

const mockTreatmentPlan = {
  id: "plan-101",
  name: "Комплексный план санации и реставрации",
  status: "Approved",
  stages: [
    {
      id: "stage-1",
      stageNumber: 1,
      title: "Терапевтическая санация кариеса",
      items: [
        {
          id: "tp-item-1",
          code804n: "A16.07.002",
          name: "Восстановление зуба световым композитом",
          price: 4500,
          quantity: 1,
          toothNumber: 16,
        },
        {
          id: "tp-item-2",
          code804n: "A16.07.051",
          name: "Профессиональная гигиена полости рта",
          price: 3500,
          quantity: 1,
        },
      ],
    },
    {
      id: "stage-2",
      stageNumber: 2,
      title: "Ортопедический этап",
      items: [
        {
          id: "tp-item-3",
          code804n: "A16.07.004",
          name: "Восстановление зуба керамической коронкой",
          price: 28000,
          quantity: 1,
          toothNumber: 26,
        },
      ],
    },
  ],
};

export const MobileHigPreviewApp: React.FC = () => {
  const [screen, setScreen] = useState<"schedule" | "patients" | "chairside" | "patient_profile" | "payment">("schedule");
  const [chairsideStep, setChairsideStep] = useState<any>("complaints");
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [currentDateKey, setCurrentDateKey] = useState<string>(todayIso);
  const [patientQuery, setPatientQuery] = useState("");
  const [isDevBarHidden, setIsDevBarHidden] = useState(false);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const screenParam = urlParams.get("screen") as "schedule" | "patients" | "chairside" | "patient_profile" | "payment" | null;
    if (screenParam && ["schedule", "patients", "chairside", "patient_profile", "payment"].includes(screenParam)) {
      setScreen(screenParam);
    }
    const stepParam = urlParams.get("step");
    if (stepParam && ["complaints", "exam", "diagnosis", "treatment", "checkout"].includes(stepParam)) {
      setChairsideStep(stepParam);
    }
    const themeParam = urlParams.get("theme") as "light" | "dark" | null;
    if (themeParam && ["light", "dark"].includes(themeParam)) {
      setTheme(themeParam);
    }
    if (urlParams.get("hideDevBar") === "1" || urlParams.get("hideDevBar") === "true") {
      setIsDevBarHidden(true);
    }
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
      document.documentElement.classList.remove("light");
    } else {
      document.documentElement.classList.remove("dark");
      document.documentElement.classList.add("light");
    }
  }, [theme]);

  const appointmentLabels: Record<Appointment["status"], string> = {
    planned: "Запланирован",
    confirmed: "Подтвержден",
    arrived: "В холле",
    in_treatment: "В кресле",
    completed: "Завершен",
    cancelled: "Отменен",
    no_show: "Не явился",
  };

  return (
    <div className="mobile-hig-viewport h-[100dvh] max-h-[100dvh] flex flex-col overflow-hidden">
      {/* Dev Switcher Bar (Hidden when ?hideDevBar=1 for clean screenshots) */}
      {!isDevBarHidden && (
        <div className="mobile-dev-switcher shrink-0 p-1.5 bg-[var(--paper-soft)] border-b border-[var(--line-subtle)] flex items-center justify-between text-xs font-semibold gap-1.5 z-50 overflow-x-auto">
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              className={`px-2 py-1 rounded-lg ${screen === "schedule" ? "bg-[var(--teal)] text-white" : "bg-[var(--paper)] text-[var(--ink)] border border-[var(--line)]"}`}
              onClick={() => setScreen("schedule")}
              data-testid="switch-screen-schedule"
            >
              Расписание
            </button>
            <button
              type="button"
              className={`px-2 py-1 rounded-lg ${screen === "chairside" ? "bg-[var(--teal)] text-white" : "bg-[var(--paper)] text-[var(--ink)] border border-[var(--line)]"}`}
              onClick={() => setScreen("chairside")}
              data-testid="switch-screen-chairside"
            >
              Приём
            </button>
            <button
              type="button"
              className={`px-2 py-1 rounded-lg ${screen === "patient_profile" ? "bg-[var(--teal)] text-white" : "bg-[var(--paper)] text-[var(--ink)] border border-[var(--line)]"}`}
              onClick={() => setScreen("patient_profile")}
              data-testid="switch-screen-patient-profile"
            >
              Медкарта
            </button>
            <button
              type="button"
              className={`px-2 py-1 rounded-lg ${screen === "payment" ? "bg-[var(--teal)] text-white" : "bg-[var(--paper)] text-[var(--ink)] border border-[var(--line)]"}`}
              onClick={() => setScreen("payment")}
              data-testid="switch-screen-payment"
            >
              Оплата
            </button>
            <button
              type="button"
              className={`px-2 py-1 rounded-lg ${screen === "patients" ? "bg-[var(--teal)] text-white" : "bg-[var(--paper)] text-[var(--ink)] border border-[var(--line)]"}`}
              onClick={() => setScreen("patients")}
              data-testid="switch-screen-patients"
            >
              Пациенты
            </button>
          </div>

          <button
            type="button"
            className="px-2.5 py-1 rounded-lg bg-[var(--paper)] border border-[var(--line)] text-[var(--ink)] shrink-0"
            onClick={() => setTheme((prev) => (prev === "light" ? "dark" : "light"))}
            data-testid="switch-theme-btn"
          >
            {theme === "light" ? "🌙" : "☀️"}
          </button>
        </div>
      )}

      {/* Screen Views Wrapper */}
      <div className="flex-1 min-h-0 flex flex-col overflow-hidden relative">

      {/* 1. Schedule Agenda */}
      {screen === "schedule" && (
        <ScheduleMobileAgendaView
          dashboard={mockDashboard}
          dateKey={currentDateKey}
          appointments={mockDashboard.appointments}
          onDateChange={(d) => setCurrentDateKey(d)}
          patientName={(_pats, id) => {
            const pat = mockDashboard.patients.find((p) => p.id === id);
            return pat ? pat.fullName : "Пациент";
          }}
          formatTime={(iso) => iso.slice(11, 16)}
          toDateTimeLocalValue={(iso) => iso.replace("Z", "").slice(0, 16)}
          appointmentLabels={appointmentLabels}
          timezone="Europe/Moscow"
          onSlotClick={() => {}}
          onQuickBooking={() => {}}
        />
      )}

      {/* 2. Chairside EHR */}
      {screen === "chairside" && (
        <MobileChairsideVisitWorkspace
          activePatient={{
            id: "pat-1",
            fullName: "Алексеева Виктория Игоревна",
            phone: "+7 (916) 555-01-99",
            birthDate: "1992-04-12",
            allergies: ["Лидокаин", "Новокаин"],
          }}
          activeAppointment={{
            id: "apt-1",
            startTime: new Date().toISOString(),
            status: "in_progress",
          }}
          activeDoctor={{
            id: "doc-1",
            fullName: "Д-р Воронов Алексей Владимирович",
            specialties: ["therapist"],
          }}
          visitNoteForm={{
            complaint: "Жалобы на ноющие боли от холодного и сладкого в зубе 16.",
            anamnesis: "Соматически здоров. Аллергоанамнез отягощен: Лидокаин, Новокаин.",
            objectiveStatus: "Зуб 16: кариозная полость средней глубины на окклюзионной поверхности, зондирование болезненно по ЭДГ.",
            diagnosis: "К02.1 Кариес дентина 16 зуба",
            treatmentPlan: "Анестезия Артикаин 1:100000 1.7мл. Препарирование полости, изоляция, бондинг, пломба световой полимеризации Harmonize A3.",
          }}
          updateVisitNoteField={() => {}}
          consolidatedAllergyChip="Аллергия: Лидокаин, Новокаин"
          patientAge="32 года"
          handlePrintForm043uFast={() => {}}
          handleOpenLabOrder={() => {}}
          onClose={() => setScreen("schedule")}
          testId="mobile-chairside-workspace"
          loadedTreatmentPlan={mockTreatmentPlan}
          initialStep={chairsideStep}
        />
      )}

      {/* 3. Patient Profile / Medical Card */}
      {screen === "patient_profile" && (
        <MobilePatientProfileWorkspace
          patient={mockDashboard.patients[0]!}
          dashboard={mockDashboard}
          onBack={() => setScreen("patients")}
          onSelectPatient={() => {}}
          onOpenVisit={() => setScreen("chairside")}
          onNewAppointment={() => setScreen("schedule")}
          money={(rub) => `${rub.toLocaleString("ru-RU")} ₽`}
        />
      )}

      {/* 4. Payment & Checkout 54-FZ Modal */}
      {screen === "payment" && (
        <div className="relative w-full h-full flex flex-col justify-end bg-black/40">
          <PaymentModal
            isOpen={true}
            onClose={() => setScreen("chairside")}
            patientId="pat-1"
            patientName="Алексеева Виктория Игоревна"
            patientPhone="+7 (916) 123-45-67"
            amountRub={4500}
            doctorName="Д-р Воронов Алексей Владимирович"
            clinicLegalName="ООО «ДЕНТЕ СТОМАТОЛОГИЯ»"
          />
        </div>
      )}

      {/* 5. Patients Grouped List */}
      {screen === "patients" && (
        <MobilePatientsGroupedList
          patients={mockDashboard.patients}
          selectedPatientId={null}
          onSelectPatient={() => setScreen("patient_profile")}
          onCreatePatient={() => {}}
          onOpenTactileSearch={() => {}}
          query={patientQuery}
          onQueryChange={(q) => setPatientQuery(q)}
          onClearQuery={() => setPatientQuery("")}
          money={(rub) => `${rub.toLocaleString("ru-RU")} ₽`}
        />
      )}
      </div>
    </div>
  );
};

const rootElement = document.getElementById("root");
if (rootElement) {
  ReactDOM.createRoot(rootElement).render(<MobileHigPreviewApp />);
}
