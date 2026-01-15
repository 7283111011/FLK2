// Utility script for the study website

// Save progress for a given key and value to localStorage
function saveProgress(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
}

// Load progress for a given key from localStorage
function loadProgress(key) {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : null;
}

// Initialise checkboxes on a topic page
function initCheckboxes(pageId) {
    const checks = document.querySelectorAll('input[type="checkbox"][data-id]');
    const saved = loadProgress(pageId) || {};
    checks.forEach(cb => {
        const id = cb.getAttribute('data-id');
        cb.checked = !!saved[id];
        cb.addEventListener('change', () => {
            saved[id] = cb.checked;
            saveProgress(pageId, saved);
            // update the dashboard if needed
            updateDashboardProgress();
        });
    });
}

// Text-to-speech for a paragraph
// Basic text-to-speech for a paragraph (single shot). This function is used
// on pages that do not require pause/resume functionality. For more advanced
// control (including pause and resume) use toggleSpeech().
function speakParagraph(elemId) {
    const elem = document.getElementById(elemId);
    if (!elem) return;
    // Cancel any ongoing utterances before starting a new one
    speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(elem.textContent);
    utterance.rate = 1;
    utterance.pitch = 1;
    speechSynthesis.speak(utterance);
}

// Global variables for toggleSpeech functionality
let currentUtterance = null;
let currentParaId = null;
let speechPaused = false;

/*
 * toggleSpeech provides play/pause/resume functionality for a given
 * paragraph. When called for a particular paragraph, it will start
 * reading the text aloud. If called again while the same paragraph is
 * being read, it will toggle between pausing and resuming. If a
 * different paragraph is requested, it will cancel the existing
 * utterance and start reading the new paragraph.
 *
 * @param {string} parId - The ID of the paragraph element to read.
 * @param {HTMLElement} btn - The button element that triggers the action.
 */
function toggleSpeech(parId, btn) {
    const elem = document.getElementById(parId);
    if (!elem) return;
    // If there is no current utterance or a different paragraph is selected
    if (!currentUtterance || currentParaId !== parId) {
        // Cancel any existing utterance
        speechSynthesis.cancel();
        // Create a new utterance with the paragraph text
        currentUtterance = new SpeechSynthesisUtterance(elem.textContent);
        currentUtterance.rate = 1;
        currentUtterance.pitch = 1;
        currentParaId = parId;
        speechPaused = false;
        // When the utterance ends naturally, reset state and button label
        currentUtterance.onend = () => {
            currentUtterance = null;
            currentParaId = null;
            speechPaused = false;
            if (btn) btn.textContent = 'Read aloud';
        };
        speechSynthesis.speak(currentUtterance);
        if (btn) btn.textContent = 'Pause';
    } else {
        // Same paragraph: toggle pause/resume
        if (speechPaused) {
            speechSynthesis.resume();
            speechPaused = false;
            if (btn) btn.textContent = 'Pause';
        } else {
            speechSynthesis.pause();
            speechPaused = true;
            if (btn) btn.textContent = 'Resume';
        }
    }
}

// True/False evaluation
function handleTrueFalse(qId, correct) {
    const radios = document.querySelectorAll(`input[name="${qId}"]`);
    let selected = null;
    radios.forEach(r => {
        if (r.checked) selected = r.value;
    });
    const feedback = document.getElementById(`${qId}-feedback`);
    if (!feedback) return;
    if (selected === null) {
        feedback.textContent = 'Please select an answer.';
        feedback.style.color = '#c0392b';
        return;
    }
    if (selected === correct) {
        feedback.textContent = 'Correct!';
        feedback.style.color = '#006400';
    } else {
        feedback.textContent = 'Incorrect.';
        feedback.style.color = '#c0392b';
    }
}

// Update progress bars on the dashboard
function updateDashboardProgress() {
    const cards = document.querySelectorAll('.card');
    cards.forEach(card => {
        const pageId = card.getAttribute('data-page');
        const total = parseInt(card.getAttribute('data-total'), 10);
        const saved = loadProgress(pageId) || {};
        const done = Object.values(saved).filter(v => v).length;
        const percent = total > 0 ? Math.round((done / total) * 100) : 0;
        const bar = card.querySelector('.progress-bar span');
        const percSpan = card.querySelector('.percentage');
        if (bar) bar.style.width = percent + '%';
        if (percSpan) percSpan.textContent = percent + '% complete';
    });
}

