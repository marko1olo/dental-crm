import {
	AlignLeft,
	Beaker,
	Box,
	CheckCircle2,
	Clock,
	Download,
	ExternalLink,
	FileText,
	Image as ImageIcon,
	PackageCheck,
	Printer,
	QrCode,
	RefreshCcw,
	Truck,
	User,
} from "lucide-react";
import { useEffect, useState } from "react";
import { showToast } from "./components/GlobalToast";
import { actionFailureToast } from "./lib/panelStateText";
import {
	generateBarcodeSvg,
	generateQrCodeSvg,
	formatGostOrderNumber,
} from "./components/lab/labMath";
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

function is3DScanFile(url: string): boolean {
	return /\.(stl|ply|obj|3mf)($|[?#])/i.test(url);
}

function isImageFile(url: string): boolean {
	return (
		/\.(jpe?g|png|webp|gif|svg)($|[?#])/i.test(url) ||
		url.startsWith("data:image/")
	);
}

function getAttachmentFileName(url: string): string {
	try {
		const parsed = new URL(url, window.location.origin);
		const lastSegment = parsed.pathname.split("/").filter(Boolean).pop();
		if (lastSegment) return decodeURIComponent(lastSegment);
	} catch {
		// fallback
	}
	const clean = url.split("?")[0]?.split("#")[0] ?? "";
	const last = clean.split("/").pop();
	return last || "3d_scan.stl";
}

export function GuestLabPortal({ token }: GuestLabPortalProps) {
	const [order, setOrder] = useState<LabOrderData | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [isUpdating, setIsUpdating] = useState(false);
	const [showCourierWaybill, setShowCourierWaybill] = useState(false);

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
				showToast(
					actionFailureToast(
						"Ошибка выполнения операции",
						(e as { status?: number })?.status ?? null,
					),
					"error",
				);
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

	const updateStatus = async (newStatus: string, comments?: string) => {
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
					body: JSON.stringify({
						status: newStatus,
						...(comments ? { labComments: comments } : {}),
					}),
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
			if (newStatus === "shipped") {
				setShowCourierWaybill(true);
				showToast(
					"Статус заказа: отправлен курьером в клинику. Накладная готова к печати",
					"success",
				);
			} else if (newStatus === "in_progress") {
				showToast(
					"Заказ взят в работу зуботехнической лабораторией",
					"success",
				);
			} else if (newStatus === "refitting") {
				showToast(
					"Заказ переведён в статус «На переделке / доработке»",
					"info",
				);
			} else {
				showToast(
					"Статус заказа сохранён, врач увидит его в расписании клиники",
					"success",
				);
			}
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
				return <Truck size={20} />;
			case "ready":
				return <CheckCircle2 size={20} />;
			case "received":
			case "completed":
				return <PackageCheck size={20} />;
			default:
				return <Clock size={20} />;
		}
	};

	const statusLabel =
		{
			draft: "Черновик",
			sent: "Отправлен в лабораторию",
			in_progress: "В работе у техника",
			ready: "Работа готова",
			shipped: "Отправлено курьером в клинику",
			received: "Получен клиникой",
			refitting: "На переделке",
			completed: "Завершен / Установлен",
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
										alignItems: "center",
										gap: "12px",
										marginBottom: "8px",
									}}
								>
									<span className="guest-portal-field-label">Зуб (FDI):</span>
									<span className="guest-portal-field-value">
										{order.toothFdi || "—"}
									</span>
								</div>
								<div
									style={{
										display: "flex",
										justifyContent: "space-between",
										alignItems: "center",
										gap: "12px",
										marginBottom: "8px",
									}}
								>
									<span className="guest-portal-field-label">Материал:</span>
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
									style={{
										display: "flex",
										justifyContent: "space-between",
										alignItems: "center",
										gap: "12px",
									}}
								>
									<span className="guest-portal-field-label">Цвет (Vita):</span>
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
							{order.attachedImageUrl && is3DScanFile(order.attachedImageUrl) ? (
								<>
									<Box size={16} /> Приложенный 3D-скан (STL/PLY)
								</>
							) : (
								<>
									<ImageIcon size={16} /> Приложенные материалы и снимки
								</>
							)}
						</h3>
						{order.attachedImageUrl ? (
							is3DScanFile(order.attachedImageUrl) || !isImageFile(order.attachedImageUrl) ? (
								<div className="guest-portal-scan-card">
									<div className="guest-portal-scan-header">
										<div className="guest-portal-scan-icon-wrapper">
											<Box size={24} />
										</div>
										<div className="guest-portal-scan-meta">
											<div
												className="guest-portal-scan-filename"
												title={getAttachmentFileName(order.attachedImageUrl)}
											>
												{getAttachmentFileName(order.attachedImageUrl)}
											</div>
											<div className="guest-portal-scan-subtext">
												<span className="guest-portal-scan-badge">
													{order.attachedImageUrl.toLowerCase().includes(".ply")
														? "PLY 3D SCAN"
														: "STL 3D SCAN"}
												</span>
												<span>Цифровой слепок / 3D-модель челюсти</span>
											</div>
										</div>
									</div>

									<div className="guest-portal-scan-actions">
										<a
											href={order.attachedImageUrl}
											download={getAttachmentFileName(order.attachedImageUrl)}
											target="_blank"
											rel="noopener noreferrer"
											className="guest-portal-download-btn"
										>
											<Download size={16} />
											Скачать файл скана (STL/PLY)
										</a>
										<a
											href={order.attachedImageUrl}
											target="_blank"
											rel="noopener noreferrer"
											className="guest-portal-open-link-btn"
										>
											<ExternalLink size={14} />
											Открыть ссылку
										</a>
									</div>
								</div>
							) : (
								<div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
									<img
										src={order.attachedImageUrl}
										alt="Клинический снимок"
										loading="lazy"
										decoding="async"
										className="guest-portal-image"
									/>
									<div style={{ display: "flex", justifyContent: "flex-end" }}>
										<a
											href={order.attachedImageUrl}
											download={getAttachmentFileName(order.attachedImageUrl)}
											target="_blank"
											rel="noopener noreferrer"
											className="guest-portal-download-btn"
											style={{ padding: "7px 14px", fontSize: "12px" }}
										>
											<Download size={14} />
											Скачать снимок
										</a>
									</div>
								</div>
							)
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
								Нет приложенных снимков и 3D-сканов
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
						<div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginBottom: "16px" }}>
							<button
								type="button"
								data-testid="btn-status-in-progress"
								onClick={() => updateStatus("in_progress")}
								disabled={isUpdating || order.status === "in_progress"}
								className={`secondary-button ${order.status === "in_progress" ? "active" : ""}`}
								style={{ flex: "1 1 140px", minHeight: "44px", padding: "10px 14px", fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}
							>
								<Clock size={16} />
								<span>Взять в работу</span>
							</button>
							<button
								type="button"
								data-testid="btn-status-ready"
								onClick={() => updateStatus("shipped", "Работа готова")}
								disabled={isUpdating}
								className="secondary-button"
								style={{ flex: "1 1 140px", minHeight: "44px", padding: "10px 14px", fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}
							>
								<CheckCircle2 size={16} />
								<span>Работа готова</span>
							</button>
							<button
								type="button"
								data-testid="btn-status-shipped"
								onClick={() => updateStatus("shipped", "Отправлено курьером в клинику")}
								disabled={isUpdating || order.status === "shipped"}
								className={`secondary-button ${order.status === "shipped" ? "active" : ""}`}
								style={{ flex: "1 1 140px", minHeight: "44px", padding: "10px 14px", fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}
							>
								<Truck size={16} />
								<span>Отправлено курьером</span>
							</button>
							<button
								type="button"
								data-testid="btn-status-refitting"
								onClick={() => updateStatus("refitting", "На переделке")}
								disabled={isUpdating || order.status === "refitting"}
								className={`secondary-button ${order.status === "refitting" ? "active" : ""}`}
								style={{ flex: "1 1 140px", minHeight: "44px", padding: "10px 14px", fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}
							>
								<RefreshCcw size={16} />
								<span>На переделке</span>
							</button>
						</div>

						{/* Переключатель и печать курьерской накладной (Мандат 8e, 8k) */}
						<div style={{ marginBottom: "16px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px" }}>
							<button
								type="button"
								data-testid="toggle-courier-waybill-btn"
								onClick={() => setShowCourierWaybill((prev) => !prev)}
								className="secondary-button"
								style={{
									minHeight: "40px",
									padding: "8px 14px",
									display: "flex",
									alignItems: "center",
									gap: "8px",
									fontWeight: 600,
									fontSize: "13px",
									background: showCourierWaybill ? "var(--teal-soft)" : undefined,
									borderColor: showCourierWaybill ? "var(--teal)" : undefined,
									color: showCourierWaybill ? "var(--teal)" : undefined,
								}}
							>
								<FileText size={16} />
								<span>{showCourierWaybill ? "Скрыть накладную курьера" : "Накладная курьеру (QR + Штрихкод)"}</span>
							</button>
							{showCourierWaybill && (
								<button
									type="button"
									data-testid="courier-waybill-print-btn"
									onClick={() => window.print()}
									className="primary-button"
									style={{
										minHeight: "40px",
										padding: "8px 16px",
										display: "flex",
										alignItems: "center",
										gap: "8px",
										fontWeight: 600,
										fontSize: "13px",
									}}
								>
									<Printer size={16} />
									<span>Распечатать накладную</span>
								</button>
							)}
						</div>

						{/* Карточка курьерской накладной с QR и Штрихкодом Code 128 */}
						{showCourierWaybill && (
							<div
								data-testid="courier-waybill-card"
								style={{
									border: "2px dashed var(--teal)",
									borderRadius: "12px",
									padding: "20px",
									background: "var(--paper)",
									marginBottom: "16px",
									textAlign: "left",
								}}
							>
								<div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px", borderBottom: "1px solid var(--line)", paddingBottom: "12px", flexWrap: "wrap", gap: "10px" }}>
									<div>
										<div style={{ display: "flex", alignItems: "center", gap: "6px", color: "var(--teal)", fontWeight: 700, fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
											<Truck size={16} />
											<span>Курьерская накладная передачи в клинику</span>
										</div>
										<h4 style={{ margin: "4px 0 0 0", fontSize: "18px", fontWeight: 800 }}>
											{formatGostOrderNumber(order.id)}
										</h4>
										<p style={{ margin: "2px 0 0 0", fontSize: "12px", color: "var(--text-secondary)" }}>
											Заказ № {(order.id ?? "").substring(0, 8).toUpperCase()} · Пациент: <strong>{order.patientFullName || "Пациент не указан"}</strong>
										</p>
									</div>
									<div style={{ textAlign: "right" }}>
										<span style={{ display: "inline-block", padding: "4px 8px", borderRadius: "6px", background: "var(--teal-soft)", color: "var(--teal)", fontWeight: 700, fontSize: "11px" }}>
											{statusLabel}
										</span>
									</div>
								</div>

								<div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px", alignItems: "center", marginBottom: "16px" }}>
									<div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
										<div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
											Штрихкод для сканера регистратуры (Code 128):
										</div>
										<div
											data-testid="courier-waybill-barcode"
											style={{
												color: "var(--ink)",
												background: "#ffffff",
												padding: "6px 10px",
												borderRadius: "6px",
												border: "1px solid var(--line)",
												display: "inline-block",
											}}
											dangerouslySetInnerHTML={{
												__html: generateBarcodeSvg(formatGostOrderNumber(order.id)),
											}}
										/>
									</div>

									<div style={{ display: "flex", flexDirection: "column", gap: "6px", alignItems: "flex-start" }}>
										<div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
											QR-код для быстрой отметки курьера/приёмки:
										</div>
										<div
											data-testid="courier-waybill-qr"
											style={{
												color: "var(--ink)",
												background: "#ffffff",
												padding: "6px",
												borderRadius: "6px",
												border: "1px solid var(--line)",
												display: "inline-block",
											}}
											dangerouslySetInnerHTML={{
												__html: generateQrCodeSvg(
													`DENTE-ZTL-ORDER:${order.id}:${order.patientFullName || ""}:${order.toothFdi || ""}`,
												),
											}}
										/>
									</div>
								</div>

								<div style={{ fontSize: "12px", color: "var(--text-secondary)", borderTop: "1px solid var(--line)", paddingTop: "10px", display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "8px" }}>
									<div>Зуб: <strong>{order.toothFdi || "—"}</strong> · Материал: <strong>{order.material ? (MATERIAL_LABELS[order.material] ?? order.material) : "—"}</strong> · Цвет: <strong>{order.colorVita || "—"}</strong></div>
									<div>Дата создания: {order.createdAt ? new Date(order.createdAt).toLocaleDateString("ru-RU") : "—"}</div>
								</div>
							</div>
						)}

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
