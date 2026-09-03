#pragma once

#include "Box2DCore.hpp"
#include "HybridWorldSpec.hpp"

#include <vector>

namespace margelo::nitro::nitrobox2d {

class HybridWorld: public HybridWorldSpec {
public:
  explicit HybridWorld(const WorldDef& def);
  ~HybridWorld() override;

  bool getIsValid() override;
  double getAwakeBodyCount() override;
  Vec2 getGravity() override;
  void setGravity(const Vec2& gravity) override;
  bool getSleepingEnabled() override;
  void setSleepingEnabled(bool sleepingEnabled) override;
  bool getContinuousEnabled() override;
  void setContinuousEnabled(bool continuousEnabled) override;
  double getRestitutionThreshold() override;
  void setRestitutionThreshold(double restitutionThreshold) override;
  double getHitEventThreshold() override;
  void setHitEventThreshold(double hitEventThreshold) override;

  std::shared_ptr<HybridBodySpec> createBody(const BodyDef& def) override;
  void step(double timeStep, double subStepCount) override;

  std::vector<BodyState> getBodyStates() override;
  std::vector<BodyState> getAwakeBodyStates() override;
  std::shared_ptr<ArrayBuffer> getAwakeBodyTransforms() override;
  WorldEvents getEvents() override;

  std::shared_ptr<HybridJointSpec> createDistanceJoint(const DistanceJointDef& def) override;
  std::shared_ptr<HybridJointSpec> createRevoluteJoint(const RevoluteJointDef& def) override;
  std::shared_ptr<HybridJointSpec> createPrismaticJoint(const PrismaticJointDef& def) override;
  std::shared_ptr<HybridJointSpec> createWeldJoint(const WeldJointDef& def) override;
  std::shared_ptr<HybridJointSpec> createMouseJoint(const MouseJointDef& def) override;

  std::optional<RayHit> castRayClosest(const Vec2& origin, const Vec2& translation) override;
  std::vector<RayHit> castRay(const Vec2& origin, const Vec2& translation) override;
  std::vector<double> overlapAABB(const Vec2& lower, const Vec2& upper) override;
  std::vector<double> queryPoint(const Vec2& point) override;

  void explode(const ExplosionDef& def) override;

  Profile getProfile() override;
  Counters getCounters() override;

  void destroy() override;

private:
  b2WorldId require() const;
  /**
   * Resolves a `Body.id` back to a full `b2BodyId`.
   *
   * Joint definitions take plain numbers so that JS can build them from the same
   * ids it sees on events, but Box2D needs the world and generation halves of
   * the handle too. Those only exist in this registry.
   */
  b2BodyId requireBody(double id, const char* name) const;
  /** Drops registry entries whose body has since been destroyed. */
  void compactBodies();

private:
  WorldHandleRef _handle;
  /**
   * Every body this world created, in creation order.
   *
   * Box2D v3 has no "iterate the bodies" call — `b2World_GetBodyEvents` only
   * reports what moved — so a full-world read has to come from a list we keep
   * ourselves.
   */
  std::vector<b2BodyId> _bodies;
};

} // namespace margelo::nitro::nitrobox2d
