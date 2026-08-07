import { actionFailureToast } from "./lib/panelStateText";
import {
	AlignLeft,
	Beaker,
	CheckCircle2,
	Clock,
	Image as ImageIcon,
	PackageCheck,
	RefreshCcw,
	User,
} from "lucide-react";
import { useEffect, useState } from "react";
import { showToast } from "./components/GlobalToast";
import "./GuestLabPortal.css";

interface LabOrderData {
	id: string;
	patientFullName: string | null;
	toothFdi: string | null;
	material: string | null;
	colorVita: string | null;
	status: string;
	clinicalNotes: string | null;
	attachedImageUrl: string | null;
	createdAt: string;
}

interface GuestLabPortalProps {
	/**
	 * Токен заказа из ссылки. Разбор адреса живёт в lib/publicPortalRoute.ts и
	 * вызывается в main.tsx до рендера: держать второй разбор здесь значило бы
	 * иметь два несогласуемых понимания одной ссылки.
	 */
	token: string;
}

/**
 * Текст отказа обязан называть ПРИЧИНУ и ДЕЙСТВИЕ, а не код ответа: экран
 * открывает зуботехник, у которого нет ни доступа к журналам, ни возможности
 * спросить у разработчика. Раньше здесь на любой неуспех печаталось «Заказ не
 * найден или доступ запрещен» — из этой строки нельзя понять ни что случилось,
 * ни что делать дальше.
 */
function labOrderLoadFailureText(status: number): string {
	if (status === 404) {
		return (
			"Заказ по этой ссылке не найден: ссылка скопирована не целиком либо клиника удалила заказ. " +
			"Откройте ссылку из сообщения клиники ещё раз целиком — от «http» до последнего символа — " +
			"или запросите новую."
		);
	}
	if (status === 400) {
		return (
			"В ссылке нет номера заказа, открывать нечего. Скопируйте ссылку из сообщения клиники " +
			"целиком: у неё обрезан конец."
		);
	}
	return (
		"Сервер клиники не смог отдать заказ. Обновите страницу через минуту; если повторится — " +
		"сообщите в клинику, что портал лаборатории отвечает ошибкой."
	);
}

function statusSaveFailureText(status: number): string {
	if (status === 404) {
		return (
			"Заказ по этой ссылке больше не доступен: клиника его удалила. Статус НЕ сохранён — " +
			"уточните заказ в клинике."
		);
	}
	if (status === 400) {
		return (
			"Клиника не приняла этот статус. Статус НЕ сохранён — обновите страницу: набор действий " +
			"по заказу мог измениться."
		);
	}
	return (
		"Сервер клиники не сохранил статус. Нажмите кнопку ещё раз через минуту — до этого " +
		"клиника видит прежний статус."
	);
}

const NETWORK_FAILURE_TEXT =
	"Нет связи с сервером клиники. Проверьте интернет и обновите страницу — данные заказа не загружены.";

/**
 * Материал в базе хранится кодом (schema.ts labOrders.material), а выбирает его
 * врач из списка в components/schedule/LabOrdersPanel.tsx:382-386. Портал печатал
 * код как есть: зуботехник видел «zirconia» латиницей вместо «Диоксид циркония» —
 * замерено на живом экране. Подписи те же, что в списке выбора у врача, чтобы
 * клиника и лаборатория называли материал одним словом.
 */
const MATERIAL_LABELS: Record<string, string> = {
	zirconia: "Диоксид циркония",
	emax: "E.max (керамика)",
	pfm: "Металлокерамика",
	composite: "Композит",
	temporary: "Временная пластмасса",
};

