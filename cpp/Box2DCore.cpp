#include "Box2DCore.hpp"

#include <cmath>
#include <cstdint>
#include <limits>
#include <stdexcept>
#include <vector>

namespace margelo::nitro::nitrobox2d::core {

b2WorldId requireWorld(const WorldHandleRef& handle) {
  if (handle == nullptr || handle->destroyed) {
    throw std::runtime_error("The world this object belongs to has been destroyed.");
  }
  return handle->id;
}

float toFloat(double value, const char* name) {
  if (!std::isfinite(value)) {
    throw std::runtime_error(std::string(name) + " must be a finite number.");
  }
  return static_cast<float>(value);
}

int toInt(double value, const char* name) {
  if (!std::isfinite(value)) {
    throw std::runtime_error(std::string(name) + " must be a finite number.");
  }
  if (value < static_cast<double>(std::numeric_limits<int>::min()) ||
      value > static_cast<double>(std::numeric_limits<int>::max())) {
    throw std::runtime_error(std::string(name) + " is outside int range.");
  }
  return static_cast<int>(std::lround(value));
}

b2Vec2 toB2(const Vec2& value) {
  return b2Vec2{toFloat(value.x, "x"), toFloat(value.y, "y")};
}

Vec2 fromB2(b2Vec2 value) {
  return Vec2(static_cast<double>(value.x), static_cast<double>(value.y));
}

b2Filter toB2Filter(const std::optional<Filter>& filter) {
  b2Filter result = b2DefaultFilter();
  if (!filter.has_value()) {
    return result;
  }

  if (filter->category.has_value()) {
    result.categoryBits = static_cast<uint64_t>(*filter->category);
  }
  if (filter->mask.has_value()) {
    result.maskBits = static_cast<uint64_t>(*filter->mask);
  }
  if (filter->groupIndex.has_value()) {
    result.groupIndex = toInt(*filter->groupIndex, "filter.groupIndex");
  }
  return result;
}

Filter fromB2Filter(b2Filter filter) {
  return Filter(static_cast<double>(filter.categoryBits), static_cast<double>(filter.maskBits),
                static_cast<double>(filter.groupIndex));
}

void* toUserData(const std::optional<double>& value) {
  if (!value.has_value() || !std::isfinite(*value)) {
    return nullptr;
  }
  auto tag = static_cast<intptr_t>(std::llround(*value));
  return reinterpret_cast<void*>(tag);
}

double fromUserData(void* userData) {
  return static_cast<double>(reinterpret_cast<intptr_t>(userData));
}

b2WorldDef toB2WorldDef(const WorldDef& def) {
  b2WorldDef result = b2DefaultWorldDef();

  if (def.gravity.has_value()) {
    result.gravity = toB2(*def.gravity);
  }
  if (def.restitutionThreshold.has_value()) {
    result.restitutionThreshold = toFloat(*def.restitutionThreshold, "restitutionThreshold");
  }
  if (def.hitEventThreshold.has_value()) {
    result.hitEventThreshold = toFloat(*def.hitEventThreshold, "hitEventThreshold");
  }
  if (def.contactHertz.has_value()) {
    result.contactHertz = toFloat(*def.contactHertz, "contactHertz");
  }
  if (def.contactDampingRatio.has_value()) {
    result.contactDampingRatio = toFloat(*def.contactDampingRatio, "contactDampingRatio");
  }
  if (def.maxContactPushSpeed.has_value()) {
    result.maxContactPushSpeed = toFloat(*def.maxContactPushSpeed, "maxContactPushSpeed");
  }
  if (def.maximumLinearSpeed.has_value()) {
    result.maximumLinearSpeed = toFloat(*def.maximumLinearSpeed, "maximumLinearSpeed");
  }
  if (def.enableSleep.has_value()) {
    result.enableSleep = *def.enableSleep;
  }
  if (def.enableContinuous.has_value()) {
    result.enableContinuous = *def.enableContinuous;
  }

  return result;
}

b2BodyDef toB2BodyDef(const BodyDef& def, std::string& nameStorage) {
  b2BodyDef result = b2DefaultBodyDef();

  if (def.type.has_value()) {
    result.type = static_cast<b2BodyType>(*def.type);
  }
  if (def.position.has_value()) {
    result.position = toB2(*def.position);
  }
  if (def.angle.has_value()) {
    result.rotation = b2MakeRot(toFloat(*def.angle, "angle"));
  }
  if (def.linearVelocity.has_value()) {
    result.linearVelocity = toB2(*def.linearVelocity);
  }
  if (def.angularVelocity.has_value()) {
    result.angularVelocity = toFloat(*def.angularVelocity, "angularVelocity");
  }
  if (def.linearDamping.has_value()) {
    result.linearDamping = toFloat(*def.linearDamping, "linearDamping");
  }
  if (def.angularDamping.has_value()) {
    result.angularDamping = toFloat(*def.angularDamping, "angularDamping");
  }
  if (def.gravityScale.has_value()) {
    result.gravityScale = toFloat(*def.gravityScale, "gravityScale");
  }
  if (def.sleepThreshold.has_value()) {
    result.sleepThreshold = toFloat(*def.sleepThreshold, "sleepThreshold");
  }
  if (def.fixedRotation.has_value()) {
    result.fixedRotation = *def.fixedRotation;
  }
  if (def.isBullet.has_value()) {
    result.isBullet = *def.isBullet;
  }
  if (def.isAwake.has_value()) {
    result.isAwake = *def.isAwake;
  }
  if (def.isEnabled.has_value()) {
    result.isEnabled = *def.isEnabled;
  }
  if (def.enableSleep.has_value()) {
    result.enableSleep = *def.enableSleep;
  }
  result.userData = toUserData(def.userData);

  if (def.name.has_value()) {
    nameStorage = *def.name;
    result.name = nameStorage.c_str();
  }

  return result;
}

b2ShapeDef toB2ShapeDef(const ShapeDef& def) {
  b2ShapeDef result = b2DefaultShapeDef();

  if (def.density.has_value()) {
    result.density = toFloat(*def.density, "density");
  }
  if (def.friction.has_value()) {
    result.material.friction = toFloat(*def.friction, "friction");
  }
  if (def.restitution.has_value()) {
    result.material.restitution = toFloat(*def.restitution, "restitution");
  }
  if (def.isSensor.has_value()) {
    result.isSensor = *def.isSensor;
  }
  if (def.enableContactEvents.has_value()) {
    result.enableContactEvents = *def.enableContactEvents;
  }
  if (def.enableSensorEvents.has_value()) {
    result.enableSensorEvents = *def.enableSensorEvents;
  }
  if (def.enableHitEvents.has_value()) {
    result.enableHitEvents = *def.enableHitEvents;
  }
  result.filter = toB2Filter(def.filter);
  result.userData = toUserData(def.userData);

  return result;
}

b2Circle toB2Circle(const Circle& circle) {
  return b2Circle{toB2(circle.center), toFloat(circle.radius, "radius")};
}

b2Capsule toB2Capsule(const Capsule& capsule) {
  return b2Capsule{toB2(capsule.center1), toB2(capsule.center2), toFloat(capsule.radius, "radius")};
}

b2Segment toB2Segment(const Segment& segment) {
  return b2Segment{toB2(segment.point1), toB2(segment.point2)};
}

b2Polygon toB2Polygon(const PolygonShape& polygon) {
  if (polygon.points.size() < 3) {
    throw std::runtime_error("A polygon needs at least 3 points.");
  }
  if (polygon.points.size() > B2_MAX_POLYGON_VERTICES) {
    throw std::runtime_error("A polygon can have at most " + std::to_string(B2_MAX_POLYGON_VERTICES) +
                             " points. Split the shape up, or attach several shapes to the same body.");
  }

  std::vector<b2Vec2> points;
  points.reserve(polygon.points.size());
  for (const Vec2& point : polygon.points) {
    points.push_back(toB2(point));
  }

  b2Hull hull = b2ComputeHull(points.data(), static_cast<int>(points.size()));
  if (hull.count < 3) {
    throw std::runtime_error("Could not build a convex hull from those points — they are collinear, "
                             "coincident, or too close together.");
  }

  float radius = polygon.radius.has_value() ? toFloat(*polygon.radius, "radius") : 0.0f;
  return b2MakePolygon(&hull, radius);
}

BodyState readBodyState(b2BodyId bodyId) {
  b2Vec2 position = b2Body_GetPosition(bodyId);
  b2Vec2 linearVelocity = b2Body_GetLinearVelocity(bodyId);

  return BodyState(static_cast<double>(bodyId.index1), fromB2(position),
                   static_cast<double>(b2Rot_GetAngle(b2Body_GetRotation(bodyId))), fromB2(linearVelocity),
                   static_cast<double>(b2Body_GetAngularVelocity(bodyId)), b2Body_IsAwake(bodyId),
                   fromUserData(b2Body_GetUserData(bodyId)));
}

} // namespace margelo::nitro::nitrobox2d::core
