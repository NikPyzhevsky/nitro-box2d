#pragma once

#include "Box2DCore.hpp"
#include "HybridBodySpec.hpp"

namespace margelo::nitro::nitrobox2d {

class HybridBody: public HybridBodySpec {
public:
  HybridBody(b2BodyId bodyId, WorldHandleRef world);

  double getId() override;
  bool getIsValid() override;
  double getMass() override;
  double getRotationalInertia() override;
  Vec2 getWorldCenterOfMass() override;
  double getShapeCount() override;

  BodyType getType() override;
  void setType(BodyType type) override;
  Vec2 getPosition() override;
  void setPosition(const Vec2& position) override;
  double getAngle() override;
  void setAngle(double angle) override;
  Vec2 getLinearVelocity() override;
  void setLinearVelocity(const Vec2& linearVelocity) override;
  double getAngularVelocity() override;
  void setAngularVelocity(double angularVelocity) override;
  double getLinearDamping() override;
  void setLinearDamping(double linearDamping) override;
  double getAngularDamping() override;
  void setAngularDamping(double angularDamping) override;
  double getGravityScale() override;
  void setGravityScale(double gravityScale) override;
  bool getFixedRotation() override;
  void setFixedRotation(bool fixedRotation) override;
  bool getBullet() override;
  void setBullet(bool bullet) override;
  bool getAwake() override;
  void setAwake(bool awake) override;
  bool getEnabled() override;
  void setEnabled(bool enabled) override;
  double getUserData() override;
  void setUserData(double userData) override;

  void setTransform(const Vec2& position, double angle) override;

  void applyForce(const Vec2& force, const Vec2& point, bool wake) override;
  void applyForceToCenter(const Vec2& force, bool wake) override;
  void applyTorque(double torque, bool wake) override;
  void applyLinearImpulse(const Vec2& impulse, const Vec2& point, bool wake) override;
  void applyLinearImpulseToCenter(const Vec2& impulse, bool wake) override;
  void applyAngularImpulse(double impulse, bool wake) override;

  Vec2 getWorldPoint(const Vec2& localPoint) override;
  Vec2 getLocalPoint(const Vec2& worldPoint) override;
  Vec2 getWorldVector(const Vec2& localVector) override;
  Vec2 getLocalVector(const Vec2& worldVector) override;

  std::shared_ptr<HybridShapeSpec> createCircleShape(const ShapeDef& def, const Circle& circle) override;
  std::shared_ptr<HybridShapeSpec> createCapsuleShape(const ShapeDef& def, const Capsule& capsule) override;
  std::shared_ptr<HybridShapeSpec> createSegmentShape(const ShapeDef& def, const Segment& segment) override;
  std::shared_ptr<HybridShapeSpec> createPolygonShape(const ShapeDef& def, const PolygonShape& polygon) override;
  std::shared_ptr<HybridShapeSpec> createBoxShape(const ShapeDef& def, double halfWidth, double halfHeight,
                                                  const Vec2& center, double angle) override;

  std::vector<std::shared_ptr<HybridShapeSpec>> getShapes() override;
  BodyState getState() override;
  std::vector<double> computeAABB() override;

  void destroy() override;

  b2BodyId bodyId() const;

private:
  /** Throws unless the world is alive and this body still exists in it. */
  b2BodyId require() const;

private:
  b2BodyId _bodyId;
  WorldHandleRef _world;
};

} // namespace margelo::nitro::nitrobox2d
