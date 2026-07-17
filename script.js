/* ============================================================
   QUIZ BUILDER — script.js
   ============================================================ */
"use strict";

let quizData = [];
let activeQuiz = [];
let activeEditorId = null;
let savedSelection = null;
let currentBuilderPage = 0;
let feedbackVisible = false;

function getFilename() {
  const raw = document.getElementById("quizFilename").value.trim();
  return raw.replace(/[^a-zA-Z0-9_-]/g, "_") || "quiz";
}

function editorLabel(id) {
  if (id === "quizTitle") return "Quiz title";
  if (id.startsWith("question_")) return `Question ${id.split("_")[1]}`;
  if (id.includes("_answer_")) return `Question ${id.match(/q(\d+)/)[1]} answer ${id.split("_").pop()}`;
  if (id.includes("_feedback")) return `Question ${id.match(/q(\d+)/)[1]} feedback`;
  return "Selected text field";
}

function registerEditable(editor) {
  editor.addEventListener("focus", () => setActiveEditor(editor.id));
  editor.addEventListener("mouseup", saveActiveSelection);
  editor.addEventListener("keyup", saveActiveSelection);
  editor.addEventListener("input", () => handleEditorInput(editor.id));
}

function setActiveEditor(id) {
  activeEditorId = id;
  document.getElementById("activeFieldLabel").textContent = editorLabel(id);
  document.getElementById("sharedToolbar").classList.remove("inactive");
  saveActiveSelection();
}

function saveActiveSelection() {
  if (!activeEditorId) return;
  const selection = window.getSelection();
  const editor = document.getElementById(activeEditorId);
  if (!selection || !selection.rangeCount || !editor) return;
  const range = selection.getRangeAt(0);
  if (editor.contains(range.commonAncestorContainer)) savedSelection = range.cloneRange();
}

function restoreSelection() {
  if (!activeEditorId || !savedSelection) return false;
  const selection = window.getSelection();
  selection.removeAllRanges();
  selection.addRange(savedSelection);
  return true;
}

function formatActiveText(command) {
  if (!activeEditorId) return;
  const editor = document.getElementById(activeEditorId);
  if (!editor || editor.style.display === "none") return;
  editor.focus();
  restoreSelection();
  document.execCommand(command, false, null);
  handleEditorInput(activeEditorId);
  saveActiveSelection();
}

function formatActiveFontSize(size) {
  const control = document.getElementById("fontSizeControl");
  if (!activeEditorId || !size) { control.selectedIndex = 0; return; }
  const editor = document.getElementById(activeEditorId);
  editor.focus(); restoreSelection();
  const selection = window.getSelection();
  if (selection && !selection.isCollapsed) {
    const range = selection.getRangeAt(0);
    const span = document.createElement("span");
    span.style.fontSize = `${size}px`;
    try { range.surroundContents(span); } catch (_) { document.execCommand("fontSize", false, "7"); }
  }
  control.selectedIndex = 0;
  handleEditorInput(activeEditorId);
}

function insertActiveSymbol(symbol) {
  const control = document.getElementById("symbolControl");
  if (!activeEditorId || !symbol) { control.selectedIndex = 0; return; }
  const editor = document.getElementById(activeEditorId);
  editor.focus(); restoreSelection();
  document.execCommand("insertText", false, symbol);
  control.selectedIndex = 0;
  handleEditorInput(activeEditorId);
}

function toggleActiveHtmlMode() {
  if (!activeEditorId) return;
  toggleHtmlMode(activeEditorId);
}

function toggleHtmlMode(id) {
  const visual = document.getElementById(id);
  const raw = document.getElementById(`${id}_html`);
  if (!visual || !raw) return;
  const toCode = raw.style.display === "none";
  if (toCode) {
    raw.value = visual.innerHTML;
    const r = visual.getBoundingClientRect();
    const c = visual.closest('.quiz-canvas').getBoundingClientRect();
    Object.assign(raw.style,{display:'block',left:`${r.left-c.left}px`,top:`${r.top-c.top}px`,width:`${r.width}px`,height:`${r.height}px`});
    visual.style.visibility = "hidden";
    raw.focus();
  } else {
    visual.innerHTML = raw.value;
    raw.style.display = "none";
    visual.style.visibility = "visible";
    visual.focus();
    handleEditorInput(id);
  }
}

function syncHtmlModeToEditor(id) {
  const raw = document.getElementById(`${id}_html`);
  const visual = document.getElementById(id);
  if (raw && visual && raw.style.display !== "none") {
    visual.innerHTML = raw.value;
    raw.style.display = "none";
    visual.style.visibility = "visible";
  }
}
function getHtml(id){syncHtmlModeToEditor(id);return document.getElementById(id).innerHTML;}
function setHtml(id,value){const el=document.getElementById(id);if(!el)return;el.innerHTML=value||"";const raw=document.getElementById(`${id}_html`);if(raw)raw.value=value||"";}
function getText(id){syncHtmlModeToEditor(id);return document.getElementById(id).textContent.trim();}
function handleEditorInput(id){const raw=document.getElementById(`${id}_html`);if(raw&&raw.style.display!=="none")document.getElementById(id).innerHTML=raw.value;scheduleAutosave();}

function editable(id, className, placeholder) {
  return `<div id="${id}" class="editable ${className}" contenteditable="true" data-placeholder="${placeholder}"></div><textarea id="${id}_html" class="html-code-editor" style="display:none"></textarea>`;
}

function buildTitlePage() {
  return `<div class="question-block active" id="questionPage_0"><div class="quiz-canvas builder-start">
    <div class="left-panel"></div><div class="corner-art"></div><div class="brand">CourseBook</div>
    <div class="quiz-icon"></div>${editable("quizTitle","title-editable","Quiz title")}
    <div class="mock-start">Start</div></div></div>`;
}

function buildQuestionPage(i,count){
  return `<div class="question-block" id="questionPage_${i}"><div class="quiz-canvas builder-question">
    <div class="counter">${i}/${count}</div>
    ${editable(`question_${i}`,"question-editable","Question text")}
    <div class="answer-editable answer-1">${editable(`q${i}_answer_1`,"answer-inner","Answer 1")}</div>
    <div class="answer-editable answer-2">${editable(`q${i}_answer_2`,"answer-inner","Answer 2")}</div>
    <div class="answer-editable answer-3">${editable(`q${i}_answer_3`,"answer-inner","Answer 3")}</div>
    <div class="answer-editable answer-4">${editable(`q${i}_answer_4`,"answer-inner","Answer 4")}</div>
    <div class="question-image-mock"><img src="assets/questions/question_${((i-1)%5)+1}.png" alt="Question illustration"></div>
    <button type="button" class="feedback-toggle" onclick="toggleBuilderFeedback()">Feedback view</button>
    <div class="feedback-mock" style="display:none"><div class="feedback-avatar-mock"><img src="assets/feedback/correct/correct_${((i-1)%5)+1}.png" alt="Feedback illustration"></div><div class="feedback-label-mock">CORRECT</div>
      ${editable(`q${i}_feedback`,"feedback-editable","Feedback text")}<div class="mock-continue">CONTINUE</div></div>
    <select id="q${i}_correct" hidden><option value="0">1</option><option value="1">2</option><option value="2">3</option><option value="3">4</option></select>
  </div></div>`;
}

function generateQuestionFields() {
  const count=Number(document.getElementById("questionCount").value);
  const oldTitle=document.getElementById("quizTitle")?.innerHTML||"";
  const container=document.getElementById("questionsContainer");
  const tabs=document.getElementById("questionTabs");
  container.innerHTML=buildTitlePage(); tabs.innerHTML=`<button type="button" class="question-tab active" onclick="showQuestionPage(0)">Title</button>`;
  for(let i=1;i<=count;i++){
    container.insertAdjacentHTML("beforeend",buildQuestionPage(i,count));
    tabs.insertAdjacentHTML("beforeend",`<button type="button" class="question-tab" onclick="showQuestionPage(${i})">Q${i}</button>`);
  }
  setHtml("quizTitle",oldTitle);
  document.querySelectorAll('.editable').forEach(registerEditable);
  document.querySelectorAll('.html-code-editor').forEach(raw=>raw.addEventListener('input',()=>handleEditorInput(raw.id.replace('_html',''))));
  currentBuilderPage=0; activeEditorId=null; savedSelection=null; feedbackVisible=false;
  updateBuilderPageUi();
}

function showQuestionPage(page){
  const count=Number(document.getElementById("questionCount").value);
  currentBuilderPage=Math.max(0,Math.min(page,count));
  document.querySelectorAll('.question-block').forEach((b,i)=>b.classList.toggle('active',i===currentBuilderPage));
  document.querySelectorAll('.question-tab').forEach((t,i)=>t.classList.toggle('active',i===currentBuilderPage));
  feedbackVisible=false;
  const panel=document.querySelector(`#questionPage_${currentBuilderPage} .feedback-mock`); if(panel)panel.style.display='none';
  activeEditorId=null;savedSelection=null;updateBuilderPageUi();
}
function moveBuilderPage(step){showQuestionPage(currentBuilderPage+step);}
function updateBuilderPageUi(){
  const count=Number(document.getElementById("questionCount").value);
  document.getElementById('pageIndicator').textContent=currentBuilderPage===0?'Title screen':`Question ${currentBuilderPage} of ${count}`;
  document.getElementById('correctAnswerControl').classList.toggle('is-hidden',currentBuilderPage===0);
  if(currentBuilderPage>0)document.getElementById('activeCorrectAnswer').value=document.getElementById(`q${currentBuilderPage}_correct`).value;
  document.getElementById('activeFieldLabel').textContent='Select a text field';document.getElementById('sharedToolbar').classList.add('inactive');
}
function updateActiveCorrectAnswer(value){if(currentBuilderPage>0)document.getElementById(`q${currentBuilderPage}_correct`).value=value;}
function toggleBuilderFeedback(){
  if(currentBuilderPage===0)return;feedbackVisible=!feedbackVisible;
  const page=document.getElementById(`questionPage_${currentBuilderPage}`);page.querySelector('.feedback-mock').style.display=feedbackVisible?'block':'none';
}

// ── Validation ─────────────────────────────────────────────

