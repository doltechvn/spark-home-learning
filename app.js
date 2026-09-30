const views = {
  welcome: document.querySelector("#welcomeView"),
  home: document.querySelector("#homeView"),
  sound: document.querySelector("#soundView"),
  wordReview: document.querySelector("#wordReviewView"),
  word: document.querySelector("#wordView"),
  talk: document.querySelector("#talkView"),
  complete: document.querySelector("#completeView"),
};

const dom = {
  app: document.querySelector("#app"),
  backButton: document.querySelector("#backButton"),
  progressDots: document.querySelector("#progressDots"),
  progressText: document.querySelector("#progressText"),
  levelButton: document.querySelector("#levelButton"),
  parentButton: document.querySelector("#parentButton"),
  infoDialog: document.querySelector("#infoDialog"),
  replayButton: document.querySelector("#replayButton"),
  restartButton: document.querySelector("#restartButton"),
  soundPromptButton: document.querySelector("#soundPromptButton"),
  soundAudio: document.querySelector("#soundAudio"),
  soundPrompt: document.querySelector("#soundPrompt"),
  soundFeedback: document.querySelector("#soundFeedback"),
  soundAnswers: [...document.querySelectorAll("[data-sound-answer]")],
  wordReviewTitle: document.querySelector("#wordReviewTitle"),
  wordReviewInstruction: document.querySelector("#wordReviewInstruction"),
  wordGroupChoices: document.querySelector("#wordGroupChoices"),
  wordGroupDetail: document.querySelector("#wordGroupDetail"),
  wordGroupsBackButton: document.querySelector("#wordGroupsBackButton"),
  wordGroupTitle: document.querySelector("#wordGroupTitle"),
  wordGroupScene: document.querySelector("#wordGroupScene"),
  wordReviewGrid: document.querySelector("#wordReviewGrid"),
  wordResumeButton: document.querySelector("#wordResumeButton"),
  startWordPracticeButton: document.querySelector("#startWordPracticeButton"),
  wordPracticeBackButton: document.querySelector("#wordPracticeBackButton"),
  wordSaveStatus: document.querySelector("#wordSaveStatus"),
  wordPromptButton: document.querySelector("#wordPromptButton"),
  wordRoundStatus: document.querySelector("#wordRoundStatus"),
  wordPrompt: document.querySelector("#wordPrompt"),
  wordFeedback: document.querySelector("#wordFeedback"),
  pictureOptions: document.querySelector("#pictureOptions"),
  wordReveal: document.querySelector("#wordReveal"),
  wordRevealImage: document.querySelector("#wordRevealImage"),
  wordRevealText: document.querySelector("#wordRevealText"),
  wordRecordButton: document.querySelector("#wordRecordButton"),
  wordPlayRecordingButton: document.querySelector("#wordPlayRecordingButton"),
  wordRecordStatus: document.querySelector("#wordRecordStatus"),
  nextWordButton: document.querySelector("#nextWordButton"),
  backToPicturesButton: document.querySelector("#backToPicturesButton"),
  talkIntroStage: document.querySelector("#talkIntroStage"),
  talkQuestionStage: document.querySelector("#talkQuestionStage"),
  talkBuilderStage: document.querySelector("#talkBuilderStage"),
  playConversationButton: document.querySelector("#playConversationButton"),
  startTalkQuestionButton: document.querySelector("#startTalkQuestionButton"),
  talkQuestionBackButton: document.querySelector("#talkQuestionBackButton"),
  replayTalkQuestionButton: document.querySelector("#replayTalkQuestionButton"),
  talkRoundStatus: document.querySelector("#talkRoundStatus"),
  talkBuilderRoundStatus: document.querySelector("#talkBuilderRoundStatus"),
  talkItemImage: document.querySelector("#talkItemImage"),
  talkQuestionRecordPanel: document.querySelector("#talkQuestionRecordPanel"),
  talkHintButton: document.querySelector("#talkHintButton"),
  talkHintText: document.querySelector("#talkHintText"),
  startTalkBuilderButton: document.querySelector("#startTalkBuilderButton"),
  talkBuilderBackButton: document.querySelector("#talkBuilderBackButton"),
  talkNextButton: document.querySelector("#talkNextButton"),
  questionBubble: document.querySelector("#questionBubble"),
  answerBubble: document.querySelector("#answerBubble"),
  sentenceLine: document.querySelector("#sentenceLine"),
  chunkBank: document.querySelector("#chunkBank"),
  chunkButtons: [...document.querySelectorAll("[data-chunk]")],
  recordButton: document.querySelector("#recordButton"),
  playRecordingButton: document.querySelector("#playRecordingButton"),
  recordStatus: document.querySelector("#recordStatus"),
  talkFeedback: document.querySelector("#talkFeedback"),
};

const state = {
  currentView: "home",
  complete: new Set(),
  soundPromptPlayed: false,
  soundPlaybackEpoch: 0,
  wordRoundIndex: 0,
  wordPromptPlayed: false,
  wordSolved: false,
  wordStarted: false,
  wordFinished: false,
  wordGroup: null,
  wordMediaRecorder: null,
  wordMediaStream: null,
  wordAudioUrl: "",
  chunks: [],
  talkStage: "intro",
  talkIndex: 0,
  talkConfirmed: false,
  talkBuildLocked: false,
  talkAnswerPending: false,
  talkAnswerTimer: null,
  talkQuestionEpoch: 0,
  talkRecordingPendingEpoch: null,
  talkSpeechDetected: false,
  talkHintTimer: null,
  talkVadTimer: null,
  talkAudioContext: null,
  mediaRecorder: null,
  mediaStream: null,
  audioUrl: "",
};

const WORD_ITEMS = [
  { word: "pen", image: "assets/pen.png", alt: "A ballpoint pen" },
  { word: "pencil", image: "assets/pencil.png", alt: "A wooden pencil" },
  { word: "book", image: "assets/book.png", alt: "A bound book" },
  { word: "notebook", image: "assets/notebook.png", alt: "A spiral notebook" },
  { word: "bag", image: "assets/bag.png", alt: "A school backpack" },
  { word: "rubber", image: "assets/rubber.png", alt: "A school eraser" },
  { word: "desk", image: "assets/desk.png", alt: "A school desk" },
  { word: "chair", image: "assets/chair.png", alt: "A chair" },
  { word: "board", image: "assets/board.png", alt: "A classroom board" },
  { word: "clock", image: "assets/clock.png", alt: "An analog clock" },
  { word: "laptop", image: "assets/laptop.png", alt: "An open laptop" },
];
const WORD_SET_SIZE = 3;
const WORD_PRACTICE = [...WORD_ITEMS, WORD_ITEMS[2]];
let TALK_ITEMS = ["book", "pen", "pencil", "notebook", "rubber", "bag"]
  .map((word) => WORD_ITEMS.find((item) => item.word === word));
