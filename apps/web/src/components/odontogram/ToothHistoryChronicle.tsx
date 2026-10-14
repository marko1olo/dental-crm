import { Activity, Calendar, Camera, CheckCircle2, FileEdit, FileText, History, Image, Radio, X } from "lucide-react";
import React, { useEffect, useState, Suspense } from "react";

const DirectRvgCaptureModal = React.lazy(() =>
	import("../radiology/DirectRvgCaptureModal").then((m) => ({
		default: m.DirectRvgCaptureModal,
	})),
);

const DicomViewerModal = React.lazy(() =>
	import("../imaging/DicomViewerModal").then((m) => ({
		default: m.DicomViewerModal,
	})),
);
import { denteAdminSecretRequestHeaders } from "../../AppHelpers";
import { readDenteClinicToken, readDenteStaffToken } from "../../lib/safeLocalStorage";
import {
	actionFailureToast,
	type PanelSubject,
	panelStateText,
} from "../../lib/panelStateText";
import { listPatientMedia, type StoredMediaItem } from "../../services/media/offlineMediaVault";
import { isDemoPatientId, isDemoShowcaseMode } from "../../lib/demoMode";
import { logger } from "../../utils/logger";
import { showToast } from "../GlobalToast";
import { PanelLoadFailure } from "../PanelLoadFailure";
import {
	type ToothHistoryEvent,
	toothHistoryAuthorLabel,
	toothHistoryEventsFromResponseBody,
} from "./toothHistoryEvents";

/**
 * Что видит человек в трёх состояниях панели.
 *
 * Пустота обязана говорить, ОТКУДА здесь берутся записи: список формируется из
 * дневников приёма по этому зубу, позиций плана лечения и смен статуса
 * (apps/api/src/routes/toothHistory.ts). Без этого «История пуста» выглядит как
 * поломка программы.
 */
const HISTORY_SUBJECT: PanelSubject = {
	notLoadedTitle: "История зуба не прочитана",
	accusative: "историю зуба",
	emptyTitle: "По этому зубу записей пока нет",
	emptyHint:
		"Записи появятся сами: из дневника приёма с этим номером зуба, из позиций плана лечения на этот зуб и из смен его статуса на схеме.",
	failureConsequence:
		"Не считайте, что с зубом ничего не делали: история не прочитана. Прежнее лечение, план и смены статуса могут быть в карте — их просто не удалось загрузить.",
};

/** Как прочитана история: загрузка, отказ с кодом ответа, прочитано. */
type HistoryLoadState =
	| { phase: "loading" }
	| { phase: "ready" }
	/** `status` — код ответа сервера; null — до сервера не дошли вовсе. */
	| { phase: "failed"; status: number | null };

interface Props {
	patientId: string;
	toothNumber: number;
	onClose: () => void;
}

