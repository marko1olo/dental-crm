import type { ImagingStudyItem } from "./types";

export function getDemoImagingStudies(patientId: string): ImagingStudyItem[] {
	return [
		{
			id: `demo-study-rvg-16-${patientId}`,
			patientId,
			title: "Прицельный снимок зуба 1.6",
			kind: "periapical",
			toothCode: "16",
			previewUrl: "/radiology/sample_rvg_tooth16.jpg",
			viewerUrl: "/radiology/sample_rvg_tooth16.jpg",
			capturedAt: new Date(Date.now() - 86400000 * 3).toISOString(),
			effectiveDoseMicrosv: 2,
			status: "available",
		},
		{
			id: `demo-study-rvg-36-${patientId}`,
			patientId,
			title: "Прицельный снимок зуба 3.6 (периапикальный)",
			kind: "periapical",
			toothCode: "36",
			previewUrl: "/radiology/sample_rvg_tooth36_periapical.jpg",
			viewerUrl: "/radiology/sample_rvg_tooth36_periapical.jpg",
			capturedAt: new Date(Date.now() - 86400000 * 14).toISOString(),
			effectiveDoseMicrosv: 3,
			status: "available",
		},
		{
			id: `demo-study-cbct-${patientId}`,
			patientId,
			title: "3D КЛКТ сегмента верхней челюсти",
			kind: "cbct",
			toothCode: "16",
			previewUrl: "/radiology/sample_rvg_pathology.jpg",
			viewerUrl: "/radiology/kavo_op300_cbct_slice.dcm",
			capturedAt: new Date(Date.now() - 86400000 * 30).toISOString(),
			effectiveDoseMicrosv: 35,
			status: "available",
		},
		{
			id: `demo-study-trg-${patientId}`,
			patientId,
			title: "ТРГ (Телерентгенограмма) боковая",
			kind: "cephalometric",
			toothCode: null,
			previewUrl: "/radiology/sample_trg_cephalogram.jpg",
			viewerUrl: "/radiology/sample_trg_cephalogram.jpg",
			capturedAt: new Date(Date.now() - 86400000 * 60).toISOString(),
			effectiveDoseMicrosv: 12,
			status: "available",
		},
	];
}
