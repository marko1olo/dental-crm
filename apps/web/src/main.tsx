import React from "react";
import { createRoot } from "react-dom/client";
const AppShell = React.lazy(() =>
	import("./AppShell").then((m) => ({ default: m.AppShell })),
);
import { BootErrorBoundary } from "./bootErrorBoundary";
import { GlobalToast } from "./components/GlobalToast";
const GuestLabPortal = React.lazy(() =>
	import("./GuestLabPortal").then((m) => ({ default: m.GuestLabPortal })),
);
import { installApiAuthFetch } from "./lib/apiAuthFetch";
import { publicPortalRouteFromHash } from "./lib/publicPortalRoute";
import {
	safeSessionStorageGetItem,
	safeSessionStorageRemoveItem,
	safeSessionStorageSetItem,
} from "./lib/safeLocalStorage";
import { applyThemeToRoot, resolveTheme } from "./lib/themeClasses";
import { initHardwareCapabilities } from "./lib/hardwareCapabilities";
import { logger } from "./utils/logger";

const PublicBookingPage = React.lazy(() =>
	import("./pages/PublicBookingPage").then((m) => ({ default: m.PublicBookingPage })),
);
const PublicBudgetSignPage = React.lazy(() =>
	import("./pages/public/PublicBudgetSignPage").then((m) => ({
		default: m.PublicBudgetSignPage,
	})),
);
const PublicWarrantyVerificationPage = React.lazy(() =>
	import("./pages/PublicWarrantyVerificationPage").then((m) => ({
		default: m.PublicWarrantyVerificationPage,
	})),
);
const MobileSelfCheckinModal = React.lazy(() =>
	import("./components/portal/selfCheckin/MobileSelfCheckinModal").then((m) => ({
		default: m.MobileSelfCheckinModal,
	})),
);
const MobilePhotoUploadPage = React.lazy(() =>
	import("./components/photography/mobileBridge/MobilePhotoUploadPage").then((m) => ({
		default: m.MobilePhotoUploadPage,
	})),
);
const WaitingLoungeSignage = React.lazy(() =>
	import("./components/lounge/WaitingLoungeSignage").then((m) => ({
		default: m.WaitingLoungeSignage,
	})),
);
const TelegramMiniAppView = React.lazy(() =>
	import("./components/portal/telegramMiniApp/TelegramMiniAppView").then((m) => ({
		default: m.TelegramMiniAppView,
	})),
);
const CbctStandaloneStudioView = React.lazy(() =>
	import("./components/radiology/CbctStandaloneStudioView").then((m) => ({
		default: m.CbctStandaloneStudioView,
	})),
);
const CephStandaloneStudioView = React.lazy(() =>
	import("./components/radiology/CephalometricAnalysisModal").then((m) => ({
		default: (props: {
			patientId?: string | undefined;
			patientName?: string | undefined;
			initialImageUrl?: string | undefined;
			initialStudioMode?: string | undefined;
			autoLoadDemo?: boolean | undefined;
		}) => (
			<m.CephalometricAnalysisModal
				isOpen={true}
				onClose={() => {
					if (typeof window !== "undefined") window.close();
				}}
				patientId={props.patientId}
				patientName={props.patientName}
				initialImageUrl={props.initialImageUrl}
			/>
		),
	})),
);
const PatientPresentationStandaloneView = React.lazy(() =>
	import("./components/photography/PatientPresentationStandaloneView").then((m) => ({
		default: m.PatientPresentationStandaloneView,
	})),
);
const OdontogramStudioStandaloneView = React.lazy(() =>
	import("./components/odontogram/DirectOdontogramModuleLauncher").then((m) => ({
		default: m.DirectOdontogramModuleLauncher,
	})),
);
const EndodonticStudioStandaloneView = React.lazy(() =>
	import("./components/endo/DirectEndodonticsLauncher").then((m) => ({
		default: m.DirectEndodonticsLauncher,
	})),
);
const PerioStudioStandaloneView = React.lazy(() =>
	import("./components/perio/DirectPerioLauncher").then((m) => ({
		default: m.DirectPerioLauncher,
	})),
);
const HygieneStudioStandaloneView = React.lazy(() =>
	import("./components/hygiene/DirectHygieneLauncher").then((m) => ({
		default: m.DirectHygieneLauncher,
	})),
);
const OrthodonticStudioStandaloneView = React.lazy(() =>
	import("./components/orthodontics/DirectOrthodonticsLauncher").then((m) => ({
		default: m.DirectOrthodonticsLauncher,
	})),
);
const OrthopedicStudioStandaloneView = React.lazy(() =>
	import("./components/orthopedics/DirectOrthopedicsLauncher").then((m) => ({
		default: m.DirectOrthopedicsLauncher,
	})),
);
const SurgeryStudioStandaloneView = React.lazy(() =>
	import("./components/surgery/DirectSurgeryLauncher").then((m) => ({
		default: m.DirectSurgeryLauncher,
	})),
);
const WaitlistStandaloneView = React.lazy(() =>
	import("./components/schedule/DirectWaitlistMatchesLauncher").then((m) => ({
		default: m.DirectWaitlistMatchesLauncher,
	})),
);
const QuickBookingStandaloneView = React.lazy(() =>
	import("./components/schedule/DirectQuickBookingLauncher").then((m) => ({
		default: m.DirectQuickBookingLauncher,
	})),
);
const CashboxStandaloneView = React.lazy(() =>
	import("./components/cashbox/DirectCashboxLauncher").then((m) => ({
		default: m.DirectCashboxLauncher,
	})),
);
const LoyaltyStudioStandaloneView = React.lazy(() =>
	import("./components/loyalty/LoyaltyStudioModal").then((m) => ({
		default: () => (
			<m.LoyaltyStudioModal
				isOpen={true}
				onClose={() => {
					if (typeof window !== "undefined") window.location.hash = "";
				}}
				patientId="01a00000-0000-0000-0000-000000000001"
				patientName="Воронова Светлана Николаевна"
				medicalCardNumber="№ 4821-Л"
				initialPointsBalance={2500}
				currentInvoiceAmountKop={500000}
			/>
		),
	})),
);
const EmrMedicalRecordStandaloneView = React.lazy(() =>
	import("./components/appLayout/modalsContainerModules/standalone/clinical/StandaloneEmrMedicalRecordHost").then((m) => ({
		default: m.StandaloneEmrMedicalRecordHost,
	})),
);
const PayrollStandaloneStudioView = React.lazy(() =>
	import("./components/payroll/DirectPayrollLauncher").then((m) => ({
		default: m.DirectPayrollLauncher,
	})),
);
const ChairsideHudStandaloneView = React.lazy(() =>
	import("./components/copilot/ChairsideCopilotHUD").then((m) => ({
		default: () => {
			const searchParams = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
			const toothFromQuery = searchParams?.get("tooth") ? Number(searchParams.get("tooth")) : undefined;
			const patientNameFromQuery = searchParams?.get("patient");
			return (
				<div
					className="direct-chairside-hud-standalone fixed inset-0 z-[9999] flex flex-col items-center justify-end p-3 sm:p-6 bg-[var(--paper)]/85 backdrop-blur-md pointer-events-auto overflow-y-auto"
					data-testid="chairside-hud-standalone-host"
				>
					<div className="w-full max-w-3xl my-auto">
						<m.ChairsideCopilotHUD
							initialOpen={true}
							initialDocked={true}
							initialPresetIndex={undefined}
							activeTooth={toothFromQuery}
							patientName={patientNameFromQuery || "Пациент не выбран"}
							patientAllergies={[]}
							onClose={() => {
								if (typeof window !== "undefined") window.location.hash = "";
							}}
						/>
					</div>
				</div>
			);
		},
	})),
);
const CopilotStudioStandaloneView = React.lazy(() =>
	import("./components/copilot/CopilotStudioModal").then((m) => ({
		default: () => {
			const searchParams = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
			const toothFromQuery = searchParams?.get("tooth") ? Number(searchParams.get("tooth")) : undefined;
			const patientNameFromQuery = searchParams?.get("patient");
			return (
				<div
					className="direct-copilot-studio-standalone fixed inset-0 z-[9999] flex flex-col justify-end bg-[var(--paper)]/85 backdrop-blur-md pointer-events-auto overflow-y-auto"
					data-testid="copilot-studio-standalone-host"
				>
					<m.CopilotStudioModal
						isOpen={true}
						onClose={() => {
							if (typeof window !== "undefined") window.location.hash = "";
						}}
						patientName={patientNameFromQuery || "Кузнецов М.П."}
						patientId="pat-36"
						activeTooth={toothFromQuery ?? 36}
					/>
				</div>
			);
		},
	})),
);
import { parseCbctStudioRoute, parseCephStudioRoute } from "./utils/runtimeRouter";
import type { StudioMode } from "./components/radiology/standaloneStudio/types";
import { isPatientPresentationRoute } from "./components/photography/presentationSyncProtocol";
// Первым: утилиты живут в каскадном слое и по правилам CSS уступают
// любому объявлению вне слоёв, поэтому порядок импорта на них не влияет —
// но так виднее, что это фундамент, а не переопределение.
import "./styles/tailwind.css";
import "./styles/main.css";
import "./styles/shadow-analyst.css";
import "./styles/modules/patients.css";
import "./styles/patients-redesign.css";
import "./styles/premium.css";
import "./styles/dente-redesign.css";
import "./styles/modules/header.css";
import "./styles/modules/documents.css";
import "./styles.css";
// Псевдонимы необъявленных переменных и поверхности, зависящие от темы.
import "./styles/token-aliases.css";
// Минимальный размер зон нажатия на узких экранах.
import "./styles/touch-targets.css";
import "./styles/modules/mobile-touch.css";
import "./styles/modules/mobile-inventory.css";
import "./styles/modules/mobile-doctor-payout.css";
// Горизонтальные переполнения, подтверждённые замерами.
import "./styles/overflow-fixes.css";
// Контраст текста по WCAG 1.4.3.
import "./styles/contrast-fixes.css";
// Рабочие панели: обзвон, отправка сообщений, рассылки, отчёты. Всё на
// переменных темы — без зашитых цветов, ломающихся в тёмной и ночной.
import "./styles/dente-operations.css";
// Канонические темы и глобальные переопределения для ликвидации белых пятен в темных темах.
import "./styles/themes.css";
import "./styles/theme-overrides.css";
// График смен врачей и ростер кабинетов
import "./components/schedule/roster/doctorShiftRoster.css";
// Расписание по креслам и кабинетам
import "./components/schedule/chairSchedule.css";
// Прейскурант и каталог услуг
import "./components/catalog/pricelist/servicePricelist.css";
// Санитарный контроль, стерилизация и автоклавирование (Мандаты 8b, 8e, 8n, 8am, 8aq)
import "./components/sanpin/sanpin.css";
// Рентген-модули: визиограф, hot-folder интейк и темный кокпит КЛКТ тюнера
import "./components/radiology/rvgCapture.css";
import "./components/radiology/hotFolderIntake.css";
import "./components/radiology/tuner/cbctTunerStyles.css";
// Оптимизация под слабые ПК (<=4GB RAM, <=4 ядра, медленный HDD): отключение размытия и тяжелых теней
import "./styles/low-spec-hardware.css";
// Последним: мастер первого запуска правит фон/цвета слоёв выше, где те
// зашивали светлую палитру и ломали тёмную тему.
import "./styles/onboarding-wizard.css";
// Интерактивное обучение, Spotlight и пульсирующая акцентуация
import "./styles/guided-tour.css";

