
/// <reference path="mesh.ts" />
/// <reference path="material.ts" />
/// <reference path="light.ts" />


class scene
{
        private rend = new Map<string, if_renderable>();
        private mats = new Map<string, if_material>();
        private mat_in_rend = new Map<string, string>();
        private lights = new Map<string, if_light>();
        private default_id = 139280;

        constructor()
        {
        }

        public add_renderable(mesh: if_renderable, id: string): void
        {
                this.rend.set(id, mesh);
        }

        public add_material(mat: if_material, id: string): void
        {
                this.mats.set(id, mat);
        }

        public add_light(light: if_light, id: string): void
        {
                this.lights.set(id, light);
        }

        public assign_material_to_renderable(mat_id: string, mesh_id: string): boolean
        {
                if (!this.mats.has(mat_id) || !this.rend.has(mesh_id))
                        return false;
                this.mat_in_rend.set(mesh_id, mat_id);
                return true;
        }

        public gen_default_id(): string
        {
                this.default_id++;
                return this.default_id.toString();
        }

        public load_from_obj_str(id: string, obj_str: string, transform: mat4, is_static: boolean): Map<string, trimesh>
        {
                // 1. The obj data is assumed to be all triangulated.
                // 2. default id is used.
                var mesh: trimesh = new trimesh();

                // Temps.
                var vertices = new Array<vec3>();
                var normals = new Array<vec3>();
                var texcoords = new Array<vec2>();

                var iverts = new Array<number>();
                var inorms = new Array<number>();
                var itex = new Array<number>();

                // array of lines separated by the newline
                var lines: Array<string> = obj_str.split('\n');

                var VERTEX_RE = /^v\s/;
                var NORMAL_RE = /^vn\s/;
                var TEXTURE_RE = /^vt\s/;
                var FACE_RE = /^f\s/;
                var WHITESPACE_RE = /\s+/;


                for (var i = 0; i < lines.length; i++) {
                        try {
                                var line: string = lines[i].trim();
                                var elements: Array<string> = line.split(WHITESPACE_RE);
                                elements.shift();

                                if (VERTEX_RE.test(line)) {
                                        vertices.push(new vec3(parseFloat(elements[0]),
                                                parseFloat(elements[1]),
                                                parseFloat(elements[2])));
                                } else if (NORMAL_RE.test(line)) {
                                        normals.push(new vec3(parseFloat(elements[0]),
                                                parseFloat(elements[1]),
                                                parseFloat(elements[2])));
                                } else if (TEXTURE_RE.test(line)) {
                                        texcoords.push(new vec3(parseFloat(elements[0]),
                                                parseFloat(elements[1]),
                                                parseFloat(elements[2])));
                                } else if (FACE_RE.test(line)) {
                                        if (elements.length != 3) {
                                                // This face is not acceptible.
                                                console.log("load_from_obj_str() - at line " + (i + 1).toString()
                                                        + ". Couldn't accept polygon other than triangle.");
                                                continue;
                                        }

                                        for (var v = 0; v < 3; v++) {
                                                var vert_indices: Array<string> = elements[v].split("/");
                                                if (vert_indices.length != 3)
                                                        throw new Error("Malformed data at line " + (i + 1).toString()
                                                                + " where attribute " + (v + 1).toString()
                                                                + " doesn't have at least 3 vertex attributes");

                                                if (vert_indices[0].length == 0)
                                                        throw new Error("Malformed data at line " + (i + 1).toString()
                                                                + " where vertex index is missing.");
                                                else {
                                                        var iattri = parseInt(vert_indices[0]) - 1;
                                                        if (iattri < 0 || iattri >= vertices.length)
                                                                throw new Error("At line " + (i + 1).toString()
                                                                        + ", attribute " + (v + 1).toString()
                                                                        + " referenced vertex " + (iattri + 1).toString()
                                                                        + " is illegal.");
                                                        iverts.push(iattri);
                                                }

                                                if (vert_indices[1].length != 0) {
                                                        var iattri = parseInt(vert_indices[1]) - 1;
                                                        if (iattri < 0 || iattri >= texcoords.length)
                                                                throw new Error("At line " + (i + 1).toString()
                                                                        + ", attribute " + (v + 1).toString()
                                                                        + " referenced texcoord " + (iattri + 1).toString()
                                                                        + " is illegal.");
                                                        itex.push(iattri);
                                                }

                                                if (vert_indices[2].length != 0) {
                                                        var iattri = parseInt(vert_indices[2]) - 1;
                                                        if (iattri < 0 || iattri >= normals.length)
                                                                throw new Error("At line " + (i + 1).toString()
                                                                        + ", attribute " + (v + 1).toString()
                                                                        + " referenced normal " + (iattri + 1).toString()
                                                                        + " is illegal.");
                                                        inorms.push(iattri);
                                                }
                                        }
                                }
                        } catch (e) {
                                throw new Error("Malformed data at line " + (i + 1).toString() + ". nested exception: " + e.toString());
                        }
                }

                // Assemble the face indices with vertex attributes -- shift vertex data to the proper location.
                if ((iverts.length != itex.length && itex.length != 0) ||
                        (iverts.length != inorms.length && inorms.length != 0)) {
                        throw new Error("Vertex attributes mismatch as "
                                + "|v|=" + iverts.length + ",|n|=" + inorms.length + ",|t|=" + itex.length);
                }

                if (vertices.length == 0)
                        throw new Error("The mesh doesn't contain vertex data");

                // Vertices are already in the right place.
                mesh.vertices = vertices;
                if (inorms.length != 0)
                        mesh.normals.fill(new vec3(0, 0, 0), 0, vertices.length);
                if (itex.length != 0)
                        mesh.texcoords.fill(new vec2(0, 0), 0, vertices.length);
                for (var v = 0; v < iverts.length; v++) {
                        mesh.indices.push(iverts[v]);
                        mesh.normals[iverts[v]] = normals[inorms[v]];
                        mesh.texcoords[iverts[v]] = texcoords[itex[v]];
                }

                mesh.is_static = is_static;
                mesh.global_trans = transform == null ? mat4_identity() : transform;

                // Adde object to scene.
                id = id == null ? this.gen_default_id() : id;
                this.add_renderable(mesh, id);

                // Return info.
                var m = new Map<string, trimesh>();
                m.set(id, mesh);
                return m;
        }

