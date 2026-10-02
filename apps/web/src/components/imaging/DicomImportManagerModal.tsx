import React, { useState, useEffect, useCallback } from "react";
import {
	X,
	FolderSearch,
	RefreshCw,
	CheckCircle2,
	AlertTriangle,
	Play,
	Square,
	ChevronRight,
	UserCheck,
	Folder,
	Layers,
	FileText,
	HardDrive,
	Clock,
	Sliders,
	Trash2,
} from "lucide-react";
import { showToast } from "../GlobalToast.js";

export interface PendingStudyItem {
	id: string;
	title: string;
	patientId: string | null;
	patientFullName: string | null;
	kind: string;
	modality: string | null;
	capturedAt: string;
	storagePath: string | null;
	sliceCount: number | null;
	dimensions: string | null;
	voxelSpacing: string | null;
	fileSizeBytes: number | null;
	bindingStatus: string;
	bindingConfidence: number;
	dicomPatientName: string | null;
	dicomPatientId: string | null;
	dicomBirthDate: string | null;
	aiSummary: string | null;
}

export interface DicomImportManagerModalProps {
	isOpen: boolean;
	onClose: () => void;
	onStudyBound?: () => void;
}

export const DicomImportManagerModal: React.FC<DicomImportManagerModalProps> = ({
	isOpen,
	onClose,
	onStudyBound,
}) => {
	const [activeTab, setActiveTab] = useState<"pending" | "auto" | "unassigned" | "settings">("pending");
	const [studies, setStudies] = useState<PendingStudyItem[]>([]);
	const [daemonStatus, setDaemonStatus] = useState<any>(null);
	const [isLoading, setIsLoading] = useState<boolean>(true);
	const [isScanning, setIsScanning] = useState<boolean>(false);
	const [actionPendingId, setActionPendingId] = useState<string | null>(null);

	const loadData = useCallback(async () => {
		try {
			setIsLoading(true);
			const [studiesRes, statusRes] = await Promise.all([
				fetch("/api/imaging/daemon/pending"),
				fetch("/api/imaging/daemon/status"),
			]);

			if (studiesRes.ok) {
				const sData = await studiesRes.json();
				if (sData.success && Array.isArray(sData.pendingStudies)) {
					setStudies(sData.pendingStudies);
				}
			}

			if (statusRes.ok) {
				const stData = await statusRes.json();
				if (stData.success && stData.status) {
					setDaemonStatus(stData.status);
				}
			}
		} catch (e) {
			showToast("Не удалось загрузить статус демона КТ", "error");
		} finally {
			setIsLoading(false);
		}
	}, []);

	useEffect(() => {
		if (isOpen) {
			void loadData();
		}
	}, [isOpen, loadData]);

	if (!isOpen) return null;

	const handleScanNow = async () => {
		try {
			setIsScanning(true);
			const res = await fetch("/api/imaging/daemon/scan-now", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
			});
			if (!res.ok) throw new Error("HTTP error " + res.status);
			const data = await res.json();
			if (data.success) {
				showToast(data.message || "Сканирование завершено", "success");
				await loadData();
			} else {
				showToast(data.message || "Ошибка сканирования", "error");
			}
		} catch {
			showToast("Сетевой сбой при запуске сканирования", "error");
		} finally {
			setIsScanning(false);
		}
	};

	const handleBindPatient = async (studyId: string, patientId: string) => {
		try {
			setActionPendingId(studyId);
			const res = await fetch("/api/imaging/daemon/bind-patient", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ studyId, patientId }),
			});
			if (!res.ok) throw new Error("HTTP error " + res.status);
			const data = await res.json();
			if (data.success) {
				showToast(data.message || "Исследование КТ привязано к пациенту", "success");
				setStudies((prev) => prev.filter((s) => s.id !== studyId));
				onStudyBound?.();
			} else {
				showToast(data.message || "Не удалось привязать КТ", "error");
			}
		} catch {
			showToast("Сбой запроса привязки", "error");
		} finally {
			setActionPendingId(null);
		}
	};

	const handleDismiss = async (studyId: string) => {
		try {
			setActionPendingId(studyId);
			const res = await fetch("/api/imaging/daemon/dismiss", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ studyId }),
			});
			if (!res.ok) throw new Error("HTTP error " + res.status);
			const data = await res.json();
			if (data.success) {
				showToast("Снимок скрыт из очереди", "info");
				setStudies((prev) => prev.filter((s) => s.id !== studyId));
			}
		} catch {
			showToast("Не удалось скрыть снимок", "error");
		} finally {
			setActionPendingId(null);
		}
	};

	const pendingStudies = studies.filter((s) => s.bindingStatus === "pending_review");
	const unassignedStudies = studies.filter((s) => s.bindingStatus === "unassigned");
	const autoBoundCount = daemonStatus?.autoBoundCount ?? 0;

	return (
		<div
			className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
			onClick={(e) => {
				if (e.target === e.currentTarget) onClose();
			}}
		>
			<div
				className="relative flex flex-col w-full max-w-4xl max-h-[85vh] rounded-2xl shadow-2xl overflow-hidden border"
				style={{
					background: "var(--paper, #ffffff)",
					borderColor: "var(--line, #e2e8f0)",
					color: "var(--ink, #0f172a)",
				}}
			>
				{/* ─── Шапка модального окна ────────────────────────────────── */}
				<div
					className="flex items-center justify-between px-6 py-4 border-b select-none"
					style={{
						background: "var(--paper, #ffffff)",
						borderColor: "var(--line, #e2e8f0)",
					}}
				>
					<div className="flex items-center gap-3">
						<div
							className="p-2 rounded-xl"
							style={{
								background: "var(--accent-soft, rgba(13, 148, 136, 0.12))",
								color: "var(--accent, #0d9488)",
							}}
						>
							<FolderSearch className="w-5 h-5" />
						</div>
						<div>
							<h2 className="text-base font-bold tracking-tight">
								Автодетект КТ и очередей томографов
							</h2>
							<p className="text-xs opacity-65">
								Мониторинг папок Vatech, Planmeca, Sidexis, KaVo, Morita со стохастической привязкой к ЭМК 043/у
							</p>
						</div>
					</div>

					<div className="flex items-center gap-2">
						<button
							type="button"
							onClick={handleScanNow}
							disabled={isScanning}
							className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer border transition-colors disabled:opacity-50"
							style={{
								background: "var(--accent, #0d9488)",
								borderColor: "var(--accent, #0d9488)",
								color: "#ffffff",
							}}
						>
							<RefreshCw className={`w-3.5 h-3.5 ${isScanning ? "animate-spin" : ""}`} />
							<span>{isScanning ? "Сканирование..." : "Сканировать сейчас"}</span>
						</button>

						<button
							type="button"
							onClick={onClose}
							className="p-2 rounded-lg opacity-70 hover:opacity-100 transition-opacity cursor-pointer border border-transparent hover:border-gray-200"
							aria-label="Закрыть"
						>
							<X className="w-4 h-4" />
						</button>
					</div>
				</div>

				{/* ─── Вкладки ─────────────────────────────────────────────── */}
				<div
					className="flex items-center gap-2 px-6 pt-3 border-b text-xs font-medium"
					style={{ borderColor: "var(--line, #e2e8f0)" }}
				>
					<button
						type="button"
						onClick={() => setActiveTab("pending")}
						className={`pb-2.5 px-1 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
							activeTab === "pending"
								? "border-amber-500 font-bold text-amber-600 dark:text-amber-400"
								: "border-transparent opacity-70 hover:opacity-100"
						}`}
					>
						<span>Требуют подтверждения (60–85%)</span>
						{pendingStudies.length > 0 && (
							<span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-500 text-white">
								{pendingStudies.length}
							</span>
						)}
					</button>

					<button
						type="button"
						onClick={() => setActiveTab("unassigned")}
						className={`pb-2.5 px-1 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
							activeTab === "unassigned"
								? "border-teal-500 font-bold text-teal-600 dark:text-teal-400"
								: "border-transparent opacity-70 hover:opacity-100"
						}`}
					>
						<span>Нераспознанные (&lt;60%)</span>
						{unassignedStudies.length > 0 && (
							<span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-gray-500 text-white">
								{unassignedStudies.length}
							</span>
						)}
					</button>

					<button
						type="button"
						onClick={() => setActiveTab("settings")}
						className={`pb-2.5 px-1 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
							activeTab === "settings"
								? "border-teal-500 font-bold text-teal-600 dark:text-teal-400"
								: "border-transparent opacity-70 hover:opacity-100"
						}`}
					>
						<Sliders className="w-3.5 h-3.5" />
						<span>Папки и демон</span>
					</button>
				</div>

				{/* ─── Содержимое вкладки ──────────────────────────────────── */}
				<div className="flex-1 overflow-y-auto p-6 space-y-4">
					{isLoading ? (
						<div className="flex flex-col items-center justify-center py-12 space-y-2 opacity-60">
							<RefreshCw className="w-6 h-6 animate-spin" />
							<span className="text-xs">Загрузка очереди КТ...</span>
						</div>
					) : activeTab === "pending" ? (
						pendingStudies.length === 0 ? (
							<div className="flex flex-col items-center justify-center py-12 text-center opacity-60 space-y-2">
								<CheckCircle2 className="w-10 h-10 text-teal-600" />
								<p className="text-sm font-semibold">Все снимки подтверждены</p>
								<p className="text-xs max-w-sm">
									Новые срезы КТ из папок томографов появятся здесь автоматически при экспорте снимка.
								</p>
							</div>
						) : (
							<div className="space-y-3">
								{pendingStudies.map((study) => (
									<div
										key={study.id}
										className="p-4 rounded-xl border flex flex-col md:flex-row items-start md:items-center justify-between gap-4 transition-all"
										style={{
											background: "var(--paper, #ffffff)",
											borderColor: "var(--line, #e2e8f0)",
										}}
									>
										<div className="space-y-1.5">
											<div className="flex items-center gap-2 flex-wrap">
												<span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
													Совпадение: {study.bindingConfidence}%
												</span>
												<span className="font-semibold text-sm">
													{study.title}
												</span>
												{study.sliceCount && (
													<span className="text-xs opacity-70 flex items-center gap-1">
														<Layers className="w-3.5 h-3.5" />
														{study.sliceCount} срезов
													</span>
												)}
											</div>

											<div className="text-xs space-y-0.5 opacity-80">
												{study.patientFullName ? (
													<p>
														Найдена карточка в CRM:{" "}
														<strong className="text-teal-700 dark:text-teal-300">
															{study.patientFullName}
														</strong>
													</p>
												) : null}
												<p className="opacity-70 text-[11px]">
													Тег DICOM: {study.dicomPatientName ?? "Не указан"} | Дата рождения:{" "}
													{study.dicomBirthDate ?? "—"} | Путь: {study.storagePath ?? "—"}
												</p>
												{study.aiSummary && (
													<p className="text-[11px] italic opacity-60">
														{study.aiSummary}
													</p>
												)}
											</div>
										</div>

										<div className="flex items-center gap-2 self-end md:self-center">
											{study.patientId && (
												<button
													type="button"
													disabled={actionPendingId === study.id}
													onClick={() => handleBindPatient(study.id, study.patientId!)}
													className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 transition-colors cursor-pointer"
												>
													<UserCheck className="w-3.5 h-3.5" />
													<span>Привязать в 1 клик</span>
												</button>
											)}

											<button
												type="button"
												disabled={actionPendingId === study.id}
												onClick={() => handleDismiss(study.id)}
												className="p-1.5 rounded-lg text-xs opacity-60 hover:opacity-100 hover:text-rose-600 transition-colors cursor-pointer"
												title="Скрыть снимок"
											>
												<Trash2 className="w-4 h-4" />
											</button>
										</div>
									</div>
								))}
							</div>
						)
					) : activeTab === "unassigned" ? (
						unassignedStudies.length === 0 ? (
							<div className="flex flex-col items-center justify-center py-12 text-center opacity-60 space-y-2">
								<CheckCircle2 className="w-8 h-8 text-teal-600" />
								<p className="text-sm font-semibold">Нераспознанных снимков нет</p>
							</div>
						) : (
							<div className="space-y-3">
								{unassignedStudies.map((study) => (
									<div
										key={study.id}
										className="p-3.5 rounded-xl border flex flex-col md:flex-row items-start md:items-center justify-between gap-3"
										style={{
											background: "var(--paper, #ffffff)",
											borderColor: "var(--line, #e2e8f0)",
										}}
									>
										<div className="space-y-1">
											<p className="font-medium text-xs">
												{study.title} ({study.sliceCount ?? 0} ср.)
											</p>
											<p className="text-[11px] opacity-70">
												ФИО в DICOM: {study.dicomPatientName ?? "—"} | Путь: {study.storagePath ?? "—"}
											</p>
										</div>
										<button
											type="button"
											onClick={() => handleDismiss(study.id)}
											className="px-2.5 py-1 rounded text-xs border opacity-70 hover:opacity-100 cursor-pointer"
										>
											Скрыть
										</button>
									</div>
								))}
							</div>
						)
					) : (
						/* Вкладка настроек демона */
						<div className="space-y-6">
							<div
								className="p-4 rounded-xl border space-y-3"
								style={{
									background: "var(--paper, #ffffff)",
									borderColor: "var(--line, #e2e8f0)",
								}}
							>
								<div className="flex items-center justify-between">
									<div className="flex items-center gap-2">
										<HardDrive className="w-4 h-4 text-teal-600" />
										<span className="font-bold text-sm">Статус фонового демона</span>
									</div>
									<span
										className={`px-2 py-0.5 rounded-full text-xs font-bold ${
											daemonStatus?.isRunning
												? "bg-teal-100 text-teal-800 dark:bg-teal-950/60 dark:text-teal-300"
												: "bg-gray-100 text-gray-700"
										}`}
									>
										{daemonStatus?.isRunning ? "Запущен и сканирует" : "Остановлен"}
									</span>
								</div>

								<div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs pt-2">
									<div className="p-2.5 rounded-lg border bg-black/[0.02] dark:bg-white/[0.02]">
										<span className="opacity-60 block">Отслеживаемых папок:</span>
										<strong className="text-sm">{daemonStatus?.activeRoots?.length ?? 0}</strong>
									</div>
									<div className="p-2.5 rounded-lg border bg-black/[0.02] dark:bg-white/[0.02]">
										<span className="opacity-60 block">Автопривязано (&gt;85%):</span>
										<strong className="text-sm text-teal-600">{daemonStatus?.autoBoundCount ?? 0}</strong>
									</div>
									<div className="p-2.5 rounded-lg border bg-black/[0.02] dark:bg-white/[0.02]">
										<span className="opacity-60 block">Ожидают решения:</span>
										<strong className="text-sm text-amber-600">{daemonStatus?.pendingReviewCount ?? 0}</strong>
									</div>
									<div className="p-2.5 rounded-lg border bg-black/[0.02] dark:bg-white/[0.02]">
										<span className="opacity-60 block">Нераспознано (&lt;60%):</span>
										<strong className="text-sm opacity-80">{daemonStatus?.unassignedCount ?? 0}</strong>
									</div>
								</div>
							</div>

							<div
								className="p-4 rounded-xl border space-y-3"
								style={{
									background: "var(--paper, #ffffff)",
									borderColor: "var(--line, #e2e8f0)",
								}}
							>
								<span className="font-bold text-sm block">Активные пути экспорта аппаратов:</span>
								<div className="space-y-1.5 text-xs font-mono">
									{daemonStatus?.activeRoots && daemonStatus.activeRoots.length > 0 ? (
										daemonStatus.activeRoots.map((p: string, idx: number) => (
											<div
												key={idx}
												className="p-2 rounded border bg-black/[0.02] dark:bg-white/[0.02] flex items-center justify-between"
											>
												<span className="truncate">{p}</span>
												<span className="text-[10px] opacity-60">доступна</span>
											</div>
										))
									) : (
										<p className="opacity-60 italic">Стандартные пути проверяются в фоне (D:\CT_Export, C:\Ez3D-i, Romexis, Sidexis)</p>
									)}
								</div>
							</div>
						</div>
					)}
				</div>

				{/* ─── Подвал ──────────────────────────────────────────────── */}
				<div
					className="flex items-center justify-between px-6 py-3 border-t text-xs opacity-75"
					style={{ borderColor: "var(--line, #e2e8f0)" }}
				>
					<span>
						Последнее сканирование:{" "}
						{daemonStatus?.lastScanAt
							? new Date(daemonStatus.lastScanAt).toLocaleTimeString()
							: "Не проводилось"}
					</span>
					<button
						type="button"
						onClick={onClose}
						className="px-4 py-1.5 rounded-lg border hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer font-medium"
					>
						Закрыть
					</button>
				</div>
			</div>
		</div>
	);
};
