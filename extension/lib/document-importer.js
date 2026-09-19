(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.ResumeCopilotDocuments = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  function decodeXml(value) {
    const textarea = document.createElement("textarea");
    textarea.innerHTML = value;
    return textarea.value;
  }

  function cleanText(value) {
    return String(value || "")
      .replace(/\u0000/g, "")
      .replace(/[ \t]+/g, " ")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }

  function layoutText(content) {
    const lines = [];
    (content.items || []).forEach(function (item) {
      const value = String(item.str || "").trim();
      if (!value) return;
      const transform = item.transform || [];
      const x = Number(transform[4] || 0);
      const y = Number(transform[5] || 0);
      let line = lines.find(function (candidate) { return Math.abs(candidate.y - y) <= 3; });
      if (!line) {
        line = { y: y, items: [] };
        lines.push(line);
      }
      line.items.push({ x: x, value: value });
    });
    return lines.sort(function (left, right) { return right.y - left.y; }).map(function (line) {
      return line.items.sort(function (left, right) { return left.x - right.x; }).map(function (item) { return item.value; }).join(" ");
    }).join("\n");
  }

  async function inflateRaw(bytes) {
    if (typeof DecompressionStream === "undefined") throw new Error("当前浏览器不支持 DOCX 解压");
    const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
    return new Uint8Array(await new Response(stream).arrayBuffer());
  }

  async function readZipEntries(buffer) {
    const view = new DataView(buffer);
    const bytes = new Uint8Array(buffer);
    const decoder = new TextDecoder("utf-8");
    const entries = {};
    let offset = 0;
    while (offset + 30 <= view.byteLength && view.getUint32(offset, true) === 0x04034b50) {
      const method = view.getUint16(offset + 8, true);
      const compressedSize = view.getUint32(offset + 18, true);
      const nameLength = view.getUint16(offset + 26, true);
      const extraLength = view.getUint16(offset + 28, true);
      const name = decoder.decode(bytes.slice(offset + 30, offset + 30 + nameLength));
      const start = offset + 30 + nameLength + extraLength;
      const payload = bytes.slice(start, start + compressedSize);
      entries[name] = method === 0 ? payload : await inflateRaw(payload);
      offset = start + compressedSize;
    }
    return entries;
  }

  async function extractDocx(file) {
    const entries = await readZipEntries(await file.arrayBuffer());
    const xmlBytes = entries["word/document.xml"];
    if (!xmlBytes) throw new Error("DOCX 中没有找到正文");
    const xml = new TextDecoder("utf-8").decode(xmlBytes)
      .replace(/<w:tab\s*\/?\s*>/gi, "\t")
      .replace(/<w:br\s*\/?\s*>/gi, "\n")
      .replace(/<\/w:p\s*>/gi, "\n");
    return { text: cleanText(decodeXml(xml.replace(/<[^>]+>/g, ""))), warnings: [] };
  }

  function pdfLiteral(value) {
    return value.replace(/\\([\\()nrtbf])/g, function (_, code) {
      return ({ n: "\n", r: "\r", t: "\t", b: "\b", f: "\f" })[code] || code;
    }).replace(/\\([0-7]{1,3})/g, function (_, octal) { return String.fromCharCode(parseInt(octal, 8)); });
  }

  function extractPdfFallback(buffer) {
    const source = new TextDecoder("latin1").decode(buffer);
    const parts = [];
    const literalPattern = /\(((?:\\.|[^\\)])*)\)\s*T[Jj]/g;
    let match;
    while ((match = literalPattern.exec(source))) parts.push(pdfLiteral(match[1]));
    const text = cleanText(parts.join(" "));
    const warnings = text
      ? ["PDF.js 未完成解析，已使用兼容模式；如果候选不完整，请换用文字版 PDF。"]
      : ["未提取到可读 PDF 文本，可能是扫描件或图片型 PDF；请先 OCR，或使用文字版 PDF。"];
    return { text: text, warnings: warnings, extractionMethod: "兼容模式" };
  }

  function installPdfCompatibility() {
    // PDF.js 6.x uses URL.parse, while some Chrome/Edge versions do not expose it yet.
    // Keep the polyfill local and standards-based so older browsers can still parse PDFs.
    if (typeof URL !== "undefined" && typeof URL.parse !== "function") {
      URL.parse = function (value, base) {
        try { return new URL(value, base); } catch (error) { return null; }
      };
    }
    // PDF.js 6.x also uses the newer typed-array hex/base64 helpers. They are
    // not available in every Chromium version, so provide small local fallbacks.
    const bytesToBase64 = function (bytes) {
      let binary = "";
      for (let offset = 0; offset < bytes.length; offset += 0x8000) {
        binary += String.fromCharCode.apply(null, bytes.subarray(offset, offset + 0x8000));
      }
      return btoa(binary);
    };
    const base64ToBytes = function (value) {
      const binary = atob(value);
      const bytes = new Uint8Array(binary.length);
      for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
      return bytes;
    };
    if (typeof Uint8Array.prototype.toHex !== "function") {
      Object.defineProperty(Uint8Array.prototype, "toHex", { value: function () {
        return Array.from(this, function (byte) { return byte.toString(16).padStart(2, "0"); }).join("");
      } });
    }
    if (typeof Uint8Array.prototype.toBase64 !== "function") {
      Object.defineProperty(Uint8Array.prototype, "toBase64", { value: function () { return bytesToBase64(this); } });
    }
    if (typeof Uint8Array.fromBase64 !== "function") {
      Object.defineProperty(Uint8Array, "fromBase64", { value: base64ToBytes });
    }
    if (typeof Math.sumPrecise !== "function") {
      Math.sumPrecise = function (values) {
        let total = 0;
        for (const value of values) total += Number(value);
        return total;
      };
    }
  }

  async function extractPdf(buffer) {
    try {
      installPdfCompatibility();
      const pdfjs = await import("./vendor/pdf.min.mjs");
      if (pdfjs.GlobalWorkerOptions) {
        pdfjs.GlobalWorkerOptions.workerSrc = new URL("lib/vendor/pdf.worker.min.mjs", document.baseURI).href;
      }
      const documentProxy = await pdfjs.getDocument({
        data: buffer,
        disableWorker: true,
        useWorkerFetch: false,
        isEvalSupported: false
      }).promise;
      const pages = [];
      for (let pageNumber = 1; pageNumber <= documentProxy.numPages; pageNumber += 1) {
        const page = await documentProxy.getPage(pageNumber);
        const content = await page.getTextContent();
        pages.push(layoutText(content));
      }
      const text = cleanText(pages.join("\n\n"));
      if (!text) {
        return {
          text: "",
          warnings: ["PDF 已打开，但没有文本层，可能是扫描件或图片型 PDF；请先 OCR，或使用文字版 PDF。"],
          extractionMethod: "PDF.js（无文本层）"
        };
      }
      return { text: text, warnings: [], extractionMethod: "PDF.js" };
    } catch (error) {
      const fallback = extractPdfFallback(buffer);
      fallback.warnings.unshift("PDF.js 解析未完成，已使用兼容模式：" + error.message);
      return fallback;
    }
  }

  async function readFile(file) {
    const suffix = file.name.toLowerCase().split(".").pop();
    if (["txt", "md", "csv"].includes(suffix)) return { text: cleanText(await file.text()), warnings: [] };
    if (suffix === "json") return { json: JSON.parse(await file.text()), text: "", warnings: [] };
    if (suffix === "docx") return extractDocx(file);
    if (suffix === "pdf" || file.type === "application/pdf") return extractPdf(await file.arrayBuffer());
    if (["jpg", "jpeg", "png", "webp"].includes(suffix)) {
      return { text: "", warnings: ["图片已识别为附件，但当前扩展不内置 OCR 引擎。请使用文字版材料，或先将 OCR 文字复制到导入框。"] };
    }
    throw new Error("暂不支持的文件类型：" + suffix);
  }

  function findFirst(text, expressions) {
    for (const expression of expressions) {
      const match = expression.exec(text);
      if (match && match[1]) return match[1].trim();
    }
    return "";
  }

  function stripBullet(value) {
    return String(value || "").replace(/^[\s•·●▪▸*\-]+/, "").trim();
  }

  function normalizeDate(value) {
    return String(value || "").replace(/\s+/g, "").replace(/[年月./]/g, "-").replace(/-+$/, "");
  }

  function dateRange(line) {
    const dateToken = "(?:19|20)\\d{2}(?:\\s*[年./-]\\s*\\d{1,2}(?:\\s*月)?)?";
    const expression = new RegExp("(" + dateToken + ")\\s*(?:至|到|[-—–~～])\\s*(" + dateToken + "|至今|现在)", "i");
    const match = expression.exec(line);
    if (!match) return null;
    return { start: normalizeDate(match[1]), end: match[2].includes("今") || match[2].includes("现") ? "至今" : normalizeDate(match[2]), index: match.index, length: match[0].length };
  }

  function sectionKey(line) {
    const rawValue = stripBullet(line).trim();
    const value = rawValue.replace(/[：:]\s*$/, "").trim();
    const headingWithColon = /^(教育背景|教育经历|教育情况|学历背景|学习经历|教育信息|实习经历|工作经历|实习\/工作经历|工作经验|职业经历|项目经历|项目经验|科研经历|竞赛项目|学生干部经历|校园经历|校园实践|社团经历|学生工作|志愿经历|志愿服务|社会实践|社会活动|证书、荣誉与技能|技能特长|专业技能|技能与证书|个人技能|技术栈|自我介绍|自我评价|个人总结|个人简介|求职动机|应聘动机|申请理由|职业规划|发展规划|未来规划|优势|个人优势|不足|劣势|需要改进)[：:]$/;
    // A normal content line such as “证书：英语六级” may contain a section
    // keyword, but it must not start a new section.
    if (/[：:]/.test(rawValue) && !headingWithColon.test(rawValue)) return "";
    if (/教育(背景|经历|情况|信息)|学历背景|学习经历/.test(value)) return "education";
    if (/(实习|工作)(经历|经验)|职业经历/.test(value)) return "experience";
    if (/项目(经历|经验)|科研经历|竞赛项目/.test(value)) return "projects";
    if (/(学生干部|校园|学生工作|社团).*(经历|实践|工作)?/.test(value)) return "campus_experience";
    if (/(志愿|社会实践|社会活动).*/.test(value)) return "volunteer_experience";
    if (/(证书|荣誉|奖项|竞赛).*/.test(value)) return "certificates";
    if (/(技能|技术栈|语言能力|数据与软件).*/.test(value)) return "skills";
    if (/(求职偏好|求职意向|常见问答|申请问答)/.test(value)) return "answers.general";
    if (/(附件|材料清单|资料清单)/.test(value)) return "attachments";
    if (/^(自我介绍|自我评价|个人总结|个人简介)$/.test(value)) return "answers.self_introduction";
    if (/^(求职动机|应聘动机|申请理由)$/.test(value)) return "answers.motivation";
    if (/^(职业规划|发展规划|未来规划)$/.test(value)) return "answers.career_plan";
    if (/^(优势|个人优势)$/.test(value)) return "answers.strengths";
    if (/^(不足|劣势|需要改进)$/.test(value)) return "answers.weaknesses";
    return "";
  }

  function splitHeader(value) {
    const pieces = String(value || "").split(/\s*[|｜]\s*/).map(function (part) { return part.trim(); }).filter(Boolean);
    if (pieces.length > 1) return [pieces[0], pieces.slice(1).join(" | ")];
    return [String(value || "").trim(), ""];
  }

  function splitEducationHeader(value) {
    const raw = String(value || "").replace(/[：:]/g, ":").trim();
    const labeledSchool = raw.match(/(?:学校|院校|毕业院校)\s*:\s*([^|｜]+)/i);
    const labeledMajor = raw.match(/(?:专业|主修)\s*:\s*([^|｜]+)/i);
    const labeledDepartment = raw.match(/(?:院系|学院|系所|department|faculty)\s*:\s*([^|｜]+)/i);
    const labeledDegree = raw.match(/(?:学历|学位|degree)\s*:\s*([^|｜]+)/i);
    const chunks = raw.split(/\s*(?:\||｜|｜|·|\s+-\s+|\s+—\s+|\s+–\s+)\s*/).map(function (part) { return part.trim(); }).filter(Boolean);
    let school = labeledSchool ? labeledSchool[1].trim() : (chunks[0] || raw);
    let rest = labeledSchool ? chunks.filter(function (part) { return part !== school; }) : chunks.slice(1);
    let degree = labeledDegree ? labeledDegree[1].trim() : "";
    const degreePattern = /(博士研究生|硕士研究生|研究生|博士|硕士|本科生|本科|学士|大专|专科|高中|中专|Ph\.?D\.?|Master(?:'s)?|Bachelor(?:'s)?)/i;
    const degreeSource = rest.join(" ");
    const degreeMatch = degreeSource.match(degreePattern);
    if (!degree && degreeMatch) degree = degreeMatch[1];
    let nonDegree = rest.join(" ").replace(degreePattern, " ").replace(/\s+/g, " ").trim();
    let department = labeledDepartment ? labeledDepartment[1].trim() : "";
    let major = labeledMajor ? labeledMajor[1].trim() : "";
    if (!major && nonDegree) {
      const nonDegreeParts = nonDegree.split(/\s*[,，;/；]\s*/).map(function (part) { return part.trim(); }).filter(Boolean);
      const departmentIndex = nonDegreeParts.findIndex(function (part) { return /学院|院系|系所|研究院|department|faculty/i.test(part); });
      if (!department && departmentIndex >= 0) department = nonDegreeParts[departmentIndex];
      if (departmentIndex >= 0) nonDegreeParts.splice(departmentIndex, 1);
      major = nonDegreeParts.join(" ").trim();
    }
    if (!major && rest.length === 1 && !degreeMatch) major = rest[0];
    return {
      school: school.replace(/\s+/g, " ").trim(),
      department: department.replace(/\s+/g, " ").trim(),
      major: major.replace(/\s+/g, " ").trim(),
      degree: degree.trim()
    };
  }

  function sectionBlocks(lines) {
    const blocks = [];
    let current = null;
    lines.forEach(function (line) {
      const key = sectionKey(line);
      if (key) {
        current = { key: key, lines: [] };
        blocks.push(current);
      } else if (current) {
        current.lines.push(line);
      }
    });
    return blocks;
  }

  function datedRecords(lines) {
    const records = [];
    let current = null;
    lines.forEach(function (rawLine) {
      const line = String(rawLine || "").trim();
      if (!line) return;
      const range = dateRange(line);
      const bulletLine = /^[\s•·●▪▸*-]/.test(line);
      if (range && !bulletLine) {
        current = { header: line.slice(0, range.index).trim(), dates: range, details: [] };
        records.push(current);
        const trailing = line.slice(range.index + range.length).trim();
        if (trailing) current.details.push(stripBullet(trailing));
      } else if (current) {
        current.details.push(stripBullet(line));
      }
    });
    return records;
  }

  function joinDetails(details) {
    return details.filter(Boolean).join("；").trim();
  }

  function matchingDetails(details, expression) {
    return joinDetails(details.filter(function (detail) { return expression.test(detail); }));
  }

  function labeledValue(text, labelPattern, nextPattern) {
    const expression = new RegExp("(?:" + labelPattern + ")\\s*(?:[：:]\\s*)?([\\s\\S]*?)(?=(?:" + nextPattern + ")\\s*(?:[：:]|\\s)|$)", "i");
    const match = expression.exec(String(text || ""));
    return match && match[1] ? match[1].replace(/\\s+/g, " ").replace(/[，,；;。.]\s*$/, "").trim() : "";
  }

  function toolSummary(details) {
    const knownPattern = /(?:Python|SQL|Excel|Tableau|SPSS|Stata|Figma|Power BI|JavaScript|TypeScript|C\+\+|Java|R语言|Matlab)/gi;
    const values = [];
    details.forEach(function (detail) {
      const explicit = /^(工具|技术|技能|软件|技术栈)\s*[：:]/.test(detail.trim());
      const relevant = explicit || /使用|熟悉|掌握|负责/.test(detail);
      if (!relevant) return;
      const clean = detail.replace(/^(工具|技术|技能|软件|技术栈)\s*[：:]\s*/, "").trim();
      const matches = clean.match(knownPattern);
      if (matches && matches.length) matches.forEach(function (value) { values.push(value); });
      else if (explicit && clean) values.push(clean);
    });
    return Array.from(new Set(values.map(function (value) { return value.trim(); }).filter(Boolean))).join("、");
  }

  function extractStructuredCandidates(lines, add) {
    sectionBlocks(lines).forEach(function (block) {
      if (block.key === "attachments") return;
      if (block.key === "answers.general") {
        const fullText = block.lines.join("\n");
        const nextField = "目标岗位|意向岗位|目标城市|期望城市|到岗时间|入职时间|期望薪资|薪资|薪酬|就业类型|工作类型|可接受出差|自我介绍|求职动机|职业规划|优势与不足|优势|不足";
        const targetRoles = labeledValue(fullText, "目标岗位|意向岗位", nextField);
        const cities = labeledValue(fullText, "目标城市|期望城市", nextField);
        const availability = labeledValue(fullText, "到岗时间|入职时间", nextField);
        const salary = labeledValue(fullText, "期望薪资|薪资|薪酬", nextField);
        const employmentType = labeledValue(fullText, "就业类型|工作类型", nextField);
        const selfIntroduction = labeledValue(fullText, "自我介绍|自我评价", "求职动机|职业规划|优势与不足|优势|不足");
        const motivation = labeledValue(fullText, "求职动机|应聘动机|申请理由", "职业规划|优势与不足|优势|不足");
        const careerPlan = labeledValue(fullText, "职业规划|发展规划|未来规划", "优势与不足|优势|不足");
        const strengths = labeledValue(fullText, "优势", "不足|$" );
        if (targetRoles) add("intent.target_roles", targetRoles, false, "求职偏好·目标岗位", 0.78);
        if (cities) add("intent.preferred_cities", cities, false, "求职偏好·目标城市", 0.78);
        if (availability) add("intent.availability", availability, false, "求职偏好·到岗时间", 0.78);
        if (salary) add("intent.salary_monthly", salary, true, "求职偏好·期望薪资", 0.76);
        if (employmentType) add("intent.employment_type", employmentType, false, "求职偏好·就业类型", 0.78);
        if (selfIntroduction) add("answers.self_introduction", selfIntroduction, false, "申请问答·自我介绍", 0.80);
        if (motivation) add("answers.motivation", motivation, false, "申请问答·求职动机", 0.80);
        if (careerPlan) add("answers.career_plan", careerPlan, false, "申请问答·职业规划", 0.80);
        if (strengths) add("answers.strengths", strengths, false, "申请问答·优势", 0.78);
        return;
      }
      if (block.key.indexOf("answers.") === 0) {
        add(block.key, joinDetails(block.lines), false, "简历中的" + block.key.slice(8), 0.86);
        return;
      }
      if (block.key === "skills") {
        const text = joinDetails(block.lines);
        add("skills.summary", text, false, "技能特长（完整）", 0.84);
        const languageLine = block.lines.find(function (line) { return /语言|英语|日语|韩语|普通话|外语/.test(line); });
        if (languageLine) add("skills.languages", stripBullet(languageLine), false, "语言能力", 0.84);
        return;
      }
      if (block.key === "certificates") {
        const skillLines = block.lines.filter(function (line) { return /数据与软件|技能|技术|语言能力|外语/.test(line); });
        if (skillLines.length) add("skills.summary", joinDetails(skillLines), false, "技能特长（完整）", 0.84);
        const items = block.lines.reduce(function (result, line) {
          if (/数据与软件|技能|技术|语言能力|外语/.test(line)) return result;
          if (/^[^：:]{1,20}[：:]\s*$/.test(line.trim())) return result;
          const itemLine = stripBullet(line).replace(/^(证书与荣誉|证书|荣誉奖项|竞赛获奖|奖项荣誉)\s*[：:]\s*/, "");
          return result.concat(itemLine.split(/[；;]/).map(function (item) { return item.trim(); }).filter(Boolean));
        }, []);
        items.forEach(function (item, index) {
          const pieces = item.split(/[：:]/);
          add("certificates." + index + ".name", pieces[0], false, "证书/荣誉名称", 0.78);
          if (pieces[1]) add("certificates." + index + ".notes", pieces.slice(1).join("："), false, "证书/荣誉说明", 0.74);
        });
        return;
      }

      const records = datedRecords(block.lines);
      if (block.key === "education" && !records.length) {
        const fullText = block.lines.join("\n");
        const header = block.lines.find(function (line) { return /(大学|学院|研究院|学校|院校)/.test(line); }) || "";
        const education = splitEducationHeader(header);
        const school = education.school || findFirst(fullText, [/(?:毕业院校|学校|院校)[：:]\s*([^\n，,]+)/i]);
        const department = education.department || findFirst(fullText, [/(?:院系|学院|系所|研究院)[：:]\s*([^\n，,]+)/i]);
        const major = education.major || findFirst(fullText, [/(?:专业|主修)[：:]\s*([^\n，,]+)/i]);
        const degree = education.degree || findFirst(fullText, [/(?:学历|学位)[：:]\s*([^\n，,]+)/i]);
        const start = findFirst(fullText, [/(?:入学时间|教育开始|开始时间)[：:]\s*([^\s至到-]+)/i]);
        const end = findFirst(fullText, [/(?:毕业时间|教育结束|结束时间)[：:]\s*([^\s至到-]+)/i]);
        const gpa = labeledValue(fullText, "GPA|平均分|绩点", "专业排名|排名|名次|核心课程|课程");
        const ranking = labeledValue(fullText, "专业排名|排名|名次", "核心课程|课程|GPA|平均分|绩点");
        const courses = labeledValue(fullText, "核心课程|主修课程|课程", "不存在的下一个字段");
        if (school) add("education.0.school", school, false, "教育经历·学校", 0.84);
        if (department) add("education.0.department", department, false, "教育经历·院系", 0.82);
        if (major) add("education.0.major", major, false, "教育经历·专业", 0.84);
        if (degree) add("education.0.degree", degree, false, "教育经历·学历/学位", 0.84);
        if (start) add("education.0.start_date", start, false, "教育经历·开始时间", 0.78);
        if (end) add("education.0.end_date", end, false, "教育经历·结束时间", 0.78);
        if (gpa) add("education.0.gpa", gpa, false, "教育经历·GPA", 0.82);
        if (ranking) add("education.0.ranking", ranking, false, "教育经历·排名", 0.82);
        if (courses) add("education.0.courses", courses, false, "教育经历·课程", 0.78);
        return;
      }
      records.forEach(function (record, index) {
        const parts = splitHeader(record.header);
        const prefix = block.key + "." + index + ".";
        const details = record.details.slice();
        if (block.key === "education") {
          let header = record.header;
          if (!header && details.length && !/^研究方向|^GPA|^平均分|^绩点|^排名|^专业排名|^核心课程|^课程/.test(details[0])) header = details.shift();
          const education = splitEducationHeader(header);
          if (education.school) add(prefix + "school", education.school, false, "教育经历·学校", 0.86);
          if (education.department) add(prefix + "department", education.department, false, "教育经历·院系", 0.82);
          if (education.major) add(prefix + "major", education.major, false, "教育经历·专业", 0.84);
          if (education.degree) add(prefix + "degree", education.degree, false, "教育经历·学历/学位", 0.86);
          add(prefix + "start_date", record.dates.start, false, "教育经历·开始时间", 0.82);
          add(prefix + "end_date", record.dates.end, false, "教育经历·结束时间", 0.82);
          const educationText = joinDetails(details);
          const gpa = labeledValue(educationText, "GPA|平均分|绩点", "专业排名|排名|名次|核心课程|课程");
          const ranking = labeledValue(educationText, "专业排名|排名|名次", "核心课程|课程|GPA|平均分|绩点");
          const courses = labeledValue(educationText, "核心课程|主修课程|课程", "不存在的下一个字段");
          const department = labeledValue(educationText, "院系|学院|系所|研究院", "专业|主修|学历|学位|GPA|平均分|绩点|课程");
          const major = labeledValue(educationText, "专业|主修", "学历|学位|GPA|平均分|绩点|排名|课程");
          if (department && !education.department) add(prefix + "department", department, false, "教育经历·院系", 0.80);
          if (major && !education.major) add(prefix + "major", major, false, "教育经历·专业", 0.82);
          if (gpa) add(prefix + "gpa", gpa, false, "教育经历·GPA", 0.82);
          if (ranking) add(prefix + "ranking", ranking, false, "教育经历·排名", 0.82);
          if (courses) add(prefix + "courses", courses, false, "教育经历·课程", 0.78);
        } else if (block.key === "experience") {
          add(prefix + "company", parts[0], false, "实习/工作·公司", 0.84);
          if (parts[1]) add(prefix + "title", parts[1], false, "实习/工作·职位", 0.82);
          add(prefix + "start_date", record.dates.start, false, "实习/工作·开始时间", 0.82);
          add(prefix + "end_date", record.dates.end, false, "实习/工作·结束时间", 0.82);
          add(prefix + "description", joinDetails(details), false, "实习/工作·职责完整内容", 0.76);
          const achievements = matchingDetails(details, /成果|结果|提升|减少|增加|增长|获|达成|指标|采纳|定位\s*\d+|识别\s*\d+|\d+\+?\s*(?:万|人次|份|次|%)|\d+%/);
          const tools = toolSummary(details);
          if (achievements) add(prefix + "achievements", achievements, false, "实习/工作·成果", 0.74);
          if (tools) add(prefix + "tools", tools, false, "实习/工作·工具/技能", 0.76);
        } else if (block.key === "projects") {
          add(prefix + "name", parts[0], false, "项目·名称", 0.84);
          if (parts[1]) add(prefix + "role", parts[1], false, "项目·角色", 0.80);
          add(prefix + "start_date", record.dates.start, false, "项目·开始时间", 0.82);
          add(prefix + "end_date", record.dates.end, false, "项目·结束时间", 0.82);
          const complete = joinDetails(details);
          add(prefix + "description", complete, false, "项目·完整内容", 0.74);
          const results = matchingDetails(details, /结果|成果|提升|减少|增加|增长|获|达成|指标|采纳|定位\s*\d+|识别\s*\d+|\d+\+?\s*(?:万|人次|份|次|%)|\d+%/);
          if (results) add(prefix + "results", results, false, "项目·结果/指标", 0.74);
          const tools = toolSummary(details);
          if (tools) add(prefix + "tools", tools, false, "项目·工具/技术", 0.76);
        } else if (block.key === "campus_experience") {
          add(prefix + "organization", parts[0], false, "校园经历·组织", 0.82);
          if (parts[1]) add(prefix + "role", parts[1], false, "校园经历·职务", 0.80);
          add(prefix + "start_date", record.dates.start, false, "校园经历·开始时间", 0.82);
          add(prefix + "end_date", record.dates.end, false, "校园经历·结束时间", 0.82);
          add(prefix + "description", joinDetails(details), false, "校园经历·工作内容", 0.74);
          const achievements = matchingDetails(details, /成果|结果|提升|减少|增加|增长|获|达成|指标|采纳|定位\s*\d+|识别\s*\d+|\d+\+?\s*(?:万|人次|份|次|%)|\d+%/);
          if (achievements) add(prefix + "achievements", achievements, false, "校园经历·成果", 0.74);
        } else if (block.key === "volunteer_experience") {
          add(prefix + "organization", parts[0], false, "志愿经历·组织", 0.82);
          add(prefix + "activity", parts[0], false, "志愿经历·活动", 0.76);
          if (parts[1]) add(prefix + "role", parts[1], false, "志愿经历·角色", 0.78);
          add(prefix + "start_date", record.dates.start, false, "志愿经历·开始时间", 0.82);
          add(prefix + "end_date", record.dates.end, false, "志愿经历·结束时间", 0.82);
          add(prefix + "description", joinDetails(details), false, "志愿经历·活动内容", 0.74);
          const hours = details.find(function (detail) { return /小时|时长/.test(detail); });
          if (hours) add(prefix + "hours", hours, false, "志愿经历·服务时长", 0.78);
        }
      });
    });
  }

  function candidatesFromText(text, sourceDocument) {
    const candidates = [];
    const seen = {};
    const lines = String(text || "").split(/\r?\n/).map(function (line) { return line.replace(/\s+/g, " ").trim(); }).filter(Boolean);
    const add = function (path, value, sensitive, label, confidence) {
      value = String(value || "").replace(/^[•·\-\s]+|[\s]+$/g, "").trim();
      if (!value || seen[path]) return;
      seen[path] = true;
      candidates.push({ path: path, value: value, sensitive: Boolean(sensitive), label: label || path, sourceDocument: sourceDocument, confidence: confidence === undefined ? 0.82 : confidence });
    };

    const nameLine = lines.find(function (line) { return /^[\u4e00-\u9fa5·]{2,6}$/.test(line) && !/(教育背景|项目经历|实习经历|技能特长|自我评价)/.test(line); });
    add("personal.full_name", findFirst(text, [/姓名[：:]\s*([^\s\n，,]{2,12})/i]) || nameLine, false, "姓名");
    add("personal.phone", findFirst(text, [/(?:手机|手机号|联系电话|电话)[：:\s]*(1\d{10})/i, /(1\d{10})/]), false, "手机号");
    add("personal.email", findFirst(text, [/(?:邮箱|电子邮箱|email)[：:\s]*([\w.+-]+@[\w.-]+\.[A-Za-z]{2,})/i, /([\w.+-]+@[\w.-]+\.[A-Za-z]{2,})/i]), false, "邮箱");
    add("personal.gender", findFirst(text, [/(?:性别|gender|sex)[：:\s]*(男|女|男性|女性|其他|不便透露|male|female|other)/i, /^(男|女|男性|女性)$/m]), false, "性别");
    add("personal.ethnicity", findFirst(text, [/(?:民族|民族成分|ethnicity)[：:\s]*([^\s\n，,]+)/i]), false, "民族");
    add("personal.marital_status", findFirst(text, [/(?:婚姻状况|婚姻状态|marital status)[：:\s]*(未婚|已婚|离异|丧偶|保密|single|married|divorced|widowed)/i]), false, "婚姻状况");
    add("personal.birth_date", findFirst(text, [/(?:出生日期|出生年月|生日)[：:\s]*(\d{4}[年\/-]\d{1,2}(?:月)?(?:[日\/-]\d{1,2})?)/i]), true, "出生日期");
    add("sensitive.national_id", findFirst(text, [/(?:身份证号|身份证号码|公民身份号码)[：:\s]*([0-9Xx]{15,18})/i]), true, "身份证号");
    add("personal.hometown", findFirst(text, [/(?:籍贯)[：:\s]*([^\s\n，,]+)/i]), true, "籍贯");
    add("personal.birthplace", findFirst(text, [/(?:生源地)[：:\s]*([^\s\n，,]+)/i]), true, "生源地");
    add("personal.hukou_location", findFirst(text, [/(?:户籍所在地|户口所在地)[：:\s]*([^\n]+)/i]), true, "户籍所在地");
    add("personal.political_status", findFirst(text, [/(?:政治面貌)[：:\s]*([^\s\n，,]+)/i, /^(中共党员|共产党员|共青团员|群众|民革党员|民盟盟员)$/m]), true, "政治面貌");
    add("personal.github", findFirst(text, [/(https?:\/\/github\.com\/[\w.-]+)/i]), false, "GitHub");
    add("personal.portfolio", findFirst(text, [/(?:作品集|个人主页|portfolio)[：:\s]*(https?:\/\/\S+)/i]), false, "作品集");

    const educationLine = lines.find(function (line) {
      return /(大学|学院|研究院)/.test(line) && /\d{4}[年.\/-]\d{1,2}/.test(line) && !/(主修课程|专业成绩)/.test(line);
    });
    if (educationLine) {
      const dateIndex = educationLine.search(/\d{4}[年.\/-]\d{1,2}/);
      const beforeDate = dateIndex >= 0 ? educationLine.slice(0, dateIndex).trim() : educationLine;
      const pieces = beforeDate.split(/\s*[|｜]\s*|\s+[-—–]\s+/).map(function (piece) { return piece.trim(); }).filter(Boolean);
      add("education.0.school", pieces[0] || beforeDate, false, "学校");
      const inferredMajor = pieces[1] || findFirst(text, [/(?:专业|主修)[：:]\s*([^\n，,]+)/i]);
      add("education.0.major", inferredMajor.replace(/\s*(本科|硕士|博士|大专|专科|高中|研究生|本科生)\s*$/, "").trim(), false, "专业");
    } else {
      add("education.0.school", findFirst(text, [/(?:毕业院校|学校|院校)[：:\s]*([^\n，,]+)/i]), false, "学校");
      add("education.0.major", findFirst(text, [/(?:专业|主修)[：:]\s*([^\n，,]+)/i]), false, "专业");
    }
    add("education.0.degree", findFirst(text, [/(?:学历|学位)[：:]\s*(本科|硕士|博士|大专|专科|高中|本科生|研究生)/i]), false, "学历/学位");
    add("skills.languages", findFirst(text, [/(?:语言能力|外语)[：:]\s*([^\n]+)/i]), false, "语言能力");

    const projectLine = lines.find(function (line) { return /(大赛|项目)/.test(line) && /\d{4}[年.\/-]\d{1,2}/.test(line) && !/项目经历/.test(line); });
    if (projectLine) {
      const dateIndex = projectLine.search(/\d{4}[年.\/-]\d{1,2}/);
      const beforeDate = dateIndex >= 0 ? projectLine.slice(0, dateIndex).trim() : projectLine;
      const parts = beforeDate.split(/\s*[|｜]\s*|\s+[-—–]\s+/).map(function (part) { return part.trim(); }).filter(Boolean);
      add("projects.0.name", parts[0] || beforeDate, false, "项目名称");
      add("projects.0.role", parts[1] || "", false, "项目角色");
    }

    const experienceLine = lines.find(function (line) {
      return /\d{4}[年.\/-]\d{1,2}\s*[-—–]\s*(?:\d{4}[年.\/-]\d{1,2}|至今)/.test(line) && !/(大学|学院|研究院|项目|大赛)/.test(line);
    });
    if (experienceLine) {
      const dateIndex = experienceLine.search(/\d{4}[年.\/-]\d{1,2}/);
      const beforeDate = dateIndex >= 0 ? experienceLine.slice(0, dateIndex).trim() : experienceLine;
      const parts = beforeDate.split(/\s*[|｜]\s*|\s+[-—–]\s+/).map(function (part) { return part.trim(); }).filter(Boolean);
      const dates = experienceLine.match(/\d{4}[年.\/-]\d{1,2}/g) || [];
      add("experience.0.company", parts[0] || beforeDate, false, "最近公司");
      add("experience.0.title", parts[1] || "", false, "岗位名称");
      add("experience.0.start_date", dates[0] || "", false, "实习开始时间");
      add("experience.0.end_date", dates[1] || (experienceLine.includes("至今") ? "至今" : ""), false, "实习结束时间");
    }

    const skillIndex = lines.findIndex(function (line) { return line === "技能特长"; });
    if (skillIndex >= 0) add("skills.summary", lines.slice(skillIndex + 1, skillIndex + 7).join("；"), false, "技能特长");
    const introIndex = lines.findIndex(function (line) { return line === "自我评价"; });
    if (introIndex >= 0) add("answers.self_introduction", lines.slice(introIndex + 1, introIndex + 5).join("；"), false, "自我评价");
    extractStructuredCandidates(lines, add);
    return candidates;
  }

  async function importFiles(files) {
    const result = { candidates: [], documents: [], warnings: [] };
    for (const file of Array.from(files || [])) {
      const extracted = await readFile(file);
      result.documents.push({
        name: file.name,
        type: file.type || "",
        size: file.size,
        extractedCharacters: String(extracted.text || "").length,
        extractionMethod: extracted.extractionMethod || "文本读取",
        extractedText: String(extracted.text || ""),
        importedAt: new Date().toISOString()
      });
      result.warnings = result.warnings.concat(extracted.warnings || []);
      if (extracted.json && typeof extracted.json === "object") {
        result.candidates.push({ path: "__profile__", value: extracted.json, sensitive: false, label: "JSON 资料", sourceDocument: file.name, confidence: 1 });
      } else {
        const fileCandidates = candidatesFromText(extracted.text, file.name);
        result.candidates = result.candidates.concat(fileCandidates);
        if (file.name.toLowerCase().endsWith(".pdf") && extracted.text && !fileCandidates.length) {
          result.warnings.push("PDF 已提取出文字，但暂时没有匹配到已知个人字段；请查看 PDF 是否使用了特殊排版或字段名称。 ");
        }
      }
    }
    return result;
  }

  return { readFile: readFile, importFiles: importFiles, candidatesFromText: candidatesFromText };
});
