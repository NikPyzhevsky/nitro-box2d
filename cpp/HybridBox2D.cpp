#include "HybridBox2D.hpp"

#include "Box2DCore.hpp"
#include "HybridWorld.hpp"

#include <stdexcept>

namespace margelo::nitro::nitrobox2d {

std::string HybridBox2D::getVersion() {
  b2Version version = b2GetVersion();
  return std::to_string(version.major) + "." + std::to_string(version.minor) + "." + std::to_string(version.revision);
}

std::shared_ptr<HybridWorldSpec> HybridBox2D::createWorld(const WorldDef& def) {
  return std::make_shared<HybridWorld>(def);
}

void HybridBox2D::setLengthUnitsPerMeter(double unitsPerMeter) {
  float value = core::toFloat(unitsPerMeter, "unitsPerMeter");
  if (value <= 0.0f) {
    throw std::runtime_error("unitsPerMeter must be greater than zero.");
  }
  // Global to the library, not per world: Box2D bakes it into the tolerances it
  // compares against, so changing it while a world exists invalidates that world.
  b2SetLengthUnitsPerMeter(value);
}

double HybridBox2D::getLengthUnitsPerMeter() {
  return static_cast<double>(b2GetLengthUnitsPerMeter());
}

} // namespace margelo::nitro::nitrobox2d
