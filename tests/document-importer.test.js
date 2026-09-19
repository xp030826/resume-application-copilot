const test = require("node:test");
const assert = require("node:assert/strict");
const importer = require("../extension/lib/document-importer.js");

test("extracts common profile candidates and marks restricted values", function () {
  const candidates = importer.candidatesFromText(
    "姓名：张三\n手机：13800138000\n邮箱：a@example.com\n籍贯：广东\n身份证号：440100199901011234",
    "resume.txt"
  );
  const byPath = Object.fromEntries(candidates.map((candidate) => [candidate.path, candidate]));
  assert.equal(byPath["personal.full_name"].value, "张三");
  assert.equal(byPath["personal.phone"].value, "13800138000");
  assert.equal(byPath["personal.gender"], undefined);
  assert.equal(byPath["sensitive.national_id"].sensitive, true);
  assert.equal(byPath["personal.hometown"].sensitive, true);
});

test("extracts gender as a normal profile field", function () {
  const candidates = importer.candidatesFromText("姓名：李四\n性别：女\n专业：计算机科学与技术", "gender-resume.pdf");
  const gender = candidates.find((candidate) => candidate.path === "personal.gender");
  assert.equal(gender.value, "女");
  assert.equal(gender.sensitive, false);
});

test("does not invent candidates from unrelated text", function () {
  assert.deepEqual(importer.candidatesFromText("这是一段没有个人字段的项目说明", "notes.txt"), []);
});

test("recognizes a resume-style layout without explicit labels", function () {
  const candidates = importer.candidatesFromText(
    "邹秀萍\n中共党员\n17819239598 xiuping@example.com\n暨南大学经济与社会研究院 - 应用经济学 2025.09 - 至今\n“正大杯”全国大学生市场调查和分析大赛 国家一等奖 - 组长 2023.10 - 2024.06\n亚信科技艾瑞咨询 - 用户体验研究员 2024.10 - 2024.12",
    "resume.pdf"
  );
  const byPath = Object.fromEntries(candidates.map((candidate) => [candidate.path, candidate]));
  assert.equal(byPath["personal.full_name"].value, "邹秀萍");
  assert.equal(byPath["education.0.school"].value, "暨南大学经济与社会研究院");
  assert.equal(byPath["education.0.major"].value, "应用经济学");
  assert.equal(byPath["projects.0.role"].value, "组长");
  assert.equal(byPath["experience.0.title"].value, "用户体验研究员");
});

test("keeps multiple resume sections and record details as candidates", function () {
  const candidates = importer.candidatesFromText([
    "林知夏",
    "教育背景",
    "华南理工大学 | 应用经济学 硕士 2025.09 – 2028.06",
    "研究方向：数字经济与消费者行为。",
    "华南理工大学经济与金融学院 | 经济学 本科 2021.09 – 2025.06",
    "GPA 3.8/4.0，专业排名 8/120。",
    "实习经历",
    "广州启明数据科技有限公司 | 数据分析实习生 2024.07 – 2024.09",
    "使用 SQL 与 Python 清洗数据，减少人工统计时间约 60%。",
    "南方创想咨询有限公司 | 用户研究实习生 2025.01 – 2025.04",
    "完成 20 次访谈，输出研究报告。",
    "项目经历",
    "城市青年消费洞察 | 项目负责人 2023.10 – 2024.06",
    "组织 6 人小组，项目成果获一等奖。",
    "校园经历",
    "华南理工大学学生会学习部 | 部长 2022.09 – 2023.06",
    "策划 8 场活动，服务学生 1000+ 人次。",
    "证书与荣誉",
    "大学英语六级（590）；全国计算机等级考试二级"
  ].join("\n"), "resume.pdf");
  const byPath = Object.fromEntries(candidates.map((candidate) => [candidate.path, candidate]));
  assert.equal(byPath["education.0.school"].value, "华南理工大学");
  assert.equal(byPath["education.1.school"].value, "华南理工大学经济与金融学院");
  assert.equal(byPath["experience.1.title"].value, "用户研究实习生");
  assert.match(byPath["experience.0.description"].value, /SQL/);
  assert.equal(byPath["education.1.gpa"].value, "3.8/4.0");
  assert.equal(byPath["education.1.ranking"].value, "8/120");
  assert.equal(byPath["education.1.gpa"].sensitive, false);
  assert.equal(byPath["education.1.ranking"].sensitive, false);
  assert.equal(byPath["experience.0.tools"].value, "SQL、Python");
  assert.equal(byPath["projects.0.role"].value, "项目负责人");
  assert.equal(byPath["campus_experience.0.role"].value, "部长");
  assert.equal(byPath["certificates.1.name"].value, "全国计算机等级考试二级");
});

