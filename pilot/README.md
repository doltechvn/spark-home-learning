# SPARK Home Learning — Unit A teacher pilot

Letters & sounds, Vocabulary and Talk with Sparky, with Firebase class progress.

## Run / host
Serve this directory with any static HTTPS host. For GitHub Pages, publish
the main branch, root folder. Firebase web configuration is public, not an admin secret.
Authentication and Firestore security rules must be deployed before learner use.

## Important demo limits
- Only Unit A has activities. Units B–L are preview cards.
- Teachers use verified Google accounts in @dolenglish.vn; classroom access is
  enforced in Firestore rules. Admin: thanh.tran@dolenglish.vn.
- Names, progress and work summaries sync to Firebase. Individual private links
  grant learner access; share each link only with the intended family.
- With explicit in-app consent, completed Vocabulary/Talk recordings are sent to
  DOL's Vosk service. Practice feedback and recognized text sync to the class.
  Local recordings remain replayable; no cloud recording library is provided.
- No phoneme scoring. Stars reflect word/sentence recognition, not accent quality.
  Service-side audio retention is not verified: teacher-only trial before pupils.
- Microphone needs permission and a secure context.
- Letter names/spelling require the browser's Google UK English Male voice
  (en-GB), rate 1, with 500 ms gaps; Chrome is recommended. No substitute voice.
- Phonemes use supplied DOL recordings. Vocabulary and model sentences use
  prerecorded ElevenLabs audio, with 900 ms pauses between model sentences.
- Supplied video soundtracks are unchanged. Sound quality still needs review
  on the intended learner devices.

This repository contains only runtime files and required media. No private API keys,
student records, local QA state or audio-generation credentials are included.
Media rights remain with their respective owners; no reuse license is granted
by this repository.
