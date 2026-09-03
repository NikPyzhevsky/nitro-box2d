require "json"

package = JSON.parse(File.read(File.join(__dir__, "package.json")))

Pod::Spec.new do |s|
  s.name         = "NitroBox2d"
  s.version      = package["version"]
  s.summary      = package["description"]
  s.homepage     = package["homepage"]
  s.license      = package["license"]
  s.authors      = package["author"]

  s.platforms    = { :ios => min_ios_version_supported, :visionos => 1.0 }
  s.source       = { :git => "https://github.com/mrousavy/nitro.git", :tag => "#{s.version}" }

  s.source_files = [
    # Objective-C++ registration, if any
    "ios/**/*.{h,m,mm,cpp}",
    # Cross-platform C++ implementation
    "cpp/**/*.{hpp,cpp}",
    # Vendored Box2D v3, compiled straight into the pod. It is plain C with no
    # generated config header, so there is nothing to build ahead of time and no
    # binary to ship per architecture.
    "third_party/box2d/include/**/*.h",
    "third_party/box2d/src/**/*.{c,h}",
  ]

  # Box2D's headers are an implementation detail of this pod. Keeping them out of
  # the public header dir stops `box2d/base.h` and friends from colliding with
  # anything else in the app's header search paths.
  s.private_header_files = "third_party/box2d/**/*.h"

  s.pod_target_xcconfig = {
    "CLANG_CXX_LANGUAGE_STANDARD" => "c++20",
    "CLANG_CXX_LIBRARY" => "libc++",
    # Box2D needs C17 for `_Static_assert` and anonymous unions.
    "GCC_C_LANGUAGE_STANDARD" => "gnu17",
    "HEADER_SEARCH_PATHS" => [
      "\"$(PODS_TARGET_SRCROOT)/third_party/box2d/include\"",
      "\"$(PODS_TARGET_SRCROOT)/third_party/box2d/src\"",
      "\"$(PODS_TARGET_SRCROOT)/cpp\"",
    ].join(" "),
  }
  s.libraries = "c++"

  load 'nitrogen/generated/ios/NitroBox2d+autolinking.rb'
  add_nitrogen_files(s)

  s.dependency 'React-jsi'
  s.dependency 'React-callinvoker'
  install_modules_dependencies(s)
end
