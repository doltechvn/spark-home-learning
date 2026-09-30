/*
 * spark-speech.js — glue between the SPARK app and DOL's Vosk speech check (spark-vosk-realtime.js).
 *
 * The app keeps its own MediaRecorder (recordings are still saved and replayable); this only
 * listens to the same mic stream and asks the server "did the child say it?".
 *
 * Level for teachers: add ?level=easy | normal | strict to the URL (remembered on this device).
 */
(function () {
  'use strict';

  var LEVEL_KEY = 'spark-speech-level';
  var LEVELS = ['easy', 'normal', 'strict'];
  var LESSON_WORDS = ['pen', 'pencil', 'book', 'notebook', 'bag', 'rubber', 'desk', 'chair', 'board', 'clock', 'laptop'];
  var MESSAGES = {
    correct: '⭐⭐⭐ Great! You said it right.',
    wrong: '⭐ Not quite. Listen and try again.',
    retry: "I couldn't hear you clearly. Try again a little louder.",
    no_speech: "I didn't hear anything. Try again a little louder.",
  };

  function level() {
    var fromUrl = null;
    try { fromUrl = new URLSearchParams(location.search).get('level'); } catch (_) {}
    if (LEVELS.indexOf(fromUrl) !== -1) {
      try { localStorage.setItem(LEVEL_KEY, fromUrl); } catch (_) {}
      return fromUrl;
    }
    try {
      var saved = localStorage.getItem(LEVEL_KEY);
      if (LEVELS.indexOf(saved) !== -1) return saved;
    } catch (_) {}
    return 'normal';
  }

  /**
   * Listen to an open mic stream for `target`.
   * onAutoStop(): called when the check ends by itself (said it right, or went quiet) so the app
   *               can stop its recorder; not called after stop().
   * Returns { stop(): Promise<result|null> } or null when the checker is unavailable.
   */
  function listen(stream, target, onAutoStop) {
    if (!window.SparkVosk || !stream) return null;
    var stopped = false;
    var ready = window.SparkVosk.start({ stream: stream, target: target, distractors: LESSON_WORDS, level: level(), env: 'prod' })
      .then(function (session) {
        session.done.then(function () { if (!stopped && onAutoStop) onAutoStop(); });
        if (stopped) session.stop();
        return session;
      })
      .catch(function () { return null; });
    return {
      stop: function () {
        stopped = true;
        return ready.then(function (session) { return session ? session.stop() : null; });
      },
    };
  }

  function message(result) {
    return result ? MESSAGES[result.verdict] || '' : '';
  }

  window.SparkSpeech = { listen: listen, message: message, level: level };
})();