export function GuestLabPortal({ token }: GuestLabPortalProps) {
	const [order, setOrder] = useState<LabOrderData | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [isUpdating, setIsUpdating] = useState(false);

	useEffect(() => {
		// Флаг отмены нужен из-за React.StrictMode: в разработке эффект исполняется
		// дважды, и без него второй ответ перезаписывал бы состояние первого.
		let cancelled = false;
		setIsLoading(true);
		setError(null);

		void (async () => {
			try {
				const res = await fetch(
					`/api/portal/lab-order/${encodeURIComponent(token)}`,
				);
				if (!res.ok) throw new Error(labOrderLoadFailureText(res.status));
				const data = (await res.json()) as LabOrderData;
				if (!cancelled) setOrder(data);
			} catch (e) {
			showToast(actionFailureToast("Ошибка выполнения операции", (e as { status?: number })?.status ?? null), "error");
				// Сетевой отказ fetch не несёт кода ответа вовсе — про него нужен
				// свой текст, иначе он выглядел бы как ошибка сервера.
				if (!cancelled)
					setError(e instanceof Error ? e.message : NETWORK_FAILURE_TEXT);
			} finally {
				if (!cancelled) setIsLoading(false);
			}
		})();

		return () => {
			cancelled = true;
		};
	}, [token]);

	const updateStatus = async (newStatus: string) => {
		if (!token || !order) return;
		try {
			setIsUpdating(true);
			const res = await fetch(
				`/api/portal/lab-order/${encodeURIComponent(token)}/status`,
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify({ status: newStatus }),
				},
			);

			if (!res.ok) throw new Error(statusSaveFailureText(res.status));

			const data = (await res.json()) as { success?: boolean; status?: string };
			// Прежняя редакция проверяла только data.success и при любом другом
			// ответе не делала НИЧЕГО: зуботехник нажимал кнопку, экран молчал, и
			// он не мог отличить сохранённый статус от потерянного.
			if (!data.success || typeof data.status !== "string") {
				throw new Error(
					"Клиника не подтвердила смену статуса. Статус НЕ сохранён — обновите страницу и " +
						"нажмите кнопку ещё раз.",
				);
			}

			setOrder({ ...order, status: data.status });
			showToast(
				"Статус заказа сохранён, врач увидит его в расписании клиники",
				"success",
			);
		} catch (e) {
			showToast(
				e instanceof Error ? e.message : statusSaveFailureText(0),
				"error",
			);
		} finally {
			setIsUpdating(false);
		}
	};

	if (isLoading) {
		return (
			<div
				className="guest-portal-container"
				style={{ justifyContent: "center" }}
			>
				<RefreshCcw className="guest-portal-spinner" size={32} />
			</div>
		);
	}

	if (error || !order) {
		return (
			<div
				className="guest-portal-container"
				style={{ justifyContent: "center" }}
			>
				<div className="guest-portal-card">
					<div className="guest-portal-icon-wrapper">
						<Beaker size={32} />
					</div>
					<h2 className="guest-portal-title">Ошибка доступа</h2>
					<p className="guest-portal-subtitle">{error}</p>
				</div>
			</div>
		);
	}

	const getStatusIcon = (status: string) => {
		switch (status) {
			case "in_progress":
				return <Clock size={20} />;
			case "refitting":
				return <RefreshCcw size={20} />;
			case "shipped":
				return <PackageCheck size={20} />;
			case "completed":
				return <CheckCircle2 size={20} />;
			default:
				return <Clock size={20} />;
		}
	};

	const statusLabel =
		{
			draft: "Черновик",
			sent: "Отправлен",
			in_progress: "В работе",
			shipped: "Работа готова, отправлена в клинику",
			received: "Получен клиникой",
			refitting: "На переделке",
			completed: "Завершен",
		}[order.status] || order.status;

	return (
		<div className="guest-portal-container">
			<div className="guest-portal-card">
				{/*
					Было `background: var(--primary-bg)` — имени --primary-bg нет ни в одной
					таблице стилей проекта (единственное вхождение было здесь). Значение
					недействительно, поэтому круг под значком оставался прозрачным.
					--teal-soft и --teal объявлены во всех трёх темах (styles/main.css).
				*/}
				<div
					className="guest-portal-icon-wrapper"
					style={{
						background: "var(--teal-soft)",
						color: "var(--teal)",
						borderColor: "transparent",
					}}
				>
					<Beaker size={32} />
				</div>
				<h1 className="guest-portal-title">
					Портал Зуботехнической Лаборатории
				</h1>
				<p className="guest-portal-subtitle">
					Безопасный доступ к деталям заказа
				</p>

				<div
					style={{
						background: "var(--bg-default)",
						borderRadius: "12px",
						padding: "20px",
						marginBottom: "24px",
					}}
				>
					<div
						style={{
							display: "flex",
							justifyContent: "space-between",
							alignItems: "center",
							marginBottom: "20px",
							borderBottom: "1px solid var(--line)",
							paddingBottom: "16px",
						}}
					>
						<div style={{ textAlign: "left" }}>
							<p
								style={{
									fontSize: "12px",
									textTransform: "uppercase",
									color: "var(--text-secondary)",
									marginBottom: "4px",
								}}
							>
								Заказ № {(order.id ?? "").substring(0, 8).toUpperCase()}
							</p>
							<h2
								style={{
									fontSize: "20px",
									fontWeight: "600",
									display: "flex",
									alignItems: "center",
									gap: "8px",
									margin: 0,
								}}
							>
								<User size={20} />
								{order.patientFullName || "Пациент не указан"}
							</h2>
						</div>
						<div className={`guest-portal-status-badge ${order.status}`}>
							{getStatusIcon(order.status)}
							{statusLabel}
						</div>
					</div>

					<div className="guest-portal-grid">
						<div>
							<h3
								className="guest-portal-field-label"
								style={{ marginBottom: "12px" }}
							>
								<CheckCircle2 size={16} /> Технические параметры
							</h3>
							<div
								className="guest-portal-field"
								style={{
									background: "var(--paper)",
									padding: "16px",
									borderRadius: "8px",
									border: "1px solid var(--line)",
								}}
							>
								<div
									style={{
										display: "flex",
										justifyContent: "space-between",
										marginBottom: "8px",
									}}
								>
									<span className="guest-portal-field-label">Зуб (FDI)</span>
									<span className="guest-portal-field-value">
										{order.toothFdi || "—"}
									</span>
								</div>
								<div
									style={{
										display: "flex",
										justifyContent: "space-between",
										marginBottom: "8px",
									}}
								>
									<span className="guest-portal-field-label">Материал</span>
									{/*
										Неизвестный код печатается как есть, а не заменяется на «—»:
										прочерк скрыл бы от зуботехника то, что врач всё-таки указал.
									*/}
									<span className="guest-portal-field-value">
										{order.material
											? (MATERIAL_LABELS[order.material] ?? order.material)
											: "—"}
									</span>
								</div>
								<div
									style={{ display: "flex", justifyContent: "space-between" }}
								>
									<span className="guest-portal-field-label">Цвет (Vita)</span>
									<span className="guest-portal-field-value">
										{order.colorVita || "—"}
									</span>
								</div>
							</div>
						</div>
						<div>
							<h3
								className="guest-portal-field-label"
								style={{ marginBottom: "12px" }}
							>
								<AlignLeft size={16} /> Клинические заметки
							</h3>
							{/*
								Было три зашитых цвета (#fef9c3 / #854d0e / #fef08a). Страница
								следует теме посетителя, а не клиники (main.tsx), поэтому светлая
								плашка с коричневым текстом на тёмной подложке была бы ярким
								пятном. --amber-soft, --amber и --text-primary объявлены для всех
								трёх тем (styles/main.css, styles/premium.css).
							*/}
							<div
								style={{
									background: "var(--amber-soft)",
									padding: "16px",
									borderRadius: "8px",
									color: "var(--text-primary)",
									minHeight: "100px",
									border: "1px solid var(--amber)",
								}}
							>
								{order.clinicalNotes ? (
									<p
										style={{
											margin: 0,
											fontSize: "14px",
											whiteSpace: "pre-wrap",
										}}
									>
										{order.clinicalNotes}
									</p>
								) : (
									<p
										style={{
											margin: 0,
											fontSize: "14px",
											fontStyle: "italic",
											opacity: 0.8,
										}}
									>
										Врач не оставил комментариев.
									</p>
								)}
							</div>
						</div>
					</div>

					<div style={{ textAlign: "left", marginBottom: "32px" }}>
						<h3
							className="guest-portal-field-label"
							style={{ marginBottom: "12px" }}
						>
							<ImageIcon size={16} /> Приложенные снимки
						</h3>
						{order.attachedImageUrl ? (
							<img
								src={order.attachedImageUrl}
								alt="Клинический снимок"
								className="guest-portal-image"
							/>
						) : (
							<div
								style={{
									padding: "40px",
									border: "1px dashed var(--line)",
									borderRadius: "12px",
									textAlign: "center",
									color: "var(--text-secondary)",
								}}
							>
								<ImageIcon
									size={32}
									style={{ margin: "0 auto 8px", opacity: 0.5 }}
								/>
								Нет приложенных снимков
							</div>
						)}
					</div>

					<div className="guest-portal-actions">
						<h3
							style={{
								fontSize: "14px",
								fontWeight: "600",
								color: "var(--text-secondary)",
								marginBottom: "8px",
								textAlign: "left",
							}}
						>
							Управление статусом заказа
						</h3>
						<div style={{ display: "flex", gap: "12px" }}>
							<button
								type="button"
								onClick={() => updateStatus("in_progress")}
								disabled={isUpdating || order.status === "in_progress"}
								className={`secondary-button ${order.status === "in_progress" ? "active" : ""}`}
								style={{ flex: 1, padding: "12px" }}
							>
								Взять в работу
							</button>
							<button
								type="button"
								onClick={() => updateStatus("shipped")}
								disabled={isUpdating || order.status === "shipped"}
								className={`secondary-button ${order.status === "shipped" ? "active" : ""}`}
								style={{ flex: 1, padding: "12px" }}
							>
								Работа готова
							</button>
							<button
								type="button"
								onClick={() => updateStatus("refitting")}
								disabled={isUpdating || order.status === "refitting"}
								className={`secondary-button ${order.status === "refitting" ? "active" : ""}`}
								style={{ flex: 1, padding: "12px" }}
							>
								На переделке
							</button>
						</div>
						<p
							style={{
								fontSize: "11px",
								color: "var(--text-secondary)",
								marginTop: "8px",
							}}
						>
							* Изменение статуса автоматически уведомит врача в расписании
							клиники.
						</p>
					</div>
				</div>
			</div>
		</div>
	);
}