initHardwareCapabilities();

// Защита от сбоев реконсиляции DOM (NotFoundError: Failed to execute 'removeChild' on 'Node')
// Предотвращает фатальное падение React при манипуляциях с DOM вне виртуального дерева.
if (typeof Node !== "undefined" && Node.prototype) {
	const originalRemoveChild = Node.prototype.removeChild;
	Node.prototype.removeChild = function <T extends Node>(child: T): T {
		if (child.parentNode !== this) {
			return child;
		}
		return originalRemoveChild.call(this, child) as T;
	};
	const originalInsertBefore = Node.prototype.insertBefore;
	Node.prototype.insertBefore = function <T extends Node>(newNode: T, referenceNode: Node | null): T {
		if (referenceNode && referenceNode.parentNode !== this) {
			return newNode;
		}
		return originalInsertBefore.call(this, newNode, referenceNode) as T;
	};
}

/**
 * РАЗВИЛКА ПУБЛИЧНОГО КОНТУРА. Решается ДО подстановки токенов и до рендера.
 *
 * ЧТО БЫЛО ПЛОХО ДЛЯ КЛИНИКИ. Регистратура нажимала «Ссылка технику»
 * (components/schedule/LabOrdersPanel.tsx), получала подсказку «Ссылка для
 * зуботехника скопирована в буфер обмена» и отправляла в лабораторию адрес
 * #/portal/lab-order/<токен>. Разбора этого адреса здесь не было: AppShell
 * рендерился безусловно, а viewFromHash() (AppHelpers.tsx) на таком хеше
 * откатывался на «Смену». Зуботехник открывал рабочее место клиники вместо
 * своего заказа — статус коронки продолжал жить в телефонных звонках, при том
 * что оба серверных маршрута портала (apps/api/src/routes/lab.ts) давно готовы.
 */
