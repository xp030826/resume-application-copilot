const test = require("node:test");
const assert = require("node:assert/strict");
const mapper = require("../extension/lib/field-mapper.js");

const profile = {
  personal: { full_name: "林晓舟", email: "xiaozhou@example.com", birth_date: "2001-01-02" },
  education: [{ school: "示例大学" }]
};

test("maps Chinese name labels", function () {
  const match = mapper.planField({ label: "姓名" }, profile);
  assert.equal(match.path, "personal.full_name");
  assert.equal(match.value, "林晓舟");
  assert.equal(match.sensitive, false);
});

test("maps array paths", function () {
  const match = mapper.planField({ placeholder: "请输入毕业院校" }, profile);
  assert.equal(match.path, "education.0.school");
  assert.equal(match.value, "示例大学");
});

test("marks birth date sensitive", function () {
  const match = mapper.planField({ name: "birth_date" }, profile);
  assert.equal(match.path, "personal.birth_date");
  assert.equal(match.sensitive, true);
});

test("maps gender as a normal fillable field", function () {
  const match = mapper.planField({ label: "性别" }, { personal: { gender: "女" } });
  assert.equal(match.path, "personal.gender");
  assert.equal(match.value, "女");
  assert.equal(match.sensitive, false);
});

test("does not mark GPA or ranking as sensitive", function () {
  const educationProfile = { education: [{ gpa: "3.8/4.0", ranking: "8/120" }] };
  const gpa = mapper.planField({ label: "GPA" }, educationProfile);
  const ranking = mapper.planField({ label: "专业排名" }, educationProfile);
  assert.equal(gpa.sensitive, false);
  assert.equal(ranking.sensitive, false);
});

test("does not guess unknown fields", function () {
  assert.equal(mapper.planField({ label: "验证码" }, profile), null);
});

test("maps common Chinese dropdown labels", function () {
  const dropdownProfile = {
    personal: { gender: "女", ethnicity: "汉族", marital_status: "未婚" },
    intent: { preferred_cities: ["广州", "深圳"] }
  };
  assert.equal(mapper.planField({ label: "性别" }, dropdownProfile).value, "女");
  assert.equal(mapper.planField({ label: "民族" }, dropdownProfile).value, "汉族");
  assert.equal(mapper.planField({ label: "婚姻状况" }, dropdownProfile).value, "未婚");
  assert.equal(mapper.planField({ label: "意向工作地（27秋招）" }, dropdownProfile).value, "广州、深圳");
});
