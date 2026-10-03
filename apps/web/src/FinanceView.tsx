import type { Dashboard, Patient, PaymentMethod } from "@dental/shared";
import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { ChevronDown, FileText } from "lucide-react";
import { money as formatMoney } from "./AppHelpers";
import {
	safeLocalStorageGetItem,
	safeLocalStorageSetItem,
	safeLocalStorageRemoveItem,
} from "./lib/safeLocalStorage";
import { localDayKey, summarizeCashDay } from "./components/finance/cashDaySummary";
import { ClinicalAiPersonalizePanel } from "./ClinicalAiPersonalizePanel";
import { ClinicalRulePanel } from "./ClinicalRulePanel";
import { CashDayTally } from "./components/finance/CashDayTally";
import { CashShiftWidget } from "./components/finance/CashShiftWidget";
import { FamilyWalletPanel } from "./components/finance/FamilyWalletPanel";
import { useAppLogicContext } from "./contexts/AppLogicContext";
import { FinanceLedger } from "./FinanceLedger";

import {
	FinancePlanningOverview,
	ServiceCatalogStrip,
} from "./FinancePlanning";
import { motionSafeScrollIntoView } from "./motionPreference";
import { PaymentCapture } from "./PaymentCapture";
import { rubAmountForInput } from "./components/payments/cashDeskAmounts.js";
import { callCashShiftApi } from "./components/finance/cashShiftApi";
import { FinanceToolbar } from "./components/finance/FinanceToolbar";
import { FinanceInvoicesModal } from "./components/finance/FinanceInvoicesModal";
import { FinanceCashboxModal } from "./components/finance/FinanceCashboxModal";
import { PatientBillingModal } from "./components/finance/PatientBillingModal";
import { QuickExpenseModal } from "./components/finance/QuickExpenseModal";

const ManagerialPnlDashboardModal = lazy(() =>
	import("./components/finance/pnl/ManagerialPnlDashboardModal").then((m) => ({
		default: m.ManagerialPnlDashboardModal,
	})),
);

type ClinicalRuleEvaluation = Dashboard["clinicalRuleEvaluations"][number];
type Payment = Dashboard["payments"][number];
type ServiceCatalogItem = Dashboard["serviceCatalog"][number];
type TreatmentPlanItem = Dashboard["treatmentPlanItems"][number];
type TreatmentPlanScenario = Dashboard["treatmentPlanScenarios"][number];
type TaxDeductionCode = "" | "1" | "2";

type FinanceViewProps = {
	activePayments: Payment[];
	activeTreatmentPlanItems: TreatmentPlanItem[];
	activeTreatmentPlanScenarios: TreatmentPlanScenario[];
	/*
	 * null — «итог не посчитан», а не «нулевой итог».
	 *
	 * Источник (useAppLogic.tsx, patientBillingSummary) отдаёт null, пока нет
	 * дашборда или не выбран пациент. Раньше в этом случае приходил объект из
	 * восьми нулей, и экран заявлял «пациент ничего не должен». Признак стоит на
	 * самой сводке, потому что неизвестна она целиком; поля общей схемы
	 * (billingSummarySchema) остаются number — общий контракт денег не тронут.
	 */
	billingSummary: Dashboard["billingSummary"] | null;
	clinicalRuleEvaluations: ClinicalRuleEvaluation[];
	clinicalRuleActionLabels: Record<ClinicalRuleEvaluation["action"], string>;
	clinicalRuleSeverityLabels: Record<
		ClinicalRuleEvaluation["severity"],
		string
	>;
	clinicalRuleSummary: Dashboard["clinicalRuleSummary"];
	dashboard: Dashboard;
	documentPatient: Patient | null;
	formatDateTime: (value: string) => string;
	isPaymentSaving: boolean;
	money: (value: number | null) => string;
	onCashIn?: (amountRub: number, basis: string, typeAlias?: string) => void | Promise<void>;
	onCashOut?: (amountRub: number, basis: string, recipientFio?: string, typeAlias?: string) => void | Promise<void>;
	onCloseShift?: () => void | Promise<void>;
	onCreateDocument?: (kind: string) => void;
	onGoToDocuments: () => void;
	onGoToPrices: () => void;
	onGoToVisit: () => void;
	onOpenShift?: () => void | Promise<void>;
	onRecordPayment: () => void;
	paymentAmount: string;
	paymentFeedback: string;
	paymentFiscalCashierName: string;
	paymentFiscalFd: string;
	paymentFiscalFn: string;
	paymentFiscalFpd: string;
	paymentFiscalReceiptIssuedAt: string;
	paymentFiscalReceiptNumber: string;
	paymentFiscalReceiptUrl: string;
	paymentFiscalReceiptLabel: (
		payment: Pick<Payment, "id" | "fiscalReceiptNumber" | "fiscalReceipt">,
	) => string;
	paymentMethod: PaymentMethod;
	paymentMethodLabels: Record<PaymentMethod, string>;
	paymentPatientContextMessage: string;
	paymentPatientContextReady: boolean;
	paymentPayerBirthDate: string;
	paymentPayerFullName: string;
	paymentPayerIdentityDocument: string;
	paymentPayerInn: string;
	paymentPayerRelationship: string;
	paymentTaxDeductionCode: TaxDeductionCode;
	scenarioPriorityLabels: Record<TreatmentPlanScenario["priority"], string>;
	scenarioStrategyLabels: Record<TreatmentPlanScenario["strategy"], string>;
	serviceCategoryLabels: Record<ServiceCatalogItem["category"], string>;
	serviceTitle: (serviceId: string) => string;
	setPaymentAmount: (value: string) => void;
	setPaymentFiscalCashierName: (value: string) => void;
	setPaymentFiscalFd: (value: string) => void;
	setPaymentFiscalFn: (value: string) => void;
	setPaymentFiscalFpd: (value: string) => void;
	setPaymentFiscalReceiptIssuedAt: (value: string) => void;
	setPaymentFiscalReceiptNumber: (value: string) => void;
	setPaymentFiscalReceiptUrl: (value: string) => void;
	setPaymentMethod: (value: PaymentMethod) => void;
	setPaymentPayerBirthDate: (value: string) => void;
	setPaymentPayerFullName: (value: string) => void;
	setPaymentPayerIdentityDocument: (value: string) => void;
	setPaymentPayerInn: (value: string) => void;
	setPaymentPayerRelationship: (value: string) => void;
	setPaymentTaxDeductionCode: (value: TaxDeductionCode) => void;
	staffRoleLabels: Record<ClinicalRuleEvaluation["ownerRole"], string>;
	treatmentStatusLabels: Record<TreatmentPlanItem["status"], string>;
};

