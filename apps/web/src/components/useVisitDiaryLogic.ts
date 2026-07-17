import { useCallback, useEffect, useRef, useState } from "react";
import { useVisitStore } from "../store/visitStore";
import { useAppLogic } from "../useAppLogic";
import { showToast } from "./GlobalToast";

export interface DiaryState {
	anamnesis: string;
	statusLocalis: string;
	diagnosisIcd10: string;
	diagnosisTooth: string;
	treatmentDescription: string;
	complications: string;
	comorbidities: string;
}

export const EMPTY_DIARY: DiaryState = {
	anamnesis: "",
	statusLocalis: "",
	diagnosisIcd10: "",
	diagnosisTooth: "",
	treatmentDescription: "",
	complications: "",
	comorbidities: "",
};

export function useVisitDiaryLogic(visitId: string, patientId: string) {
	const { activeDoctor } = useAppLogic();
	const [diary, setDiary] = useState<DiaryState>(EMPTY_DIARY);
	const [diaryId, setDiaryId] = useState<string | null>(null);
	const [isLocked, setIsLocked] = useState(false);
	const [lockedAt, setLockedAt] = useState<string | null>(null);
	const [diaryHash, setDiaryHash] = useState<string | null>(null);
	const [isSaving, setIsSaving] = useState(false);
	const [showScanner, setShowScanner] = useState(false);
	const [trayBarcode, setTrayBarcode] = useState<string | null>(null);
	const [showIcdDropdown, setShowIcdDropdown] = useState(false);
	const [icdSearch, setIcdSearch] = useState("");
	const [showPreview, setShowPreview] = useState(false);
	const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
	const [revisionCount, setRevisionCount] = useState(0);

	const autosaveRef = useRef<ReturnType<typeof setInterval> | null>(null);
	const icdRef = useRef<HTMLDivElement>(null);

	// ── Cleanup & load on visitId change
	useEffect(() => {
		let alive = true;

		setDiary(EMPTY_DIARY);
		setIcdSearch("");
		setShowPreview(false);
		setIsLocked(false);
		setDiaryId(null);
		setLockedAt(null);
		setDiaryHash(null);
		setLastSavedAt(null);
		setRevisionCount(0);

		fetch(`/api/diaries/visit/${visitId}`)
			.then((r) => r.json())
			.then((diaryData) => {
				if (!alive) return;
				if (diaryData.diary) {
					const d = diaryData.diary;
					setDiary({
						anamnesis: d.anamnesis ?? "",
						statusLocalis: d.statusLocalis ?? "",
						diagnosisIcd10: d.diagnosisIcd10 ?? "",
						diagnosisTooth: d.diagnosisTooth ?? "",
						treatmentDescription: d.treatmentDescription ?? "",
						complications: d.complications ?? "",
						comorbidities: d.comorbidities ?? "",
					});
					if (d.instrumentTrayBarcode) setTrayBarcode(d.instrumentTrayBarcode);
					setIsLocked(d.isLocked ?? false);
					setDiaryId(d.id ?? null);
					setLockedAt(d.lockedAt ?? null);
					setDiaryHash(d.diaryHash ?? null);
					if (d.diagnosisIcd10) setIcdSearch(d.diagnosisIcd10);
					if (d.id) {
						fetch(`/api/diaries/${d.id}/revisions`)
							.then((r) => r.json())
							.then((rd) => {
								if (alive) setRevisionCount(rd.revisions?.length ?? 0);
							})
							.catch(() => {});
					}
				}
			})
			.catch(console.error);

		return () => {
			alive = false;
			setDiary(EMPTY_DIARY);
			setIcdSearch("");
			setShowPreview(false);
			if (autosaveRef.current) clearInterval(autosaveRef.current);
			useVisitStore.getState().setDraft(null);
		};
	}, [visitId]);

	// ── Resize textareas
	useEffect(() => {
		const autoResize = (el: HTMLTextAreaElement) => {
			el.style.height = "auto";
			el.style.height = el.scrollHeight + "px";
		};
		document
			.querySelectorAll<HTMLTextAreaElement>(".auto-resize-ta")
			.forEach(autoResize);
	}, [diary, isLocked]);

	// ── Click outside ICD dropdown
	useEffect(() => {
		const handler = (e: MouseEvent) => {
			if (icdRef.current && !icdRef.current.contains(e.target as Node)) {
				setShowIcdDropdown(false);
			}
		};
		document.addEventListener("mousedown", handler);
		return () => document.removeEventListener("mousedown", handler);
	}, []);

	// ── Save
	const doSave = useCallback(
		async (silent = false) => {
			if (isLocked) return;
			if (!activeDoctor) {
				if (!silent) showToast("Выберите врача для приема", "error");
				return;
			}
			setIsSaving(true);
			try {
				const clinicToken = localStorage.getItem("dente_clinic_token");
				const res = await fetch(`/api/visits/${visitId}/draft/autosave`, {
					method: "PUT",
					headers: {
						"Content-Type": "application/json",
						"x-dente-clinic-token": clinicToken || "",
					},
					body: JSON.stringify({
						patientId,
						doctorId: activeDoctor.id,
						instrumentTrayBarcode: trayBarcode || null,
						anamnesis: diary.anamnesis,
						statusLocalis: diary.statusLocalis,
						diagnosisIcd10: diary.diagnosisIcd10,
						diagnosisTooth: diary.diagnosisTooth,
						treatmentDescription: diary.treatmentDescription,
						complications: diary.complications,
						comorbidities: diary.comorbidities,
					}),
				});
				if (!res.ok) throw new Error("Save failed");
				const data = await res.json();
				if (data.diary?.id) setDiaryId(data.diary.id);
				setLastSavedAt(new Date());
				if (!silent) showToast("Черновик сохранен", "success");
			} catch (err) {
				if (!silent) showToast("Ошибка сохранения дневника", "error");
			} finally {
				setIsSaving(false);
			}
		},
		[activeDoctor, diary, isLocked, patientId, showToast, trayBarcode, visitId],
	);

	// ── Autosave
	useEffect(() => {
		if (autosaveRef.current) clearInterval(autosaveRef.current);
		autosaveRef.current = setInterval(() => {
			doSave(true);
		}, 30000);
		return () => clearInterval(autosaveRef.current!);
	}, [doSave]);

	// ── Lock (Sign & Seal)
	const doLock = async (certThumbprint: string, pkcs7Signature: string) => {
		if (!activeDoctor) {
			showToast("Сначала выберите врача для приема!", "error");
			return;
		}

		await doSave(true);

		if (trayBarcode) {
			try {
				const linkRes = await fetch("/api/sterilization/link", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ visitId, barcode: trayBarcode }),
				});
				if (!linkRes.ok) {
					const err = await linkRes.json();
					showToast(
						`Ошибка стерилизации: ${err.error || "Неизвестный штрихкод"}`,
						"error",
					);
					return;
				}
			} catch (e) {
				showToast("Сетевая ошибка проверки штрихкода", "error");
				return;
			}
		}

		const target = diaryId ?? visitId;
		try {
			const res = await fetch(`/api/diaries/${target}/lock`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ pkcs7Signature }),
			});
			const json = await res.json();
			if (res.ok) {
				setIsLocked(true);
				setLockedAt(new Date().toISOString());
				setDiaryHash(json.hash ?? null);
				showToast("Дневник подписан и заблокирован (ЭЦП врача).", "success");
			} else if (res.status === 409) {
				setIsLocked(true);
				showToast("Дневник уже был подписан ранее.", "info");
			} else {
				showToast(`Ошибка: ${json.error ?? "неизвестная"}`, "error");
			}
		} catch {
			showToast("Ошибка сети при подписании", "error");
		}
	};

	return {
		diary,
		setDiary,
		diaryId,
		isLocked,
		lockedAt,
		diaryHash,
		lastSavedAt,
		revisionCount,
		isSaving,
		showScanner,
		setShowScanner,
		trayBarcode,
		setTrayBarcode,
		showIcdDropdown,
		setShowIcdDropdown,
		icdSearch,
		setIcdSearch,
		showPreview,
		setShowPreview,
		doSave,
		doLock,
		icdRef,
	};
}
