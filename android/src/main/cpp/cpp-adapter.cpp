#include <jni.h>
#include <fbjni/fbjni.h>
#include "NitroBox2dOnLoad.hpp"

JNIEXPORT jint JNICALL JNI_OnLoad(JavaVM* vm, void*) {
  return facebook::jni::initialize(vm, []() {
    margelo::nitro::nitrobox2d::registerAllNatives();
  });
}
