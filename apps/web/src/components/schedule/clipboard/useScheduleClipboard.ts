import { useCallback, useEffect, useState } from "react";
import { useAppLogicContext } from "../../../contexts/AppLogicContext";
import { showToast } from "../../GlobalToast";
import {
	deleteClipboardItem,
	fetchClipboardItems,
	pasteClipboardItem,
} from "./clipboardApi";
import type { ClipboardItem } from "./clipboardTypes";
import { defaultPasteLocalValue, localValueToIso } from "./clipboardUtils";

export function useScheduleClipboard(onPasted?: (dashboard: unknown) => void) {
	const appLogic = useAppLogicContext();
	const auth = appLogic?.auth;

	const [items, setItems] = useState<ClipboardItem[]>([]);
	const [error, setError] = useState<string | null>(null);
	const [loading, setLoading] = useState(true);
	const [pasteStartsAt, setPasteStartsAt] = useState(defaultPasteLocalValue);
	const [busyId, setBusyId] = useState<string | null>(null);

	const load = useCallback(async () => {
		setError(null);
		setLoading(true);
		try {
			const res = await fetchClipboardItems(
				auth ? auth.denteClinicalReadHeaders() : {},
			);
			if (res.error) {
				setItems([]);
				setError(res.error);
			} else if (res.items) {
				setItems(res.items);
			}
		} finally {
			setLoading(false);
		}
	}, [auth]);

	useEffect(() => {
		void load();
	}, [load]);

	const clearItem = async (item: ClipboardItem) => {
		if (busyId) return;
		setBusyId(item.id);
		try {
			const res = await deleteClipboardItem(item.id);
			if (!res.ok) {
				if (res.error) showToast(res.error, "error");
				return;
			}
			setItems((prev) => prev.filter((row) => row.id !== item.id));
			showToast(`«${item.patientName}» убран из буфера`, "success");
		} finally {
			setBusyId(null);
		}
	};

	const pasteItem = async (item: ClipboardItem) => {
		const startsAtIso = localValueToIso(pasteStartsAt);
		if (!startsAtIso) {
			showToast("Укажите дату и время начала приёма для вставки.", "error");
			return;
		}
		if (busyId) return;
		setBusyId(item.id);
		try {
			const res = await pasteClipboardItem(item.id, startsAtIso);
			if (!res.ok) {
				if (res.error) showToast(res.error, "error");
				return;
			}
			setItems((prev) => prev.filter((row) => row.id !== item.id));
			showToast(
				`Приём «${item.patientName}» вставлен на выбранное время`,
				"success",
			);
			if (res.dashboard && onPasted) onPasted(res.dashboard);
		} finally {
			setBusyId(null);
		}
	};

	return {
		items,
		error,
		loading,
		pasteStartsAt,
		setPasteStartsAt,
		busyId,
		load,
		clearItem,
		pasteItem,
	};
}
