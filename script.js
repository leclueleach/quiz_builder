/* ============================================================
   QUIZ BUILDER — script.js
   ============================================================ */

"use strict";

// ── State ──────────────────────────────────────────────────
let quizData   = [];
let activeQuiz = [];

// ── Filename helper ────────────────────────────────────────────
function getFilename() {
  const raw = document.getElementById("quizFilename").value.trim();
  // Sanitise: strip anything that isn't alphanumeric, dash, underscore
  return raw.replace(/[^a-zA-Z0-9_-]/g, "_") || "quiz";
}

// ── Rich-text editor factory ───────────────────────────────

/**
 * Returns the HTML string for an inline rich-text editor.
 * The toolbar appears on focus via CSS (:focus-within).
 */
function createRichEditor(id) {
  return `
    <div class="inline-editor-wrapper">
      <div class="inline-toolbar">
        <select onchange="formatFontSize('${id}', this.value, this)">
          <option value="">Size</option>
          ${[25,24,23,22,21,20,19,18,17,16,15,14,13].map(
            n => `<option value="${n}">${n}</option>`
          ).join("")}
        </select>

        <button type="button" onclick="formatEditorText('${id}', 'bold')"><b>B</b></button>
        <button type="button" onclick="formatEditorText('${id}', 'italic')"><i>I</i></button>
        <button type="button" onclick="formatEditorText('${id}', 'underline')"><u>U</u></button>
        <button type="button" onclick="formatEditorText('${id}', 'superscript')">X²</button>
        <button type="button" onclick="formatEditorText('${id}', 'subscript')">X₂</button>
        <button type="button" onclick="formatEditorText('${id}', 'insertUnorderedList')">• List</button>
        <button type="button" onclick="formatEditorText('${id}', 'insertOrderedList')">1. List</button>

        <select onchange="insertSymbol('${id}', this.value, this)">
          <option value="">Symbols</option>
          <option value="²">²</option>
          <option value="³">³</option>
          <option value="₀">₀</option>
          <option value="₁">₁</option>
          <option value="₂">₂</option>
          <option value="₃">₃</option>
          <option value="°">°</option>
          <option value="±">±</option>
          <option value="×">×</option>
          <option value="÷">÷</option>
          <option value="≤">≤</option>
          <option value="≥">≥</option>
          <option value="√">√</option>
          <option value="π">π</option>
        </select>

        <button type="button" class="html-toggle-btn" onclick="toggleHtmlMode('${id}')" title="Edit raw HTML">&lt;/&gt;</button>
      </div>

      <div
        id="${id}"
        class="slide-editable"
        contenteditable="true"
        oninput="handleEditorInput('${id}')"
      ></div>
      <textarea
        id="${id}_html"
        class="html-code-editor"
        style="display:none;"
        oninput="handleEditorInput('${id}')"
      ></textarea>
    </div>
  `;
}


// ── Answer card editor (toolbar top, radio+editable row below) ─
function createAnswerEditor(id) {
  const toolbar = `
    <div class="inline-toolbar">
      <select onchange="formatFontSize('${id}', this.value, this)">
        <option value="">Size</option>
        ${[25,24,23,22,21,20,19,18,17,16,15,14,13].map(n => `<option value="${n}">${n}</option>`).join("")}
      </select>
      <button type="button" onclick="formatEditorText('${id}', 'bold')"><b>B</b></button>
      <button type="button" onclick="formatEditorText('${id}', 'italic')"><i>I</i></button>
      <button type="button" onclick="formatEditorText('${id}', 'underline')"><u>U</u></button>
      <button type="button" onclick="formatEditorText('${id}', 'superscript')">X²</button>
      <button type="button" onclick="formatEditorText('${id}', 'subscript')">X₂</button>
      <button type="button" onclick="formatEditorText('${id}', 'insertUnorderedList')">• List</button>
      <button type="button" onclick="formatEditorText('${id}', 'insertOrderedList')">1. List</button>
      <select onchange="insertSymbol('${id}', this.value, this)">
        <option value="">Symbols</option>
        <option value="²">²</option><option value="³">³</option>
        <option value="₀">₀</option><option value="₁">₁</option>
        <option value="₂">₂</option><option value="₃">₃</option>
        <option value="°">°</option><option value="±">±</option>
        <option value="×">×</option><option value="÷">÷</option>
        <option value="≤">≤</option><option value="≥">≥</option>
        <option value="√">√</option><option value="π">π</option>
      </select>
      <button type="button" class="html-toggle-btn" onclick="toggleHtmlMode('${id}')" title="Edit raw HTML">&lt;/&gt;</button>
    </div>
  `;
  return `
    ${toolbar}
    <div class="answer-row">
      <div class="radio-circle"></div>
      <div id="${id}" class="slide-editable" contenteditable="true" oninput="handleEditorInput('${id}')"></div>
    </div>
    <textarea
      id="${id}_html"
      class="html-code-editor"
      style="display:none;"
      oninput="handleEditorInput('${id}')"
    ></textarea>
  `;
}

