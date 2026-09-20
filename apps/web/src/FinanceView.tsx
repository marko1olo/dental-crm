import type { Dashboard, Patient, PaymentMethod } from "@dental/shared";
import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { TrendingUp, ReceiptText, ChevronDown, FileText, CreditCard, MoreHorizontal, ShieldCheck } from "lucide-react";
import { money as formatMoney } from "./AppHelpers";
import { denteAdminSecretRequestHeaders } from "./lib/denteRequestHeaders";
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

const ManagerialPnlDashboardModal = lazy(() =>
	import("./components/finance/pnl/ManagerialPnlDashboardModal").then((m) => ({
		default: m.ManagerialPnlDashboardModal,
	})),
);
const InvoicesView = lazy(() =>
	import("./components/billing/InvoicesView.js").then((m) => ({
		default: m.InvoicesView,
	})),
);
import {
	FinancePlanningOverview,
	ServiceCatalogStrip,
} from "./FinancePlanning";
import { motionSafeScrollIntoView } from "./motionPreference";
import { PaymentCapture } from "./PaymentCapture";
import { rubAmountForInput } from "./components/payments/cashDeskAmounts.js";

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

async function callCashShiftApi(
	primaryUrl: string,
	fallbackUrl: string,
	payload: Record<string, unknown>,
): Promise<void> {
	const headers = denteAdminSecretRequestHeaders({
		"Content-Type": "application/json",
	});
	try {
		const res = await fetch(primaryUrl, {
			method: "POST",
			headers,
			body: JSON.stringify(payload),
		});
		if (res.ok) return;
		if (fallbackUrl && (res.status === 404 || res.status === 405)) {
			await fetch(fallbackUrl, {
				method: "POST",
				headers,
				body: JSON.stringify(payload),
			});
		}
	} catch {
		if (fallbackUrl) {
			try {
				await fetch(fallbackUrl, {
					method: "POST",
					headers,
					body: JSON.stringify(payload),
				});
			} catch {
				// Non-blocking: offline or standalone client resilience
			}
		}
	}
}

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
		Math.round((cashDayTotals.cashRub + manualCashDeltaRub) * 100) / 100,
	);
	const cardSumRub = cashDayTotals.cardRub;
	const sbpSumRub = cashDayTotals.sbpRub;
	const advanceOffsetRub = cashDayTotals.advanceRub;

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
				const next = Math.round((prev + amountRub) * 100) / 100;
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
				const next = Math.round((prev - amountRub) * 100) / 100;
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
			}
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [isInvoicesOpen, isPnlOpen, isFinanceOptionsOpen, isCashShiftOpen]);

	return (
		<div className="finance-panel border-0 bg-transparent p-0 shadow-none pb-32 max-sm:pb-36 max-w-full min-w-0 overflow-x-hidden" id="finance">
			<div className="finance-monolithic-toolbar min-h-[44px] sm:min-h-[36px] sm:h-9 sm:max-h-9 flex items-center justify-between gap-1.5 sm:gap-2 px-2 sm:px-3 py-1 border border-[var(--line)] bg-[var(--paper)] rounded-xl shadow-xs mb-1.5 sm:mb-2 flex-nowrap overflow-hidden shrink-0 select-none">
				<div className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-1 overflow-hidden">
					<span className="truncate text-xs sm:text-sm font-bold text-[var(--ink)] shrink-0">
						<span className="sm:hidden">Оплаты</span>
						<span className="hidden sm:inline">Оплаты и план</span>
					</span>
					<span className="text-[11px] sm:text-xs text-[var(--ink)] sm:text-[var(--muted)] min-w-0 flex-1 truncate font-semibold sm:font-normal" title={documentPatient?.fullName ?? "пациент не выбран"}>
						·{" "}
						<span className="sm:hidden tracking-tight">
							{(() => {
								const name = documentPatient?.fullName ?? "пациент не выбран";
								if (!documentPatient?.fullName) return name;
								const parts = name.trim().split(/\s+/);
								if (parts.length >= 2) {
									const initials = parts.slice(1).map((p: string) => (p[0] ? `${p[0]}.` : "")).filter(Boolean).join(" ");
									return `${parts[0]} ${initials}`.trim();
								}
								return name;
							})()}
						</span>
						<span className="hidden sm:inline">{documentPatient?.fullName ?? "пациент не выбран"}</span>
					</span>
					<button
						type="button"
						onClick={() => setIsCashShiftOpen((prev) => !prev)}
						className={`inline-flex items-center gap-1.5 px-1.5 sm:px-2 py-0.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer shrink-0 select-none ${
							isCashShiftOpen
								? "bg-amber-500/15 border-amber-500/40 text-amber-700 dark:text-amber-300"
								: "bg-[var(--paper-soft)] border-[var(--line)] text-[var(--muted)] hover:text-[var(--ink)] hover:border-[var(--line-strong,rgba(0,0,0,0.15))]"
						}`}
						title={isCashShiftOpen ? "Скрыть панель кассовой смены" : "Открыть управление сменой ККТ 54-ФЗ"}
						aria-expanded={isCashShiftOpen}
						data-testid="btn-toggle-cash-shift"
					>
						<span
							className={`w-1.5 h-1.5 rounded-full shrink-0 ${
								isShiftOpen ? "bg-emerald-500" : "bg-rose-500"
							}`}
						/>
						<span className="sm:hidden">ККТ</span>
						<span className="hidden sm:inline">ККТ 54-ФЗ</span>
					</button>
				</div>
				<div className="finance-header-actions flex items-center gap-1.5 shrink-0 flex-nowrap">
					{billingSummary && billingSummary.totalDueRub > 0 && (
						<button
							className="secondary-button min-h-[44px] sm:min-h-0 sm:h-7 inline-flex items-center gap-1 font-bold text-xs px-2 sm:px-2.5 py-0 cursor-pointer bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/40 hover:bg-rose-500/20 active:scale-95 transition-all rounded-lg shrink-0"
							type="button"
							onClick={() => {
								setPaymentAmount(rubAmountForInput(billingSummary.totalDueRub));
								focusPaymentCapture();
							}}
							title={`1-клик оплата остатка долга: ${money(billingSummary.totalDueRub)}`}
							aria-label="Оплатить долг"
							data-testid="btn-finance-pay-debt-quick"
						>
							<CreditCard size={13} className="shrink-0 text-rose-600 dark:text-rose-400" />
							<span className="truncate hidden sm:inline">Оплатить долг ({money(billingSummary.totalDueRub)})</span>
							<span className="truncate sm:hidden">{money(billingSummary.totalDueRub)}</span>
						</button>
					)}
					<button
						className="secondary-button min-h-[44px] sm:min-h-0 sm:h-7 inline-flex items-center gap-1 font-semibold text-xs px-2 sm:px-2.5 py-0 cursor-pointer rounded-lg shrink-0"
						type="button"
						onClick={() => setIsInvoicesOpen(true)}
						aria-label="Счета и акты (804н)"
						data-testid="btn-finance-open-invoices"
					>
						<ReceiptText size={13} className="shrink-0" />
						<span className="truncate hidden sm:inline">Счета и акты (804н)</span>
					</button>

					{/* Поповер вторичных действий: P&L, Документы и Смена ККТ */}
					<div className="relative shrink-0">
						<button
							type="button"
							onClick={() => setIsFinanceOptionsOpen((prev) => !prev)}
							data-testid="finance-toolbar-options-btn"
							className="min-h-[44px] min-w-[44px] sm:min-w-0 sm:min-h-0 sm:h-7 w-11 sm:w-7 p-0 flex items-center justify-center shrink-0 rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] hover:bg-[var(--line)] text-[var(--muted)] hover:text-[var(--ink)] cursor-pointer transition-colors"
							title="Дополнительные финансовые отчеты и документы"
							aria-label="Дополнительные действия"
							aria-expanded={isFinanceOptionsOpen}
						>
							<MoreHorizontal size={15} className="shrink-0" aria-hidden="true" />
						</button>
						{isFinanceOptionsOpen && (
							<div
								className="absolute right-0 top-full mt-1 w-52 py-1.5 px-1 bg-[var(--paper)] border border-[var(--line)] rounded-xl shadow-lg z-50 flex flex-col gap-1 text-left"
								role="menu"
							>
								<button
									type="button"
									onClick={() => {
										setIsFinanceOptionsOpen(false);
										setIsPnlOpen(true);
									}}
									className="w-full text-left px-2.5 py-1.5 text-xs font-medium rounded-lg hover:bg-[var(--line)] text-[var(--ink)] flex items-center gap-2 cursor-pointer transition-colors min-h-[44px] sm:min-h-[32px]"
									role="menuitem"
								>
									<TrendingUp size={14} className="shrink-0 text-emerald-600 dark:text-emerald-400" />
									<span>Управленческий P&L</span>
								</button>
								<button
									type="button"
									onClick={() => {
										setIsFinanceOptionsOpen(false);
										onGoToDocuments();
									}}
									className="w-full text-left px-2.5 py-1.5 text-xs font-medium rounded-lg hover:bg-[var(--line)] text-[var(--ink)] flex items-center gap-2 cursor-pointer transition-colors min-h-[44px] sm:min-h-[32px]"
									role="menuitem"
								>
									<FileText size={14} className="shrink-0 text-sky-600 dark:text-sky-400" />
									<span>Документы</span>
								</button>
								<button
									type="button"
									onClick={() => {
										setIsFinanceOptionsOpen(false);
										setIsCashShiftOpen((prev) => !prev);
									}}
									className="w-full text-left px-2.5 py-1.5 text-xs font-medium rounded-lg hover:bg-[var(--line)] text-[var(--ink)] flex items-center gap-2 cursor-pointer transition-colors min-h-[44px] sm:min-h-[32px]"
									role="menuitem"
									data-testid="menuitem-toggle-cash-shift"
								>
									<ShieldCheck size={14} className="shrink-0 text-amber-600 dark:text-amber-400" />
									<span>{isCashShiftOpen ? "Скрыть смену ККТ" : "Кассовая смена ККТ"}</span>
								</button>
							</div>
						)}
					</div>
				</div>
			</div>

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

			{/* Сворачиваемый блок клинических рекомендаций и правил (не крадёт полезную высоту экрана, свернут по умолчанию) */}
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

			{isInvoicesOpen && (
				<div
					className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-150"
					role="dialog"
					aria-modal="true"
					aria-label="Счета и акты по номенклатуре 804н"
					data-testid="modal-finance-invoices"
				>
					<div className="w-full max-w-5xl h-[92vh] max-h-[920px] rounded-2xl overflow-hidden shadow-2xl border border-[var(--line)] flex flex-col bg-[var(--paper)]">
						<Suspense fallback={<div className="p-8 text-center text-xs text-[var(--muted)]">Загрузка модуля счетов 804н...</div>}>
							<InvoicesView
								currentDoctorName="Врач-стоматолог"
								patientId={documentPatient?.id}
								patientName={documentPatient?.fullName}
								onClose={() => setIsInvoicesOpen(false)}
							/>
						</Suspense>
					</div>
				</div>
			)}
		</div>
	);
}