// Quiz functionality
// The question data array `quizData` is defined in quizData.js and loaded before this script. Each entry contains the question number, question text, options, correct answer and explanation.
/*
    {
        number: 1,
        question: `A burglary takes place at a jewellery shop. The bar manager across the street recognises the offender as a former employee. Should the police conduct an identification procedure?`,
        options: {
            A: 'Yes, because the manager viewed the burglary via a CCTV camera which failed to record the incident.',
            B: 'No, because the man is known to the manager.',
            C: 'Yes, because the man is known to the police.',
            D: 'No, because the lighting at the time of the offence was poor.',
            E: 'No, because the distance between the jewellery shop and the bar was too great.'
        },
        answer: 'B',
        explanation: 'Identification procedures under Code D of the Police and Criminal Evidence Act 1984 are designed for situations where the suspect is not known to the witness. Since the manager personally knew the suspect, a formal identification procedure would serve no useful purpose.'
    },
    {
        number: 2,
        question: `A man convicted of theft received a six‑month suspended sentence with an operational period of 12 months. He has now been convicted of a non‑imprisonable offence of criminal damage committed during the operational period. Can the magistrates’ court activate the custodial sentence?`,
        options: {
            A: 'Yes, because the man committed an offence during the operational period of the suspended sentence order.',
            B: 'No, because the new offence is non-imprisonable.',
            C: 'No, because the man has completed the requirement attached to the suspended sentence order.',
            D: 'No, because the operational period of the suspended sentence order is still running.',
            E: 'Yes, because the man has committed an offence within the six‑month period of custody imposed.'
        },
        answer: 'A',
        explanation: 'Under section 119 of the Sentencing Code, if an offender commits any further offence during the operational period of a suspended sentence order, the court must consider activating the custodial term unless unjust. The nature of the new offence (imprisonable or not) does not prevent activation.'
    },
    {
        number: 3,
        question: `A will leaves a trust fund for four children of the testator’s best friend to take at 18. Two children are under 18. One trustee dies. Is a replacement trustee required?`,
        options: {
            A: 'A replacement trustee must be appointed because some of the beneficiaries are still under the age of 18.',
            B: 'A replacement trustee must be appointed because three trustees were originally appointed and there are now only two trustees.',
            C: 'There is no requirement to appoint a replacement trustee because the trust came into effect after the testator’s death.',
            D: 'There is no requirement to appoint a replacement trustee because there is no land in the trust investments.',
            E: 'There is no requirement to appoint a replacement trustee because there are two surviving trustees.'
        },
        answer: 'E',
        explanation: 'The general rule is that a minimum of two trustees are required when minors are beneficiaries. Here, there are two surviving trustees, which satisfies the requirement. Therefore a replacement is not necessary.'
    },
    {
        number: 4,
        question: `An executor has not yet applied for probate. He wishes to protect himself from unknown creditors by advertising in the London Gazette and local newspapers. From when must he wait for two months before distributing the estate?`,
        options: {
            A: 'From the date of the grant of probate.',
            B: 'From the date of the advertisements.',
            C: 'From the date of death.',
            D: 'He must wait two months from the date of death before advertising.',
            E: 'He must wait two months from the grant of probate before advertising.'
        },
        answer: 'B',
        explanation: 'Under section 27 of the Trustee Act 1925, personal representatives who advertise for creditors must wait two months from the date of the notices before distributing the estate in order to obtain protection from unknown claims.'
    },
    {
        number: 5,
        question: `By his will, a testator appointed his spouse, friend and adult son as executors. The testator and his spouse later divorced. The son predeceased and a grant of probate to the son’s estate was obtained by his nephew. The testator’s estate is left to his niece aged 20. Who has the best right to apply for a grant?`,
        options: {
            A: 'The ex‑spouse, the friend and the nephew only.',
            B: 'The friend and the niece only.',
            C: 'The friend, the nephew and the niece only.',
            D: 'The friend only.',
            E: 'The friend and the nephew only.'
        },
        answer: 'D',
        explanation: 'Divorce revokes the spouse’s appointment as executor and the son predeceased, so the friend is the only remaining executor. Under the Non‑Contentious Probate Rules 1987, the remaining executor has priority to apply for a grant.'
    },
    {
        number: 6,
        question: `A solicitor acts for a client who has given false personal details in court to hide previous convictions. How should the solicitor proceed?`,
        options: {
            A: 'Cease to act immediately.',
            B: 'Do not refer to the client’s character or previous convictions.',
            C: 'Correct the client’s false details without instruction.',
            D: 'Imply the client is of good character.',
            E: 'Ask the client to correct the information and cease to act if she refuses.'
        },
        answer: 'E',
        explanation: 'The solicitor must not mislead the court. They should advise the client to correct the false information. If the client refuses, the solicitor should withdraw from representing the client to avoid being complicit in misleading the court.'
    },
    {
        number: 7,
        question: `A freeholder granted a 15‑year lease. It has been assigned several times, with authorised guarantee agreements on some assignments. The current tenant (bookstore) has defaulted on rent. From whom may the landlord recover the outstanding rent (aside from the current tenant)?`,
        options: {
            A: 'The chemist, the clothing retailer and the newsagent.',
            B: 'The chemist only.',
            C: 'The clothing retailer only.',
            D: 'The newsagent only.',
            E: 'The chemist and the newsagent only.'
        },
        answer: 'B',
        explanation: 'Under the Landlord and Tenant (Covenants) Act 1995, liability for covenants passes on assignment and the assignor is released unless they give an authorised guarantee agreement (AGA). Only the party who gave an AGA on the assignment to the current tenant (the chemist) remains liable.'
    },
    {
        number: 8,
        question: `A tenant has requested a new tenancy under section 26 of the Landlord and Tenant Act 1954. If the parties cannot agree terms, what order can the court make?`,
        options: {
            A: 'Grant a new tenancy on the same terms as the existing tenancy.',
            B: 'Grant a new tenancy on the same terms except regarding rent.',
            C: 'Grant a new tenancy on the same terms as the existing tenancy for a term not exceeding 15 years.',
            D: 'Grant a new tenancy on such terms as it determines under the Act for a term not exceeding 15 years.',
            E: 'Grant a new tenancy on the same terms as the existing tenancy and contracted out of the Act.'
        },
        answer: 'D',
        explanation: 'Section 35 of the Landlord and Tenant Act 1954 empowers the court to grant a new tenancy on terms it considers appropriate for a term not exceeding 15 years if the parties cannot agree.'
    }
    ,
    // Additional questions from the pre-tested sample set
    {
        number: 9,
        question: `Personal representatives sold quoted shares in December 2023 and realised a gain of £5,300 for CGT purposes. In November 2024 they sold a second holding purchased by the deceased for £35,000, valued at £50,000 at death and sold for £65,000 (net). Annual CGT exemptions are £6,000 for 2023/24 and £3,000 for 2024/25. The CGT rate for estates is 24%. What is the CGT liability on the second sale?`,
        options: {
            A: '£2,712',
            B: '£6,312',
            C: '£2,880',
            D: '£6,480',
            E: '£3,600'
        },
        answer: 'C',
        explanation: 'On the death of an individual, the base cost of assets for personal representatives is the probate value (£50,000). The gain on the second sale is £65,000 − £50,000 = £15,000. The annual exemption for 2024/25 is £3,000, leaving a taxable gain of £12,000. At 24% the CGT is £2,880.'
    },
    {
        number: 10,
        question: `A man has used his neighbour’s track for 22 years to reach work, with the neighbour’s permission. The arrangement has not been registered. The neighbour now withdraws permission. Has the man acquired a legal right of way by his use?`,
        options: {
            A: 'Yes, because the man has used the route for over 20 years without force or secrecy.',
            B: 'Yes, because the man has used the route in the last year and it is within the actual knowledge of the neighbour.',
            C: 'Yes, because the man’s use of the route is continuous and apparent.',
            D: 'No, because the use has not been recorded on the register of title.',
            E: 'No, because the neighbour gave him permission to use the route.'
        },
        answer: 'E',
        explanation: 'A legal easement by prescription requires use as of right (without force, secrecy or permission) for at least 20 years. Because the man’s use was with permission, it cannot mature into an easement and he merely had a revocable licence.'
    },
    {
        number: 11,
        question: `A will gives “all my shares in the five best performing companies in which I hold shares” to trustees on trust for the testator’s grandchildren. The trustees are unsure which shares are trust property. Has a valid trust been created?`,
        options: {
            A: 'No, as the will fails to distinguish between public and private shares.',
            B: 'Yes, as the trustees may use their judgement to select the shares.',
            C: 'Yes, as the stockbroker can determine which companies are the best performing.',
            D: 'No, as the description of the shares is too uncertain to identify the subject matter.',
            E: 'Yes, as the trustees, grandchildren and children can agree which shares to allocate.'
        },
        answer: 'D',
        explanation: 'A trust must satisfy the certainty of subject matter. Describing the trust property as the “shares in the five best performing companies” is too vague because there is no objective method for identifying the shares at the date of death; the trust fails for uncertainty.'
    },
    {
        number: 12,
        question: `A man charged with burglary confessed during a police interview after the officer exaggerated the evidence and suggested he would get bail if he confessed. Later he pleads not guilty. His solicitor applies under section 76 of PACE 1984 to exclude the confession. Who bears the burden of proof and to what standard?`,
        options: {
            A: 'The prosecution must prove beyond reasonable doubt that the confession was not obtained as alleged in order to admit it.',
            B: 'The prosecution must prove on the balance of probabilities that the confession was not obtained as alleged.',
            C: 'The defence must prove beyond reasonable doubt that the confession was obtained as alleged.',
            D: 'The defence must prove on the balance of probabilities that the confession was obtained as alleged.',
            E: 'No one bears the burden; the court has discretion whether to exclude the confession.'
        },
        answer: 'A',
        explanation: 'Under section 76(2) of PACE 1984 the court must exclude a confession if it was obtained by oppression or in circumstances likely to render it unreliable, unless the prosecution proves beyond reasonable doubt that it was not so obtained. The burden rests on the prosecution.'
    },
    {
        number: 13,
        question: `A man declared himself a trustee of his house for his son and daughter and wrote a letter to them confirming the gift. Which fact determines whether a valid declaration of trust of land has been created?`,
        options: {
            A: 'Whether the children are adults.',
            B: 'Whether the man signed a transfer of the legal title to his children.',
            C: 'Whether the transfer will be to joint tenants or tenants in common.',
            D: 'Whether the man signed the letter to his children.',
            E: 'Whether the house is the subject of a gift in his will.'
        },
        answer: 'D',
        explanation: 'A declaration of trust of land must be evidenced in writing and signed by the person declaring the trust (section 53(1)(b) Law of Property Act 1925). Whether the man signed the letter is therefore determinative of the trust’s validity.'
    }
];
*/
// The full quiz data will be loaded asynchronously from quizData.json in loadQuiz().