// ── Editor formatting helpers ──────────────────────────────

function formatEditorText(id, command) {
  const editor = document.getElementById(id);
  if (!editor) return;
  editor.focus();
  document.execCommand(command, false, null);
}

function formatFontSize(editorId, size, dropdown) {
  if (!size) return;
  const editor = document.getElementById(editorId);
  if (!editor) return;
  editor.focus();
  const selected = window.getSelection().toString();
  if (selected) {
    document.execCommand(
      "insertHTML", false,
      `<span style="font-size:${size}px;">${selected}</span>`
    );
  }
  if (dropdown) dropdown.selectedIndex = 0;
  handleEditorInput(editorId);
}

function insertSymbol(editorId, symbol, dropdown) {
  if (!symbol) return;
  const editor = document.getElementById(editorId);
  if (!editor) return;
  editor.focus();
  document.execCommand("insertText", false, symbol);
  if (dropdown) dropdown.selectedIndex = 0;
  handleEditorInput(editorId);
}

// ── HTML mode toggle (for future use) ─────────────────────

function toggleHtmlMode(id) {
  const visual = document.getElementById(id);
  const raw    = document.getElementById(`${id}_html`);
  if (!visual || !raw) return;

  const switchingToCode = raw.style.display === "none";

  if (switchingToCode) {
    // Visual → Code: copy current HTML into the textarea
    raw.value = visual.innerHTML;
    visual.style.display = "none";
    raw.style.display = "block";
    raw.focus();
  } else {
    // Code → Visual: copy edited HTML back into the editable
    visual.innerHTML = raw.value;
    raw.style.display = "none";
    visual.style.display = "block";
    handleEditorInput(id);
  }
}

function syncHtmlModeToEditor(id) {
  const raw = document.getElementById(`${id}_html`);
  if (raw && raw.style.display !== "none") {
    document.getElementById(id).innerHTML = raw.value;
    raw.style.display = "none";
    document.getElementById(id).style.display = "block";
  }
}

// ── Read / write helpers ───────────────────────────────────

function getHtml(id) {
  syncHtmlModeToEditor(id);
  return document.getElementById(id).innerHTML;
}

function setHtml(id, value) {
  const el = document.getElementById(id);
  if (!el) return;
  el.innerHTML = value || "";
  const raw = document.getElementById(`${id}_html`);
  if (raw) raw.value = value || "";
  handleEditorInput(id);
}

function getText(id) {
  syncHtmlModeToEditor(id);
  return document.getElementById(id).textContent.trim();
}

// ── Fit indicator ──────────────────────────────────────────

function handleEditorInput(id) {
  let type = "answer";
  if (id.startsWith("question_"))   type = "question";
  if (id.includes("_feedback"))     type = "feedback";
  checkEditorFit(id, type);
}

function checkEditorFit(id, type) {
  const editor = document.getElementById(id);
  const status = document.getElementById(`${id}_fit`);
  if (!editor || !status) return;

  const text      = editor.innerText.trim();
  const len       = text.length;
  const lines     = text ? text.split(/\n+/).length : 0;

  const limits = {
    question: { warn: 170, error: 230, warnLines: 4, errorLines: 5 },
    feedback: { warn: 280, error: 390, warnLines: 7, errorLines: 9 },
    answer:   { warn:  60, error:  90, warnLines: 2, errorLines: 3 },
  };
  const { warn, error, warnLines, errorLines } = limits[type] || limits.answer;

  status.classList.remove("fit-ok", "fit-warning", "fit-error");

  if (len > error || lines > errorLines) {
    status.textContent = "🔴 Too much text";
    status.classList.add("fit-error");
  } else if (len > warn || lines > warnLines) {
    status.textContent = "🟡 Fits, but text may shrink";
    status.classList.add("fit-warning");
  } else {
    status.textContent = "🟢 Fits";
    status.classList.add("fit-ok");
  }
}

// ── Builder: generate question fields ─────────────────────

