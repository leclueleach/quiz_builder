let quizData = [];
let activeQuiz = [];

function createRichEditor(id, isFeedback = false) {
  return `
    <div class="editor-wrapper" data-editor-id="${id}">
      <div class="editor-toolbar">
        <button type="button" onclick="formatEditorText('${id}', 'bold')"><b>B</b></button>
        <button type="button" onclick="formatEditorText('${id}', 'italic')"><i>I</i></button>
        <button type="button" onclick="formatEditorText('${id}', 'underline')"><u>U</u></button>
        <button type="button" onclick="formatEditorText('${id}', 'superscript')">X²</button>
        <button type="button" onclick="formatEditorText('${id}', 'subscript')">X₂</button>
        <button type="button" onclick="insertMath('${id}')">∑</button>
        <button type="button" onclick="formatEditorText('${id}', 'insertUnorderedList')">• List</button>
        <button type="button" onclick="formatEditorText('${id}', 'insertOrderedList')">1. List</button>
        <button type="button" onclick="toggleHtmlMode('${id}')">HTML</button>

<select class="symbol-select" onchange="insertSymbol('${id}', this.value, this)">
  <option value="">Symbols</option>

  <optgroup label="Powers">
    <option value="²">²</option>
    <option value="³">³</option>
  </optgroup>

  <optgroup label="Subscripts">
    <option value="₀">₀</option>
    <option value="₁">₁</option>
    <option value="₂">₂</option>
    <option value="₃">₃</option>
  </optgroup>

  <optgroup label="Maths">
    <option value="±">±</option>
    <option value="×">×</option>
    <option value="÷">÷</option>
    <option value="≤">≤</option>
    <option value="≥">≥</option>
    <option value="√">√</option>
    <option value="π">π</option>
  </optgroup>
</select>
      </div>

      <div id="${id}" class="html-editor ${isFeedback ? "feedback-editor" : ""}" contenteditable="true"></div>
      <textarea id="${id}_html" class="html-code-editor" style="display:none;"></textarea>
    </div>

    
  `;
}

function insertMath(editorId) {
  const latex = prompt(
    "Enter a LaTeX equation:\n\nExamples:\n\nx^2+y^2=z^2\n\\frac{1}{2}\n\\sqrt{x}"
  );

  if (!latex) return;

  const editor = document.getElementById(editorId);

  editor.innerHTML += `
    <math-field readonly>
      ${latex}
    </math-field>
  `;
}

function formatEditorText(id, command) {
  syncHtmlModeToEditor(id);

  const editor = document.getElementById(id);
  editor.focus();

  document.execCommand(command, false, null);
}

function toggleHtmlMode(id) {
  const visualEditor = document.getElementById(id);
  const htmlEditor = document.getElementById(`${id}_html`);

  if (htmlEditor.style.display === "none") {
    htmlEditor.value = visualEditor.innerHTML;
    visualEditor.style.display = "none";
    htmlEditor.style.display = "block";
  } else {
    visualEditor.innerHTML = htmlEditor.value;
    htmlEditor.style.display = "none";
    visualEditor.style.display = "block";
  }
}

function syncHtmlModeToEditor(id) {
  const visualEditor = document.getElementById(id);
  const htmlEditor = document.getElementById(`${id}_html`);

  if (htmlEditor && htmlEditor.style.display !== "none") {
    visualEditor.innerHTML = htmlEditor.value;
    htmlEditor.style.display = "none";
    visualEditor.style.display = "block";
  }
}

function getHtml(id) {
  syncHtmlModeToEditor(id);
  return document.getElementById(id).innerHTML;
}

function setHtml(id, value) {
  const visualEditor = document.getElementById(id);
  const htmlEditor = document.getElementById(`${id}_html`);

  visualEditor.innerHTML = value || "";

  if (htmlEditor) {
    htmlEditor.value = value || "";
  }
}

function getText(id) {
  syncHtmlModeToEditor(id);
  return document.getElementById(id).textContent.trim();
}



