import { cache } from '@cornerstonejs/core';
import { segmentLargestUSOutlineFromBuffer } from './segmentLargestUSOutlineFromBuffer';
import { generateConvexHullFromContour } from './generateConvexHullFromContour';
import { calculateFanShapeCorners } from './calculateFanShapeCorners';
import { deriveFanGeometry } from './deriveFanGeometry';
export function exportContourJpeg(pixelData, width, height, contour, opts = {}) {
    const { strokeStyle = '#f00', lineWidth = 2, quality = 0.92 } = opts;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    const totalPixels = width * height;
    const channels = pixelData.length / totalPixels;
    const imgData = ctx.createImageData(width, height);
    const out = imgData.data;
    for (let i = 0; i < totalPixels; i++) {
        const baseIn = i * channels;
        const baseOut = i * 4;
        if (channels === 1) {
            const v = pixelData[baseIn];
            out[baseOut] = v;
            out[baseOut + 1] = v;
            out[baseOut + 2] = v;
            out[baseOut + 3] = 255;
        }
        else {
            out[baseOut] = pixelData[baseIn];
            out[baseOut + 1] = pixelData[baseIn + 1];
            out[baseOut + 2] = pixelData[baseIn + 2];
            out[baseOut + 3] = channels === 4 ? pixelData[baseIn + 3] : 255;
        }
    }
    ctx.putImageData(imgData, 0, 0);
    if (contour.length > 0) {
        ctx.strokeStyle = strokeStyle;
        ctx.lineWidth = lineWidth;
        ctx.beginPath();
        ctx.moveTo(contour[0][0] + 0.5, contour[0][1] + 0.5);
        for (let i = 1; i < contour.length; i++) {
            ctx.lineTo(contour[i][0] + 0.5, contour[i][1] + 0.5);
        }
        ctx.closePath();
        ctx.stroke();
    }
    return canvas.toDataURL('image/jpeg', quality);
}
export function getPixelData(imageId) {
    const image = cache.getImage(imageId);
    if (!image) {
        return;
    }
    const width = image.width;
    const height = image.height;
    const pixelData = image.getPixelData();
    return {
        pixelData,
        width,
        height,
    };
}
export default function saveBinaryData(url, filename) {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.style.display = 'none';
    a.click();
    a.remove();
}
function exportFanJpeg(pixelData, width, height, fan, opts = {}) {
    const { center, startAngle: startAngleInDegrees, endAngle: endAngleInDegrees, innerRadius, outerRadius, } = fan;
    const { strokeStyle = '#0ff', lineWidth = 2, quality = 0.92 } = opts;
    const startAngle = (startAngleInDegrees * Math.PI) / 180;
    const endAngle = (endAngleInDegrees * Math.PI) / 180;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    const total = width * height;
    const channels = pixelData.length / total;
    const imgData = ctx.createImageData(width, height);
    const out = imgData.data;
    for (let i = 0; i < total; i++) {
        const baseOut = i * 4;
        if (channels === 1) {
            const v = pixelData[i];
            out[baseOut] = v;
            out[baseOut + 1] = v;
            out[baseOut + 2] = v;
            out[baseOut + 3] = 255;
        }
        else {
            const baseIn = i * channels;
            out[baseOut] = pixelData[baseIn];
            out[baseOut + 1] = pixelData[baseIn + 1];
            out[baseOut + 2] = pixelData[baseIn + 2];
            out[baseOut + 3] = channels === 4 ? pixelData[baseIn + 3] : 255;
        }
    }
    ctx.putImageData(imgData, 0, 0);
    ctx.beginPath();
    for (let a = startAngle; a <= endAngle; a += 0.01) {
        const x = center[0] + innerRadius * Math.cos(a);
        const y = center[1] + innerRadius * Math.sin(a);
        if (a === startAngle) {
            ctx.moveTo(x, y);
        }
        else {
            ctx.lineTo(x, y);
        }
    }
    for (let a = endAngle; a >= startAngle; a -= 0.01) {
        const x = center[0] + outerRadius * Math.cos(a);
        const y = center[1] + outerRadius * Math.sin(a);
        ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.strokeStyle = strokeStyle;
    ctx.lineWidth = lineWidth;
    ctx.stroke();
    return canvas.toDataURL('image/jpeg', quality);
}
export function downloadFanJpeg(imageId, contourType = 5) {
    const { contour, simplified, hull, refined, fanGeometry } = calculateFanGeometry(imageId);
    const { pixelData, width, height } = getPixelData(imageId) || {};
    if (!pixelData) {
        return;
    }
    let jpegDataUrl;
    if (contourType === 1) {
        jpegDataUrl = exportContourJpeg(pixelData, width, height, contour);
    }
    else if (contourType === 2) {
        jpegDataUrl = exportContourJpeg(pixelData, width, height, simplified);
    }
    else if (contourType === 3) {
        jpegDataUrl = exportContourJpeg(pixelData, width, height, hull);
    }
    else if (contourType === 4) {
        jpegDataUrl = exportContourJpeg(pixelData, width, height, [
            refined.P1,
            refined.P2,
            refined.P3,
            refined.P4,
        ]);
    }
    else {
        jpegDataUrl = exportFanJpeg(pixelData, width, height, fanGeometry, {
            strokeStyle: '#f00',
            lineWidth: 3,
            quality: 0.95,
        });
    }
    saveBinaryData(jpegDataUrl, 'contour.jpg');
}
export function calculateFanGeometry(imageId) {
    const { pixelData, width, height } = getPixelData(imageId) || {};
    if (!pixelData) {
        return;
    }
    const contour = segmentLargestUSOutlineFromBuffer(pixelData, width, height);
    const { simplified, hull } = generateConvexHullFromContour(contour);
    const refined = calculateFanShapeCorners(pixelData, width, height, hull, simplified);
    const fanGeometry = deriveFanGeometry({
        P1: refined.P1,
        P2: refined.P2,
        P3: refined.P3,
        P4: refined.P4,
    });
    return { contour, simplified, hull, refined, fanGeometry };
}