function buildQuestionSlot(i, count) {
  return `
    <div class="question-slot">
      <div class="question-left">
        <div class="counter">${i} / ${count}</div>

        <div class="question-box">
          ${createRichEditor(`question_${i}`)}
        </div>

        <div class="answer-card">
          ${createAnswerEditor(`q${i}_answer_1`)}
        </div>

        <div class="answer-card">
          ${createAnswerEditor(`q${i}_answer_2`)}
        </div>

        <div class="answer-card">
          ${createAnswerEditor(`q${i}_answer_3`)}
        </div>

        <div class="answer-card">
          ${createAnswerEditor(`q${i}_answer_4`)}
        </div>

        <label style="display:block;font-size:13px;margin-top:8px;">Correct answer</label>
        <select id="q${i}_correct" style="display:block;max-width:260px;padding:6px 8px;font-size:14px;margin:4px 0 0;">
          <option value="0">Answer 1</option>
          <option value="1">Answer 2</option>
          <option value="2">Answer 3</option>
          <option value="3">Answer 4</option>
        </select>
      </div>

      <div class="question-right">
        <div class="feedback-panel">
          <div class="feedback-text">
            ${createRichEditor(`q${i}_feedback`)}
          </div>
        </div>
      </div>
    </div>
  `;
}

function buildEmptySlot() {
  return `<div class="question-slot question-slot--empty"></div>`;
}

function generateQuestionFields() {
  const count     = Number(document.getElementById("questionCount").value);
  const container = document.getElementById("questionsContainer");
  const tabs      = document.getElementById("questionTabs");

  tabs.innerHTML      = "";
  container.innerHTML = "";

  // Group questions into pairs
  const pages = Math.ceil(count / 2);

  for (let page = 0; page < pages; page++) {
    const leftIndex  = page * 2 + 1;       // e.g. 1, 3, 5
    const rightIndex = page * 2 + 2;       // e.g. 2, 4, (blank for odd count)
    const isFirst    = page === 0;

    // Single tab per page showing "Q1 - 2" or "Q5" if last odd question
    const tabLabel = rightIndex <= count
      ? `Q${leftIndex} - ${rightIndex}`
      : `Q${leftIndex}`;

    tabs.innerHTML += `
      <button
        type="button"
        class="question-tab ${isFirst ? "active" : ""}"
        onclick="showQuestionPage(${page})">
        ${tabLabel}
      </button>
    `;

    const rightSlot = rightIndex <= count
      ? buildQuestionSlot(rightIndex, count)
      : buildEmptySlot();

    container.innerHTML += `
      <div class="question-block ${isFirst ? "active" : ""}" id="questionPage_${page}">
        ${buildQuestionSlot(leftIndex, count)}
        ${rightSlot}
      </div>
    `;
  }
}

function showQuestionPage(page) {
  document.querySelectorAll(".question-block").forEach(b => b.classList.remove("active"));
  document.querySelectorAll(".question-tab").forEach(t => t.classList.remove("active"));
  document.getElementById(`questionPage_${page}`).classList.add("active");

  // Highlight both tabs for this page
  const allTabs = document.querySelectorAll(".question-tab");
  allTabs.forEach(t => {
    if (t.getAttribute("onclick") === `showQuestionPage(${page})`) {
      t.classList.add("active");
    }
  });
}

// showQuestionTab replaced by showQuestionPage

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
  return { title, filename, questions };
}

// ── Preview ────────────────────────────────────────────────

