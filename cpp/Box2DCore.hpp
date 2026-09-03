#pragma once

#include "BodyDef.hpp"
#include "BodyState.hpp"
#include "Capsule.hpp"
#include "Circle.hpp"
#include "Filter.hpp"
#include "PolygonShape.hpp"
#include "Segment.hpp"
#include "ShapeDef.hpp"
#include "Vec2.hpp"
#include "WorldDef.hpp"

#include <box2d/box2d.h>

#include <memory>
#include <optional>
#include <string>

namespace margelo::nitro::nitrobox2d {

/**
 * Shared liveness flag for one `b2WorldId` and every handle pointing into it.
 *
 * Box2D ids validate themselves against a generation counter, which catches a
 * body that was destroyed while its world lived on. It cannot catch a body
 * whose *world* was destroyed: `b2Body_IsValid` reads through the world pointer
 * to get there, so a stale body id after `b2DestroyWorld` is a use-after-free,
 * not a `false`.
 *
 * Every Hybrid Object in this module therefore holds a `WorldHandleRef` and
 * checks it before touching Box2D. A JS reference kept past `world.destroy()`
 * then throws instead of crashing the app.
 */
struct WorldHandle final {
  b2WorldId id = b2_nullWorldId;
  bool destroyed = false;
};

using WorldHandleRef = std::shared_ptr<WorldHandle>;

namespace core {

/** Throws when the world behind `handle` is gone. Returns its id otherwise. */
b2WorldId requireWorld(const WorldHandleRef& handle);

/**
 * Narrows a JS number to `float`, which is what Box2D stores.
 *
 * Rejects NaN and infinity up front: Box2D has no defence against them, and a
 * single NaN position spreads through the solver until the whole scene is gone.
 */
float toFloat(double value, const char* name);
int toInt(double value, const char* name);

b2Vec2 toB2(const Vec2& value);
Vec2 fromB2(b2Vec2 value);

b2Filter toB2Filter(const std::optional<Filter>& filter);
Filter fromB2Filter(b2Filter filter);

/**
 * Packs a JS number into Box2D's `void* userData`.
 *
 * Truncated to `intptr_t`, so on 32-bit ABIs (armeabi-v7a, x86) the usable
 * range is 32-bit. Meant for a small integer tag that maps back to the caller's
 * own model, not for arbitrary numbers.
 */
void* toUserData(const std::optional<double>& value);
double fromUserData(void* userData);

b2WorldDef toB2WorldDef(const WorldDef& def);
/**
 * `name` is borrowed by the returned def, so the string it points at has to
 * outlive the `b2CreateBody` call. That is why it is an out-parameter.
 */
b2BodyDef toB2BodyDef(const BodyDef& def, std::string& nameStorage);
b2ShapeDef toB2ShapeDef(const ShapeDef& def);

b2Circle toB2Circle(const Circle& circle);
b2Capsule toB2Capsule(const Capsule& capsule);
b2Segment toB2Segment(const Segment& segment);
/** Runs the points through Box2D's hull builder. Throws on a degenerate outline. */
b2Polygon toB2Polygon(const PolygonShape& polygon);

/** Reads a body's full state. The body must already be known to be valid. */
BodyState readBodyState(b2BodyId bodyId);

} // namespace core

} // namespace margelo::nitro::nitrobox2d