const WORD_SET_COUNT = WORD_PRACTICE.length / WORD_SET_SIZE;
const WORD_SAVE_KEY = "spark-unit-a-home-word-v1";
const TALK_SAVE_KEY = "spark-unit-a-home-talk-v2";
const wrongPictureTimers = new WeakMap();
const WORD_GROUPS = [
  {
    id: "bag",
    title: "In my bag",
    image: "assets/overview_bag.png",
    words: ["bag", "pen", "pencil", "book", "notebook", "rubber"],
    callouts: [
      { word: "bag", label: [285, 138], target: [398, 245] },
      { word: "pen", label: [385, 472], target: [498, 385] },
      { word: "pencil", label: [690, 142], target: [657, 244] },
      { word: "book", label: [685, 308], target: [587, 310] },
      { word: "notebook", label: [815, 462], target: [736, 366] },
      { word: "rubber", label: [863, 142], target: [784, 224] },
    ],
  },
  {
    id: "classroom",
    title: "In our classroom",
    image: "assets/overview_classroom.png",
    words: ["desk", "chair", "board", "clock", "laptop"],
    callouts: [
      { word: "desk", label: [612, 400], target: [556, 300] },
      { word: "chair", label: [143, 375], target: [235, 306] },
      { word: "board", label: [596, 56], target: [635, 103] },
      { word: "clock", label: [915, 153], target: [871, 76] },
      { word: "laptop", label: [910, 257], target: [845, 190] },
    ],
  },
];

function speak(text, rate = 0.78) {
  return v2.speech(text);
}

function speakConversation() {
  return v2.conversation();
}

function playTalkQuestion() {
  releaseTalkMicrophone();
  const epoch = state.talkQuestionEpoch;
  dom.talkQuestionRecordPanel.classList.add("is-hidden");
  dom.startTalkBuilderButton.classList.add("is-hidden");
  dom.playRecordingButton.classList.add("is-hidden");
  dom.recordStatus.textContent = "";
  dom.talkHintText.textContent = v2.talkFrame();
  dom.talkHintText.classList.toggle("is-hidden", state.talkIndex >= 2);
  dom.talkHintButton.setAttribute("aria-expanded", String(state.talkIndex < 2));
  state.talkSpeechDetected = false;
  let settled = false;
  const reveal = () => {
    if (settled || epoch !== state.talkQuestionEpoch || state.currentView !== "talk" || state.talkStage !== "question") return;
    settled = true;
    dom.talkQuestionRecordPanel.classList.remove("is-hidden");
    scheduleTalkHint();
    toggleRecording(true);
  };
  speak(v2.talkQuestion()).then(ok => {
    if (ok) reveal();
    else if (epoch === state.talkQuestionEpoch && state.currentView === "talk" && state.talkStage === "question") {
      dom.recordStatus.textContent = "Tap Hear the question again to start.";
      dom.talkQuestionRecordPanel.classList.remove("is-hidden");
    }
  });
}

function playCorrectCue() {
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    const context = new AudioContextClass();
    [660, 880].forEach((frequency, index) => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      const start = context.currentTime + index * 0.11;
      oscillator.type = "sine";
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.075, start + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.15);
      oscillator.connect(gain).connect(context.destination);
      oscillator.start(start);
      oscillator.stop(start + 0.16);
    });
    window.setTimeout(() => context.close(), 450);
  } catch (_) { /* Sound effect is optional. */ }
}

function saveWordProgress() {
  try {
    localStorage.setItem(v2.key(WORD_SAVE_KEY), JSON.stringify({
      started: state.wordStarted,
      roundIndex: state.wordRoundIndex,
      solved: state.wordSolved,
      finished: state.wordFinished,
    }));
    dom.wordSaveStatus.textContent = "Progress saved on this device";
  } catch (_) {
    dom.wordSaveStatus.textContent = "Progress cannot be saved in this browser";
  }
  dom.wordResumeButton.classList.toggle("is-hidden", !state.wordStarted || state.wordFinished);
  dom.startWordPracticeButton.innerHTML = state.wordStarted && !state.wordFinished
    ? "Continue practice <span aria-hidden=\"true\">→</span>"
    : "Let's practice! <span aria-hidden=\"true\">→</span>";
  v2.snapshot();
}

function restoreWordProgress() {
  try {
    const saved = JSON.parse(localStorage.getItem(v2.key(WORD_SAVE_KEY)) || "null");
    if (!saved || saved.started !== true || !Number.isInteger(saved.roundIndex) ||
      saved.roundIndex < 0 || saved.roundIndex >= WORD_PRACTICE.length) return;
    state.wordStarted = true;
    state.wordRoundIndex = saved.roundIndex;
    resetCurrentWordRound();
    if (saved.solved === true) showWordSuccess(WORD_PRACTICE[state.wordRoundIndex]);
    if (saved.finished === true) showWordFinished();
    saveWordProgress();
  } catch (_) { /* Start fresh when stored data is unavailable. */ }
}

function saveTalkProgress() {
  try {
    localStorage.setItem(v2.key(TALK_SAVE_KEY), JSON.stringify({
      stage: state.talkStage,
      index: state.talkIndex,
      chunks: state.chunks,
      confirmed: state.talkConfirmed,
    }));
  } catch (_) { /* Talk remains usable without storage. */ }
  v2.snapshot();
}

