# Resume Application Copilot

一个隐私优先的 Chrome / Edge 求职申请自动填充扩展。
它把简历和其他材料整理成可复核的个人资料库，在你自己打开的招聘页面中识别字段、展示匹配结果，并在你确认后填写。

A privacy-first Chrome / Edge browser extension for job applications.
It turns resumes and supporting materials into a reviewable local profile vault, detects fields on recruitment pages opened by you, previews the matches, and fills them only after your confirmation.

扩展不会自动寻找职位、点击下一步、绕过验证码、批量投递或点击最终提交。

The extension does not search for jobs, click Next, bypass CAPTCHAs, submit applications in bulk, or click final Submit buttons.

## 目录 · Contents

- `extension/`：Chrome/Edge Manifest V3 扩展源码 · Manifest V3 extension source
- `release/`：可分发的扩展安装 ZIP · Distributable extension ZIP
- `demo/`：本地模拟招聘表单 · Local recruitment-form demo
- `skill/`：可选的 Codex Skill · Optional Codex Skill
- `tests/`：JavaScript 和 Python 测试 · JavaScript and Python tests

## 安装扩展 · Installation

### 方式一：加载源码目录（开发和验证推荐）
### Option 1: Load the unpacked source (recommended for development)

1. 下载或克隆本项目。 · Download or clone this repository.
2. 打开 Chrome 的 `chrome://extensions`，或 Edge 的 `edge://extensions`。 · Open `chrome://extensions` in Chrome or `edge://extensions` in Edge.
3. 打开右上角“开发者模式”。 · Enable **Developer mode**.
4. 点击“加载已解压的扩展程序”。 · Click **Load unpacked**.
5. 选择项目中的 `extension/` 文件夹。 · Select the `extension/` folder.

### 方式二：使用发布 ZIP · Option 2: Use the release ZIP

解压 `release/resume-application-copilot-v0.3.2.zip`，然后在扩展管理页选择解压后的文件夹。
浏览器扩展不能直接从 ZIP 中加载。

Extract `release/resume-application-copilot-v0.3.2.zip`, then select the extracted folder from the extension manager. Browsers cannot load the extension directly from a ZIP file.

代码更新后必须在扩展管理页点击“重新加载”。如果浏览器仍显示旧图标或旧界面，请关闭并重新打开侧边栏。

After code updates, click **Reload** in the extension manager. If an old icon or UI remains, close and reopen the side panel.

## 使用流程 · Workflow

### 1. 建立个人资料库 · Build your profile vault

1. 点击扩展图标，打开“设置/个人资料库”。
   Open the extension and go to **Settings / Profile Vault**.
2. 填写基础信息、性别、联系方式、教育经历、实习/工作经历、项目经历、学生干部经历、志愿经历、证书、技能和常见问答。
   Fill in basic information, gender, contact details, education, internships/work, projects, student leadership, volunteering, certificates, skills, and common answers.
3. 在页面顶部的“导入材料与解析记录”中选择 PDF、DOCX、TXT、JSON 或图片。
   In **Imported Materials & Parsing History**, select a PDF, DOCX, TXT, JSON, or image file.
4. PDF 和 DOCX 会在本地解析；解析出的原文和候选字段会显示在页面中。
   PDF and DOCX files are parsed locally. Extracted text and candidate fields are shown for review.
5. 检查候选字段，点击“应用已选候选”。低置信度和敏感候选不会被盲目应用。
   Review candidates and click **Apply Selected Candidates**. Low-confidence and sensitive candidates are not applied blindly.
6. 检查个人资料表单，点击“加密保存资料”。
   Review the profile form and click **Save Profile Encrypted**.

敏感内容（如身份证号、家庭信息和紧急联系人）也会保存到本地加密资料库，但不会因为保存而自动填写或发送给 AI。

Sensitive data such as ID numbers, family information, and emergency contacts is also stored in the encrypted local vault. Saving it does not authorize automatic filling or AI transmission.

