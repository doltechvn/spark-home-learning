/*!
 * spark-vosk-realtime.js — realtime "did the child say it?" over DOL's Vosk WebSocket.
 *
 * No build step, no dependencies, no token. Drop in with <script src="spark-vosk-realtime.js">
 * and use window.SparkVosk. The WebSocket is not subject to CORS, so it works from any origin
 * (GitHub Pages included).
 *
 * All judging happens on the server (the same judge as POST /api/speech-check): contractions,
 * numbers, homophones and the easy/normal/strict levels live there, not here. This file only
 * streams the microphone and reports what the server says.
 *
 *   const s = await SparkVosk.start({            // call from a click (mic + audio need a gesture)
 *     target: "It's a pen.",
 *     distractors: ['pencil', 'book', 'bag'],    // other lesson words: a wrong word is heard as itself
 *     level: 'normal',                           // 'easy' | 'normal' | 'strict'
 *     onPartial: (text, check) => live.textContent = text,
 *     onLevel: (v) => meter.style.width = v * 100 + '%',
 *   });
 *   const result = await s.done;   // stops by itself: as soon as it is right, or after silence
 *   // or: const result = await s.stop();
 *   // result = { verdict: 'correct'|'wrong'|'retry'|'no_speech', transcript, words, score, level }
 *
 *   await SparkVosk.checkBlob(blob, { target })  // same verdict for an already-recorded Blob
 */
(function (root) {
  'use strict';

  var HOSTS = {
    int: 'wss://int.api.dolenglish.vn/speech-analyzer',
    prod: 'wss://api.dolenglish.vn/speech-analyzer',
  };
  var RATE = 16000; // the socket's recognizer is fixed at 16 kHz mono Int16 LE
  var WIRE_CHUNK = 2048; // ~128 ms per send: partials stay live without a frame per tick
  var HANDSHAKE_MS = 5000;
  var RESULT_WAIT_MS = 4000;

  function toInt16(samples) {
    var out = new Int16Array(samples.length);
    for (var i = 0; i < samples.length; i++) {
      var s = Math.max(-1, Math.min(1, samples[i]));
      out[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }
    return out.buffer;
  }

  function uid() { return 'spark-' + Math.random().toString(36).slice(2, 10); }

  function emptyResult(verdict, error) {
    return { verdict: verdict, transcript: '', matchedAnswer: null, words: [], score: 0, error: error };
  }

  // Opens the socket with the check spec. Resolves once the server acknowledged it.
  function openSocket(opts) {
    var host = HOSTS[opts.env || 'prod'] || opts.env;
    var ws = new WebSocket(host + '/ws/transcribe-v2/' + encodeURIComponent(opts.userId || uid()));
    ws.binaryType = 'arraybuffer';
    var committed = '', resultWaiter = null, failed = null;

    function onMessage(e) {
      var d;
      try { d = JSON.parse(e.data); } catch (_) { return; }
      if (d.error || d.type === 'error') { failed = d.error || 'server error'; if (resultWaiter) resultWaiter(null); return; }
      if (d.type === 'result') { if (resultWaiter) resultWaiter(d.check || null); return; }
      if (d.type !== 'final' && d.type !== 'partial') return;
      var text = String(d.text || '').replace(/\[unk\]/g, ' ').replace(/\s+/g, ' ').trim();
      if (d.type === 'final') committed = (committed + ' ' + text).trim();
      var shown = d.type === 'final' ? committed : (committed + ' ' + text).trim();
      if (opts.onPartial) opts.onPartial(shown, d.check || null);
      if (opts.onCheck && d.check) opts.onCheck(d.check);
    }

    return new Promise(function (resolve, reject) {
      var t = setTimeout(function () { reject(new Error('Speech server did not answer.')); try { ws.close(); } catch (_) {} }, HANDSHAKE_MS);
      ws.onerror = function () { clearTimeout(t); reject(new Error('Could not connect to the speech server.')); };
      ws.onopen = function () {
        ws.send(JSON.stringify({
          type: 'metadata',
          check: { target: opts.target, accept: opts.accept || [], distractors: opts.distractors || [], level: opts.level || 'normal' },
        }));
      };
      ws.onmessage = function (e) {
        if (String(e.data).indexOf('"metadata"') === -1) return;
        clearTimeout(t);
        ws.onmessage = onMessage;
        ws.onerror = function () { failed = 'socket error'; if (resultWaiter) resultWaiter(null); };
        resolve(api);
      };
      var pending = [];
      var api = {
        send: function (samples16k) {
          for (var i = 0; i < samples16k.length; i++) pending.push(samples16k[i]);
          if (pending.length >= WIRE_CHUNK && ws.readyState === 1) { ws.send(toInt16(pending)); pending = []; }
        },
        // Flush and ask the server for the verdict over the whole take.
        finish: function () {
          return new Promise(function (done) {
            var timer = setTimeout(function () { settle(null); }, RESULT_WAIT_MS);
            function settle(check) {
              clearTimeout(timer);
              resultWaiter = null;
              try { ws.close(1000); } catch (_) {}
              done(check || emptyResult('retry', failed || 'no result from the speech server'));
            }
            resultWaiter = settle;
            if (ws.readyState !== 1) { settle(null); return; }
            if (pending.length) ws.send(toInt16(pending));
            pending = [];
            ws.send(JSON.stringify({ type: 'finish' }));
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

  /**
   * opts: { target, accept?, distractors?, level? = 'normal', env? = 'prod' ('int' | wss-url),
   *         onPartial?(text, check), onCheck?(check), onLevel?(0..1),
   *         stopOnMatch? = true (stop as soon as the server's live verdict is correct),
   *         silenceStopMs? = 1200 (null = only manual stop), maxMs? = 15000,
   *         stream? = an already-open mic MediaStream to listen to (e.g. the one your MediaRecorder
   *                   records). It is only tapped, never stopped: its owner keeps the mic. }
   * Returns { done: Promise<result>, stop(): Promise<result>, cancel() }.
   */
  function start(opts) {
    if (!opts || !opts.target) return Promise.reject(new Error('`target` is required.'));
    var Ctx = root.AudioContext || root.webkitAudioContext;
    // AudioContext is created before any await so it is still inside the click gesture.
    var ctx = new Ctx();
    var silenceStopMs = opts.silenceStopMs === undefined ? 1200 : opts.silenceStopMs;
    var maxMs = opts.maxMs || 15000;
    var stopNow = null; // set once the mic is live
    var sockOpts = Object.assign({}, opts, {
      onCheck: function (check) {
        if (opts.onCheck) opts.onCheck(check);
        if (opts.stopOnMatch !== false && stopNow && check.verdict === 'correct') stopNow();
      },
    });

    return openSocket(sockOpts)
      .then(function (sock) {
        // One mic for everyone: tapping the caller's stream instead of opening a second one keeps
        // Safari from cutting the other recorder short.
        var mic = opts.stream
          ? Promise.resolve(opts.stream)
          : navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
        return mic
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
          if (!opts.stream) r.stream.getTracks().forEach(function (t) { t.stop(); });
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
        stopNow = stop;
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

  var SparkVosk = { start: start, checkBlob: checkBlob, checkSamples: checkSamples, HOSTS: HOSTS };
  root.SparkVosk = SparkVosk;
  if (typeof module !== 'undefined' && module.exports) module.exports = SparkVosk;
})(typeof window !== 'undefined' ? window : globalThis);