function restoreTalkProgress() {
  try {
    const saved = JSON.parse(localStorage.getItem(v2.key(TALK_SAVE_KEY)) || "null");
    if (!saved || !["intro", "question", "builder"].includes(saved.stage) ||
      !Number.isInteger(saved.index) || saved.index < 0 || saved.index >= TALK_ITEMS.length) return;
    state.talkStage = saved.stage;
    state.talkIndex = saved.index;
    const allowed = v2.talkChunks();
    if (Array.isArray(saved.chunks) && saved.chunks.every((chunk) => allowed.includes(chunk)) &&
      new Set(saved.chunks).size === saved.chunks.length && saved.chunks.length <= allowed.length) {
      state.chunks = saved.chunks;
    }
    state.talkConfirmed = saved.confirmed === true &&
      state.chunks.join(" ") === talkAnswer();
    renderTalkItem();
    showTalkStage(state.talkStage, false);
    renderChunks();
    if (v2.learner().talkDone?.length === 2) {
      state.complete.add("talk");
    }
  } catch (_) { /* Start Talk at the conversation. */ }
}

function renderProgress() {
  dom.progressDots.replaceChildren();
  for (const zone of ["sound", "word", "talk"]) {
    const dot = document.createElement("span");
    dot.className = `progress-dot${state.complete.has(zone) ? " is-complete" : ""}`;
    dom.progressDots.append(dot);
  }
  dom.progressText.textContent = `${state.complete.size} of 3`;
}