function generateQuestionFields() {
  const count = Number(document.getElementById("questionCount").value);
  const container = document.getElementById("questionsContainer");

  container.innerHTML = "";

  for (let i = 1; i <= count; i++) {
    container.innerHTML += `
      <div class="question-block">
        <h3>Question ${i}</h3>

        <label>Question text</label>
        ${createRichEditor(`question_${i}`)}

        <label>Answer 1</label>
        ${createRichEditor(`q${i}_answer_1`)}

        <label>Answer 2</label>
        ${createRichEditor(`q${i}_answer_2`)}

        <label>Answer 3</label>
        ${createRichEditor(`q${i}_answer_3`)}

        <label>Answer 4</label>
        ${createRichEditor(`q${i}_answer_4`)}

        <label>Correct answer</label>
        <select id="q${i}_correct">
          <option value="0">Answer 1</option>
          <option value="1">Answer 2</option>
          <option value="2">Answer 3</option>
          <option value="3">Answer 4</option>
        </select>

        <label>Feedback</label>
        ${createRichEditor(`q${i}_feedback`, true)}
      </div>
    `;
  }
}

function validateQuizForm() {
  const title = document.getElementById("quizTitle").value.trim();
  const count = Number(document.getElementById("questionCount").value);

  if (!title) {
    alert("Please enter a quiz title.");
    return false;
  }

  for (let i = 1; i <= count; i++) {
    if (!getText(`question_${i}`)) {
      alert(`Please enter text for Question ${i}.`);
      return false;
    }

    for (let a = 1; a <= 4; a++) {
      if (!getText(`q${i}_answer_${a}`)) {
        alert(`Please enter Answer ${a} for Question ${i}.`);
        return false;
      }
    }
  }

  return true;
}

function buildQuizExportData() {
  const title = document.getElementById("quizTitle").value.trim();
  const count = Number(document.getElementById("questionCount").value);

  const exportData = {
    title,
    questions: []
  };

  for (let i = 1; i <= count; i++) {
    const answers = [
      getHtml(`q${i}_answer_1`),
      getHtml(`q${i}_answer_2`),
      getHtml(`q${i}_answer_3`),
      getHtml(`q${i}_answer_4`)
    ];

    exportData.questions.push({
      question: getHtml(`question_${i}`),
      answers,
      correctIndex: Number(document.getElementById(`q${i}_correct`).value),
      feedback: getHtml(`q${i}_feedback`)
    });
  }

  return exportData;
}

function previewQuiz() {
  if (!validateQuizForm()) return;

  const exportData = buildQuizExportData();
  const title = exportData.title;

  const standaloneHtml = buildStandaloneQuizHtml(exportData, title);

  const previewWindow = window.open("", "_blank");
  previewWindow.document.open();
  previewWindow.document.write(standaloneHtml);
  previewWindow.document.close();
}

function renderQuiz(title) {
  document.getElementById("builder").style.display = "none";
  document.getElementById("quizPreview").style.display = "block";
  document.getElementById("results").style.display = "none";

  document.getElementById("previewTitle").innerHTML = title;

  const quizContainer = document.getElementById("quizContainer");
  quizContainer.innerHTML = "";

  activeQuiz.forEach((item, questionIndex) => {
    let answersHtml = "";

    item.answers.forEach((answer, answerIndex) => {
      answersHtml += `
        <label>
          <input 
            type="radio" 
            name="question_${questionIndex}" 
            value="${answerIndex}">
          ${answer.text}
        </label>
      `;
    });

    quizContainer.innerHTML += `
      <div class="quiz-question">
        <h3>${questionIndex + 1}. ${item.question}</h3>
        ${answersHtml}
      </div>
    `;
  });
}

function submitQuiz() {
  let score = 0;
  let feedbackHtml = "";

  activeQuiz.forEach((question, questionIndex) => {
    const selected = document.querySelector(
      `input[name="question_${questionIndex}"]:checked`
    );

    if (!selected) {
      feedbackHtml += `
        <div>
          <h3>Question ${questionIndex + 1}</h3>
          <p>No answer selected.</p>
          <p>${question.feedback || "No feedback added."}</p>
        </div>
      `;
      return;
    }

    const selectedAnswer = question.answers[Number(selected.value)];

    if (selectedAnswer.isCorrect) {
      score++;
    }

    feedbackHtml += `
      <div>
        <h3>Question ${questionIndex + 1}</h3>
        <p>${selectedAnswer.isCorrect ? "Correct" : "Incorrect"}</p>
        <p>${question.feedback || "No feedback added."}</p>
      </div>
    `;
  });

  document.getElementById("quizPreview").style.display = "none";
  document.getElementById("results").style.display = "block";

  document.getElementById("scoreText").innerHTML =
    `You scored ${score} out of ${activeQuiz.length}.<hr>${feedbackHtml}`;
}

function restartBuilder() {
  document.getElementById("builder").style.display = "block";
  document.getElementById("quizPreview").style.display = "none";
  document.getElementById("results").style.display = "none";
}

