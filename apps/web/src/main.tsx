import React from "react";
import { createRoot } from "react-dom/client";
import { AppShell } from "./AppShell";
import { BootErrorBoundary } from "./bootErrorBoundary";
import { GlobalToast } from "./components/GlobalToast";
import { GuestLabPortal } from "./GuestLabPortal";
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

const PublicBookingWidget = React.lazy(() =>
	import("./pages/PublicBookingWidget").then((m) => ({ default: m.PublicBookingWidget })),
);
const PatientBudgetSignView = React.lazy(() =>
	import("./components/portal/PatientBudgetSignView").then((m) => ({
		default: m.PatientBudgetSignView,
	})),
);
const MobileSelfCheckinModal = React.lazy(() =>
	import("./components/portal/selfCheckin/MobileSelfCheckinModal").then((m) => ({
		default: m.MobileSelfCheckinModal,
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
import { parseCbctStudioRoute } from "./utils/runtimeRouter";
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
// Табель учета рабочего времени Т-13
import "./components/payroll/timesheetT13.css";
// График смен врачей и ростер кабинетов
import "./components/schedule/roster/doctorShiftRoster.css";
// Расписание по креслам и кабинетам
import "./components/schedule/chairSchedule.css";
// Прейскурант и каталог услуг
import "./components/catalog/pricelist/servicePricelist.css";
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
		(window.location.pathname === "/tgapp" ||
			window.location.pathname.startsWith("/tgapp/") ||
			window.location.pathname === "/portal/tgapp" ||
			window.location.pathname.startsWith("/portal/tgapp/"))
		? window.location.pathname + window.location.search
		: typeof window !== "undefined"
			? window.location.hash
			: "",
);
const cbctStudioRoute = typeof window !== "undefined" ? parseCbctStudioRoute() : { isCbctStudio: false };
// biome-ignore lint/style/noNonNullAssertion: automated suppression
const appRoot = createRoot(document.getElementById("root")!);

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
						<PublicBookingWidget
							organizationId={publicPortalRoute.organizationId}
							defaultMode="booking"
						/>
					) : publicPortalRoute.kind === "cabinet" ? (
						<PublicBookingWidget
							organizationId={publicPortalRoute.organizationId}
							defaultMode="cabinet"
						/>
					) : publicPortalRoute.kind === "kiosk" ? (
						<div className="w-screen h-screen overflow-auto bg-slate-900 flex items-center justify-center p-2 sm:p-4">
							<MobileSelfCheckinModal
								isOpen={true}
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
						<PatientBudgetSignView token={publicPortalRoute.token} />
					) : (
						<GuestLabPortal token={publicPortalRoute.token} />
					)}
				</React.Suspense>
				<GlobalToast />
			</BootErrorBoundary>
		</React.StrictMode>,
	);
} else if (cbctStudioRoute.isCbctStudio) {
	// АВТОНОМНЫЙ КОКПИТ 3D КЛКТ (ВТОРОЙ МОНИТОР / ПОПАУТ ОКНО / МАРШРУТ /cbct-studio)
	// Должен рендериться БЕЗ бокового меню, БЕЗ шапки CRM и БЕЗ лишних провайдеров.
	applyThemeToRoot(document.documentElement, "dark");
	installApiAuthFetch();

	appRoot.render(
		<React.StrictMode>
			<BootErrorBoundary audience="clinic">
				<React.Suspense fallback={<div className="fixed inset-0 bg-zinc-950 flex items-center justify-center text-cyan-400 font-mono text-sm">Загрузка КЛКТ Студии...</div>}>
					<CbctStandaloneStudioView
						studyId={cbctStudioRoute.studyId}
						patientId={cbctStudioRoute.patientId}
						patientName={cbctStudioRoute.patientName}
						initialStudioMode={cbctStudioRoute.mode as any}
						autoLoadDemo={cbctStudioRoute.isDemo}
					/>
				</React.Suspense>
				<GlobalToast />
			</BootErrorBoundary>
		</React.StrictMode>,
	);
} else if (
	typeof window !== "undefined" &&
	(window.location.pathname === "/lounge-display" ||
		window.location.pathname.startsWith("/lounge-display/") ||
		window.location.hash === "#/lounge-display" ||
		window.location.hash === "#lounge-display")
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
				<React.Suspense fallback={null}>
					<WaitingLoungeSignage />
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
			<AppShell />
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