function showView(name) {
  if (!views[name]) name = "home";
  v2.cancel();
  if(state.currentView === "sound") v2.saveLetters();
  if (state.currentView === "sound" && name !== "sound") stopSoundAudio();
  if (state.currentView === "word" && name !== "word") clearWordRecording();
  if (state.currentView === "talk" && name !== "talk") {
    releaseTalkMicrophone();
    cancelTalkAnswerPlayback();
    window.speechSynthesis?.cancel();
  }
  state.currentView = name;
  dom.app.dataset.view = name;
  for (const [viewName, element] of Object.entries(views)) {
    element.classList.toggle("is-hidden", viewName !== name);
  }
  dom.backButton.classList.toggle("is-hidden", name === "welcome");
  dom.backButton.setAttribute("aria-label", name === "home" ? "Back to units" : "Go back");
  if(name === "welcome") v2.renderWelcome();
  if(name === "sound") v2.renderLetters();
  document.querySelectorAll("[data-nav]").forEach((button) => {
    button.classList.toggle("is-active", name === "welcome");
  });
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function completeZone(zone, { deferCelebration = false } = {}) {
  state.complete.add(zone);
  renderProgress();
  if (state.complete.size === 3 && !deferCelebration) {
    setTimeout(() => showView("complete"), 700);
  }
}

function makeAnnotatedScene(group) {
  const scene = document.createElement("div");
  scene.className = "annotated-scene";
  const image = document.createElement("img");
  image.src = group.image;
  image.alt = group.id === "bag"
    ? "A school bag with books and small school items on a desk"
    : "A classroom with desks, chairs, a board, a clock and a laptop";
  scene.append(image);

  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 1000 560");
  svg.setAttribute("preserveAspectRatio", "none");
  svg.setAttribute("aria-hidden", "true");
  for (const item of group.callouts) {
    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.setAttribute("x1", item.label[0]);
    line.setAttribute("y1", item.label[1]);
    line.setAttribute("x2", item.target[0]);
    line.setAttribute("y2", item.target[1]);
    const point = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    point.setAttribute("cx", item.target[0]);
    point.setAttribute("cy", item.target[1]);
    point.setAttribute("r", "6");
    svg.append(line, point);
    const label = document.createElement("span");
    label.className = "scene-callout";
    label.style.left = `${item.label[0] / 10}%`;
    label.style.top = `${item.label[1] / 5.6}%`;
    label.textContent = item.word;
    scene.append(label);
  }
  scene.append(svg);
  return scene;
}

function renderWordGroupChoices() {
  dom.wordGroupChoices.replaceChildren();
  for (const group of WORD_GROUPS) {
    const button = document.createElement("button");
    button.className = "word-group-choice";
    button.type = "button";
    button.setAttribute("aria-label", `Open ${group.title}: ${group.words.join(", ")}`);
    button.append(makeAnnotatedScene(group));
    const footer = document.createElement("span");
    footer.className = "word-group-choice-footer";
    const title = document.createElement("strong");
    title.textContent = group.title;
    const count = document.createElement("small");
    count.textContent = `${group.words.length} words  →`;
    footer.append(title, count);
    button.append(footer);
    button.addEventListener("click", () => openWordGroup(group.id));
    dom.wordGroupChoices.append(button);
  }
}

function renderWordReview(group) {
  dom.wordReviewGrid.replaceChildren();
  for (const word of group.words) {
    const item = WORD_ITEMS.find((entry) => entry.word === word);
    const card = document.createElement("button");
    card.className = "word-review-card";
    card.type = "button";
    card.setAttribute("aria-label", `Hear ${item.word}`);
    const image = document.createElement("img");
    image.src = item.image;
    image.alt = item.alt;
    const label = document.createElement("strong");
    label.textContent = item.word;
    card.append(image, label);
    card.addEventListener("click", () => speak(item.word));
    dom.wordReviewGrid.append(card);
  }
}

function openWordGroup(id) {
  const group = WORD_GROUPS.find((entry) => entry.id === id);
  if (!group) return;
  state.wordGroup = id;
  dom.wordReviewTitle.textContent = "Look, listen and say";
  dom.wordReviewInstruction.textContent = "Tap any word card to hear it again.";
  dom.wordGroupTitle.textContent = group.title;
  dom.wordGroupScene.replaceChildren(makeAnnotatedScene(group));
  renderWordReview(group);
  dom.wordGroupChoices.classList.add("is-hidden");
  dom.wordGroupDetail.classList.remove("is-hidden");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function closeWordGroup() {
  state.wordGroup = null;
  dom.wordReviewTitle.textContent = "Explore our school words";
  dom.wordReviewInstruction.textContent = "Choose a picture to look inside.";
  dom.wordGroupChoices.classList.remove("is-hidden");
  dom.wordGroupDetail.classList.add("is-hidden");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function resetSound() {
  stopSoundAudio();
  state.soundPromptPlayed = false;
  dom.soundPrompt.textContent = "Tap Listen, then choose.";
  dom.soundFeedback.textContent = "We can try together.";
  dom.soundFeedback.classList.remove("is-positive");
  dom.soundAnswers.forEach((button) => button.classList.remove("is-correct", "is-soft-wrong"));
}

function stopSoundAudio() {
  state.soundPlaybackEpoch += 1;
  dom.soundAudio.pause();
  dom.soundAudio.currentTime = 0;
}

async function playSoundPrompt() {
  stopSoundAudio();
  const epoch = state.soundPlaybackEpoch;
  window.speechSynthesis?.cancel();
  state.soundPromptPlayed = false;
  dom.soundPrompt.textContent = "Listen carefully…";
  dom.soundFeedback.textContent = "Is it the letter name or the letter sound?";
  dom.soundFeedback.classList.remove("is-positive");
  dom.soundAudio.onended = () => {
    if (epoch !== state.soundPlaybackEpoch || state.currentView !== "sound") return;
    state.soundPromptPlayed = true;
    dom.soundPrompt.textContent = "Now choose. You can listen again.";
  };
  const playbackFailed = () => {
    if (epoch !== state.soundPlaybackEpoch) return;
    state.soundPromptPlayed = false;
    dom.soundPrompt.textContent = "Tap Listen to try again.";
    dom.soundFeedback.textContent = "The audio could not play. Please try again.";
  };
  dom.soundAudio.onerror = playbackFailed;
  try {
    await dom.soundAudio.play();
  } catch (_) {
    playbackFailed();
  }
}

function chooseSoundAnswer(button) {
  dom.soundAnswers.forEach((item) => item.classList.remove("is-correct", "is-soft-wrong"));
  if (!state.soundPromptPlayed) {
    dom.soundFeedback.textContent = "Listen first. Then choose.";
    return;
  }
  if (button.dataset.soundAnswer === "sound") {
    button.classList.add("is-correct");
    dom.soundFeedback.textContent = "Yes — /n/ is the letter sound!";
    dom.soundFeedback.classList.add("is-positive");
    completeZone("sound");
  } else {
    button.classList.add("is-soft-wrong");
    dom.soundFeedback.textContent = "Listen again. Is it the name or the sound?";
  }
}

function resetWord() {
  state.wordStarted = false;
  state.wordFinished = false;
  state.wordRoundIndex = 0;
  resetCurrentWordRound();
  dom.wordResumeButton.classList.add("is-hidden");
  dom.startWordPracticeButton.innerHTML = "Let's practice! <span aria-hidden=\"true\">→</span>";
}

function wordOptionsFor(index) {
  const target = WORD_PRACTICE[index];
  const choices = [target, WORD_ITEMS[(index + 4) % WORD_ITEMS.length], WORD_ITEMS[(index + 7) % WORD_ITEMS.length]];
  const targetPosition = index % WORD_SET_SIZE;
  choices.splice(0, 1);
  choices.splice(targetPosition, 0, target);
  return choices;
}

function renderWordOptions() {
  dom.pictureOptions.replaceChildren();
  for (const item of wordOptionsFor(state.wordRoundIndex)) {
    const card = document.createElement("button");
    card.className = "picture-card";
    card.type = "button";
    card.dataset.wordAnswer = item.word;
    card.setAttribute("aria-label", item.alt);
    const image = document.createElement("img");
    image.src = item.image;
    image.alt = "";
    card.append(image);
    card.addEventListener("click", () => choosePicture(card));
    dom.pictureOptions.append(card);
  }
}

function resetCurrentWordRound() {
  const setIndex = Math.floor(state.wordRoundIndex / WORD_SET_SIZE);
  const wordInSet = state.wordRoundIndex % WORD_SET_SIZE + 1;
  state.wordPromptPlayed = false;
  state.wordSolved = false;
  dom.wordRoundStatus.textContent = `SET ${setIndex + 1} OF ${WORD_SET_COUNT} · WORD ${wordInSet} OF ${WORD_SET_SIZE}`;
  dom.wordPrompt.textContent = "Listen, then tap the picture. Tap Listen to hear it again.";
  dom.wordFeedback.textContent = `Listen and find word ${state.wordRoundIndex + 1} of ${WORD_PRACTICE.length}.`;
  dom.wordFeedback.classList.remove("is-positive");
  dom.wordPromptButton.classList.remove("is-hidden");
  dom.wordPrompt.classList.remove("is-hidden");
  dom.pictureOptions.classList.remove("is-hidden");
  dom.wordFeedback.classList.remove("is-hidden");
  dom.wordReveal.classList.add("is-hidden");
  dom.nextWordButton.classList.add("is-hidden");
  dom.backToPicturesButton.classList.add("is-hidden");
  clearWordRecording();
  renderWordOptions();
}

async function playWordPrompt() {
  if (state.wordFinished || state.wordSolved) return;
  const target = WORD_PRACTICE[state.wordRoundIndex].word;
  const index = state.wordRoundIndex;
  state.wordPromptPlayed = false;
  dom.wordPrompt.textContent = "Listen carefully…";
  const ok = await speak(target);
  if(state.currentView !== "word" || state.wordRoundIndex !== index || state.wordSolved) return;
  state.wordPromptPlayed = ok;
  dom.wordPrompt.textContent = ok ? "Tap the picture you heard. Listen again if you need to." : "Tap Listen to play the word.";
}

function showWordSuccess(target) {
  state.wordSolved = true;
  dom.wordRevealImage.src = target.image;
  dom.wordRevealImage.alt = target.alt;
  dom.wordRevealText.textContent = target.word;
  dom.nextWordButton.innerHTML = state.wordRoundIndex === WORD_PRACTICE.length - 1
    ? "Finish Vocabulary <span aria-hidden=\"true\">✓</span>"
    : "Next word <span aria-hidden=\"true\">→</span>";
  dom.wordPromptButton.classList.add("is-hidden");
  dom.wordPrompt.classList.add("is-hidden");
  dom.pictureOptions.classList.add("is-hidden");
  dom.wordFeedback.classList.add("is-hidden");
  dom.wordReveal.classList.remove("is-hidden");
  dom.nextWordButton.classList.remove("is-hidden");
}

function showWordFinished() {
  state.wordFinished = true;
  state.complete.add("word");
  renderProgress();
  dom.wordRoundStatus.textContent = "VOCABULARY COMPLETE · 11 WORDS";
  dom.nextWordButton.classList.add("is-hidden");
  dom.backToPicturesButton.classList.remove("is-hidden");
}

function startOrResumeWordPractice() {
  if (!state.wordStarted || state.wordFinished) {
    resetWord();
    state.wordStarted = true;
    saveWordProgress();
  }
  showView("word");
  if (!state.wordSolved) playWordPrompt();
}

function flashWrongPicture(card) {
  const previousTimer = wrongPictureTimers.get(card);
  if (previousTimer) window.clearTimeout(previousTimer);
  card.classList.remove("is-wrong-shake");
  void card.offsetWidth;
  card.classList.add("is-wrong-shake");
  const timer = window.setTimeout(() => {
    card.classList.remove("is-wrong-shake");
    wrongPictureTimers.delete(card);
  }, 500);
  wrongPictureTimers.set(card, timer);
}

function choosePicture(card) {
  if (state.wordSolved) return;
  if (!state.wordPromptPlayed) {
    dom.wordFeedback.textContent = "Tap Listen first. Then choose a picture.";
    return;
  }
  const target = WORD_PRACTICE[state.wordRoundIndex];
  v2.work('Vocabulary', target.word, card.dataset.wordAnswer, card.dataset.wordAnswer === target.word);
  dom.pictureOptions.querySelectorAll(".picture-card").forEach((item) => {
    if (item === card) return;
    const timer = wrongPictureTimers.get(item);
    if (timer) window.clearTimeout(timer);
    wrongPictureTimers.delete(item);
    item.classList.remove("is-wrong-shake");
  });
  if (card.dataset.wordAnswer === target.word) {
    v2.cancel();
    showWordSuccess(target);
    playCorrectCue();
    saveWordProgress();
  } else {
    flashWrongPicture(card);
    dom.wordFeedback.textContent = "Almost. Listen and look again.";
    speak(target.word);
  }
}

function nextWordRound() {
  if (!state.wordSolved) return;
  if (state.wordRoundIndex === WORD_PRACTICE.length - 1) {
    clearWordRecording();
    completeZone("word", { deferCelebration: true });
    showWordFinished();
    saveWordProgress();
    return;
  }
  state.wordRoundIndex += 1;
  resetCurrentWordRound();
  saveWordProgress();
  playWordPrompt();
}

function clearWordRecording() {
  state.wordCheck?.stop();
  state.wordCheck = null;
  if (state.wordMediaRecorder?.state === "recording") state.wordMediaRecorder.stop();
  state.wordMediaStream?.getTracks().forEach((track) => track.stop());
  state.wordMediaStream = null;
  state.wordMediaRecorder = null;
  if (state.wordAudioUrl) URL.revokeObjectURL(state.wordAudioUrl);
  state.wordAudioUrl = "";
  dom.wordRecordButton.classList.remove("is-recording");
  dom.wordRecordButton.querySelector("strong").textContent = "Record my word";
  dom.wordPlayRecordingButton.classList.add("is-hidden");
  dom.wordRecordStatus.textContent = "";
}

async function toggleWordRecording() {
  if (state.wordMediaRecorder?.state === "recording") {
    state.wordMediaRecorder.stop();
    dom.wordRecordButton.classList.remove("is-recording");
    dom.wordRecordButton.querySelector("strong").textContent = "Record my word";
    dom.wordRecordStatus.textContent = "Saving your voice…";
    return;
  }
  if (!(navigator.mediaDevices && window.MediaRecorder)) {
    dom.wordRecordStatus.textContent = "Recording isn't available here. You can say the word aloud.";
    return;
  }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    if (state.currentView !== "word" || !state.wordSolved) {
      stream.getTracks().forEach((track) => track.stop());
      return;
    }
    state.wordMediaStream = stream;
    const chunks = [];
    const recordedWord = WORD_PRACTICE[state.wordRoundIndex].word;
    const recordingLearner = v2.data.active;
    const recorder = new MediaRecorder(stream);
    state.wordMediaRecorder = recorder;
    recorder.addEventListener("dataavailable", (event) => {
      if (event.data.size) chunks.push(event.data);
    });
    recorder.addEventListener("stop", () => {
      stream.getTracks().forEach((track) => track.stop());
      if(chunks.length) void v2.saveRecording(new Blob(chunks, {type:recorder.mimeType}), 'Vocabulary', recordedWord, recordingLearner);
      if (state.wordMediaRecorder !== recorder) return;
      if (state.wordAudioUrl) URL.revokeObjectURL(state.wordAudioUrl);
      state.wordAudioUrl = URL.createObjectURL(new Blob(chunks, { type: recorder.mimeType }));
      state.wordMediaStream = null;
      dom.wordPlayRecordingButton.classList.remove("is-hidden");
      dom.wordRecordStatus.textContent = "Listen to your voice or try again.";
      // DOL speech check: show whether the word was said, keep the replay button.
      const check = state.wordCheck;
      state.wordCheck = null;
      if (check) {
        dom.wordRecordStatus.textContent = "Checking…";
        const round = state.wordRoundIndex;
        check.stop().then((result) => {
          if (state.wordRoundIndex !== round || state.wordMediaRecorder !== recorder) return;
          dom.wordRecordStatus.textContent = SparkSpeech.message(result) || "Listen to your voice or try again.";
        });
      }
    });
    recorder.start();
    state.wordCheck = window.SparkSpeech?.listen(stream, recordedWord, () => {
      if (state.wordMediaRecorder === recorder && recorder.state === "recording") toggleWordRecording();
    }) || null;
    window.setTimeout(()=>{if(state.wordMediaRecorder===recorder&&recorder.state==='recording')toggleWordRecording();},15000);
    dom.wordRecordButton.classList.add("is-recording");
    dom.wordRecordButton.querySelector("strong").textContent = "Stop recording";
    dom.wordRecordStatus.textContent = `Say: ${WORD_PRACTICE[state.wordRoundIndex].word}.`;
  } catch (error) {
    dom.wordRecordStatus.textContent = "Microphone didn't start. You can still say the word aloud.";
  }
}

function playWordRecording() {
  if (state.wordAudioUrl) v2.playFile(state.wordAudioUrl);
}

function talkAnswer() {
  return v2.talkAnswer();
}

function renderTalkItem() {
  const item = TALK_ITEMS[state.talkIndex];
  dom.startTalkQuestionButton.textContent = state.talkConfirmed && state.talkIndex === TALK_ITEMS.length - 1
    ? "Practice again →" : "Let's answer! →";
  dom.talkItemImage.src = item.image;
  dom.talkItemImage.alt = item.alt;
  dom.talkRoundStatus.textContent = `WORD ${state.talkIndex + 1} OF ${TALK_ITEMS.length} · LISTEN & SPEAK`;
  dom.talkBuilderRoundStatus.textContent = `WORD ${state.talkIndex + 1} OF ${TALK_ITEMS.length} · BUILD THE ANSWER`;
  document.querySelector('#talkQuestionTitle').textContent = v2.talkQuestion();
  document.querySelector('#talkBuilderPrompt').textContent = v2.selectedFrame === 'not' ? 'Help Sparky say it correctly.' : 'What is it?';
  const chunks = v2.talkChunks();
  dom.chunkBank.replaceChildren();
  for(const chunk of [...chunks.slice(-1), ...chunks.slice(0,-1)]) {
    const button = document.createElement('button');button.type='button';button.dataset.chunk=chunk;button.textContent=chunk;dom.chunkBank.append(button);
  }
  dom.chunkButtons = [...dom.chunkBank.querySelectorAll('button')];
  dom.talkHintText.textContent = v2.talkFrame();
  renderChunks();
}

function renderChunks() {
  dom.sentenceLine.replaceChildren();
  dom.sentenceLine.classList.toggle("is-correct", state.talkConfirmed);
  dom.chunkBank.classList.toggle("is-hidden", state.talkConfirmed);
  dom.talkNextButton.classList.toggle("is-hidden", !state.talkConfirmed || state.talkAnswerPending);
  dom.talkNextButton.textContent = state.talkIndex === TALK_ITEMS.length - 1
    ? "Back to both videos →" : "Next picture →";
  if (state.talkConfirmed) {
    const sentence = document.createElement("strong");
    sentence.textContent = talkAnswer();
    dom.sentenceLine.append(sentence);
    dom.talkFeedback.textContent = "Great! Listen and say the whole sentence.";
    dom.talkFeedback.classList.add("is-positive");
  } else if (!state.chunks.length) {
    const prompt = document.createElement("span");
    prompt.textContent = "Tap the words in order";
    dom.sentenceLine.append(prompt);
  } else {
    for (const word of state.chunks) {
      const chip = document.createElement("b");
      chip.textContent = word;
      dom.sentenceLine.append(chip);
    }
  }
  dom.chunkButtons.forEach((button) => {
    button.disabled = state.talkConfirmed || state.chunks.includes(button.dataset.chunk);
  });
}

function cancelTalkAnswerPlayback() {
  window.clearTimeout(state.talkAnswerTimer);
  state.talkAnswerTimer = null;
  state.talkAnswerPending = false;
}

function resetTalk() {
  cancelTalkAnswerPlayback();
  releaseTalkMicrophone();
  state.talkIndex = 0;
  state.chunks = [];
  state.talkConfirmed = false;
  state.talkBuildLocked = false;
  state.talkStage = "intro";
  dom.talkIntroStage.classList.remove("is-hidden");
  dom.talkQuestionStage.classList.add("is-hidden");
  dom.talkBuilderStage.classList.add("is-hidden");
  renderTalkItem();
  dom.talkFeedback.textContent = "Put the words in order.";
  dom.talkFeedback.classList.remove("is-positive");
}

function showTalkStage(stage, playAudio = false) {
  v2.cancel();
  cancelTalkAnswerPlayback();
  window.speechSynthesis?.cancel();
  if (stage !== "question") releaseTalkMicrophone();
  state.talkStage = stage;
  dom.talkIntroStage.classList.toggle("is-hidden", stage !== "intro");
  dom.talkQuestionStage.classList.toggle("is-hidden", stage !== "question");
  dom.talkBuilderStage.classList.toggle("is-hidden", stage !== "builder");
  saveTalkProgress();
  if (playAudio) {
    if (stage === "intro") speakConversation();
    if (stage === "question") playTalkQuestion();
  }
}

function addChunk(button) {
  if (state.talkStage !== "builder" || state.talkConfirmed || state.talkBuildLocked) return;
  state.chunks.push(button.dataset.chunk);
  renderChunks();
  if (state.chunks.length < v2.talkChunks().length) {
    saveTalkProgress();
    return;
  }
  const answer = state.chunks.join(" ");
  v2.work('Build the answer', talkAnswer(), answer, answer === talkAnswer());
  if (answer === talkAnswer()) {
    state.talkConfirmed = true;
    state.talkAnswerPending = true;
    playCorrectCue();
    renderChunks();
    const confirmedIndex = state.talkIndex;
    state.talkAnswerTimer = window.setTimeout(async () => {
      state.talkAnswerTimer = null;
      if (state.currentView !== "talk" || state.talkStage !== "builder" ||
        !state.talkConfirmed || state.talkIndex !== confirmedIndex) return;
      await speak(talkAnswer());
      if(state.currentView !== 'talk' || state.talkStage !== 'builder' || state.talkIndex !== confirmedIndex) return;
      state.talkAnswerPending = false;
      renderChunks();
    }, 350);
    if (state.talkIndex === TALK_ITEMS.length - 1) {
      v2.learner().talkDone=[...new Set([...(v2.learner().talkDone||[]),v2.selectedFrame])];
      if(v2.learner().talkDone.length===2) completeZone("talk", { deferCelebration: true });
    }
    saveTalkProgress();
  } else {
    state.talkBuildLocked = true;
    dom.sentenceLine.classList.remove("is-wrong-shake");
    void dom.sentenceLine.offsetWidth;
    dom.sentenceLine.classList.add("is-wrong-shake");
    dom.talkFeedback.textContent = "Try again.";
    const wrongIndex=state.talkIndex,wrongFrame=v2.selectedFrame;
    window.setTimeout(() => {
      if(state.talkIndex!==wrongIndex||v2.selectedFrame!==wrongFrame)return;
      dom.sentenceLine.classList.remove("is-wrong-shake");
      state.chunks = [];
      state.talkBuildLocked = false;
      renderChunks();
      saveTalkProgress();
    }, 550);
  }
}

function nextTalkItem() {
  if (!state.talkConfirmed) return;
  cancelTalkAnswerPlayback();
  if (state.talkIndex === TALK_ITEMS.length - 1) {
    dom.startTalkQuestionButton.textContent = "Practice again →";
    v2.showVideos();
    return;
  }
  state.talkIndex += 1;
  state.chunks = [];
  state.talkConfirmed = false;
  state.talkBuildLocked = false;
  dom.sentenceLine.classList.remove("is-wrong-shake");
  dom.talkFeedback.classList.remove("is-positive");
  dom.talkFeedback.textContent = "Put the words in order.";
  renderTalkItem();
  showTalkStage("question", true);
}

function showTalkHint() {
  if (state.currentView !== "talk" || state.talkStage !== "question") return;
  dom.talkHintText.classList.remove("is-hidden");
  dom.talkHintButton.setAttribute("aria-expanded", "true");
}

function scheduleTalkHint() {
  window.clearTimeout(state.talkHintTimer);
  state.talkHintTimer = window.setTimeout(() => {
    if (!state.talkSpeechDetected) showTalkHint();
  }, 5000);
}

function stopTalkVoiceWatch() {
  window.clearTimeout(state.talkVadTimer);
  state.talkVadTimer = null;
  if (state.talkAudioContext) {
    void state.talkAudioContext.close().catch(() => {});
    state.talkAudioContext = null;
  }
}

function watchTalkSpeech(stream, epoch) {
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    const context = new AudioContextClass();
    state.talkAudioContext = context;
    const source = context.createMediaStreamSource(stream);
    const analyser = context.createAnalyser();
    analyser.fftSize = 1024;
    source.connect(analyser);
    const samples = new Uint8Array(analyser.fftSize);
    let voicedFrames = 0;
    const sample = () => {
      if (epoch !== state.talkQuestionEpoch || state.mediaRecorder?.state !== "recording") return;
      analyser.getByteTimeDomainData(samples);
      let power = 0;
      for (const value of samples) power += ((value - 128) / 128) ** 2;
      if (Math.sqrt(power / samples.length) > 0.025) voicedFrames += 1;
      else voicedFrames = Math.max(0, voicedFrames - 1);
      if (voicedFrames >= 3) {
        state.talkSpeechDetected = true;
        window.clearTimeout(state.talkHintTimer);
        return;
      }
      state.talkVadTimer = window.setTimeout(sample, 100);
    };
    sample();
  } catch (_) { /* Silence hint still works without an audio analyser. */ }
}

async function toggleRecording(automatic = false) {
  if (state.mediaRecorder?.state === "recording") {
    state.mediaRecorder.stop();
    stopTalkVoiceWatch();
    dom.recordButton.classList.remove("is-recording");
    dom.recordButton.querySelector("strong").textContent = "Record my turn";
    dom.recordStatus.textContent = "Saving your voice…";
    return;
  }

  if (!(navigator.mediaDevices && window.MediaRecorder)) {
    dom.recordStatus.textContent = "Microphone is unavailable here. Say your answer aloud, then continue.";
    dom.startTalkBuilderButton.classList.remove("is-hidden");
    return;
  }

  const epoch = state.talkQuestionEpoch;
  if (state.talkRecordingPendingEpoch === epoch) return;
  state.talkRecordingPendingEpoch = epoch;
  dom.recordStatus.textContent = automatic ? "Starting microphone…" : "Opening microphone…";
  window.setTimeout(() => {
    if (state.talkRecordingPendingEpoch !== epoch || state.currentView !== "talk" || state.talkStage !== "question") return;
    dom.recordStatus.textContent = "Allow the microphone, or continue to build the answer.";
    dom.startTalkBuilderButton.classList.remove("is-hidden");
  }, 6000);
  let stream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    if (epoch !== state.talkQuestionEpoch || state.currentView !== "talk" || state.talkStage !== "question") {
      stream.getTracks().forEach((track) => track.stop());
      return;
    }
    state.mediaStream = stream;
    const chunks = [];
    const recordedAnswer = talkAnswer();
    const recordingLearner = v2.data.active;
    const recorder = new MediaRecorder(stream);
    state.mediaRecorder = recorder;
    recorder.addEventListener("dataavailable", (event) => {
      if (event.data.size) chunks.push(event.data);
    });
    recorder.addEventListener("stop", () => {
      stream.getTracks().forEach((track) => track.stop());
      if(chunks.length) void v2.saveRecording(new Blob(chunks, {type:recorder.mimeType}), 'Talk with Sparky', recordedAnswer, recordingLearner);
      if (state.mediaRecorder !== recorder || epoch !== state.talkQuestionEpoch ||
        state.currentView !== "talk" || state.talkStage !== "question") return;
      if (state.audioUrl) URL.revokeObjectURL(state.audioUrl);
      state.audioUrl = chunks.length ? URL.createObjectURL(new Blob(chunks, { type: recorder.mimeType })) : "";
      state.mediaStream = null;
      dom.playRecordingButton.classList.toggle("is-hidden", !state.audioUrl);
      dom.startTalkBuilderButton.classList.remove("is-hidden");
      dom.recordStatus.textContent = "Voice saved on this device. Listen, try again, or continue.";
      // DOL speech check on the spoken answer.
      const check = state.talkCheck;
      state.talkCheck = null;
      if (check) {
        dom.recordStatus.textContent = "Checking…";
        check.stop().then((result) => {
          if (state.mediaRecorder !== recorder || epoch !== state.talkQuestionEpoch) return;
          const verdict = SparkSpeech.message(result);
          dom.recordStatus.textContent = verdict ? verdict + " Listen, try again, or continue." : "Voice saved on this device. Listen, try again, or continue.";
        });
      }
    });
    recorder.start();
    state.talkCheck = window.SparkSpeech?.listen(stream, recordedAnswer, () => {
      if (state.mediaRecorder === recorder && recorder.state === "recording") toggleRecording();
    }) || null;
    window.setTimeout(()=>{if(state.mediaRecorder===recorder&&recorder.state==='recording')toggleRecording();},15000);
    watchTalkSpeech(stream, epoch);
    dom.recordButton.classList.add("is-recording");
    dom.recordButton.querySelector("strong").textContent = "Stop recording";
    dom.recordStatus.textContent = "Recording… say your answer.";
  } catch (error) {
    stream?.getTracks().forEach((track) => track.stop());
    if (epoch !== state.talkQuestionEpoch) return;
    dom.recordStatus.textContent = "Microphone didn't start. Tap Record to retry, or say your answer aloud.";
    dom.startTalkBuilderButton.classList.remove("is-hidden");
  } finally {
    if (state.talkRecordingPendingEpoch === epoch) state.talkRecordingPendingEpoch = null;
  }
}

