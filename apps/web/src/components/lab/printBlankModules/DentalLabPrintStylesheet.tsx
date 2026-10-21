import React from "react";

export function DentalLabPrintStylesheet(): React.JSX.Element {
	return (
		<style>{`
			@media print {
				@page {
					size: A4 portrait;
					margin: 8mm 10mm;
				}
				html, body {
					background: #ffffff !important;
					color: #000000 !important;
					-webkit-print-color-adjust: exact !important;
					print-color-adjust: exact !important;
				}
				.print\\:hidden, button, header, nav, aside {
					display: none !important;
				}
				#printable-lab-order-sheet {
					border: none !important;
					box-shadow: none !important;
					padding: 0 !important;
					margin: 0 !important;
					background: #ffffff !important;
					color: #000000 !important;
				}
				#printable-lab-order-sheet,
				#printable-lab-order-sheet * {
					box-shadow: none !important;
					text-shadow: none !important;
				}
				#printable-lab-order-sheet .bg-slate-50,
				#printable-lab-order-sheet .bg-slate-100,
				#printable-lab-order-sheet .bg-slate-200 {
					background-color: transparent !important;
					background: transparent !important;
				}
				#printable-lab-order-sheet .border-slate-200,
				#printable-lab-order-sheet .border-slate-300,
				#printable-lab-order-sheet .border-slate-400 {
					border-color: #000000 !important;
				}
				#printable-lab-order-sheet .bg-slate-900 {
					background-color: #ffffff !important;
					color: #000000 !important;
					border: 2px solid #000000 !important;
					font-weight: 800 !important;
				}
				.break-inside-avoid,
				tr,
				.teeth-avoid-break,
				.spec-avoid-break,
				.tracker-avoid-break {
					break-inside: avoid !important;
					page-break-inside: avoid !important;
				}
			}
		`}</style>
	);
}
