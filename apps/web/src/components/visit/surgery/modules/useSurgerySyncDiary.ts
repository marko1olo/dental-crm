import { useEffect, useRef } from "react";
import { useVisitStore } from "../../../../store/visitStore";

/**
 * useSurgerySyncDiary — Дебаунсированная синхронизация протокола операции в объективный статус медкарты.
 */
export function useSurgerySyncDiary(protocolText: string) {
	const lastSyncedProtocolRef = useRef<string>("");

	useEffect(() => {
		if (!protocolText || protocolText === lastSyncedProtocolRef.current) return;
		const timer = setTimeout(() => {
			const setVisitNoteForm = useVisitStore.getState().setVisitNoteForm;
			if (setVisitNoteForm) {
				setVisitNoteForm((prev) => {
					const prevObj = prev.objectiveStatus || "";
					const lastSnippet = lastSyncedProtocolRef.current;
					let newObj = prevObj;
					if (lastSnippet && newObj.includes(lastSnippet)) {
						newObj = newObj.replace(lastSnippet, protocolText);
					} else {
						newObj = newObj ? `${newObj}\n\n${protocolText}` : protocolText;
					}
					lastSyncedProtocolRef.current = protocolText;
					return { ...prev, objectiveStatus: newObj };
				});
			}
		}, 800);
		return () => clearTimeout(timer);
	}, [protocolText]);
}
