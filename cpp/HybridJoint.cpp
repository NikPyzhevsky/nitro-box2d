#include "HybridJoint.hpp"

#include <stdexcept>
#include <utility>

namespace margelo::nitro::nitrobox2d {
namespace {

const char* jointTypeName(b2JointType type) {
  switch (type) {
    case b2_distanceJoint:
      return "distance";
    case b2_filterJoint:
      return "filter";
    case b2_motorJoint:
      return "motor";
    case b2_mouseJoint:
      return "mouse";
    case b2_prismaticJoint:
      return "prismatic";
    case b2_revoluteJoint:
      return "revolute";
    case b2_weldJoint:
      return "weld";
    case b2_wheelJoint:
      return "wheel";
    default:
      return "unknown";
  }
}

} // namespace

HybridJoint::HybridJoint(b2JointId jointId, WorldHandleRef world)
    : HybridObject(TAG), _jointId(jointId), _world(std::move(world)) {}

b2JointId HybridJoint::require() const {
  core::requireWorld(_world);
  if (!b2Joint_IsValid(_jointId)) {
    throw std::runtime_error("This joint has been destroyed.");
  }
  return _jointId;
}

void HybridJoint::unsupported(const char* accessor) const {
  throw std::runtime_error(std::string(accessor) + " is not available on a " +
                           jointTypeName(b2Joint_GetType(_jointId)) + " joint.");
}

b2JointId HybridJoint::jointId() const {
  return _jointId;
}

double HybridJoint::getId() {
  return static_cast<double>(_jointId.index1);
}

JointType HybridJoint::getType() {
  return static_cast<JointType>(b2Joint_GetType(require()));
}

bool HybridJoint::getIsValid() {
  return _world != nullptr && !_world->destroyed && b2Joint_IsValid(_jointId);
}

double HybridJoint::getBodyIdA() {
  return static_cast<double>(b2Joint_GetBodyA(require()).index1);
}

double HybridJoint::getBodyIdB() {
  return static_cast<double>(b2Joint_GetBodyB(require()).index1);
}

bool HybridJoint::getCollideConnected() {
  return b2Joint_GetCollideConnected(require());
}

void HybridJoint::setCollideConnected(bool collideConnected) {
  b2Joint_SetCollideConnected(require(), collideConnected);
}

void HybridJoint::wakeBodies() {
  b2Joint_WakeBodies(require());
}

Vec2 HybridJoint::getConstraintForce() {
  return core::fromB2(b2Joint_GetConstraintForce(require()));
}

double HybridJoint::getConstraintTorque() {
  return static_cast<double>(b2Joint_GetConstraintTorque(require()));
}

void HybridJoint::enableMotor(bool enable) {
  b2JointId jointId = require();
  switch (b2Joint_GetType(jointId)) {
    case b2_distanceJoint:
      b2DistanceJoint_EnableMotor(jointId, enable);
      return;
    case b2_prismaticJoint:
      b2PrismaticJoint_EnableMotor(jointId, enable);
      return;
    case b2_revoluteJoint:
      b2RevoluteJoint_EnableMotor(jointId, enable);
      return;
    case b2_wheelJoint:
      b2WheelJoint_EnableMotor(jointId, enable);
      return;
    default:
      unsupported("enableMotor()");
  }
}

void HybridJoint::setMotorSpeed(double speed) {
  b2JointId jointId = require();
  float value = core::toFloat(speed, "speed");
  switch (b2Joint_GetType(jointId)) {
    case b2_distanceJoint:
      b2DistanceJoint_SetMotorSpeed(jointId, value);
      return;
    case b2_prismaticJoint:
      b2PrismaticJoint_SetMotorSpeed(jointId, value);
      return;
    case b2_revoluteJoint:
      b2RevoluteJoint_SetMotorSpeed(jointId, value);
      return;
    case b2_wheelJoint:
      b2WheelJoint_SetMotorSpeed(jointId, value);
      return;
    default:
      unsupported("setMotorSpeed()");
  }
}

double HybridJoint::getMotorSpeed() {
  b2JointId jointId = require();
  switch (b2Joint_GetType(jointId)) {
    case b2_distanceJoint:
      return static_cast<double>(b2DistanceJoint_GetMotorSpeed(jointId));
    case b2_prismaticJoint:
      return static_cast<double>(b2PrismaticJoint_GetMotorSpeed(jointId));
    case b2_revoluteJoint:
      return static_cast<double>(b2RevoluteJoint_GetMotorSpeed(jointId));
    case b2_wheelJoint:
      return static_cast<double>(b2WheelJoint_GetMotorSpeed(jointId));
    default:
      unsupported("getMotorSpeed()");
  }
}

void HybridJoint::setMaxMotorForce(double force) {
  b2JointId jointId = require();
  float value = core::toFloat(force, "force");
  switch (b2Joint_GetType(jointId)) {
    case b2_distanceJoint:
      b2DistanceJoint_SetMaxMotorForce(jointId, value);
      return;
    case b2_prismaticJoint:
      b2PrismaticJoint_SetMaxMotorForce(jointId, value);
      return;
    default:
      unsupported("setMaxMotorForce()");
  }
}

void HybridJoint::setMaxMotorTorque(double torque) {
  b2JointId jointId = require();
  float value = core::toFloat(torque, "torque");
  switch (b2Joint_GetType(jointId)) {
    case b2_revoluteJoint:
      b2RevoluteJoint_SetMaxMotorTorque(jointId, value);
      return;
    case b2_wheelJoint:
      b2WheelJoint_SetMaxMotorTorque(jointId, value);
      return;
    default:
      unsupported("setMaxMotorTorque()");
  }
}

double HybridJoint::getMotorLoad() {
  b2JointId jointId = require();
  switch (b2Joint_GetType(jointId)) {
    case b2_distanceJoint:
      return static_cast<double>(b2DistanceJoint_GetMotorForce(jointId));
    case b2_prismaticJoint:
      return static_cast<double>(b2PrismaticJoint_GetMotorForce(jointId));
    case b2_revoluteJoint:
      return static_cast<double>(b2RevoluteJoint_GetMotorTorque(jointId));
    case b2_wheelJoint:
      return static_cast<double>(b2WheelJoint_GetMotorTorque(jointId));
    default:
      unsupported("getMotorLoad()");
  }
}

void HybridJoint::enableLimit(bool enable) {
  b2JointId jointId = require();
  switch (b2Joint_GetType(jointId)) {
    case b2_distanceJoint:
      b2DistanceJoint_EnableLimit(jointId, enable);
      return;
    case b2_prismaticJoint:
      b2PrismaticJoint_EnableLimit(jointId, enable);
      return;
    case b2_revoluteJoint:
      b2RevoluteJoint_EnableLimit(jointId, enable);
      return;
    case b2_wheelJoint:
      b2WheelJoint_EnableLimit(jointId, enable);
      return;
    default:
      unsupported("enableLimit()");
  }
}

void HybridJoint::setLimits(double lower, double upper) {
  b2JointId jointId = require();
  float low = core::toFloat(lower, "lower");
  float high = core::toFloat(upper, "upper");
  if (low > high) {
    throw std::runtime_error("lower must not be greater than upper.");
  }

  switch (b2Joint_GetType(jointId)) {
    case b2_distanceJoint:
      b2DistanceJoint_SetLengthRange(jointId, low, high);
      return;
    case b2_prismaticJoint:
      b2PrismaticJoint_SetLimits(jointId, low, high);
      return;
    case b2_revoluteJoint:
      b2RevoluteJoint_SetLimits(jointId, low, high);
      return;
    case b2_wheelJoint:
      b2WheelJoint_SetLimits(jointId, low, high);
      return;
    default:
      unsupported("setLimits()");
  }
}

void HybridJoint::enableSpring(bool enable) {
  b2JointId jointId = require();
  switch (b2Joint_GetType(jointId)) {
    case b2_distanceJoint:
      b2DistanceJoint_EnableSpring(jointId, enable);
      return;
    case b2_prismaticJoint:
      b2PrismaticJoint_EnableSpring(jointId, enable);
      return;
    case b2_revoluteJoint:
      b2RevoluteJoint_EnableSpring(jointId, enable);
      return;
    case b2_wheelJoint:
      b2WheelJoint_EnableSpring(jointId, enable);
      return;
    default:
      unsupported("enableSpring()");
  }
}

void HybridJoint::setSpringHertz(double hertz) {
  b2JointId jointId = require();
  float value = core::toFloat(hertz, "hertz");
  switch (b2Joint_GetType(jointId)) {
    case b2_distanceJoint:
      b2DistanceJoint_SetSpringHertz(jointId, value);
      return;
    case b2_mouseJoint:
      b2MouseJoint_SetSpringHertz(jointId, value);
      return;
    case b2_prismaticJoint:
      b2PrismaticJoint_SetSpringHertz(jointId, value);
      return;
    case b2_revoluteJoint:
      b2RevoluteJoint_SetSpringHertz(jointId, value);
      return;
    case b2_wheelJoint:
      b2WheelJoint_SetSpringHertz(jointId, value);
      return;
    default:
      unsupported("setSpringHertz()");
  }
}

void HybridJoint::setSpringDampingRatio(double dampingRatio) {
  b2JointId jointId = require();
  float value = core::toFloat(dampingRatio, "dampingRatio");
  switch (b2Joint_GetType(jointId)) {
    case b2_distanceJoint:
      b2DistanceJoint_SetSpringDampingRatio(jointId, value);
      return;
    case b2_mouseJoint:
      b2MouseJoint_SetSpringDampingRatio(jointId, value);
      return;
    case b2_prismaticJoint:
      b2PrismaticJoint_SetSpringDampingRatio(jointId, value);
      return;
    case b2_revoluteJoint:
      b2RevoluteJoint_SetSpringDampingRatio(jointId, value);
      return;
    case b2_wheelJoint:
      b2WheelJoint_SetSpringDampingRatio(jointId, value);
      return;
    default:
      unsupported("setSpringDampingRatio()");
  }
}

void HybridJoint::setLength(double length) {
  b2JointId jointId = require();
  if (b2Joint_GetType(jointId) != b2_distanceJoint) {
    unsupported("setLength()");
  }
  b2DistanceJoint_SetLength(jointId, core::toFloat(length, "length"));
}

double HybridJoint::getLength() {
  b2JointId jointId = require();
  if (b2Joint_GetType(jointId) != b2_distanceJoint) {
    unsupported("getLength()");
  }
  return static_cast<double>(b2DistanceJoint_GetLength(jointId));
}

double HybridJoint::getCurrentLength() {
  b2JointId jointId = require();
  if (b2Joint_GetType(jointId) != b2_distanceJoint) {
    unsupported("getCurrentLength()");
  }
  return static_cast<double>(b2DistanceJoint_GetCurrentLength(jointId));
}

void HybridJoint::setTarget(const Vec2& target) {
  b2JointId jointId = require();
  if (b2Joint_GetType(jointId) != b2_mouseJoint) {
    unsupported("setTarget()");
  }
  b2MouseJoint_SetTarget(jointId, core::toB2(target));
}

Vec2 HybridJoint::getTarget() {
  b2JointId jointId = require();
  if (b2Joint_GetType(jointId) != b2_mouseJoint) {
    unsupported("getTarget()");
  }
  return core::fromB2(b2MouseJoint_GetTarget(jointId));
}

void HybridJoint::setMaxForce(double force) {
  b2JointId jointId = require();
  float value = core::toFloat(force, "force");
  switch (b2Joint_GetType(jointId)) {
    case b2_mouseJoint:
      b2MouseJoint_SetMaxForce(jointId, value);
      return;
    case b2_motorJoint:
      b2MotorJoint_SetMaxForce(jointId, value);
      return;
    default:
      unsupported("setMaxForce()");
  }
}

double HybridJoint::getAngle() {
  b2JointId jointId = require();
  if (b2Joint_GetType(jointId) != b2_revoluteJoint) {
    unsupported("getAngle()");
  }
  return static_cast<double>(b2RevoluteJoint_GetAngle(jointId));
}

double HybridJoint::getTranslation() {
  b2JointId jointId = require();
  if (b2Joint_GetType(jointId) != b2_prismaticJoint) {
    unsupported("getTranslation()");
  }
  return static_cast<double>(b2PrismaticJoint_GetTranslation(jointId));
}

double HybridJoint::getSpeed() {
  b2JointId jointId = require();
  if (b2Joint_GetType(jointId) != b2_prismaticJoint) {
    unsupported("getSpeed()");
  }
  return static_cast<double>(b2PrismaticJoint_GetSpeed(jointId));
}

void HybridJoint::destroy() {
  b2DestroyJoint(require());
}

} // namespace margelo::nitro::nitrobox2d
