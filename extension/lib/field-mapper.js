(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.ResumeCopilotMapper = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const definitions = [
    ["personal.full_name", ["姓名", "真实姓名", "name", "full name", "candidate name"], false],
    ["personal.preferred_name", ["英文名", "preferred name", "english name"], false],
    ["personal.phone", ["手机", "手机号", "联系电话", "phone", "mobile", "telephone"], false],
    ["personal.email", ["邮箱", "电子邮箱", "email", "e-mail"], false],
    ["personal.gender", ["性别", "gender", "sex"], true],
    ["personal.birth_date", ["出生日期", "生日", "birth date", "birthday", "date of birth"], true],
    ["personal.current_city", ["现居城市", "当前城市", "居住城市", "current city", "city"], false],
    ["personal.district", ["所在区", "行政区", "district"], false],
    ["personal.hometown", ["籍贯", "户籍", "hometown", "native place"], true],
    ["personal.political_status", ["政治面貌", "political status"], true],
    ["personal.github", ["github", "github主页", "代码主页"], false],
    ["personal.portfolio", ["作品集", "个人主页", "portfolio", "website"], false],
    ["intent.target_roles", ["期望职位", "目标岗位", "求职岗位", "target role", "desired position"], false],
    ["intent.preferred_cities", ["期望城市", "工作地点", "preferred city", "preferred location"], false],
    ["intent.employment_type", ["工作性质", "岗位性质", "employment type", "job type"], false],
    ["intent.availability", ["到岗时间", "可到岗时间", "availability", "available from"], false],
    ["intent.days_per_week", ["每周到岗", "每周实习天数", "days per week"], false],
    ["intent.internship_months", ["实习月数", "实习时长", "internship duration"], false],
    ["intent.salary_monthly", ["期望薪资", "月薪", "expected salary", "monthly salary"], true],
    ["education.0.school", ["学校", "院校", "毕业院校", "school", "university", "institution"], false],
    ["education.0.major", ["专业", "major", "field of study"], false],
    ["education.0.degree", ["学历", "学位", "degree", "education level"], false],
    ["education.0.start_date", ["入学时间", "教育开始时间", "education start"], false],
    ["education.0.end_date", ["毕业时间", "教育结束时间", "graduation date"], false],
    ["education.0.gpa", ["gpa", "绩点", "平均分"], true],
    ["education.0.ranking", ["专业排名", "rank", "ranking"], true],
    ["experience.0.company", ["公司", "单位", "雇主", "company", "employer"], false],
    ["experience.0.department", ["部门", "department"], false],
    ["experience.0.title", ["职位", "岗位名称", "job title", "position"], false],
    ["experience.0.start_date", ["入职时间", "工作开始时间", "employment start"], false],
    ["experience.0.end_date", ["离职时间", "工作结束时间", "employment end"], false],
    ["experience.0.description", ["工作内容", "工作描述", "职责业绩", "job description", "responsibilities"], false],
    ["skills.summary", ["技能", "专业技能", "skills", "expertise"], false],
    ["skills.languages", ["语言能力", "外语", "languages"], false],
    ["answers.self_introduction", ["自我介绍", "自我评价", "个人总结", "self introduction", "summary", "about yourself"], false],
    ["answers.motivation", ["求职动机", "申请原因", "why us", "motivation"], false],
    ["sensitive.national_id", ["身份证", "身份证号", "national id", "id number"], true],
    ["sensitive.health", ["健康状况", "疾病史", "health", "medical history"], true],
    ["sensitive.emergency_contact", ["紧急联系人", "emergency contact"], true],
    ["sensitive.reference_contact", ["证明人", "背调联系人", "reference contact"], true]
  ].map(function (item) { return { path: item[0], aliases: item[1], sensitive: item[2] }; });

  function normalize(value) {
    return String(value || "").toLowerCase().replace(/[\s_\-:：/\\()[\]（）]+/g, "");
  }

  function getPath(object, path) {
    return path.split(".").reduce(function (current, part) {
      if (current === undefined || current === null) return undefined;
      return current[part];
    }, object);
  }

  function renderValue(value) {
    if (Array.isArray(value)) return value.join("、");
    if (value === undefined || value === null) return "";
    return String(value);
  }

  function score(meta, aliases) {
    const fields = [meta.label, meta.placeholder, meta.name, meta.id, meta.autocomplete, meta.ariaLabel].map(normalize).filter(Boolean);
    let best = 0;
    aliases.forEach(function (alias) {
      const target = normalize(alias);
      fields.forEach(function (field) {
        if (field === target) best = Math.max(best, 1);
        else if (field.includes(target) || target.includes(field)) best = Math.max(best, 0.76);
      });
    });
    return best;
  }

  function planField(meta, profile) {
    let best = null;
    definitions.forEach(function (definition) {
      const value = renderValue(getPath(profile, definition.path));
      if (!value) return;
      const confidence = score(meta, definition.aliases);
      if (confidence >= 0.55 && (!best || confidence > best.confidence)) {
        best = { path: definition.path, value: value, confidence: confidence, sensitive: definition.sensitive };
      }
    });
    return best;
  }

  return { definitions: definitions, normalize: normalize, getPath: getPath, planField: planField };
});
