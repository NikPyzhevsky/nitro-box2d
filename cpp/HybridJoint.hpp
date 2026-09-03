#pragma once

#include "Box2DCore.hpp"
#include "HybridJointSpec.hpp"

namespace margelo::nitro::nitrobox2d {

/**
 * One class for every joint type, mirroring Box2D's own C API.
 *
 * Box2D exposes joints through a single `b2JointId` and a family of
 * type-prefixed functions, so this dispatches on `b2Joint_GetType` and throws a
 * named error for a combination that does not exist — `setLength` on a revolute
 * joint, say. Splitting this into five Hybrid Objects would be tidier in TypeScript
 * but would not change what the underlying library allows.
 */
class HybridJoint: public HybridJointSpec {
public:
  HybridJoint(b2JointId jointId, WorldHandleRef world);

  double getId() override;
  JointType getType() override;
  bool getIsValid() override;
  double getBodyIdA() override;
  double getBodyIdB() override;
  bool getCollideConnected() override;
  void setCollideConnected(bool collideConnected) override;

  void wakeBodies() override;
  Vec2 getConstraintForce() override;
  double getConstraintTorque() override;

  void enableMotor(bool enable) override;
  void setMotorSpeed(double speed) override;
  double getMotorSpeed() override;
  void setMaxMotorForce(double force) override;
  void setMaxMotorTorque(double torque) override;
  double getMotorLoad() override;

  void enableLimit(bool enable) override;
  void setLimits(double lower, double upper) override;

  void enableSpring(bool enable) override;
  void setSpringHertz(double hertz) override;
  void setSpringDampingRatio(double dampingRatio) override;

  void setLength(double length) override;
  double getLength() override;
  double getCurrentLength() override;

  void setTarget(const Vec2& target) override;
  Vec2 getTarget() override;
  void setMaxForce(double force) override;

  double getAngle() override;
  double getTranslation() override;
  double getSpeed() override;

  void destroy() override;

  b2JointId jointId() const;

private:
  /** Throws unless the world is alive and this joint still exists in it. */
  b2JointId require() const;
  [[noreturn]] void unsupported(const char* accessor) const;

private:
  b2JointId _jointId;
  WorldHandleRef _world;
};

} // namespace margelo::nitro::nitrobox2d