export function ToothHistoryChronicle({
	patientId,
	toothNumber,
	onClose,
}: Props) {
	const [events, setEvents] = useState<ToothHistoryEvent[]>([]);
	const [toothMedia, setToothMedia] = useState<StoredMediaItem[]>([]);
	const [load, setLoad] = useState<HistoryLoadState>({ phase: "loading" });
	/** Счётчик кнопки «Повторить»: меняется — запрос идёт заново. */
	const [reloadToken, setReloadToken] = useState(0);
	const [isDirectRvgOpen, setIsDirectRvgOpen] = useState(false);
	const [selectedViewerMedia, setSelectedViewerMedia] = useState<StoredMediaItem | null>(null);

	useEffect(() => {
		let active = true;
		/*
		 * БЫЛО: события прошлого зуба оставались в состоянии до успешного ответа
		 * по новому. При смене зуба или пациента (панель не размонтируется —
		 * OdontogramModule.tsx только меняет пропсы) под заголовком «История зуба
		 * 36» несколько секунд висели записи зуба 11, а если новый запрос падал,
		 * они висели там навсегда. Врач читал чужое лечение как лечение этого зуба.
		 */
		setEvents([]);
		setToothMedia([]);
		setLoad({ phase: "loading" });

		// 1. Загрузка медиа-снимков зуба: локальные из Offline Media Vault + серверные из PostgreSQL 18
		const clinicToken = readDenteClinicToken();
		const staffToken = readDenteStaffToken();
		const headers: Record<string, string> = {
			...denteAdminSecretRequestHeaders(),
			...(clinicToken ? { "x-dente-clinic-token": clinicToken } : {}),
			...(staffToken ? { "x-dente-staff-token": staffToken } : {}),
		};

		Promise.all([
			listPatientMedia(patientId, toothNumber).catch((err) => {
				logger.error("[tooth history] Ошибка чтения снимков из offlineMediaVault", err);
				return [] as StoredMediaItem[];
			}),
			fetch(`/api/imaging/studies?patientId=${encodeURIComponent(patientId)}`, { headers })
				.then(async (res) => {
					if (!res.ok) return [];
					const studies = await res.json();
					if (!Array.isArray(studies)) return [];
					const toothStr = String(toothNumber).trim();
					return studies
						.filter((s: any) => String(s.toothCode ?? "").trim() === toothStr)
						.map((s: any): StoredMediaItem => ({
							mediaId: s.id,
							patientId: s.patientId,
							visitId: s.visitId,
							toothNumber: toothNumber,
							photoType:
								s.kind === "rvg" || s.kind === "periapical"
									? "periapical_xray"
									: s.kind === "cbct"
										? "computed_tomography_slice"
										: s.kind === "panoramic" || s.kind === "opg"
											? "panoramic_xray"
											: "generic_clinical_media",
							capturedAt: s.capturedAt || new Date().toISOString(),
							capturedAtMs: s.capturedAt ? new Date(s.capturedAt).getTime() : Date.now(),
							mimeType: "image/jpeg",
							fileName: s.title || `Снимок зуба #${toothNumber}`,
							sizeBytes: s.fileSizeBytes || 0,
							thumbnailWebpDataUrl: s.previewUrl || `/api/imaging/studies/${s.id}/file`,
							originalBlobKey: s.id,
							syncStatus: "synced",
							syncRetries: 0,
							remoteUrl: `/api/imaging/studies/${s.id}/file`,
						}));
				})
				.catch((err) => {
					logger.warn("[tooth history] Ошибка чтения снимков из imaging/studies", err);
					return [] as StoredMediaItem[];
				}),
			fetch(`/api/xray/scans?patientId=${encodeURIComponent(patientId)}`, { headers })
				.then(async (res) => {
					if (!res.ok) return [];
					const scans = await res.json();
					if (!Array.isArray(scans)) return [];
					const toothStr = String(toothNumber).trim();
					return scans
						.filter((s: any) => String(s.toothCode ?? "").trim() === toothStr)
						.map((s: any): StoredMediaItem => ({
							mediaId: s.id,
							patientId: s.patientId,
							visitId: s.visitId,
							toothNumber: toothNumber,
							photoType: "periapical_xray",
							capturedAt: s.capturedAt || s.createdAt || new Date().toISOString(),
							capturedAtMs: s.capturedAt ? new Date(s.capturedAt).getTime() : Date.now(),
							mimeType: s.mimeType || "image/jpeg",
							fileName: s.originalFilename || `Визиограф RVG (Зуб #${toothNumber})`,
							sizeBytes: s.fileSizeBytes || 0,
							thumbnailWebpDataUrl: s.imageDataUri || s.fileUrl || `/api/xray/scans/${s.id}/file`,
							originalBlobKey: s.id,
							syncStatus: "synced",
							syncRetries: 0,
							remoteUrl: s.fileUrl || `/api/xray/scans/${s.id}/file`,
						}));
				})
				.catch((err) => {
					logger.warn("[tooth history] Ошибка чтения снимков из xray/scans", err);
					return [] as StoredMediaItem[];
				}),
		]).then(([vaultItems, dbItems, xrayItems]) => {
			if (!active) return;
			const seen = new Set<string>();
			const merged: StoredMediaItem[] = [];
			for (const item of [...vaultItems, ...dbItems, ...xrayItems]) {
				if (!seen.has(item.mediaId)) {
					seen.add(item.mediaId);
					merged.push(item);
				}
			}
			setToothMedia(merged);
		});

		// 2. Загрузка хроники клинических событий
		const fetchHistory = async () => {
			let status: number | null = null;
			try {
				const res = await fetch(
					`/api/odontogram/tooth-history/${patientId}/${toothNumber}`,
					{
						headers: denteAdminSecretRequestHeaders(),
					},
				);
				status = res.status;
				// Тело читается один раз строкой: на пустом теле res.json() бросает
				// исключение, а прежний код превращал и отказ, и испорченный ответ в
				// ту же пустую историю.
				const rawBody = await res.text();
				if (!res.ok) {
					// БЫЛО: `if (res.ok)` без ветки else — 403, 404 и 500 молча
					// оставляли пустой список, и панель печатала «История пуста».
					logger.error(`[tooth history] ${status} ${rawBody.slice(0, 300)}`);
					if (active) setLoad({ phase: "failed", status });
					return;
				}
				const parsed = toothHistoryEventsFromResponseBody(rawBody);
				if (!active) return;
				if (parsed === null) {
					// Успешный код и не тот ответ — это тоже непрочитанная история.
					logger.error(`[tooth history] ${status}: ответ не по контракту`);
					setLoad({ phase: "failed", status });
					return;
				}
				setEvents(parsed);
				setLoad({ phase: "ready" });
			} catch (e) {
				if (!isDemoShowcaseMode() && !isDemoPatientId(patientId)) {
					showToast(
						actionFailureToast(
							"Ошибка выполнения операции",
							(e as { status?: number })?.status ?? null,
						),
						"error",
					);
				}
				logger.error("[tooth history] запрос не выполнен", e);
				// До сервера не дошли: кода ответа нет, и придумывать его нельзя.
				if (active) setLoad({ phase: "failed", status });
			}
		};
		void fetchHistory();

		const handleScanBound = (e: Event) => {
			const custom = e as CustomEvent<{ patientId?: string; toothCode?: string }>;
			if (!custom.detail?.toothCode) return;
			if (String(custom.detail.toothCode).trim() === String(toothNumber).trim()) {
				setReloadToken((t) => t + 1);
			}
		};
		window.addEventListener("dente-tooth-scan-bound", handleScanBound);

		return () => {
			active = false;
			window.removeEventListener("dente-tooth-scan-bound", handleScanBound);
		};
	}, [patientId, toothNumber, reloadToken]);

	return (
		<div className="history-panel">
			<div className="history-header">
				<div className="history-title">
					<History className="w-5 h-5 text-indigo-500" />
					<h3>История зуба {toothNumber}</h3>
				</div>
				<div className="flex items-center gap-2">
					<button
						type="button"
						data-testid="btn-chronicle-direct-rvg"
						onClick={() => setIsDirectRvgOpen(true)}
						className="secondary-button min-h-[28px] h-7 px-2.5 text-xs font-semibold rounded-lg inline-flex items-center gap-1.5 cursor-pointer text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/10"
						title={`Сделать снимок RVG датчиком для зуба #${toothNumber}`}
					>
						<Radio className="w-3.5 h-3.5 text-emerald-500" />
						<span>Снимок RVG (#{toothNumber})</span>
					</button>
					<button type="button" onClick={onClose} className="history-close-btn" title="Закрыть историю">
						<X className="w-5 h-5" />
					</button>
				</div>
			</div>

			<div className="history-body">
				{/* ── Офлайн-снимки зуба (WebP 200x200) из offlineMediaVault ── */}
				{toothMedia.length > 0 && (
					<section
						aria-label={`Снимки зуба ${toothNumber}`}
						className="tooth-media-section mb-4 p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-800/80 backdrop-blur-xs"
					>
						<div className="flex items-center gap-2 mb-2">
							<Camera className="w-4 h-4 text-[var(--teal)] shrink-0" />
							<h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">
								Снимки зуба ({toothMedia.length})
							</h4>
						</div>
						<div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
							{toothMedia.map((m) => (
								<div
									key={m.mediaId}
									onClick={() => setSelectedViewerMedia(m)}
									className="group relative rounded-lg overflow-hidden border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 shadow-xs transition-transform hover:scale-[1.02] cursor-pointer hover:border-[var(--teal,#0d9488)]"
									title="Открыть снимок в RVG / DICOM просмотрщике"
									data-testid={`tooth-media-card-${m.mediaId}`}
								>
									<img
										src={m.thumbnailWebpDataUrl}
										alt={`Снимок зуба ${toothNumber} (${m.photoType})`}
										className="w-full h-[120px] object-cover"
										loading="lazy"
										decoding="async"
									/>
									<div className="p-1.5 text-[11px] bg-white/95 dark:bg-slate-900/95 border-t border-slate-200 dark:border-slate-700">
										<div className="font-semibold text-slate-800 dark:text-slate-100 truncate">
											{m.photoType === "intraoral_photo"
												? "Внутриротовое фото"
												: m.photoType === "periapical_xray"
													? "Прицельный снимок"
													: m.photoType === "computed_tomography_slice"
														? "КЛКТ срез"
														: m.photoType === "panoramic_xray"
															? "ОПТГ панорама"
															: "Медиафайл"}
										</div>
										<div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
											<span>
												{new Intl.DateTimeFormat("ru-RU", {
													day: "2-digit",
													month: "2-digit",
													hour: "2-digit",
													minute: "2-digit",
													timeZone: "Europe/Samara",
												}).format(new Date(m.capturedAt))}
											</span>
											<span
												className={`px-1 py-0.2 rounded text-[9px] font-medium ${
													m.syncStatus === "synced"
														? "bg-[var(--ok-bg,rgba(16,185,129,0.1))] text-[var(--ok-fg,#10b981)]"
														: "bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300"
												}`}
											>
												{m.syncStatus === "synced" ? "Синхронизировано" : "Локально (Vault)"}
											</span>
										</div>
									</div>
								</div>
							))}
						</div>
					</section>
				)}

				{load.phase === "loading" ? (
					<div className="history-loading">
						<div className="spinner" />
						{/* Крутящийся значок без слов не говорит, чего ждать. */}
						<div className="history-loading-text">
							{panelStateText(HISTORY_SUBJECT, { phase: "loading" }).title}
						</div>
					</div>
				) : load.phase === "failed" ? (
					/* Отказ чтения — отдельное состояние, а не «История пуста». */
					<PanelLoadFailure
						subject={HISTORY_SUBJECT}
						status={load.status}
						onRetry={() => setReloadToken((token) => token + 1)}
					/>
				) : events.length === 0 ? (
					<div className="history-empty">
						{/* Честная пустота: сервер ответил, записей действительно нет. */}
						<div className="history-empty-title">
							{panelStateText(HISTORY_SUBJECT, { phase: "empty" }).title}
						</div>
						<div className="history-empty-hint">
							{panelStateText(HISTORY_SUBJECT, { phase: "empty" }).hint}
						</div>
					</div>
				) : (
					<div className="history-timeline">
						{events
							.map((evt, idx) => ({
								evt,
								keyId: `evt-${evt.kind}-${evt.dateIso ?? "nodate"}-${evt.description ?? ""}-${idx}`,
							}))
							.map(({ evt, keyId }) => (
								<div key={keyId} className="timeline-item">
									<div className="timeline-icon">
										{evt.kind === "diary" ? (
											<FileText className="w-4 h-4 text-[var(--ok-fg,#10b981)]" />
										) : evt.kind === "plan" ? (
											<Calendar className="w-4 h-4 text-[var(--brand-500,#3b82f6)]" />
										) : evt.kind === "state_change" ? (
											<Activity className="w-4 h-4 text-amber-500" />
										) : evt.kind === "treatment_procedure" ? (
											<CheckCircle2 className="w-4 h-4 text-emerald-500" />
										) : evt.kind === "diary_revision" ? (
											<FileEdit className="w-4 h-4 text-indigo-500" />
										) : evt.kind === "radiology_scan" ? (
											<Camera className="w-4 h-4 text-teal-500" />
										) : (
											/* Вид события неизвестен. Значок смены статуса здесь стоял
										   как «иначе», то есть незнакомое событие выдавалось за
										   смену статуса зуба. Нейтральный значок ничего не
										   утверждает. */
											<History className="w-4 h-4 text-slate-400" />
										)}
									</div>
									<div className="timeline-content">
										<div className="timeline-date">
											{/* БЫЛО: new Date(evt.date).toLocaleDateString() — на
										    нечитаемой дате браузер печатал латиницей «Invalid
										    Date», а на дате без года читалось непонятно что.
										    Год полный: в карте важно, 2016-й это или 2026-й.
										    Часовой пояс тот же, что в AppHelpers.tsx, иначе одна
										    и та же запись показывала бы разные дни на разных
										    экранах. */}
											{evt.dateIso === null
												? "Дата не указана"
												: new Intl.DateTimeFormat("ru-RU", {
														day: "2-digit",
														month: "2-digit",
														year: "numeric",
														timeZone: "Europe/Samara",
													}).format(new Date(evt.dateIso))}
										</div>
										<div className="timeline-desc">
											{/* Описание на сервере — treatmentDescription || anamnesis,
										    и оба бывают пустыми. Пустая строка выглядела как
										    пропавшая запись. */}
											{evt.description ?? "Описание не заполнено"}
										</div>
										{/* БЫЛО: `Автор: {evt.authorId.substring(0, 8)}...` — ФИО врача
									    обрезалось до восьми знаков («Автор: Иванова ...»), слово
									    "System" печаталось латиницей, а «Не указан» превращалось
									    в обрубок «Не указа...». Кто лечил зуб — не мелочь, и
									    строка автора теперь есть у каждой записи, а не только
									    когда поле непустое. */}
										<div className="timeline-author">
											{toothHistoryAuthorLabel(evt.author)}
										</div>
									</div>
								</div>
							))}
					</div>
				)}
			</div>

			{isDirectRvgOpen && (
				<Suspense fallback={null}>
					<DirectRvgCaptureModal
						isOpen={isDirectRvgOpen}
						onClose={() => setIsDirectRvgOpen(false)}
						selectedTeeth={[toothNumber]}
						onCaptureComplete={() => {
							setIsDirectRvgOpen(false);
							setReloadToken((t) => t + 1);
						}}
					/>
				</Suspense>
			)}

			{selectedViewerMedia && (
				<Suspense fallback={null}>
					<DicomViewerModal
						isOpen={Boolean(selectedViewerMedia)}
						onClose={() => setSelectedViewerMedia(null)}
						imageSrc={selectedViewerMedia.thumbnailWebpDataUrl || (selectedViewerMedia as any).encryptedPayloadRef || ""}
						toothFdiCode={String(toothNumber)}
						title={`Снимок зуба #${toothNumber}`}
					/>
				</Suspense>
			)}
		</div>
	);
}
