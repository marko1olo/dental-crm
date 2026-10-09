/**
 * apps/web/src/components/visit/mobileChairside/types.ts
 * DENTE Dental CRM — Sovereign Mobile Chairside Visit Workspace (Layer 0: Types & Constants)
 */

export type MobileChairsideStep =
  | "complaints"
  | "exam"
  | "diagnosis"
  | "treatment"
  | "checkout";

export interface MobileChairsideBillingItem {
  id: string;
  code804n: string;
  title: string;
  priceRub: number;
  quantity: number;
  toothCode?: string | undefined;
}

export interface MobileChairsideVisitWorkspaceProps {
  activePatient: any;
  activeAppointment?: any;
  activeDoctor?: any;
  visitNoteForm?: any;
  updateVisitNoteField: (field: string, value: any) => void;
  flushPendingVisitSaves?: (() => Promise<void> | void) | undefined;
  handleApplySomaticNormQuick?: (() => void) | undefined;
  handleFinishVisitAction?: (() => Promise<void> | void) | undefined;
  handlePrintForm043uFast?: (() => void) | undefined;
  handleOpenLabOrder?: (() => void) | undefined;
  consolidatedAllergyChip?: string | null | undefined;
  patientAge?: string | null | undefined;
  toothStateByCode?: Record<string, string> | undefined;
  setToothState?: ((code: string, state: string) => void) | undefined;
  onClose?: (() => void) | undefined;
  testId?: string | undefined;
  loadedTreatmentPlan?: any;
  initialStep?: MobileChairsideStep | undefined;
}

export interface ChairsideStepItem {
  id: MobileChairsideStep;
  label: string;
  number: number;
}

export interface ChairsidePatientQuickBarProps {
  activePatient: any;
  activeAppointment?: any;
  patientAge?: string | null | undefined;
  consolidatedAllergyChip?: string | null | undefined;
  handlePrintForm043uFast?: (() => void) | undefined;
  handleOpenLabOrder?: (() => void) | undefined;
  onClose?: (() => void) | undefined;
  onPrevStep: () => void;
  testId?: string | undefined;
}

export interface ChairsideStepNavProps {
  currentStep: MobileChairsideStep;
  onStepSelect: (step: MobileChairsideStep) => void;
  visitNoteForm?: any;
  billingItemsCount: number;
  testId?: string | undefined;
}

export interface ChairsideTeethQuickSelectorProps {
  activeQuadrant: 1 | 2 | 3 | 4;
  onQuadrantChange: (quadrant: 1 | 2 | 3 | 4) => void;
  toothStateByCode?: Record<string, string> | undefined;
  setToothState?: ((code: string, state: string) => void) | undefined;
  testId?: string | undefined;
}

export interface ChairsideSmartMicrophoneProps {
  isRecording: boolean;
  onToggleRecording: () => void;
  onAppendPhrase: (phrase: string) => void;
  recognizedSnippet?: string | undefined;
  testId?: string | undefined;
}

export interface ChairsideProtocolsSectionProps {
  currentStep: MobileChairsideStep;
  visitNoteForm?: any;
  updateVisitNoteField: (field: string, value: any) => void;
  activePatient: any;
  activeAppointment?: any;
  loadedTreatmentPlan?: any;
  isStageTaken: boolean;
  onTakeStage: (stage: any, items: any[]) => void;
  // Tooth selector props for exam step
  activeQuadrant: 1 | 2 | 3 | 4;
  onQuadrantChange: (quadrant: 1 | 2 | 3 | 4) => void;
  toothStateByCode?: Record<string, string> | undefined;
  setToothState?: ((code: string, state: string) => void) | undefined;
  // Billing props for checkout step
  billingItems: MobileChairsideBillingItem[];
  totalBillingAmountRub: number;
  onAddBillingItem: (item: { code804n: string; title: string; priceRub: number }) => void;
  onRemoveBillingItem: (id: string) => void;
  isCheckoutSheetOpen: boolean;
  onCloseCheckoutSheet: () => void;
  onConfirmCheckout: () => void;
  testId?: string | undefined;
}

export interface ChairsideBottomStickyActionsProps {
  currentStep: MobileChairsideStep;
  loadedTreatmentPlan?: any;
  isStageTaken: boolean;
  onPrevStep: () => void;
  onNextStep: () => void;
  onTakeActivePlanStage: () => void;
  testId?: string;
}

export const COMMON_DENTAL_DIAGNOSES = [
  { code: "К02.1", title: "Кариес дентина", full: "К02.1 Кариес дентина (средний/глубокий)" },
  { code: "К04.0", title: "Острый пульпит", full: "К04.0 Острый очаговый пульпит" },
  { code: "К04.4", title: "Периодонтит", full: "К04.4 Острый апикальный периодонтит" },
  { code: "К05.1", title: "Хронический гингивит", full: "К05.1 Хронический катаральный гингивит" },
  { code: "Z01.2", title: "Здоров (осмотр)", full: "Z01.2 Стоматологическое обследование (Здоров)" },
];

export const QUICK_CHAIRSIDE_SERVICES = [
  { code804n: "A16.07.002", title: "Пломбирование светоотверждаемым композитом", shortTitle: "Световая пломба", priceRub: 3500 },
  { code804n: "B01.003.004", title: "Анестезия инфильтрационная (Артикаин)", shortTitle: "Анестезия Артикаин", priceRub: 800 },
  { code804n: "B01.065.001", title: "Первичный осмотр и консультация", shortTitle: "Осмотр и консультация", priceRub: 1000 },
  { code804n: "A16.07.051", title: "Профессиональная гигиена Air-Flow", shortTitle: "Профгигиена Air-Flow", priceRub: 4000 },
];

export const TOOTH_STATUS_OPTIONS = [
  { id: "Healthy", label: "Здоров (Интактен)", desc: "Без патологий" },
  { id: "Caries", label: "Кариес", desc: "Поражение твердых тканей" },
  { id: "Pulpitis", label: "Пульпит", desc: "Воспаление сосудисто-нервного пучка" },
  { id: "Periodontitis", label: "Периодонтит", desc: "Периапикальный очаг" },
  { id: "Filled", label: "Пломба", desc: "Ранее леченый зуб" },
  { id: "Missing", label: "Удален (Отсутствует)", desc: "Дефект зубного ряда" },
];

export const PAYMENT_METHOD_OPTIONS = [
  { id: "sbp", label: "СБП (QR-код)", desc: "Комиссия 0.4%, мгновенный чек" },
  { id: "card", label: "Банковская карта (POS)", desc: "Эквайринг у кресла" },
  { id: "cash", label: "Наличные в кассу", desc: "Без сдачи" },
] as const;
