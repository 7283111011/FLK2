/* quizOverride.js
   Overrides quiz functions for quiz.html:
   - Select an answer, then Next to confirm
   - No timed auto-advance
   - Score displayed as "Score: XX%"
   - Timer shown on the right
*/

(function () {
  if (!window.quizData || !Array.isArray(window.quizData)) return;

  let currentIndex = 0;
  let startedAtMs = null;
  let timerHandle = null;

  // Track per-question state
  const selectedByIndex = {};   // { [index]: "A"|"B"|... }
  const answeredByIndex = {};   // { [index]: true }
  const correctByIndex = {};    // { [index]: true|false }
  const flaggedByIndex = {};    // { [index]: true }

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

  function renderQuestion() {
    startTimerOnce();

    const q = window.quizData[currentIndex];
    const qEl = $("quiz-question");
    const oEl = $("quiz-options");
    const feedbackEl = $("quiz-score");
    const flagBtn = $("flag-btn");
    const nextBtn = document.querySelector(".quiz-actions .btn-primary");

    if (qEl) qEl.textContent = `${q.number}. ${q.question}`;
    if (oEl) oEl.innerHTML = "";
    if (feedbackEl) feedbackEl.textContent = "";

    // Update flag button label
    if (flagBtn) {
      flagBtn.textContent = flaggedByIndex[currentIndex] ? "Unflag" : "Flag for Review";
    }

    // Build options
    const alreadyAnswered = !!answeredByIndex[currentIndex];
    const previouslySelected = selectedByIndex[currentIndex] || null;

    const nextShouldConfirm = !alreadyAnswered;

    // Set Next button state and label
    if (nextBtn) {
      if (alreadyAnswered) {
        nextBtn.disabled = false;
        nextBtn.textContent = (currentIndex < window.quizData.length - 1) ? "Next question" : "Finish";
      } else {
        nextBtn.textContent = "Confirm answer";
        nextBtn.disabled = !previouslySelected;
      }
    }

    // Options are in q.options object keyed by letters
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
        if (nextBtn) nextBtn.disabled = false;
      });

      label.appendChild(input);
      label.appendChild(span);

      if (oEl) oEl.appendChild(label);
    });

    // If already answered, show feedback immediately
    if (alreadyAnswered && feedbackEl) {
      const isCorrect = !!correctByIndex[currentIndex];
      const correctLetter = q.answer;
      const explanation = q.explanation ? ` ${q.explanation}` : "";

      feedbackEl.textContent = isCorrect
        ? `Correct.${explanation}`
        : `Incorrect. Correct answer: ${correctLetter}.${explanation}`;
    }

    renderStats();
    renderNavigation();
  }

  // Override: Confirm answer first, then Next question
  window.nextQuestion = function () {
    const q = window.quizData[currentIndex];
    const feedbackEl = $("quiz-score");
    const nextBtn = document.querySelector(".quiz-actions .btn-primary");

    // If not answered yet, confirm answer now
    if (!answeredByIndex[currentIndex]) {
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

      // Lock options
      const optionInputs = document.querySelectorAll('input[name="quiz-answer"]');
      optionInputs.forEach((i) => (i.disabled = true));

      renderStats();
      renderNavigation();

      if (nextBtn) {
        nextBtn.textContent = (currentIndex < window.quizData.length - 1) ? "Next question" : "Finish";
        nextBtn.disabled = false;
      }
      return;
    }

    // Already answered, advance (no timed auto-advance)
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
    // Reset state
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

  // Keep your existing calculator if it exists in script.js; otherwise noop
  if (typeof window.openCalculator !== "function") {
    window.openCalculator = function () {};
  }

  // Override loadQuiz called by <body onload="loadQuiz()"> in quiz.html :contentReference[oaicite:9]{index=9}
  window.loadQuiz = function () {
    renderStats();
    renderQuestion();
  };
})();