// Quiz state
let currentQuestion = 0;
let score = 0;
// Track selected answers for each question
let selectedAnswers = [];
// Track whether a question has been answered, flagged or not visited. Values: 'unanswered', 'answered', 'flagged'
let questionStatus = [];
// Timer variables
let timerInterval;
let startTime;

// Update the scoreboard showing correct answers, attempted questions and percentage
function updateScoreboard() {
    const statsElem = document.getElementById('quiz-stats');
    if (!statsElem) return;
    const attempted = selectedAnswers.filter(ans => ans !== null).length;
    // Avoid division by zero
    const percent = attempted > 0 ? Math.round((score / attempted) * 100) : 0;
    statsElem.textContent = `Correct: ${score} / Attempted: ${attempted} (${percent}%)`;
}

function loadQuiz() {
    currentQuestion = 0;
    score = 0;
    selectedAnswers = new Array(quizData.length).fill(null);
    questionStatus = new Array(quizData.length).fill('unanswered');
    // initialise timer
    initTimer();
    // build navigation panel
    buildNavigation();
    // Display the first question
    showQuestion();
    // initialise scoreboard
    updateScoreboard();
}

function showQuestion() {
    const qContainer = document.getElementById('quiz-question');
    const optContainer = document.getElementById('quiz-options');
    const scoreContainer = document.getElementById('quiz-score');
    scoreContainer.textContent = '';
    if (currentQuestion >= quizData.length) {
        qContainer.textContent = 'Quiz completed!';
        optContainer.innerHTML = '';
        // stop the timer when quiz is finished
        stopTimer();
        scoreContainer.textContent = `Your score: ${score} / ${quizData.length}`;
        return;
    }
    const data = quizData[currentQuestion];
    qContainer.textContent = `Question ${data.number}. ${data.question}`;
    // render options
    optContainer.innerHTML = '';
    for (const key in data.options) {
        const label = document.createElement('label');
        label.className = 'quiz-option';
        const input = document.createElement('input');
        input.type = 'radio';
        input.name = 'quiz-choice';
        input.value = key;
        // set checked if previously selected
        if (selectedAnswers[currentQuestion] === key) {
            input.checked = true;
        }
        label.appendChild(input);
        label.insertAdjacentHTML('beforeend', ` ${key}. ${data.options[key]}`);
        optContainer.appendChild(label);
    }
    // update flag button state
    const flagBtn = document.getElementById('flag-btn');
    if (flagBtn) {
        flagBtn.textContent = questionStatus[currentQuestion] === 'flagged' ? 'Unflag' : 'Flag for Review';
    }
    updateNavigationHighlight();
}

