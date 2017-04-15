
/// <reference path="gl.ts" />
/// <reference path="tensor.ts" />
/// <reference path="shader.ts" />

class buffer_info
{
        private loc: buffer_location;
        private len: number;

        constructor(loc: buffer_location, len: number)
        {
                this.loc = loc;
                this.len = len;
        }

        public get_buf(): buffer_location
        {
                return this.loc;
        }

        public get_len(): number
        {
                return this.len;
        }
}

interface if_renderable
{
        available_attributes(): Array<shader_input>;
        upload(backend: if_raster_backend, o: shader_input): Array<buffer_info>
        unload(backend: if_raster_backend): void
        get_buffer(o: shader_input): Array<buffer_info>;
        is_permanent(): boolean;
        affine_transform(): mat4;
}



class trimesh implements if_renderable
{
        public vertices = new Array<vec3>();
        public texcoords = new Array<vec2>();
        public normals = new Array<vec3>();
        public indices = Array<number>();

        public global_trans: mat4;
        public is_static: boolean;

        constructor()
        {
        }

        public affine_transform(): mat4
        {
                return this.global_trans;
        }

        public is_permanent(): boolean
        {
                return this.is_static;
        }

        public available_attributes(): Array<shader_input>
        {
                var types = new Array<shader_input>();
                types.push(shader_input.position);
                if (this.has_index())
                        types.push(shader_input.index);
                if (this.has_normal())
                        types.push(shader_input.normal);
                if (this.has_tex_coords())
                        types.push(shader_input.texcoord);
                return types;
        }

        public get_vertex_transform(): mat4
        {
                return this.global_trans;
        }

        public get_vertices_f32(): Float32Array
        {
                var data = new Float32Array(this.vertices.length * 3);
                for (var v = 0; v < this.vertices.length; v++) {
                        data[3 * v + 0] = this.vertices[v].x;
                        data[3 * v + 1] = this.vertices[v].y;
                        data[3 * v + 2] = this.vertices[v].z;
                }
                return data;
        }

        public get_normals_f32(): Float32Array
        {
                var data = new Float32Array(this.normals.length * 3);
                for (var v = 0; v < this.normals.length; v++) {
                        data[3 * v + 0] = this.normals[v].x;
                        data[3 * v + 1] = this.normals[v].y;
                        data[3 * v + 2] = this.normals[v].z;
                }
                return data;
        }

        public get_texcoords_f32(): Float32Array
        {
                var data = new Float32Array(this.texcoords.length * 2);
                for (var v = 0; v < this.texcoords.length; v++) {
                        data[3 * v + 0] = this.texcoords[v].x;
                        data[3 * v + 1] = this.texcoords[v].y;
                }
                return data;
        }

        public get_indices_u32(): Uint32Array
        {
                return new Uint32Array(this.indices);
        }

        public get_multi_indices_u16(): Array<Uint16Array>
        {
                var m_idx = new Array<Uint16Array>();
                var n_idx = this.idx_buf_count();
                var base = 0;
                for (var i = 0; i < n_idx; i++) {
                        var arr = new Uint16Array(this.idx_buf_length(i));
                        for (var j = 0; j < arr.length; j++)
                                arr[j] = this.indices[base + j];
                        base += arr.length;
                        m_idx.push(arr);
                }
                return m_idx;
        }

        public has_normal(): boolean
        {
                return this.normals.length != 0;
        }

        public has_tex_coords(): boolean
        {
                return this.texcoords.length != 0;
        }

        public has_index(): boolean
        {
                return this.indices.length != 0;
        }

        private readonly NUM_DATA_BUFS = 3;
        private readonly HAS_UINT16_RESTRICTION = true;

        private vbos = new Array<buffer_location>();
        private ibo = new Array<buffer_location>();
        private num_idx_buffers = 0;

        public idx_buf_count(): number 
        {
                return this.HAS_UINT16_RESTRICTION ? Math.ceil(this.indices.length / 0XFFFF) : 1;
        }

        public idx_buf_length(bloc: number): number
        {
                return this.HAS_UINT16_RESTRICTION ? Math.min(0XFFFF, this.indices.length - bloc * 0XFFFF) : this.indices.length;
        }

