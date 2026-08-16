import { create } from "zustand";
import {
	safeLocalStorageGetItem,
	safeLocalStorageSetItem,
} from "../lib/safeLocalStorage";

export type WorkspacePerspective =
	| "standard"
	| "chairsider"
	| "frontdesk"
	| "pediatric"
	| "presentation"
	| "orthodontic";

export const perspectiveLabels: Record<WorkspacePerspective, string> = {
	standard: "Стандартный обзор",
	chairsider: "Планшет у кресла (Стерильный)",
	frontdesk: "Ресепшн и Касса 54-ФЗ",
	pediatric: "Детский приём (Молочный прикус)",
	presentation: "Второй экран (Для пациента)",
	orthodontic: "Ортодонтия (Таймлайн)",
};

export const perspectiveDescriptions: Record<WorkspacePerspective, string> = {
	standard: "Полный рабочий стол со всеми клиническими и административными модулями.",
	chairsider: "Крупные тач-кнопки ≥64px, голосовое управление без рук, быстрый доступ к КТ.",
	frontdesk: "Экспресс-касса 54-ФЗ, справки НДФЛ в 1 клик, утренний обзвон без перегруза.",
	pediatric: "Молочная зубная формула (51–85), привязка родителей, детские протоколы.",
	presentation: "Чистый экран без себестоимости и заметок, 3 варианта плана, расчет рассрочки и вычета.",
	orthodontic: "Таймлайн активаций брекетов/элайнеров, фотопротокол до/после, абонентские платежи.",
};

const PERSPECTIVE_STORAGE_KEY = "dente_workspace_perspective";

function isWorkspacePerspective(value: unknown): value is WorkspacePerspective {
	return (
		value === "standard" ||
		value === "chairsider" ||
		value === "frontdesk" ||
		value === "pediatric" ||
		value === "presentation" ||
		value === "orthodontic"
	);
}

function readWorkspacePerspective(): WorkspacePerspective {
	const stored = safeLocalStorageGetItem(PERSPECTIVE_STORAGE_KEY);
	return isWorkspacePerspective(stored) ? stored : "standard";
}

export interface PerspectiveState {
	perspective: WorkspacePerspective;
	setPerspective: (perspective: WorkspacePerspective) => void;
	reset: () => void;
}

export const usePerspectiveStore = create<PerspectiveState>((set) => ({
	perspective: readWorkspacePerspective(),
	setPerspective: (perspective) => {
		safeLocalStorageSetItem(PERSPECTIVE_STORAGE_KEY, perspective);
		set({ perspective });
	},
	reset: () => set({ perspective: readWorkspacePerspective() }),
}));

if (typeof window !== "undefined") {
	(
		window as Window & { __usePerspectiveStore?: typeof usePerspectiveStore }
	).__usePerspectiveStore = usePerspectiveStore;
}
