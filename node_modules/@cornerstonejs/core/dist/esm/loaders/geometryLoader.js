import '@kitware/vtk.js/Rendering/Profiles/Geometry';
import cache from '../cache/cache';
import { GeometryType } from '../enums';
import { createContourSet } from './utils/contourSet/createContourSet';
import { createSurface } from './utils/surface/createSurface';
import { createMesh } from './utils/mesh/createMesh';
import Events from '../enums/Events';
import eventTarget from '../eventTarget';
import triggerEvent from '../utilities/triggerEvent';
import { cornerstoneMeshLoader } from './cornerstoneMeshLoader';
let loaderOptions = {
    beforeSend(xhr) {
    },
};
export function setOptions(newOptions) {
    loaderOptions = Object.assign(loaderOptions, newOptions);
}
export function getOptions() {
    return loaderOptions;
}
const geometryLoaders = {};
let unknownGeometryLoader;
function loadGeometryFromGeometryLoader(geometryId, options) {
    const colonIndex = geometryId.indexOf(':');
    const scheme = geometryId.substring(0, colonIndex);
    let loader = geometryLoaders[scheme];
    if (loader === undefined || loader === null) {
        if (unknownGeometryLoader == null ||
            typeof unknownGeometryLoader !== 'function') {
            throw new Error(`No geometry loader for scheme ${scheme} has been registered`);
        }
        loader = unknownGeometryLoader;
    }
    const geometryLoadObject = loader(geometryId, options, loaderOptions);
    geometryLoadObject.promise.then(function (geometry) {
        triggerEvent(eventTarget, Events.GEOMETRY_LOADED, { geometry });
    }, function (error) {
        const errorObject = {
            geometryId,
            error,
        };
        triggerEvent(eventTarget, Events.GEOMETRY_LOADED_FAILED, errorObject);
    });
    return geometryLoadObject;
}
export function loadGeometry(geometryId, options) {
    if (geometryId === undefined) {
        throw new Error('loadGeometry: parameter geometryId must not be undefined');
    }
    let geometryLoadObject = cache.getGeometryLoadObject(geometryId);
    if (geometryLoadObject !== undefined) {
        return geometryLoadObject.promise;
    }
    geometryLoadObject = loadGeometryFromGeometryLoader(geometryId, options);
    return geometryLoadObject.promise;
}
export async function loadAndCacheGeometry(geometryId, options) {
    if (geometryId === undefined) {
        throw new Error('createAndCacheGeometry: parameter geometryId must not be undefined');
    }
    let geometryLoadObject = cache.getGeometryLoadObject(geometryId);
    if (geometryLoadObject !== undefined) {
        return geometryLoadObject.promise;
    }
    geometryLoadObject = loadGeometryFromGeometryLoader(geometryId, options);
    await cache.putGeometryLoadObject(geometryId, geometryLoadObject);
    return geometryLoadObject.promise;
}
export function createAndCacheGeometry(geometryId, options) {
    if (geometryId === undefined) {
        throw new Error('createAndCacheGeometry: parameter geometryId must not be undefined');
    }
    let geometry = cache.getGeometry(geometryId);
    if (geometry) {
        return geometry;
    }
    if (options.type === GeometryType.CONTOUR) {
        geometry = createContourSet(geometryId, options.geometryData);
    }
    else if (options.type === GeometryType.SURFACE) {
        geometry = createSurface(geometryId, options.geometryData);
    }
    else if (options.type === GeometryType.MESH) {
        createMesh(geometryId, options.geometryData).then((mesh) => {
            geometry = mesh;
        });
    }
    else {
        throw new Error(`Unknown geometry type: ${options.type}`);
    }
    cache.putGeometrySync(geometryId, geometry);
    return geometry;
}
export function registerGeometryLoader(scheme, geometryLoader) {
    geometryLoaders[scheme] = geometryLoader;
}
export function registerUnknownGeometryLoader(geometryLoader) {
    const oldGeometryLoader = unknownGeometryLoader;
    unknownGeometryLoader = geometryLoader;
    return oldGeometryLoader;
}
registerGeometryLoader('mesh', cornerstoneMeshLoader);
