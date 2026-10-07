import assert from "node:assert/strict";
import { deliveryDecision, deadlineRequest } from "../src/course_delivery_service.ts";

const now = new Date("2026-09-14T08:00:00.000Z");
const input = deadlineRequest.parse({ courseId: "math-101", learnerId: "learner-7", deadline: "2026-09-15T08:00:00.000Z" });
assert.equal(deliveryDecision(input, now), "due-soon");
assert.throws(() => deadlineRequest.parse({ courseId: "", learnerId: "learner-7", deadline: "tomorrow" }));
console.log("deadline decision test passed");
