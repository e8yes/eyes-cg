#include "testbidirectmisrenderer.h"
#include "src/frame.h"
#include "src/pipeline.h"

test::test_bidirect_mis_renderer::test_bidirect_mis_renderer() {}

test::test_bidirect_mis_renderer::~test_bidirect_mis_renderer() {}

void test::test_bidirect_mis_renderer::run() const {
    unsigned const width = 800;
    unsigned const height = 600;

    e8::img_file_frame img("test_bidirect_mis.png", width, height);
    e8::pt_render_pipeline pipeline(&img);

    e8util::flex_config config = pipeline.config_protocol();
    config.enum_sel["path_tracer"] = "bidirectional_mis";
    config.int_val["samples_per_frame"] = 128;
    config.int_val["num_threads"] = 0;
    pipeline.update_pipeline(config);

    pipeline.render_frame();
}
