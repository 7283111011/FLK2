/* quizData.js
   Loads quizData.json and passes questions to the quiz engine in quizOverride.js
*/

(function () {
  function fail(message) {
    const el = document.getElementById("quiz-score");
    if (el) el.textContent = message;
  }

  fetch("quizData.json?v=1", { cache: "no-store" })
    .then(function (res) {
      if (!res.ok) throw new Error("Could not load quizData.json");
      return res.json();
    })
    .then(function (data) {
      if (!data || !Array.isArray(data.questions)) {
        throw new Error("quizData.json has an invalid format");
      }

      // Normalize to the array the engine expects
      window.quizData = data.questions;

      if (typeof window.initPracticeQuiz === "function") {
        window.initPracticeQuiz(window.quizData);
      } else {
        throw new Error("initPracticeQuiz is not available. quizOverride.js did not load.");
      }
    })
    .catch(function (err) {
      fail("Quiz failed to load. " + String(err && err.message ? err.message : err));
      console.error(err);
    });
})();
