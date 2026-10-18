import { useCallback, useEffect, useState } from "react";
import { showToast } from "../../components/GlobalToast";

interface UseImagingDicomwebParams {
	selectedImagingStudy: any;
	activePatientId?: string | null;
	authHeaders: Record<string, string>;
	localImageIds: string[];
	setLocalImageIds: (ids: string[]) => void;
}

export function useImagingDicomweb({
	selectedImagingStudy,
	activePatientId,
	authHeaders,
	localImageIds,
	setLocalImageIds,
}: UseImagingDicomwebParams) {
	const [isDicomwebLoading, setIsDicomwebLoading] = useState(false);
	const [dicomwebLoadProgress, setDicomwebLoadProgress] = useState<string | null>(null);

	const handleLoadFromDicomweb = useCallback(async (options?: { silentOnError?: boolean }) => {
		if (!selectedImagingStudy) return;
		setIsDicomwebLoading(true);
		setDicomwebLoadProgress("Подключение к DICOMweb WADO-RS...");
		try {
			const apiBase = (import.meta.env.VITE_API_URL ?? "").replace(/\/+$/, "");
			const studyAny = selectedImagingStudy as Record<string, unknown>;
			let studyUid = (studyAny.dicomStudyUid ?? studyAny.studyInstanceUid ?? studyAny.studyUid) as string | undefined;
			let seriesUid = (studyAny.dicomSeriesUid ?? studyAny.seriesInstanceUid ?? studyAny.seriesUid) as string | undefined;

			if (!studyUid) {
				const qidoUrl = `${apiBase}/api/dicomweb/studies${activePatientId ? `?PatientID=${encodeURIComponent(activePatientId)}` : ""}`;
				const qidoRes = await fetch(qidoUrl, { headers: { Accept: "application/dicom+json", ...authHeaders } });
				if (qidoRes.ok) {
					const studies = (await qidoRes.json()) as Array<Record<string, { Value?: unknown[] }>>;
					if (Array.isArray(studies) && studies.length > 0) studyUid = studies[0]?.["0020000D"]?.Value?.[0] as string | undefined;
				}
			}
			if (!studyUid) {
				if (!options?.silentOnError) {
					showToast(
						"В DICOMweb PACS нет удаленного архива для этого снимка. Вы можете загрузить локальный файл или архив DICOM через панель ниже.",
						"info",
						5000,
					);
				}
				return;
			}

			if (!seriesUid) {
				const seriesRes = await fetch(`${apiBase}/api/dicomweb/studies/${encodeURIComponent(studyUid)}/series`, {
					headers: { Accept: "application/dicom+json", ...authHeaders },
				});
				if (seriesRes.ok) {
					const seriesList = (await seriesRes.json()) as Array<Record<string, { Value?: unknown[] }>>;
					if (Array.isArray(seriesList) && seriesList.length > 0) seriesUid = seriesList[0]?.["0020000E"]?.Value?.[0] as string | undefined;
				}
			}
			if (!seriesUid) throw new Error("Не найдена серия снимков в исследовании PACS.");

			setDicomwebLoadProgress("Загрузка метаданных серии WADO-RS...");
			const metaRes = await fetch(`${apiBase}/api/dicomweb/studies/${encodeURIComponent(studyUid)}/series/${encodeURIComponent(seriesUid)}/metadata`, {
				headers: { Accept: "application/dicom+json", ...authHeaders },
			});
			if (!metaRes.ok) throw new Error(`Ошибка загрузки метаданных серии: HTTP ${metaRes.status}`);
			const metaJson = (await metaRes.json()) as Array<Record<string, { Value?: unknown[] }>>;
			if (!Array.isArray(metaJson) || metaJson.length === 0) throw new Error("В серии DICOMweb не найдено кадров.");

			const wadoImageIds: string[] = [];
			for (const item of metaJson) {
				const sopUid = item?.["00080018"]?.Value?.[0] as string | undefined;
				if (sopUid) {
					const wadoUrl = `${apiBase}/api/dicomweb/studies/${encodeURIComponent(studyUid)}/series/${encodeURIComponent(seriesUid)}/instances/${encodeURIComponent(sopUid)}`;
					wadoImageIds.push(`wadouri:${wadoUrl}`);
				}
			}
			if (wadoImageIds.length === 0) throw new Error("Не удалось сформировать адреса WADO-RS для кадров серии.");

			setLocalImageIds(wadoImageIds);
			showToast(`Загружено ${wadoImageIds.length} срезов из DICOMweb PACS`, "success");
		} catch (err) {
			const msg = err instanceof Error ? err.message : "Сбой загрузки из DICOMweb";
			if (!options?.silentOnError) showToast(msg, "error");
		} finally {
			setIsDicomwebLoading(false);
			setDicomwebLoadProgress(null);
		}
	}, [selectedImagingStudy, activePatientId, authHeaders, setLocalImageIds]);

	// Autoload DICOMweb WADO-RS when a CBCT study with PACS linkage is selected
	useEffect(() => {
		if (!selectedImagingStudy || selectedImagingStudy.kind !== "cbct") return;
		if (localImageIds && localImageIds.length > 0) return;
		if (isDicomwebLoading) return;
		const studyAny = selectedImagingStudy as Record<string, unknown>;
		if (studyAny.dicomStudyUid ?? studyAny.studyInstanceUid ?? studyAny.studyUid ?? studyAny.hasDicomweb) {
			handleLoadFromDicomweb({ silentOnError: true });
		}
	}, [selectedImagingStudy, localImageIds, isDicomwebLoading, handleLoadFromDicomweb]);

	return {
		isDicomwebLoading,
		dicomwebLoadProgress,
		handleLoadFromDicomweb,
	};
}
