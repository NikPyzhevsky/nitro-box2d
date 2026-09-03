project(NitroBox2d)
cmake_minimum_required(VERSION 3.9.0)

set (PACKAGE_NAME NitroBox2d)
set (CMAKE_VERBOSE_MAKEFILE ON)
set (CMAKE_CXX_STANDARD 20)
set (CMAKE_CXX_STANDARD_REQUIRED ON)

set (BOX2D_DIR ${CMAKE_CURRENT_SOURCE_DIR}/../third_party/box2d)

# Box2D is vendored as plain C sources and compiled into this library rather than
# linked as a prebuilt archive: it has no generated config header, so there is
# nothing to configure ahead of time, and this keeps one .so per ABI.
file(GLOB BOX2D_SOURCES CONFIGURE_DEPENDS ${BOX2D_DIR}/src/*.c)

# Define C++ library and add all sources
add_library(${PACKAGE_NAME} SHARED
        src/main/cpp/cpp-adapter.cpp
        ../cpp/Box2DCore.cpp
        ../cpp/HybridBox2D.cpp
        ../cpp/HybridWorld.cpp
        ../cpp/HybridBody.cpp
        ../cpp/HybridShape.cpp
        ../cpp/HybridJoint.cpp
        ${BOX2D_SOURCES}
)

# Add Nitrogen specs :)
include(${CMAKE_SOURCE_DIR}/../nitrogen/generated/android/NitroBox2d+autolinking.cmake)

# Box2D needs C17 for `_Static_assert` and anonymous unions. The C++ standard is
# set globally above; this only affects the vendored .c files.
set_target_properties(${PACKAGE_NAME} PROPERTIES
        C_STANDARD 17
        C_STANDARD_REQUIRED ON
        C_EXTENSIONS ON
)

# Set up local includes
target_include_directories(${PACKAGE_NAME} PRIVATE
        src/main/cpp
        ../cpp
        ${BOX2D_DIR}/include
        ${BOX2D_DIR}/src
)

find_library(LOG_LIB log)

# Link all libraries together
target_link_libraries(
        ${PACKAGE_NAME}
        ${LOG_LIB}
        android                                   # <-- Android core
)