function validateQuizForm() {
  const title = document.getElementById("quizTitle").innerHTML.trim();
  const count = Number(document.getElementById("questionCount").value);

  if (!title) { alert("Please enter a quiz title."); return false; }

  const filename = document.getElementById("quizFilename").value.trim();
  if (!filename) { alert("Please enter a file name."); return false; }

  for (let i = 1; i <= count; i++) {
    if (!getText(`question_${i}`)) {
      alert(`Please enter text for Question ${i}.`); return false;
    }
    for (let a = 1; a <= 4; a++) {
      if (!getText(`q${i}_answer_${a}`)) {
        alert(`Please enter Answer ${a} for Question ${i}.`); return false;
      }
    }
  }
  return true;
}

// ── Export data builder ────────────────────────────────────

function buildQuizExportData() {
  const title = document.getElementById("quizTitle").innerHTML.trim();
  const count = Number(document.getElementById("questionCount").value);

  const questions = [];
  for (let i = 1; i <= count; i++) {
    questions.push({
      question:     getHtml(`question_${i}`),
      answers:      [1, 2, 3, 4].map(a => getHtml(`q${i}_answer_${a}`)),
      correctIndex: Number(document.getElementById(`q${i}_correct`).value),
      feedback:     getHtml(`q${i}_feedback`),
    });
  }
  const filename = document.getElementById("quizFilename").value.trim();
  const passToggle = document.getElementById("passPercentageEnabled");
  const passInput = document.getElementById("passPercentage");
  return {
    title,
    filename,
    questions,
    passPercentageEnabled: Boolean(passToggle && passToggle.checked),
    passPercentage: Number((passInput && passInput.value) || 50)
  };
}

// ── Preview ────────────────────────────────────────────────

function previewQuiz() {
  // Preview uses the current learner design and the PNG authoring assets.
  // Export still uses the platform-compatible template and SVG package.
  const exportData = buildQuizExportData();
  const previewTitle = getText("quizTitle") || "Quiz Preview";
  const win = window.open("", "_blank");

  if (!win) {
    alert("The preview window was blocked. Please allow pop-ups for this page and try again.");
    return;
  }

  win.document.open();
  win.document.write(
    buildPreviewQuizHtml(exportData, previewTitle, document.baseURI)
  );
  win.document.close();
}

// ── JSON export / import ───────────────────────────────────

function exportQuizJson() {
  if (!validateQuizForm()) return;
  const data = buildQuizExportData();
  downloadBlob(JSON.stringify(data, null, 2), `${getFilename()}.json`, "application/json");
}

function importQuizJson() {
  const file = document.getElementById("importJsonFile").files[0];
  if (!file) { alert("Please select a JSON file first."); return; }

  readFile(file, text => {
    const data = JSON.parse(text);
    document.getElementById("quizTitle").innerHTML = data.title || "";
    document.getElementById("quizFilename").value = data.filename || "";
    document.getElementById("questionCount").value = data.questions.length;
    generateQuestionFields();
    populateFields(data.questions);
  });
}

// ── Standalone HTML export / import ───────────────────────

// Export-only platform assets. These SVG files must remain in img/.
// Builder and Preview PNG files remain under assets/.
const EXPORT_IMAGE_FILES = [
  "image1.svg", "image2.svg", "image3.svg", "image4.svg", "image5.svg",
  "correct1.svg", "correct2.svg", "correct3.svg", "correct4.svg", "correct5.svg",
  "incorrect1.svg", "incorrect2.svg", "incorrect3.svg", "incorrect4.svg", "incorrect5.svg"
];

