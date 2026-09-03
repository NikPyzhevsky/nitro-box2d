#include "HybridBody.hpp"

#include "HybridShape.hpp"

#include <stdexcept>
#include <utility>

namespace margelo::nitro::nitrobox2d {

HybridBody::HybridBody(b2BodyId bodyId, WorldHandleRef world)
    : HybridObject(TAG), _bodyId(bodyId), _world(std::move(world)) {}

b2BodyId HybridBody::require() const {
  core::requireWorld(_world);
  if (!b2Body_IsValid(_bodyId)) {
    throw std::runtime_error("This body has been destroyed.");
  }
  return _bodyId;
}

b2BodyId HybridBody::bodyId() const {
  return _bodyId;
}

double HybridBody::getId() {
  return static_cast<double>(_bodyId.index1);
}

bool HybridBody::getIsValid() {
  return _world != nullptr && !_world->destroyed && b2Body_IsValid(_bodyId);
}

double HybridBody::getMass() {
  return static_cast<double>(b2Body_GetMass(require()));
}

double HybridBody::getRotationalInertia() {
  return static_cast<double>(b2Body_GetRotationalInertia(require()));
}

Vec2 HybridBody::getWorldCenterOfMass() {
  return core::fromB2(b2Body_GetWorldCenterOfMass(require()));
}

double HybridBody::getShapeCount() {
  return static_cast<double>(b2Body_GetShapeCount(require()));
}

BodyType HybridBody::getType() {
  return static_cast<BodyType>(b2Body_GetType(require()));
}

void HybridBody::setType(BodyType type) {
  b2Body_SetType(require(), static_cast<b2BodyType>(type));
}

Vec2 HybridBody::getPosition() {
  return core::fromB2(b2Body_GetPosition(require()));
}

void HybridBody::setPosition(const Vec2& position) {
  b2BodyId bodyId = require();
  b2Body_SetTransform(bodyId, core::toB2(position), b2Body_GetRotation(bodyId));
}

double HybridBody::getAngle() {
  return static_cast<double>(b2Rot_GetAngle(b2Body_GetRotation(require())));
}

void HybridBody::setAngle(double angle) {
  b2BodyId bodyId = require();
  b2Body_SetTransform(bodyId, b2Body_GetPosition(bodyId), b2MakeRot(core::toFloat(angle, "angle")));
}

Vec2 HybridBody::getLinearVelocity() {
  return core::fromB2(b2Body_GetLinearVelocity(require()));
}

void HybridBody::setLinearVelocity(const Vec2& linearVelocity) {
  b2Body_SetLinearVelocity(require(), core::toB2(linearVelocity));
}

double HybridBody::getAngularVelocity() {
  return static_cast<double>(b2Body_GetAngularVelocity(require()));
}

void HybridBody::setAngularVelocity(double angularVelocity) {
  b2Body_SetAngularVelocity(require(), core::toFloat(angularVelocity, "angularVelocity"));
}

double HybridBody::getLinearDamping() {
  return static_cast<double>(b2Body_GetLinearDamping(require()));
}

void HybridBody::setLinearDamping(double linearDamping) {
  b2Body_SetLinearDamping(require(), core::toFloat(linearDamping, "linearDamping"));
}

double HybridBody::getAngularDamping() {
  return static_cast<double>(b2Body_GetAngularDamping(require()));
}

void HybridBody::setAngularDamping(double angularDamping) {
  b2Body_SetAngularDamping(require(), core::toFloat(angularDamping, "angularDamping"));
}

double HybridBody::getGravityScale() {
  return static_cast<double>(b2Body_GetGravityScale(require()));
}

void HybridBody::setGravityScale(double gravityScale) {
  b2Body_SetGravityScale(require(), core::toFloat(gravityScale, "gravityScale"));
}

bool HybridBody::getFixedRotation() {
  return b2Body_IsFixedRotation(require());
}

void HybridBody::setFixedRotation(bool fixedRotation) {
  b2Body_SetFixedRotation(require(), fixedRotation);
}

bool HybridBody::getBullet() {
  return b2Body_IsBullet(require());
}

void HybridBody::setBullet(bool bullet) {
  b2Body_SetBullet(require(), bullet);
}

bool HybridBody::getAwake() {
  return b2Body_IsAwake(require());
}

void HybridBody::setAwake(bool awake) {
  b2Body_SetAwake(require(), awake);
}

bool HybridBody::getEnabled() {
  return b2Body_IsEnabled(require());
}

void HybridBody::setEnabled(bool enabled) {
  b2BodyId bodyId = require();
  if (enabled) {
    b2Body_Enable(bodyId);
  } else {
    b2Body_Disable(bodyId);
  }
}

double HybridBody::getUserData() {
  return core::fromUserData(b2Body_GetUserData(require()));
}

void HybridBody::setUserData(double userData) {
  b2Body_SetUserData(require(), core::toUserData(userData));
}

void HybridBody::setTransform(const Vec2& position, double angle) {
  b2Body_SetTransform(require(), core::toB2(position), b2MakeRot(core::toFloat(angle, "angle")));
}

void HybridBody::applyForce(const Vec2& force, const Vec2& point, bool wake) {
  b2Body_ApplyForce(require(), core::toB2(force), core::toB2(point), wake);
}

void HybridBody::applyForceToCenter(const Vec2& force, bool wake) {
  b2Body_ApplyForceToCenter(require(), core::toB2(force), wake);
}

void HybridBody::applyTorque(double torque, bool wake) {
  b2Body_ApplyTorque(require(), core::toFloat(torque, "torque"), wake);
}

void HybridBody::applyLinearImpulse(const Vec2& impulse, const Vec2& point, bool wake) {
  b2Body_ApplyLinearImpulse(require(), core::toB2(impulse), core::toB2(point), wake);
}

void HybridBody::applyLinearImpulseToCenter(const Vec2& impulse, bool wake) {
  b2Body_ApplyLinearImpulseToCenter(require(), core::toB2(impulse), wake);
}

void HybridBody::applyAngularImpulse(double impulse, bool wake) {
  b2Body_ApplyAngularImpulse(require(), core::toFloat(impulse, "impulse"), wake);
}

Vec2 HybridBody::getWorldPoint(const Vec2& localPoint) {
  return core::fromB2(b2Body_GetWorldPoint(require(), core::toB2(localPoint)));
}

Vec2 HybridBody::getLocalPoint(const Vec2& worldPoint) {
  return core::fromB2(b2Body_GetLocalPoint(require(), core::toB2(worldPoint)));
}

Vec2 HybridBody::getWorldVector(const Vec2& localVector) {
  return core::fromB2(b2Body_GetWorldVector(require(), core::toB2(localVector)));
}

Vec2 HybridBody::getLocalVector(const Vec2& worldVector) {
  return core::fromB2(b2Body_GetLocalVector(require(), core::toB2(worldVector)));
}

std::shared_ptr<HybridShapeSpec> HybridBody::createCircleShape(const ShapeDef& def, const Circle& circle) {
  b2ShapeDef shapeDef = core::toB2ShapeDef(def);
  b2Circle geometry = core::toB2Circle(circle);
  return std::make_shared<HybridShape>(b2CreateCircleShape(require(), &shapeDef, &geometry), _world);
}

std::shared_ptr<HybridShapeSpec> HybridBody::createCapsuleShape(const ShapeDef& def, const Capsule& capsule) {
  b2ShapeDef shapeDef = core::toB2ShapeDef(def);
  b2Capsule geometry = core::toB2Capsule(capsule);
  return std::make_shared<HybridShape>(b2CreateCapsuleShape(require(), &shapeDef, &geometry), _world);
}

std::shared_ptr<HybridShapeSpec> HybridBody::createSegmentShape(const ShapeDef& def, const Segment& segment) {
  b2ShapeDef shapeDef = core::toB2ShapeDef(def);
  b2Segment geometry = core::toB2Segment(segment);
  return std::make_shared<HybridShape>(b2CreateSegmentShape(require(), &shapeDef, &geometry), _world);
}

std::shared_ptr<HybridShapeSpec> HybridBody::createPolygonShape(const ShapeDef& def, const PolygonShape& polygon) {
  b2ShapeDef shapeDef = core::toB2ShapeDef(def);
  b2Polygon geometry = core::toB2Polygon(polygon);
  return std::make_shared<HybridShape>(b2CreatePolygonShape(require(), &shapeDef, &geometry), _world);
}

std::shared_ptr<HybridShapeSpec> HybridBody::createBoxShape(const ShapeDef& def, double halfWidth, double halfHeight,
                                                            const Vec2& center, double angle) {
  float width = core::toFloat(halfWidth, "halfWidth");
  float height = core::toFloat(halfHeight, "halfHeight");
  if (width <= 0.0f || height <= 0.0f) {
    throw std::runtime_error("halfWidth and halfHeight must be greater than zero. They are half-extents, so a "
                             "2x1 box is (1, 0.5).");
  }

  b2ShapeDef shapeDef = core::toB2ShapeDef(def);
  b2Polygon geometry =
    b2MakeOffsetBox(width, height, core::toB2(center), b2MakeRot(core::toFloat(angle, "angle")));
  return std::make_shared<HybridShape>(b2CreatePolygonShape(require(), &shapeDef, &geometry), _world);
}

std::vector<std::shared_ptr<HybridShapeSpec>> HybridBody::getShapes() {
  b2BodyId bodyId = require();
  int count = b2Body_GetShapeCount(bodyId);

  std::vector<b2ShapeId> shapeIds(static_cast<size_t>(count));
  int written = count > 0 ? b2Body_GetShapes(bodyId, shapeIds.data(), count) : 0;

  std::vector<std::shared_ptr<HybridShapeSpec>> shapes;
  shapes.reserve(static_cast<size_t>(written));
  for (int i = 0; i < written; i++) {
    shapes.push_back(std::make_shared<HybridShape>(shapeIds[static_cast<size_t>(i)], _world));
  }
  return shapes;
}

BodyState HybridBody::getState() {
  return core::readBodyState(require());
}

std::vector<double> HybridBody::computeAABB() {
  b2AABB aabb = b2Body_ComputeAABB(require());
  return {static_cast<double>(aabb.lowerBound.x), static_cast<double>(aabb.lowerBound.y),
          static_cast<double>(aabb.upperBound.x), static_cast<double>(aabb.upperBound.y)};
}

void HybridBody::destroy() {
  b2DestroyBody(require());
}

} // namespace margelo::nitro::nitrobox2d
