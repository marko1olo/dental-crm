import { showToast } from "../../GlobalToast";
import type { PediatricMemoPrintData } from "./pediatricTypes";
import { generatePediatricMemoHtml } from "./pediatricMemoHtml";

/**
 * Вызов мгновенной печати памятки для родителей (A4).
 * Использует window.open с фоллбэком на скрытый iframe.
 */
export function printPediatricParentMemo(data: PediatricMemoPrintData): void {
	if (typeof window === "undefined") {
		return;
	}

	const html = generatePediatricMemoHtml(data);
	const printWindow = window.open("", "_blank");

	if (printWindow) {
		printWindow.document.write(html);
		printWindow.document.close();
		printWindow.focus();
		showToast("Памятка для родителей открыта для печати", "success");
	} else {
		const iframe = document.createElement("iframe");
		iframe.style.position = "fixed";
		iframe.style.right = "0";
		iframe.style.bottom = "0";
		iframe.style.width = "0";
		iframe.style.height = "0";
		iframe.style.border = "0";
		document.body.appendChild(iframe);
		iframe.contentDocument?.write(html);
		iframe.contentDocument?.close();
		iframe.contentWindow?.focus();
		iframe.contentWindow?.print();
		setTimeout(() => {
			if (iframe.parentNode) {
				document.body.removeChild(iframe);
			}
		}, 1000);
		showToast("Памятка для родителей отправлена на печать", "success");
	}
}
