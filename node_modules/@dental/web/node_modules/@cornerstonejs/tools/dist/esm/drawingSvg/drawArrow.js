import drawLine from './drawLine';
const svgns = 'http://www.w3.org/2000/svg';
export default function drawArrow(svgDrawingHelper, annotationUID, arrowUID, start, end, options = {}) {
    if (isNaN(start[0]) || isNaN(start[1]) || isNaN(end[0]) || isNaN(end[1])) {
        return;
    }
    const { viaMarker = false, color = 'rgb(0, 255, 0)', markerSize = 10, } = options;
    if (!viaMarker) {
        legacyDrawArrow(svgDrawingHelper, annotationUID, arrowUID, start, end, options);
        return;
    }
    const layerId = svgDrawingHelper.svgLayerElement.id;
    const markerBaseId = `arrow-${annotationUID}`;
    const markerFullId = `${markerBaseId}-${layerId}`;
    const defs = svgDrawingHelper.svgLayerElement.querySelector('defs');
    let arrowMarker = defs.querySelector(`#${markerFullId}`);
    if (!arrowMarker) {
        arrowMarker = document.createElementNS(svgns, 'marker');
        arrowMarker.setAttribute('id', markerFullId);
        arrowMarker.setAttribute('viewBox', '0 0 10 10');
        arrowMarker.setAttribute('refX', '8');
        arrowMarker.setAttribute('refY', '5');
        arrowMarker.setAttribute('markerWidth', `${markerSize}`);
        arrowMarker.setAttribute('markerHeight', `${markerSize}`);
        arrowMarker.setAttribute('orient', 'auto');
        const arrowPath = document.createElementNS(svgns, 'path');
        arrowPath.setAttribute('d', 'M 0 0 L 10 5 L 0 10 z');
        arrowPath.setAttribute('fill', color);
        arrowMarker.appendChild(arrowPath);
        defs.appendChild(arrowMarker);
    }
    else {
        arrowMarker.setAttribute('markerWidth', `${markerSize}`);
        arrowMarker.setAttribute('markerHeight', `${markerSize}`);
        const arrowPath = arrowMarker.querySelector('path');
        if (arrowPath) {
            arrowPath.setAttribute('fill', color);
        }
    }
    options.markerEndId = markerFullId;
    drawLine(svgDrawingHelper, annotationUID, arrowUID, start, end, options);
}
function legacyDrawArrow(svgDrawingHelper, annotationUID, arrowUID, start, end, options = {}) {
    const { color = 'rgb(0, 255, 0)', width = 2, lineWidth, lineDash } = options;
    const headLength = 10;
    const angle = Math.atan2(end[1] - start[1], end[0] - start[0]);
    const firstLine = {
        start: [
            end[0] - headLength * Math.cos(angle - Math.PI / 7),
            end[1] - headLength * Math.sin(angle - Math.PI / 7),
        ],
        end: end,
    };
    const secondLine = {
        start: [
            end[0] - headLength * Math.cos(angle + Math.PI / 7),
            end[1] - headLength * Math.sin(angle + Math.PI / 7),
        ],
        end: end,
    };
    drawLine(svgDrawingHelper, annotationUID, arrowUID, start, end, {
        color,
        width,
        lineWidth,
        lineDash,
    });
    drawLine(svgDrawingHelper, annotationUID, '2', firstLine.start, firstLine.end, {
        color,
        width,
        lineWidth,
        lineDash,
    });
    drawLine(svgDrawingHelper, annotationUID, '3', secondLine.start, secondLine.end, {
        color,
        width,
        lineWidth,
        lineDash,
    });
}