function releaseTalkMicrophone() {
  state.talkCheck?.stop();
  state.talkCheck = null;
  state.talkQuestionEpoch += 1;
  state.talkRecordingPendingEpoch = null;
  window.clearTimeout(state.talkHintTimer);
  state.talkHintTimer = null;
  stopTalkVoiceWatch();
  if (state.mediaRecorder?.state === "recording") state.mediaRecorder.stop();
  state.mediaStream?.getTracks().forEach((track) => track.stop());
  state.mediaStream = null;
  state.mediaRecorder = null;
  if (state.audioUrl) URL.revokeObjectURL(state.audioUrl);
  state.audioUrl = "";
  dom.recordButton.classList.remove("is-recording");
  dom.recordButton.querySelector("strong").textContent = "Record my turn";
}

function playRecording() {
  if (!state.audioUrl) return;
  v2.playFile(state.audioUrl);
}

function replayCurrent() {
  if (state.currentView === "sound") v2.playLetterPrompt();
  else if (state.currentView === "word") {
    if (state.wordSolved) speak(WORD_PRACTICE[state.wordRoundIndex].word);
    else playWordPrompt();
  }
  else if (state.currentView === "talk") {
    if (state.talkStage === "intro") speakConversation();
    else if (state.talkStage === "question") playTalkQuestion();
    else speak(talkAnswer());
  }
  else speak("Today's mission. Hello School!", 0.82);
}

