# This code is adapted from the `scad2gltf` module.
# Source: https://gitlab.com/bath_open_instrumentation_group/scad2gltf

import os
import platform
import shutil
import subprocess
import tempfile
import argparse
import glob
import re
import pygltflib
import numpy as np
from stl import mesh

class Compiler3D():

    def __init__(self, scadfile: str, output_dir: str):

        self.scadfile = scadfile.replace("/", os.sep).replace("\\", os.sep)
        self.output_dir = output_dir.replace("/", os.sep).replace("\\", os.sep)
        self.csgfile = None
        self.colours = []
        self.files = []
        self.tempdir = None

    @property
    def openscad_exe(self):
        if platform.system() == "Windows":
            return "C:\Program Files\OpenSCAD\openscad.exe"
        else:
            return "openscad"


    def scad_to_csg(self) -> None:
        scadfilename = os.path.basename(self.scadfile)
        csgfilename = scadfilename[:-4] + "csg"
        self.csgfile = os.path.join(self.tempdir, csgfilename)
        subprocess.run([self.openscad_exe] + [self.scadfile, "-o", self.csgfile], check=True)


    def open_colour_file(self, colour: list) -> object:
        filename = os.path.join(self.tempdir, f"coloured{len(self.files)}")
        self.files.append(filename)
        self.colours.append(colour)
        file = open(filename+".csg", "w")
        file.write("rotate([-90,0,0]) {\n")
        return file
    
    def close_colour_file(self, file: object, line_count: int) -> None:
        file.write("}")
        file.close()
        if line_count == 0:
            self.colours.pop()
            self.files.pop()


    def split_csg_by_colour(self) -> None:
        with open(self.csgfile, "r") as csg_in:
            csg_out = self.open_colour_file([1,1,1,1])
            line_count = 0
            line = csg_in.readline()
            while line != "":
                match = re.match(r"(color\((\[[\d., ]+\])\);)", line)
                if match != None:
                    self.close_colour_file(csg_out, line_count)
                    line_count = 0
                    csg_out = self.open_colour_file([float(j) for j in match.group(2)[1:-1].split(",")])
                line_count += 1
                csg_out.write(line)
                line = csg_in.readline()
            self.close_colour_file(csg_out, line_count)
    

    def stl_to_mesh(self, filename) -> tuple:
        stl_mesh = mesh.Mesh.from_file(filename)

        stl_points = []
        for i in range(0, len(stl_mesh.points)): # Convert points into correct numpy array
            stl_points.append([stl_mesh.points[i][0],stl_mesh.points[i][1],stl_mesh.points[i][2]])
            stl_points.append([stl_mesh.points[i][3],stl_mesh.points[i][4],stl_mesh.points[i][5]])
            stl_points.append([stl_mesh.points[i][6],stl_mesh.points[i][7],stl_mesh.points[i][8]])

        points = np.array(
            stl_points,
            dtype="float32",
        )

        stl_normals = []
        for normal in stl_mesh.normals:
            magnitude = np.sqrt(np.sum(normal**2))
            if magnitude<1e-10:
                #Give zero magnitude elements and aribary unit vector to keep GLTF format happy
                normal_vector = np.asarray([1,0,0])
            else:
                normal_vector = normal/magnitude
            stl_normals.append(normal_vector)
            stl_normals.append(normal_vector)
            stl_normals.append(normal_vector)

        normals = np.array(
            stl_normals,
            dtype="float32"
        )
        return points, normals


    def stls_to_gltf(self) -> None:

        nodes = []
        node_numbers = []
        meshes = []
        bufferviews = []
        accessors = []
        materials = []
        running_buffer_len=0
        blob = None

        for i, filename in enumerate(self.files):
            points, normals = self.stl_to_mesh(f"{filename}.stl")
            points_binary_blob = points.tobytes()
            normals_binary_blob = normals.tobytes()

            points_buf_no = 2*i
            normal_buf_no = points_buf_no+1

            node_numbers.append(i)
            nodes.append(pygltflib.Node(mesh=i))

            attribute = pygltflib.Attributes(POSITION=points_buf_no, NORMAL=normal_buf_no)
            primitive = pygltflib.Primitive(attributes=attribute, indices=None, material=i)
            meshes.append(pygltflib.Mesh(primitives=[primitive]))

            pbr_metal = pygltflib.PbrMetallicRoughness(baseColorFactor = self.colours[i])
            material = pygltflib.Material(pbrMetallicRoughness=pbr_metal,
                                        name=f"color{i}")
            materials.append(material)

            points_accessor = pygltflib.Accessor(bufferView=points_buf_no,
                                                componentType=pygltflib.FLOAT,
                                                count=len(points),
                                                type=pygltflib.VEC3,
                                                max=points.max(axis=0).tolist(),
                                                min=points.min(axis=0).tolist())
            normals_accessor = pygltflib.Accessor(bufferView=normal_buf_no,
                                                componentType=pygltflib.FLOAT,
                                                count=len(normals),
                                                type=pygltflib.VEC3,
                                                max=None,
                                                min=None)
            accessors.append(points_accessor)
            accessors.append(normals_accessor)

            points_buffer = pygltflib.BufferView(buffer=0,
                                                byteOffset=running_buffer_len,
                                                byteLength=len(points_binary_blob),
                                                target=pygltflib.ARRAY_BUFFER)
            running_buffer_len += len(points_binary_blob)
            normals_buffer = pygltflib.BufferView(buffer=0,
                                                byteOffset=running_buffer_len,
                                                byteLength=len(normals_binary_blob),
                                                target=pygltflib.ARRAY_BUFFER)
            running_buffer_len += len(normals_binary_blob)
            bufferviews.append(points_buffer)
            bufferviews.append(normals_buffer)

            if blob is None:
                blob = points_binary_blob
            else:
                blob += points_binary_blob
            blob += normals_binary_blob

        gltf = pygltflib.GLTF2(
            scene=0,
            scenes=[pygltflib.Scene(nodes=node_numbers)],
            nodes=nodes,
            meshes=meshes,
            materials=materials,
            accessors=accessors,
            bufferViews=bufferviews,
            buffers=[pygltflib.Buffer(byteLength=running_buffer_len)],
        )
        gltf.set_binary_blob(blob)
        gltf.save(os.path.join(self.output_dir, f"{self.scadfile.rsplit(os.sep,1)[-1][:-4]}glb"))


    def execute(self) -> None:
        # initialize temporary directory
        self.tempdir = tempfile.mkdtemp()
        try:
            # prepare csg files
            self.scad_to_csg()
            self.split_csg_by_colour()
            # prepare stl files
            for filename in self.files:
                subprocess.run([self.openscad_exe] + [f"{filename}.csg", "-o", f"{filename}.stl"], check=True)
            # compile glb file
            self.stls_to_gltf()
        finally:
            # clean up files
            shutil.rmtree(self.tempdir)


if __name__ == "__main__":

    parser = argparse.ArgumentParser(description="Convert .scad files into .glb")
    parser.add_argument("-o", "--output", metavar="dir", default="assets/3d",
                        help="Folder to save output into")
    parser.add_argument("files", nargs="*", default=["3d_src/*"],
                        help="Path(s) of the .scad file(s)")
    args = parser.parse_args()

    for pattern in args.files:
        for file in glob.glob(pattern):
            if os.path.isfile(file):
                print(f"\nProcessing {file}\n")
                compiler = Compiler3D("3d_src/nuclear1.scad", "assets/3d")
                compiler.execute()
