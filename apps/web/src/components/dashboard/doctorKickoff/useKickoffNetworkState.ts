import { useEffect, useState } from "react";
import { isOfflineAutonomyMode } from "../../../lib/offlineStorage";

export function useKickoffNetworkState(isOffline?: boolean | undefined) {
	const [offlineMode, setOfflineMode] = useState<boolean>(() => {
		if (typeof isOffline === "boolean") return isOffline;
		if (typeof navigator !== "undefined" && !navigator.onLine) return true;
		return isOfflineAutonomyMode();
	});

	useEffect(() => {
		if (typeof isOffline === "boolean") {
			setOfflineMode(isOffline);
			return;
		}

		const handleOnline = () => setOfflineMode(isOfflineAutonomyMode());
		const handleOffline = () => setOfflineMode(true);

		if (typeof window !== "undefined") {
			window.addEventListener("online", handleOnline);
			window.addEventListener("offline", handleOffline);
			return () => {
				window.removeEventListener("online", handleOnline);
				window.removeEventListener("offline", handleOffline);
			};
		}
	}, [isOffline]);

	return { offlineMode };
}