function exportQuizJson() {
  if (!validateQuizForm()) return;

  const exportData = buildQuizExportData();
  const jsonString = JSON.stringify(exportData, null, 2);
  const blob = new Blob([jsonString], { type: "application/json" });

  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `${exportData.title || "quiz"}.json`;
  link.click();

  URL.revokeObjectURL(link.href);
}

function importQuizJson() {
  const fileInput = document.getElementById("importJsonFile");
  const file = fileInput.files[0];

  if (!file) {
    alert("Please select a JSON file first.");
    return;
  }

  const reader = new FileReader();

  reader.onload = function(event) {
    const importedData = JSON.parse(event.target.result);

    document.getElementById("quizTitle").value = importedData.title;
    document.getElementById("questionCount").value = importedData.questions.length;

    generateQuestionFields();

    importedData.questions.forEach((item, index) => {
      const questionNumber = index + 1;

      setHtml(`question_${questionNumber}`, item.question);

      item.answers.forEach((answer, answerIndex) => {
        setHtml(`q${questionNumber}_answer_${answerIndex + 1}`, answer);
      });

      document.getElementById(`q${questionNumber}_correct`).value = item.correctIndex;
      setHtml(`q${questionNumber}_feedback`, item.feedback || "");
    });
  };

  reader.readAsText(file);
}

function importStandaloneHtml() {
  const fileInput = document.getElementById("importHtmlFile");
  const file = fileInput.files[0];

  if (!file) {
    alert("Please select an HTML file first.");
    return;
  }

  const reader = new FileReader();

  reader.onload = function(event) {
    const htmlText = event.target.result;

    const titleMatch = htmlText.match(/<title>(.*?)<\/title>/);
    const dataMatch = htmlText.match(/const originalQuizData = (\[[\s\S]*?\]);/);

    if (!dataMatch) {
      alert("Could not find quiz data in this HTML file.");
      return;
    }

    const title = titleMatch ? titleMatch[1] : "Imported Quiz";
    const importedQuestions = JSON.parse(dataMatch[1]);

    document.getElementById("quizTitle").value = title;
    document.getElementById("questionCount").value = importedQuestions.length;

    generateQuestionFields();

    importedQuestions.forEach((item, index) => {
      const questionNumber = index + 1;

      setHtml(`question_${questionNumber}`, item.question);

      item.answers.forEach((answer, answerIndex) => {
        setHtml(
          `q${questionNumber}_answer_${answerIndex + 1}`,
          typeof answer === "string" ? answer : answer.text
        );
      });

      const correctIndex = item.answers.findIndex(answer => {
        return typeof answer === "object" && answer.isCorrect === true;
      });

      document.getElementById(`q${questionNumber}_correct`).value =
        correctIndex >= 0 ? correctIndex : item.correctIndex;

      setHtml(`q${questionNumber}_feedback`, item.feedback || "");
    });

    alert("Standalone HTML imported successfully.");
  };

  reader.readAsText(file);
}