test("parses labeled education details when no date-range header exists", function () {
  const candidates = importer.candidatesFromText([
    "教育经历",
    "学校：示例大学",
    "院系：经济与金融学院",
    "专业：应用经济学",
    "学历：本科",
    "入学时间：2021.09",
    "毕业时间：2025.06",
    "GPA：3.7/4.0；专业排名：5/100",
    "核心课程：计量经济学、统计学、数据分析"
  ].join("\n"), "labeled-resume.pdf");
  const byPath = Object.fromEntries(candidates.map((candidate) => [candidate.path, candidate]));
  assert.equal(byPath["education.0.school"].value, "示例大学");
  assert.equal(byPath["education.0.department"].value, "经济与金融学院");
  assert.equal(byPath["education.0.major"].value, "应用经济学");
  assert.equal(byPath["education.0.degree"].value, "本科");
  assert.equal(byPath["education.0.start_date"].value, "2021-09");
  assert.equal(byPath["education.0.end_date"].value, "2025-06");
  assert.equal(byPath["education.0.gpa"].value, "3.7/4.0");
  assert.equal(byPath["education.0.ranking"].value, "5/100");
  assert.match(byPath["education.0.courses"].value, /计量经济学/);
});

test("keeps day precision when parsing dates", function () {
  const candidates = importer.candidatesFromText([
    "出生日期：2001年2月3日",
    "教育经历",
    "学校：示例大学",
    "入学时间：2021-09-01",
    "毕业时间：2025/06/30"
  ].join("\n"), "date-resume.pdf");
  const byPath = Object.fromEntries(candidates.map((candidate) => [candidate.path, candidate]));
  assert.equal(byPath["personal.birth_date"].value, "2001-02-03");
  assert.equal(byPath["education.0.start_date"].value, "2021-09-01");
  assert.equal(byPath["education.0.end_date"].value, "2025-06-30");
});

test("extracts education type, marital status, and structured language records", function () {
  const candidates = importer.candidatesFromText([
    "婚姻状况：未婚",
    "教育经历",
    "学校：示例大学",
    "学校类型：双一流公办本科",
    "最高学历：本科",
    "语言能力：英语 CET-6 580；日语 N2"
  ].join("\n"), "complete-profile.pdf");
  const byPath = Object.fromEntries(candidates.map((candidate) => [candidate.path, candidate]));
  assert.equal(byPath["personal.marital_status"].value, "未婚");
  assert.equal(byPath["education.0.school_type"].value, "双一流公办本科");
  assert.equal(byPath["education.0.degree"].value, "本科");
  assert.equal(byPath["language_records.0.language"].value, "英语");
  assert.equal(byPath["language_records.0.score"].value, "580");
  assert.equal(byPath["language_records.0.exam"].value, "CET-6");
  assert.equal(byPath["language_records.0.score_scale"].value, "710分制");
  assert.equal(byPath["language_records.1.level"].value, "N2");
  assert.equal(byPath["language_records.1.score_scale"].value, "等级制");
  assert.equal(byPath["language_records.1.language"].value, "日语");
});