function nextQuestion() {
    const selectedInput = document.querySelector('input[name="quiz-choice"]:checked');
    // if no option selected, just move to next question but keep status as unanswered unless flagged
    if (selectedInput) {
        const data = quizData[currentQuestion];
        const chosen = selectedInput.value;
        selectedAnswers[currentQuestion] = chosen;
        // mark answered only if not flagged
        if (questionStatus[currentQuestion] !== 'flagged') {
            questionStatus[currentQuestion] = 'answered';
        }
        if (chosen === data.answer) {
            score++;
        }
        const scoreContainer = document.getElementById('quiz-score');
        scoreContainer.textContent = chosen === data.answer ? 'Correct! ' + data.explanation : 'Incorrect. ' + data.explanation;
        // update scoreboard to reflect new score and attempted count
        updateScoreboard();
    } else {
        // no answer selected; mark unanswered if not flagged
        if (questionStatus[currentQuestion] !== 'flagged') {
            questionStatus[currentQuestion] = 'unanswered';
        }
    }
    // update navigation statuses and highlight
    updateNavigationHighlight();
    currentQuestion++;
    // delay to allow user to read explanation if answer selected
    setTimeout(showQuestion, selectedInput ? 2000 : 0);
}

function restartQuiz() {
    currentQuestion = 0;
    score = 0;
    selectedAnswers = new Array(quizData.length).fill(null);
    questionStatus = new Array(quizData.length).fill('unanswered');
    // restart timer
    initTimer();
    updateNavigationHighlight();
    showQuestion();
    updateScoreboard();
}

