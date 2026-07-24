import { useEffect, useState } from "react";

export function useIsActiveTab(viewName: string): boolean {
	const [isActive, setIsActive] = useState(() => {
		if (typeof window === "undefined") return false;
		const currentHash = window.location.hash.replace(/^#\/?/, "").split("?")[0];
		return currentHash === viewName || !currentHash;
	});

	useEffect(() => {
		const handleHashChange = () => {
			const hash = window.location.hash.replace(/^#\/?/, "");
			setIsActive(hash === viewName);
		};

		// Initial check
		handleHashChange();

		window.addEventListener("hashchange", handleHashChange);
		return () => {
			window.removeEventListener("hashchange", handleHashChange);
		};
	}, [viewName]);

	return isActive;
}
