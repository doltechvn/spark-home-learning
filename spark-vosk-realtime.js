/*!
 * spark-vosk-realtime.js — realtime "did the child say it?" over DOL's Vosk WebSocket.
 *
 * No build step, no dependencies, no token. Drop in with <script src="spark-vosk-realtime.js">
 * and use window.SparkVosk. The WebSocket is not subject to CORS, so it works from any origin
 * (GitHub Pages included).
 *
 *   const s = await SparkVosk.start({            // call from a click (mic + audio need a gesture)
 *     target: "It's a pen.",
 *     distractors: ['pencil', 'book', 'bag'],    // other lesson words: a wrong word is heard as itself
 *     onPartial: (text) => live.textContent = text,
 *     onLevel: (v) => meter.style.width = v * 100 + '%',
 *   });
 *   const result = await s.done;                 // auto-stops after the child goes quiet
 *   // or: const result = await s.stop();        // e.g. from a "Stop" button
 *   // result = { verdict: 'correct'|'wrong'|'retry'|'no_speech', transcript, words, score, ... }
 *
 *   await SparkVosk.checkBlob(blob, { target })  // same verdict for an already-recorded Blob
 *
 * Verdicts match the HTTP API (/api/speech-check), so the two can be swapped.
 */
(function (root) {
  'use strict';

  var HOSTS = {
    int: 'wss://int.api.dolenglish.vn/speech-analyzer',
    prod: 'wss://api.dolenglish.vn/speech-analyzer',
  };
  var RATE = 16000; // the socket's recognizer is fixed at 16 kHz mono Int16 LE
  var WIRE_CHUNK = 2048; // ~128 ms per send: partials stay live without a frame per tick
  // Vosk only emits a `final` after ~1.1 s of silence (measured; there is no server timer),
  // so every stop appends 2 s of silence audio. It is sent at once, not waited out.
  var SILENCE_TAIL = RATE * 2;
  var HANDSHAKE_MS = 5000;
  var FINAL_WAIT_MS = 3000;
  // Grammar-bound Vosk scores a clearly spoken short word low (measured "a" = 0.53), and [unk]
  // now absorbs off-list speech, so the bar sits near the server's own 0.3 partial floor.
  var MIN_WORD_CONF = 0.35;
  // The server puts every homophone of a reference word into the grammar, and Vosk then splits
  // the score across words that sound identical: "its"/"it's" always comes back at exactly 0.5.
  // Undo that split by the group size (same groups as the server's HOMOPHONE_GROUPS).
  var HOMOPHONES = [['to', 'too', 'two'], ['there', 'their', "they're"], ['your', "you're"], ['its', "it's"],
    ['here', 'hear'], ['know', 'no'], ['write', 'right'], ['would', 'wood'], ['wear', 'where'], ['one', 'won'],
    ['by', 'buy', 'bye'], ['for', 'four'], ['our', 'hour'], ['sea', 'see'], ['be', 'bee'], ['new', 'knew'],
    ['night', 'knight'], ['piece', 'peace'], ['sale', 'sail'], ['sun', 'son'], ['wait', 'weight'],
    ['weak', 'week'], ['weather', 'whether'], ['which', 'witch'], ['whole', 'hole'], ['flower', 'flour'],
    ['break', 'brake'], ['bare', 'bear'], ['fair', 'fare'], ['pair', 'pear', 'pare'], ['plain', 'plane'],
    ['principal', 'principle'], ['stair', 'stare'], ['steel', 'steal'], ['tail', 'tale'], ['threw', 'through'],
    ['waist', 'waste'], ['ok', 'okay']];
  var HOMOPHONE_SIZE = {};
  HOMOPHONES.forEach(function (g) { g.forEach(function (w) { HOMOPHONE_SIZE[w] = g.length; }); });
  var RETRY_BELOW_CONF = 0.8;
  var UNK = '[unk]';
  var SETTLE_AFTER_FINAL_MS = 400;
  var ARTICLES = { a: 1, an: 1, the: 1 };
  var CONTRACTIONS = {
    "it's": 'it is', "isn't": 'is not', "that's": 'that is', "what's": 'what is',
    "there's": 'there is', "he's": 'he is', "she's": 'she is', "i'm": 'i am',
    "you're": 'you are', "we're": 'we are', "they're": 'they are', "aren't": 'are not',
    "don't": 'do not', "doesn't": 'does not', "can't": 'can not', "cannot": 'can not',
    "i've": 'i have', "let's": 'let us', "where's": 'where is', "who's": 'who is',
  };

  // ---------- verdict (same rules as the HTTP API) ----------

  var ONES = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten',
    'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
  var TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
  var ORDINAL = { one: 'first', two: 'second', three: 'third', five: 'fifth', eight: 'eighth', nine: 'ninth', twelve: 'twelfth' };

  // 7 → "seven", 21 → "twenty one", 105 → "one hundred five": the forms Vosk returns, since the
  // server spells the reference out the same way before building its grammar.
  function numberWords(n) {
    if (n < 20) return ONES[n];
    if (n < 100) return TENS[Math.floor(n / 10)] + (n % 10 ? ' ' + ONES[n % 10] : '');
    if (n < 1000) return ONES[Math.floor(n / 100)] + ' hundred' + (n % 100 ? ' ' + numberWords(n % 100) : '');
    if (n < 1000000) return numberWords(Math.floor(n / 1000)) + ' thousand' + (n % 1000 ? ' ' + numberWords(n % 1000) : '');
    return String(n);
  }

  function ordinalWords(n) {
    var words = numberWords(n).split(' ');
    var last = words.pop();
    words.push(ORDINAL[last] || (last.slice(-1) === 'y' ? last.slice(0, -1) + 'ieth' : last + 'th'));
    return words.join(' ');
  }

  function tokens(text) {
    var out = [];
    String(text || '')
      .toLowerCase()
      .replace(/(\d),(?=\d{3}\b)/g, '$1')
      .replace(/\b(\d+)(st|nd|rd|th)\b/g, function (_, d) { return ' ' + ordinalWords(+d) + ' '; })
      .replace(/\d+/g, function (d) { return ' ' + numberWords(+d) + ' '; })
      .replace(/[’‘`]/g, "'")
      .replace(/[^a-z0-9' ]+/g, ' ')
      .split(/\s+/)
      .forEach(function (w) {
        w = w.replace(/^'+|'+$/g, '');
        if (!w) return;
        (CONTRACTIONS[w] || w).split(' ').forEach(function (p) { out.push(p); });
      });
    return out;
  }

  // In-order (LCS) alignment of expected tokens to confidently heard tokens.
  function align(expected, heard) {
    var usable = heard.filter(function (h) { return h.conf >= MIN_WORD_CONF; });
    var n = expected.length, m = usable.length, i, j;
    var dp = [];
    for (i = 0; i <= n; i++) { dp.push(new Array(m + 1).fill(0)); }
    for (i = n - 1; i >= 0; i--) {
      for (j = m - 1; j >= 0; j--) {
        dp[i][j] = expected[i] === usable[j].word ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
      }
    }
    var out = [];
    i = 0; j = 0;
    while (i < n) {
      if (j < m && expected[i] === usable[j].word) { out.push(usable[j]); i++; j++; }
      else if (j < m && dp[i][j + 1] >= dp[i + 1][j]) { j++; }
      else { out.push(null); i++; }
    }
    return out;
  }

  // Lowest confidence among heard tokens that did not align to the answer (1 when none).
  function offTarget(toks, aligned) {
    var low = 1;
    toks.forEach(function (t) { if (aligned.indexOf(t) === -1) low = Math.min(low, t.conf); });
    return low;
  }

  /** heard: [{word, conf}] as Vosk returned them (contractions allowed). */
  function judge(answers, heard) {
    var toks = [], unknown = false;
    heard.forEach(function (h) {
      if (h.word === UNK) { unknown = true; return; }
      // The server lists "its" as a homophone of "it's" and often returns the bare form.
      var w = h.word === 'its' ? "it's" : h.word;
      var conf = Math.min(1, h.conf * (HOMOPHONE_SIZE[h.word] || 1));
      tokens(w).forEach(function (t) { toks.push({ word: t, conf: conf }); });
    });
    var transcript = heard.filter(function (h) { return h.word !== UNK; }).map(function (h) { return h.word; }).join(' ');
    var lowest = toks.length ? Math.min.apply(null, toks.map(function (t) { return t.conf; })) : null;
    var base = { transcript: transcript, lowestConfidence: lowest };
    if (!toks.length) return Object.assign({ verdict: unknown ? 'retry' : 'no_speech', matchedAnswer: null, words: [], score: 0 }, base);

    var best = null;
    answers.forEach(function (answer) {
      var expected = tokens(answer);
      if (!expected.length) return;
      var aligned = align(expected, toks);
      var score = aligned.filter(Boolean).length / expected.length;
      if (!best || score > best.score) best = { answer: answer, score: score, expected: expected, aligned: aligned };
    });
    if (!best) return Object.assign({ verdict: 'no_speech', matchedAnswer: null, words: [], score: 0 }, base);

    var words = best.expected.map(function (w, k) {
      var a = best.aligned[k];
      return { word: w, heard: !!a, conf: a ? a.conf : null };
    });
    var missing = words.filter(function (w) { return !w.heard; });
    var verdict;
    if (best.score === 1) verdict = 'correct';
    // The small model often drops a clearly spoken "a": an articles-only miss is not trusted.
    else if (missing.every(function (w) { return ARTICLES[w.word]; })) verdict = 'retry';
    // Only the words that make it wrong decide whether "wrong" is trusted: a shaky "its" in an
    // otherwise clear "it's a pen" must not turn a clear wrong object into a retry.
    else if (offTarget(toks, best.aligned) < RETRY_BELOW_CONF) verdict = 'retry';
    else verdict = 'wrong';
    return Object.assign({ verdict: verdict, matchedAnswer: best.answer, words: words, score: best.score }, base);
  }

  // ---------- socket session (audio-source agnostic) ----------

  function toInt16(samples) {
    var out = new Int16Array(samples.length);
    for (var i = 0; i < samples.length; i++) {
      var s = Math.max(-1, Math.min(1, samples[i]));
      out[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }
    return out.buffer;
  }

  function said(heard) {
    return heard.filter(function (h) { return h.word !== UNK; }).map(function (h) { return h.word; }).join(' ');
  }

  function uid() { return 'spark-' + Math.random().toString(36).slice(2, 10); }

  // Opens the socket and sends the grammar. Resolves once the server acknowledged it.
  function openSocket(opts) {
    var host = HOSTS[opts.env || 'int'] || opts.env;
    var answers = [opts.target].concat(opts.accept || []);
    // The server builds its grammar from referenceText, so distractors go in there too: a wrong
    // lesson word is then recognised as itself instead of being forced onto the target.
    var referenceText = answers.concat(opts.distractors || []).join(' ');
    var ws = new WebSocket(host + '/ws/transcribe-v2/' + encodeURIComponent(opts.userId || uid()));
    ws.binaryType = 'arraybuffer';
    var heard = [], partial = '', finalWaiter = null, failed = null;

    ws.onmessage = function (e) {
      var d;
      try { d = JSON.parse(e.data); } catch (_) { return; }
      if (d.error || d.type === 'error') { failed = d.error || 'server error'; if (finalWaiter) finalWaiter(true); return; }
      if (d.type === 'final') {
        var ws_ = (d.result && d.result.result) || [];
        if (ws_.length) ws_.forEach(function (w) { heard.push({ word: w.word, conf: typeof w.conf === 'number' ? w.conf : 1 }); });
        else tokens(d.text).forEach(function (w) { heard.push({ word: w, conf: 1 }); });
        partial = '';
        if (opts.onPartial) opts.onPartial(said(heard));
        if (finalWaiter) finalWaiter();
      } else if (d.type === 'partial' && d.text) {
        partial = d.text;
        if (opts.onPartial) opts.onPartial((said(heard) + ' ' + partial.replace(/\[unk\]/g, '')).replace(/\s+/g, ' ').trim());
      }
    };

    return new Promise(function (resolve, reject) {
      var t = setTimeout(function () { reject(new Error('Speech server did not answer.')); try { ws.close(); } catch (_) {} }, HANDSHAKE_MS);
      ws.onerror = function () { clearTimeout(t); reject(new Error('Could not connect to the speech server.')); };
      ws.onopen = function () { ws.send(JSON.stringify({ type: 'metadata', referenceText: referenceText, allowUnknown: true })); };
      var onAck = ws.onmessage;
      ws.onmessage = function (e) {
        if (String(e.data).indexOf('"metadata"') !== -1) {
          clearTimeout(t);
          ws.onmessage = onAck;
          ws.onerror = function () { failed = 'socket error'; if (finalWaiter) finalWaiter(true); };
          resolve(api);
        } else { onAck(e); }
      };
      var pending = [];
      var api = {
        send: function (samples16k) {
          for (var i = 0; i < samples16k.length; i++) pending.push(samples16k[i]);
          if (pending.length >= WIRE_CHUNK && ws.readyState === 1) { ws.send(toInt16(pending)); pending = []; }
        },
        finish: function () {
          return new Promise(function (done) {
            if (ws.readyState === 1) {
              if (pending.length) ws.send(toInt16(pending));
              pending = [];
              ws.send(toInt16(new Float32Array(SILENCE_TAIL)));
            }
            var debounce = null;
            var settle = function () {
              clearTimeout(timer);
              clearTimeout(debounce);
              finalWaiter = null;
              // No final in time: fall back to the last partial, scored as not fully trusted.
              if (!heard.length && partial) {
                tokens(partial.replace(/\[unk\]/g, ' ')).forEach(function (w) { heard.push({ word: w, conf: 0.6 }); });
                if (partial.indexOf(UNK) !== -1) heard.push({ word: UNK, conf: 1 });
              }
              try { ws.close(1000); } catch (_) {}
              if (failed && !heard.length) {
                done(Object.assign(judge(answers, []), { verdict: 'retry', error: failed }));
              } else { done(judge(answers, heard)); }
            };
            var timer = setTimeout(settle, FINAL_WAIT_MS);
            // Audio can still hold one more utterance when stop is pressed, so a `final` only
            // settles once no further one follows within SETTLE_AFTER_FINAL_MS.
            finalWaiter = function (now) {
              clearTimeout(debounce);
              if (now) settle(); else debounce = setTimeout(settle, SETTLE_AFTER_FINAL_MS);
            };
          });
        },
        cancel: function () { try { ws.close(1000); } catch (_) {} },
      };
    });
  }

  // Streaming linear resampler to 16 kHz that carries its phase across chunks.
  function resampler(inRate) {
    var ratio = inRate / RATE, pos = 0, prev = 0;
    return function (input) {
      if (inRate === RATE) return Array.prototype.slice.call(input);
      var out = [];
      while (Math.floor(pos) + 1 < input.length) {
        var i = Math.floor(pos), f = pos - i;
        var a = i < 0 ? prev : input[i];
        out.push(a + (input[i + 1] - a) * f);
        pos += ratio;
      }
      prev = input[input.length - 1];
      pos -= input.length;
      return out;
    };
  }

  // ---------- microphone ----------

  /**
   * opts: { target, accept?, distractors?, env?: 'int'|'prod'|wss-url, onPartial?, onLevel?,
   *         silenceStopMs? = 1200 (null = only manual stop), maxMs? = 15000 }
   * Returns { done: Promise<result>, stop(): Promise<result>, cancel() }.
   */
  function start(opts) {
    if (!opts || !opts.target) return Promise.reject(new Error('`target` is required.'));
    var Ctx = root.AudioContext || root.webkitAudioContext;
    // AudioContext is created before any await so it is still inside the click gesture.
    var ctx = new Ctx();
    var silenceStopMs = opts.silenceStopMs === undefined ? 1200 : opts.silenceStopMs;
    var maxMs = opts.maxMs || 15000;

    return openSocket(opts)
      .then(function (sock) {
        return navigator.mediaDevices
          .getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } })
          .catch(function (err) { sock.cancel(); ctx.close(); throw err; })
          .then(function (stream) { return { sock: sock, stream: stream }; });
      })
      .then(function (r) {
        if (ctx.state === 'suspended') ctx.resume();
        var src = ctx.createMediaStreamSource(r.stream);
        var proc = ctx.createScriptProcessor(4096, 1, 1);
        var sink = ctx.createGain();
        sink.gain.value = 0;
        var rs = resampler(ctx.sampleRate);
        var spoke = false, quietMs = 0, startedAt = Date.now(), stopping = null;
        var resolveDone;
        var done = new Promise(function (res) { resolveDone = res; });

        proc.onaudioprocess = function (e) {
          var input = e.inputBuffer.getChannelData(0);
          r.sock.send(rs(input));
          var sum = 0;
          for (var i = 0; i < input.length; i++) sum += input[i] * input[i];
          var level = Math.min(1, Math.sqrt(sum / input.length) * 6);
          if (opts.onLevel) opts.onLevel(level);
          var tickMs = (input.length / ctx.sampleRate) * 1000;
          if (level >= 0.15) { spoke = true; quietMs = 0; } else if (spoke) { quietMs += tickMs; }
          if ((silenceStopMs && spoke && quietMs >= silenceStopMs) || Date.now() - startedAt >= maxMs) stop();
        };
        src.connect(proc);
        proc.connect(sink);
        sink.connect(ctx.destination);

        function release() {
          proc.onaudioprocess = null;
          try { src.disconnect(); proc.disconnect(); sink.disconnect(); } catch (_) {}
          r.stream.getTracks().forEach(function (t) { t.stop(); });
          if (opts.onLevel) opts.onLevel(0);
          return ctx.close().catch(function () {});
        }
        function stop() {
          if (!stopping) {
            stopping = release()
              .then(function () { return r.sock.finish(); })
              .then(function (res) {
                // The mic heard a voice but nothing matched the grammar (off-list speech lands on
                // [unk], which the server does not echo): unsure, not silent.
                if (res.verdict === 'no_speech' && spoke) res.verdict = 'retry';
                return res;
              });
            stopping.then(resolveDone);
          }
          return stopping;
        }
        return {
          done: done,
          stop: stop,
          cancel: function () { if (!stopping) { stopping = release(); r.sock.cancel(); } },
        };
      })
      .catch(function (err) {
        if (ctx.state !== 'closed') ctx.close();
        throw err;
      });
  }

  // ---------- already-recorded audio ----------

  /** Decode a recorded Blob (webm/mp4/wav…) in the browser and check it over the socket. */
  function checkBlob(blob, opts) {
    var Ctx = root.AudioContext || root.webkitAudioContext;
    var ctx = new Ctx();
    return blob.arrayBuffer()
      .then(function (buf) {
        return new Promise(function (res, rej) { ctx.decodeAudioData(buf, res, rej); });
      })
      .then(function (audio) {
        ctx.close();
        return checkSamples(audio.getChannelData(0), audio.sampleRate, opts);
      });
  }

  /** Check raw mono Float32 samples at any sample rate. */
  function checkSamples(samples, sampleRate, opts) {
    return openSocket(opts).then(function (sock) {
      var data = resampler(sampleRate)(samples);
      for (var i = 0; i < data.length; i += WIRE_CHUNK) sock.send(data.slice(i, i + WIRE_CHUNK));
      return sock.finish();
    });
  }

  var SparkVosk = { start: start, checkBlob: checkBlob, checkSamples: checkSamples, judge: judge, tokens: tokens, HOSTS: HOSTS };
  root.SparkVosk = SparkVosk;
  if (typeof module !== 'undefined' && module.exports) module.exports = SparkVosk;
})(typeof window !== 'undefined' ? window : globalThis);