function restartMission() {
  state.complete.clear();
  v2.learner().lettersDone=[];
  v2.learner().talkDone=[];
  v2.learner().letterSession=null;
  v2.letter=null;v2.letterStep=0;v2.letterSolved=false;
  try {
    localStorage.removeItem(v2.key(WORD_SAVE_KEY));
    localStorage.removeItem(v2.key(TALK_SAVE_KEY));
    const previousFrame=v2.selectedFrame;
    v2.selectedFrame=previousFrame==='what'?'not':'what';
    localStorage.removeItem(v2.key(TALK_SAVE_KEY));
    v2.selectedFrame=previousFrame;
  } catch (_) { /* Reset this session even if storage is unavailable. */ }
  resetSound();
  resetWord();
  resetTalk();
  renderProgress();
  showView("home");
}

document.querySelectorAll("[data-open-view]").forEach((button) => {
  button.addEventListener("click", () => {
    if (button.dataset.openView === "wordReview") closeWordGroup();
    showView(button.dataset.openView);
    if (button.dataset.openView === "talk") {
      v2.showVideos();
    }
  });
});
document.querySelectorAll("[data-nav='home']").forEach((button) => button.addEventListener("click", () => showView("welcome")));
dom.backButton.addEventListener("click", () => {
  if (state.currentView === "word") {
    saveWordProgress();
    closeWordGroup();
    showView("wordReview");
  } else if(state.currentView === 'home') showView('welcome');
  else if(state.currentView === 'sound' && v2.letter){v2.cancel();v2.letter=null;v2.renderLetters();}
  else if(state.currentView === 'talk' && state.talkStage !== 'intro') v2.showVideos();
  else showView("home");
});
dom.levelButton.addEventListener("click", () => dom.infoDialog.showModal());
dom.replayButton.addEventListener("click", replayCurrent);
dom.restartButton.addEventListener("click", restartMission);

