#pragma once

#include "HybridBox2DSpec.hpp"

namespace margelo::nitro::nitrobox2d {

class HybridBox2D: public HybridBox2DSpec {
public:
  HybridBox2D(): HybridObject(TAG) {}

  std::string getVersion() override;

  std::shared_ptr<HybridWorldSpec> createWorld(const WorldDef& def) override;

  void setLengthUnitsPerMeter(double unitsPerMeter) override;
  double getLengthUnitsPerMeter() override;
};

} // namespace margelo::nitro::nitrobox2d
