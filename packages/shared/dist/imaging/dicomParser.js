/**
 * ═══════════════════════════════════════════════════════════════════════════
 * CLINICAL DICOM PARSER & METADATA EXTRACTOR
 * High-performance binary parser for dental radiography & CBCT slices
 * ═══════════════════════════════════════════════════════════════════════════
 */
export const LONG_EXPLICIT_VRS = new Set([
    "OB",
    "OD",
    "OF",
    "OL",
    "OV",
    "OW",
    "SQ",
    "UC",
    "UR",
    "UT",
    "UN",
]);
export function cleanDicomString(bytes) {
    let str = "";
    for (let i = 0; i < bytes.length; i++) {
        const code = bytes[i];
        if (code === 0)
            continue; // skip null terminators
        str += String.fromCharCode(code);
    }
    const cleaned = str.replace(/\^/g, " ").replace(/\s+/g, " ").trim();
    return cleaned.length > 0 ? cleaned : null;
}
export function parseDicomNumber(value) {
    if (!value)
        return null;
    const num = Number.parseFloat(value.trim());
    return Number.isFinite(num) ? num : null;
}
export function parseMultiNumber(value, delimiter = "\\") {
    if (!value)
        return [];
    return value
        .split(delimiter)
        .map((s) => Number.parseFloat(s.trim()))
        .filter((n) => Number.isFinite(n));
}
export function formatTagHex(group, element) {
    return `${group.toString(16).padStart(4, "0")}${element.toString(16).padStart(4, "0")}`.toLowerCase();
}
/**
 * Parses binary DICOM data buffer (Uint8Array or Buffer) and extracts clinical imaging metadata.
 */