/*
 * ПОЧЕМУ У РАЗДЕЛА ТЕПЕРЬ ЕСТЬ ТИП, А БЫЛО `any`.
 *
 * Перечень свойств выше был объявлен и НЕ применён: параметр функции стоял
 * `any`. Из-за этого любая опечатка или переименование свойства в месте вызова
 * (App.tsx) проходила молча, а раздел брал значение по умолчанию из строк ниже.
 * Цена ошибки на экране кассы: `onRecordPayment` подменяется пустой функцией —
 * и «Принять оплату» перестаёт что-либо отправлять, оставаясь на вид рабочей
 * кнопкой; `money` подменяется, и суммы начинают печататься в другом виде, чем
 * на соседних экранах.
 *
 * Partial, а не полный тип: значения по умолчанию ниже как раз и означают
 * «свойство может не прийти». Опечатку и несовпадение типа Partial ловит
 * (в JSX лишние свойства запрещены), а именно от них защита и нужна.
 */
type FinanceViewComponentProps = Partial<FinanceViewProps>;

/*
 * Пустой словарь подписей.
 *
 * Все словари подписей приходят из App.tsx и в живом приложении заполнены.
 * Пустой нужен только чтобы раздел не падал, если его смонтируют без них: тогда
 * на месте подписи будет пусто (React ничего не рисует для undefined), а не
 * слово «undefined». Приведение типа неизбежно: Record с обязательными ключами
 * пустым объектом не описывается.
 */
const noLabels = <Key extends string>(): Record<Key, string> =>
	({}) as Record<Key, string>;

/*
 * ЗДЕСЬ БЫЛА НУЛЕВАЯ ФИНАНСОВАЯ СВОДКА `EMPTY_BILLING_SUMMARY` — ВОСЕМЬ НУЛЕЙ
 * ПО УМОЛЧАНИЮ. Её больше нет, умолчание пропса — null.
 *
 * Причина не в опрятности. Ноль по умолчанию и есть тот самый дефект, который
 * закрывается в этом пакете, только другой дверью: пока сводки нет, «Остаток
 * 0 ₽» неотличим от «пациент рассчитался». Источник (useAppLogic.tsx,
 * patientBillingSummary) теперь честно отдаёт null, и оставить рядом умолчание
 * из нулей означало бы вернуть ложь на единственном месте, где она ещё могла
 * появиться.
 *
 * ЧТО ЭТА ДВЕРЬ ДЕЛАЛА ДО СИХ ПОР: ничего. Единственный вызывающий
 * (App.tsx, `billingSummary={patientBillingSummary}`) пропс передаёт всегда,
 * поэтому умолчание не подставлялось ни разу — проверено поштучно по всем
 * местам отрисовки FinanceView. Вреда за ним не числится, и приписывать ему
 * вред не нужно: она снята как заготовленная ловушка, не как живая авария.
 *
 * Прежний список полей вдобавок лгал о форме данных: в нём стояло
 * `outstandingPaidRub`, которого в billingSummarySchema
 * (packages/shared/src/index.ts) не существует вовсе.
 */

/*
 * Нулевая сводка клинических правил. БЫЛО `{}`, а панель предупреждений читает
 * `summary.unresolved` и `summary.coveredRules` без проверки — в строке
 * «N требуют внимания · M закрыты» на месте чисел оказывалось пусто.
 */
const EMPTY_CLINICAL_RULE_SUMMARY: Dashboard["clinicalRuleSummary"] = {
	activeRules: 0,
	evaluatedRules: 0,
	unresolved: 0,
	blockers: 0,
	warnings: 0,
	requiredServices: 0,
	coveredRules: 0,
};

