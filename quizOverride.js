/* quizOverride.js
   Two button quiz flow:
   1) Pick option -> Select button enabled
   2) Click Select -> feedback shown and remains, Next enabled
   3) Click Next -> advance to next question
*/

(function () {
  if (!window.quizData || !Array.isArray(window.quizData)) return;

  let currentIndex = 0;
  let startedAtMs = null;
  let timerHandle = null;

  const selectedByIndex = {};
  const answeredByIndex = {};
  const correctByIndex = {};
  const flaggedByIndex = {};

  function $(id) {
    return document.getElementById(id);
  }

  function formatElapsed(ms) {
    const totalSec = Math.max(0, Math.floor(ms / 1000));
    const m = String(Math.floor(totalSec / 60)).padStart(2, "0");
    const s = String(totalSec % 60).padStart(2, "0");
    return `${m}:${s}`;
  }

  function updateTimer() {
    if (startedAtMs === null) return;
    const el = $("quiz-timer");
    if (!el) return;
    el.textContent = formatElapsed(Date.now() - startedAtMs);
  }

  function startTimerOnce() {
    if (timerHandle) return;
    startedAtMs = Date.now();
    updateTimer();
    timerHandle = window.setInterval(updateTimer, 500);
  }

  function stopTimer() {
    if (timerHandle) {
      window.clearInterval(timerHandle);
      timerHandle = null;
    }
  }

  function getAnsweredCount() {
    return Object.keys(answeredByIndex).length;
  }

  function getCorrectCount() {
    return Object.values(correctByIndex).filter(Boolean).length;
  }

  function renderStats() {
    const el = $("quiz-stats");
    if (!el) return;

    const answered = getAnsweredCount();
    const correct = getCorrectCount();
    const pct = answered === 0 ? 0 : Math.round((correct / answered) * 100);

    el.textContent = `Score: ${pct}%`;
  }

  function renderNavigation() {
    const nav = $("quiz-navigation");
    if (!nav) return;

    nav.innerHTML = "";

    window.quizData.forEach((q, idx) => {
      const btn = document.createElement("button");
      btn.className = "nav-question";
      btn.type = "button";
      btn.textContent = String(q.number ?? (idx + 1));

      if (idx === currentIndex) btn.classList.add("nav-current");
      if (flaggedByIndex[idx]) btn.classList.add("nav-flagged");
      if (answeredByIndex[idx]) {
        btn.classList.add(correctByIndex[idx] ? "nav-correct" : "nav-incorrect");
      }

      btn.addEventListener("click", () => {
        currentIndex = idx;
        renderQuestion();
      });

      nav.appendChild(btn);
    });
  }

  function setButtonStates() {
    const selectBtn = $("select-btn");
    const nextBtn = $("next-btn");

    const alreadyAnswered = !!answeredByIndex[currentIndex];
    const hasSelection = !!selectedByIndex[currentIndex];

    if (selectBtn) {
      // Select is available only if not answered yet and user has selected something
      selectBtn.disabled = alreadyAnswered || !hasSelection;
      selectBtn.textContent = "Select";
    }

    if (nextBtn) {
      // Next is available only after the question has been answered (Select clicked)
      nextBtn.disabled = !alreadyAnswered;
      nextBtn.textContent = (currentIndex < window.quizData.length - 1) ? "Next" : "Finish";
    }
  }

  function lockOptions() {
    const optionInputs = document.querySelectorAll('input[name="quiz-answer"]');
    optionInputs.forEach((i) => (i.disabled = true));
  }

  function renderQuestion() {
    startTimerOnce();

    const q = window.quizData[currentIndex];
    const qEl = $("quiz-question");
    const oEl = $("quiz-options");
    const feedbackEl = $("quiz-score");
    const flagBtn = $("flag-btn");

    if (qEl) qEl.textContent = `${q.number}. ${q.question}`;

    // Rebuild options every time
    if (oEl) oEl.innerHTML = "";

    const alreadyAnswered = !!answeredByIndex[currentIndex];
    const previouslySelected = selectedByIndex[currentIndex] || null;

    // Important: only clear feedback when moving to a different question render
    if (feedbackEl) feedbackEl.textContent = "";

    // Update flag button label
    if (flagBtn) {
      flagBtn.textContent = flaggedByIndex[currentIndex] ? "Unflag" : "Flag for Review";
    }

    const optionEntries = Object.entries(q.options || {});
    optionEntries.forEach(([letter, text]) => {
      const id = `q_${currentIndex}_${letter}`;

      const label = document.createElement("label");
      label.className = "quiz-option";
      label.setAttribute("for", id);

      const input = document.createElement("input");
      input.type = "radio";
      input.name = "quiz-answer";
      input.id = id;
      input.value = letter;
      input.checked = previouslySelected === letter;
      input.disabled = alreadyAnswered;

      const span = document.createElement("span");
      span.textContent = `${letter}. ${text}`;

input.addEventListener("change", () => {
  if (answeredByIndex[currentIndex]) return;

  selectedByIndex[currentIndex] = letter;

  const selectBtn = document.getElementById("select-btn");
  if (selectBtn) selectBtn.disabled = false;

  // Keep Next disabled until Select is clicked
  const nextBtn = document.getElementById("next-btn");
  if (nextBtn) nextBtn.disabled = true;
});

       label.appendChild(input);
      label.appendChild(span);

      if (oEl) oEl.appendChild(label);
    });

    // If already answered, show feedback immediately and lock options
    if (alreadyAnswered) {
      lockOptions();

      const isCorrect = !!correctByIndex[currentIndex];
      const explanation = q.explanation ? ` ${q.explanation}` : "";
      if (feedbackEl) {
        feedbackEl.textContent = isCorrect
          ? `Correct.${explanation}`
          : `Incorrect. Correct answer: ${q.answer}.${explanation}`;
      }
    }

    renderStats();
    renderNavigation();
    setButtonStates();
  }

  // NEW: separate Select button handler
  window.selectAnswer = function () {
    const q = window.quizData[currentIndex];
    const feedbackEl = $("quiz-score");

    if (answeredByIndex[currentIndex]) return;

    const selected = selectedByIndex[currentIndex];
    if (!selected) {
      if (feedbackEl) feedbackEl.textContent = "Please select an answer.";
      return;
    }

    answeredByIndex[currentIndex] = true;
    const isCorrect = selected === q.answer;
    correctByIndex[currentIndex] = isCorrect;

    const explanation = q.explanation ? ` ${q.explanation}` : "";
    if (feedbackEl) {
      feedbackEl.textContent = isCorrect
        ? `Correct.${explanation}`
        : `Incorrect. Correct answer: ${q.answer}.${explanation}`;
    }

    lockOptions();
    renderStats();
    renderNavigation();
    setButtonStates();
  };

  // Next is now only navigation
  window.nextQuestion = function () {
    const feedbackEl = $("quiz-score");
    const nextBtn = $("next-btn");

    if (!answeredByIndex[currentIndex]) {
      if (feedbackEl) feedbackEl.textContent = "Please click Select before moving to the next question.";
      return;
    }

    if (currentIndex < window.quizData.length - 1) {
      currentIndex += 1;
      renderQuestion();
      return;
    }

    // Finish
    stopTimer();
    const correct = getCorrectCount();
    const total = window.quizData.length;
    const pct = total === 0 ? 0 : Math.round((correct / total) * 100);

    if (feedbackEl) {
      feedbackEl.textContent = `Finished. Score: ${pct}% (${correct}/${total}).`;
    }
    if (nextBtn) {
      nextBtn.disabled = true;
      nextBtn.textContent = "Finished";
    }
  };

  window.flagQuestion = function () {
    flaggedByIndex[currentIndex] = !flaggedByIndex[currentIndex];
    renderNavigation();

    const flagBtn = $("flag-btn");
    if (flagBtn) {
      flagBtn.textContent = flaggedByIndex[currentIndex] ? "Unflag" : "Flag for Review";
    }
  };

  window.restartQuiz = function () {
    currentIndex = 0;
    Object.keys(selectedByIndex).forEach((k) => delete selectedByIndex[k]);
    Object.keys(answeredByIndex).forEach((k) => delete answeredByIndex[k]);
    Object.keys(correctByIndex).forEach((k) => delete correctByIndex[k]);
    Object.keys(flaggedByIndex).forEach((k) => delete flaggedByIndex[k]);

    stopTimer();
    startedAtMs = null;

    renderStats();
    renderQuestion();
  };

  window.loadQuiz = function () {
    renderStats();
    renderQuestion();
  };
})();
