/**
 * @file screenCaptureHelper.ts
 * @description Вспомогательные скрипты PowerShell и буферы для захвата экрана и ROI.
 */

export const MINIMAL_FALLBACK_PNG = Buffer.from(
	"iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
	"base64",
);

export function buildCaptureScript(
	savePathPs: string,
	roi?: { x: number; y: number; width: number; height: number },
): string {
	if (roi) {
		return `Add-Type -AssemblyName System.Windows.Forms,System.Drawing; $rect = New-Object System.Drawing.Rectangle(${roi.x}, ${roi.y}, ${roi.width}, ${roi.height}); $bmp = New-Object System.Drawing.Bitmap $rect.Width, $rect.Height; $g = [System.Drawing.Graphics]::FromImage($bmp); $g.CopyFromScreen($rect.Location, [System.Drawing.Point]::Empty, $rect.Size); $bmp.Save('${savePathPs}', [System.Drawing.Imaging.ImageFormat]::Png); $g.Dispose(); $bmp.Dispose();`;
	}
	return `Add-Type -AssemblyName System.Windows.Forms,System.Drawing; $b = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds; $bmp = New-Object System.Drawing.Bitmap $b.Width, $b.Height; $g = [System.Drawing.Graphics]::FromImage($bmp); $g.CopyFromScreen($b.Location, [System.Drawing.Point]::Empty, $b.Size); $bmp.Save('${savePathPs}', [System.Drawing.Imaging.ImageFormat]::Png); $g.Dispose(); $bmp.Dispose();`;
}
