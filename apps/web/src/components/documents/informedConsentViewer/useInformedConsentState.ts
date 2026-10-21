import type { Patient } from "@dental/shared";
import { useMemo, useState } from "react";
import { useDocumentStore } from "../../../store/documentStore";

export interface UseInformedConsentStateOptions {
	readonly patient?: Patient | null | undefined;
	readonly doctorFullName?: string | null | undefined;
	// biome-ignore lint/suspicious/noExplicitAny: clinic profile
	readonly clinicProfileDraft?: any;
	readonly onPrint?: (() => void) | undefined;
	readonly onDownloadPdf?: (() => void) | undefined;
}

export function useInformedConsentState(opts: UseInformedConsentStateOptions) {
	const [questionsAnswered, setQuestionsAnswered] = useState(true);
	const [risksUnderstood, setRisksUnderstood] = useState(true);
	const [withdrawUnderstood, setWithdrawUnderstood] = useState(true);
	const [isPrinting, setIsPrinting] = useState(false);

	const store = useDocumentStore();

	const todayRu = useMemo(() => {
		const d = new Date();
		const day = String(d.getDate()).padStart(2, "0");
		const months = [
			"января",
			"февраля",
			"марта",
			"апреля",
			"мая",
			"июня",
			"июля",
			"августа",
			"сентября",
			"октября",
			"ноября",
			"декабря",
		];
		const month = months[d.getMonth()] || "января";
		const year = d.getFullYear();
		return `${day} ${month} ${year}`;
	}, []);

	const clinicName =
		opts.clinicProfileDraft?.legalName ||
		opts.clinicProfileDraft?.clinicName ||
		'ООО "Стоматологическая клиника ДЕНТЕ"';

	const patientName = opts.patient?.fullName || "Пациент клиники";
	const doctor = opts.doctorFullName || "Лечащий врач-стоматолог";

	const handlePrint = () => {
		setIsPrinting(true);
		try {
			if (opts.onPrint) {
				opts.onPrint();
			} else if (typeof window !== "undefined") {
				window.print();
			}
		} finally {
			setIsPrinting(false);
		}
	};

	const handleDownloadPdf = () => {
		if (opts.onDownloadPdf) {
			opts.onDownloadPdf();
			return;
		}
		if (typeof window !== "undefined") {
			window.print();
		}
	};

	const handleFillNorm = () => {
		setQuestionsAnswered(true);
		setRisksUnderstood(true);
		setWithdrawUnderstood(true);
		store.setInformedConsentQuestionsAnswered(true);
		store.setInformedConsentRisksUnderstood(true);
		store.setInformedConsentWithdrawUnderstood(true);
	};

	return {
		questionsAnswered,
		risksUnderstood,
		withdrawUnderstood,
		isPrinting,
		todayRu,
		clinicName,
		patientName,
		doctor,
		handlePrint,
		handleDownloadPdf,
		handleFillNorm,
		setQuestionsAnswered,
		setRisksUnderstood,
		setWithdrawUnderstood,
	};
}
