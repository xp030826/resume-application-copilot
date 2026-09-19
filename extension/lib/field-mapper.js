(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.ResumeCopilotMapper = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const definitions = [
    ["personal.full_name", ["姓名", "真实姓名", "name", "full name", "candidate name", "legal name"], false],
    ["personal.preferred_name", ["英文名", "常用名", "preferred name", "english name", "given name"], false],
    ["personal.gender", ["性别", "gender", "sex"], false],
    ["personal.birth_date", ["出生日期", "生日", "birth date", "birthday", "date of birth"], true],
    ["personal.nationality", ["国籍", "nationality", "citizenship"], true],
    ["personal.ethnicity", ["民族", "民族成分", "ethnicity", "race"], false],
    ["personal.marital_status", ["婚姻状况", "婚姻状态", "婚姻", "marital status", "marital"], false],
    ["personal.phone", ["手机", "手机号", "联系电话", "电话", "phone", "mobile", "telephone"], false],
    ["personal.email", ["邮箱", "电子邮箱", "email", "e-mail"], false],
    ["personal.wechat", ["微信", "wechat"], true],
    ["personal.current_city", ["现居城市", "当前城市", "居住城市", "所在城市", "current city", "city", "location"], false],
    ["personal.district", ["所在区", "行政区", "区县", "district"], false],
    ["personal.address", ["详细地址", "联系地址", "通讯地址", "address", "street address"], true],
    ["personal.postal_code", ["邮政编码", "邮编", "postal code", "zip code"], false],
    ["personal.hometown", ["籍贯", "hometown", "native place", "place of origin"], true],
    ["personal.birthplace", ["生源地", "birthplace", "place of birth"], true],
    ["personal.hukou_location", ["户籍所在地", "户口所在地", "hukou", "household registration"], true],
    ["personal.political_status", ["政治面貌", "political status"], true],
    ["personal.github", ["github", "github主页", "代码主页"], false],
    ["personal.linkedin", ["linkedin", "领英"], false],
    ["personal.portfolio", ["作品集", "个人主页", "portfolio", "website", "personal website"], false],
    ["personal.work_authorization", ["工作授权", "工作许可", "work authorization", "visa", "sponsorship"], true],
    ["personal.military_status", ["兵役", "兵役情况", "military status"], true],
    ["intent.target_roles", ["期望职位", "目标岗位", "求职岗位", "申请职位", "target role", "desired position", "job title"], false],
    ["intent.preferred_cities", ["期望城市", "工作地点", "工作城市", "意向城市", "意向工作地", "期望工作地", "preferred city", "preferred location", "preferred locations"], false],
    ["intent.industries", ["目标行业", "行业偏好", "industry", "industries"], false],
    ["intent.employment_type", ["工作性质", "岗位性质", "就业类型", "employment type", "job type"], false],
    ["intent.availability", ["到岗时间", "可到岗时间", "开始时间", "availability", "available from", "start date"], false],
    ["intent.days_per_week", ["每周到岗", "每周实习天数", "每周工作天数", "days per week"], false],
    ["intent.internship_months", ["实习月数", "实习时长", "实习期限", "internship duration", "internship length"], false],
    ["intent.salary_monthly", ["期望薪资", "期望月薪", "月薪", "expected salary", "monthly salary", "compensation"], true],
    ["intent.relocation", ["异地", "出差", "接受调动", "relocation", "travel"], true],
    ["education.0.school", ["学校", "院校", "毕业院校", "school", "university", "institution", "college"], false],
    ["education.0.department", ["院系", "学院", "department", "faculty"], false],
    ["education.0.major", ["专业", "major", "field of study", "discipline"], false],
    ["education.0.degree", ["学历", "学位", "degree", "education level", "qualification"], false],
    ["education.0.start_date", ["入学时间", "教育开始时间", "education start", "start of education"], false],
    ["education.0.end_date", ["毕业时间", "教育结束时间", "graduation date", "graduation year", "education end"], false],
    ["education.0.gpa", ["gpa", "绩点", "平均分", "grade point average"], false],
    ["education.0.ranking", ["专业排名", "成绩排名", "rank", "ranking", "class rank"], false],
    ["education.0.courses", ["核心课程", "课程", "courses", "coursework"], false],
    ["experience.0.company", ["公司", "单位", "雇主", "company", "employer", "organization"], false],
    ["experience.0.industry", ["公司行业", "所属行业", "industry", "company industry"], false],
    ["experience.0.department", ["部门", "department", "team"], false],
    ["experience.0.title", ["职位", "岗位名称", "职务", "job title", "position", "role"], false],
    ["experience.0.employment_type", ["实习/工作类型", "用工类型", "employment type", "work type"], false],
    ["experience.0.location", ["工作地点", "工作城市", "location", "work location"], false],
    ["experience.0.supervisor", ["直属上级", "汇报对象", "supervisor", "reporting to"], false],
    ["experience.0.start_date", ["入职时间", "工作开始时间", "employment start", "work start"], false],
    ["experience.0.end_date", ["离职时间", "工作结束时间", "employment end", "work end"], false],
    ["experience.0.description", ["工作内容", "工作描述", "职责业绩", "job description", "responsibilities", "experience description"], false],
    ["experience.0.achievements", ["工作成果", "量化成果", "achievements", "accomplishments"], false],
    ["experience.0.tools", ["使用工具", "使用技能", "tools", "technologies used"], false],
    ["projects.0.name", ["项目名称", "project name", "project"], false],
    ["projects.0.category", ["项目类型", "project type", "category"], false],
    ["projects.0.role", ["项目角色", "project role"], false],
    ["projects.0.team_size", ["团队规模", "team size"], false],
    ["projects.0.description", ["项目描述", "项目经历", "project description", "project details"], false],
    ["projects.0.results", ["项目成果", "项目结果", "project results", "outcomes"], false],
    ["projects.0.contribution", ["个人贡献", "负责内容", "contribution", "my contribution"], false],
    ["projects.0.tools", ["项目工具", "项目技术", "project tools", "technologies"], false],
    ["certificates.0.name", ["证书名称", "证书", "certificate name", "certification"], false],
    ["certificates.0.level", ["证书级别", "奖项", "level", "award"], false],
    ["campus_experience.0.organization", ["学生组织", "社团", "校园组织", "student organization", "campus organization"], false],
    ["campus_experience.0.type", ["校园经历类型", "经历类型", "campus experience type"], false],
    ["campus_experience.0.role", ["学生职务", "干部职务", "校园角色", "student role", "campus role"], false],
    ["campus_experience.0.description", ["校园工作内容", "学生工作内容", "campus responsibilities"], false],
    ["campus_experience.0.achievements", ["校园工作成果", "校园经历成果", "campus achievements"], false],
    ["volunteer_experience.0.organization", ["志愿组织", "志愿单位", "volunteer organization"], false],
    ["volunteer_experience.0.activity", ["志愿活动", "社会实践活动", "volunteer activity"], false],
    ["volunteer_experience.0.role", ["志愿角色", "volunteer role"], false],
    ["volunteer_experience.0.description", ["志愿内容", "社会实践内容", "volunteer description"], false],
    ["skills.summary", ["技能", "专业技能", "技能特长", "skills", "expertise", "technical skills"], false],
    ["skills.languages", ["语言能力", "外语", "languages", "language skills"], false],
    ["skills.certificates", ["证书", "资格证书", "certificates", "licenses"], false],
    ["answers.self_introduction", ["自我介绍", "自我评价", "个人总结", "self introduction", "summary", "about yourself", "tell us about yourself"], false],
    ["answers.motivation", ["求职动机", "申请原因", "申请动机", "why us", "motivation", "why do you want"], false],
    ["answers.strengths", ["优势", "个人优势", "strengths", "strongest skill"], false],
    ["answers.weaknesses", ["不足", "缺点", "weaknesses", "area for improvement"], false],
    ["answers.career_plan", ["职业规划", "发展规划", "career plan", "career goals"], false],
    ["sensitive.national_id", ["身份证", "身份证号", "公民身份号码", "national id", "id number", "government id"], true],
    ["sensitive.passport_number", ["护照号", "passport number", "passport"], true],
    ["sensitive.bank_account", ["银行卡", "银行卡号", "bank account", "bank card"], true],
    ["sensitive.health", ["健康状况", "疾病史", "残疾", "health", "medical history", "disability"], true],
    ["sensitive.family_information", ["家庭情况", "家庭成员", "family information", "family details"], true],
    ["sensitive.emergency_contact", ["紧急联系人", "emergency contact"], true],
    ["sensitive.reference_contact", ["证明人", "背调联系人", "reference contact", "referee"], true]
  ].map(function (item) { return { path: item[0], aliases: item[1], sensitive: item[2] }; });

  function normalize(value) {
    return String(value || "").toLowerCase().replace(/[\s_\-:：/\\()[\]（）.。]+/g, "");
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
    if (typeof value === "object") return "";
    return String(value);
  }

  function score(meta, aliases) {
    const fields = [meta.label, meta.formLabel, meta.context, meta.dataLabel, meta.title, meta.placeholder, meta.name, meta.id, meta.autocomplete, meta.ariaLabel]
      .map(normalize).filter(Boolean);
    let best = 0;
    aliases.forEach(function (alias) {
      const target = normalize(alias);
      fields.forEach(function (field) {
        if (!field || !target) return;
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
        const provenance = profile && profile.provenance && profile.provenance[definition.path];
        best = {
          path: definition.path,
          value: value,
          confidence: confidence,
          sensitive: definition.sensitive,
          sourceDocument: provenance && provenance.sourceDocument ? provenance.sourceDocument : "资料库"
        };
      }
    });
    return best;
  }

  return { definitions: definitions, normalize: normalize, getPath: getPath, planField: planField, score: score };
});
