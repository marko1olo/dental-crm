import { Activity, Camera, FileText, Image as ImageIcon, Layers, Plus, Scan, Trash2 } from "lucide-react";
import React, { useState } from "react";
import { useAppLogicContext } from "../../contexts/AppLogicContext";
import { useWorkspaceProfile } from "../../hooks/useWorkspaceProfile";
import { usePatientStore } from "../../store/patientStore";
import { EMPTY_DIARY } from "../useVisitDiaryLogic";
import { VisiographAnalyzer } from "../imaging/VisiographAnalyzer";
import { EndoCanalLogModal } from "../odontogram/EndoCanalLogModal";
import { CephalometricAnalysisModal } from "../orthodontics/CephalometricAnalysisModal";
import { LabOrdersPanel } from "../schedule/LabOrdersPanel";
import { RadiologyReferralModal } from "./RadiologyReferralModal";
import { ClinicalPhotoProtocolModal } from "../photography/ClinicalPhotoProtocolModal";
import { CbctMprWorkspace } from "../dicom/CbctMprWorkspace";
import { imagingWriteTarget, realVisitFieldId } from "./visitIdentity";
import {
	type ClinicalPhotoAttachment,
	generatePhotoProtocolAttachmentsStatement,
} from "../../lib/clinicalProtocols043";