        private realloc(backend: if_raster_backend): void
        {
                for (var i = 0; i < this.NUM_DATA_BUFS; i++) {
                        if (this.vbos[i] == null)
                                this.vbos[i] = backend.attri_buf_create();
                }

                var new_idx_count = this.idx_buf_count();

                if (new_idx_count > this.num_idx_buffers) {
                        for (var i = this.num_idx_buffers; i < new_idx_count; i++) {
                                this.ibo[i] = backend.index_buf_create();
                        }
                }
                this.num_idx_buffers = new_idx_count;
        }

        public upload(backend: if_raster_backend, o: shader_input): Array<buffer_info>
        {
                this.realloc(backend);

                switch (o) {
                        case shader_input.position:
                                backend.attri_buf_writef32(this.vbos[shader_input.position], this.get_vertices_f32(), 3, this.is_permanent());
                                return [new buffer_info(this.vbos[shader_input.position], this.vertices.length)];

                        case shader_input.normal:
                                if (!this.has_normal())
                                        throw new Error("This mesh doesn't have the normal attributes.");
                                backend.attri_buf_writef32(this.vbos[shader_input.normal], this.get_normals_f32(), 3, this.is_permanent());
                                return [new buffer_info(this.vbos[shader_input.normal], this.normals.length)];

                        case shader_input.texcoord:
                                if (!this.has_tex_coords())
                                        throw new Error("This mesh doesn't have the texcoord attributes.");
                                backend.attri_buf_writef32(this.vbos[shader_input.texcoord], this.get_texcoords_f32(), 2, this.is_permanent());
                                return [new buffer_info(this.vbos[shader_input.texcoord], this.texcoords.length)];

                        case shader_input.index:
                                if (!this.has_index())
                                        throw new Error("This mesh does't have index.");
                                if (this.HAS_UINT16_RESTRICTION) {
                                        var m_idx: Array<Uint16Array> = this.get_multi_indices_u16();
                                        var infos = new Array<buffer_info>();
                                        for (var i = 0; i < this.num_idx_buffers; i++) {
                                                backend.index_buf_write_u16(this.ibo[i], m_idx[i], this.is_permanent());
                                                infos[i] = new buffer_info(this.ibo[i], m_idx[i].length);
                                        }
                                        return infos;
                                } else {
                                        backend.index_buf_write_u32(this.ibo[0], this.get_indices_u32(), this.is_permanent());
                                        return [new buffer_info(this.ibo[0], this.indices.length)];
                                }
                }
        }

        public unload(backend: if_raster_backend): void
        {
                for (var i = 0; i < this.vbos.length; i++) {
                        backend.attri_buf_delete(this.vbos[i]);
                        this.vbos[i] = null;
                }

                for (var i = 0; i < this.ibo.length; i++) {
                        backend.index_buf_delete(this.ibo[i]);
                        this.ibo[i] = null;
                }

                this.num_idx_buffers = 0;
        }

        public get_buffer(o: shader_input): Array<buffer_info>
        {
                switch (o) {
                        case shader_input.position:
                                return [new buffer_info(this.vbos[shader_input.position], this.vertices.length)];

                        case shader_input.normal:
                                if (!this.has_normal())
                                        throw new Error("This mesh doesn't have the normal attributes.");
                                return [new buffer_info(this.vbos[shader_input.normal], this.normals.length)];

                        case shader_input.texcoord:
                                if (!this.has_tex_coords())
                                        throw new Error("This mesh doesn't have the texcoord attributes.");
                                return [new buffer_info(this.vbos[shader_input.texcoord], this.texcoords.length)];

                        case shader_input.index:
                                if (!this.has_index())
                                        throw new Error("This mesh does't have index.");
                                if (this.HAS_UINT16_RESTRICTION) {
                                        var infos = new Array<buffer_info>();
                                        for (var i = 0; i < this.num_idx_buffers; i++) {
                                                infos[i] = new buffer_info(this.ibo[i], this.idx_buf_length(i));
                                        }
                                        return infos;
                                } else {
                                        return [new buffer_info(this.ibo[0], this.indices.length)];
                                }
                }
        }
}