function buildStandaloneQuizHtml(exportData, title) {
  const standaloneHtml = `
<!DOCTYPE html>
<html>
<head>
  <script type="module">
  import 'https://unpkg.com/mathlive';
</script>  
  <title>${title}</title>
  <meta charset="UTF-8">

  <style>
    * {
      box-sizing: border-box;
    }

    body {
      margin: 0;
      font-family: Arial, sans-serif;
      color: #052d43;
      background: white;
    }

    .slide {
      width: 100vw;
      height: 100vh;
      display: none;
      position: relative;
      overflow: hidden;
    }

    .slide.active {
      display: flex;
    }

    .title-slide.active {
      display: grid;
      grid-template-columns: 34% 66%;
    }

    .left-panel {
      background: #084371;
      position: relative;
      overflow: hidden;
    }

    .stripe {
      position: absolute;
      width: 520px;
      height: 34px;
      border-radius: 30px;
      transform: rotate(30deg);
      left: -120px;
    }

    .stripe.pink {
      background: #ef5774;
      top: 80px;
    }

    .stripe.orange {
      background: #f57958;
      top: 135px;
    }

    .stripe.blue {
      background: #25b8d4;
      top: 230px;
    }

    .coursebook {
      position: absolute;
      bottom: 55px;
      left: 65px;
      color: white;
      font-size: 34px;
      letter-spacing: -1px;
    }

    .title-content {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding-bottom: 40px;
    }

    .quiz-icon {
      width: 115px;
      height: 115px;
      border-radius: 50%;
      background: linear-gradient(135deg, #f47a52, #df3f7d);
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 46px;
      margin-bottom: 145px;
    }

    h1 {
      font-size: 56px;
      margin: 0 0 150px;
      text-align: center;
      color: #052d43;
    }

    button {
      border: none;
      cursor: pointer;
      font-weight: bold;
      font-size: 26px;
      color: white;
      border-radius: 9px;
      padding: 14px 70px;
      background: #084371;
    }

    button:hover {
      opacity: 0.9;
    }

    .question-slide.active {
      display: grid;
      grid-template-columns: 64% 36%;
    }

    .question-left {
      padding-left: 33%;
      padding-top: 14px;
      padding-right: 25px;
    }

    .counter {
      color: #008f8d;
      font-size: 26px;
      margin-bottom: 15px;
    }

    .question-box {
      background: #eef2f6;
      border-radius: 15px;
      padding: 48px 32px;
      min-height: 225px;
      font-size: 25px;
      line-height: 1.25;
      margin-bottom: 24px;
    }

    .answer-card {
      height: 115px;
      border-radius: 15px;
      background: #d2eeee;
      color: #14989c;
      margin-bottom: 7px;
      display: flex;
      align-items: center;
      padding: 0 22px;
      font-size: 24px;
      cursor: pointer;
      transition: 0.15s ease;
      border: 3px solid transparent;
    }

    .answer-card:hover,
    .answer-card.selected {
      background: #fff0c9;
      color: #d39220;
    }

    .answer-card.disabled {
      background: #edf2f6;
      color: #9eafbd;
      cursor: default;
    }

    .answer-card.correct {
      background: #50bd98;
      color: white;
    }

    .answer-card.correct-border {
      background: #eefaf5;
      color: #50bd98;
      border-color: #50bd98;
    }

    .answer-card.incorrect {
      background: #df4375;
      color: white;
    }

    .radio-circle {
      width: 45px;
      height: 45px;
      border-radius: 50%;
      background: white;
      border: 7px solid #aab5b8;
      margin-right: 38px;
      flex-shrink: 0;
    }

    .answer-card.selected .radio-circle {
      background: #f2c44d;
    }

    .submit-btn,
    .continue-btn {
      background: #0c9695;
      border-radius: 28px;
      display: none;
      margin: 25px auto 0;
      padding: 12px 46px;
    }

    .continue-btn {
      display: block;
      position: absolute;
      bottom: 32px;
      left: 50%;
      transform: translateX(-50%);
    }

    .question-right {
      position: relative;
    }

    .image-placeholder {
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #8aa7b5;
      font-size: 24px;
    }

    .placeholder-person {
      width: 300px;
      height: 520px;
      background: #e9f1f5;
      border-radius: 150px 150px 20px 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      text-align: center;
      padding: 30px;
    }

    .feedback-panel {
      display: none;
      background: #c5e3ef;
      width: 100%;
      height: 100%;
      padding: 45px 45px 110px;
      position: relative;
    }

    .feedback-panel.show {
      display: block;
    }

    .feedback-image {
      height: 260px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #6b8795;
      font-size: 22px;
      text-align: center;
    }

    .feedback-badge {
      width: 250px;
      margin: -10px auto 30px;
      text-align: center;
      color: white;
      font-weight: bold;
      font-size: 28px;
      border-radius: 28px;
      padding: 12px 20px;
      letter-spacing: 1px;
    }

    .feedback-badge.correct {
      background: #50bd98;
    }

    .feedback-badge.incorrect {
      background: #df4375;
    }

    .feedback-text {
      font-size: 24px;
      line-height: 1.15;
      color: #23475c;
    }

    .results-slide.active {
      display: flex;
      justify-content: center;
      align-items: center;
    }

    .results-card {
      width: 560px;
      text-align: center;
    }

    .results-top {
      background: #0f9691;
      color: white;
      padding: 14px 30px 38px;
    }

    .results-top h2 {
      margin: 0 0 22px;
      font-size: 33px;
      letter-spacing: 8px;
      font-weight: normal;
    }

    .stars {
      display: flex;
      justify-content: center;
      gap: 8px;
      font-size: 78px;
    }

    .star {
      position: relative;
      color: #dce8ed;
      display: inline-block;
    }

    .star.full {
      color: #f4c34b;
    }

    .star.half::before {
      content: "★";
      position: absolute;
      left: 0;
      width: 50%;
      overflow: hidden;
      color: #f4c34b;
    }

    .results-bottom {
      background: #cfeef7;
      padding: 30px;
    }

    .score-display {
      font-size: 38px;
      color: #0f9691;
      margin-bottom: 25px;
    }

    .review-btn {
      background: #0f9691;
      border-radius: 26px;
      font-size: 24px;
      padding: 12px 42px;
    }

    .review-arrow {
      position: fixed;
      top: 52%;
      transform: translateY(-50%);
      width: 80px;
      height: 190px;
      border-radius: 0 100px 100px 0;
      background: #0f9691;
      color: white;
      font-size: 70px;
      padding: 0;
      z-index: 50;
    }

    .review-arrow.left {
      left: 0;
    }

    .review-arrow.right {
      right: 0;
      border-radius: 100px 0 0 100px;
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
        <div class="placeholder-person">Image placeholder</div>
      </div>

      <div id="feedbackPanel" class="feedback-panel">
        <div class="feedback-image">Feedback image placeholder</div>
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
    let activeQuiz = [];
    let currentQuestionIndex = 0;
    let selectedAnswerIndex = null;
    let score = 0;
    let submitted = false;
    let reviewMode = false;
    let userAnswers = [];

    function shuffleArray(array) {
      return [...array].sort(() => Math.random() - 0.5);
    }

    function startQuiz() {
      activeQuiz = shuffleArray(originalQuizData).map(question => ({
        ...question,
        answers: shuffleArray(
          question.answers.map((answer, index) => ({
            text: answer,
            isCorrect: index === question.correctIndex
          }))
        )
      }));

      currentQuestionIndex = 0;
      selectedAnswerIndex = null;
      score = 0;
      submitted = false;
      reviewMode = false;
      userAnswers = [];

      removeReviewNavigation();
      showSlide("questionSlide");
      renderQuestion();
    }

    function showSlide(slideId) {
      document.querySelectorAll(".slide").forEach(slide => {
        slide.classList.remove("active");
      });

      document.getElementById(slideId).classList.add("active");
    }

    function renderQuestion() {
      const question = activeQuiz[currentQuestionIndex];

      selectedAnswerIndex = null;
      submitted = false;

      document.getElementById("counter").textContent =
        \`\${currentQuestionIndex + 1}/\${activeQuiz.length}\`;

      document.getElementById("questionText").innerHTML = question.question;
      document.getElementById("submitBtn").style.display = "none";
      document.getElementById("feedbackPanel").classList.remove("show");
      document.getElementById("questionImage").style.display = "flex";

      const answersContainer = document.getElementById("answersContainer");
      answersContainer.innerHTML = "";

      question.answers.forEach((answer, index) => {
        const card = document.createElement("div");
        card.className = "answer-card";
        card.onclick = () => selectAnswer(index);

        card.innerHTML = \`
          <div class="radio-circle"></div>
          <div>\${answer.text}</div>
        \`;

        answersContainer.appendChild(card);
      });
    }

    function selectAnswer(index) {
      if (submitted || reviewMode) return;

      selectedAnswerIndex = index;

      document.querySelectorAll(".answer-card").forEach((card, cardIndex) => {
        card.classList.toggle("selected", cardIndex === index);
      });

      document.getElementById("submitBtn").style.display = "block";
    }

    function submitAnswer() {
      if (selectedAnswerIndex === null) return;

      submitted = true;

      const question = activeQuiz[currentQuestionIndex];
      const selectedAnswer = question.answers[selectedAnswerIndex];
      const isCorrect = selectedAnswer.isCorrect;

      if (isCorrect) score++;

      userAnswers[currentQuestionIndex] = {
        selectedAnswerIndex: selectedAnswerIndex,
        isCorrect: isCorrect
      };

      document.getElementById("submitBtn").style.display = "none";
      document.getElementById("questionImage").style.display = "none";

      renderSubmittedState(question, selectedAnswerIndex, isCorrect, false);
    }

    function renderSubmittedState(question, selectedIndex, isCorrect, isReview) {
      const cards = document.querySelectorAll(".answer-card");

      cards.forEach((card, index) => {
        const answer = question.answers[index];

        card.onclick = null;
        card.classList.remove("selected");

        if (answer.isCorrect && isCorrect) {
          card.classList.add("correct");
        } else if (answer.isCorrect && !isCorrect) {
          card.classList.add("correct-border");
        } else if (index === selectedIndex && !isCorrect) {
          card.classList.add("incorrect");
        } else {
          card.classList.add("disabled");
        }
      });

      const badge = document.getElementById("feedbackBadge");
      badge.textContent = isCorrect ? "CORRECT" : "INCORRECT";
      badge.className = isCorrect
        ? "feedback-badge correct"
        : "feedback-badge incorrect";

      document.getElementById("feedbackText").innerHTML =
        question.feedback || "No feedback added.";

      document.getElementById("feedbackPanel").classList.add("show");

      const continueBtn = document.getElementById("continueBtn");
      continueBtn.style.display = isReview ? "none" : "block";
    }

    function continueQuiz() {
      currentQuestionIndex++;

      if (currentQuestionIndex >= activeQuiz.length) {
        showResults();
      } else {
        renderQuestion();
      }
    }

    function showResults() {
      removeReviewNavigation();
      showSlide("resultsSlide");

      document.getElementById("scoreDisplay").textContent =
        \`\${score}/\${activeQuiz.length}\`;

      renderStars(score, activeQuiz.length);
    }

    function renderStars(score, total) {
      const container = document.getElementById("starsContainer");
      container.innerHTML = "";

      let starScore;

      if (total === 5) {
        starScore = score;
      } else {
        starScore = score / 2;
      }

      for (let i = 1; i <= 5; i++) {
        const star = document.createElement("span");
        star.className = "star";
        star.textContent = "★";

        if (starScore >= i) {
          star.classList.add("full");
        } else if (starScore >= i - 0.5) {
          star.classList.add("half");
        }

        container.appendChild(star);
      }
    }

    function reviewQuiz() {
      reviewMode = true;
      currentQuestionIndex = 0;
      showSlide("questionSlide");
      renderReviewQuestion();
    }

    function renderReviewQuestion() {
      const question = activeQuiz[currentQuestionIndex];
      const savedAnswer = userAnswers[currentQuestionIndex];

      selectedAnswerIndex = savedAnswer ? savedAnswer.selectedAnswerIndex : null;

      document.getElementById("counter").textContent =
        \`\${currentQuestionIndex + 1}/\${activeQuiz.length}\`;

      document.getElementById("questionText").innerHTML = question.question;
      document.getElementById("submitBtn").style.display = "none";
      document.getElementById("questionImage").style.display = "none";

      const answersContainer = document.getElementById("answersContainer");
      answersContainer.innerHTML = "";

      question.answers.forEach((answer, index) => {
        const card = document.createElement("div");
        card.className = "answer-card";

        card.innerHTML = \`
          <div class="radio-circle"></div>
          <div>\${answer.text}</div>
        \`;

        answersContainer.appendChild(card);
      });

      const wasCorrect = savedAnswer ? savedAnswer.isCorrect : false;
      const selectedIndex = savedAnswer ? savedAnswer.selectedAnswerIndex : null;

      renderSubmittedState(question, selectedIndex, wasCorrect, true);
      addReviewNavigation();
    }

    function addReviewNavigation() {
      removeReviewNavigation();

      const nav = document.createElement("div");
      nav.id = "reviewNav";
      nav.innerHTML = \`
        <button class="review-arrow left" onclick="previousReviewQuestion()">‹</button>
        <button class="review-arrow right" onclick="nextReviewQuestion()">›</button>
      \`;

      document.body.appendChild(nav);
    }

    function previousReviewQuestion() {
      if (currentQuestionIndex === 0) {
        showResults();
        return;
      }

      currentQuestionIndex--;
      renderReviewQuestion();
    }

    function nextReviewQuestion() {
      if (currentQuestionIndex === activeQuiz.length - 1) {
        showResults();
        return;
      }

      currentQuestionIndex++;
      renderReviewQuestion();
    }

    function removeReviewNavigation() {
      const nav = document.getElementById("reviewNav");
      if (nav) nav.remove();
    }
  <\/script>
</body>
</html>
`;

    return standaloneHtml;
}

function exportStandaloneQuiz() {
  if (!validateQuizForm()) return;

  const exportData = buildQuizExportData();
  const title = exportData.title;

  const standaloneHtml = buildStandaloneQuizHtml(exportData, title);

  const blob = new Blob([standaloneHtml], { type: "text/html" });

  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `${title || "quiz"}.html`;
  link.click();

  URL.revokeObjectURL(link.href);
}

function shuffleArray(array) {
  return [...array].sort(() => Math.random() - 0.5);
}

function insertSymbol(editorId, symbol) {
  if (!symbol) return;

  syncHtmlModeToEditor(editorId);

  const editor = document.getElementById(editorId);

  editor.focus();

  document.execCommand("insertText", false, symbol);
}