/* quizOverride.js
   Two-button flow:
   - Choose an option -> Select enabled
   - Click Select -> feedback shown and Next enabled
   - Click Next -> move forward
*/

(function () {
  function $(id) {
    return document.getElementById(id);
  }

  function formatElapsed(ms) {
    const totalSec = Math.max(0, Math.floor(ms / 1000));
    const m = String(Math.floor(totalSec / 60)).padStart(2, "0");
    const s = String(totalSec % 60).padStart(2, "0");
    return m + ":" + s;
  }

  window.initPracticeQuiz = function (questions) {
    const navEl = $("quiz-navigation");
    const qEl = $("quiz-question");
    const optionsEl = $("quiz-options");
    const feedbackEl = $("quiz-score");
    const statsEl = $("quiz-stats");
    const timerEl = $("quiz-timer");

    const flagBtn = $("flag-btn");
    const selectBtn = $("select-btn");
    const nextBtn = $("next-btn");
    const restartBtn = $("restart-btn");

    if (!navEl || !qEl || !optionsEl || !feedbackEl || !statsEl || !timerEl || !flagBtn || !selectBtn || !nextBtn || !restartBtn) {
      console.error("Quiz UI elements missing from quiz.html");
      return;
    }

    let currentIndex = 0;
    let timerHandle = null;
    let startedAtMs = null;

    const selectedByIndex = {};
    const answeredByIndex = {};
    const correctByIndex = {};
    const flaggedByIndex = {};

    function startTimerOnce() {
      if (timerHandle) return;
      startedAtMs = Date.now();
      timerEl.textContent = "00:00";
      timerHandle = window.setInterval(function () {
        timerEl.textContent = formatElapsed(Date.now() - startedAtMs);
      }, 500);
    }

    function stopTimer() {
      if (timerHandle) {
        window.clearInterval(timerHandle);
        timerHandle = null;
      }
    }

    function answeredCount() {
      return Object.keys(answeredByIndex).length;
    }

    function correctCount() {
      return Object.values(correctByIndex).filter(Boolean).length;
    }

    function renderScore() {
      const a = answeredCount();
      const c = correctCount();
      const pct = a === 0 ? 0 : Math.round((c / a) * 100);
      statsEl.textContent = "Score: " + pct + "%";
    }

    function setButtonStates() {
      const alreadyAnswered = !!answeredByIndex[currentIndex];
      const hasSelection = !!selectedByIndex[currentIndex];

      // Select enabled only if selection exists and not answered
      selectBtn.disabled = alreadyAnswered || !hasSelection;

      // Next enabled only after answered
      nextBtn.disabled = !alreadyAnswered;
      nextBtn.textContent = (currentIndex < questions.length - 1) ? "Next" : "Finish";

      flagBtn.textContent = flaggedByIndex[currentIndex] ? "Unflag" : "Flag for Review";
    }

    function lockOptions() {
      const inputs = optionsEl.querySelectorAll('input[name="quiz-answer"]');
      inputs.forEach(function (i) { i.disabled = true; });
    }

    function renderNavigation() {
      navEl.innerHTML = "";

      questions.forEach(function (q, idx) {
        const b = document.createElement("button");
        b.type = "button";
        b.className = "nav-question";
        b.textContent = String(q.number != null ? q.number : (idx + 1));

        if (idx === currentIndex) b.classList.add("nav-current");
        if (flaggedByIndex[idx]) b.classList.add("nav-flagged");
        if (answeredByIndex[idx]) b.classList.add(correctByIndex[idx] ? "nav-correct" : "nav-incorrect");

        b.addEventListener("click", function () {
          currentIndex = idx;
          renderQuestion();
        });

        navEl.appendChild(b);
      });
    }

    function renderQuestion() {
      startTimerOnce();

      const q = questions[currentIndex];
      qEl.textContent = String(q.number != null ? q.number : (currentIndex + 1)) + ". " + q.question;

      // Clear options
      optionsEl.innerHTML = "";

      // Clear feedback when loading the question screen
      feedbackEl.textContent = "";

      const alreadyAnswered = !!answeredByIndex[currentIndex];
      const previouslySelected = selectedByIndex[currentIndex] || null;

      Object.entries(q.options || {}).forEach(function (entry) {
        const letter = entry[0];
        const text = entry[1];

        const id = "q_" + currentIndex + "_" + letter;

        const label = document.createElement("label");
        label.className = "quiz-option";
        label.setAttribute("for", id);

        const input = document.createElement("input");
        input.type = "radio";
        input.name = "quiz-answer";
        input.id = id;
        input.value = letter;
        input.checked = (previouslySelected === letter);
        input.disabled = alreadyAnswered;

        input.addEventListener("change", function () {
          if (answeredByIndex[currentIndex]) return;
          selectedByIndex[currentIndex] = letter;
          setButtonStates();
        });

        const span = document.createElement("span");
        span.textContent = letter + ". " + text;

        label.appendChild(input);
        label.appendChild(span);
        optionsEl.appendChild(label);
      });

      // If already answered, show feedback immediately
      if (alreadyAnswered) {
        lockOptions();
        const isCorrect = !!correctByIndex[currentIndex];
        const explanation = q.explanation ? " " + q.explanation : "";
        feedbackEl.textContent = isCorrect
          ? ("Correct." + explanation)
          : ("Incorrect. Correct answer: " + q.answer + "." + explanation);
      }

      renderScore();
      renderNavigation();
      setButtonStates();
    }

    function selectAnswer() {
      const q = questions[currentIndex];
      const selected = selectedByIndex[currentIndex];

      if (answeredByIndex[currentIndex]) return;

      if (!selected) {
        feedbackEl.textContent = "Please select an answer.";
        return;
      }

      answeredByIndex[currentIndex] = true;
      correctByIndex[currentIndex] = (selected === q.answer);

      const explanation = q.explanation ? " " + q.explanation : "";
      feedbackEl.textContent = correctByIndex[currentIndex]
        ? ("Correct." + explanation)
        : ("Incorrect. Correct answer: " + q.answer + "." + explanation);

      lockOptions();
      renderScore();
      renderNavigation();
      setButtonStates();
    }

    function nextQuestion() {
      if (!answeredByIndex[currentIndex]) {
        feedbackEl.textContent = "Please click Select before moving to the next question.";
        return;
      }

      if (currentIndex < questions.length - 1) {
        currentIndex += 1;
        renderQuestion();
        return;
      }

      // Finish
      stopTimer();
      const c = correctCount();
      const t = questions.length;
      const pct = t === 0 ? 0 : Math.round((c / t) * 100);
      feedbackEl.textContent = "Finished. Score: " + pct + "% (" + c + "/" + t + ").";
      nextBtn.disabled = true;
      selectBtn.disabled = true;
    }

    function toggleFlag() {
      flaggedByIndex[currentIndex] = !flaggedByIndex[currentIndex];
      renderNavigation();
      setButtonStates();
    }

    function restart() {
      currentIndex = 0;

      Object.keys(selectedByIndex).forEach(function (k) { delete selectedByIndex[k]; });
      Object.keys(answeredByIndex).forEach(function (k) { delete answeredByIndex[k]; });
      Object.keys(correctByIndex).forEach(function (k) { delete correctByIndex[k]; });
      Object.keys(flaggedByIndex).forEach(function (k) { delete flaggedByIndex[k]; });

      stopTimer();
      startedAtMs = null;
      timerEl.textContent = "00:00";

      renderQuestion();
    }

    // Wire buttons
    selectBtn.addEventListener("click", selectAnswer);
    nextBtn.addEventListener("click", nextQuestion);
    flagBtn.addEventListener("click", toggleFlag);
    restartBtn.addEventListener("click", restart);

    // Start
    renderQuestion();
  };
})();
