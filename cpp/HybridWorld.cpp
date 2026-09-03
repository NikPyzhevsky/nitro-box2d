#include "HybridWorld.hpp"

#include "HybridBody.hpp"
#include "HybridJoint.hpp"

#include <NitroModules/ArrayBuffer.hpp>

#include <algorithm>
#include <cstring>
#include <stdexcept>

namespace margelo::nitro::nitrobox2d {
namespace {

/** `b2ShapeId` -> the id JS sees for its body, or 0 when the shape is already gone. */
double bodyIdOf(b2ShapeId shapeId) {
  if (!b2Shape_IsValid(shapeId)) {
    return 0;
  }
  return static_cast<double>(b2Shape_GetBody(shapeId).index1);
}

struct RayCollector final {
  std::vector<RayHit> hits;
};

float onRayHit(b2ShapeId shapeId, b2Vec2 point, b2Vec2 normal, float fraction, void* context) {
  auto* collector = static_cast<RayCollector*>(context);
  collector->hits.push_back(RayHit(static_cast<double>(shapeId.index1), bodyIdOf(shapeId), core::fromB2(point),
                                   core::fromB2(normal), static_cast<double>(fraction)));
  // 1 keeps the cast going to the end of the ray, which is what "every shape it
  // crosses" means. Returning `fraction` here would clip to the nearest hit.
  return 1.0f;
}

bool onOverlap(b2ShapeId shapeId, void* context) {
  auto* shapeIds = static_cast<std::vector<b2ShapeId>*>(context);
  shapeIds->push_back(shapeId);
  return true;
}

} // namespace

HybridWorld::HybridWorld(const WorldDef& def): HybridObject(TAG), _handle(std::make_shared<WorldHandle>()) {
  b2WorldDef worldDef = core::toB2WorldDef(def);
  _handle->id = b2CreateWorld(&worldDef);
}

HybridWorld::~HybridWorld() {
  // Nothing else frees a Box2D world, so a `World` that JS simply dropped would
  // otherwise leak every body and contact in it.
  if (_handle != nullptr && !_handle->destroyed) {
    b2DestroyWorld(_handle->id);
    _handle->destroyed = true;
  }
}

b2WorldId HybridWorld::require() const {
  return core::requireWorld(_handle);
}

b2BodyId HybridWorld::requireBody(double id, const char* name) const {
  core::requireWorld(_handle);
  int32_t index = static_cast<int32_t>(core::toInt(id, name));

  for (const b2BodyId& bodyId : _bodies) {
    if (bodyId.index1 == index && b2Body_IsValid(bodyId)) {
      return bodyId;
    }
  }

  throw std::runtime_error(std::string(name) + " (" + std::to_string(index) +
                           ") does not name a live body in this world.");
}

void HybridWorld::compactBodies() {
  _bodies.erase(std::remove_if(_bodies.begin(), _bodies.end(),
                               [](const b2BodyId& bodyId) { return !b2Body_IsValid(bodyId); }),
                _bodies.end());
}

bool HybridWorld::getIsValid() {
  return _handle != nullptr && !_handle->destroyed && b2World_IsValid(_handle->id);
}

double HybridWorld::getAwakeBodyCount() {
  return static_cast<double>(b2World_GetAwakeBodyCount(require()));
}

Vec2 HybridWorld::getGravity() {
  return core::fromB2(b2World_GetGravity(require()));
}

void HybridWorld::setGravity(const Vec2& gravity) {
  b2World_SetGravity(require(), core::toB2(gravity));
}

bool HybridWorld::getSleepingEnabled() {
  return b2World_IsSleepingEnabled(require());
}

void HybridWorld::setSleepingEnabled(bool sleepingEnabled) {
  b2World_EnableSleeping(require(), sleepingEnabled);
}

bool HybridWorld::getContinuousEnabled() {
  return b2World_IsContinuousEnabled(require());
}

void HybridWorld::setContinuousEnabled(bool continuousEnabled) {
  b2World_EnableContinuous(require(), continuousEnabled);
}

double HybridWorld::getRestitutionThreshold() {
  return static_cast<double>(b2World_GetRestitutionThreshold(require()));
}

void HybridWorld::setRestitutionThreshold(double restitutionThreshold) {
  b2World_SetRestitutionThreshold(require(), core::toFloat(restitutionThreshold, "restitutionThreshold"));
}

double HybridWorld::getHitEventThreshold() {
  return static_cast<double>(b2World_GetHitEventThreshold(require()));
}

void HybridWorld::setHitEventThreshold(double hitEventThreshold) {
  b2World_SetHitEventThreshold(require(), core::toFloat(hitEventThreshold, "hitEventThreshold"));
}

std::shared_ptr<HybridBodySpec> HybridWorld::createBody(const BodyDef& def) {
  b2WorldId worldId = require();

  std::string nameStorage;
  b2BodyDef bodyDef = core::toB2BodyDef(def, nameStorage);
  b2BodyId bodyId = b2CreateBody(worldId, &bodyDef);

  _bodies.push_back(bodyId);
  return std::make_shared<HybridBody>(bodyId, _handle);
}

void HybridWorld::step(double timeStep, double subStepCount) {
  b2WorldId worldId = require();

  float dt = core::toFloat(timeStep, "timeStep");
  if (dt < 0.0f) {
    throw std::runtime_error("timeStep must not be negative.");
  }

  int subSteps = core::toInt(subStepCount, "subStepCount");
  if (subSteps < 1) {
    throw std::runtime_error("subStepCount must be at least 1. Box2D recommends 4.");
  }

  b2World_Step(worldId, dt, subSteps);
}

std::vector<BodyState> HybridWorld::getBodyStates() {
  require();
  compactBodies();

  std::vector<BodyState> states;
  states.reserve(_bodies.size());
  for (const b2BodyId& bodyId : _bodies) {
    states.push_back(core::readBodyState(bodyId));
  }
  return states;
}

std::vector<BodyState> HybridWorld::getAwakeBodyStates() {
  b2BodyEvents events = b2World_GetBodyEvents(require());

  std::vector<BodyState> states;
  states.reserve(static_cast<size_t>(events.moveCount));
  for (int i = 0; i < events.moveCount; i++) {
    const b2BodyMoveEvent& event = events.moveEvents[i];
    if (!b2Body_IsValid(event.bodyId)) {
      continue;
    }
    states.push_back(core::readBodyState(event.bodyId));
  }
  return states;
}

std::shared_ptr<ArrayBuffer> HybridWorld::getAwakeBodyTransforms() {
  b2BodyEvents events = b2World_GetBodyEvents(require());

  constexpr size_t stride = 4;
  size_t count = static_cast<size_t>(std::max(events.moveCount, 0));
  auto buffer = ArrayBuffer::allocate(count * stride * sizeof(float));

  // The move event already carries the transform, so this reads nothing back out
  // of the world — that is the whole point of using it for the render path.
  auto* floats = reinterpret_cast<float*>(buffer->data());
  for (size_t i = 0; i < count; i++) {
    const b2BodyMoveEvent& event = events.moveEvents[i];
    floats[i * stride + 0] = static_cast<float>(event.bodyId.index1);
    floats[i * stride + 1] = event.transform.p.x;
    floats[i * stride + 2] = event.transform.p.y;
    floats[i * stride + 3] = b2Rot_GetAngle(event.transform.q);
  }

  return buffer;
}

WorldEvents HybridWorld::getEvents() {
  b2WorldId worldId = require();

  b2ContactEvents contacts = b2World_GetContactEvents(worldId);
  b2SensorEvents sensors = b2World_GetSensorEvents(worldId);

  std::vector<ContactTouchEvent> beginContacts;
  beginContacts.reserve(static_cast<size_t>(contacts.beginCount));
  for (int i = 0; i < contacts.beginCount; i++) {
    const b2ContactBeginTouchEvent& event = contacts.beginEvents[i];
    beginContacts.push_back(ContactTouchEvent(static_cast<double>(event.shapeIdA.index1),
                                              static_cast<double>(event.shapeIdB.index1), bodyIdOf(event.shapeIdA),
                                              bodyIdOf(event.shapeIdB)));
  }

  std::vector<ContactTouchEvent> endContacts;
  endContacts.reserve(static_cast<size_t>(contacts.endCount));
  for (int i = 0; i < contacts.endCount; i++) {
    const b2ContactEndTouchEvent& event = contacts.endEvents[i];
    endContacts.push_back(ContactTouchEvent(static_cast<double>(event.shapeIdA.index1),
                                            static_cast<double>(event.shapeIdB.index1), bodyIdOf(event.shapeIdA),
                                            bodyIdOf(event.shapeIdB)));
  }

  std::vector<ContactHitEvent> hits;
  hits.reserve(static_cast<size_t>(contacts.hitCount));
  for (int i = 0; i < contacts.hitCount; i++) {
    const b2ContactHitEvent& event = contacts.hitEvents[i];
    hits.push_back(ContactHitEvent(static_cast<double>(event.shapeIdA.index1),
                                   static_cast<double>(event.shapeIdB.index1), bodyIdOf(event.shapeIdA),
                                   bodyIdOf(event.shapeIdB), core::fromB2(event.point), core::fromB2(event.normal),
                                   static_cast<double>(event.approachSpeed)));
  }

  std::vector<SensorTouchEvent> beginSensors;
  beginSensors.reserve(static_cast<size_t>(sensors.beginCount));
  for (int i = 0; i < sensors.beginCount; i++) {
    const b2SensorBeginTouchEvent& event = sensors.beginEvents[i];
    beginSensors.push_back(SensorTouchEvent(static_cast<double>(event.sensorShapeId.index1),
                                            bodyIdOf(event.sensorShapeId),
                                            static_cast<double>(event.visitorShapeId.index1),
                                            bodyIdOf(event.visitorShapeId)));
  }

  std::vector<SensorTouchEvent> endSensors;
  endSensors.reserve(static_cast<size_t>(sensors.endCount));
  for (int i = 0; i < sensors.endCount; i++) {
    // An end-touch event is often *caused* by the visitor shape being destroyed,
    // so its id can already be dead here. `bodyIdOf` reports 0 rather than
    // reading through a stale handle.
    const b2SensorEndTouchEvent& event = sensors.endEvents[i];
    endSensors.push_back(SensorTouchEvent(static_cast<double>(event.sensorShapeId.index1),
                                          bodyIdOf(event.sensorShapeId),
                                          static_cast<double>(event.visitorShapeId.index1),
                                          bodyIdOf(event.visitorShapeId)));
  }

  return WorldEvents(std::move(beginContacts), std::move(endContacts), std::move(hits), std::move(beginSensors),
                     std::move(endSensors));
}

std::shared_ptr<HybridJointSpec> HybridWorld::createDistanceJoint(const DistanceJointDef& def) {
  b2WorldId worldId = require();

  b2DistanceJointDef jointDef = b2DefaultDistanceJointDef();
  jointDef.bodyIdA = requireBody(def.bodyIdA, "bodyIdA");
  jointDef.bodyIdB = requireBody(def.bodyIdB, "bodyIdB");
  if (def.collideConnected.has_value()) {
    jointDef.collideConnected = *def.collideConnected;
  }
  if (def.localAnchorA.has_value()) {
    jointDef.localAnchorA = core::toB2(*def.localAnchorA);
  }
  if (def.localAnchorB.has_value()) {
    jointDef.localAnchorB = core::toB2(*def.localAnchorB);
  }
  if (def.length.has_value()) {
    float length = core::toFloat(*def.length, "length");
    if (length <= 0.0f) {
      throw std::runtime_error("A distance joint's length must be greater than zero.");
    }
    jointDef.length = length;
  }
  if (def.enableSpring.has_value()) {
    jointDef.enableSpring = *def.enableSpring;
  }
  if (def.hertz.has_value()) {
    jointDef.hertz = core::toFloat(*def.hertz, "hertz");
  }
  if (def.dampingRatio.has_value()) {
    jointDef.dampingRatio = core::toFloat(*def.dampingRatio, "dampingRatio");
  }
  if (def.enableLimit.has_value()) {
    jointDef.enableLimit = *def.enableLimit;
  }
  if (def.minLength.has_value()) {
    jointDef.minLength = core::toFloat(*def.minLength, "minLength");
  }
  if (def.maxLength.has_value()) {
    jointDef.maxLength = core::toFloat(*def.maxLength, "maxLength");
  }
  if (def.enableMotor.has_value()) {
    jointDef.enableMotor = *def.enableMotor;
  }
  if (def.maxMotorForce.has_value()) {
    jointDef.maxMotorForce = core::toFloat(*def.maxMotorForce, "maxMotorForce");
  }
  if (def.motorSpeed.has_value()) {
    jointDef.motorSpeed = core::toFloat(*def.motorSpeed, "motorSpeed");
  }

  return std::make_shared<HybridJoint>(b2CreateDistanceJoint(worldId, &jointDef), _handle);
}

std::shared_ptr<HybridJointSpec> HybridWorld::createRevoluteJoint(const RevoluteJointDef& def) {
  b2WorldId worldId = require();

  b2RevoluteJointDef jointDef = b2DefaultRevoluteJointDef();
  jointDef.bodyIdA = requireBody(def.bodyIdA, "bodyIdA");
  jointDef.bodyIdB = requireBody(def.bodyIdB, "bodyIdB");
  if (def.collideConnected.has_value()) {
    jointDef.collideConnected = *def.collideConnected;
  }
  if (def.localAnchorA.has_value()) {
    jointDef.localAnchorA = core::toB2(*def.localAnchorA);
  }
  if (def.localAnchorB.has_value()) {
    jointDef.localAnchorB = core::toB2(*def.localAnchorB);
  }
  if (def.referenceAngle.has_value()) {
    jointDef.referenceAngle = core::toFloat(*def.referenceAngle, "referenceAngle");
  }
  if (def.enableSpring.has_value()) {
    jointDef.enableSpring = *def.enableSpring;
  }
  if (def.hertz.has_value()) {
    jointDef.hertz = core::toFloat(*def.hertz, "hertz");
  }
  if (def.dampingRatio.has_value()) {
    jointDef.dampingRatio = core::toFloat(*def.dampingRatio, "dampingRatio");
  }
  if (def.enableLimit.has_value()) {
    jointDef.enableLimit = *def.enableLimit;
  }
  if (def.lowerAngle.has_value()) {
    jointDef.lowerAngle = core::toFloat(*def.lowerAngle, "lowerAngle");
  }
  if (def.upperAngle.has_value()) {
    jointDef.upperAngle = core::toFloat(*def.upperAngle, "upperAngle");
  }
  if (def.enableMotor.has_value()) {
    jointDef.enableMotor = *def.enableMotor;
  }
  if (def.maxMotorTorque.has_value()) {
    jointDef.maxMotorTorque = core::toFloat(*def.maxMotorTorque, "maxMotorTorque");
  }
  if (def.motorSpeed.has_value()) {
    jointDef.motorSpeed = core::toFloat(*def.motorSpeed, "motorSpeed");
  }

  return std::make_shared<HybridJoint>(b2CreateRevoluteJoint(worldId, &jointDef), _handle);
}

std::shared_ptr<HybridJointSpec> HybridWorld::createPrismaticJoint(const PrismaticJointDef& def) {
  b2WorldId worldId = require();

  b2PrismaticJointDef jointDef = b2DefaultPrismaticJointDef();
  jointDef.bodyIdA = requireBody(def.bodyIdA, "bodyIdA");
  jointDef.bodyIdB = requireBody(def.bodyIdB, "bodyIdB");
  if (def.collideConnected.has_value()) {
    jointDef.collideConnected = *def.collideConnected;
  }
  if (def.localAnchorA.has_value()) {
    jointDef.localAnchorA = core::toB2(*def.localAnchorA);
  }
  if (def.localAnchorB.has_value()) {
    jointDef.localAnchorB = core::toB2(*def.localAnchorB);
  }
  if (def.localAxisA.has_value()) {
    jointDef.localAxisA = b2Normalize(core::toB2(*def.localAxisA));
  }
  if (def.referenceAngle.has_value()) {
    jointDef.referenceAngle = core::toFloat(*def.referenceAngle, "referenceAngle");
  }
  if (def.enableSpring.has_value()) {
    jointDef.enableSpring = *def.enableSpring;
  }
  if (def.hertz.has_value()) {
    jointDef.hertz = core::toFloat(*def.hertz, "hertz");
  }
  if (def.dampingRatio.has_value()) {
    jointDef.dampingRatio = core::toFloat(*def.dampingRatio, "dampingRatio");
  }
  if (def.enableLimit.has_value()) {
    jointDef.enableLimit = *def.enableLimit;
  }
  if (def.lowerTranslation.has_value()) {
    jointDef.lowerTranslation = core::toFloat(*def.lowerTranslation, "lowerTranslation");
  }
  if (def.upperTranslation.has_value()) {
    jointDef.upperTranslation = core::toFloat(*def.upperTranslation, "upperTranslation");
  }
  if (def.enableMotor.has_value()) {
    jointDef.enableMotor = *def.enableMotor;
  }
  if (def.maxMotorForce.has_value()) {
    jointDef.maxMotorForce = core::toFloat(*def.maxMotorForce, "maxMotorForce");
  }
  if (def.motorSpeed.has_value()) {
    jointDef.motorSpeed = core::toFloat(*def.motorSpeed, "motorSpeed");
  }

  return std::make_shared<HybridJoint>(b2CreatePrismaticJoint(worldId, &jointDef), _handle);
}

std::shared_ptr<HybridJointSpec> HybridWorld::createWeldJoint(const WeldJointDef& def) {
  b2WorldId worldId = require();

  b2WeldJointDef jointDef = b2DefaultWeldJointDef();
  jointDef.bodyIdA = requireBody(def.bodyIdA, "bodyIdA");
  jointDef.bodyIdB = requireBody(def.bodyIdB, "bodyIdB");
  if (def.collideConnected.has_value()) {
    jointDef.collideConnected = *def.collideConnected;
  }
  if (def.localAnchorA.has_value()) {
    jointDef.localAnchorA = core::toB2(*def.localAnchorA);
  }
  if (def.localAnchorB.has_value()) {
    jointDef.localAnchorB = core::toB2(*def.localAnchorB);
  }
  if (def.referenceAngle.has_value()) {
    jointDef.referenceAngle = core::toFloat(*def.referenceAngle, "referenceAngle");
  }
  if (def.linearHertz.has_value()) {
    jointDef.linearHertz = core::toFloat(*def.linearHertz, "linearHertz");
  }
  if (def.angularHertz.has_value()) {
    jointDef.angularHertz = core::toFloat(*def.angularHertz, "angularHertz");
  }
  if (def.linearDampingRatio.has_value()) {
    jointDef.linearDampingRatio = core::toFloat(*def.linearDampingRatio, "linearDampingRatio");
  }
  if (def.angularDampingRatio.has_value()) {
    jointDef.angularDampingRatio = core::toFloat(*def.angularDampingRatio, "angularDampingRatio");
  }

  return std::make_shared<HybridJoint>(b2CreateWeldJoint(worldId, &jointDef), _handle);
}

std::shared_ptr<HybridJointSpec> HybridWorld::createMouseJoint(const MouseJointDef& def) {
  b2WorldId worldId = require();

  b2MouseJointDef jointDef = b2DefaultMouseJointDef();
  jointDef.bodyIdA = requireBody(def.bodyIdA, "bodyIdA");
  jointDef.bodyIdB = requireBody(def.bodyIdB, "bodyIdB");
  jointDef.target = core::toB2(def.target);
  if (def.collideConnected.has_value()) {
    jointDef.collideConnected = *def.collideConnected;
  }
  if (def.hertz.has_value()) {
    jointDef.hertz = core::toFloat(*def.hertz, "hertz");
  }
  if (def.dampingRatio.has_value()) {
    jointDef.dampingRatio = core::toFloat(*def.dampingRatio, "dampingRatio");
  }
  if (def.maxForce.has_value()) {
    jointDef.maxForce = core::toFloat(*def.maxForce, "maxForce");
  }

  return std::make_shared<HybridJoint>(b2CreateMouseJoint(worldId, &jointDef), _handle);
}

std::optional<RayHit> HybridWorld::castRayClosest(const Vec2& origin, const Vec2& translation) {
  b2RayResult result =
    b2World_CastRayClosest(require(), core::toB2(origin), core::toB2(translation), b2DefaultQueryFilter());
  if (!result.hit) {
    return std::nullopt;
  }

  return RayHit(static_cast<double>(result.shapeId.index1), bodyIdOf(result.shapeId), core::fromB2(result.point),
                core::fromB2(result.normal), static_cast<double>(result.fraction));
}

std::vector<RayHit> HybridWorld::castRay(const Vec2& origin, const Vec2& translation) {
  RayCollector collector;
  b2World_CastRay(require(), core::toB2(origin), core::toB2(translation), b2DefaultQueryFilter(), onRayHit,
                  &collector);

  std::sort(collector.hits.begin(), collector.hits.end(),
            [](const RayHit& lhs, const RayHit& rhs) { return lhs.fraction < rhs.fraction; });
  return collector.hits;
}

std::vector<double> HybridWorld::overlapAABB(const Vec2& lower, const Vec2& upper) {
  b2AABB aabb{core::toB2(lower), core::toB2(upper)};
  if (aabb.lowerBound.x > aabb.upperBound.x || aabb.lowerBound.y > aabb.upperBound.y) {
    throw std::runtime_error("`lower` must be the bottom-left corner and `upper` the top-right one.");
  }

  std::vector<b2ShapeId> shapeIds;
  b2World_OverlapAABB(require(), aabb, b2DefaultQueryFilter(), onOverlap, &shapeIds);

  std::vector<double> ids;
  ids.reserve(shapeIds.size());
  for (const b2ShapeId& shapeId : shapeIds) {
    ids.push_back(static_cast<double>(shapeId.index1));
  }
  return ids;
}

std::vector<double> HybridWorld::queryPoint(const Vec2& point) {
  b2Vec2 target = core::toB2(point);
  // The broad phase works on boxes, so start from a degenerate one around the
  // point and then test each candidate properly.
  b2AABB aabb{target, target};

  std::vector<b2ShapeId> shapeIds;
  b2World_OverlapAABB(require(), aabb, b2DefaultQueryFilter(), onOverlap, &shapeIds);

  std::vector<double> ids;
  for (const b2ShapeId& shapeId : shapeIds) {
    if (b2Shape_TestPoint(shapeId, target)) {
      ids.push_back(static_cast<double>(shapeId.index1));
    }
  }
  return ids;
}

void HybridWorld::explode(const ExplosionDef& def) {
  b2ExplosionDef explosion = b2DefaultExplosionDef();
  explosion.position = core::toB2(def.position);
  explosion.radius = core::toFloat(def.radius, "radius");
  explosion.impulsePerLength = core::toFloat(def.impulsePerLength, "impulsePerLength");
  if (def.falloff.has_value()) {
    explosion.falloff = core::toFloat(*def.falloff, "falloff");
  }
  if (def.maskBits.has_value()) {
    explosion.maskBits = static_cast<uint64_t>(*def.maskBits);
  }

  b2World_Explode(require(), &explosion);
}

Profile HybridWorld::getProfile() {
  b2Profile profile = b2World_GetProfile(require());
  // Box2D calls the continuous-collision stage "bullets"; the name here follows
  // the setting that turns it on, `continuousEnabled`.
  return Profile(static_cast<double>(profile.step), static_cast<double>(profile.collide),
                 static_cast<double>(profile.solve), static_cast<double>(profile.bullets));
}

Counters HybridWorld::getCounters() {
  b2Counters counters = b2World_GetCounters(require());
  return Counters(static_cast<double>(counters.bodyCount), static_cast<double>(counters.shapeCount),
                  static_cast<double>(counters.contactCount), static_cast<double>(counters.jointCount),
                  static_cast<double>(counters.islandCount));
}

void HybridWorld::destroy() {
  b2DestroyWorld(require());
  _handle->destroyed = true;
  _bodies.clear();
}

} // namespace margelo::nitro::nitrobox2d
