declare module "vitest" {
	export const describe: any;
	export const it: any;
	export const expect: any;
	export const vi: any;
	export const beforeEach: any;
	export const afterEach: any;
}

declare module "qrcode.react" {
	const QRCodeSVG: any;
	const QRCodeCanvas: any;
	export { QRCodeSVG, QRCodeCanvas };
	export default QRCodeCanvas;
}

declare module "html2canvas" {
	const html2canvas: any;
	export default html2canvas;
}

declare module "jspdf" {
	const jsPDF: any;
	export { jsPDF };
	export default jsPDF;
}