dom.soundPromptButton.addEventListener("click", playSoundPrompt);
dom.soundAnswers.forEach((button) => button.addEventListener("click", () => chooseSoundAnswer(button)));

dom.wordGroupsBackButton.addEventListener("click", closeWordGroup);
dom.startWordPracticeButton.addEventListener("click", startOrResumeWordPractice);
dom.wordResumeButton.addEventListener("click", startOrResumeWordPractice);
dom.wordPracticeBackButton.addEventListener("click", () => {
  saveWordProgress();
  closeWordGroup();
  showView("wordReview");
});
dom.wordPromptButton.addEventListener("click", playWordPrompt);
dom.wordRecordButton.addEventListener("click", toggleWordRecording);
dom.wordPlayRecordingButton.addEventListener("click", playWordRecording);
dom.nextWordButton.addEventListener("click", nextWordRound);
dom.backToPicturesButton.addEventListener("click", () => {
  closeWordGroup();
  showView("wordReview");
});

dom.questionBubble.addEventListener("click", () => speak(v2.selectedFrame === 'not' ? "It's a desk." : "What is it?"));
dom.answerBubble.addEventListener("click", () => speak(v2.selectedFrame === 'not' ? "It's not a desk. It's a chair." : "It's a book."));
dom.playConversationButton.addEventListener("click", speakConversation);
dom.startTalkQuestionButton.addEventListener("click", () => {
  if (state.talkConfirmed && state.talkIndex === TALK_ITEMS.length - 1) {
    state.talkIndex = 0;
    state.chunks = [];
    state.talkConfirmed = false;
    dom.talkFeedback.classList.remove("is-positive");
    dom.talkFeedback.textContent = "Put the words in order.";
    renderTalkItem();
  }
  showTalkStage("question", true);
});
dom.talkQuestionBackButton.addEventListener("click", () => showTalkStage("intro", false));
dom.replayTalkQuestionButton.addEventListener("click", playTalkQuestion);
dom.startTalkBuilderButton.addEventListener("click", () => showTalkStage("builder", false));
dom.talkBuilderBackButton.addEventListener("click", () => showTalkStage("question", true));
dom.talkHintButton.addEventListener("click", () => {
  if (dom.talkHintText.classList.contains("is-hidden")) showTalkHint();
  else {
    dom.talkHintText.classList.add("is-hidden");
    dom.talkHintButton.setAttribute("aria-expanded", "false");
  }
});
dom.talkNextButton.addEventListener("click", nextTalkItem);
dom.chunkBank.addEventListener('click',event=>{const button=event.target.closest('[data-chunk]');if(button)addChunk(button);});
dom.recordButton.addEventListener("click", () => toggleRecording(false));
dom.playRecordingButton.addEventListener("click", playRecording);

resetSound();
renderWordGroupChoices();
resetWord();
resetTalk();
restoreWordProgress();
restoreTalkProgress();
renderProgress();
v2.init();
showView("welcome");