function previewQuiz() {
  const exportData = buildQuizExportData();
  const win = window.open("", "_blank");
  win.document.open();
  win.document.write(buildStandaloneQuizHtml(exportData, exportData.title || "Quiz Preview"));
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

// List of all image files the quiz references (kept in sync with img/ folder)
const EXPORT_IMAGE_FILES = [
  "image1.svg", "image2.svg", "image3.svg", "image4.svg", "image5.svg",
  "correct1.svg", "correct2.svg", "correct3.svg", "correct4.svg", "correct5.svg",
  "incorrect1.svg", "incorrect2.svg", "incorrect3.svg", "incorrect4.svg", "incorrect5.svg"
];

async function exportStandaloneQuiz() {
  if (!validateQuizForm()) return;

  const data = buildQuizExportData();
  const html = buildStandaloneQuizHtml(data, data.title);
  const folderName = getFilename();

  if (typeof JSZip === "undefined") {
    // Fallback: JSZip not loaded — just download the HTML
    downloadBlob(html, `${folderName}.html`, "text/html");
    return;
  }

  const zip = new JSZip();

  // Put story.html and img/ directly at the ZIP root.
  // The downloaded file is still named after the quiz, but opening it
  // no longer reveals a second folder with the same name.
  zip.file("story.html", html);

  // Bundle the img/ folder directly at the ZIP root
  const imgFolder = zip.folder("img");
  let imagesBundled = 0;

  await Promise.all(EXPORT_IMAGE_FILES.map(async (name) => {
    try {
      const res = await fetch(`img/${name}`);
      if (res.ok) {
        const blob = await res.blob();
        imgFolder.file(name, blob);
        imagesBundled++;
      }
    } catch (e) {
      // ignore — handled below
    }
  }));

  if (imagesBundled === 0) {
    // Could not fetch images (likely running from file://). Add a readme note.
    imgFolder.file("README.txt",
      "Images could not be bundled automatically.\n" +
      "Copy your 15 image files (image1-5, correct1-5, incorrect1-5) into this img/ folder."
    );
  }

  const blob = await zip.generateAsync({ type: "blob" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${folderName}.zip`;
  a.click();
  URL.revokeObjectURL(url);
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

// ── Standalone quiz HTML builder ───────────────────────────

function buildStandaloneQuizHtml(exportData, title) {
  // Plain text title for <title> tag (strip any HTML tags)
  const plainTitle = (title || "Quiz").replace(/<[^>]+>/g, "");
  const safeFilename = exportData.filename || plainTitle.replace(/[^a-zA-Z0-9_-]/g, "_");
  return `<!DOCTYPE html>
<html>
<head>
  <script type="module">import 'https://unpkg.com/mathlive';<\/script>
  <title>${plainTitle}</title>
  <meta name="quiz-title" content="${title}">
  <meta name="quiz-filename" content="${safeFilename}">
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    *, *::before, *::after { box-sizing: border-box; }

    html, body {
      margin: 0;
      width: 100%;
      height: 100%;
      overflow: hidden;
    }

    body {
      font-family: Arial, sans-serif;
      color: #052d43;
      background: white;
    }

    .slide {
      width: 720px;
      height: 540px;
      display: none;
      position: absolute;
      left: 50%;
      top: 50%;
      overflow: hidden;
      transform: translate(-50%, -50%) scale(var(--quiz-scale, 1));
      transform-origin: center center;
    }
    .slide.active { display: flex; }

    /* ── Title slide: landscape 720 × 540 ── */
    .title-slide.active {
      display: grid;
      grid-template-columns: 34% 66%;
      background: white;
    }
    .left-panel {
      background: #084371;
      position: relative;
      overflow: hidden;
    }
    .stripe {
      position: absolute;
      width: 360px;
      height: 24px;
      border-radius: 30px;
      transform: rotate(30deg);
      left: -90px;
    }
    .stripe.pink   { background: #ef5774; top: 55px; }
    .stripe.orange { background: #f57958; top: 95px; }
    .stripe.blue   { background: #25b8d4; top: 165px; }
    .coursebook {
      position: absolute;
      bottom: 24px;
      left: 28px;
      color: white;
      font-size: 22px;
      letter-spacing: -0.5px;
    }
    .title-content {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 24px 32px;
    }
    .quiz-icon {
      width: 76px;
      height: 76px;
      border-radius: 50%;
      background: linear-gradient(135deg, #f47a52, #df3f7d);
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 32px;
      margin-bottom: 42px;
      flex-shrink: 0;
    }
    h1 {
      width: 100%;
      max-width: 390px;
      font-size: 34px;
      line-height: 1.15;
      margin: 0 0 48px;
      text-align: center;
      color: #052d43;
      overflow-wrap: anywhere;
    }
    button {
      border: none;
      cursor: pointer;
      font-weight: bold;
      font-size: 20px;
      color: white;
      border-radius: 9px;
      padding: 12px 52px;
      background: #084371;
    }
    button:hover { opacity: 0.9; }

    /* ── Question slide: landscape 720 × 540 ── */
    .question-slide.active {
      display: grid;
      grid-template-columns: 62% 38%;
      background: white;
    }
    .question-left {
      height: 100%;
      padding: 12px 18px 16px;
      display: flex;
      flex-direction: column;
      min-width: 0;
    }
    .counter {
      color: #008f8d;
      font-size: 18px;
      margin-bottom: 8px;
      flex-shrink: 0;
    }
    .question-box {
      background: #eef2f6;
      border-radius: 12px;
      padding: 15px 18px;
      height: 112px;
      min-height: 112px;
      font-size: 18px;
      line-height: 1.22;
      margin-bottom: 10px;
      overflow: auto;
      overflow-wrap: anywhere;
    }
    #answersContainer {
      display: grid;
      grid-template-rows: repeat(4, 1fr);
      gap: 6px;
      min-height: 0;
      flex: 1;
    }
    .answer-card {
      min-height: 0;
      height: auto;
      border-radius: 12px;
      background: #d2eeee;
      color: #14989c;
      margin: 0;
      display: flex;
      align-items: center;
      padding: 6px 12px;
      font-size: 16px;
      line-height: 1.15;
      cursor: pointer;
      transition: background 0.15s, color 0.15s;
      border: 3px solid transparent;
      overflow: hidden;
      overflow-wrap: anywhere;
    }
    .answer-card > div:last-child {
      max-height: 2.35em;
      overflow: auto;
      flex: 1;
      min-width: 0;
    }
    .answer-card:hover,
    .answer-card.selected  { background: #fff0c9; color: #d39220; }
    .answer-card.disabled  { background: #edf2f6; color: #9eafbd; cursor: default; }
    .answer-card.correct   { background: #50bd98; color: white; }
    .answer-card.correct-border { background: #eefaf5; color: #50bd98; border-color: #50bd98; }
    .answer-card.incorrect { background: #df4375; color: white; }

    .radio-circle {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      background: white;
      border: 5px solid #aab5b8;
      margin-right: 12px;
      flex-shrink: 0;
    }
    .answer-card.selected .radio-circle { background: #f2c44d; }

    .submit-btn, .continue-btn {
      background: #0c9695;
      border-radius: 22px;
      display: none;
      margin: 10px auto 0;
      padding: 9px 34px;
      font-size: 16px;
    }
    .continue-btn {
      display: block;
      position: absolute;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      margin: 0;
    }

    .question-right { position: relative; min-width: 0; }
    .image-placeholder {
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #8aa7b5;
      font-size: 16px;
      overflow: hidden;
      background: #e9f1f5;
    }
    .question-image {
      width: 100%;
      height: 100%;
      object-fit: cover;
      background: #e9f1f5;
    }
    .feedback-panel {
      display: none;
      background: #c5e3ef;
      width: 100%;
      height: 100%;
      padding: 28px 24px 82px;
      position: relative;
      overflow: auto;
    }
    .feedback-panel.show { display: block; }
    .feedback-image {
      height: 170px;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 10px;
    }
    .feedback-img {
      max-height: 170px;
      max-width: 100%;
      object-fit: contain;
    }
    .feedback-badge {
      width: 205px;
      margin: 0 auto 18px;
      text-align: center;
      color: white;
      font-weight: bold;
      font-size: 20px;
      border-radius: 24px;
      padding: 9px 16px;
      letter-spacing: 1px;
    }
    .feedback-badge.correct   { background: #50bd98; }
    .feedback-badge.incorrect { background: #df4375; }
    .feedback-text {
      font-size: 17px;
      line-height: 1.25;
      color: #23475c;
      overflow-wrap: anywhere;
    }

    /* ── Results slide ── */
    .results-slide.active {
      display: flex;
      justify-content: center;
      align-items: center;
    }
    .results-card { width: 470px; text-align: center; }
    .results-top  { background: #0f9691; color: white; padding: 12px 26px 26px; }
    .results-top h2 {
      margin: 0 0 22px;
      font-size: 28px;
      letter-spacing: 8px;
      font-weight: normal;
    }
    .stars { display: flex; justify-content: center; gap: 8px; font-size: 62px; }
    .star  { position: relative; color: #dce8ed; display: inline-block; }
    .star.full { color: #f4c34b; }
    .star.half::before {
      content: "★";
      position: absolute;
      left: 0;
      width: 50%;
      overflow: hidden;
      color: #f4c34b;
    }
    .results-bottom { background: #cfeef7; padding: 24px; }
    .score-display  { font-size: 32px; color: #0f9691; margin-bottom: 25px; }
    .review-btn     { background: #0f9691; border-radius: 26px; font-size: 20px; padding: 10px 36px; }

    .review-arrow {
    position: fixed;
    top: 50%;
    transform: translateY(-50%);

    width: 74px;
    height: 150px;

    background: #0f9691;
    color: #fff;

    border: none;
    cursor: pointer;

    font-size: 58px;
    font-weight: bold;

    display: flex;
    align-items: center;
    justify-content: center;

    z-index: 9999;
}

.review-arrow.left {
    left: calc(50% - 360px + 37px);
    border-radius: 0 75px 75px 0;
}

.review-arrow.right {
    left: calc(50% + 360px - 37px);
    border-radius: 75px 0 0 75px;
}
  </style>
</head>
<body>

  <section id="titleSlide" class="slide title-slide active">
    <div class="left-panel">
      <div class="stripe pink"></div>
      <div class="stripe orange"></div>
      <div class="stripe blue"></div>
      <div class="coursebook">CourseBook</div>
    </div>
    <div class="title-content">
      <div class="quiz-icon">☑</div>
      <h1>${title}</h1>
      <button onclick="startQuiz()">Start</button>
    </div>
  </section>

  <section id="questionSlide" class="slide question-slide">
    <div class="question-left">
      <div class="counter" id="counter"></div>
      <div class="question-box" id="questionText"></div>
      <div id="answersContainer"></div>
      <button id="submitBtn" class="submit-btn" onclick="submitAnswer()">SUBMIT</button>
    </div>
    <div class="question-right">
      <div id="questionImage" class="image-placeholder">
        <img id="questionImageEl" class="question-image" src="" alt="Question image">
      </div>
      <div id="feedbackPanel" class="feedback-panel">
        <div class="feedback-image"><img id="feedbackImageEl" class="feedback-img" src="" alt="Feedback image"></div>
        <div id="feedbackBadge" class="feedback-badge"></div>
        <div id="feedbackText" class="feedback-text"></div>
        <button id="continueBtn" class="continue-btn" onclick="continueQuiz()">CONTINUE</button>
      </div>
    </div>
  </section>

  <section id="resultsSlide" class="slide results-slide">
    <div class="results-card">
      <div class="results-top">
        <h2>YOUR RESULTS</h2>
        <div class="stars" id="starsContainer"></div>
      </div>
      <div class="results-bottom">
        <div id="scoreDisplay" class="score-display"></div>
        <button class="review-btn" onclick="reviewQuiz()">REVIEW QUIZ</button>
      </div>
    </div>
  </section>

  <script>
    const originalQuizData = ${JSON.stringify(exportData.questions)};
    let activeQuiz = [], currentQuestionIndex = 0, selectedAnswerIndex = null;

    // Storyline-style responsive player scaling: preserve the 720 × 540
    // design canvas while filling as much of the browser as possible.
    function scaleQuizToViewport() {
      const scale = Math.min(window.innerWidth / 720, window.innerHeight / 540);
      document.documentElement.style.setProperty("--quiz-scale", String(scale));
    }
      

    window.addEventListener("resize", scaleQuizToViewport);
    window.addEventListener("orientationchange", scaleQuizToViewport);
    scaleQuizToViewport();
    let score = 0, submitted = false, reviewMode = false, userAnswers = [], completedFired = false;

    function shuffleArray(arr) { return [...arr].sort(() => Math.random() - 0.5); }

    // Available question images (sit in the img/ folder next to this file)
    const QUIZ_IMAGES = [
      "img/image1.svg",
      "img/image2.svg",
      "img/image3.svg",
      "img/image4.svg",
      "img/image5.svg"
    ];

    // Feedback images: 5 for correct, 5 for incorrect
    const CORRECT_IMAGES = [
      "img/correct1.svg",
      "img/correct2.svg",
      "img/correct3.svg",
      "img/correct4.svg",
      "img/correct5.svg"
    ];
    const INCORRECT_IMAGES = [
      "img/incorrect1.svg",
      "img/incorrect2.svg",
      "img/incorrect3.svg",
      "img/incorrect4.svg",
      "img/incorrect5.svg"
    ];

    // Shuffled queues + pointers, set up at quiz start
    let correctQueue = [], incorrectQueue = [];
    let correctPtr = 0, incorrectPtr = 0;

    // Pull the next feedback image, cycling through a shuffled queue.
    // Re-shuffles when exhausted, avoiding an immediate repeat at the seam.
    function nextFeedbackImage(isCorrect) {
      if (isCorrect) {
        if (correctPtr >= correctQueue.length) {
          const last = correctQueue[correctQueue.length - 1];
          do { correctQueue = shuffleArray(CORRECT_IMAGES); }
          while (correctQueue.length > 1 && correctQueue[0] === last);
          correctPtr = 0;
        }
        return correctQueue[correctPtr++];
      } else {
        if (incorrectPtr >= incorrectQueue.length) {
          const last = incorrectQueue[incorrectQueue.length - 1];
          do { incorrectQueue = shuffleArray(INCORRECT_IMAGES); }
          while (incorrectQueue.length > 1 && incorrectQueue[0] === last);
          incorrectPtr = 0;
        }
        return incorrectQueue[incorrectPtr++];
      }
    }

    /**
     * Assign one image per question.
     * - If questions <= images: each image used at most once (no repeats).
     * - If questions > images: images repeat as evenly as possible, but the
     *   same image never appears on two consecutive questions.
     */
    function assignImages(count) {
      const imgCount = QUIZ_IMAGES.length;

      // Simple case: enough unique images, just shuffle and slice
      if (count <= imgCount) {
        return shuffleArray(QUIZ_IMAGES).slice(0, count);
      }

      // Build a pool where each image appears the needed number of times
      const pool = [];
      let i = 0;
      while (pool.length < count) {
        pool.push(QUIZ_IMAGES[i % imgCount]);
        i++;
      }

      // Shuffle, then fix any adjacent duplicates by swapping forward
      let result = shuffleArray(pool);
      for (let attempt = 0; attempt < 50; attempt++) {
        let clean = true;
        for (let j = 1; j < result.length; j++) {
          if (result[j] === result[j - 1]) {
            // find a later item that differs from both neighbours, swap it in
            let swapped = false;
            for (let k = j + 1; k < result.length; k++) {
              if (result[k] !== result[j - 1] &&
                  (j + 1 >= result.length || result[k] !== result[j + 1])) {
                [result[j], result[k]] = [result[k], result[j]];
                swapped = true;
                break;
              }
            }
            if (!swapped) clean = false;
          }
        }
        if (clean) break;
        result = shuffleArray(pool); // reshuffle and retry if stuck
      }
      return result;
    }

    function startQuiz() {
      if (typeof started === "function") started();
      const imageOrder = assignImages(originalQuizData.length);
      activeQuiz = shuffleArray(originalQuizData).map((q, idx) => ({
        ...q,
        answers: shuffleArray(q.answers.map((a, i) => ({ text: a, isCorrect: i === q.correctIndex })))
      }));
      // Attach an image to each question after shuffling the question order
      activeQuiz.forEach((q, idx) => { q.image = imageOrder[idx]; });
      currentQuestionIndex = 0; selectedAnswerIndex = null;
      score = 0; submitted = false; reviewMode = false; userAnswers = []; completedFired = false;
      correctQueue = shuffleArray(CORRECT_IMAGES); correctPtr = 0;
      incorrectQueue = shuffleArray(INCORRECT_IMAGES); incorrectPtr = 0;
      removeReviewNavigation();
      showSlide("questionSlide");
      renderQuestion();
    }

    function showSlide(id) {
      document.querySelectorAll(".slide").forEach(s => s.classList.remove("active"));
      document.getElementById(id).classList.add("active");
    }

    function renderQuestion() {
      const q = activeQuiz[currentQuestionIndex];
      selectedAnswerIndex = null; submitted = false;
      document.getElementById("counter").textContent = \`\${currentQuestionIndex + 1}/\${activeQuiz.length}\`;
      document.getElementById("questionText").innerHTML = q.question;
      document.getElementById("submitBtn").style.display = "none";
      document.getElementById("feedbackPanel").classList.remove("show");
      document.getElementById("questionImage").style.display = "flex";
      document.getElementById("questionImageEl").src = q.image || "";

      const container = document.getElementById("answersContainer");
      container.innerHTML = "";
      q.answers.forEach((answer, i) => {
        const card = document.createElement("div");
        card.className = "answer-card";
        card.onclick = () => selectAnswer(i);
        card.innerHTML = \`<div class="radio-circle"></div><div>\${answer.text}</div>\`;
        container.appendChild(card);
      });
    }

    function selectAnswer(index) {
      if (submitted || reviewMode) return;
      selectedAnswerIndex = index;
      document.querySelectorAll(".answer-card").forEach((c, i) => c.classList.toggle("selected", i === index));
      document.getElementById("submitBtn").style.display = "block";
    }

    function submitAnswer() {
      if (selectedAnswerIndex === null) return;
      submitted = true;
      const q = activeQuiz[currentQuestionIndex];
      const answer = q.answers[selectedAnswerIndex];
      const isCorrect = answer.isCorrect;
      if (isCorrect) score++;
      const fbImage = nextFeedbackImage(isCorrect);
      userAnswers[currentQuestionIndex] = { selectedAnswerIndex, isCorrect, fbImage };
      document.getElementById("submitBtn").style.display = "none";
      document.getElementById("questionImage").style.display = "none";
      renderSubmittedState(q, selectedAnswerIndex, isCorrect, false, fbImage);
    }

    function renderSubmittedState(q, selectedIndex, isCorrect, isReview, fbImage) {
      document.querySelectorAll(".answer-card").forEach((card, i) => {
        const a = q.answers[i];
        card.onclick = null;
        card.classList.remove("selected");
        if (a.isCorrect && isCorrect)       card.classList.add("correct");
        else if (a.isCorrect && !isCorrect) card.classList.add("correct-border");
        else if (i === selectedIndex && !isCorrect) card.classList.add("incorrect");
        else card.classList.add("disabled");
      });

      const badge = document.getElementById("feedbackBadge");
      badge.textContent = isCorrect ? "CORRECT" : "INCORRECT";
      badge.className = "feedback-badge " + (isCorrect ? "correct" : "incorrect");
      document.getElementById("feedbackImageEl").src = fbImage || "";
      document.getElementById("feedbackText").innerHTML = q.feedback || "No feedback added.";
      document.getElementById("feedbackPanel").classList.add("show");
      document.getElementById("continueBtn").style.display = isReview ? "none" : "block";
    }

    function continueQuiz() {
      currentQuestionIndex++;
      if (currentQuestionIndex >= activeQuiz.length) showResults();
      else renderQuestion();
    }

    function showResults() {
      removeReviewNavigation();
      showSlide("resultsSlide");
      document.getElementById("scoreDisplay").textContent = \`\${score}/\${activeQuiz.length}\`;
      if (!completedFired) {
        completedFired = true;
        const percentage = Math.round((score / activeQuiz.length) * 100);
        if (typeof completed === "function") completed(percentage);
      }
      renderStars(score, activeQuiz.length);
    }

    function renderStars(score, total) {
      const container = document.getElementById("starsContainer");
      container.innerHTML = "";
      const starScore = total === 5 ? score : score / 2;
      for (let i = 1; i <= 5; i++) {
        const star = document.createElement("span");
        star.className = "star" + (starScore >= i ? " full" : starScore >= i - 0.5 ? " half" : "");
        star.textContent = "★";
        container.appendChild(star);
      }
    }

    function reviewQuiz() {
      reviewMode = true; currentQuestionIndex = 0;
      showSlide("questionSlide");
      renderReviewQuestion();
    }

    function renderReviewQuestion() {
      const q = activeQuiz[currentQuestionIndex];
      const saved = userAnswers[currentQuestionIndex];
      selectedAnswerIndex = saved ? saved.selectedAnswerIndex : null;
      document.getElementById("counter").textContent = \`\${currentQuestionIndex + 1}/\${activeQuiz.length}\`;
      document.getElementById("questionText").innerHTML = q.question;
      document.getElementById("submitBtn").style.display = "none";
      document.getElementById("questionImage").style.display = "none";

      const container = document.getElementById("answersContainer");
      container.innerHTML = "";
      q.answers.forEach((answer) => {
        const card = document.createElement("div");
        card.className = "answer-card";
        card.innerHTML = \`<div class="radio-circle"></div><div>\${answer.text}</div>\`;
        container.appendChild(card);
      });

      renderSubmittedState(q, saved ? saved.selectedAnswerIndex : null, saved ? saved.isCorrect : false, true, saved ? saved.fbImage : "");
      addReviewNavigation();
    }

    function addReviewNavigation() {
  removeReviewNavigation();

  const nav = document.createElement("div");
  nav.id = "reviewNav";

  nav.innerHTML = \`
  <button id="leftReviewArrow" class="review-arrow left" onclick="previousReviewQuestion()">‹</button>
  <button id="rightReviewArrow" class="review-arrow right" onclick="nextReviewQuestion()">›</button>
\`;

  document.body.appendChild(nav);

  positionReviewArrows();
}

function positionReviewArrows() {

  const left = document.getElementById("leftReviewArrow");
  const right = document.getElementById("rightReviewArrow");

  if (!left || !right) return;

  // Width of the scaled quiz stage
  const stageWidth = document.getElementById("questionSlide").getBoundingClientRect().width;

  // Left edge of the stage
  const stageLeft = (window.innerWidth - stageWidth) / 2;

  // Right edge
  const stageRight = stageLeft + stageWidth;

  // Position arrows 18px inside the stage
  left.style.left = (stageLeft + 18) + "px";
  right.style.left = (stageRight - right.offsetWidth - 18) + "px";
}



    function previousReviewQuestion() {
      if (currentQuestionIndex === 0) { showResults(); return; }
      currentQuestionIndex--; renderReviewQuestion();
    }

    function nextReviewQuestion() {
      if (currentQuestionIndex === activeQuiz.length - 1) { showResults(); return; }
      currentQuestionIndex++; renderReviewQuestion();
    }

    window.addEventListener("resize", positionReviewArrows);

function removeReviewNavigation() {
  const nav = document.getElementById("reviewNav");
  if (nav) nav.remove();
}
  <\/script>
</body>
</html>`;
}