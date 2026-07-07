import { floodFill } from '../../../../utilities/segmentation';
export function segmentLargestUSOutlineFromBuffer(buffer, width, height) {
    const totalPixels = width * height;
    const channelCount = buffer.length / totalPixels;
    if (![1, 3, 4].includes(channelCount)) {
        throw new Error('Buffer must be 1, 3, or 4 channels per pixel');
    }
    const mask = Array.from({ length: height }, () => new Array(width).fill(false));
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const pixelIndex = y * width + x;
            const base = pixelIndex * channelCount;
            let isForeground = false;
            for (let c = 0; c < Math.min(3, channelCount); c++) {
                if (buffer[base + c] > 0) {
                    isForeground = true;
                    break;
                }
            }
            mask[y][x] = isForeground;
        }
    }
    const labels = Array.from({ length: height }, () => new Array(width).fill(0));
    let currentLabel = 0;
    const regionSizes = {};
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            if (mask[y][x] && labels[y][x] === 0) {
                currentLabel++;
                const getter = (px, py) => {
                    if (px < 0 || px >= width || py < 0 || py >= height) {
                        return false;
                    }
                    return mask[py][px] && labels[py][px] === 0;
                };
                let pixelCount = 0;
                const options = {
                    onFlood: (px, py) => {
                        labels[py][px] = currentLabel;
                        pixelCount++;
                    },
                    diagonals: false,
                };
                floodFill(getter, [x, y], options);
                regionSizes[currentLabel] = pixelCount;
            }
        }
    }
    if (currentLabel === 0) {
        return [];
    }
    const largestLabel = Object.keys(regionSizes).reduce((a, b) => regionSizes[a] > regionSizes[b] ? a : b);
    function isBorder(x, y) {
        if (labels[y][x] !== +largestLabel) {
            return false;
        }
        for (const [dx, dy] of [
            [1, 0],
            [-1, 0],
            [0, 1],
            [0, -1],
        ]) {
            const nx = x + dx, ny = y + dy;
            if (nx < 0 ||
                nx >= width ||
                ny < 0 ||
                ny >= height ||
                labels[ny][nx] !== +largestLabel) {
                return true;
            }
        }
        return false;
    }
    let start = null;
    outer: for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            if (isBorder(x, y)) {
                start = [x, y];
                break outer;
            }
        }
    }
    if (!start) {
        return [];
    }
    const dirs = [
        [1, 0],
        [1, 1],
        [0, 1],
        [-1, 1],
        [-1, 0],
        [-1, -1],
        [0, -1],
        [1, -1],
    ];
    const contour = [];
    let current = start;
    let prev = [start[0] - 1, start[1]];
    do {
        contour.push([current[0], current[1]]);
        const dx0 = prev[0] - current[0], dy0 = prev[1] - current[1];
        let startDir = dirs.findIndex((d) => d[0] === dx0 && d[1] === dy0);
        if (startDir < 0) {
            startDir = 0;
        }
        let nextPt = null;
        for (let k = 1; k <= 8; k++) {
            const [dx, dy] = dirs[(startDir + k) % 8];
            const nx = current[0] + dx, ny = current[1] + dy;
            if (nx >= 0 && nx < width && ny >= 0 && ny < height && isBorder(nx, ny)) {
                nextPt = [nx, ny];
                const [bdx, bdy] = dirs[(startDir + k - 1 + 8) % 8];
                prev = [current[0] + bdx, current[1] + bdy];
                break;
            }
        }
        if (!nextPt) {
            break;
        }
        current = nextPt;
    } while (current[0] !== start[0] || current[1] !== start[1]);
    return contour;
}