// Flag the current question for review
function flagQuestion() {
    // toggle flag status
    if (questionStatus[currentQuestion] === 'flagged') {
        // if flagged, unflag and set status based on whether answered
        questionStatus[currentQuestion] = selectedAnswers[currentQuestion] ? 'answered' : 'unanswered';
    } else {
        questionStatus[currentQuestion] = 'flagged';
    }
    // update flag button text
    const flagBtn = document.getElementById('flag-btn');
    if (flagBtn) {
        flagBtn.textContent = questionStatus[currentQuestion] === 'flagged' ? 'Unflag' : 'Flag for Review';
    }
    updateNavigationHighlight();
}

// Navigate to a specific question index
function goToQuestion(index) {
    // save current selection if any
    currentQuestion = index;
    showQuestion();
}

// Build the navigation panel showing question numbers and statuses
function buildNavigation() {
    const navContainer = document.getElementById('quiz-navigation');
    if (!navContainer) return;
    navContainer.innerHTML = '';
    for (let i = 0; i < quizData.length; i++) {
        const btn = document.createElement('button');
        btn.className = 'nav-question';
        btn.textContent = quizData[i].number;
        btn.addEventListener('click', () => goToQuestion(i));
        navContainer.appendChild(btn);
    }
    updateNavigationHighlight();
}