/*
  СНИМОК И ЗАКЛЮЧЕНИЕ МОГЛИ ЛЕЧЬ В КАРТУ ДРУГОГО ПАЦИЕНТА, И ЭКРАН ОБ ЭТОМ
  МОЛЧАЛ.

  На этой вкладке стоят две панели, привязанные к РАЗНЫМ пациентам:
    • разбор снимка (components/imaging/VisiographAnalyzer.tsx) пишет снимок,
      текст заключения и найденные ИИ состояния зубов в карту
      patientStore.selectedPatientId — то есть того, кто открыт в разделе
      «Пациенты». Пропсов он не принимает и пациента приёма не знает;
    • наряды в лабораторию получают идентификатор пациента приёма пропсом.

  Выбор в разделе «Пациенты» переживает уход из своего раздела, приём его не
  сбрасывает, а PatientsView вдобавок сам переставляет выбор на первую строку
  отфильтрованного списка. Врач заглянул перед приёмом в карточку другого
  человека — и снимок пациента приёма ушёл в чужую карту: и файл, и заключение,
  и отметки зубов. На экране при этом ни слова о том, чья это карта.

  ТЕПЕРЬ вкладка называет карту вслух и, когда карта чужая, предупреждает ДО
  загрузки снимка и даёт исправить выбор одной кнопкой — той же операцией, какой
  приложение выбирает пациента при быстром приёме.

  ДОЛГ ВЕДУЩЕМУ (за пределами вкладки): правильное лечение — принимать
  идентификатор пациента пропсом в VisiographAnalyzer, как это делает
  LabOrdersPanel, и передавать ему пациента приёма. Тогда расхождение станет
  невозможным, а не объяснённым. Файл components/imaging/VisiographAnalyzer.tsx
  в эту территорию не входит.
*/
// biome-ignore lint/suspicious/noExplicitAny: automated suppression
export function VisitDiagnosticsTab(props?: {
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	activePatient?: any;
	onInsertToProtocol?: (text: string) => void;
}) {
	const ctx = useAppLogicContext();
	const activePatient = props?.activePatient ?? ctx?.activePatient;
	const workspaceFlags = useWorkspaceProfile();
	const [isCephModalOpen, setIsCephModalOpen] = useState<boolean>(false);
	const [isEndoLogModalOpen, setIsEndoLogModalOpen] = useState<boolean>(false);
	const [isRadiologyModalOpen, setIsRadiologyModalOpen] = useState<boolean>(false);
	const [isPhotoProtocolModalOpen, setIsPhotoProtocolModalOpen] = useState<boolean>(false);
	const [isCbctModalOpen, setIsCbctModalOpen] = useState<boolean>(false);

	const [photoAttachments, setPhotoAttachments] = useState<ClinicalPhotoAttachment[]>([]);
	const initialToothNumber = Number(ctx?.dashboard?.activeVisit?.diagnosisTooth) || 16;
	const [selectedToothForPhoto, setSelectedToothForPhoto] = useState<number>(initialToothNumber);
	const [selectedPhotoType, setSelectedPhotoType] = useState<"before" | "after" | "process" | "intraoral_macro" | "face_portrait">("before");
	const [photoComment, setPhotoComment] = useState<string>("");

	const handleAddPhoto = () => {
		const newPhoto: ClinicalPhotoAttachment = {
			id: `photo-${Date.now()}`,
			toothNumber: selectedToothForPhoto || undefined,
			photoType: selectedPhotoType,
			photoUrl: "",
			description: photoComment.trim() || undefined,
			capturedAtIso: new Date().toISOString(),
		};
		const updated = [...photoAttachments, newPhoto];
		setPhotoAttachments(updated);
		setPhotoComment("");

		const statement = generatePhotoProtocolAttachmentsStatement(updated);
		if (props?.onInsertToProtocol) {
			props.onInsertToProtocol(statement);
		} else {
			try {
				window.dispatchEvent(
					new CustomEvent("dente-apply-soap-protocol", {
						detail: {
							soap: {
								treatmentDescription: statement,
							},
							mode: "smart_append",
						},
					}),
				);
			} catch {
				// ignore
			}
		}
	};

	const handleRemovePhoto = (id: string) => {
		const updated = photoAttachments.filter((p) => p.id !== id);
		setPhotoAttachments(updated);
	};

	const selectedPatientId = usePatientStore((state) => state.selectedPatientId);
	const setSelectedPatientId = usePatientStore(
		(state) => state.setSelectedPatientId,
	);

	const dashboard = ctx?.dashboard;
	const visitPatientId = realVisitFieldId(dashboard?.activeVisit?.patientId);
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	const patients: any[] = Array.isArray(dashboard?.patients)
		? dashboard.patients
		: [];
	const nameOf = (patientId: string | null): string | null => {
		if (!patientId) return null;
		const found = patients.find((patient) => patient?.id === patientId);
		const fullName =
			typeof found?.fullName === "string" ? found.fullName.trim() : "";
		return fullName || null;
	};
	const visitPatientName =
		nameOf(visitPatientId) ??
		(typeof activePatient?.fullName === "string"
			? activePatient.fullName
			: null);
	const selectedPatientName = nameOf(realVisitFieldId(selectedPatientId));

	const target = imagingWriteTarget(selectedPatientId, visitPatientId);

	return (
		<div
			data-testid="visit-diagnostics-tab"
			className="visit-diagnostics-tab bg-[var(--paper)] border border-[var(--line)] text-[var(--ink)] rounded-xl p-4 flex flex-col gap-6"
		>
			{/* Orthodontic Cephalometric (TRG) Analysis Module Card */}
			<div
				data-testid="visit-ceph-diagnostic-card"
				className="p-4 rounded-xl bg-[var(--teal-surface)] border border-[var(--teal,var(--line))]/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 shadow-sm"
			>
				<div className="flex items-center gap-3">
					<div className="w-10 h-10 rounded-xl bg-[var(--teal-fill,var(--teal))] text-[var(--on-teal,white)] flex items-center justify-center shrink-0 shadow-sm">
						<Activity size={20} />
					</div>
					<div>
						<div className="flex items-center gap-2">
							<strong className="text-sm font-bold text-slate-900 dark:text-white">
								Цефалометрический анализ ТРГ (Телерентгенография)
							</strong>
							<span className="text-xs font-bold text-[var(--teal,var(--brand-primary))] bg-[var(--teal-surface)] px-2 py-0.5 rounded border border-[var(--teal-soft)]">
								Форма 043/у
							</span>
						</div>
						<p className="text-xs text-slate-600 dark:text-slate-300 m-0 mt-0.5">
							Интерактивная разметка анатомических ориентиров, расчет углов Steiner / Tweed / Ricketts и перенос заключения в дневник
						</p>
					</div>
				</div>

				<button
					type="button"
					onClick={() => setIsCephModalOpen(true)}
					data-testid="open-visit-ceph-modal-btn"
					className="px-4 py-2.5 min-h-[44px] rounded-xl bg-[var(--teal-fill,var(--teal))] hover:bg-[var(--teal-dark,var(--teal))] text-[var(--on-teal,white)] font-bold text-xs flex items-center justify-center gap-1.5 shrink-0 shadow-md active:scale-95 transition-all cursor-pointer border border-[var(--teal-soft)] touch-manipulation"
				>
					<Activity size={15} />
					<span>Открыть анализ ТРГ</span>
				</button>
			</div>

			{/* Dental Photography Protocol & Attachments Module Card */}
			<div
				data-testid="visit-photo-protocol-card"
				className="p-4 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] flex flex-col gap-4 shadow-sm"
			>
				<div className="flex items-center justify-between gap-3 flex-wrap">
					<div className="flex items-center gap-3">
						<div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-sm">
							<Camera size={20} />
						</div>
						<div>
							<div className="flex items-center gap-2">
								<strong className="text-sm font-bold text-[var(--ink)]">
									Дентальный фотопротокол («До / После») & Ведомость 043/у
								</strong>
								<span className="text-xs font-bold text-indigo-800 dark:text-indigo-300 bg-indigo-100 dark:bg-indigo-950 px-2 py-0.5 rounded border border-indigo-500/30">
									Фотоприложения
								</span>
							</div>
							<p className="text-xs text-[var(--muted)] m-0 mt-0.5">
								Привязка клинических снимков к номерам зубов FDI (11–48) и автоматическое формирование ведомости приложений
							</p>
						</div>
					</div>

					<button
						type="button"
						onClick={() => setIsPhotoProtocolModalOpen(true)}
						data-testid="open-visit-photo-protocol-modal-btn"
						className="px-4 py-2.5 min-h-[44px] rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shrink-0 shadow-md shadow-indigo-600/20 active:scale-95 transition-all cursor-pointer border border-indigo-500/30 touch-manipulation"
					>
						<Camera size={15} />
						<span>Сетка протокола (12 слотов)</span>
					</button>
				</div>

				<div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
					<div className="sm:col-span-3 flex flex-col gap-1">
						<label htmlFor="photo-tooth-select" className="text-xs font-bold text-[var(--ink)]">
							Зуб по FDI:
						</label>
						<select
							id="photo-tooth-select"
							value={selectedToothForPhoto}
							onChange={(e) => setSelectedToothForPhoto(Number(e.target.value))}
							className="px-3 py-2 min-h-[44px] rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
						>
							<option value={0}>Общий вид зубного ряда</option>
							{[18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28, 48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38].map((t) => (
								<option key={t} value={t}>
									Зуб {t}
								</option>
							))}
						</select>
					</div>

					<div className="sm:col-span-3 flex flex-col gap-1">
						<label htmlFor="photo-stage-select" className="text-xs font-bold text-[var(--ink)]">
							Этап фотопротокола:
						</label>
						<select
							id="photo-stage-select"
							value={selectedPhotoType}
							onChange={(e) => setSelectedPhotoType(e.target.value as any)}
							className="px-3 py-2 min-h-[44px] rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
						>
							<option value="before">Исходная ситуация (До)</option>
							<option value="after">Результат (После)</option>
							<option value="process">Этап (Коффердам/Преп)</option>
							<option value="intraoral_macro">Внутриротовой макро</option>
							<option value="face_portrait">Портрет лица</option>
						</select>
					</div>

					<div className="sm:col-span-4 flex flex-col gap-1">
						<label htmlFor="photo-comment-input" className="text-xs font-bold text-[var(--ink)]">
							Клинический комментарий:
						</label>
						<input
							id="photo-comment-input"
							type="text"
							placeholder="Напр. Цвет А3, анатомическая моделировка"
							value={photoComment}
							onChange={(e) => setPhotoComment(e.target.value)}
							className="px-3.5 py-2 min-h-[44px] rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
						/>
					</div>

					<div className="sm:col-span-2">
						<button
							type="button"
							onClick={handleAddPhoto}
							className="w-full px-4 py-2 min-h-[44px] rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition-all cursor-pointer touch-manipulation"
						>
							<Plus size={16} />
							<span>Привязать</span>
						</button>
					</div>
				</div>

				{/* List of Attached Photos */}
				{photoAttachments.length > 0 ? (
					<div className="mt-2 space-y-2">
						<div className="text-xs font-bold text-[var(--muted)]">
							Прикрепленные снимки фотопротокола ({photoAttachments.length}):
						</div>
						<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
							{photoAttachments.map((photo) => (
								<div
									key={photo.id}
									className="p-3 rounded-xl border border-[var(--line)] bg-[var(--paper)] flex items-center justify-between gap-2 text-xs shadow-2xs"
								>
									<div className="flex items-center gap-2 min-w-0">
										<ImageIcon size={18} className="text-indigo-600 shrink-0" />
										<div className="min-w-0">
											<div className="font-bold text-[var(--ink)] truncate">
												{photo.toothNumber ? `Зуб ${photo.toothNumber}` : "Общий вид"}
											</div>
											<div className="text-[var(--muted)] text-[11px] truncate">
												{photo.photoType === "before"
													? "До лечения"
													: photo.photoType === "after"
														? "После лечения"
														: "Этап лечения"}
												{photo.description ? ` · ${photo.description}` : ""}
											</div>
										</div>
									</div>
									<button
										type="button"
										onClick={() => handleRemovePhoto(photo.id)}
										className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer shrink-0"
										title="Удалить снимок"
									>
										<Trash2 size={14} />
									</button>
								</div>
							))}
						</div>
					</div>
				) : null}
			</div>

			{target === "another-patient" ? (
				<div
					role="alert"
					aria-live="assertive"
					data-testid="visit-imaging-target-warning"
					className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-900/60 text-sm text-rose-900 dark:text-rose-200"
				>
					<strong className="block mb-1">
						Снимок сохранится в карту другого пациента
					</strong>
					<p className="m-0">
						Приём идёт у {visitPatientName ?? "пациента этого приёма"}, а
						открыта карта {selectedPatientName ?? "другого пациента"}. Снимок,
						заключение и отметки зубов лягут в открытую карту — не в карту
						приёма. Нажмите кнопку ниже, прежде чем загружать снимок.
					</p>
					<button
						type="button"
						onClick={() =>
							visitPatientId && setSelectedPatientId(visitPatientId)
						}
						className="mt-3 px-4 py-2 min-h-[44px] inline-flex items-center justify-center rounded-lg text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white transition-colors touch-manipulation"
					>
						Писать в карту {visitPatientName ?? "пациента приёма"}
					</button>
				</div>
			) : null}

			{target === "nobody" ? (
				<div
					role="status"
					aria-live="polite"
					className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-900/60 text-sm text-amber-900 dark:text-amber-200"
				>
					<strong className="block mb-1">Карта пациента не открыта</strong>
					<p className="m-0">
						Снимок разберётся и заключение вы увидите, но в карту оно НЕ попадёт
						и после перезагрузки страницы потеряется. Откройте карту пациента
						приёма кнопкой ниже, и только потом загружайте снимок.
					</p>
					<button
						type="button"
						onClick={() =>
							visitPatientId && setSelectedPatientId(visitPatientId)
						}
						className="mt-3 px-4 py-2 min-h-[44px] inline-flex items-center justify-center rounded-lg text-xs font-semibold bg-amber-600 hover:bg-amber-500 text-white transition-colors touch-manipulation"
					>
						Открыть карту {visitPatientName ?? "пациента приёма"}
					</button>
				</div>
			) : null}

			{target === "visit-patient" ? (
				<p
					className="m-0 text-xs text-slate-500 dark:text-slate-400"
					data-testid="visit-imaging-target-ok"
				>
					Снимок и заключение сохранятся в карту{" "}
					{visitPatientName ?? "пациента приёма"}.
				</p>
			) : null}

			{target === "no-visit" ? (
				<div
					role="status"
					aria-live="polite"
					className="p-4 rounded-xl border border-dashed border-[var(--line)] text-sm text-[var(--muted)]"
				>
					<strong className="block mb-1 text-[var(--ink)]">
						Приём не открыт
					</strong>
					<p className="m-0">
						{selectedPatientName
							? `Снимок и заключение сохранятся в открытую карту — ${selectedPatientName}. Проверьте, что это нужный человек: приём сейчас ни на кого не открыт.`
							: "Карта пациента тоже не открыта, поэтому заключение никуда не сохранится. Откройте карту пациента в разделе «Пациенты» или начните приём в разделе «Записи»."}
					</p>
				</div>
			) : null}

			<VisiographAnalyzer />

			{/*
				Наряды в лабораторию читаются по пациенту приёма. Без пациента панель
				не показываем: она запрашивала бы наряды в пустоту — но и молчать об
				этом нельзя, иначе отсутствие панели читается как «нарядов нет».
			*/}
			{workspaceFlags.hasDentalLab ? (
				activePatient?.id ? (
					<LabOrdersPanel patientId={activePatient.id} />
				) : (
					<div
						role="status"
						aria-live="polite"
						className="p-4 rounded-xl border border-dashed border-[var(--line)] text-sm text-[var(--muted)]"
					>
						<strong className="block mb-1 text-[var(--ink)]">
							Наряды в лабораторию пока не показать
						</strong>
						Пациент не выбран, а наряды читаются по конкретному человеку.
						Выберите пациента в разделе «Пациенты» или начните приём — список
						появится здесь.
					</div>
				)
			) : null}

			{/* Diagnostics Actions Bar */}
			<div className="flex items-center gap-2 flex-wrap">
				<button
					type="button"
					onClick={() => setIsRadiologyModalOpen(true)}
					className="flex items-center gap-2 px-4 py-2.5 min-h-[48px] text-xs sm:text-sm font-bold rounded-xl bg-[var(--teal-fill,var(--teal))] hover:bg-[var(--teal-dark,var(--teal))] text-[var(--on-teal,white)] cursor-pointer transition-all shadow-sm active:scale-95 touch-manipulation"
					data-testid="btn-open-radiology-referral-modal"
				>
					<Scan size={16} />
					<span>Направление на КЛКТ / ОПТГ / ТРГ</span>
				</button>
				<button
					type="button"
					onClick={() => setIsEndoLogModalOpen(true)}
					className="flex items-center gap-2 px-4 py-2.5 min-h-[48px] text-xs sm:text-sm font-bold rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white cursor-pointer transition-all shadow-sm active:scale-95 touch-manipulation"
					data-testid="btn-open-endo-canal-modal"
				>
					<Layers size={16} />
					<span>Эндодонтия: Журнал длины каналов (WL)</span>
				</button>
			</div>

			{/* Orthodontic Cephalometric Modal */}
			<CephalometricAnalysisModal
				isOpen={isCephModalOpen}
				onClose={() => setIsCephModalOpen(false)}
				patientId={visitPatientId ?? activePatient?.id}
				patientName={visitPatientName ?? activePatient?.fullName}
				onInsertToProtocol={(text) => {
					if (props?.onInsertToProtocol) {
						props.onInsertToProtocol(text);
					} else if (typeof ctx?.appendToTranscript === "function") {
						ctx.appendToTranscript(`\n\n${text}`);
					}
				}}
			/>

			{/* Endodontic Root Canal Working Length Log Modal */}
			<EndoCanalLogModal
				isOpen={isEndoLogModalOpen}
				onClose={() => setIsEndoLogModalOpen(false)}
				toothNumber={selectedToothForPhoto || initialToothNumber || 16}
				patientId={visitPatientId ?? activePatient?.id}
				onInsertToProtocol={(text) => {
					if (props?.onInsertToProtocol) {
						props.onInsertToProtocol(text);
					} else if (typeof ctx?.appendToTranscript === "function") {
						ctx.appendToTranscript(`\n\n${text}`);
					}
				}}
			/>

			{/* Dental Radiology Referral Printable Modal */}
			<RadiologyReferralModal
				isOpen={isRadiologyModalOpen}
				onClose={() => setIsRadiologyModalOpen(false)}
				patient={activePatient}
				diary={EMPTY_DIARY}
				doctorName={ctx?.auth?.currentUser?.name || "Лечащий врач стоматолог"}
				clinicName={dashboard?.clinicSettings?.profile?.brandName || "Клиника ДЕНТЕ"}
			/>

			{/* Clinical 12/8/6/3-Slot Photo Protocol Studio Modal (Tier 2 on-demand) */}
			<ClinicalPhotoProtocolModal
				isOpen={isPhotoProtocolModalOpen}
				onClose={() => setIsPhotoProtocolModalOpen(false)}
				patientId={visitPatientId ?? activePatient?.id}
				patientName={visitPatientName ?? activePatient?.fullName}
				doctorName={ctx?.auth?.currentUser?.name || "Лечащий врач стоматолог"}
				clinicName={dashboard?.clinicSettings?.profile?.brandName || "Клиника ДЕНТЕ"}
				onSaveProtocol={(slots) => {
					const newAttachments: ClinicalPhotoAttachment[] = Object.entries(slots)
						.filter(([_, rec]) => typeof rec.imageUrl === "string" && rec.imageUrl.length > 0)
						.map(([slotId, rec]) => ({
							id: `photo-slot-${slotId}-${Date.now()}`,
							photoType: rec.stage === "after" ? "after" : "before",
							photoUrl: rec.imageUrl || "",
							description: `Слот: ${slotId}`,
							capturedAtIso: rec.uploadedAt ?? new Date().toISOString(),
						}));
					if (newAttachments.length > 0) {
						const updated = [...photoAttachments, ...newAttachments];
						setPhotoAttachments(updated);
						const statement = generatePhotoProtocolAttachmentsStatement(updated);
						if (props?.onInsertToProtocol) {
							props.onInsertToProtocol(statement);
						} else {
							try {
								window.dispatchEvent(
									new CustomEvent("dente-apply-soap-protocol", {
										detail: {
											soap: {
												treatmentDescription: statement,
											},
											mode: "smart_append",
										},
									}),
								);
							} catch {
								// ignore
							}
						}
					}
					setIsPhotoProtocolModalOpen(false);
				}}
			/>

			{/* 3D CBCT / MPR Fullscreen Studio Modal (Tier 3 on-demand) */}
			<CbctMprWorkspace
				isOpen={isCbctModalOpen}
				onClose={() => setIsCbctModalOpen(false)}
				patientId={visitPatientId ?? activePatient?.id}
				patientName={visitPatientName ?? activePatient?.fullName}
			/>
		</div>
	);
}
