import type { DentalPricelistAnalysisResponse } from "@dental/shared";
import { useState } from "react";
import {
	operatorWorkflowFailureMessage,
	preparePricelistImage,
	responseErrorMessage,
} from "../../AppHelpers";
import type { ToastType } from "../../components/GlobalToast";
import { pricelistParserModeLabels } from "../../imagingUiLabels";
import { actionFailureToast } from "../../lib/panelStateText";
import {
	pricelistItemMaterialText,
	pricelistMaterialSummaryText,
	pricelistRecognitionBrandGroups,
	pricelistRecognitionServiceGroups,
	pricelistSourceKindLabels,
	pricelistWarningsText,
} from "../../pricelistUiMeta";

/*
 * `auth` описан структурно, а не `any`: у хука ровно одна нужда — заголовок
 * чтения клинических данных. Соседи по каталогу (useFinanceLogic.ts:20-27)
 * держат тот же контракт, и он не декоративный: без этого заголовка сервер
 * отвечает 403, когда в настройках клиники включён секрет администратора,
 * и разбор прайса молча превращается в ошибку на пустом экране.
 */
export interface UsePricelistLogicProps {
	auth: {
		denteClinicalReadHeaders: (
			headers?: Record<string, string>,
		) => Record<string, string>;
	};
	setError: (msg: string | null) => void;
	showToast: (text: string, type?: ToastType, duration?: number) => void;
	initialPricelistSourceKind?: string;
	initialUsePricelistAi?: boolean;
}

export function usePricelistLogic({
	auth,
	setError,
	showToast,
	initialPricelistSourceKind = "vendor",
	initialUsePricelistAi = false,
}: UsePricelistLogicProps) {
	const [pricelistText, setPricelistText] = useState("");
	const [pricelistSourceKind, setPricelistSourceKind] = useState(
		initialPricelistSourceKind,
	);
	const [usePricelistAi, setUsePricelistAi] = useState(initialUsePricelistAi);
	const [pricelistAnalysis, setPricelistAnalysis] =
		useState<DentalPricelistAnalysisResponse | null>(null);

	const [pricelistImageBase64, setPricelistImageBase64] = useState<
		string | null
	>(null);
	const [pricelistImageMimeType, setPricelistImageMimeType] =
		useState<string>("image/jpeg");
	const [pricelistImageName, setPricelistImageName] = useState<string | null>(
		null,
	);
	const [pricelistImageNote, setPricelistImageNote] = useState<string | null>(
		null,
	);
	const [isPricelistAnalyzing, setIsPricelistAnalyzing] = useState(false);

	const attachPricelistImage = async (file: File) => {
		try {
			const prepared = await preparePricelistImage(file);
			setPricelistImageBase64(prepared.base64);
			setPricelistImageMimeType(prepared.mimeType);
			setPricelistImageName(file.name);
			setPricelistImageNote(prepared.note);
			setError(null);
		} catch (readError) {
			showToast(
				actionFailureToast(
					"Фото прайса не прочитано",
					(readError as { status?: number })?.status ?? null,
				),
				"error",
			);
			setError(
				operatorWorkflowFailureMessage("Фото прайса не прочитано", readError),
			);
		}
	};

	const clearPricelistImage = () => {
		setPricelistImageBase64(null);
		setPricelistImageMimeType("image/jpeg");
		setPricelistImageName(null);
		setPricelistImageNote(null);
	};

	const analyzePricelist = async () => {
		if (isPricelistAnalyzing) return;
		const rawText = (pricelistText ?? "").trim();
		const imageBase64 = pricelistImageBase64 || undefined;

		if (!rawText && !imageBase64) {
			setError("Вставьте прайс текстом или приложите фото прайса.");
			return;
		}
		setIsPricelistAnalyzing(true);
		try {
			const response = await fetch("/api/pricelist/analyze", {
				method: "POST",
				headers: auth.denteClinicalReadHeaders({
					"Content-Type": "application/json",
				}),
				body: JSON.stringify({
					sourceName: pricelistImageName || "manual-pricelist",
					sourceKind: pricelistSourceKind,
					rawText,
					...(imageBase64
						? {
								imageBase64,
								imageMimeType: pricelistImageMimeType || "image/jpeg",
							}
						: {}),
					useServerAi: Boolean(usePricelistAi),
				}),
			});

			if (!response.ok)
				throw new Error(
					await responseErrorMessage(response, "Прайс-лист не разобран"),
				);

			const analysis =
				(await response.json()) as DentalPricelistAnalysisResponse;
			setPricelistAnalysis(analysis);
		} catch (err: unknown) {
			setError(
				err instanceof Error
					? err.message
					: "Ошибка разбора прайс-листа. Обратитесь к разработчикам.",
			);
		} finally {
			/*
			 * Снятие флага стоит в `finally`, а не в обеих ветках: `catch` ловит
			 * только исключения. Отмена запроса или отказ рендера между `await` и
			 * присваиванием оставляли бы `isPricelistAnalyzing` навсегда true, а
			 * первая строка функции на этом флаге делает ранний return — кнопка
			 * разбора прайса замолкала бы до перезагрузки страницы.
			 */
			setIsPricelistAnalyzing(false);
		}
	};

	return {
		isPricelistAnalyzing,
		pricelistAnalysis,
		pricelistImageBase64,
		pricelistImageName,
		pricelistImageNote,
		pricelistItemMaterialText,
		pricelistMaterialSummaryText,
		pricelistParserModeLabels,
		pricelistRecognitionBrandGroups,
		pricelistRecognitionServiceGroups,
		pricelistSourceKind,
		pricelistSourceKindLabels,
		pricelistText,
		pricelistWarningsText,
		setPricelistAnalysis,
		setPricelistSourceKind,
		setPricelistText,
		setUsePricelistAi,
		usePricelistAi,
		analyzePricelist,
		attachPricelistImage,
		clearPricelistImage,
	};
}
