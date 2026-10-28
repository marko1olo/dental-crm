/**
 * DENTE CRM — Resolved Imaging Studies Resolver
 * Mandate 8wy (Demo Showcase Isolation), Mandate 8b (<= 120 lines).
 */

import { useMemo } from "react";
import { isDemoShowcaseMode } from "../../lib/demoMode";

export function useResolvedImagingStudies(props: {
	activeImagingStudies?: unknown[];
	visibleImagingStudies?: unknown[];
	dashboard?: { imagingStudies?: unknown[] };
	activePatient?: { id?: string } | null;
}) {
	const { activeImagingStudies, visibleImagingStudies, dashboard, activePatient } = props;

	return useMemo(() => {
		if (activeImagingStudies && activeImagingStudies.length > 0) {
			return activeImagingStudies as any[];
		}
		if (visibleImagingStudies && visibleImagingStudies.length > 0) {
			return visibleImagingStudies as any[];
		}
		if (dashboard?.imagingStudies && dashboard.imagingStudies.length > 0) {
			return dashboard.imagingStudies as any[];
		}
		if (isDemoShowcaseMode()) {
			const pid = activePatient?.id || "sample_patient";
			const now = new Date().toISOString();
			return [
				{
					id: "sample_rvg_16",
					patientId: pid,
					kind: "periapical",
					title: "Прицельный снимок RVG #16 (Эндодонтия)",
					toothCode: "16",
					region: "posterior",
					previewUrl: "/radiology/sample_rvg_tooth16.jpg",
					hasFile: true,
					capturedAt: now,
				},
				{
					id: "sample_rvg_36",
					patientId: pid,
					kind: "periapical",
					title: "Прицельный снимок RVG #36 (Контроль обтурации)",
					toothCode: "36",
					region: "posterior",
					previewUrl: "/radiology/sample_rvg_tooth36_periapical.jpg",
					hasFile: true,
					capturedAt: now,
				},
				{
					id: "sample_optg_pano",
					patientId: pid,
					kind: "opg",
					title: "Панорамная томограмма (ОПТГ)",
					region: "maxilla_mandible",
					previewUrl: "/radiology/sample_optg_panoramic.png",
					hasFile: true,
					capturedAt: now,
				},
				{
					id: "sample_rvg_pathology",
					patientId: pid,
					kind: "periapical",
					title: "Прицельный снимок RVG #26 (Периодонтит)",
					toothCode: "26",
					region: "posterior",
					previewUrl: "/radiology/sample_rvg_pathology.jpg",
					hasFile: true,
					capturedAt: now,
				},
				{
					id: "sample_cbct_mandible",
					patientId: pid,
					kind: "cbct",
					title: "Конусно-лучевая томография КЛКТ (Romexis / Ez3D)",
					region: "mandible",
					previewUrl: "/radiology/sample_optg_panoramic.png",
					hasFile: true,
					capturedAt: now,
				},
			] as any[];
		}
		return [] as any[];
	}, [activeImagingStudies, visibleImagingStudies, dashboard?.imagingStudies, activePatient?.id]);
}
