#pragma once

#include "Box2DCore.hpp"
#include "HybridShapeSpec.hpp"

namespace margelo::nitro::nitrobox2d {

class HybridShape: public HybridShapeSpec {
public:
  HybridShape(b2ShapeId shapeId, WorldHandleRef world);

  double getId() override;
  double getBodyId() override;
  ShapeType getType() override;
  bool getIsValid() override;
  bool getIsSensor() override;

  double getDensity() override;
  void setDensity(double density) override;
  double getFriction() override;
  void setFriction(double friction) override;
  double getRestitution() override;
  void setRestitution(double restitution) override;
  bool getEnableContactEvents() override;
  void setEnableContactEvents(bool enableContactEvents) override;
  bool getEnableSensorEvents() override;
  void setEnableSensorEvents(bool enableSensorEvents) override;
  bool getEnableHitEvents() override;
  void setEnableHitEvents(bool enableHitEvents) override;

  void setFilter(const Filter& filter) override;
  Filter getFilter() override;
  bool testPoint(const Vec2& point) override;
  std::vector<double> getAABB() override;
  Circle getCircle() override;
  Capsule getCapsule() override;
  Segment getSegment() override;
  std::vector<Vec2> getPolygonPoints() override;

  void destroy() override;

  b2ShapeId shapeId() const;

private:
  /** Throws unless the world is alive and this shape still exists in it. */
  b2ShapeId require() const;
  /** Throws unless the shape is of `expected`, naming both types in the message. */
  b2ShapeId requireType(b2ShapeType expected, const char* accessor) const;

private:
  b2ShapeId _shapeId;
  WorldHandleRef _world;
};

} // namespace margelo::nitro::nitrobox2d
