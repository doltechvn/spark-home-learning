/* Approved Talk presentation. Scores come only from SparkSpeech, never UI fixtures. */
const talkIcons = {
  mic:'<rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10v2a7 7 0 0 0 14 0v-2M12 19v3M8 22h8"/>',
  speaker:'<path d="M11 4 5 9H2v6h3l6 5zM15 8a6 6 0 0 1 0 8M18 5a10 10 0 0 1 0 14"/>',
  arrow:'<path d="M4 12h16M13 5l7 7-7 7"/>',
  replay:'<path d="M5 7a9 9 0 1 1-2 8M5 2v6H0"/>',
  back:'<path d="M20 12H4M11 5l-7 7 7 7"/>'
};
function talkIcon(name){return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${talkIcons[name]}</svg>`;}
function talkIconButton(id,icon,label,extra=''){return `<button id="${id}" class="talk-icon ${extra}" aria-label="${label}" title="${label}" type="button">${talkIcon(icon)}</button>`;}
const talkResultStage=document.createElement('div');
talkResultStage.id='talkResultStage';talkResultStage.className='talk-stage is-hidden';
dom.talkQuestionStage.after(talkResultStage);
function talkResultShell(){
  v2.cancel();window.clearTimeout(state.talkHintTimer);stopTalkVoiceWatch();
  dom.talkIntroStage.classList.add('is-hidden');dom.talkQuestionStage.classList.add('is-hidden');dom.talkBuilderStage.classList.add('is-hidden');
  talkResultStage.classList.remove('is-hidden');
  talkResultStage.innerHTML=talkIconButton('talkResultBack','back','Back to conversation','talk-result-back');
  document.querySelector('#talkResultBack').onclick=()=>showTalkStage('intro');
}
function showTalkAssessmentPending(){
  talkResultShell();state.talkStage='checking';
  talkResultStage.insertAdjacentHTML('beforeend',`<div class="talk-checking" role="status">${talkIcon('mic')}<p>Listening…</p></div>${talkIconButton('talkResultContinue','arrow','Build the answer','talk-result-next')}`);
  document.querySelector('#talkResultContinue').onclick=()=>showTalkStage('builder');
  saveTalkProgress();
}
function showTalkAssessmentResult(result){
  talkResultShell();state.talkStage='result';
  const n=result.verdict==='retry'?0:([1,2,3].includes(result.stars)?result.stars:0),item=TALK_ITEMS[state.talkIndex];
  const stars=n?[1,2,3].map(i=>`<svg viewBox="0 0 100 100" aria-hidden="true"><path class="${i<=n?'earned':'empty'}" stroke-width="2" stroke-linejoin="round" d="M50 5 64 33 95 38 73 60 78 92 50 77 22 92 27 60 5 38 36 33Z"/></svg>`).join(''):'';
  talkResultStage.insertAdjacentHTML('beforeend',`<p class="eyebrow">WORD ${state.talkIndex+1} OF ${TALK_ITEMS.length} · LISTEN &amp; SPEAK</p><div id="talkResultSummary" tabindex="-1" class="talk-result-stars" role="img" aria-label="${n?n+' out of 3 stars':'No score. Please try recording again.'}">${stars}</div>${!n?'<p role="status">I couldn’t hear clearly. Try again.</p>':''}<img class="talk-result-picture" src="${item.image}" alt="${item.alt}"><div class="talk-result-answer"><strong>${v2.esc(talkAnswer())}</strong>${talkIconButton('talkResultModel','speaker','Hear the answer again')}</div><div class="talk-result-actions">${talkIconButton('talkResultRetry','mic','Record again','talk-mic')}${state.audioUrl?talkIconButton('talkResultReplay','replay','Hear my recording'):''}</div>${talkIconButton('talkResultContinue','arrow','Build the answer','talk-result-next')}`);
  document.querySelector('#talkResultModel').onclick=()=>speak(talkAnswer());
  document.querySelector('#talkResultReplay')?.addEventListener('click',playRecording);
  document.querySelector('#talkResultContinue').onclick=()=>showTalkStage('builder');
  document.querySelector('#talkResultRetry').onclick=()=>{
    showTalkStage('question',false);releaseTalkMicrophone();
    dom.talkQuestionRecordPanel.classList.remove('is-hidden');dom.playRecordingButton.classList.add('is-hidden');
    dom.talkHintText.textContent=talkAnswer();showTalkHint();toggleRecording(false);
  };
  document.querySelector('#talkResultSummary').focus({preventScroll:true});
  if(n===3){
    const confetti=document.createElement('div');confetti.className='talk-confetti';confetti.setAttribute('aria-hidden','true');
    confetti.innerHTML=Array.from({length:65},(_,i)=>`<i style="--left:${i*37%100}%;--delay:${i%9*.11}s;--color:${['#f9c741','#66cbb1','#72bae6','#f593a4'][i%4]};--drift:${(i%7-3)*30}px"></i>`).join('');
    talkResultStage.append(confetti);
    talkResultStage.insertAdjacentHTML('beforeend','<img class="talk-cheering" src="media_sparky_wave.png" alt="Sparky cheering">');
    playCorrectCue();
  }
  saveTalkProgress();if(n===1||n===2)speak(talkAnswer());
}
// Keep existing handlers and hidden strong text used by recorder state updates.
for(const [id,icon,label] of [['replayTalkQuestionButton','speaker','Hear the question again'],['playRecordingButton','replay','Hear my recording'],['startTalkBuilderButton','arrow','Build the answer'],['talkQuestionBackButton','back','Back to conversation']]){
  const b=document.getElementById(id);b.innerHTML=talkIcon(icon);b.classList.add('talk-icon');b.setAttribute('aria-label',label);b.title=label;
}
dom.recordButton.innerHTML=`${talkIcon('mic')}<strong class="talk-sr-only">Record my turn</strong>`;
dom.recordButton.classList.add('talk-icon','talk-mic');