const publicPortalRoute = publicPortalRouteFromHash(
	typeof window !== "undefined" &&
		(window.location.pathname.startsWith("/public/budget") ||
			window.location.pathname.startsWith("/portal/budget") ||
			window.location.pathname === "/tgapp" ||
			window.location.pathname.startsWith("/tgapp/") ||
			window.location.pathname === "/portal/tgapp" ||
			window.location.pathname.startsWith("/portal/tgapp/") ||
			window.location.pathname === "/portal/warranty" ||
			window.location.pathname.startsWith("/portal/warranty/") ||
			window.location.pathname === "/warranty" ||
			window.location.pathname.startsWith("/warranty/") ||
			window.location.pathname === "/booking" ||
			window.location.pathname.startsWith("/booking/") ||
			window.location.pathname.startsWith("/booking?") ||
			window.location.pathname === "/book" ||
			window.location.pathname.startsWith("/book/") ||
			window.location.pathname.startsWith("/book?") ||
			window.location.pathname === "/portal/booking" ||
			window.location.pathname.startsWith("/portal/booking/") ||
			window.location.pathname === "/portal/book" ||
			window.location.pathname.startsWith("/portal/book/") ||
			window.location.pathname === "/portal/kiosk" ||
			window.location.pathname.startsWith("/portal/kiosk/") ||
			window.location.pathname === "/kiosk" ||
			window.location.pathname.startsWith("/kiosk/") ||
			window.location.pathname === "/portal/checkin" ||
			window.location.pathname.startsWith("/portal/checkin/") ||
			window.location.search.includes("booking=1") ||
			window.location.search.includes("kiosk=1"))
		? window.location.search.includes("booking=1")
			? "/booking"
			: window.location.search.includes("kiosk=1")
				? "/portal/kiosk"
				: window.location.pathname + window.location.search
		: typeof window !== "undefined"
			? window.location.hash
			: "",
);
const cbctStudioRoute = typeof window !== "undefined" ? parseCbctStudioRoute() : { isCbctStudio: false };
const cephStudioRoute = typeof window !== "undefined" ? parseCephStudioRoute() : { isCephStudio: false };

function resolveCbctStudioMode(mode: string | undefined): StudioMode | undefined {
	if (
		mode === "diagnostic" ||
		mode === "panoramic" ||
		mode === "volume3d" ||
		mode === "implant" ||
		mode === "tmj" ||
		mode === "endo"
	) {
		return mode;
	}
	return undefined;
}

const rootElement = typeof document !== "undefined" ? document.getElementById("root") : null;
if (!rootElement) {
	throw new Error("DENTE Startup Failure: #root container element not found in DOM");
}
const appRoot = createRoot(rootElement);

