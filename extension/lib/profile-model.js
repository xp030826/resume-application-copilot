(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.ResumeCopilotProfile = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const fieldDefinitions = [
    ["personal.full_name", "姓名", "text", false],
    ["personal.preferred_name", "英文名/常用名", "text", false],
    ["personal.gender", "性别", "text", false],
    ["personal.birth_date", "出生日期", "date", true],
    ["personal.nationality", "国籍", "text", true],
    ["personal.ethnicity", "民族", "text", false],
    ["personal.marital_status", "婚姻状况", "text", false],
    ["personal.phone", "手机号", "tel", false],
    ["personal.email", "邮箱", "email", false],
    ["personal.wechat", "微信", "text", true],
    ["personal.current_city", "现居城市", "text", false],
    ["personal.district", "所在区", "text", false],
    ["personal.address", "现居地址", "text", true],
    ["personal.postal_code", "邮政编码", "text", false],
    ["personal.hometown", "籍贯", "text", true],
    ["personal.birthplace", "生源地", "text", true],
    ["personal.hukou_location", "户籍所在地", "text", true],
    ["personal.political_status", "政治面貌", "text", true],
    ["personal.github", "GitHub", "url", false],
    ["personal.linkedin", "LinkedIn", "url", false],
    ["personal.portfolio", "作品集/个人主页", "url", false],
    ["personal.work_authorization", "工作/实习授权", "text", true],
    ["personal.military_status", "兵役情况", "text", true],
    ["intent.target_roles", "目标岗位（用逗号分隔）", "list", false],
    ["intent.preferred_cities", "期望城市（用逗号分隔）", "list", false],
    ["intent.industries", "目标行业（用逗号分隔）", "list", false],
    ["intent.employment_type", "就业类型", "text", false],
    ["intent.availability", "可到岗时间", "text", false],
    ["intent.days_per_week", "每周可到岗天数", "text", false],
    ["intent.internship_months", "实习时长（月）", "text", false],
    ["intent.salary_monthly", "期望月薪", "text", true],
    ["intent.relocation", "是否接受异地/出差", "text", true],
    ["education.0.school", "最高学历学校", "text", false],
    ["education.0.school_type", "最高学历学校类型", "text", false],
    ["education.0.department", "院系", "text", false],
    ["education.0.major", "专业", "text", false],
    ["education.0.degree", "学历/学位", "text", false],
    ["education.0.start_date", "入学时间", "date", false],
    ["education.0.end_date", "毕业时间", "date", false],
    ["education.0.gpa", "GPA/平均分", "text", false],
    ["education.0.ranking", "专业排名", "text", false],
    ["education.0.courses", "核心课程（用逗号分隔）", "list", false],
    ["skills.summary", "专业技能", "textarea", false],
    ["skills.languages", "语言能力", "textarea", false],
    ["skills.certificates", "证书（用逗号分隔）", "textarea", false],
    ["answers.self_introduction", "自我介绍", "textarea", false],
    ["answers.motivation", "求职动机", "textarea", false],
    ["answers.strengths", "优势", "textarea", false],
    ["answers.weaknesses", "不足与改进", "textarea", false],
    ["answers.career_plan", "职业规划", "textarea", false],
    ["ai.provider", "AI 服务商", "text", false],
    ["ai.endpoint", "Chat Completions 地址", "url", false],
    ["ai.model", "模型名称", "text", false],
    ["ai.api_key", "API Key", "password", true],
    ["sensitive.national_id", "身份证号", "text", true],
    ["sensitive.passport_number", "护照号", "text", true],
    ["sensitive.bank_account", "银行卡号", "text", true],
    ["sensitive.health", "健康/残障信息", "textarea", true],
    ["sensitive.emergency_contact", "紧急联系人", "text", true],
    ["sensitive.family_information", "家庭信息", "textarea", true],
    ["sensitive.reference_contact", "证明人/背调联系人", "text", true]
  ].map(function (item) {
    return { path: item[0], label: item[1], type: item[2], sensitive: item[3] };
  });

  const collectionDefinitions = {
    education: {
      label: "教育经历",
      fields: [
        ["school", "学校"], ["school_type", "学校类型/性质"], ["department", "院系"], ["major", "专业"], ["degree", "学历/学位"],
        ["start_date", "入学时间"], ["end_date", "毕业时间"], ["gpa", "GPA/平均分"], ["ranking", "排名"], ["courses", "核心课程"]
      ]
    },
    language_records: {
      label: "语言能力记录",
      fields: [
        ["language", "语言", "text"],
        ["category", "语言类别", "select", ["母语", "外语", "方言", "其他"]],
        ["proficiency", "总体熟练度", "select", ["母语", "精通", "熟练", "良好", "基础", "入门"]],
        ["level", "等级/考试级别", "text"],
        ["exam", "考试名称", "text"],
        ["score", "成绩", "text"],
        ["score_scale", "分数制", "select", ["等级制", "百分制", "4分制", "5分制", "9分制", "100分制", "120分制", "710分制", "990分制", "其他"]],
        ["exam_date", "考试日期", "date"],
        ["certificate", "证书名称", "text"],
        ["certificate_number", "证书编号", "text"],
        ["speaking", "口语", "select", ["母语", "精通", "熟练", "良好", "基础", "不适用"]],
        ["listening", "听力", "select", ["母语", "精通", "熟练", "良好", "基础", "不适用"]],
        ["reading", "阅读", "select", ["母语", "精通", "熟练", "良好", "基础", "不适用"]],
        ["writing", "写作", "select", ["母语", "精通", "熟练", "良好", "基础", "不适用"]],
        ["usage", "使用场景", "textarea"],
        ["valid_until", "有效期至", "date"],
        ["evidence", "证明材料/附件名称", "text"],
        ["notes", "补充说明", "textarea"]
      ]
    },
    experience: {
      label: "实习/工作经历",
      fields: [
        ["company", "公司/单位"], ["industry", "行业"], ["department", "部门/团队"], ["title", "职位"],
        ["employment_type", "实习/工作类型"], ["location", "工作地点"], ["supervisor", "直属上级/汇报对象"],
        ["start_date", "开始时间"], ["end_date", "结束时间"], ["description", "职责描述"],
        ["achievements", "量化成果"], ["tools", "使用工具/技能"]
      ]
    },
    projects: {
      label: "项目经历",
      fields: [
        ["name", "项目名称"], ["category", "项目类型"], ["role", "个人角色"], ["team_size", "团队规模"],
        ["start_date", "开始时间"], ["end_date", "结束时间"], ["description", "项目背景"],
        ["contribution", "个人贡献"], ["results", "结果/指标"], ["tools", "工具/技术"], ["link", "项目链接"]
      ]
    },
    certificates: {
      label: "证书、竞赛与荣誉",
      fields: [["name", "名称"], ["category", "类型"], ["issuer", "颁发机构/主办方"], ["date", "取得时间"], ["level", "级别/奖项"], ["number", "证书编号"], ["notes", "补充说明"]]
    },
    campus_experience: {
      label: "学生干部与校园经历",
      fields: [["organization", "组织/部门"], ["type", "经历类型"], ["role", "职务/角色"], ["start_date", "开始时间"], ["end_date", "结束时间"], ["description", "工作内容"], ["achievements", "工作成果"], ["skills", "锻炼能力"]]
    },
    volunteer_experience: {
      label: "志愿与社会实践",
      fields: [["organization", "组织/单位"], ["activity", "活动名称"], ["role", "角色"], ["location", "地点"], ["start_date", "开始时间"], ["end_date", "结束时间"], ["description", "活动内容"], ["hours", "服务时长"], ["achievements", "成果/证明"]]
    }
  };

  function blankProfile() {
    return {
      schema_version: "1.1",
      personal: {
        full_name: "", preferred_name: "", gender: "", birth_date: "", nationality: "中国", ethnicity: "", marital_status: "",
        phone: "", email: "", wechat: "", current_city: "", district: "", address: "", postal_code: "",
        hometown: "", birthplace: "", hukou_location: "", political_status: "", github: "", linkedin: "",
        portfolio: "", work_authorization: "", military_status: ""
      },
      intent: {
        target_roles: [], preferred_cities: [], industries: [], employment_type: "", availability: "",
        days_per_week: "", internship_months: "", salary_monthly: "", relocation: ""
      },
      education: [], language_records: [], experience: [], projects: [], certificates: [], campus_experience: [], volunteer_experience: [],
      skills: { summary: "", languages: "", certificates: "" },
      answers: { self_introduction: "", motivation: "", strengths: "", weaknesses: "", career_plan: "" },
      ai: { provider: "OpenAI-compatible", endpoint: "https://api.openai.com/v1/chat/completions", model: "gpt-4o-mini", api_key: "" },
      sensitive: {
        national_id: "", passport_number: "", bank_account: "", health: "", emergency_contact: "",
        family_information: "", reference_contact: ""
      },
      attachments: [],
      imported_materials: [],
      provenance: {}
    };
  }

  function getPath(object, path) {
    return path.split(".").reduce(function (current, part) {
      if (current === undefined || current === null) return undefined;
      return current[part];
    }, object);
  }

  function setPath(object, path, value) {
    const parts = path.split(".");
    let current = object;
    parts.forEach(function (part, index) {
      const next = parts[index + 1];
      if (index === parts.length - 1) {
        current[part] = value;
        return;
      }
      if (current[part] === undefined || current[part] === null) current[part] = /^\d+$/.test(next) ? [] : {};
      current = current[part];
    });
    return object;
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function ensureProfile(profile) {
    const merged = merge(blankProfile(), profile || {});
    if (!merged.provenance || typeof merged.provenance !== "object") merged.provenance = {};
    return merged;
  }

  function merge(base, patch) {
    if (Array.isArray(base) && Array.isArray(patch)) return clone(patch);
    if (base && typeof base === "object" && patch && typeof patch === "object" && !Array.isArray(patch)) {
      const result = clone(base);
      Object.keys(patch).forEach(function (key) { result[key] = merge(result[key], patch[key]); });
      return result;
    }
    return patch === undefined ? clone(base) : clone(patch);
  }

  function asList(value) {
    if (Array.isArray(value)) return value;
    return String(value || "").split(/[，,、\n]/).map(function (item) { return item.trim(); }).filter(Boolean);
  }

  return {
    fieldDefinitions: fieldDefinitions,
    collectionDefinitions: collectionDefinitions,
    blankProfile: blankProfile,
    ensureProfile: ensureProfile,
    getPath: getPath,
    setPath: setPath,
    clone: clone,
    merge: merge,
    asList: asList
  };
});
