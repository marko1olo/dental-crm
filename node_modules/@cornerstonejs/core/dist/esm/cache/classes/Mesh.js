import vtkActor from '@kitware/vtk.js/Rendering/Core/Actor';
import vtkMapper from '@kitware/vtk.js/Rendering/Core/Mapper';
import vtkPLYReader from '@kitware/vtk.js/IO/Geometry/PLYReader';
import vtkSTLReader from '@kitware/vtk.js/IO/Geometry/STLReader';
import vtkXMLPolyDataReader from '@kitware/vtk.js/IO/XML/XMLPolyDataReader';
import vtkOBJReader from '@kitware/vtk.js/IO/Misc/OBJReader';
import vtkProperty from '@kitware/vtk.js/Rendering/Core/Property';
import vtkPolyDataNormals from '@kitware/vtk.js/Filters/Core/PolyDataNormals';
import { MeshType } from '../../enums';
export class Mesh {
    constructor(props) {
        this._color = [255, 255, 255];
        this._actors = [];
        this.id = props.id;
        this._color = props.color ?? this._color;
        this._format = props.format;
        const textDecoder = new TextDecoder();
        const normals = vtkPolyDataNormals.newInstance();
        const createActorWithMapper = (mapper) => {
            const actor = vtkActor.newInstance();
            actor.setMapper(mapper);
            const property = vtkProperty.newInstance();
            property.setColor(this._color[0] / 255, this._color[1] / 255, this._color[2] / 255);
            actor.setProperty(property);
            return actor;
        };
        if (this._format === MeshType.PLY) {
            const mapper = vtkMapper.newInstance();
            const reader = vtkPLYReader.newInstance();
            reader.parseAsArrayBuffer(props.arrayBuffer);
            mapper.setInputConnection(reader.getOutputPort());
            this._actors.push(createActorWithMapper(mapper));
        }
        else if (this._format === MeshType.STL) {
            const mapper = vtkMapper.newInstance();
            const reader = vtkSTLReader.newInstance();
            reader.parseAsArrayBuffer(props.arrayBuffer);
            normals.setInputConnection(reader.getOutputPort());
            mapper.setInputConnection(normals.getOutputPort());
            this._actors.push(createActorWithMapper(mapper));
        }
        else if (this._format === MeshType.OBJ) {
            const reader = vtkOBJReader.newInstance({
                splitMode: props.materialUrl ? 'usemtl' : null,
            });
            reader.parseAsText(textDecoder.decode(props.arrayBuffer));
            const size = reader.getNumberOfOutputPorts();
            for (let i = 0; i < size; i++) {
                const source = reader.getOutputData(i);
                const mapper = vtkMapper.newInstance();
                mapper.setInputData(source);
                this._actors.push(createActorWithMapper(mapper));
            }
        }
        else if (this._format === MeshType.VTP) {
            const mapper = vtkMapper.newInstance();
            const reader = vtkXMLPolyDataReader.newInstance();
            reader.parseAsArrayBuffer(props.arrayBuffer);
            mapper.setInputConnection(reader.getOutputPort());
            this._actors.push(createActorWithMapper(mapper));
        }
        this.sizeInBytes = this._getSizeInBytes();
    }
    _getSizeInBytes() {
        let size = 0;
        for (let i = 0; i < this._actors.length; i++) {
            const actor = this._actors[i];
            const mapper = actor.getMapper();
            const pd = mapper.getInputData();
            const points = pd.getPoints();
            const polys = pd.getPolys();
            const pointsLength = points.getData().length;
            const polysLength = polys.getData().length;
            size += pointsLength * 4 + polysLength * 4;
        }
        return size;
    }
    get defaultActor() {
        return this._actors[0];
    }
    get actors() {
        return this._actors;
    }
    get color() {
        return this._color;
    }
    get format() {
        return this._format;
    }
}