if (publicPortalRoute) {
	// Тему на публичной странице выбирает не клиника, а сам посетитель: у
	// зуботехника нет ни настроек кабинета, ни themeStore, а index.html жёстко
	// ставит на <html> класс dark. Без этой строки внешний участник всегда
	// получал бы тёмную палитру клиники независимо от своей системы.
	applyThemeToRoot(
		document.documentElement,
		resolveTheme(
			"auto",
			window.matchMedia("(prefers-color-scheme: dark)").matches,
		),
	);

	// installApiAuthFetch() здесь НЕ вызывается сознательно: он читает токен
	// кабинета и токен сотрудника из localStorage и подставляет их в запросы к
	// /api/. Зуботехник — внешний участник, его маршруты авторизации не требуют
	// вовсе, и заводить на публичной странице чтение клинических токенов не за чем.
	//
	// GlobalToast приходится ставить рядом: подтверждение смены статуса портал
	// отправляет через showToast, а внутри AppShell этот приёмник остался.
	// Онлайн-запись пациента — второй адрес того же публичного контура.
	//
	// ЧТО БЫЛО ПЛОХО ДЛЯ КЛИНИКИ. Страница записи (pages/PublicBookingWidget.tsx)
	// существовала целиком и звала три ЖИВЫХ серверных адреса
	// (apps/api/src/routes/publicBooking.ts: врачи, свободное время, запись), а
	// отрисовывать её было некому: ни одного импортёра во всём apps/web/src. То
	// есть онлайн-записи у клиники не было вовсе — пациент по-прежнему звонил, а
	// готовый бэкенд отвечал в пустоту. Разбор адреса появился вместе с порталом
	// зуботехника, и теперь второй вид адреса стоит рядом с первым.
	// ГРАНИЦА ОШИБОК ЗДЕСЬ ОБЯЗАТЕЛЬНА, И ЕЁ НЕ БЫЛО. Рабочее место клиники всегда
	// монтировалось внутрь границы (AppShell), а этот контур — нет: исключение при
	// рендере снимало поддерево, React оставлял пустой корень, и посетитель — чаще
	// всего пациент с телефона — видел белую страницу без текста и без действия.
	// Граница накрывает и GlobalToast: если падает он, страница записи всё равно
	// не должна исчезать молча. Она ловит только фазу рендера — сбои сетевых
	// запросов внутри самих виджетов разбираются их собственными обработчиками.
	appRoot.render(
		<React.StrictMode>
			<BootErrorBoundary audience="public">
				<React.Suspense fallback={null}>
					{publicPortalRoute.kind === "booking" ? (
						<PublicBookingPage
							organizationId={publicPortalRoute.organizationId}
							defaultMode="booking"
						/>
					) : publicPortalRoute.kind === "cabinet" ? (
						<PublicBookingPage
							organizationId={publicPortalRoute.organizationId}
							defaultMode="cabinet"
						/>
					) : publicPortalRoute.kind === "kiosk" ? (
						<div
							className="w-screen h-screen overflow-auto flex items-center justify-center p-2 sm:p-4"
							style={{ backgroundColor: "var(--paper-soft, var(--paper))" }}
						>
							<MobileSelfCheckinModal
								isOpen={true}
								organizationId={publicPortalRoute.organizationId}
								onClose={() => {
									window.location.hash = publicPortalRoute.organizationId
										? `#/portal/kiosk/${encodeURIComponent(publicPortalRoute.organizationId)}`
										: "#/portal/kiosk";
								}}
							/>
						</div>
					) : publicPortalRoute.kind === "tgapp" ? (
						<TelegramMiniAppView
							organizationId={publicPortalRoute.organizationId ?? null}
							patientId={publicPortalRoute.patientId ?? null}
						/>
					) : publicPortalRoute.kind === "budget" ? (
						<PublicBudgetSignPage token={publicPortalRoute.token} />
					) : publicPortalRoute.kind === "warranty" ? (
						<PublicWarrantyVerificationPage
							certificateNumber={publicPortalRoute.certificateNumber}
						/>
					) : publicPortalRoute.kind === "lab-order" ? (
						<GuestLabPortal token={publicPortalRoute.token} />
					) : publicPortalRoute.kind === "photo-bridge" ? (
						<MobilePhotoUploadPage />
					) : null}
				</React.Suspense>
				<GlobalToast />
			</BootErrorBoundary>
		</React.StrictMode>,
	);
} else if (cbctStudioRoute.isCbctStudio) {
	// АВТОНОМНЫЙ КОКПИТ 3D КЛКТ (ВТОРОЙ МОНИТОР / ПОПАУТ ОКНО / МАРШРУТ /cbct-studio)
	// Должен рендериться БЕЗ бокового меню, БЕЗ шапки CRM и БЕЗ лишних провайдеров.
	applyThemeToRoot(document.documentElement, resolveTheme("dark", true));
	installApiAuthFetch();

	appRoot.render(
		<React.StrictMode>
			<BootErrorBoundary audience="clinic">
				<React.Suspense fallback={<div className="fixed inset-0 bg-zinc-950 flex items-center justify-center text-cyan-400 font-mono text-sm">Загрузка КЛКТ Студии...</div>}>
					<CbctStandaloneStudioView
						studyId={cbctStudioRoute.studyId}
						patientId={cbctStudioRoute.patientId}
						patientName={cbctStudioRoute.patientName}
						initialStudioMode={resolveCbctStudioMode(cbctStudioRoute.mode)}
						autoLoadDemo={cbctStudioRoute.isDemo}
					/>
				</React.Suspense>
				<GlobalToast />
			</BootErrorBoundary>
		</React.StrictMode>,
	);
} else if (cephStudioRoute.isCephStudio) {
	// АВТОНОМНАЯ СТУДИЯ ТРГ И ЦЕФАЛОМЕТРИИ (ВТОРОЙ МОНИТОР / ПОПАУТ ОКНО / МАРШРУТ /radiology/ceph-studio)
	// Суверенный экран без бокового меню CRM для демонстрации пациенту и точной разметки
	applyThemeToRoot(document.documentElement, resolveTheme("dark", true));
	installApiAuthFetch();

	appRoot.render(
		<React.StrictMode>
			<BootErrorBoundary audience="clinic">
				<React.Suspense fallback={<div className="fixed inset-0 bg-slate-950 flex items-center justify-center text-teal-400 font-mono text-sm">Загрузка ТРГ Студии...</div>}>
					<CephStandaloneStudioView
						patientId={cephStudioRoute.patientId}
						patientName={cephStudioRoute.patientName}
						initialImageUrl={cephStudioRoute.imageUrl}
						initialStudioMode={cephStudioRoute.demoMode ? "patient" : "doctor"}
						autoLoadDemo={cephStudioRoute.isDemo}
					/>
				</React.Suspense>
				<GlobalToast />
			</BootErrorBoundary>
		</React.StrictMode>,
	);
} else if (typeof window !== "undefined" && isPatientPresentationRoute()) {
	// АВТОНОМНЫЙ ЭКРАН ПРЕЗЕНТАЦИИ ПАЦИЕНТУ (ВТОРОЙ МОНИТОР / ТВ В КАБИНЕТЕ / ?view=patient-presentation)
	// Суверенная демонстрация «До / После» без клинических цен, заметок и меню CRM
	applyThemeToRoot(document.documentElement, resolveTheme("dark", true));
	installApiAuthFetch();

	appRoot.render(
		<React.StrictMode>
			<BootErrorBoundary audience="public">
				<React.Suspense fallback={<div className="fixed inset-0 bg-slate-950 flex items-center justify-center text-teal-400 font-mono text-sm">Загрузка презентации...</div>}>
					<PatientPresentationStandaloneView />
				</React.Suspense>
				<GlobalToast />
			</BootErrorBoundary>
		</React.StrictMode>,
	);
} else if (
	typeof window !== "undefined" &&
	(window.location.pathname === "/lounge-display" ||
		window.location.pathname === "/lounge" ||
		window.location.pathname === "/lobby" ||
		window.location.pathname.startsWith("/lounge-display/") ||
		window.location.pathname.startsWith("/lobby/") ||
		window.location.hash === "#/lounge-display" ||
		window.location.hash === "#lounge-display" ||
		window.location.hash === "#/lounge" ||
		window.location.hash === "#lounge" ||
		window.location.hash === "#/lobby" ||
		window.location.hash === "#lobby" ||
		new URLSearchParams(window.location.search).has("lounge") ||
		new URLSearchParams(window.location.search).has("lobby"))
) {
	applyThemeToRoot(
		document.documentElement,
		resolveTheme(
			"auto",
			window.matchMedia("(prefers-color-scheme: dark)").matches,
		),
	);
	installApiAuthFetch();

	appRoot.render(
		<React.StrictMode>
			<BootErrorBoundary audience="public">
				<React.Suspense
					fallback={
						<div className="fixed inset-0 bg-slate-950 flex items-center justify-center text-teal-400 font-mono text-sm">
							Загрузка табло холла...
						</div>
					}
				>
					<WaitingLoungeSignage onExit={() => { window.location.hash = "shift"; }} />
				</React.Suspense>
				<GlobalToast />
			</BootErrorBoundary>
		</React.StrictMode>,
	);
} else if (
	typeof window !== "undefined" &&
	(window.location.search.includes("stand=endo") ||
		window.location.search.includes("standalone=endo") ||
		window.location.search.includes("endo=1") ||
		window.location.hash === "#endo" ||
		window.location.hash === "#endodontics" ||
		window.location.hash === "#root-canals" ||
		window.location.hash.startsWith("#endo?") ||
		window.location.hash.startsWith("#endo/"))
) {
	applyThemeToRoot(
		document.documentElement,
		resolveTheme(
			"auto",
			window.matchMedia("(prefers-color-scheme: dark)").matches,
		),
	);
	installApiAuthFetch();

	appRoot.render(
		<React.StrictMode>
			<BootErrorBoundary audience="clinic">
				<React.Suspense
					fallback={
						<div className="fixed inset-0 bg-slate-950 flex items-center justify-center text-teal-400 font-mono text-sm">
							Загрузка эндодонтии...
						</div>
					}
				>
					<EndodonticStudioStandaloneView />
				</React.Suspense>
				<GlobalToast />
			</BootErrorBoundary>
		</React.StrictMode>,
	);
} else if (
	typeof window !== "undefined" &&
	(window.location.search.includes("stand=perio") ||
		window.location.search.includes("standalone=perio") ||
		window.location.search.includes("perio=1") ||
		window.location.search.includes("psr=1") ||
		window.location.hash === "#perio" ||
		window.location.hash === "#psr" ||
		window.location.hash.startsWith("#perio?") ||
		window.location.hash.startsWith("#perio/"))
) {
	applyThemeToRoot(
		document.documentElement,
		resolveTheme(
			"auto",
			window.matchMedia("(prefers-color-scheme: dark)").matches,
		),
	);
	installApiAuthFetch();

	appRoot.render(
		<React.StrictMode>
			<BootErrorBoundary audience="clinic">
				<React.Suspense
					fallback={
						<div className="fixed inset-0 bg-slate-950 flex items-center justify-center text-teal-400 font-mono text-sm">
							Загрузка пародонтологии...
						</div>
					}
				>
					<PerioStudioStandaloneView />
				</React.Suspense>
				<GlobalToast />
			</BootErrorBoundary>
		</React.StrictMode>,
	);
} else if (
	typeof window !== "undefined" &&
	(window.location.search.includes("stand=hygiene") ||
		window.location.search.includes("standalone=hygiene") ||
		window.location.search.includes("hygiene=1") ||
		window.location.search.includes("cleaning=1") ||
		window.location.hash === "#hygiene" ||
		window.location.hash === "#cleaning" ||
		window.location.hash.startsWith("#hygiene?") ||
		window.location.hash.startsWith("#hygiene/"))
) {
	applyThemeToRoot(
		document.documentElement,
		resolveTheme(
			"auto",
			window.matchMedia("(prefers-color-scheme: dark)").matches,
		),
	);
	installApiAuthFetch();

	appRoot.render(
		<React.StrictMode>
			<BootErrorBoundary audience="clinic">
				<React.Suspense
					fallback={
						<div className="fixed inset-0 bg-slate-950 flex items-center justify-center text-teal-400 font-mono text-sm">
							Загрузка кабинета гигиены...
						</div>
					}
				>
					<HygieneStudioStandaloneView />
				</React.Suspense>
				<GlobalToast />
			</BootErrorBoundary>
		</React.StrictMode>,
	);
} else if (
	typeof window !== "undefined" &&
	(window.location.search.includes("stand=orthopedics") ||
		window.location.search.includes("standalone=orthopedics") ||
		window.location.search.includes("orthopedics=1") ||
		window.location.search.includes("crowns=1") ||
		window.location.hash === "#orthopedics" ||
		window.location.hash === "#crowns" ||
		window.location.hash === "#orthopedics-studio" ||
		window.location.hash.startsWith("#orthopedics?") ||
		window.location.hash.startsWith("#crowns?") ||
		window.location.hash.startsWith("#orthopedics-studio?"))
) {
	applyThemeToRoot(
		document.documentElement,
		resolveTheme(
			"auto",
			window.matchMedia("(prefers-color-scheme: dark)").matches,
		),
	);
	installApiAuthFetch();

	appRoot.render(
		<React.StrictMode>
			<BootErrorBoundary audience="clinic">
				<React.Suspense
					fallback={
						<div className="fixed inset-0 bg-slate-950 flex items-center justify-center text-teal-400 font-mono text-sm">
							Загрузка ортопедической студии...
						</div>
					}
				>
					<OrthopedicStudioStandaloneView />
				</React.Suspense>
				<GlobalToast />
			</BootErrorBoundary>
		</React.StrictMode>,
	);
} else if (
	typeof window !== "undefined" &&
	(window.location.search.includes("stand=surgery") ||
		window.location.search.includes("standalone=surgery") ||
		window.location.search.includes("surgery=1") ||
		window.location.search.includes("implant=1") ||
		window.location.search.includes("extraction=1") ||
		window.location.hash === "#surgery" ||
		window.location.hash === "#implant" ||
		window.location.hash === "#extraction" ||
		window.location.hash === "#surgery-studio" ||
		window.location.hash.startsWith("#surgery?") ||
		window.location.hash.startsWith("#implant?") ||
		window.location.hash.startsWith("#surgery/"))
) {
	applyThemeToRoot(
		document.documentElement,
		resolveTheme(
			"auto",
			window.matchMedia("(prefers-color-scheme: dark)").matches,
		),
	);
	installApiAuthFetch();

	appRoot.render(
		<React.StrictMode>
			<BootErrorBoundary audience="clinic">
				<React.Suspense
					fallback={
						<div className="fixed inset-0 bg-slate-950 flex items-center justify-center text-teal-400 font-mono text-sm">
							Загрузка хирургического хаба...
						</div>
					}
				>
					<SurgeryStudioStandaloneView />
				</React.Suspense>
				<GlobalToast />
			</BootErrorBoundary>
		</React.StrictMode>,
	);
} else if (
	typeof window !== "undefined" &&
	!window.location.search.includes("orthopedics") &&
	!window.location.hash.includes("orthopedics") &&
	!window.location.hash.includes("crowns") &&
	(window.location.search.includes("stand=ortho") ||
		window.location.search.includes("standalone=ortho") ||
		window.location.search.includes("stand=orthodontics") ||
		window.location.search.includes("standalone=orthodontics") ||
		window.location.search.includes("ortho=1") ||
		window.location.search.includes("orthodontics=1") ||
		window.location.hash === "#ortho" ||
		window.location.hash === "#orthodontics" ||
		window.location.hash === "#ortho-protocol" ||
		window.location.hash === "#ortho-studio" ||
		window.location.hash.startsWith("#ortho?") ||
		window.location.hash.startsWith("#orthodontics?") ||
		window.location.hash.startsWith("#ortho-protocol?") ||
		window.location.hash.startsWith("#ortho-studio?"))
) {
	applyThemeToRoot(
		document.documentElement,
		resolveTheme(
			"auto",
			window.matchMedia("(prefers-color-scheme: dark)").matches,
		),
	);
	installApiAuthFetch();

	appRoot.render(
		<React.StrictMode>
			<BootErrorBoundary audience="clinic">
				<React.Suspense
					fallback={
						<div className="fixed inset-0 bg-slate-950 flex items-center justify-center text-teal-400 font-mono text-sm">
							Загрузка ортодонтической студии...
						</div>
					}
				>
					<OrthodonticStudioStandaloneView />
				</React.Suspense>
				<GlobalToast />
			</BootErrorBoundary>
		</React.StrictMode>,
	);
} else if (
	typeof window !== "undefined" &&
	(window.location.search.includes("stand=waitlist") ||
		window.location.search.includes("standalone=waitlist") ||
		window.location.search.includes("waitlist-matches=true") ||
		window.location.hash === "#waitlist" ||
		window.location.hash === "#waitlist-matches" ||
		window.location.hash.startsWith("#waitlist?") ||
		window.location.hash.startsWith("#waitlist-matches?"))
) {
	applyThemeToRoot(
		document.documentElement,
		resolveTheme(
			"auto",
			window.matchMedia("(prefers-color-scheme: dark)").matches,
		),
	);
	installApiAuthFetch();

	appRoot.render(
		<React.StrictMode>
			<BootErrorBoundary audience="clinic">
				<React.Suspense
					fallback={
						<div className="fixed inset-0 bg-slate-950 flex items-center justify-center text-teal-400 font-mono text-sm">
							Загрузка листа ожидания...
						</div>
					}
				>
					<WaitlistStandaloneView />
				</React.Suspense>
				<GlobalToast />
			</BootErrorBoundary>
		</React.StrictMode>,
	);
} else if (
	typeof window !== "undefined" &&
	(window.location.search.includes("stand=quick-booking") ||
		window.location.search.includes("standalone=quick-booking") ||
		window.location.search.includes("quick-booking=true") ||
		window.location.hash === "#quick-booking" ||
		window.location.hash.startsWith("#quick-booking?"))
) {
	applyThemeToRoot(
		document.documentElement,
		resolveTheme(
			"auto",
			window.matchMedia("(prefers-color-scheme: dark)").matches,
		),
	);
	installApiAuthFetch();

	appRoot.render(
		<React.StrictMode>
			<BootErrorBoundary audience="clinic">
				<React.Suspense
					fallback={
						<div className="fixed inset-0 bg-slate-950 flex items-center justify-center text-teal-400 font-mono text-sm">
							Загрузка быстрой записи...
						</div>
					}
				>
					<QuickBookingStandaloneView />
				</React.Suspense>
				<GlobalToast />
			</BootErrorBoundary>
		</React.StrictMode>,
	);
} else if (
	typeof window !== "undefined" &&
	(window.location.search.includes("stand=odontogram") ||
		window.location.search.includes("stand=module") ||
		window.location.search.includes("stand=arch32") ||
		window.location.search.includes("odontogram-module=1") ||
		window.location.search.includes("odontogram=1") ||
		window.location.hash === "#odontogram" ||
		window.location.hash === "#odontogram-module" ||
		window.location.hash.startsWith("#odontogram?") ||
		window.location.hash.startsWith("#odontogram/"))
) {
	applyThemeToRoot(
		document.documentElement,
		resolveTheme(
			"auto",
			window.matchMedia("(prefers-color-scheme: dark)").matches,
		),
	);
	installApiAuthFetch();

	appRoot.render(
		<React.StrictMode>
			<BootErrorBoundary audience="clinic">
				<React.Suspense
					fallback={
						<div className="fixed inset-0 bg-slate-950 flex items-center justify-center text-teal-400 font-mono text-sm">
							Загрузка одонтограммы...
						</div>
					}
				>
					<OdontogramStudioStandaloneView />
				</React.Suspense>
				<GlobalToast />
			</BootErrorBoundary>
		</React.StrictMode>,
	);
} else if (
	typeof window !== "undefined" &&
	(window.location.search.includes("stand=cashbox") ||
		window.location.search.includes("stand=checkout") ||
		window.location.search.includes("standalone=cashbox") ||
		window.location.search.includes("cashbox-studio=1") ||
		window.location.search.includes("cashbox=1") ||
		window.location.search.includes("checkout=1") ||
		window.location.hash === "#stand-cashbox" ||
		window.location.hash === "#cashbox" ||
		window.location.hash === "#checkout" ||
		window.location.hash.startsWith("#checkout?") ||
		window.location.hash.startsWith("#cashbox?"))
) {
	applyThemeToRoot(
		document.documentElement,
		resolveTheme(
			"auto",
			window.matchMedia("(prefers-color-scheme: dark)").matches,
		),
	);
	installApiAuthFetch();

	appRoot.render(
		<React.StrictMode>
			<BootErrorBoundary audience="clinic">
				<React.Suspense
					fallback={
						<div className="fixed inset-0 bg-slate-950 flex items-center justify-center text-teal-400 font-mono text-sm">
							Загрузка кассы...
						</div>
					}
				>
					<CashboxStandaloneView />
				</React.Suspense>
				<GlobalToast />
			</BootErrorBoundary>
		</React.StrictMode>,
	);
} else if (
	typeof window !== "undefined" &&
	(window.location.search.includes("stand=loyalty") ||
		window.location.search.includes("standalone=loyalty") ||
		window.location.search.includes("loyalty=1") ||
		window.location.search.includes("bonuses=1") ||
		window.location.hash === "#loyalty" ||
		window.location.hash === "#bonuses" ||
		window.location.hash.startsWith("#loyalty?") ||
		window.location.hash.startsWith("#bonuses?"))
) {
	applyThemeToRoot(
		document.documentElement,
		resolveTheme(
			"auto",
			window.matchMedia("(prefers-color-scheme: dark)").matches,
		),
	);
	installApiAuthFetch();

	appRoot.render(
		<React.StrictMode>
			<BootErrorBoundary audience="clinic">
				<React.Suspense
					fallback={
						<div className="fixed inset-0 bg-slate-950 flex items-center justify-center text-teal-400 font-mono text-sm">
							Загрузка программы лояльности...
						</div>
					}
				>
					<LoyaltyStudioStandaloneView />
				</React.Suspense>
				<GlobalToast />
			</BootErrorBoundary>
		</React.StrictMode>,
	);
} else if (
	typeof window !== "undefined" &&
	(window.location.search.includes("stand=emr") ||
		window.location.search.includes("standalone=emr") ||
		window.location.search.includes("emr=1") ||
		window.location.search.includes("medical-card=1") ||
		window.location.hash === "#emr" ||
		window.location.hash === "#medical-card" ||
		window.location.hash.startsWith("#emr?") ||
		window.location.hash.startsWith("#medical-card?"))
) {
	applyThemeToRoot(
		document.documentElement,
		resolveTheme(
			"auto",
			window.matchMedia("(prefers-color-scheme: dark)").matches,
		),
	);
	installApiAuthFetch();

	appRoot.render(
		<React.StrictMode>
			<BootErrorBoundary audience="clinic">
				<React.Suspense
					fallback={
						<div className="fixed inset-0 bg-slate-950 flex items-center justify-center text-teal-400 font-mono text-sm">
							Загрузка медицинской карты...
						</div>
					}
				>
					<EmrMedicalRecordStandaloneView onClose={() => {}} />
				</React.Suspense>
				<GlobalToast />
			</BootErrorBoundary>
		</React.StrictMode>,
	);
} else if (
	typeof window !== "undefined" &&
	(window.location.search.includes("stand=payroll") ||
		window.location.search.includes("standalone=payroll") ||
		window.location.search.includes("stand=doctor-payroll-report") ||
		window.location.search.includes("standalone=doctor-payroll-report") ||
		window.location.search.includes("payroll=1") ||
		window.location.search.includes("doctor_payroll=1") ||
		window.location.search.includes("doctor-payroll=1") ||
		window.location.search.includes("executive_payroll=1") ||
		window.location.search.includes("assistant_payroll=1") ||
		window.location.hash === "#payroll" ||
		window.location.hash === "#doctor-payroll" ||
		window.location.hash === "#doctor-payroll-report" ||
		window.location.hash === "#executive-payroll" ||
		window.location.hash === "#assistant-payroll" ||
		window.location.hash.startsWith("#payroll?") ||
		window.location.hash.startsWith("#doctor-payroll?") ||
		window.location.hash.startsWith("#doctor-payroll-report?") ||
		window.location.hash.startsWith("#executive-payroll?"))
) {
	applyThemeToRoot(
		document.documentElement,
		resolveTheme(
			"auto",
			window.matchMedia("(prefers-color-scheme: dark)").matches,
		),
	);
	installApiAuthFetch();

	appRoot.render(
		<React.StrictMode>
			<BootErrorBoundary audience="clinic">
				<React.Suspense
					fallback={
						<div className="fixed inset-0 bg-slate-950 flex items-center justify-center text-teal-400 font-mono text-sm">
							Загрузка ведомости зарплат...
						</div>
					}
				>
					<PayrollStandaloneStudioView />
				</React.Suspense>
				<GlobalToast />
			</BootErrorBoundary>
		</React.StrictMode>,
	);
} else if (
	typeof window !== "undefined" &&
	(window.location.search.includes("stand=chairside-hud") ||
		window.location.search.includes("standalone=chairside-hud") ||
		window.location.hash === "#chairside-hud" ||
		window.location.hash.startsWith("#chairside-hud?"))
) {
	applyThemeToRoot(
		document.documentElement,
		resolveTheme(
			"auto",
			window.matchMedia("(prefers-color-scheme: dark)").matches,
		),
	);
	installApiAuthFetch();

	appRoot.render(
		<React.StrictMode>
			<BootErrorBoundary audience="clinic">
				<React.Suspense
					fallback={
						<div className="fixed inset-0 bg-slate-950 flex items-center justify-center text-teal-400 font-mono text-sm">
							Загрузка кресельного ИИ-копилота...
						</div>
					}
				>
					<ChairsideHudStandaloneView />
				</React.Suspense>
				<GlobalToast />
			</BootErrorBoundary>
		</React.StrictMode>,
	);
} else if (
	typeof window !== "undefined" &&
	(window.location.search.includes("stand=copilot-studio") ||
		window.location.search.includes("standalone=copilot-studio") ||
		window.location.hash === "#copilot-studio" ||
		window.location.hash.startsWith("#copilot-studio?"))
) {
	applyThemeToRoot(
		document.documentElement,
		resolveTheme(
			"auto",
			window.matchMedia("(prefers-color-scheme: dark)").matches,
		),
	);
	installApiAuthFetch();

	appRoot.render(
		<React.StrictMode>
			<BootErrorBoundary audience="clinic">
				<React.Suspense
					fallback={
						<div className="fixed inset-0 bg-slate-950 flex items-center justify-center text-teal-400 font-mono text-sm">
							Загрузка кабинета ИИ-копилота...
						</div>
					}
				>
					<CopilotStudioStandaloneView />
				</React.Suspense>
				<GlobalToast />
			</BootErrorBoundary>
		</React.StrictMode>,
	);
} else {
	// Подставляет токены кабинета и сотрудника во все запросы к /api/.
	// Должно выполниться ДО первого рендера: часть экранов запрашивает данные
	// сразу при монтировании. Благодаря этому сервер может требовать токен и
	// больше не доверяет заголовку x-organization-id от клиента.
	installApiAuthFetch();

	appRoot.render(
		<React.StrictMode>
			<React.Suspense fallback={null}>
				<AppShell />
			</React.Suspense>
		</React.StrictMode>,
	);
}

