const test = require("node:test");
const assert = require("node:assert/strict");
const model = require("../extension/lib/profile-model.js");

test("blank profile contains comprehensive local sections", function () {
  const profile = model.blankProfile();
  assert.equal(profile.schema_version, "1.1");
  assert.ok(profile.personal.hukou_location === "");
  assert.ok(Array.isArray(profile.education));
  assert.ok(profile.sensitive.national_id === "");
  assert.ok(Array.isArray(profile.imported_materials));
  assert.deepEqual(model.asList("广州，深圳、珠海"), ["广州", "深圳", "珠海"]);
});

test("ensureProfile keeps imported values and fills missing defaults", function () {
  const profile = model.ensureProfile({ personal: { full_name: "张三" } });
  assert.equal(profile.personal.full_name, "张三");
  assert.equal(profile.personal.nationality, "中国");
  assert.deepEqual(profile.provenance, {});
});

test("setPath supports array records", function () {
  const profile = model.blankProfile();
  model.setPath(profile, "education.0.school", "示例大学");
  model.setPath(profile, "education.0.major", "经济学");
  assert.deepEqual(profile.education, [{ school: "示例大学", major: "经济学" }]);
});

test("profile model exposes the full experience modules", function () {
  const profile = model.blankProfile();
  assert.ok(Array.isArray(profile.experience));
  assert.ok(Array.isArray(profile.projects));
  assert.ok(Array.isArray(profile.campus_experience));
  assert.ok(Array.isArray(profile.volunteer_experience));
  assert.ok(Array.isArray(profile.certificates));
  assert.ok(model.collectionDefinitions.experience.fields.some((field) => field[0] === "achievements"));
  assert.ok(model.collectionDefinitions.campus_experience.fields.some((field) => field[0] === "role"));
});