export function FinanceView(rawProps?: FinanceViewComponentProps) {
	const logicContext = useAppLogicContext();
	const props = { ...logicContext, ...rawProps } as ReturnType<
		typeof useAppLogicContext
	> &
		FinanceViewComponentProps;
	const {
		activePayments = (props.activePayments ?? props.dashboard?.payments ?? []) as Payment[],
		activeTreatmentPlanItems = (props.activeTreatmentPlanItems ?? props.dashboard?.treatmentPlanItems ?? []) as TreatmentPlanItem[],
		activeTreatmentPlanScenarios = (props.activeTreatmentPlanScenarios ?? props.dashboard?.treatmentPlanScenarios ?? []) as TreatmentPlanScenario[],
		billingSummary = props.billingSummary ?? (props as any).patientBillingSummary ?? null,
		clinicalRuleEvaluations = props.clinicalRuleEvaluations ?? (props as any).patientClinicalRuleEvaluations ?? [],
		clinicalRuleActionLabels = props.clinicalRuleActionLabels ?? noLabels(),
		clinicalRuleSeverityLabels = props.clinicalRuleSeverityLabels ?? noLabels(),
		clinicalRuleSummary = props.clinicalRuleSummary ?? (props as any).patientClinicalRuleSummary ?? EMPTY_CLINICAL_RULE_SUMMARY,
		dashboard = props.dashboard,
		documentPatient = props.documentPatient ?? null,
		formatDateTime = props.formatDateTime ?? ((val: string) => val || ""),
		isPaymentSaving = props.isPaymentSaving ?? false,
		/*
		 * БЫЛО своё форматирование: `${val.toLocaleString("ru-RU")} ₽`. Оно печатает
		 * 1500.5 как «1 500,5 ₽», и полтинник в такой записи читается как пять копеек.
		 * Общий money() из AppHelpers показывает «1 500,50 ₽» — и ровно так же те же
		 * суммы выглядят в форме приёма оплаты и в семейном кошельке на этом экране.
		 */
		money = props.money ?? formatMoney,
		onCashIn: propsOnCashIn = props.onCashIn,
		onCashOut: propsOnCashOut = props.onCashOut,
		onCloseShift: propsOnCloseShift = props.onCloseShift,
		onCreateDocument = props.onCreateDocument ?? (props as any).createDocument,
		onGoToDocuments = props.onGoToDocuments ?? (() => { window.location.hash = "documents"; }),
		onGoToPrices = props.onGoToPrices ?? (() => { (props as any).setSettingsTab?.("prices"); window.location.hash = "settings/prices"; }),
		onGoToVisit = props.onGoToVisit ?? (() => { window.location.hash = "visit"; }),
		onOpenShift: propsOnOpenShift = props.onOpenShift,
		onRecordPayment = props.onRecordPayment ?? (props as any).recordPayment ?? (() => {}),
		paymentAmount = props.paymentAmount ?? "",
		paymentFeedback = props.paymentFeedback ?? "",
		paymentFiscalCashierName = props.paymentFiscalCashierName ?? "",
		paymentFiscalFd = props.paymentFiscalFd ?? "",
		paymentFiscalFn = props.paymentFiscalFn ?? "",
		paymentFiscalFpd = props.paymentFiscalFpd ?? "",
		paymentFiscalReceiptIssuedAt = props.paymentFiscalReceiptIssuedAt ?? "",
		paymentFiscalReceiptNumber = props.paymentFiscalReceiptNumber ?? "",
		paymentFiscalReceiptUrl = props.paymentFiscalReceiptUrl ?? "",
		paymentFiscalReceiptLabel = props.paymentFiscalReceiptLabel ?? (props as any).paymentFiscalReceiptLabelForUi ?? (() => ""),
		paymentMethod = props.paymentMethod ?? "cash",
		paymentMethodLabels = props.paymentMethodLabels ?? noLabels(),
		paymentPatientContextMessage = props.paymentPatientContextMessage ?? "",
		paymentPatientContextReady = props.paymentPatientContextReady ?? true,
		paymentPayerBirthDate = props.paymentPayerBirthDate ?? "",
		paymentPayerFullName = props.paymentPayerFullName ?? "",
		paymentPayerIdentityDocument = props.paymentPayerIdentityDocument ?? "",
		paymentPayerInn = props.paymentPayerInn ?? "",
		paymentPayerRelationship = props.paymentPayerRelationship ?? "",
		paymentTaxDeductionCode = props.paymentTaxDeductionCode ?? "",
		scenarioPriorityLabels = props.scenarioPriorityLabels ?? noLabels(),
		scenarioStrategyLabels = props.scenarioStrategyLabels ?? noLabels(),
		serviceCategoryLabels = props.serviceCategoryLabels ?? noLabels(),
		serviceTitle = props.serviceTitle ?? ((id: string) => id),
		setPaymentAmount = props.setPaymentAmount ?? (() => {}),
		setPaymentFiscalCashierName = props.setPaymentFiscalCashierName ?? (() => {}),
		setPaymentFiscalFd = props.setPaymentFiscalFd ?? (() => {}),
		setPaymentFiscalFn = props.setPaymentFiscalFn ?? (() => {}),
		setPaymentFiscalFpd = props.setPaymentFiscalFpd ?? (() => {}),
		setPaymentFiscalReceiptIssuedAt = props.setPaymentFiscalReceiptIssuedAt ?? (() => {}),
		setPaymentFiscalReceiptNumber = props.setPaymentFiscalReceiptNumber ?? (() => {}),
		setPaymentFiscalReceiptUrl = props.setPaymentFiscalReceiptUrl ?? (() => {}),
		setPaymentMethod = props.setPaymentMethod ?? (() => {}),
		setPaymentPayerBirthDate = props.setPaymentPayerBirthDate ?? (() => {}),
		setPaymentPayerFullName = props.setPaymentPayerFullName ?? (() => {}),
		setPaymentPayerIdentityDocument = props.setPaymentPayerIdentityDocument ?? (() => {}),
		setPaymentPayerInn = props.setPaymentPayerInn ?? (() => {}),
		setPaymentPayerRelationship = props.setPaymentPayerRelationship ?? (() => {}),
		setPaymentTaxDeductionCode = props.setPaymentTaxDeductionCode ?? (() => {}),
		staffRoleLabels = props.staffRoleLabels ?? noLabels(),
		treatmentStatusLabels = props.treatmentStatusLabels ?? noLabels(),
	} = props;
	/*
	 * ЗАЧЕМ РАЗДЕЛУ ОБЩИЙ КОНТЕКСТ. Списание с семейного счёта уходит прямо из
	 * панели кошелька и создаёт настоящий платёж (POST /api/finance/family/pay
	 * вставляет строку в payments). Долг пациента на этом экране считается из
	 * dashboard.payments, а дашборд после такого списания никто не перечитывал:
	 * сообщения PAYMENT_CREATED веб-часть не слушает вовсе. Администратор списывал
	 * 15 000 ₽ с семейного счёта, видел в сводке прежний «Остаток 15 000 ₽» и
	 * прежний список платежей — и брал те же деньги второй раз, наличными.
	 * Перечитываем дашборд после успешного списания.
	 */
	const loadDashboard = logicContext?.loadDashboard;
	const reloadAfterFamilyPayment = useCallback(() => {
		void loadDashboard?.();
	}, [loadDashboard]);

	/*
	 * Обработчик создания документа передаётся ниже только когда он есть.
	 *
	 * Журнал платежей решает по наличию этого свойства, рисовать ли кнопку
	 * «Справка ИФНС»: кнопка, которая ничего не вызывает, — обманутый оператор.
	 * Явное `undefined` при exactOptionalPropertyTypes считается переданным
	 * значением, поэтому свойство именно отсутствует, а не равно undefined.
	 */
	const createDocumentProp = onCreateDocument ? { onCreateDocument } : {};

	/*
	 * Долг уезжает в форму приёма оплаты только когда он ПОСЧИТАН.
	 *
	 * PaymentCapture по этому числу рисует кнопку-подсказку «Долг: N ₽», которая
	 * одним нажатием подставляет сумму в поле. Пока сводки нет (сводка null),
	 * подставлять нечего: прежний ноль означал «долга нет», и кнопка молча
	 * пропадала по причине «пациент рассчитался» вместо «мы ещё не считали».
	 * Свойство именно ОТСУТСТВУЕТ, а не равно undefined: при
	 * exactOptionalPropertyTypes явное undefined считается переданным значением, а
	 * `remainingDebt?: number` в PaymentCapture объявлен без undefined.
	 *
	 * Ряд быстрых сумм (1000/2000/3000/5000) в PaymentCapture висит внутри той же
	 * проверки `remainingDebt !== undefined`, поэтому при неизвестной сводке он
	 * тоже скрыт. Это согласовано, а не потеряно: сводка null бывает ровно тогда,
	 * когда нет дашборда или не выбран пациент (useAppLogic.tsx,
	 * patientBillingSummary), а без выбранного пациента приём оплаты и так заперт
	 * — paymentPatientContextReady false и на экране стоит «Выберите пациента, за
	 * которого принимаете оплату» (hooks/domains/usePatientLogic.ts).
	 */
	const remainingDebtProp = billingSummary
		? { remainingDebt: billingSummary.totalDueRub }
		: {};

	const focusPaymentCapture = () => {
		const amountInput = document.getElementById(
			"payment-amount-input",
		) as HTMLInputElement | null;
		const paymentCapture = document.getElementById("payment-capture");
		motionSafeScrollIntoView(amountInput ?? paymentCapture, {
			block: "center",
		});
		amountInput?.focus({ preventScroll: true });
	};

	const [isPnlOpen, setIsPnlOpen] = useState(false);
	const [isInvoicesOpen, setIsInvoicesOpen] = useState(false);
	const [isFinanceOptionsOpen, setIsFinanceOptionsOpen] = useState(false);
	const [isCashShiftOpen, setIsCashShiftOpen] = useState(false);
	const [isCashboxOpen, setIsCashboxOpen] = useState(false);
	const [isBillingActOpen, setIsBillingActOpen] = useState(false);
	const [isQuickExpenseOpen, setIsQuickExpenseOpen] = useState(false);

	const [isShiftOpen, setIsShiftOpen] = useState<boolean>(() => {
		const saved = safeLocalStorageGetItem("dente_cash_shift_open");
		return saved !== null ? saved === "true" : true;
	});
	const [shiftNumber, setShiftNumber] = useState<number>(() => {
		const saved = safeLocalStorageGetItem("dente_cash_shift_number");
		const parsed = saved ? Number.parseInt(saved, 10) : 1;
		return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
	});
	const [manualCashDeltaRub, setManualCashDeltaRub] = useState<number>(() => {
		const saved = safeLocalStorageGetItem("dente_cash_shift_delta");
		return saved ? Number.parseFloat(saved) || 0 : 0;
	});

	const todayKey = useMemo(() => localDayKey(new Date()) ?? "", []);
	const cashDayTotals = useMemo(() => {
		const sourcePayments =
			dashboard?.payments && dashboard.payments.length > 0
				? dashboard.payments
				: activePayments ?? [];
		return summarizeCashDay(sourcePayments, todayKey);
	}, [dashboard?.payments, activePayments, todayKey]);

	const cashInDrawerRub = Math.max(
		0,
		(Math.round((cashDayTotals?.cashRub ?? 0) * 100) + Math.round(manualCashDeltaRub * 100)) / 100,
	);
	const cardSumRub = cashDayTotals?.cardRub ?? 0;
	const sbpSumRub = cashDayTotals?.sbpRub ?? 0;
	const advanceOffsetRub = cashDayTotals?.advanceRub ?? 0;

	const handleOpenShift = useCallback(async () => {
		if (propsOnOpenShift) {
			await propsOnOpenShift();
		} else {
			await callCashShiftApi(
				"/api/cash/cash-box-all-open",
				"/api/fiscal/shift/open",
				{
					cashierFullName: paymentFiscalCashierName || undefined,
					openedAt: new Date().toISOString(),
				},
			);
		}
		setIsShiftOpen(true);
		safeLocalStorageSetItem("dente_cash_shift_open", "true");
		const nextShift = shiftNumber + 1;
		setShiftNumber(nextShift);
		safeLocalStorageSetItem("dente_cash_shift_number", String(nextShift));
		void loadDashboard?.();
	}, [propsOnOpenShift, paymentFiscalCashierName, shiftNumber, loadDashboard]);

	const handleCloseShift = useCallback(async () => {
		if (propsOnCloseShift) {
			await propsOnCloseShift();
		} else {
			const zNumber = `Z-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${shiftNumber}`;
			await callCashShiftApi(
				"/api/cash/cash-box-all-closing",
				"/api/fiscal/shift/close",
				{
					cashierFullName: paymentFiscalCashierName || undefined,
					zReportNumber: zNumber,
					shiftNumber,
					closedAt: new Date().toISOString(),
				},
			);
		}
		setIsShiftOpen(false);
		safeLocalStorageSetItem("dente_cash_shift_open", "false");
		setManualCashDeltaRub(0);
		safeLocalStorageRemoveItem("dente_cash_shift_delta");
		void loadDashboard?.();
	}, [propsOnCloseShift, paymentFiscalCashierName, shiftNumber, loadDashboard]);

	const handleCashIn = useCallback(
		async (amountRub: number, basis: string, typeAlias?: string) => {
			if (propsOnCashIn) {
				await propsOnCashIn(amountRub, basis, typeAlias);
			} else {
				await callCashShiftApi(
					"/api/cash/cash-introduction",
					"/api/fiscal/cash-in",
					{
						amountRub,
						reasonText: basis || "Служебное внесение разменного фонда",
						typeAlias,
						cashierFullName: paymentFiscalCashierName || undefined,
					},
				);
			}
			setManualCashDeltaRub((prev) => {
				const nextKop = Math.round(prev * 100) + Math.round(amountRub * 100);
				const next = nextKop / 100;
				safeLocalStorageSetItem("dente_cash_shift_delta", String(next));
				return next;
			});
			void loadDashboard?.();
		},
		[propsOnCashIn, paymentFiscalCashierName, loadDashboard],
	);

	const handleCashOut = useCallback(
		async (
			amountRub: number,
			basis: string,
			recipientFio?: string,
			typeAlias?: string,
		) => {
			if (propsOnCashOut) {
				await propsOnCashOut(amountRub, basis, recipientFio, typeAlias);
			} else {
				await callCashShiftApi(
					"/api/cash/cash-withdrawal",
					"/api/fiscal/cash-out",
					{
						amountRub,
						reasonText:
							basis ||
							(recipientFio
								? `Инкассация: ${recipientFio}`
								: "Служебное изъятие наличных средств"),
						recipientFio,
						typeAlias,
						cashierFullName: paymentFiscalCashierName || undefined,
					},
				);
			}
			setManualCashDeltaRub((prev) => {
				const nextKop = Math.round(prev * 100) - Math.round(amountRub * 100);
				const next = nextKop / 100;
				safeLocalStorageSetItem("dente_cash_shift_delta", String(next));
				return next;
			});
			void loadDashboard?.();
		},
		[propsOnCashOut, paymentFiscalCashierName, loadDashboard],
	);

	const handlePrintXReport = useCallback(async () => {
		await callCashShiftApi(
			"/api/fiscal/x-report",
			"/api/cash/x-report",
			{
				cashierFullName: paymentFiscalCashierName || undefined,
				shiftNumber,
			},
		);
	}, [paymentFiscalCashierName, shiftNumber]);

	// Desktop Keyboard Navigation: Esc closes open financial sub-modals (Invoices, PnL, options popover, cash shift)
	useEffect(() => {
		const handleKeyDown = (e: globalThis.KeyboardEvent) => {
			if (e.key === "Escape") {
				if (isFinanceOptionsOpen) {
					setIsFinanceOptionsOpen(false);
					return;
				}
				if (isInvoicesOpen) {
					setIsInvoicesOpen(false);
					return;
				}
				if (isPnlOpen) {
					setIsPnlOpen(false);
					return;
				}
				if (isCashShiftOpen) {
					setIsCashShiftOpen(false);
					return;
				}
				if (isCashboxOpen) {
					setIsCashboxOpen(false);
					return;
				}
				if (isBillingActOpen) {
					setIsBillingActOpen(false);
					return;
				}
				if (isQuickExpenseOpen) {
					setIsQuickExpenseOpen(false);
					return;
				}
			}
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [isInvoicesOpen, isPnlOpen, isFinanceOptionsOpen, isCashShiftOpen, isCashboxOpen, isBillingActOpen, isQuickExpenseOpen]);

	return (
		<div className="finance-panel border-0 bg-transparent p-0 shadow-none pb-32 max-sm:pb-48 max-w-full min-w-0 overflow-x-hidden" id="finance">
			<FinanceToolbar
				documentPatient={documentPatient}
				billingSummary={billingSummary}
				isCashShiftOpen={isCashShiftOpen}
				onToggleCashShift={() => setIsCashShiftOpen((prev) => !prev)}
				isShiftOpen={isShiftOpen}
				onPayDebtQuick={() => {
					if (billingSummary?.totalDueRub) {
						setPaymentAmount(rubAmountForInput(billingSummary.totalDueRub));
						focusPaymentCapture();
					}
				}}
				money={money}
				onOpenInvoices={() => setIsInvoicesOpen(true)}
				isFinanceOptionsOpen={isFinanceOptionsOpen}
				onToggleFinanceOptions={() => setIsFinanceOptionsOpen((prev) => !prev)}
				onCloseFinanceOptions={() => setIsFinanceOptionsOpen(false)}
				onOpenPnl={() => setIsPnlOpen(true)}
				onGoToDocuments={onGoToDocuments}
				onOpenCashbox={() => setIsCashboxOpen(true)}
				onOpenBillingAct={() => setIsBillingActOpen(true)}
				onOpenQuickExpense={() => setIsQuickExpenseOpen(true)}
			/>

			{isCashShiftOpen && (
				<div className="relative mb-3 animate-in fade-in duration-150" data-testid="cash-shift-panel-container">
					<CashShiftWidget
						compact={true}
						initialIsOpen={isShiftOpen}
						shiftNumber={shiftNumber}
						cashierName={paymentFiscalCashierName || undefined}
						cashInDrawerRub={cashInDrawerRub}
						cardSumRub={cardSumRub}
						sbpSumRub={sbpSumRub}
						advanceOffsetRub={advanceOffsetRub}
						onOpenShift={handleOpenShift}
						onCloseShift={handleCloseShift}
						onCashIn={handleCashIn}
						onCashOut={handleCashOut}
						onPrintXReport={handlePrintXReport}
					/>
				</div>
			)}

			<FinancePlanningOverview
				activePaymentsCount={(activePayments ?? []).length}
				billingSummary={billingSummary}
				money={money}
				onGoToVisit={onGoToVisit}
				priorityLabels={scenarioPriorityLabels}
				scenarios={activeTreatmentPlanScenarios ?? []}
				strategyLabels={scenarioStrategyLabels}
			/>

			{/* Сворачиваемый блок клинических рекомендаций и правил (отображается только при наличии активных правил или замечаний) */}
			{Boolean(
				(clinicalRuleSummary &&
					((clinicalRuleSummary.unresolved ?? 0) > 0 ||
						(clinicalRuleSummary.activeRules ?? 0) > 0)) ||
					(clinicalRuleEvaluations && clinicalRuleEvaluations.length > 0),
			) && (
				<details
					className="clinical-recommendations-accordion group rounded-lg border border-[var(--line)] bg-[var(--paper)] px-2.5 py-1 text-xs shadow-xs my-0.5 sm:my-1 select-none"
					data-testid="clinical-recommendations-accordion"
				>
					<summary className="flex items-center justify-between cursor-pointer font-medium text-[var(--ink)] list-none hover:text-[var(--teal)] transition-colors min-h-[26px]">
						<div className="flex items-center gap-1.5">
							<FileText size={13} className="text-[var(--teal)] shrink-0" />
							<span className="text-[11px] sm:text-xs">Клинические рекомендации и правила</span>
							{clinicalRuleSummary && (
								<span className="text-[10px] sm:text-[11px] text-[var(--muted)] font-normal">
									{((clinicalRuleSummary.unresolved ?? 0) > 0
										? `${clinicalRuleSummary.unresolved} нерешённых`
										: clinicalRuleSummary.activeRules ?? 0)}
								</span>
							)}
						</div>
						<ChevronDown
							size={13}
							className="text-[var(--muted)] transition-transform duration-200 group-open:rotate-180 shrink-0"
						/>
					</summary>
					<div className="pt-2 space-y-2">
						<ClinicalRulePanel
							actionLabels={clinicalRuleActionLabels}
							context="finance"
							evaluations={clinicalRuleEvaluations ?? []}
							patientId={documentPatient?.id ?? null}
							serviceTitle={serviceTitle}
							severityLabels={clinicalRuleSeverityLabels}
							staffRoleLabels={staffRoleLabels}
							summary={clinicalRuleSummary}
						/>

						<ClinicalAiPersonalizePanel
							context="finance"
							patientId={documentPatient?.id ?? null}
						/>
					</div>
				</details>
			)}

			{/* Контейнер кассового модуля с отступом pb-28 для исключения перекрытия интерактивных кнопок плавающим баром (Мандаты 8d, 8p) */}
			<div className="finance-cashbox-container pb-28 sm:pb-24">
				<PaymentCapture
					{...remainingDebtProp}
					amount={paymentAmount}
					feedback={paymentFeedback}
					fiscalCashierName={paymentFiscalCashierName}
					fiscalFd={paymentFiscalFd}
					fiscalFn={paymentFiscalFn}
					fiscalFpd={paymentFiscalFpd}
					fiscalReceiptIssuedAt={paymentFiscalReceiptIssuedAt}
					fiscalReceiptNumber={paymentFiscalReceiptNumber}
					fiscalReceiptUrl={paymentFiscalReceiptUrl}
					isSaving={isPaymentSaving}
					method={paymentMethod}
					methodLabels={paymentMethodLabels}
					onAmountChange={setPaymentAmount}
					onFiscalCashierNameChange={setPaymentFiscalCashierName}
					onFiscalFdChange={setPaymentFiscalFd}
					onFiscalFnChange={setPaymentFiscalFn}
					onFiscalFpdChange={setPaymentFiscalFpd}
					onFiscalReceiptIssuedAtChange={setPaymentFiscalReceiptIssuedAt}
					onFiscalReceiptNumberChange={setPaymentFiscalReceiptNumber}
					onFiscalReceiptUrlChange={setPaymentFiscalReceiptUrl}
					onMethodChange={setPaymentMethod}
					onPayerBirthDateChange={setPaymentPayerBirthDate}
					onPayerFullNameChange={setPaymentPayerFullName}
					onPayerIdentityDocumentChange={setPaymentPayerIdentityDocument}
					onPayerInnChange={setPaymentPayerInn}
					onPayerRelationshipChange={setPaymentPayerRelationship}
					onSubmit={onRecordPayment}
					onTaxDeductionCodeChange={setPaymentTaxDeductionCode}
					patientContextMessage={paymentPatientContextMessage}
					patientContextReady={paymentPatientContextReady}
					patientDefaults={{
						birthDate: documentPatient?.birthDate ?? null,
						fullName: documentPatient?.fullName ?? null,
						identityDocument:
							documentPatient?.administrativeProfile?.identityDocument ?? null,
						taxpayerInn:
							documentPatient?.administrativeProfile?.taxpayerInn ?? null,
					}}
					patientId={documentPatient?.id ?? null}
					payerBirthDate={paymentPayerBirthDate}
					payerFullName={paymentPayerFullName}
					payerIdentityDocument={paymentPayerIdentityDocument}
					payerInn={paymentPayerInn}
					payerRelationship={paymentPayerRelationship}
					taxDeductionCode={paymentTaxDeductionCode}
				/>
			</div>

			{/*
        Итог дня стоит ПЕРЕД историей оплат и после формы приёма: рядом с
        платежами, но не вместо них. История ниже — по выбранному пациенту, итог
        здесь — по всей клинике, и об этом сказано внутри, иначе одно прочтут за
        другое. Раздел закрыт: на поверхности только строка с двумя цифрами.
      */}
			<CashDayTally
				payments={dashboard?.payments ?? activePayments ?? []}
				methodLabels={paymentMethodLabels}
				money={money}
			/>

			<FinanceLedger
				categoryLabels={serviceCategoryLabels}
				{...createDocumentProp}
				documents={dashboard?.documents ?? []}
				formatDateTime={formatDateTime}
				money={money}
				onFocusPaymentCapture={focusPaymentCapture}
				onGoToVisit={onGoToVisit}
				paymentFiscalReceiptLabel={paymentFiscalReceiptLabel}
				paymentMethodLabels={paymentMethodLabels}
				payments={activePayments ?? []}
				serviceCatalog={dashboard?.serviceCatalog ?? []}
				treatmentItems={activeTreatmentPlanItems ?? []}
				treatmentStatusLabels={treatmentStatusLabels}
			/>

			<ServiceCatalogStrip
				categoryLabels={serviceCategoryLabels}
				money={money}
				onGoToPrices={onGoToPrices}
				services={dashboard?.serviceCatalog ?? []}
			/>

			{/*
        ЗДЕСЬ СТОЯЛИ ЧЕТЫРЕ ПУСТЫХ БЛОКА, ОБЕЩАВШИЕ ТО, ЧЕГО СИСТЕМА НЕ УМЕЕТ.
        Все четыре читали таблицы, в которые в приложении никто не пишет —
        проверено поиском по всем исходникам:
          • «Начисления врачам по прайсу» ждали поля «процент врача» и «маржа
            клиники». Таких данных нет ни у сотрудника, ни в прайсе — нигде,
            кроме самой пустой таблицы. Начисление считать не из чего.
          • «Метки авансовых депозитов», «Отправка электронных чеков» и
            «Единицы измерения для ККМ» — это касса по 54-ФЗ. Драйвера кассы в
            системе нет, чеки никуда не уходят.
        Пустая финансовая карточка опаснее отсутствующей: по ней принимают
        решения о деньгах и читают её как «начислений нет», а не «мы это не
        считаем».
        Выработку врачей за период — из настоящих платежей и приёмов — показывает
        отчёт «Врачи» в разделе отчётов (managerReports.doctorPerformance); маржа
        там стоит честным прочерком по той же причине.
        ДОЛГ: касса 54-ФЗ и расчёт зарплаты врача. Первое требует драйвера ККМ,
        второе — поля процента у сотрудника; ни того, ни другого в базе нет.
      */}
			<div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
				{/* БЫЛО: `documentPatient?.id ?? "pat-1"` — остаток удалённых демо-данных.
            Такого пациента в базе нет ни у одной клиники: запрос по нему может
            ответить только ошибкой приведения типа (uuid), и на экране финансов
            без выбранного пациента появлялась бы ложная тревога «баланс не
            прочитан». Панель это отсекает по виду идентификатора, но подставлять
            чужой номер, надеясь на проверку в другом файле, нельзя: снимут
            проверку — уйдёт запрос. Пустая строка честно означает «пациент не
            выбран». */}
				{/* `?? 0` ЗДЕСЬ ОСТАЁТСЯ СОЗНАТЕЛЬНО, И ЭТО НЕ НЕДОДЕЛКА.
            Это число нигде не печатается как итог по пациенту: панель кошелька
            берёт его только чтобы предложить сумму списания одним нажатием, а
            кнопку-подсказку рисует под условием `debtSuggestionRub > 0`
            (components/finance/FamilyWalletPanel.tsx). При неизвестной сводке
            выходит 0, подсказки нет — и это верное поведение: списывать с
            семейного счёта сумму, которую программа не посчитала, нельзя.
            Ноль тут означает «не предлагать», а не «долга нет». */}
				<FamilyWalletPanel
					patientId={documentPatient?.id ?? ""}
					remainingDebtRub={billingSummary?.totalDueRub ?? 0}
					onPaymentSuccess={reloadAfterFamilyPayment}
				/>
			</div>

			{isPnlOpen && (
				<Suspense fallback={null}>
					<ManagerialPnlDashboardModal
						isOpen={isPnlOpen}
						onClose={() => setIsPnlOpen(false)}
					/>
				</Suspense>
			)}

			<FinanceInvoicesModal
				isOpen={isInvoicesOpen}
				onClose={() => setIsInvoicesOpen(false)}
				patientId={documentPatient?.id}
				patientName={documentPatient?.fullName}
			/>

			<FinanceCashboxModal
				isOpen={isCashboxOpen}
				onClose={() => setIsCashboxOpen(false)}
				isShiftOpen={isShiftOpen}
				cashierName={paymentFiscalCashierName || "Врач-стоматолог / Кассир"}
				clinicName={dashboard?.clinicSettings?.name || "Стоматология ДЕНТЕ Премиум"}
				clinicInn={dashboard?.clinicSettings?.inn}
				onPaymentComplete={() => {
					void loadDashboard?.();
					setIsCashboxOpen(false);
				}}
			/>

			{isBillingActOpen && (
				<PatientBillingModal
					isOpen={isBillingActOpen}
					onClose={() => setIsBillingActOpen(false)}
					patient={documentPatient ? {
						id: documentPatient.id,
						fullName: documentPatient.fullName,
						birthDate: documentPatient.birthDate,
						phone: documentPatient.phone,
						address: documentPatient.address,
						medicalCardNumber: documentPatient.medicalCardNumber,
						depositRub: documentPatient.depositRub,
						familyBalanceRub: documentPatient.familyBalanceRub,
					} : null}
					patientDepositRub={documentPatient?.depositRub ?? 0}
					patientFamilyBalanceRub={documentPatient?.familyBalanceRub ?? 0}
					clinicName={dashboard?.clinicSettings?.name}
					clinicInn={dashboard?.clinicSettings?.inn}
				/>
			)}

			{isQuickExpenseOpen && (
				<QuickExpenseModal
					isOpen={isQuickExpenseOpen}
					onClose={() => setIsQuickExpenseOpen(false)}
					onSuccess={() => {
						void loadDashboard?.();
					}}
				/>
			)}
		</div>
	);
}