const DENTE_SW_RELOAD_MARKER = "dente:sw-controller-reload";

function requestDenteServiceWorkerActivation(
	worker: ServiceWorker | null | undefined,
): void {
	worker?.postMessage({ type: "DENTE_SKIP_WAITING" });
}

function reloadOnceAfterServiceWorkerControllerChange(): void {
	if (safeSessionStorageGetItem(DENTE_SW_RELOAD_MARKER) === "1") return;
	safeSessionStorageSetItem(DENTE_SW_RELOAD_MARKER, "1");
	window.location.reload();
}

function watchDenteServiceWorkerUpdates(
	registration: ServiceWorkerRegistration,
): void {
	if (registration.waiting && navigator.serviceWorker.controller) {
		requestDenteServiceWorkerActivation(registration.waiting);
	}

	registration.addEventListener("updatefound", () => {
		const installingWorker = registration.installing;
		if (!installingWorker) return;

		installingWorker.addEventListener("statechange", () => {
			if (
				installingWorker.state === "installed" &&
				navigator.serviceWorker.controller
			) {
				requestDenteServiceWorkerActivation(installingWorker);
			}
		});
	});

	document.addEventListener("visibilitychange", () => {
		if (document.visibilityState === "visible") {
			void registration.update().catch((err) => {
				logger.warn("Обновление приложения недоступно", err);
			});
		}
	});

	window.setInterval(
		() => {
			if (typeof document !== "undefined" && document.hidden) return;
			void registration.update().catch((err) => {
				logger.warn("Обновление приложения недоступно (фоновая проверка)", err);
			});
		},
		30 * 60 * 1000,
	);
}

// Service worker кэширует оболочку рабочего места клиники. На публичной странице
// он не нужен и вреден: у зуботехника в кэше осталась бы оболочка чужой клиники,
// а «Обновить рабочее место» ему предлагать нечего.
if (
	!publicPortalRoute &&
	!cbctStudioRoute.isCbctStudio &&
	"serviceWorker" in navigator &&
	import.meta.env.PROD
) {
	if (safeSessionStorageGetItem(DENTE_SW_RELOAD_MARKER) === "1") {
		safeSessionStorageRemoveItem(DENTE_SW_RELOAD_MARKER);
	}

	navigator.serviceWorker.addEventListener(
		"controllerchange",
		reloadOnceAfterServiceWorkerControllerChange,
	);

	window.addEventListener("load", () => {
		navigator.serviceWorker
			.register("/sw.js")
			.then((registration) => {
				watchDenteServiceWorkerUpdates(registration);
				void registration.update().catch((err) => {
					logger.warn("Обновление приложения недоступно при старте", err);
				});
			})
			.catch((err) => {
				logger.warn("Service Worker недоступен", err);
			});
	});
}