// Update the navigation buttons to reflect question status
function updateNavigationHighlight() {
    const navContainer = document.getElementById('quiz-navigation');
    if (!navContainer) return;
    const buttons = navContainer.querySelectorAll('button.nav-question');
    buttons.forEach((btn, idx) => {
        btn.classList.remove('nav-answered', 'nav-unanswered', 'nav-flagged', 'nav-current', 'nav-correct', 'nav-incorrect');
        // highlight the current question
        if (idx === currentQuestion) {
            btn.classList.add('nav-current');
        }
        // flagged questions take priority in styling
        if (questionStatus[idx] === 'flagged') {
            btn.classList.add('nav-flagged');
        } else if (selectedAnswers[idx] !== null) {
            // question answered: determine correct or incorrect
            if (selectedAnswers[idx] === quizData[idx].answer) {
                btn.classList.add('nav-correct');
            } else {
                btn.classList.add('nav-incorrect');
            }
        } else {
            btn.classList.add('nav-unanswered');
        }
    });
}

// Timer functions
function initTimer() {
    // clear any existing timer
    if (timerInterval) {
        clearInterval(timerInterval);
    }
    startTime = Date.now();
    updateTimerDisplay();
    timerInterval = setInterval(updateTimerDisplay, 1000);
}

function updateTimerDisplay() {
    const timerElem = document.getElementById('quiz-timer');
    if (!timerElem) return;
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    const hours = Math.floor(elapsed / 3600);
    const minutes = Math.floor((elapsed % 3600) / 60);
    const seconds = elapsed % 60;
    const pad = (n) => n.toString().padStart(2, '0');
    timerElem.textContent = `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

function stopTimer() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
}

// Calculator popup
function openCalculator() {
    window.open('calculator.html', 'calculator', 'width=300,height=400');
}
function updateDashboardProgress() {
  const cards = document.querySelectorAll(".card[data-page][data-total]");

  cards.forEach((card) => {
    const pageKey = card.getAttribute("data-page");
    const total = Number(card.getAttribute("data-total") || 0);

    // Expected storage key: progress_<data-page>
    // Expected value: JSON like {"completed": 3}
    let completed = 0;
    try {
      const raw = localStorage.getItem(`progress_${pageKey}`);
      if (raw) {
        const obj = JSON.parse(raw);
        completed = Number(obj.completed || 0);
      }
    } catch (e) {
      completed = 0;
    }

    const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

    const barFill = card.querySelector(".progress-bar span");
    const pctText = card.querySelector(".percentage");

    if (barFill) barFill.style.width = `${pct}%`;
    if (pctText) pctText.textContent = `${pct}% complete`;
  });
}
function updateDashboardProgress() {
  const cards = document.querySelectorAll(".card[data-page][data-total]");

  cards.forEach((card) => {
    const pageKey = card.getAttribute("data-page");
    const total = Number(card.getAttribute("data-total") || 0);

    let completed = 0;

    // Expected storage key format: progress_<pageKey>
    // Expected value: JSON like {"completed": 3}
    try {
      const raw = localStorage.getItem(`progress_${pageKey}`);
      if (raw) {
        const obj = JSON.parse(raw);
        completed = Number(obj.completed || 0);
      }
    } catch (e) {
      completed = 0;
    }

    const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

    const fill = card.querySelector(".progress-bar span");
    const label = card.querySelector(".percentage");

    if (fill) fill.style.width = `${pct}%`;
    if (label) label.textContent = `${pct}% complete`;
  });
}