async function exportStandaloneQuiz() {
  if (!validateQuizForm()) return;

  const data = buildQuizExportData();
  const html = buildStandaloneQuizHtml(data, data.title);

  console.log("STORY HTML START:");
  console.log(html.substring(0, 500));

  const folderName = getFilename();

  if (typeof JSZip === "undefined") {
    downloadBlob(html, `${folderName}.html`, "text/html");
    return;
  }

  const zip = new JSZip();

  // Match the existing platform package structure:
  // <quiz-name>/story.html and <quiz-name>/img/
  const packageFolder = zip.folder(folderName);
  packageFolder.file("story.html", html);

  const imgFolder = packageFolder.folder("img");
  let imagesBundled = 0;

  for (const name of EXPORT_IMAGE_FILES) {
  try {
    const res = await fetch(`img/${name}`);

    if (!res.ok) {
      console.warn(`Could not load image: img/${name}`);
      continue;
    }

    const blob = await res.blob();

    imgFolder.file(name, blob, {
      binary: true
    });

    imagesBundled++;
  } catch (error) {
    console.warn(`Failed to bundle image: img/${name}`, error);
  }
}

  if (imagesBundled !== EXPORT_IMAGE_FILES.length) {
    alert(
      "Export cancelled because one or more required SVG files could not be loaded.\n\n" +
      "Make sure all 15 SVG files are in the builder's img folder and run the builder through Live Server."
    );
    return;
  }

  const blob = await zip.generateAsync({
  type: "blob",
  compression: "DEFLATE",
  compressionOptions: {
    level: 6
  }
});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${folderName}.zip`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function importStandaloneHtml() {
  const file = document.getElementById("importHtmlFile").files[0];
  if (!file) { alert("Please select an HTML file first."); return; }

  readFile(file, text => {
    const dataMatch  = text.match(/const originalQuizData = (\[[\s\S]*?\]);/);
    if (!dataMatch) { alert("Could not find quiz data in this HTML file."); return; }

    const questions = JSON.parse(dataMatch[1]);

    // Prefer quiz-title meta (preserves rich HTML), fall back to <title>
    const quizTitleMatch = text.match(/<meta name="quiz-title" content="([^"]*)">/);
    const titleTagMatch  = text.match(/<title>(.*?)<\/title>/);
    const title = quizTitleMatch ? quizTitleMatch[1] : (titleTagMatch ? titleTagMatch[1] : "Imported Quiz");

    // Filename: prefer meta tag, fall back to the uploaded file's own name
    const filenameMatch = text.match(/<meta name="quiz-filename" content="([^"]*)">/);
    const filename = (filenameMatch && filenameMatch[1])
      ? filenameMatch[1]
      : file.name.replace(/\.html$/i, "");

    document.getElementById("quizTitle").innerHTML = title;
    document.getElementById("quizFilename").value = filename;
    document.getElementById("questionCount").value = questions.length;
    generateQuestionFields();
    populateFields(questions, true);
    alert("Standalone HTML imported successfully.");
  });
}

// ── Shared import helper ───────────────────────────────────

function populateFields(questions, fromStandalone = false) {
  questions.forEach((item, index) => {
    const n = index + 1;
    setHtml(`question_${n}`, item.question);

    item.answers.forEach((answer, ai) => {
      setHtml(`q${n}_answer_${ai + 1}`, fromStandalone
        ? (typeof answer === "string" ? answer : answer.text)
        : answer
      );
    });

    if (fromStandalone) {
      const correctIndex = item.answers.findIndex(a => typeof a === "object" && a.isCorrect);
      document.getElementById(`q${n}_correct`).value =
        correctIndex >= 0 ? correctIndex : (item.correctIndex ?? 0);
    } else {
      document.getElementById(`q${n}_correct`).value = item.correctIndex ?? 0;
    }

    setHtml(`q${n}_feedback`, item.feedback || "");
  });
}

// ── Utility ────────────────────────────────────────────────

function downloadBlob(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}

function readFile(file, onLoad) {
  const reader = new FileReader();
  reader.onload = e => onLoad(e.target.result);
  reader.readAsText(file);
}

function shuffleArray(arr) {
  return [...arr].sort(() => Math.random() - 0.5);
}

// ── Legacy in-page preview (renderQuiz / submitQuiz) ──────
// Kept for backwards compatibility with the #quizPreview section.

function renderQuiz(title) {
  document.getElementById("builder").style.display      = "none";
  document.getElementById("quizPreview").style.display  = "block";
  document.getElementById("results").style.display      = "none";
  document.getElementById("previewTitle").innerHTML = title;

  const container = document.getElementById("quizContainer");
  container.innerHTML = "";

  activeQuiz.forEach((item, qi) => {
    const answersHtml = item.answers.map((answer, ai) => `
      <label>
        <input type="radio" name="question_${qi}" value="${ai}">
        ${answer.text}
      </label>
    `).join("");

    container.innerHTML += `
      <div class="quiz-question">
        <h3>${qi + 1}. ${item.question}</h3>
        ${answersHtml}
      </div>
    `;
  });
}

function submitQuiz() {
  let score = 0, feedbackHtml = "";

  activeQuiz.forEach((question, qi) => {
    const selected = document.querySelector(`input[name="question_${qi}"]:checked`);

    if (!selected) {
      feedbackHtml += `<div><h3>Question ${qi + 1}</h3><p>No answer selected.</p><p>${question.feedback || ""}</p></div>`;
      return;
    }

    const answer = question.answers[Number(selected.value)];
    if (answer.isCorrect) score++;

    feedbackHtml += `
      <div>
        <h3>Question ${qi + 1}</h3>
        <p>${answer.isCorrect ? "Correct ✓" : "Incorrect ✗"}</p>
        <p>${question.feedback || ""}</p>
      </div>
    `;
  });

  document.getElementById("quizPreview").style.display = "none";
  document.getElementById("results").style.display     = "block";
  document.getElementById("scoreText").innerHTML =
    `You scored ${score} out of ${activeQuiz.length}.<hr>${feedbackHtml}`;
}

function restartBuilder() {
  document.getElementById("builder").style.display      = "block";
  document.getElementById("quizPreview").style.display  = "none";
  document.getElementById("results").style.display      = "none";
}



// ── Copy AI import prompt to clipboard ────────────────────────
function copyAiPrompt() {
  const text = document.getElementById("aiPrompt").value;
  navigator.clipboard.writeText(text).then(() => {
    const confirm = document.getElementById("copyConfirm");
    confirm.style.display = "inline";
    setTimeout(() => confirm.style.display = "none", 2000);
  });
}

// ── HTML → docx TextRuns (browser) ────────────────────────────
function htmlToRuns(html) {
  const { TextRun } = docx;
  if (!html) return [new TextRun({ text: "" })];

  const text = html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/div>/gi, '\n');

  const runs = [];
  const TOKEN = /(<[^>]+>)|([^<]+)/g;
  const stack = [{ bold: false, italics: false, underline: false, superScript: false, subScript: false, size: 22, font: "Arial" }];
  const top = () => stack[stack.length - 1];

  let m;
  while ((m = TOKEN.exec(text)) !== null) {
    if (m[1]) {
      const tag  = m[1];
      const name = (tag.match(/^<\/?([a-zA-Z0-9]+)/) || [])[1]?.toLowerCase();
      const closing = tag.startsWith('</');
      if (!closing) {
        const fmt = { ...top() };
        if (name === 'b' || name === 'strong') fmt.bold = true;
        if (name === 'i' || name === 'em')     fmt.italics = true;
        if (name === 'u')                       fmt.underline = {};
        if (name === 'sup')                     fmt.superScript = true;
        if (name === 'sub')                     fmt.subScript = true;
        const sm = tag.match(/font-size:\s*(\d+(?:\.\d+)?)px/);
        if (sm) fmt.size = Math.round(parseFloat(sm[1]) * 2);
        stack.push(fmt);
      } else {
        if (stack.length > 1) stack.pop();
      }
    } else if (m[2]) {
      const raw = m[2]
        .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
        .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n)))
        .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCharCode(parseInt(h, 16)));
      if (raw) {
        const f = top();
        runs.push(new TextRun({ text: raw, bold: f.bold, italics: f.italics,
          underline: f.underline, superScript: f.superScript, subScript: f.subScript,
          size: f.size, font: f.font }));
      }
    }
  }
  return runs.length ? runs : [new TextRun({ text: "" })];
}

// ── Build one question table ──────────────────────────────────
function buildWordTable(q, idx, total) {
  const { Table, TableRow, TableCell, Paragraph, TextRun,
          BorderStyle, WidthType, ShadingType, VerticalAlign, AlignmentType } = docx;

  const C = { teal: "0F9691", blue: "C5E3EF", grey: "EEF2F6", ok: "D1FAE5", white: "FFFFFF" };
  const PAGE_W   = 9026;
  const COL_TICK = 560;
  const COL_TEXT = PAGE_W - COL_TICK;
  const border   = { style: BorderStyle.SINGLE, size: 4, color: "CCCCCC" };
  const borders  = { top: border, bottom: border, left: border, right: border };

  function mkCell(paras, fill, span) {
    const w = span === 2 ? PAGE_W : span === "tick" ? COL_TICK : COL_TEXT;
    return new TableCell({
      borders,
      columnSpan: span === 2 ? 2 : 1,
      width: { size: w, type: WidthType.DXA },
      shading: { fill: fill || C.white, type: ShadingType.CLEAR },
      margins: { top: 80, bottom: 80, left: 140, right: 140 },
      verticalAlign: VerticalAlign.CENTER,
      children: paras
    });
  }

  function hdr(text) {
    return new Paragraph({ children: [
      new TextRun({ text, bold: true, color: "FFFFFF", size: 22, font: "Arial" })
    ]});
  }

  return new Table({
    width: { size: PAGE_W, type: WidthType.DXA },
    columnWidths: [COL_TICK, COL_TEXT],
    rows: [
      new TableRow({ children: [mkCell([hdr(`Question ${idx + 1} of ${total}`)], C.teal, 2)] }),
      new TableRow({ children: [mkCell([new Paragraph({ children: htmlToRuns(q.question) })], C.grey, 2)] }),
      ...q.answers.map((ans, ai) => {
        const correct = ai === q.correctIndex;
        return new TableRow({ children: [
          mkCell([new Paragraph({ alignment: AlignmentType.CENTER, children: [
            new TextRun({ text: correct ? "✓" : " ", bold: true, color: "16803C", size: 24, font: "Arial" })
          ]})], correct ? C.ok : C.white, "tick"),
          mkCell([new Paragraph({ children: htmlToRuns(ans) })], correct ? C.ok : C.white, "text")
        ]});
      }),
      new TableRow({ children: [mkCell([hdr("Feedback")], C.teal, 2)] }),
      new TableRow({ children: [mkCell([new Paragraph({ children: htmlToRuns(q.feedback || "") })], C.blue, 2)] })
    ]
  });
}

// ── Export to Word (browser) ──────────────────────────────────
async function exportToWord() {
  if (!validateQuizForm()) return;

  const { Document, Packer, Paragraph, TextRun, HeadingLevel } = docx;
  const data = buildQuizExportData();

  const children = [
    new Paragraph({ heading: HeadingLevel.HEADING_1, children: htmlToRuns(data.title || "Quiz") }),
    new Paragraph({ children: [new TextRun({ text: "" })] }),
    ...data.questions.flatMap((q, i) => [
      buildWordTable(q, i, data.questions.length),
      new Paragraph({ children: [new TextRun({ text: "" })] })
    ])
  ];

  const doc = new Document({
    styles: {
      default: { document: { run: { font: "Arial", size: 22, color: "052D43" } } },
      paragraphStyles: [{
        id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 40, bold: true, font: "Arial", color: "052D43" },
        paragraph: { spacing: { before: 240, after: 240 }, outlineLevel: 0 }
      }]
    },
    sections: [{ properties: {
      page: {
        size: { width: 11906, height: 16838 },
        margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 }
      }
    }, children }]
  });

  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${getFilename()}.docx`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Import from Word (not supported in browser) ───────────────
function importFromWord() {
  alert("Word import is not supported in the browser.\nTo import a saved quiz, use the 'Import Standalone HTML' option instead.");
}

// ── Current learner preview HTML builder ──────────────────

function buildPreviewQuizHtml(exportData, title, baseUrl) {
  const plainTitle = (title || "Quiz").replace(/<[^>]+>/g, "");
  const safeFilename = exportData.filename || plainTitle.replace(/[^a-zA-Z0-9_-]/g, "_");
  const safeBaseUrl = String(baseUrl || "").replace(/&/g, "&amp;").replace(/"/g, "&quot;");
  const runtime = `
"use strict";
const originalQuizData = __DATA__;
const quizStage=document.getElementById("quizStage"),startScreen=document.getElementById("startScreen"),questionScreen=document.getElementById("questionScreen"),startButton=document.getElementById("startButton"),currentQuestionNumber=document.getElementById("currentQuestionNumber"),totalQuestions=document.getElementById("totalQuestions"),questionText=document.getElementById("questionText"),answersList=document.getElementById("answersList"),questionImage=document.getElementById("questionImage"),submitButton=document.getElementById("submitButton"),feedbackPanel=document.getElementById("feedbackPanel"),feedbackAvatar=document.getElementById("feedbackAvatar"),feedbackLabel=document.getElementById("feedbackLabel"),feedbackText=document.getElementById("feedbackText"),continueButton=document.getElementById("continueButton"),resultsScreen=document.getElementById("resultsScreen"),resultsScore=document.getElementById("resultsScore"),reviewQuizButton=document.getElementById("reviewQuizButton"),reviewPreviousButton=document.getElementById("reviewPreviousButton"),reviewNextButton=document.getElementById("reviewNextButton"),resultStarFills=document.querySelectorAll(".result-star .star-fill"),resultsStars=document.getElementById("resultsStars");
const SLIDE_WIDTH=720,SLIDE_HEIGHT=540,START_EXIT_DURATION=1500,FADE_DURATION=500;
let questionOrder=[],currentQuestionPosition=0,selectedOption=null,correctAnswerCount=0,isReviewMode=false,reviewQuestionPosition=0,resultsHaveBeenRecorded=false,resultsHaveBeenShown=false,quizHasStarted=false;const reviewAnswers={};
if(typeof window.started!=="function")window.started=()=>console.log("Local preview: started()");if(typeof window.completed!=="function")window.completed=s=>console.log("Local preview: completed("+s+")");
const correctAvatars=[1,2,3,4,5].map(n=>"assets/feedback/correct/correct_"+n+".png"),incorrectAvatars=[1,2,3,4,5].map(n=>"assets/feedback/incorrect/incorrect_"+n+".png");let cq=[],iq=[];
function resizeQuiz(){quizStage.style.transform="scale("+Math.min(innerWidth/SLIDE_WIDTH,innerHeight/SLIDE_HEIGHT)+")"}addEventListener("resize",resizeQuiz);resizeQuiz();
function shuffle(a){a=[...a];for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
function nextAvatar(ok){let q=ok?cq:iq,p=ok?correctAvatars:incorrectAvatars;if(!q.length){q.push(...shuffle(p));if(ok)cq=q;else iq=q}return q.shift()}
function stripOrHtml(el,html){el.innerHTML=html||""}
function generateQuestionOrder(){questionOrder=shuffle(originalQuizData.map((_,i)=>i));if(questionOrder.length===5){let guard=0;while(Math.abs(questionOrder.indexOf(0)-questionOrder.indexOf(4))===1&&guard++<50)questionOrder=shuffle(questionOrder)}}
function answersFor(qi){const q=originalQuizData[qi];return q.answers.map((text,i)=>({id:"q"+qi+"a"+i,text,correct:i===q.correctIndex}))}
function clearAnswerSelection(){answersList.querySelectorAll(".answer-option").forEach(o=>{o.className="answer-option question-part";o.setAttribute("aria-checked","false");o.disabled=false});selectedOption=null;submitButton.classList.remove("is-visible")}
function hideFeedback(){feedbackPanel.classList.remove("is-visible","show-details");feedbackPanel.setAttribute("aria-hidden","true")}
function renderQuestion(pos,stored=null){const qi=questionOrder[pos],q=originalQuizData[qi],opts=[...answersList.querySelectorAll(".answer-option")];currentQuestionPosition=pos;currentQuestionNumber.textContent=String(pos+1);totalQuestions.textContent="/"+questionOrder.length;stripOrHtml(questionText,q.question);questionImage.src="assets/questions/question_"+((qi%5)+1)+".png";clearAnswerSelection();hideFeedback();const answers=stored?stored.answerOrder:shuffle(answersFor(qi));opts.forEach((o,i)=>{const a=answers[i];o.dataset.answerId=a.id;o.dataset.correct=String(a.correct);stripOrHtml(o.querySelector(".answer-text"),a.text)})}
function showQuestionScreen(animate=true){questionScreen.classList.add("is-active");questionScreen.setAttribute("aria-hidden","false");const parts=questionScreen.querySelectorAll(".question-part");parts.forEach(p=>p.classList.remove("fade-in"));if(!animate){parts.forEach(p=>p.classList.add("fade-in"));return}setTimeout(()=>document.querySelector(".question-number").classList.add("fade-in"),0);setTimeout(()=>{answersList.querySelectorAll(".answer-option").forEach(o=>o.classList.add("fade-in"));questionImage.classList.add("fade-in")},300)}
function showFeedback(ok,avatar){feedbackAvatar.src=avatar||nextAvatar(ok);feedbackLabel.textContent=ok?"CORRECT":"INCORRECT";feedbackLabel.classList.toggle("correct",ok);feedbackLabel.classList.toggle("incorrect",!ok);stripOrHtml(feedbackText,originalQuizData[questionOrder[currentQuestionPosition]].feedback);feedbackPanel.classList.remove("show-details");feedbackPanel.classList.add("is-visible");feedbackPanel.setAttribute("aria-hidden","false");setTimeout(()=>feedbackPanel.classList.add("show-details"),FADE_DURATION)}
answersList.addEventListener("click",e=>{if(isReviewMode)return;const o=e.target.closest(".answer-option");if(!o||o.disabled)return;answersList.querySelectorAll(".answer-option").forEach(x=>{x.classList.remove("selected");x.setAttribute("aria-checked","false")});o.classList.add("selected");o.setAttribute("aria-checked","true");selectedOption=o;submitButton.classList.add("is-visible")});
submitButton.addEventListener("click",()=>{if(!selectedOption)return;const opts=[...answersList.querySelectorAll(".answer-option")],ok=selectedOption.dataset.correct==="true",qi=questionOrder[currentQuestionPosition],avatar=nextAvatar(ok);if(ok)correctAnswerCount++;reviewAnswers[qi]={selectedAnswerId:selectedOption.dataset.answerId,selectedWasCorrect:ok,feedbackAvatar:avatar,answerOrder:opts.map(o=>({id:o.dataset.answerId,text:o.querySelector(".answer-text").innerHTML,correct:o.dataset.correct==="true"}))};opts.forEach(o=>{o.disabled=true;o.classList.remove("selected");if(o===selectedOption)o.classList.add(ok?"correct":"incorrect");else if(!ok&&o.dataset.correct==="true")o.classList.add("disabled-correct");else o.classList.add("disabled-neutral")});submitButton.classList.remove("is-visible");questionImage.classList.remove("fade-in");showFeedback(ok,avatar)});
continueButton.addEventListener("click",()=>{if(currentQuestionPosition>=questionOrder.length-1)return showResults();questionScreen.classList.remove("is-active");questionScreen.setAttribute("aria-hidden","true");renderQuestion(++currentQuestionPosition);showQuestionScreen(false)});
function showResults(){questionScreen.classList.remove("is-active","is-reviewing");questionScreen.setAttribute("aria-hidden","true");hideFeedback();resultsScore.textContent=correctAnswerCount+"/"+questionOrder.length;const earnedStars=questionOrder.length?correctAnswerCount/questionOrder.length*5:0;const shouldAnimate=!resultsHaveBeenShown;resultStarFills.forEach((starFill,index)=>{const fillAmount=Math.max(0,Math.min(1,earnedStars-index));starFill.style.width=fillAmount*100+"%";starFill.classList.toggle("is-visible",!shouldAnimate);});resultsScore.classList.toggle("is-visible",!shouldAnimate);reviewQuizButton.classList.toggle("is-visible",!shouldAnimate);resultsStars.setAttribute("aria-label",correctAnswerCount+" correct out of "+questionOrder.length);resultsScreen.classList.add("is-active");resultsScreen.setAttribute("aria-hidden","false");if(shouldAnimate){resultStarFills.forEach((starFill,index)=>{setTimeout(()=>starFill.classList.add("is-visible"),150+index*120);});setTimeout(()=>resultsScore.classList.add("is-visible"),850);setTimeout(()=>reviewQuizButton.classList.add("is-visible"),1100);}resultsHaveBeenShown=true;if(!resultsHaveBeenRecorded){resultsHaveBeenRecorded=true;window.completed(Math.round((correctAnswerCount/questionOrder.length)*100));}}
function startQuiz(){if(quizHasStarted)return;quizHasStarted=true;window.started();generateQuestionOrder();renderQuestion(0);startScreen.classList.add("is-exiting");setTimeout(()=>{startScreen.style.visibility="hidden";showQuestionScreen()},START_EXIT_DURATION)}startButton.addEventListener("click",startQuiz);
function renderReview(){const qi=questionOrder[reviewQuestionPosition],r=reviewAnswers[qi];renderQuestion(reviewQuestionPosition,r);const opts=[...answersList.querySelectorAll(".answer-option")];opts.forEach(o=>{o.disabled=true;if(o.dataset.answerId===r.selectedAnswerId)o.classList.add(r.selectedWasCorrect?"correct":"incorrect");else if(!r.selectedWasCorrect&&o.dataset.correct==="true")o.classList.add("disabled-correct");else o.classList.add("disabled-neutral")});showFeedback(r.selectedWasCorrect,r.feedbackAvatar);continueButton.style.display="none";reviewPreviousButton.disabled=false;reviewNextButton.disabled=false;showQuestionScreen()}
reviewQuizButton.addEventListener("click",()=>{isReviewMode=true;reviewQuestionPosition=0;resultsScreen.classList.remove("is-active");resultsScreen.setAttribute("aria-hidden","true");questionScreen.classList.add("is-reviewing");renderReview();});reviewPreviousButton.addEventListener("click",()=>{if(reviewQuestionPosition===0){showResults();return;}reviewQuestionPosition--;renderReview();});reviewNextButton.addEventListener("click",()=>{if(reviewQuestionPosition===questionOrder.length-1){showResults();return;}reviewQuestionPosition++;renderReview();});
`.replace("__DATA__", JSON.stringify(exportData.questions));
  return `<!DOCTYPE html><html lang="en"><head><base href="${safeBaseUrl}"><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>${plainTitle}</title><meta name="quiz-title" content="${String(title||"").replace(/"/g,"&quot;")}"><meta name="quiz-filename" content="${safeFilename}"><link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500&display=swap" rel="stylesheet"><style>:root {
  --slide-width: 720px;
  --slide-height: 540px;
  --navy: #003770;
  --title-colour: #00273b;
  --teal: #008d8c;
  --correct: #49bd98;
  --incorrect: #e24b73;
  --feedback-bg: #bad6e5;
  --start-exit-duration: 1.5s;
}

*,
*::before,
*::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html,
body {
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: #ffffff;
  font-family: "Roboto", Arial, sans-serif;
}

body {
  display: flex;
  align-items: center;
  justify-content: center;
}

button { font: inherit; }
img { display: block; }

.page-shell {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}

.quiz-stage {
  position: relative;
  flex: 0 0 auto;
  width: var(--slide-width);
  height: var(--slide-height);
  overflow: hidden;
  background: #ffffff;
  transform-origin: center center;
}

.screen {
  position: absolute;
  inset: 0;
  width: var(--slide-width);
  height: var(--slide-height);
  overflow: hidden;
  background: #ffffff;
}

/* START SCREEN */
.start-screen {
  z-index: 2;
  transform: translateX(0);
  transition: transform var(--start-exit-duration) ease-in-out;
}
.start-screen.is-exiting {
  transform: translateX(-110%);
  pointer-events: none;
}
.left-panel { position: absolute; left: 0; top: 0; width: 193px; height: 540px; background: var(--navy); }
.corner-graphic { position: absolute; left: -160px; top: -105px; width: 354px; height: 322px; max-width: none; transform: scaleX(-1) rotate(60deg); }
.coursebook-logo { position: absolute; left: 24px; top: 478px; width: 139px; height: 34px; max-width: none; }
.quiz-icon { position: absolute; left: 419px; top: 106px; width: 74px; height: 74px; max-width: none; }
.quiz-title { position: absolute; left: 215px; top: 181px; width: 483px; height: 236px; display: flex; align-items: center; justify-content: center; overflow: hidden; text-align: center; }
.quiz-title h1 { width: 100%; color: var(--title-colour); font-size: 40px; font-weight: 500; line-height: 1.1; text-align: center; }
.start-button { position: absolute; left: 391px; top: 420px; width: 130px; height: 32px; display: flex; align-items: center; justify-content: center; border: 2px solid var(--navy); border-radius: 6px; background: var(--navy); color: #fff; font-size: 16px; font-weight: 400; line-height: 1; cursor: pointer; }
.start-button:hover,
.start-button:focus-visible { background: #fff; color: var(--navy); outline: none; }

/* QUESTION SCREEN */
.question-screen { z-index: 1; visibility: hidden; pointer-events: none; }
.question-screen.is-active { visibility: visible; pointer-events: auto; }
.question-number { position: absolute; left: 3px; top: 1px; width: 35px; height: 28px; display: flex; align-items: flex-start; justify-content: center; color: var(--teal); font-weight: 300; line-height: 1; white-space: nowrap; }
.current-question { font-size: 14.67px; }
.total-questions { font-size: 14px; }
.question-box { position: absolute; left: 30px; top: 30px; width: 426px; height: 140px; display: flex; align-items: center; justify-content: flex-start; padding: 5px 15px; border-radius: 17px; background: #ebeff3; overflow: hidden; }
.question-box p { width: 100%; color: #00273b; font-size: 14.67px; font-weight: 300; line-height: 1.2; text-align: left; overflow-wrap: break-word; }
.answers-list { position: absolute; inset: 0; }
.answer-option { position: absolute; left: 31px; width: 426px; height: 70px; display: flex; align-items: center; padding: 5px 10px 5px 25px; border: 0; border-radius: 17px; background: #cce8e8; color: var(--teal); font-size: 13.33px; font-weight: 300; line-height: 1.2; text-align: left; cursor: pointer; transition: background .2s ease, color .2s ease, border .2s ease; }
.answer-option:nth-child(1) { top: 185px; }
.answer-option:nth-child(2) { top: 260px; }
.answer-option:nth-child(3) { top: 335px; }
.answer-option:nth-child(4) { top: 410px; }
.answer-text { display: block; flex: 1; min-width: 0; overflow-wrap: break-word; }
.custom-radio { position: relative; flex: 0 0 auto; width: 30px; height: 30px; margin-right: 18px; border: 4px solid #aebfc0; border-radius: 50%; background: #fff; }
.answer-option:hover:not(:disabled) { background: #f6e6c3; color: #cc9716; }
.answer-option:focus-visible { outline: 2px solid #003770; outline-offset: 2px; }
.answer-option.selected { background: #f6e6c3; color: #cc9716; }
.answer-option.selected .custom-radio { border-color: rgba(0,0,0,.8); background: #e9e9e9; }
.answer-option.selected .custom-radio::after { content: ""; position: absolute; left: 50%; top: 50%; width: 14px; height: 14px; border-radius: 50%; background: #e6bc48; transform: translate(-50%, -50%); }
.answer-option.correct { background: var(--correct); color: #fff; }
.answer-option.incorrect { background: var(--incorrect); color: #fff; }
.answer-option.disabled-correct { border: 2px solid var(--correct); background: #e4f5f0; color: #4abd98; }
.answer-option.disabled-neutral { background: #ebeff3; color: #9fb2bd; }
.answer-option:disabled { cursor: default; }

.question-part { opacity: 0; transition: opacity .5s ease; }
.question-part.fade-in { opacity: 1; }
.question-image { position: absolute; left: 495px; top: 40px; width: 195px; height: 470px; object-fit: contain; pointer-events: none; }

.submit-button,
.continue-button { display: flex; align-items: center; justify-content: center; border: 2px solid var(--teal); border-radius: 18px; background: var(--teal); color: #fff; font-size: 16px; font-weight: 400; line-height: 1; cursor: pointer; transition: opacity .35s ease, background .2s ease, color .2s ease; }
.submit-button:hover,
.submit-button:focus-visible,
.continue-button:hover,
.continue-button:focus-visible { background: #fff; color: var(--teal); outline: none; }
.submit-button { position: absolute; left: 260px; top: 495px; width: 140px; height: 40px; opacity: 0; pointer-events: none; }
.submit-button.is-visible { opacity: 1; pointer-events: auto; }

/* FEEDBACK */
.feedback-panel {
  position: absolute;
  left: 486px;
  top: -1px;
  width: 241px;
  height: 541px;
  z-index: 5;
  overflow: hidden;
  background: var(--feedback-bg);

  visibility: hidden;
  pointer-events: none;

  transform: translateX(105%);
  transition: transform 0.5s ease-out;
}

.feedback-panel.is-visible {
  visibility: visible;
  pointer-events: auto;
  transform: translateX(0);
}

.feedback-hero {
  position: absolute;
  left: 0;
  top: 0;
  width: 241px;
  height: 214px;

  /* The parent panel now handles the movement */
  transform: none;
  transition: none;
}

.feedback-panel.is-visible .feedback-hero {
  transform: none;
}
.feedback-avatar { 
  position: absolute; 
  left: 22px; 
  top: 35px; 
  width: 189px; 
  height: 165px; 
  object-fit: contain; 
  z-index: 1; 
}

.feedback-label { position: absolute; left: 43px; top: 184px; width: 146px; height: 30px; z-index: 2; display: flex; align-items: center; justify-content: center; border-radius: 18px; color: #fff; font-size: 16px; font-weight: 400; }
.feedback-label.correct { background: var(--correct); }
.feedback-label.incorrect { background: var(--incorrect); }
.feedback-text { position: absolute; left: 23px; top: 230px; width: 188px; height: 250px; overflow: hidden; color: #00273b; font-size: 14px; font-weight: 300; line-height: 1.2; opacity: 0; transition: opacity .5s ease; }
.continue-button { position: absolute; left: 59px; top: 498px; width: 118px; height: 30px; opacity: 0; pointer-events: none; transition: opacity .5s ease, background .2s ease, color .2s ease; }
.feedback-panel.show-details .feedback-text,
.feedback-panel.show-details .continue-button { opacity: 1; }
.feedback-panel.show-details .continue-button { pointer-events: auto; }


/* RESULTS SCREEN */

.results-screen {
  z-index: 6;
  visibility: hidden;
  pointer-events: none;
  background: #ffffff;
}

.results-screen.is-active {
  visibility: visible;
  pointer-events: auto;
}

.results-card {
  position: absolute;
  left: 183px;
  top: 159px;
  width: 355px;
  height: 224px;
}

/* Upper teal block */

.results-header {
  position: absolute;
  left: 0;
  top: 0;
  width: 355px;
  height: 127px;
  background: #008d8c;
}

.results-header h2 {
  position: absolute;
  left: 0;
  top: 9px;
  width: 355px;

  color: #ffffff;
  font-family: "Roboto", Arial, sans-serif;
  font-size: 18.67px;
  font-weight: 400;
  line-height: 1;
  letter-spacing: 3px;
  text-align: center;
}

/* Stars */

.results-stars {
  position: absolute;
  left: 20px;
  top: 43px;
  width: 315px;
  height: 57px;
}

.result-star {
  position: absolute;
  top: 0;
  width: 61px;
  height: 57px;
  overflow: hidden;
}

.result-star:nth-child(1) {
  left: 0;
}

.result-star:nth-child(2) {
  left: 63px;
}

.result-star:nth-child(3) {
  left: 126px;
}

.result-star:nth-child(4) {
  left: 189px;
}

.result-star:nth-child(5) {
  left: 252px;
}

.star-grey,
.star-fill {
  position: absolute;
  left: 0;
  top: -8px;

  width: 61px;
  height: 65px;

  font-family: Arial, sans-serif;
  font-size: 70px;
  line-height: 1;

  user-select: none;
}

.star-grey {
  color: #dae0e4;
}

.star-fill {
  width: 0%;
  overflow: hidden;
  color: #e6ba46;
  white-space: nowrap;

  opacity: 0;
  transform: scale(0);
  transform-origin: center center;

  transition:
    transform 0.25s ease-out,
    opacity 0.25s ease-out;
}

.star-fill.is-visible {
  opacity: 1;
  transform: scale(1);
}

/* Lower light-blue block */

.results-footer {
  position: absolute;
  left: 0;
  top: 127px;
  width: 355px;
  height: 97px;
  background: #cce7f1;
}

.results-score {
  position: absolute;
  left: 0;
  top: 26px;
  width: 355px;

  color: #018d8c;
  font-family: "Roboto", Arial, sans-serif;
  font-size: 21.33px;
  font-weight: 400;
  line-height: 1;
  text-align: center;
}

/* Review button */

.review-quiz-button {
  position: absolute;
  left: 104px;
  top: 57px;
  width: 147px;
  height: 30px;

  display: flex;
  align-items: center;
  justify-content: center;

  border: 2px solid var(--teal);
  border-radius: 18px;
  background: var(--teal);
  color: #ffffff;

  font-family: "Roboto", Arial, sans-serif;
  font-size: 16px;
  font-weight: 400;
  line-height: 1;

  cursor: pointer;

  transition:
    background 0.2s ease,
    color 0.2s ease;
}

.review-quiz-button:hover,
.review-quiz-button:focus-visible {
  background: #ffffff;
  color: var(--teal);
  outline: none;
}

.results-score {
  opacity: 0;
  transition: opacity 0.5s ease;
}

.results-score.is-visible {
  opacity: 1;
}

.review-quiz-button {
  opacity: 0;
  pointer-events: none;

  transition:
    opacity 0.5s ease,
    background 0.2s ease,
    color 0.2s ease;
}

.review-quiz-button.is-visible {
  opacity: 1;
  pointer-events: auto;
}

/* Review navigation buttons */

.review-navigation-button {
    position: absolute;
    top: 270px;
    width: 54px;
    height: 120px;

    background: #008D8C;
    border: none;
    padding: 0;
    cursor: pointer;

    display: none;
    align-items: center;
    justify-content: center;

    border-radius: 999px;

    z-index: 20;
}

/* Left button */
.review-navigation-left {
    left: -27px;
    border-radius: 0 60px 60px 0;
}

/* Right button */
.review-navigation-right {
    left: 693px;
    border-radius: 60px 0 0 60px;
}

/* Show both navigation buttons throughout review mode. */
.question-screen.is-reviewing .review-navigation-button {
  display: flex;
  visibility: visible;
  pointer-events: auto;
}

/* Keep the unavailable direction visible, but clearly disabled. */

/* No hover, active or focus visual states */
.review-navigation-button:hover,
.review-navigation-button:active,
.review-navigation-button:focus {
  background: #008D8C;
  outline: none;
  box-shadow: none;
}

/* Arrow shapes */
.review-navigation-arrow {
    width: 18px;
    height: 18px;
    border-top: 5px solid #fff;
    border-right: 5px solid #fff;
}

.review-navigation-arrow-left {
    transform: rotate(-135deg);
    margin-left: 32px;
}

.review-navigation-arrow-right {
    transform: rotate(45deg);
    margin-right: 32px;
}

/* Hide Continue during review mode */
.question-screen.is-reviewing .continue-button {
  display: none;
}

/* Remove question entrance animations during review */
.question-screen.is-reviewing .question-part,
.question-screen.is-reviewing .answer-option,
.question-screen.is-reviewing .question-image {
  opacity: 1;
  transition: none;
}

/* Keep the feedback panel visible immediately during review */
.question-screen.is-reviewing .feedback-panel {
  transform: translateX(0);
  transition: none;
}

/* Show feedback content immediately */
.question-screen.is-reviewing .feedback-text,
.question-screen.is-reviewing .feedback-label,
.question-screen.is-reviewing .feedback-avatar {
  opacity: 1;
  transition: none;
}</style></head><body><main class="page-shell"><div id="quizStage" class="quiz-stage">
<section id="startScreen" class="screen start-screen" aria-label="Quiz start screen">
<div class="left-panel" aria-hidden="true"></div><img class="corner-graphic" src="assets/icons/CB_icon.png" alt=""><img class="coursebook-logo" src="assets/icons/CB_logo.png" alt="CourseBook"><img class="quiz-icon" src="assets/icons/quiz_icon.png" alt="">
<div class="quiz-title"><h1>${title}</h1></div><button id="startButton" class="start-button" type="button">Start</button></section>
<section id="questionScreen" class="screen question-screen" aria-label="Quiz question" aria-hidden="true">
<div class="question-number question-part" aria-live="polite"><span id="currentQuestionNumber" class="current-question">1</span><span id="totalQuestions" class="total-questions">/5</span></div>
<div class="question-box"><p id="questionText"></p></div>
<div id="answersList" class="answers-list" role="radiogroup" aria-labelledby="questionText">
<button class="answer-option question-part" type="button" role="radio" aria-checked="false"><span class="custom-radio" aria-hidden="true"></span><span class="answer-text"></span></button>
<button class="answer-option question-part" type="button" role="radio" aria-checked="false"><span class="custom-radio" aria-hidden="true"></span><span class="answer-text"></span></button>
<button class="answer-option question-part" type="button" role="radio" aria-checked="false"><span class="custom-radio" aria-hidden="true"></span><span class="answer-text"></span></button>
<button class="answer-option question-part" type="button" role="radio" aria-checked="false"><span class="custom-radio" aria-hidden="true"></span><span class="answer-text"></span></button></div>
<button id="submitButton" class="submit-button" type="button">SUBMIT</button><img id="questionImage" class="question-image question-part" src="" alt="">
<aside id="feedbackPanel" class="feedback-panel" aria-hidden="true"><div id="feedbackHero" class="feedback-hero"><img id="feedbackAvatar" class="feedback-avatar" src="" alt=""><div id="feedbackLabel" class="feedback-label">CORRECT</div></div><p id="feedbackText" class="feedback-text"></p><button id="continueButton" class="continue-button" type="button">CONTINUE</button></aside>
<button id="reviewPreviousButton" class="review-navigation-button review-navigation-left" type="button" aria-label="Previous review question"><span class="review-navigation-arrow review-navigation-arrow-left" aria-hidden="true"></span></button><button id="reviewNextButton" class="review-navigation-button review-navigation-right" type="button" aria-label="Next review question"><span class="review-navigation-arrow review-navigation-arrow-right" aria-hidden="true"></span></button></section>
<section id="resultsScreen" class="screen results-screen" aria-hidden="true"><div class="results-card"><div class="results-header"><h2>YOUR RESULTS</h2><div id="resultsStars" class="results-stars" aria-label="Quiz score">${'<div class="result-star"><span class="star-grey">★</span><span class="star-fill">★</span></div>'.repeat(5)}</div></div><div class="results-footer"><p id="resultsScore" class="results-score">0/5</p><button id="reviewQuizButton" class="review-quiz-button" type="button">REVIEW QUIZ</button></div></div></section>
</div></main><script>${runtime}<\/script></body></html>`;
}

// ── Platform-compatible export HTML builder ───────────────

function buildStandaloneQuizHtml(exportData, title) {
  const rawTitle = String(title || "Quiz");
  const plainTitle = rawTitle.replace(/<[^>]+>/g, "");
  const safeFilename = exportData.filename || plainTitle.replace(/[^a-zA-Z0-9_-]/g, "_");

  const escapeHtml = value => String(value ?? "").replace(/[&<>"']/g, character => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[character]);

  const safeQuizData = JSON.stringify(exportData.questions || [])
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");

  const platformTemplate = "<!DOCTYPE html>\n<html>\n<head>\n  <script type=\"module\">import 'https://unpkg.com/mathlive';</script>\n  <title>__EDGE_QUIZ_TITLE_TEXT__</title>\n  <meta name=\"quiz-title\" content=\"__EDGE_QUIZ_TITLE_ATTRIBUTE__\">\n  <meta name=\"quiz-filename\" content=\"__EDGE_QUIZ_FILENAME__\">\n  <meta charset=\"UTF-8\">\n  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\n  <style>\n    *, *::before, *::after { box-sizing: border-box; }\n\n    html, body {\n      margin: 0;\n      width: 100%;\n      height: 100%;\n      overflow: hidden;\n    }\n\n    body {\n      font-family: Arial, sans-serif;\n      color: #052d43;\n      background: white;\n    }\n\n    .slide {\n      width: 720px;\n      height: 540px;\n      display: none;\n      position: absolute;\n      left: 50%;\n      top: 50%;\n      overflow: hidden;\n      transform: translate(-50%, -50%) scale(var(--quiz-scale, 1));\n      transform-origin: center center;\n    }\n    .slide.active { display: flex; }\n\n    /* ── Title slide: landscape 720 × 540 ── */\n    .title-slide.active {\n      display: grid;\n      grid-template-columns: 34% 66%;\n      background: white;\n    }\n    .left-panel {\n      background: #084371;\n      position: relative;\n      overflow: hidden;\n    }\n    .stripe {\n      position: absolute;\n      width: 360px;\n      height: 24px;\n      border-radius: 30px;\n      transform: rotate(30deg);\n      left: -90px;\n    }\n    .stripe.pink   { background: #ef5774; top: 55px; }\n    .stripe.orange { background: #f57958; top: 95px; }\n    .stripe.blue   { background: #25b8d4; top: 165px; }\n    .coursebook {\n      position: absolute;\n      bottom: 24px;\n      left: 28px;\n      color: white;\n      font-size: 22px;\n      letter-spacing: -0.5px;\n    }\n    .title-content {\n      display: flex;\n      flex-direction: column;\n      align-items: center;\n      justify-content: center;\n      padding: 24px 32px;\n    }\n    .quiz-icon {\n      width: 76px;\n      height: 76px;\n      border-radius: 50%;\n      background: linear-gradient(135deg, #f47a52, #df3f7d);\n      color: white;\n      display: flex;\n      align-items: center;\n      justify-content: center;\n      font-size: 32px;\n      margin-bottom: 42px;\n      flex-shrink: 0;\n    }\n    h1 {\n      width: 100%;\n      max-width: 390px;\n      font-size: 34px;\n      line-height: 1.15;\n      margin: 0 0 48px;\n      text-align: center;\n      color: #052d43;\n      overflow-wrap: anywhere;\n    }\n    button {\n      border: none;\n      cursor: pointer;\n      font-weight: bold;\n      font-size: 20px;\n      color: white;\n      border-radius: 9px;\n      padding: 12px 52px;\n      background: #084371;\n    }\n    button:hover { opacity: 0.9; }\n\n    /* ── Question slide: landscape 720 × 540 ── */\n    .question-slide.active {\n      display: grid;\n      grid-template-columns: 62% 38%;\n      background: white;\n    }\n    .question-left {\n      height: 100%;\n      padding: 12px 18px 16px;\n      display: flex;\n      flex-direction: column;\n      min-width: 0;\n    }\n    .counter {\n      color: #008f8d;\n      font-size: 18px;\n      margin-bottom: 8px;\n      flex-shrink: 0;\n    }\n    .question-box {\n      background: #eef2f6;\n      border-radius: 12px;\n      padding: 15px 18px;\n      height: 112px;\n      min-height: 112px;\n      font-size: 18px;\n      line-height: 1.22;\n      margin-bottom: 10px;\n      overflow: auto;\n      overflow-wrap: anywhere;\n    }\n    #answersContainer {\n      display: grid;\n      grid-template-rows: repeat(4, 1fr);\n      gap: 6px;\n      min-height: 0;\n      flex: 1;\n    }\n    .answer-card {\n      min-height: 0;\n      height: auto;\n      border-radius: 12px;\n      background: #d2eeee;\n      color: #14989c;\n      margin: 0;\n      display: flex;\n      align-items: center;\n      padding: 6px 12px;\n      font-size: 16px;\n      line-height: 1.15;\n      cursor: pointer;\n      transition: background 0.15s, color 0.15s;\n      border: 3px solid transparent;\n      overflow: hidden;\n      overflow-wrap: anywhere;\n    }\n    .answer-card > div:last-child {\n      max-height: 2.35em;\n      overflow: auto;\n      flex: 1;\n      min-width: 0;\n    }\n    .answer-card:hover,\n    .answer-card.selected  { background: #fff0c9; color: #d39220; }\n    .answer-card.disabled  { background: #edf2f6; color: #9eafbd; cursor: default; }\n    .answer-card.correct   { background: #50bd98; color: white; }\n    .answer-card.correct-border { background: #eefaf5; color: #50bd98; border-color: #50bd98; }\n    .answer-card.incorrect { background: #df4375; color: white; }\n\n    .radio-circle {\n      width: 28px;\n      height: 28px;\n      border-radius: 50%;\n      background: white;\n      border: 5px solid #aab5b8;\n      margin-right: 12px;\n      flex-shrink: 0;\n    }\n    .answer-card.selected .radio-circle { background: #f2c44d; }\n\n    .submit-btn, .continue-btn {\n      background: #0c9695;\n      border-radius: 22px;\n      display: none;\n      margin: 10px auto 0;\n      padding: 9px 34px;\n      font-size: 16px;\n    }\n    .continue-btn {\n      display: block;\n      position: absolute;\n      bottom: 20px;\n      left: 50%;\n      transform: translateX(-50%);\n      margin: 0;\n    }\n\n    .question-right { position: relative; min-width: 0; }\n    .image-placeholder {\n      width: 100%;\n      height: 100%;\n      display: flex;\n      align-items: center;\n      justify-content: center;\n      color: #8aa7b5;\n      font-size: 16px;\n      overflow: hidden;\n      background: #e9f1f5;\n    }\n    .question-image {\n      width: 100%;\n      height: 100%;\n      object-fit: cover;\n      background: #e9f1f5;\n    }\n    .feedback-panel {\n      display: none;\n      background: #c5e3ef;\n      width: 100%;\n      height: 100%;\n      padding: 28px 24px 82px;\n      position: relative;\n      overflow: auto;\n    }\n    .feedback-panel.show { display: block; }\n    .feedback-image {\n      height: 170px;\n      display: flex;\n      align-items: center;\n      justify-content: center;\n      margin-bottom: 10px;\n    }\n    .feedback-img {\n      max-height: 170px;\n      max-width: 100%;\n      object-fit: contain;\n    }\n    .feedback-badge {\n      width: 205px;\n      margin: 0 auto 18px;\n      text-align: center;\n      color: white;\n      font-weight: bold;\n      font-size: 20px;\n      border-radius: 24px;\n      padding: 9px 16px;\n      letter-spacing: 1px;\n    }\n    .feedback-badge.correct   { background: #50bd98; }\n    .feedback-badge.incorrect { background: #df4375; }\n    .feedback-text {\n      font-size: 17px;\n      line-height: 1.25;\n      color: #23475c;\n      overflow-wrap: anywhere;\n    }\n\n    /* ── Results slide ── */\n    .results-slide.active {\n      display: flex;\n      justify-content: center;\n      align-items: center;\n    }\n    .results-card { width: 470px; text-align: center; }\n    .results-top  { background: #0f9691; color: white; padding: 12px 26px 26px; }\n    .results-top h2 {\n      margin: 0 0 22px;\n      font-size: 28px;\n      letter-spacing: 8px;\n      font-weight: normal;\n    }\n    .stars { display: flex; justify-content: center; gap: 8px; font-size: 62px; }\n    .star  { position: relative; color: #dce8ed; display: inline-block; }\n    .star.full { color: #f4c34b; }\n    .star.half::before {\n      content: \"★\";\n      position: absolute;\n      left: 0;\n      width: 50%;\n      overflow: hidden;\n      color: #f4c34b;\n    }\n    .results-bottom { background: #cfeef7; padding: 24px; }\n    .score-display  { font-size: 32px; color: #0f9691; margin-bottom: 25px; }\n    .review-btn     { background: #0f9691; border-radius: 26px; font-size: 20px; padding: 10px 36px; }\n\n    .review-arrow {\n    position: fixed;\n    top: 50%;\n    transform: translateY(-50%);\n\n    width: 74px;\n    height: 150px;\n\n    background: #0f9691;\n    color: #fff;\n\n    border: none;\n    cursor: pointer;\n\n    font-size: 58px;\n    font-weight: bold;\n\n    display: flex;\n    align-items: center;\n    justify-content: center;\n\n    z-index: 9999;\n}\n\n.review-arrow.left {\n    left: calc(50% - 360px + 37px);\n    border-radius: 0 75px 75px 0;\n}\n\n.review-arrow.right {\n    left: calc(50% + 360px - 37px);\n    border-radius: 75px 0 0 75px;\n}\n  </style>\n</head>\n<body>\n\n  <section id=\"titleSlide\" class=\"slide title-slide active\">\n    <div class=\"left-panel\">\n      <div class=\"stripe pink\"></div>\n      <div class=\"stripe orange\"></div>\n      <div class=\"stripe blue\"></div>\n      <div class=\"coursebook\">CourseBook</div>\n    </div>\n    <div class=\"title-content\">\n      <div class=\"quiz-icon\">☑</div>\n      <h1>__EDGE_QUIZ_TITLE_HTML__</h1>\n      <button onclick=\"startQuiz()\">Start</button>\n    </div>\n  </section>\n\n  <section id=\"questionSlide\" class=\"slide question-slide\">\n    <div class=\"question-left\">\n      <div class=\"counter\" id=\"counter\"></div>\n      <div class=\"question-box\" id=\"questionText\"></div>\n      <div id=\"answersContainer\"></div>\n      <button id=\"submitBtn\" class=\"submit-btn\" onclick=\"submitAnswer()\">SUBMIT</button>\n    </div>\n    <div class=\"question-right\">\n      <div id=\"questionImage\" class=\"image-placeholder\">\n        <img id=\"questionImageEl\" class=\"question-image\" src=\"\" alt=\"Question image\">\n      </div>\n      <div id=\"feedbackPanel\" class=\"feedback-panel\">\n        <div class=\"feedback-image\"><img id=\"feedbackImageEl\" class=\"feedback-img\" src=\"\" alt=\"Feedback image\"></div>\n        <div id=\"feedbackBadge\" class=\"feedback-badge\"></div>\n        <div id=\"feedbackText\" class=\"feedback-text\"></div>\n        <button id=\"continueBtn\" class=\"continue-btn\" onclick=\"continueQuiz()\">CONTINUE</button>\n      </div>\n    </div>\n  </section>\n\n  <section id=\"resultsSlide\" class=\"slide results-slide\">\n    <div class=\"results-card\">\n      <div class=\"results-top\">\n        <h2>YOUR RESULTS</h2>\n        <div class=\"stars\" id=\"starsContainer\"></div>\n      </div>\n      <div class=\"results-bottom\">\n        <div id=\"scoreDisplay\" class=\"score-display\"></div>\n        <button class=\"review-btn\" onclick=\"reviewQuiz()\">REVIEW QUIZ</button>\n      </div>\n    </div>\n  </section>\n\n  <script>\n    const originalQuizData = __EDGE_QUIZ_DATA__;\n    let activeQuiz = [], currentQuestionIndex = 0, selectedAnswerIndex = null;\n\n    // Storyline-style responsive player scaling: preserve the 720 × 540\n    // design canvas while filling as much of the browser as possible.\n    function scaleQuizToViewport() {\n      const scale = Math.min(window.innerWidth / 720, window.innerHeight / 540);\n      document.documentElement.style.setProperty(\"--quiz-scale\", String(scale));\n    }\n      \n\n    window.addEventListener(\"resize\", scaleQuizToViewport);\n    window.addEventListener(\"orientationchange\", scaleQuizToViewport);\n    scaleQuizToViewport();\n    let score = 0, submitted = false, reviewMode = false, userAnswers = [], completedFired = false;\n\n    function shuffleArray(arr) { return [...arr].sort(() => Math.random() - 0.5); }\n\n    // Available question images (sit in the img/ folder next to this file)\n    const QUIZ_IMAGES = [\n      \"img/image1.svg\",\n      \"img/image2.svg\",\n      \"img/image3.svg\",\n      \"img/image4.svg\",\n      \"img/image5.svg\"\n    ];\n\n    // Feedback images: 5 for correct, 5 for incorrect\n    const CORRECT_IMAGES = [\n      \"img/correct1.svg\",\n      \"img/correct2.svg\",\n      \"img/correct3.svg\",\n      \"img/correct4.svg\",\n      \"img/correct5.svg\"\n    ];\n    const INCORRECT_IMAGES = [\n      \"img/incorrect1.svg\",\n      \"img/incorrect2.svg\",\n      \"img/incorrect3.svg\",\n      \"img/incorrect4.svg\",\n      \"img/incorrect5.svg\"\n    ];\n\n    // Shuffled queues + pointers, set up at quiz start\n    let correctQueue = [], incorrectQueue = [];\n    let correctPtr = 0, incorrectPtr = 0;\n\n    // Pull the next feedback image, cycling through a shuffled queue.\n    // Re-shuffles when exhausted, avoiding an immediate repeat at the seam.\n    function nextFeedbackImage(isCorrect) {\n      if (isCorrect) {\n        if (correctPtr >= correctQueue.length) {\n          const last = correctQueue[correctQueue.length - 1];\n          do { correctQueue = shuffleArray(CORRECT_IMAGES); }\n          while (correctQueue.length > 1 && correctQueue[0] === last);\n          correctPtr = 0;\n        }\n        return correctQueue[correctPtr++];\n      } else {\n        if (incorrectPtr >= incorrectQueue.length) {\n          const last = incorrectQueue[incorrectQueue.length - 1];\n          do { incorrectQueue = shuffleArray(INCORRECT_IMAGES); }\n          while (incorrectQueue.length > 1 && incorrectQueue[0] === last);\n          incorrectPtr = 0;\n        }\n        return incorrectQueue[incorrectPtr++];\n      }\n    }\n\n    /**\n     * Assign one image per question.\n     * - If questions <= images: each image used at most once (no repeats).\n     * - If questions > images: images repeat as evenly as possible, but the\n     *   same image never appears on two consecutive questions.\n     */\n    function assignImages(count) {\n      const imgCount = QUIZ_IMAGES.length;\n\n      // Simple case: enough unique images, just shuffle and slice\n      if (count <= imgCount) {\n        return shuffleArray(QUIZ_IMAGES).slice(0, count);\n      }\n\n      // Build a pool where each image appears the needed number of times\n      const pool = [];\n      let i = 0;\n      while (pool.length < count) {\n        pool.push(QUIZ_IMAGES[i % imgCount]);\n        i++;\n      }\n\n      // Shuffle, then fix any adjacent duplicates by swapping forward\n      let result = shuffleArray(pool);\n      for (let attempt = 0; attempt < 50; attempt++) {\n        let clean = true;\n        for (let j = 1; j < result.length; j++) {\n          if (result[j] === result[j - 1]) {\n            // find a later item that differs from both neighbours, swap it in\n            let swapped = false;\n            for (let k = j + 1; k < result.length; k++) {\n              if (result[k] !== result[j - 1] &&\n                  (j + 1 >= result.length || result[k] !== result[j + 1])) {\n                [result[j], result[k]] = [result[k], result[j]];\n                swapped = true;\n                break;\n              }\n            }\n            if (!swapped) clean = false;\n          }\n        }\n        if (clean) break;\n        result = shuffleArray(pool); // reshuffle and retry if stuck\n      }\n      return result;\n    }\n\n    function shuffleQuestions(questions) {\n      let shuffled = shuffleArray(questions);\n\n      if (questions.length === 5) {\n        const firstQuestion = questions[0];\n        const fifthQuestion = questions[4];\n        let guard = 0;\n\n        while (\n          Math.abs(shuffled.indexOf(firstQuestion) - shuffled.indexOf(fifthQuestion)) === 1 &&\n          guard++ < 50\n        ) {\n          shuffled = shuffleArray(questions);\n        }\n      }\n\n      return shuffled;\n    }\n\n    function startQuiz() {\n      if (typeof started === \"function\") started();\n      const imageOrder = assignImages(originalQuizData.length);\n      activeQuiz = shuffleQuestions(originalQuizData).map((q, idx) => ({\n        ...q,\n        answers: shuffleArray(q.answers.map((a, i) => ({ text: a, isCorrect: i === q.correctIndex })))\n      }));\n      // Attach an image to each question after shuffling the question order\n      activeQuiz.forEach((q, idx) => { q.image = imageOrder[idx]; });\n      currentQuestionIndex = 0; selectedAnswerIndex = null;\n      score = 0; submitted = false; reviewMode = false; userAnswers = []; completedFired = false;\n      correctQueue = shuffleArray(CORRECT_IMAGES); correctPtr = 0;\n      incorrectQueue = shuffleArray(INCORRECT_IMAGES); incorrectPtr = 0;\n      removeReviewNavigation();\n      showSlide(\"questionSlide\");\n      renderQuestion();\n    }\n\n    function showSlide(id) {\n      document.querySelectorAll(\".slide\").forEach(s => s.classList.remove(\"active\"));\n      document.getElementById(id).classList.add(\"active\");\n    }\n\n    function renderQuestion() {\n      const q = activeQuiz[currentQuestionIndex];\n      selectedAnswerIndex = null; submitted = false;\n      document.getElementById(\"counter\").textContent = `${currentQuestionIndex + 1}/${activeQuiz.length}`;\n      document.getElementById(\"questionText\").innerHTML = q.question;\n      document.getElementById(\"submitBtn\").style.display = \"none\";\n      document.getElementById(\"feedbackPanel\").classList.remove(\"show\");\n      document.getElementById(\"questionImage\").style.display = \"flex\";\n      document.getElementById(\"questionImageEl\").src = q.image || \"\";\n\n      const container = document.getElementById(\"answersContainer\");\n      container.innerHTML = \"\";\n      q.answers.forEach((answer, i) => {\n        const card = document.createElement(\"div\");\n        card.className = \"answer-card\";\n        card.onclick = () => selectAnswer(i);\n        card.innerHTML = `<div class=\"radio-circle\"></div><div>${answer.text}</div>`;\n        container.appendChild(card);\n      });\n    }\n\n    function selectAnswer(index) {\n      if (submitted || reviewMode) return;\n      selectedAnswerIndex = index;\n      document.querySelectorAll(\".answer-card\").forEach((c, i) => c.classList.toggle(\"selected\", i === index));\n      document.getElementById(\"submitBtn\").style.display = \"block\";\n    }\n\n    function submitAnswer() {\n      if (selectedAnswerIndex === null) return;\n      submitted = true;\n      const q = activeQuiz[currentQuestionIndex];\n      const answer = q.answers[selectedAnswerIndex];\n      const isCorrect = answer.isCorrect;\n      if (isCorrect) score++;\n      const fbImage = nextFeedbackImage(isCorrect);\n      userAnswers[currentQuestionIndex] = { selectedAnswerIndex, isCorrect, fbImage };\n      document.getElementById(\"submitBtn\").style.display = \"none\";\n      document.getElementById(\"questionImage\").style.display = \"none\";\n      renderSubmittedState(q, selectedAnswerIndex, isCorrect, false, fbImage);\n    }\n\n    function renderSubmittedState(q, selectedIndex, isCorrect, isReview, fbImage) {\n      document.querySelectorAll(\".answer-card\").forEach((card, i) => {\n        const a = q.answers[i];\n        card.onclick = null;\n        card.classList.remove(\"selected\");\n        if (a.isCorrect && isCorrect)       card.classList.add(\"correct\");\n        else if (a.isCorrect && !isCorrect) card.classList.add(\"correct-border\");\n        else if (i === selectedIndex && !isCorrect) card.classList.add(\"incorrect\");\n        else card.classList.add(\"disabled\");\n      });\n\n      const badge = document.getElementById(\"feedbackBadge\");\n      badge.textContent = isCorrect ? \"CORRECT\" : \"INCORRECT\";\n      badge.className = \"feedback-badge \" + (isCorrect ? \"correct\" : \"incorrect\");\n      document.getElementById(\"feedbackImageEl\").src = fbImage || \"\";\n      document.getElementById(\"feedbackText\").innerHTML = q.feedback || \"No feedback added.\";\n      document.getElementById(\"feedbackPanel\").classList.add(\"show\");\n      document.getElementById(\"continueBtn\").style.display = isReview ? \"none\" : \"block\";\n    }\n\n    function continueQuiz() {\n      currentQuestionIndex++;\n      if (currentQuestionIndex >= activeQuiz.length) showResults();\n      else renderQuestion();\n    }\n\n    function showResults() {\n      removeReviewNavigation();\n      showSlide(\"resultsSlide\");\n      document.getElementById(\"scoreDisplay\").textContent = `${score}/${activeQuiz.length}`;\n      if (!completedFired) {\n        completedFired = true;\n        const percentage = Math.round((score / activeQuiz.length) * 100);\n        if (typeof completed === \"function\") completed(percentage);\n      }\n      renderStars(score, activeQuiz.length);\n    }\n\n    function renderStars(score, total) {\n      const container = document.getElementById(\"starsContainer\");\n      container.innerHTML = \"\";\n      const starScore = total > 0 ? (score / total) * 5 : 0;\n      for (let i = 1; i <= 5; i++) {\n        const star = document.createElement(\"span\");\n        star.className = \"star\" + (starScore >= i ? \" full\" : starScore >= i - 0.5 ? \" half\" : \"\");\n        star.textContent = \"★\";\n        container.appendChild(star);\n      }\n    }\n\n    function reviewQuiz() {\n      reviewMode = true; currentQuestionIndex = 0;\n      showSlide(\"questionSlide\");\n      renderReviewQuestion();\n    }\n\n    function renderReviewQuestion() {\n      const q = activeQuiz[currentQuestionIndex];\n      const saved = userAnswers[currentQuestionIndex];\n      selectedAnswerIndex = saved ? saved.selectedAnswerIndex : null;\n      document.getElementById(\"counter\").textContent = `${currentQuestionIndex + 1}/${activeQuiz.length}`;\n      document.getElementById(\"questionText\").innerHTML = q.question;\n      document.getElementById(\"submitBtn\").style.display = \"none\";\n      document.getElementById(\"questionImage\").style.display = \"none\";\n\n      const container = document.getElementById(\"answersContainer\");\n      container.innerHTML = \"\";\n      q.answers.forEach((answer) => {\n        const card = document.createElement(\"div\");\n        card.className = \"answer-card\";\n        card.innerHTML = `<div class=\"radio-circle\"></div><div>${answer.text}</div>`;\n        container.appendChild(card);\n      });\n\n      renderSubmittedState(q, saved ? saved.selectedAnswerIndex : null, saved ? saved.isCorrect : false, true, saved ? saved.fbImage : \"\");\n      addReviewNavigation();\n    }\n\n    function addReviewNavigation() {\n  removeReviewNavigation();\n\n  const nav = document.createElement(\"div\");\n  nav.id = \"reviewNav\";\n\n  nav.innerHTML = `\n  <button id=\"leftReviewArrow\" class=\"review-arrow left\" onclick=\"previousReviewQuestion()\">‹</button>\n  <button id=\"rightReviewArrow\" class=\"review-arrow right\" onclick=\"nextReviewQuestion()\">›</button>\n`;\n\n  document.body.appendChild(nav);\n\n  positionReviewArrows();\n}\n\nfunction positionReviewArrows() {\n\n  const left = document.getElementById(\"leftReviewArrow\");\n  const right = document.getElementById(\"rightReviewArrow\");\n\n  if (!left || !right) return;\n\n  // Width of the scaled quiz stage\n  const stageWidth = document.getElementById(\"questionSlide\").getBoundingClientRect().width;\n\n  // Left edge of the stage\n  const stageLeft = (window.innerWidth - stageWidth) / 2;\n\n  // Right edge\n  const stageRight = stageLeft + stageWidth;\n\n  // Position arrows 18px inside the stage\n  left.style.left = (stageLeft + 18) + \"px\";\n  right.style.left = (stageRight - right.offsetWidth - 18) + \"px\";\n}\n\n\n\n    function previousReviewQuestion() {\n      if (currentQuestionIndex === 0) { showResults(); return; }\n      currentQuestionIndex--; renderReviewQuestion();\n    }\n\n    function nextReviewQuestion() {\n      if (currentQuestionIndex === activeQuiz.length - 1) { showResults(); return; }\n      currentQuestionIndex++; renderReviewQuestion();\n    }\n\n    window.addEventListener(\"resize\", positionReviewArrows);\n\nfunction removeReviewNavigation() {\n  const nav = document.getElementById(\"reviewNav\");\n  if (nav) nav.remove();\n}\n  </script>\n</body>\n</html>";

  return platformTemplate
    .replaceAll("__EDGE_QUIZ_TITLE_TEXT__", escapeHtml(plainTitle))
    .replaceAll("__EDGE_QUIZ_TITLE_ATTRIBUTE__", escapeHtml(rawTitle))
    .replaceAll("__EDGE_QUIZ_TITLE_HTML__", rawTitle)
    .replaceAll("__EDGE_QUIZ_FILENAME__", escapeHtml(safeFilename))
    .replace("__EDGE_QUIZ_DATA__", safeQuizData);
}

// ── Autosave and builder validation ───────────────────────
let autosaveTimer = null;
const AUTOSAVE_KEY = "edgeQuizBuilderV2";
function scheduleAutosave(){ clearTimeout(autosaveTimer); autosaveTimer=setTimeout(saveDraft,350); }
function saveDraft(){
  try{
    const data=buildQuizExportData();
    localStorage.setItem(AUTOSAVE_KEY, JSON.stringify({...data, questionCount:Number(document.getElementById("questionCount").value)}));
  }catch(_){ }
}
function restoreDraft(){
  try{
    const raw=localStorage.getItem(AUTOSAVE_KEY); if(!raw) return;
    const data=JSON.parse(raw);
    document.getElementById("questionCount").value=String(data.questionCount||data.questions?.length||5);
    document.getElementById("quizFilename").value=data.filename||"";
    const passToggle=document.getElementById("passPercentageEnabled");
    const passInput=document.getElementById("passPercentage");
    if(passToggle) passToggle.checked=Boolean(data.passPercentageEnabled);
    if(passInput){ passInput.value=data.passPercentage||50; passInput.disabled=!data.passPercentageEnabled; }
    generateQuestionFields(); setHtml("quizTitle",data.title||""); populateFields(data.questions||[]);
  }catch(_){ }
}
function validateQuiz(showSuccess=false){
  const problems=[]; const count=Number(document.getElementById("questionCount").value);
  if(!getText("quizTitle")) problems.push("Add a quiz title.");
  if(!document.getElementById("quizFilename").value.trim()) problems.push("Add an output name.");
  for(let i=1;i<=count;i++){
    if(!getText(`question_${i}`)) problems.push(`Question ${i}: add question text.`);
    for(let a=1;a<=4;a++) if(!getText(`q${i}_answer_${a}`)) problems.push(`Question ${i}: add Answer ${a}.`);
    if(!getText(`q${i}_feedback`)) problems.push(`Question ${i}: add feedback.`);
  }
  if(problems.length){
    alert("Quiz needs attention:\n\n"+problems.join("\n"));
    return false;
  }
  if(showSuccess){
    alert("Validation passed. The quiz is ready to export.");
  }
  return true;
}

window.addEventListener("DOMContentLoaded", () => {
  document.getElementById("sharedToolbar").classList.add("inactive");
  generateQuestionFields();
  const passToggle=document.getElementById("passPercentageEnabled");
  const passInput=document.getElementById("passPercentage");
  if(passToggle){
    passToggle.checked=false;
    passToggle.addEventListener("change",()=>{ if(passInput) passInput.disabled=!passToggle.checked; scheduleAutosave(); });
  }
  if(passInput) passInput.disabled=true;
  ["quizFilename","questionCount","passPercentage"].forEach(id=>{ const el=document.getElementById(id); if(el) el.addEventListener("change",scheduleAutosave); });
  restoreDraft();
});