首次保存后可以勾选“在本机自动解锁”。之后在同一个浏览器配置中重新打开设置页或侧边栏，不需要重复输入主密码。浏览器只保存本机不可导出的加密密钥，不保存主密码。

After the first save, you can enable **Unlock automatically on this device**. On later visits in the same browser profile, you do not need to enter the master password again. The browser stores a non-exportable device key, not the master password.

### 2. 扫描招聘页面 · Scan the recruitment page

1. 由用户自己打开招聘或报名官网页面。 · Open the recruitment or application page yourself.
2. 点击扩展图标打开侧边栏。 · Open the extension side panel.
3. 第一次访问某个网站时，浏览器可能会询问是否允许扩展读取当前网站；只在你确认需要填充时允许。
   The browser may ask for permission on the first visit. Allow access only when you intend to scan and fill the page.
4. 点击“解锁并扫描当前页面”。开启本机自动解锁后，主密码可以留空。
   Click **Unlock and Scan Current Page**. If device auto-unlock is enabled, the password can be left blank.

扩展只在你点击扫描后读取当前页面，不会后台扫描所有网站。

The extension reads the current page only after you click Scan. It does not scan every website in the background.

### 3. 审核字段匹配 · Review field matches

侧边栏会展示页面字段、对应资料路径、来源材料、匹配置信度和敏感级别。

The side panel shows the page field, profile path, source material, match confidence, and sensitivity level.

```text
性别       → 女        Gender          → Female
最高学历   → 本科      Highest degree  → Bachelor's degree
专业       → 应用经济学  Major           → Applied Economics
GPA        → 3.7/4.0   GPA             → 3.7/4.0
专业排名   → 5/100     Class rank      → 5/100
```

### 4. 确认填充 · Confirm and fill

点击“确认填充已选字段”后，扩展可以处理文本框、文本域、日期、原生下拉框、常见自定义下拉框、combobox、单选框和复选框。

After clicking **Confirm Selected Fields**, the extension can handle text inputs, textareas, dates, native selects, common custom dropdowns, comboboxes, radio buttons, and checkboxes.

扩展会根据选项文字选择“男/女”“本科/硕士”“Male/Female”等对应选项。自定义下拉框会先展开，再点击匹配的可见选项。

It matches option text such as `男/女`, `本科/硕士`, and `Male/Female`. Custom dropdowns are expanded before the matching visible option is selected.

低置信度字段只作为候选展示；敏感字段仍需人工确认。扩展不会点击“下一步”“提交”“验证码”或其他最终动作。

Low-confidence fields remain candidates for manual review. Sensitive fields require an additional confirmation. The extension never clicks Next, Submit, CAPTCHA, or other final-action controls.

## PDF 和材料解析 · PDF and document parsing

文字型 PDF 使用扩展内置的 PDF.js 在本地提取文字，并解析基础信息、性别、教育经历、院系、专业、学历、时间、GPA、排名、课程、实习/工作经历、项目经历、学生干部和校园经历、志愿与社会实践、证书、竞赛、荣誉、技能、语言、求职偏好和常见申请问答。

Text-based PDFs are extracted locally with the bundled PDF.js parser. The parser recognizes basic information, gender, education, departments, majors, degrees, dates, GPA, rankings, courses, internships/work, projects, student leadership, campus activities, volunteering, certificates, competitions, honors, skills, languages, job preferences, and common application answers.

扫描件或图片型 PDF 如果提取出 `0` 个字符，需要先使用 OCR。扩展不会扫描电脑中的其他文件，只读取你主动选择的材料。

Scanned or image-only PDFs require OCR when text extraction returns `0` characters. The extension never scans other files on your computer; it reads only files you explicitly select.

## 本地模拟验证 · Local demo

项目中的 `demo/` 提供不访问真实招聘网站的测试页面。用浏览器打开其中的本地测试页面，然后按“扫描 → 审核 → 确认填充”验证流程。

