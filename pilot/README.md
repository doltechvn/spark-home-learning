# SPARK Home Learning — Units A, B and C teacher pilot

Letters & sounds, Vocabulary and Talk with Sparky, with Firebase class progress.

## Run / host
Serve this directory with any static HTTPS host. For GitHub Pages, publish
the main branch, root folder. Firebase web configuration is public, not an admin secret.
Authentication and Firestore security rules must be deployed before learner use.

### Firestore rules
`firestore.rules` is a copy of the rules published in Firebase Console
(project `spark-home-learning` › Firestore › Rules). The Console is the live
source: edit there, Publish, then update this copy. Adding a unit needs both
its class unlock field (e.g. `unlockedD`, in the classes `update` rule and the
`lastOpenedUnit` list) and a `progress/unit-x` clause checking that field.

## Important demo limits
- Units A, B and C have activities. Units D–L are preview cards. Teachers unlock each unit separately (class fields `unlocked`, `unlockedB`, `unlockedC`); existing Unit A/B progress and learner codes remain valid.
- Unit C (Colors & Numbers) reuses approved C1–C5 lesson pictures and recordings; see `unit-c/MEDIA-SOURCES.json`.
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
