import vtkConstants from '@kitware/vtk.js/Rendering/Core/VolumeMapper/Constants';
const { BlendMode } = vtkConstants;
export var BlendModes;
(function (BlendModes) {
    BlendModes[BlendModes["COMPOSITE"] = BlendMode.COMPOSITE_BLEND] = "COMPOSITE";
    BlendModes[BlendModes["MAXIMUM_INTENSITY_BLEND"] = BlendMode.MAXIMUM_INTENSITY_BLEND] = "MAXIMUM_INTENSITY_BLEND";
    BlendModes[BlendModes["MINIMUM_INTENSITY_BLEND"] = BlendMode.MINIMUM_INTENSITY_BLEND] = "MINIMUM_INTENSITY_BLEND";
    BlendModes[BlendModes["AVERAGE_INTENSITY_BLEND"] = BlendMode.AVERAGE_INTENSITY_BLEND] = "AVERAGE_INTENSITY_BLEND";
    BlendModes[BlendModes["LABELMAP_EDGE_PROJECTION_BLEND"] = BlendMode.LABELMAP_EDGE_PROJECTION_BLEND] = "LABELMAP_EDGE_PROJECTION_BLEND";
})(BlendModes || (BlendModes = {}));
export default BlendModes;