export function parseDicomDataset(input) {
    const buffer = input instanceof Uint8Array ? input : new Uint8Array(input);
    const warnings = [];
    let cursor = 0;
    let hasPreamble = false;
    // Check 128-byte preamble + "DICM" magic at offset 128
    if (buffer.length >= 132) {
        const magic = String.fromCharCode(buffer[128]) +
            String.fromCharCode(buffer[129]) +
            String.fromCharCode(buffer[130]) +
            String.fromCharCode(buffer[131]);
        if (magic === "DICM") {
            hasPreamble = true;
            cursor = 132;
        }
    }
    let patientId = null;
    let patientName = null;
    let modality = null;
    let studyInstanceUid = null;
    let seriesInstanceUid = null;
    let sopInstanceUid = null;
    let studyDate = null;
    let studyDescription = null;
    let seriesDescription = null;
    let instanceNumber = null;
    let rows = 512;
    let columns = 512;
    let bitsAllocated = 16;
    let bitsStored = 16;
    let highBit = 15;
    let pixelRepresentation = 0;
    let samplesPerPixel = 1;
    let rowSpacing = 0.2;
    let colSpacing = 0.2;
    let sliceThickness = 0.5;
    let sliceLocation = null;
    let imagePositionPatient = null;
    let imageOrientationPatient = null;
    let rescaleIntercept = 0;
    let rescaleSlope = 1;
    let windowCenter = 500; // default dental bone
    let windowWidth = 2000;
    let photometricInterpretation = "MONOCHROME2";
    let transferSyntaxUid = null;
    const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
    const isExplicitVr = true;
    const isLittleEndian = true;
    const maxSteps = 8192;
    let steps = 0;
    while (cursor + 8 <= buffer.length && steps < maxSteps) {
        steps++;
        const group = view.getUint16(cursor, isLittleEndian);
        const element = view.getUint16(cursor + 2, isLittleEndian);
        const tag = formatTagHex(group, element);
        // Stop parsing if we reach PixelData tag (7FE0,0010)
        if (tag === "7fe00010") {
            break;
        }
        let valueLength = 0;
        let valueOffset = 0;
        if (group === 0x0002 || isExplicitVr) {
            const vr0 = String.fromCharCode(buffer[cursor + 4]);
            const vr1 = String.fromCharCode(buffer[cursor + 5]);
            const vr = vr0 + vr1;
            if (LONG_EXPLICIT_VRS.has(vr)) {
                if (cursor + 12 > buffer.length)
                    break;
                valueLength = view.getUint32(cursor + 8, isLittleEndian);
                valueOffset = cursor + 12;
                cursor += 12 + valueLength;
            }
            else {
                if (cursor + 8 > buffer.length)
                    break;
                valueLength = view.getUint16(cursor + 6, isLittleEndian);
                valueOffset = cursor + 8;
                cursor += 8 + valueLength;
            }
        }
        else {
            // Implicit VR
            valueLength = view.getUint32(cursor + 4, isLittleEndian);
            valueOffset = cursor + 8;
            cursor += 8 + valueLength;
        }
        if (valueOffset + valueLength > buffer.length) {
            warnings.push(`Тег (${tag}): выход за пределы буфера данных.`);
            break;
        }
        const valBytes = buffer.subarray(valueOffset, valueOffset + valueLength);
        const strVal = cleanDicomString(valBytes);
        switch (tag) {
            case "00020010": // Transfer Syntax UID
                transferSyntaxUid = strVal;
                break;
            case "00080018": // SOP Instance UID
                sopInstanceUid = strVal;
                break;
            case "00080020": // Study Date
                studyDate = strVal;
                break;
            case "00080060": // Modality
                modality = strVal;
                break;
            case "00081030": // Study Description
                studyDescription = strVal;
                break;
            case "0008103e": // Series Description
                seriesDescription = strVal;
                break;
            case "00100010": // Patient Name
                patientName = strVal;
                break;
            case "00100020": // Patient ID
                patientId = strVal;
                break;
            case "00180050": // Slice Thickness
                {
                    const st = parseDicomNumber(strVal);
                    if (st !== null && st > 0)
                        sliceThickness = st;
                }
                break;
            case "0020000d": // Study Instance UID
                studyInstanceUid = strVal;
                break;
            case "0020000e": // Series Instance UID
                seriesInstanceUid = strVal;
                break;
            case "00200013": // Instance Number
                instanceNumber = parseDicomNumber(strVal);
                break;
            case "00200032": // Image Position (Patient)
                {
                    const nums = parseMultiNumber(strVal);
                    if (nums.length >= 3) {
                        imagePositionPatient = [nums[0], nums[1], nums[2]];
                    }
                }
                break;
            case "00200037": // Image Orientation (Patient)
                {
                    const nums = parseMultiNumber(strVal);
                    if (nums.length >= 6) {
                        imageOrientationPatient = [
                            nums[0],
                            nums[1],
                            nums[2],
                            nums[3],
                            nums[4],
                            nums[5],
                        ];
                    }
                }
                break;
            case "00201041": // Slice Location
                sliceLocation = parseDicomNumber(strVal);
                break;
            case "00280002": // Samples per Pixel
                if (valBytes.length >= 2) {
                    samplesPerPixel = view.getUint16(valueOffset, isLittleEndian) || 1;
                }
                else if (strVal) {
                    samplesPerPixel = parseDicomNumber(strVal) || 1;
                }
                break;
            case "00280004": // Photometric Interpretation
                if (strVal)
                    photometricInterpretation = strVal;
                break;
            case "00280010": // Rows
                if (valBytes.length >= 2) {
                    rows = view.getUint16(valueOffset, isLittleEndian) || rows;
                }
                else if (strVal) {
                    rows = parseDicomNumber(strVal) || rows;
                }
                break;
            case "00280011": // Columns
                if (valBytes.length >= 2) {
                    columns = view.getUint16(valueOffset, isLittleEndian) || columns;
                }
                else if (strVal) {
                    columns = parseDicomNumber(strVal) || columns;
                }
                break;
            case "00280030": // Pixel Spacing
                {
                    const sp = parseMultiNumber(strVal);
                    if (sp.length >= 2 && sp[0] > 0 && sp[1] > 0) {
                        rowSpacing = sp[0];
                        colSpacing = sp[1];
                    }
                }
                break;
            case "00280100": // Bits Allocated
                if (valBytes.length >= 2) {
                    bitsAllocated = view.getUint16(valueOffset, isLittleEndian) || bitsAllocated;
                }
                else if (strVal) {
                    bitsAllocated = parseDicomNumber(strVal) || bitsAllocated;
                }
                break;
            case "00280101": // Bits Stored
                if (valBytes.length >= 2) {
                    bitsStored = view.getUint16(valueOffset, isLittleEndian) || bitsStored;
                }
                else if (strVal) {
                    bitsStored = parseDicomNumber(strVal) || bitsStored;
                }
                break;
            case "00280102": // High Bit
                if (valBytes.length >= 2) {
                    highBit = view.getUint16(valueOffset, isLittleEndian) || highBit;
                }
                else if (strVal) {
                    highBit = parseDicomNumber(strVal) || highBit;
                }
                break;
            case "00280103": // Pixel Representation
                if (valBytes.length >= 2) {
                    pixelRepresentation = view.getUint16(valueOffset, isLittleEndian);
                }
                else if (strVal) {
                    pixelRepresentation = parseDicomNumber(strVal) || 0;
                }
                break;
            case "00281050": // Window Center
                {
                    const wc = parseDicomNumber(strVal);
                    if (wc !== null)
                        windowCenter = wc;
                }
                break;
            case "00281051": // Window Width
                {
                    const ww = parseDicomNumber(strVal);
                    if (ww !== null && ww > 0)
                        windowWidth = ww;
                }
                break;
            case "00281052": // Rescale Intercept
                {
                    const ri = parseDicomNumber(strVal);
                    if (ri !== null)
                        rescaleIntercept = ri;
                }
                break;
            case "00281053": // Rescale Slope
                {
                    const rs = parseDicomNumber(strVal);
                    if (rs !== null && rs > 0)
                        rescaleSlope = rs;
                }
                break;
        }
    }
    return {
        patientId,
        patientName,
        modality,
        studyInstanceUid,
        seriesInstanceUid,
        sopInstanceUid,
        studyDate,
        studyDescription,
        seriesDescription,
        instanceNumber,
        rows,
        columns,
        bitsAllocated,
        bitsStored,
        highBit,
        pixelRepresentation,
        samplesPerPixel,
        pixelSpacing: [rowSpacing, colSpacing],
        sliceThickness,
        sliceLocation,
        imagePositionPatient,
        imageOrientationPatient,
        rescaleIntercept,
        rescaleSlope,
        windowCenter,
        windowWidth,
        photometricInterpretation,
        voxelSpacing: {
            x: colSpacing,
            y: rowSpacing,
            z: sliceThickness,
        },
        hasPreamble,
        transferSyntaxUid,
        warnings,
    };
}
/**
 * Converts raw DICOM pixel value to calibrated Hounsfield Unit (HU).
 */
export function rawPixelToHounsfieldUnit(rawPixel, rescaleSlope = 1, rescaleIntercept = 0) {
    return rawPixel * rescaleSlope + rescaleIntercept;
}
