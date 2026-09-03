#include "HybridShape.hpp"

#include <stdexcept>
#include <utility>

namespace margelo::nitro::nitrobox2d {
namespace {

const char* shapeTypeName(b2ShapeType type) {
  switch (type) {
    case b2_circleShape:
      return "circle";
    case b2_capsuleShape:
      return "capsule";
    case b2_segmentShape:
      return "segment";
    case b2_polygonShape:
      return "polygon";
    case b2_chainSegmentShape:
      return "chain segment";
    default:
      return "unknown";
  }
}

} // namespace

HybridShape::HybridShape(b2ShapeId shapeId, WorldHandleRef world)
    : HybridObject(TAG), _shapeId(shapeId), _world(std::move(world)) {}

b2ShapeId HybridShape::require() const {
  core::requireWorld(_world);
  if (!b2Shape_IsValid(_shapeId)) {
    throw std::runtime_error("This shape has been destroyed.");
  }
  return _shapeId;
}

b2ShapeId HybridShape::requireType(b2ShapeType expected, const char* accessor) const {
  b2ShapeId shapeId = require();
  b2ShapeType actual = b2Shape_GetType(shapeId);
  if (actual != expected) {
    throw std::runtime_error(std::string(accessor) + " is only available on a " + shapeTypeName(expected) +
                             " shape, but this one is a " + shapeTypeName(actual) + ".");
  }
  return shapeId;
}

b2ShapeId HybridShape::shapeId() const {
  return _shapeId;
}

double HybridShape::getId() {
  return static_cast<double>(_shapeId.index1);
}

double HybridShape::getBodyId() {
  return static_cast<double>(b2Shape_GetBody(require()).index1);
}

ShapeType HybridShape::getType() {
  return static_cast<ShapeType>(b2Shape_GetType(require()));
}

bool HybridShape::getIsValid() {
  return _world != nullptr && !_world->destroyed && b2Shape_IsValid(_shapeId);
}

bool HybridShape::getIsSensor() {
  return b2Shape_IsSensor(require());
}

double HybridShape::getDensity() {
  return static_cast<double>(b2Shape_GetDensity(require()));
}

void HybridShape::setDensity(double density) {
  // `true` recomputes the owning body's mass, which is what you want in every
  // case where you would bother changing density at runtime.
  b2Shape_SetDensity(require(), core::toFloat(density, "density"), true);
}

double HybridShape::getFriction() {
  return static_cast<double>(b2Shape_GetFriction(require()));
}

void HybridShape::setFriction(double friction) {
  b2Shape_SetFriction(require(), core::toFloat(friction, "friction"));
}

double HybridShape::getRestitution() {
  return static_cast<double>(b2Shape_GetRestitution(require()));
}

void HybridShape::setRestitution(double restitution) {
  b2Shape_SetRestitution(require(), core::toFloat(restitution, "restitution"));
}

bool HybridShape::getEnableContactEvents() {
  return b2Shape_AreContactEventsEnabled(require());
}

void HybridShape::setEnableContactEvents(bool enableContactEvents) {
  b2Shape_EnableContactEvents(require(), enableContactEvents);
}

bool HybridShape::getEnableSensorEvents() {
  return b2Shape_AreSensorEventsEnabled(require());
}

void HybridShape::setEnableSensorEvents(bool enableSensorEvents) {
  b2Shape_EnableSensorEvents(require(), enableSensorEvents);
}

bool HybridShape::getEnableHitEvents() {
  return b2Shape_AreHitEventsEnabled(require());
}

void HybridShape::setEnableHitEvents(bool enableHitEvents) {
  b2Shape_EnableHitEvents(require(), enableHitEvents);
}

void HybridShape::setFilter(const Filter& filter) {
  b2Shape_SetFilter(require(), core::toB2Filter(filter));
}

Filter HybridShape::getFilter() {
  return core::fromB2Filter(b2Shape_GetFilter(require()));
}

bool HybridShape::testPoint(const Vec2& point) {
  return b2Shape_TestPoint(require(), core::toB2(point));
}

std::vector<double> HybridShape::getAABB() {
  b2AABB aabb = b2Shape_GetAABB(require());
  return {static_cast<double>(aabb.lowerBound.x), static_cast<double>(aabb.lowerBound.y),
          static_cast<double>(aabb.upperBound.x), static_cast<double>(aabb.upperBound.y)};
}

Circle HybridShape::getCircle() {
  b2Circle circle = b2Shape_GetCircle(requireType(b2_circleShape, "getCircle()"));
  return Circle(core::fromB2(circle.center), static_cast<double>(circle.radius));
}

Capsule HybridShape::getCapsule() {
  b2Capsule capsule = b2Shape_GetCapsule(requireType(b2_capsuleShape, "getCapsule()"));
  return Capsule(core::fromB2(capsule.center1), core::fromB2(capsule.center2), static_cast<double>(capsule.radius));
}

Segment HybridShape::getSegment() {
  b2Segment segment = b2Shape_GetSegment(requireType(b2_segmentShape, "getSegment()"));
  return Segment(core::fromB2(segment.point1), core::fromB2(segment.point2));
}

std::vector<Vec2> HybridShape::getPolygonPoints() {
  b2Polygon polygon = b2Shape_GetPolygon(requireType(b2_polygonShape, "getPolygonPoints()"));

  std::vector<Vec2> points;
  points.reserve(static_cast<size_t>(polygon.count));
  for (int i = 0; i < polygon.count; i++) {
    points.push_back(core::fromB2(polygon.vertices[i]));
  }
  return points;
}

void HybridShape::destroy() {
  b2DestroyShape(require(), true);
}

} // namespace margelo::nitro::nitrobox2d