        public get_relevant_renderables(f: frustum): Map<if_renderable, if_material>
        {
                var this_: scene = this;
                var result = new Map<if_renderable, if_material>();
                this.rend.forEach(function (rend: if_renderable, id: string, m)
                {
                        var mat_id = this_.mat_in_rend.get(id);
                        result.set(rend, mat_id != null ? this_.mats.get(mat_id) : null);
                });
                return result;
        }

        public get_relevant_lights(f: frustum): Array<if_light>
        {
                var result = new Array<if_light>();
                this.lights.forEach(function (light: if_light, id, m)
                {
                        result.push(light);
                });
                return result;
        }

        public get_all_renderable_ids(): Array<string>
        {
                var ids = new Array<string>();
                this.rend.forEach(function (rend: if_renderable, id: string, m)
                {
                        ids.push(id);
                });
                return ids;
        }

        public get_all_material_ids(): Array<string>
        {
                var ids = new Array<string>();
                this.mats.forEach(function (mat: if_material, id: string, m)
                {
                        ids.push(id);
                });
                return ids;
        }

        public get_renderable(id: string): if_renderable
        {
                return this.rend.get(id);
        }

        public get_renderable_material(rend_id: string): if_material
        {
                var mat_id = this.mat_in_rend.get(rend_id);
                return mat_id != null ? this.mats.get(mat_id) : null;
        }

        public clear(): void
        {
                this.rend.clear();
                this.mats.clear();
                this.mat_in_rend.clear();
        }
}