The `demo/` directory contains a local form for testing without visiting a real recruitment website. Open it in a browser and verify the flow: **Scan → Review → Confirm Fill**.

## 导出 JSON 是什么 · What does JSON export mean?

“导出 JSON 备份”用于备份或迁移个人资料库，不是日常填充的必需步骤。JSON 是未加密文本，可能包含身份证号、家庭信息、API Key 等敏感内容，只应保存在安全位置，不能上传到 GitHub 或发送给他人。

**Export JSON Backup** is for backing up or migrating the profile vault; it is not required for normal filling. The exported JSON is plain text and may contain ID numbers, family information, or API keys. Store it securely and never upload it to GitHub or share it with others.

## 开发验证 · Development checks

```bash
npm test
python -m unittest discover -s tests -p "test_*.py"
```

当前版本的 JavaScript 和 Python 测试均应通过。修改扩展源码后，重新执行测试，并在 `edge://extensions` 或 `chrome://extensions` 中重新加载扩展。

Both the JavaScript and Python test suites should pass. After changing extension code, rerun the tests and reload the extension from `edge://extensions` or `chrome://extensions`.

## 自动同步到 GitHub · Automatic GitHub sync

源码、README 和发布 ZIP 可以通过本地监控脚本自动提交并推送到 GitHub。个人资料库、简历原文、导入材料和敏感信息不会被这个脚本读取或上传；这些内容仍只保存在浏览器本地。

Source code, README files, and release ZIPs can be committed and pushed automatically by the local watcher. The watcher does not read or upload the profile vault, resume text, imported materials, or sensitive data; those remain local in the browser.

先确保本机已经完成 GitHub 登录，并且 `origin` 指向你的仓库：

First, make sure GitHub authentication is configured on this computer and that `origin` points to your repository:

```bash
git remote -v
```

只同步一次：

Sync once:

```bash
npm run sync:github
```

持续监控源码变更并自动打包、提交、推送：

Watch for source changes and automatically package, commit, and push:

```bash
npm run watch:github
```

启动监控后，修改 `extension/`、`README.md`、`demo/`、`skill/` 或 `tests/` 中的文件，脚本会重新生成当前版本安装包，然后同步到当前 Git 分支。按 `Ctrl+C` 停止监控。

Once the watcher is running, changes under `extension/`, `README.md`, `demo/`, `skill/`, or `tests/` trigger a new package and a push to the current Git branch. Press `Ctrl+C` to stop watching.

脚本会阻止 PDF、DOCX、个人资料 JSON、`private/` 和 `vault` 文件进入提交，也不会强制覆盖远程分支。如果 GitHub 上存在本地没有的提交，请先手动合并远程历史，再重新运行同步。

The script blocks PDFs, DOCX files, profile JSON exports, `private/`, and `vault` files from commits. It also refuses to force-overwrite the remote branch. If GitHub contains commits missing locally, merge the remote history first and then run the sync again.

## 隐私与安全边界 · Privacy and security boundaries

- 个人资料、导入原文、解析候选、敏感字段和 API Key 默认只保存在浏览器本地。
  Profile data, imported text, parsing candidates, sensitive fields, and API keys stay local by default.
- 普通资料和敏感资料都使用 AES-GCM 加密保存。
  Regular and sensitive profile data are encrypted with AES-GCM.
- AI 请求只发送生成答案所需的非敏感资料；身份证、银行卡和家庭信息不会自动发送。
  AI requests include only the non-sensitive data needed for an answer; ID numbers, bank-card data, and family information are not sent automatically.
- 所有填充都需要用户主动点击确认。
  Every fill action requires an explicit user confirmation.
- 不实现自动提交、批量投递、验证码绕过或后台读取所有网站。
  Automatic submission, bulk applications, CAPTCHA bypassing, and background scanning are not implemented.

## License

MIT
