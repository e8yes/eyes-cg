#include "testrunner.h"
#include "testbidirectlt2renderer.h"
#include "testbidirectmisrenderer.h"
#include "testcamera.h"
#include "testdirectrenderer.h"
#include "testframe.h"
#include "testgeometry.h"
#include "testgltfresource.h"
#include "testobjdb.h"
#include "testresource.h"
#include "testscene.h"
#include "testtensor.h"
#include "testunidirectlt1renderer.h"
#include "testunidirectrenderer.h"
#include <cstring>
#include <iostream>
#include <vector>

test::test_runner::test_runner() {}

test::test_runner::test_runner(test_runner const &other) {
    m_tests = other.m_tests;
    m_status = other.m_status;
}

test::test_runner::~test_runner() {
    for (std::pair<std::string, if_test *> const &e : m_tests) {
        delete e.second;
    }
}

void test::test_runner::run_all() const {
    for (std::pair<std::string, if_test *> const &e : m_tests) {
        run(e.first);
    }
}

void test::test_runner::run(std::string const &t) const {
    if (m_status.at(t)) {
        m_tests.at(t)->run();
        std::cout << "Test case " << t << " has passed." << std::endl;
    }
}

void test::test_runner::add(std::string const &t, if_test *inst, bool status) {
    m_tests[t] = inst;
    m_status[t] = status;
}

void test::test_runner::enable(std::string const &t) { m_status[t] = true; }

void test::test_runner::disable(std::string const &t) { m_status[t] = false; }

test::test_runner test::load(int argc, char **argv) {
    test_runner runner;
    runner.add("test_tensor", new test_tensor(), false);
    runner.add("test_geometry", new test_geometry(), false);
    runner.add("test_resource", new test_resource(), false);
    runner.add("test_gltf_resource", new test_gltf_resource(), false);
    runner.add("test_camera", new test_camera(), false);
    runner.add("test_path_space", new test_path_space(), false);
    runner.add("test_direct_renderer", new test_direct_renderer(), false);
    runner.add("test_unidirect_lt1_renderer", new test_unidirect_lt1_renderer(), false);
    runner.add("test_unidirect_renderer", new test_unidirect_renderer(), false);
    runner.add("test_bidirect_lt2_renderer", new test_bidirect_lt2_renderer(), false);
    runner.add("test_bidirect_mis_renderer", new test_bidirect_mis_renderer(), false);
    runner.add("test_frame", new test_frame(), false);
    runner.add("test_objdb", new test_objdb(), false);

    for (int i = 1; i < argc; i++) {
        if ((!std::strcmp(argv[i], "--test") || !std::strcmp(argv[i], "-t")) && (i + 1 < argc)) {
            runner.enable(argv[i + 1]);
        }
    }
    return runner;
}
