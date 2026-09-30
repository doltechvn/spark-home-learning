/* Unit A review-demo additions. No credentials, network grading or cloud sync. */
const v2 = {
  qa: new URLSearchParams(location.search).get('qa') === '1',
  ready: false, epoch: 0, player: null, timers: new Set(), letter: null,
  letterStep: 0, letterSolved: false, letterHeard: false, selectedFrame: 'what',
  unitIndex: 0, teacherClass: null, audioDB: null,
  titles: ['Hello School!', 'My Toys', 'Colors & Numbers', 'My Body', 'My Family', 'On the Farm', 'Fruits & Veggies', 'Yummy Food', 'My Clothes', 'Things That Go', 'I Can Move!', 'Home Sweet Home'],
  letters: [
    {id:'A',ipa:'/æ/',file:'media_phoneme_ae.m4a',word:'pan',choices:['pan','pen','pin']},
    {id:'E',ipa:'/e/',file:'media_phoneme_e.m4a',word:'pen',choices:['pen','pan','pin']},
    {id:'I',ipa:'/ɪ/',file:'media_phoneme_i.m4a',word:'pin',choices:['pin','pan','pen']},
    {id:'O',ipa:'/ɒ/',file:'media_phoneme_o.m4a',word:'pop',choices:['pop','pan','pin']},
    {id:'U',ipa:'/ʌ/',file:'media_phoneme_u.m4a',word:'pup',choices:['pup','pen','pin']},
    {id:'P',ipa:'/p/',file:'media_phoneme_p.m4a',word:'pen',choices:['pen','net','sun']},
    {id:'N',ipa:'/n/',file:'media_phoneme_n.m4a',word:'pin',choices:['pin','pot','cup']},
  ],
  pairs: [['chair','desk'],['book','notebook'],['pen','pencil'],['bag','rubber'],['clock','board'],['desk','chair']],
  data: null,
  esc(value) { return String(value).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); },
  initData() {
    this.data={classes:[{id:'signed-out',name:'Chưa vào lớp',unlocked:false}],learners:[{id:'pilot-guest',name:'explorer',classId:'signed-out',work:[],snapshot:{}}],active:'pilot-guest'};
    this.teacherClass='signed-out';
  },
  learner() { return this.data.learners.find(x=>x.id===this.data.active); },
  classroom() { return this.data.classes.find(x=>x.id===this.learner()?.classId); },
  key(base) { return `${this.qa?'qa:':''}${base}:${this.data.active}:${this.selectedFrame && base.includes('talk') ? this.selectedFrame : 'unit-a'}`; },
  commit() {
    if(!window.sparkPilot)return false;
    try { localStorage.setItem(this.qa?'spark-demo-v2-qa':'spark-demo-v2',JSON.stringify(this.data)); return true; }
    catch (_) { this.status('Storage is full or unavailable. Progress was not saved.',true); return false; }
  },
  status(text,error=false) {
    const box=document.querySelector('#appStatus'); box.textContent=text; box.classList.toggle('is-error',error);
  },
  work(kind,item,response,correct=null,extra={}) {
    if(!this.ready) return;
    const learner=this.learner(); if(!learner) return;
    learner.work.push({at:new Date().toISOString(),kind,item,response,correct,...extra});
    learner.work=learner.work.slice(-200); this.snapshot();
  },
  snapshot() {
    if(!this.ready) return;
    const learner=this.learner();
    learner.snapshot={words:state.wordFinished?11:new Set(WORD_PRACTICE.slice(0,state.wordRoundIndex+(state.wordSolved?1:0)).map(x=>x.word)).size,
      letters:learner.lettersDone?.length||0, talkFrames:learner.talkDone?.length||0,
      talkItem:state.talkIndex+1,talkFrame:this.selectedFrame,updated:new Date().toISOString()};
    this.commit();
  },
  cancel() {
    this.epoch++;
    if(this.player){this.player.pause();this.player.currentTime=0;this.player=null;}
    window.speechSynthesis?.cancel();
    document.querySelectorAll('video').forEach(video=>video.pause());
    for(const finish of this.timers) finish(false);
    this.timers.clear();
  },
  async playFile(src,{cancel=true}={}) {
    if(cancel){this.cancel();this.status('');}
    const epoch=this.epoch;
    if(!src){this.status('This recording is not available yet.',true);return false;}
    const audio=new Audio(src);this.player=audio;
    return new Promise(resolve=>{
      let done=false;
      const finish=ok=>{if(done)return;done=true;this.timers.delete(finish);resolve(ok&&epoch===this.epoch);};
      this.timers.add(finish);
      audio.onended=()=>finish(true);
      audio.onerror=()=>{if(epoch===this.epoch)this.status('Audio could not play. Tap Listen to retry.',true);finish(false);};
      audio.play().catch(()=>{if(epoch===this.epoch)this.status('Tap Listen to start the audio.',true);finish(false);});
    });
  },
  async speech(text,{cancel=true}={}) {
    if(cancel){this.cancel();this.status('');}
    const epoch=this.epoch;
    const normalize=s=>s.toLowerCase().trim().replace(/[.!?]+$/,'');
    const sentences=text.match(/[^.!?]+[.!?]?/g)?.map(s=>s.trim()).filter(Boolean)||[text];
    const parts=sentences.length>1&&sentences.every(s=>window.SPEECH_FILES?.[normalize(s)])?sentences:[text];
    for(let i=0;i<parts.length;i++){
      if(epoch!==this.epoch)return false;
      const ok=await this.playFile(window.SPEECH_FILES?.[normalize(parts[i])],{cancel:false});
      if(!ok)return false;
      if(i<parts.length-1)await new Promise(resolve=>setTimeout(resolve,900));
    }
    return epoch===this.epoch;
  },
  async google(parts) {
    this.cancel();const epoch=this.epoch;
    const voice=window.speechSynthesis?.getVoices().find(x=>x.name==='Google UK English Male'&&x.lang.toLowerCase().replace('_','-')==='en-gb');
    if(!voice){this.status('Google UK English Male is unavailable here. Open this demo in Chrome; then tap Listen again. No substitute voice is used.',true);return false;}
    this.status('Google UK English Male · 1× · 0.5-second gaps');
    for(let i=0;i<parts.length;i++){
      if(epoch!==this.epoch)return false;
      const ok=await new Promise(resolve=>{
        let done=false;const finish=ok=>{if(done)return;done=true;this.timers.delete(finish);resolve(ok&&epoch===this.epoch);};this.timers.add(finish);
        const u=new SpeechSynthesisUtterance(parts[i]);u.voice=voice;u.lang='en-GB';u.rate=1;u.pitch=1;u.volume=1;
        u.onend=()=>finish(true);u.onerror=()=>finish(false);speechSynthesis.speak(u);
      });
      if(!ok)return false;
      if(i<parts.length-1)await new Promise(resolve=>setTimeout(resolve,500));
    }
    return epoch===this.epoch;
  },
  renderWelcome() {
    const learner=this.learner();document.querySelector('#welcomeTitle').textContent=learner?.id==='guest'?'Hello, explorer!':`Hello, ${learner.name}!`;
    document.querySelector('#classBadge').textContent=this.classroom()?.name||'My practice';
    const carousel=document.querySelector('#unitCarousel');carousel.replaceChildren();
    for(const offset of [-1,0,1]){
      const i=(this.unitIndex+offset+12)%12;const letter=String.fromCharCode(65+i);const unlocked=i===0&&this.classroom()?.unlocked!==false;
      const button=document.createElement('button');button.className=`unit-card ${offset===0?'is-center':''} ${unlocked?'is-unlocked':'is-locked'}`;
      button.innerHTML=`<span class="unit-card-status">${unlocked?'READY TO EXPLORE':i===0?'TEACHER LOCKED':'COMING LATER'}</span><strong>UNIT ${letter}</strong><h3>${this.titles[i]}</h3><span>${unlocked?'Let’s go! →':'🔒'}</span>`;
      button.setAttribute('aria-label',`Unit ${letter}: ${this.titles[i]}, ${unlocked?'unlocked':'locked'}`);
      button.onclick=()=>{if(i!==this.unitIndex){this.unitIndex=i;this.renderWelcome();return;}if(unlocked)showView('home');else document.querySelector('#unitNotice').textContent=i===0?'Ask your teacher to unlock Unit A.':'This unit is not included in the demo yet.';};carousel.append(button);
    }
  },
  moveUnit(direction){this.unitIndex=(this.unitIndex+direction+12)%12;document.querySelector('#unitNotice').textContent='';this.renderWelcome();},
  renderLetters() {
    const root=document.querySelector('#lettersWorkspace');root.replaceChildren();
    const title=document.createElement('div');title.className='lesson-heading';title.innerHTML='<p class="eyebrow">UNIT A · LETTERS & SOUNDS</p><h2>Little letters. Big discoveries.</h2>';root.append(title);
    if(!this.letter){
      const grid=document.createElement('div');grid.className='letter-grid';
      this.letters.forEach(letter=>{const b=document.createElement('button');b.className='letter-choice';b.innerHTML=`<strong>${letter.id}<span>${letter.id.toLowerCase()}</span></strong><small>${this.learner().lettersDone?.includes(letter.id)?'✓ Practised':'Explore →'}</small>`;b.onclick=()=>{this.letter=letter;this.letterStep=0;this.renderLetters();};grid.append(b);});root.append(grid);return;
    }
    const letter=this.letter;
    const back=document.createElement('button');back.className='soft-button';back.textContent='← All letters';back.onclick=()=>{this.cancel();this.letter=null;this.renderLetters();};root.append(back);
    const card=document.createElement('div');card.className='phonics-card';root.append(card);
    if(this.letterStep===0){
      card.innerHTML=`<div class="sound-hero"><span>${letter.id}</span><span>${letter.id.toLowerCase()}</span></div><div class="letter-audio-actions"><button class="soft-button" data-name>🔊 Letter name</button><button class="soft-button" data-sound>🔊 Letter sound ${letter.ipa}</button></div><button class="primary-button" data-ready>Ready to practice →</button>`;
      card.querySelector('[data-name]').onclick=()=>this.google([letter.id]);card.querySelector('[data-sound]').onclick=()=>this.playFile(letter.file);
      card.querySelector('[data-ready]').onclick=()=>{this.letterStep=1;this.letterSolved=false;this.letterHeard=false;this.renderLetters();this.playLetterPrompt();};return;
    }
    if(this.letterStep>3){
      card.innerHTML=`<div class="complete-spark">✓</div><h2>Well done!</h2><p>You practised ${letter.id} and ${letter.id.toLowerCase()}.</p><button class="primary-button">Back to all letters →</button>`;
      card.querySelector('button').onclick=()=>{this.letter=null;this.letterStep=0;this.renderLetters();};return;
    }
    const stage=this.letterStep;
    card.innerHTML=`<p class="eyebrow">${letter.id}${letter.id.toLowerCase()} · ${stage} OF 3</p><h3>${['','Listen to the spelling','Which letter makes this sound?','Which word has this sound?'][stage]}</h3><button class="round-action" id="letterListen">🔊 Listen</button><div class="letter-options"></div><p id="letterFeedback" role="status">Listen, then choose.</p><button id="letterNext" class="primary-button is-hidden">${stage===3?'Finish ✓':'Next →'}</button>`;
    let options=stage===2?[letter.id,...this.letters.filter(x=>x.id!==letter.id).slice(0,2).map(x=>x.id)]:letter.choices.slice();
    const shift=this.letters.indexOf(letter)%3;options=options.slice(shift).concat(options.slice(0,shift));
    options.forEach(value=>{const b=document.createElement('button');b.className='letter-option';b.textContent=stage===2?`${value} ${value.toLowerCase()}`:value;b.onclick=()=>this.chooseLetter(value,b);card.querySelector('.letter-options').append(b);});
    card.querySelector('#letterListen').onclick=()=>this.playLetterPrompt();
    card.querySelector('#letterNext').onclick=()=>{this.cancel();this.letterStep++;this.letterSolved=false;this.letterHeard=false;if(this.letterStep>3){const learner=this.learner();learner.lettersDone=[...new Set([...(learner.lettersDone||[]),letter.id])];if(learner.lettersDone.length===7)completeZone('sound',{deferCelebration:true});}this.saveLetters();this.renderLetters();if(this.letterStep<=3)this.playLetterPrompt();};
    if(this.letterSolved){card.querySelector('#letterNext').classList.remove('is-hidden');card.querySelector('#letterFeedback').textContent='✓ That’s right!';const target=stage===2?letter.id:letter.word;[...card.querySelectorAll('.letter-option')].forEach(b=>{b.disabled=true;if(b.textContent===(stage===2?`${target} ${target.toLowerCase()}`:target))b.classList.add('is-correct');});}
  },
  async playLetterPrompt(){
    if(!this.letter||this.letterStep>3)return;const letter=this.letter,step=this.letterStep;
    this.letterHeard=false;
    const ok=step===1?await this.google([...letter.word.toUpperCase(),letter.word]):await this.playFile(letter.file);
    if(state.currentView==='sound'&&this.letter===letter&&this.letterStep===step){this.letterHeard=ok;const feedback=document.querySelector('#letterFeedback');if(feedback)feedback.textContent=ok?'Now choose. Listen again whenever you need.':'Tap Listen to retry. Check the audio message above.';}
  },
  chooseLetter(value,button){
    if(this.letterSolved)return;
    if(!this.letterHeard){document.querySelector('#letterFeedback').textContent='Listen to the whole recording first.';return;}
    const answer=this.letterStep===2?this.letter.id:this.letter.word,correct=value===answer;
    this.work('Letters & sounds',`${this.letter.id}: task ${this.letterStep}`,value,correct);
    if(!correct){flashWrongPicture(button);document.querySelector('#letterFeedback').textContent='Try again. You can listen once more.';return;}
    this.letterSolved=true;playCorrectCue();this.saveLetters();this.renderLetters();
  },
  saveLetters(){this.learner().letterSession={id:this.letter?.id||null,step:this.letterStep,solved:this.letterSolved};this.snapshot();},
  restoreLetters(){const session=this.learner().letterSession;this.letter=this.letters.find(x=>x.id===session?.id)||null;this.letterStep=Number.isInteger(session?.step)&&session.step>=0&&session.step<=4?session.step:0;this.letterSolved=!!session?.solved;if(this.learner().lettersDone?.length===7)state.complete.add('sound');this.renderLetters();},
  talkQuestion(){return this.selectedFrame==='not'?this.pairs[state.talkIndex][1]:'What is it?';},
  talkAnswer(){return this.selectedFrame==='not'?`It's not a ${this.pairs[state.talkIndex][1]}. It's a ${this.pairs[state.talkIndex][0]}.`:`It's a ${TALK_ITEMS[state.talkIndex].word}.`;},
  talkChunks(){return this.selectedFrame==='not'?["It's not",'a',`${this.pairs[state.talkIndex][1]}.`,"It's a",`${this.pairs[state.talkIndex][0]}.`]:["It's",'a',`${TALK_ITEMS[state.talkIndex].word}.`];},
  talkFrame(){return this.selectedFrame==='not'?"It's not a … It's a …":"It's a …";},
  selectTalkFrame(frame){
    saveTalkProgress();this.cancel();this.selectedFrame=frame;
    TALK_ITEMS=(frame==='not'?this.pairs.map(x=>x[0]):['book','pen','pencil','notebook','rubber','bag']).map(word=>WORD_ITEMS.find(x=>x.word===word));
    resetTalk();restoreTalkProgress();showTalkStage('intro',false);
    document.querySelector('#talkVideoChoices').classList.add('is-hidden');document.querySelector('#talkVideoDetail').classList.remove('is-hidden');
    const video=document.querySelector('#talkLessonVideo');video.src=frame==='not'?'media_talk_not.mp4':'media_talk_what.mp4';
    dom.questionBubble.textContent=frame==='not'?"It's a desk. 🔊":'What is it? 🔊';
    dom.answerBubble.textContent=frame==='not'?"It's not a desk. It's a chair. 🔊":"It's a book. 🔊";
    video.play().catch(()=>this.status('Tap Play on the video to watch.'));
  },
  showVideos(){this.cancel();releaseTalkMicrophone();showTalkStage('intro',false);document.querySelector('#talkVideoChoices').classList.remove('is-hidden');document.querySelector('#talkVideoDetail').classList.add('is-hidden');},
  async conversation(){this.cancel();this.status('');const epoch=this.epoch;const lines=this.selectedFrame==='not'?["It's a desk.","It's not a desk. It's a chair."]:['What is it?',"It's a book."];for(let i=0;i<lines.length;i++){if(epoch!==this.epoch)return;const ok=await this.speech(lines[i],{cancel:false});if(!ok)return;if(i<lines.length-1)await new Promise(r=>setTimeout(r,900));}},
  async saveRecording(blob,kind,item,learnerId=this.data.active){
    try{
      if(!blob.size)return;
      const db=await this.db();const id=crypto.randomUUID();
      await new Promise((resolve,reject)=>{const tx=db.transaction('clips','readwrite');tx.objectStore('clips').put({id,learnerId,kind,item,blob,at:new Date().toISOString()});tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);});
      const learner=this.data.learners.find(x=>x.id===learnerId);
      if(learner){learner.work.push({at:new Date().toISOString(),kind,item,response:'Voice recording',correct:null,clipId:id});learner.work=learner.work.slice(-200);this.commit();}
    }catch(_){this.status('Voice can play now, but could not be saved on this device.',true);}
  },
  db(){if(this.audioDB)return Promise.resolve(this.audioDB);return new Promise((resolve,reject)=>{const req=indexedDB.open('spark-demo-recordings',1);req.onupgradeneeded=()=>req.result.createObjectStore('clips',{keyPath:'id'});req.onsuccess=()=>{this.audioDB=req.result;resolve(req.result);};req.onerror=()=>reject(req.error);});},
  async playSaved(id){try{const db=await this.db();const clip=await new Promise((resolve,reject)=>{const req=db.transaction('clips').objectStore('clips').get(id);req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});if(clip){const url=URL.createObjectURL(clip.blob);await this.playFile(url);URL.revokeObjectURL(url);}else this.status('This recording is no longer available.',true);}catch(_){this.status('Cannot open the saved recording.',true);}},
  openProfile(){this.cancel();releaseTalkMicrophone();clearWordRecording();document.querySelector('#learnerName').value=this.learner().id==='guest'?'':this.learner().name;document.querySelector('#learnerClassCode').value=this.classroom()?.code||'';document.querySelector('#profileError').textContent='';document.querySelector('#profileDialog').showModal();},
  changeProfile(event){
    event.preventDefault();const name=document.querySelector('#learnerName').value.trim();const code=document.querySelector('#learnerClassCode').value.trim().toUpperCase();
    const classroom=code?this.data.classes.find(x=>x.code===code):this.data.classes[0];
    if(!name||!classroom){document.querySelector('#profileError').textContent='Enter your name and a class code created in this browser.';return;}
    saveWordProgress();saveTalkProgress();this.saveLetters();
    let learner=this.data.learners.find(x=>x.name.toLowerCase()===name.toLowerCase()&&x.classId===classroom.id);
    if(!learner){learner={id:crypto.randomUUID(),name,classId:classroom.id,work:[],snapshot:{}};this.data.learners.push(learner);}
    this.ready=false;this.data.active=learner.id;this.commit();state.complete.clear();resetWord();resetTalk();restoreWordProgress();restoreTalkProgress();this.restoreLetters();this.ready=true;
    if(learner.talkDone?.length===2)state.complete.add('talk');renderProgress();document.querySelector('#profileDialog').close();this.unitIndex=0;this.renderWelcome();showView('welcome');this.status(`Welcome, ${name}. Progress stays in this browser.`);
  },
  openTeacher(){this.cancel();releaseTalkMicrophone();clearWordRecording();this.snapshot();this.renderTeacher();document.querySelector('#teacherDialog').showModal();},
  renderTeacher(selectedLearner=null){
    const root=document.querySelector('#teacherWorkspace');const cls=this.data.classes.find(x=>x.id===this.teacherClass)||this.data.classes[0];this.teacherClass=cls.id;
    root.innerHTML=`<p class="eyebrow">TEACHER SPACE · LOCAL DEMO</p><h2>A little progress, every day.</h2><p class="subtle-note">No login or cloud sync in this demo. Use fictional names. Class links only find classes saved in this browser.</p><div class="teacher-toolbar"><label>Class<select id="teacherClassSelect">${this.data.classes.map(c=>`<option value="${this.esc(c.id)}" ${c.id===cls.id?'selected':''}>${this.esc(c.name)}</option>`).join('')}</select></label><button id="newClassButton" class="soft-button">＋ New class</button></div><form id="newClassForm" class="is-hidden"><label>Class name<input id="newClassName" maxlength="50" required></label><button class="soft-button">Create local demo class</button></form><div class="class-code"><div><small>CLASS CODE</small><strong>${this.esc(cls.code)}</strong></div><button id="copyClassLink" class="soft-button">Copy demo link</button></div><details class="teacher-units"><summary>Unit access · ${cls.unlocked?'Unit A unlocked':'All units locked'}</summary><label class="unlock-row"><input id="unlockUnitA" type="checkbox" ${cls.unlocked?'checked':''}> Unit A · Hello School!</label><p class="subtle-note">Units B–L are shown in the learner carousel, but their content is not in this demo.</p></details><h3>Learners & work</h3><div id="learnerRows"></div><div id="learnerWork"></div><p id="teacherStatus" role="status"></p>`;
    root.querySelector('#teacherClassSelect').onchange=e=>{this.teacherClass=e.target.value;this.renderTeacher();};
    root.querySelector('#newClassButton').onclick=()=>root.querySelector('#newClassForm').classList.toggle('is-hidden');
    root.querySelector('#newClassForm').onsubmit=e=>{e.preventDefault();const name=root.querySelector('#newClassName').value.trim();if(!name)return;let code;do{code='SP'+crypto.randomUUID().slice(0,6).toUpperCase();}while(this.data.classes.some(x=>x.code===code));const c={id:crypto.randomUUID(),name,code,unlocked:false,latest:null};this.data.classes.push(c);this.teacherClass=c.id;this.commit();this.renderTeacher();};
    root.querySelector('#unlockUnitA').onchange=e=>{cls.unlocked=e.target.checked;if(cls.unlocked)cls.latest=Date.now();this.commit();this.unitIndex=0;this.renderWelcome();if(cls.id===this.classroom()?.id&&!cls.unlocked)showView('welcome');root.querySelector('#teacherStatus').textContent='Unit access saved on this device.';};
    root.querySelector('#copyClassLink').onclick=async()=>{const url=new URL(location.href);url.hash=`class=${cls.code}`;try{await navigator.clipboard.writeText(url.href);root.querySelector('#teacherStatus').textContent='Demo link copied. It does not sync classes to other devices.';}catch(_){root.querySelector('#teacherStatus').textContent=`Copy this demo link: ${url.href}`;}};
    const learners=this.data.learners.filter(x=>x.classId===cls.id);const rows=root.querySelector('#learnerRows');
    if(!learners.length)rows.textContent='No learner profiles yet. Use Join a class to try this class code.';
    learners.forEach(learner=>{const button=document.createElement('button');button.className='learner-row';const p=learner.snapshot;button.innerHTML=`<strong>${this.esc(learner.name)}</strong><span>${p.letters||0}/7 letters · ${p.words||0}/11 words · ${p.talkFrames||0}/2 Talk lessons</span><span>View work →</span>`;button.onclick=()=>this.renderTeacher(learner.id);rows.append(button);});
    if(selectedLearner){const learner=learners.find(x=>x.id===selectedLearner);if(!learner)return;const work=root.querySelector('#learnerWork');const h=document.createElement('h3');h.textContent=`${learner.name} · recent work`;work.append(h);if(!learner.work.length)work.append('No work saved yet.');learner.work.slice(-30).reverse().forEach(entry=>{const row=document.createElement('div');row.className='work-row';row.innerHTML=`<span>${this.esc(entry.kind)} · ${this.esc(entry.item)}</span><strong>${entry.correct===true?'✓ Correct':entry.correct===false?'↻ Try again':'Recorded / not AI-scored'}</strong><small>${this.esc(entry.response)} · ${new Date(entry.at).toLocaleString()}</small>`;if(entry.clipId){const b=document.createElement('button');b.className='soft-button';b.textContent='▶ Play recording';b.onclick=()=>this.playSaved(entry.clipId);row.append(b);}work.append(row);});}
  },
  init(){
    this.openTeacher=()=>this.status('Đang kết nối cổng GV. Nếu chờ lâu, kiểm tra mạng và tải lại trang.',true);
    this.openProfile=()=>this.status('Đang kết nối hồ sơ. Nếu chờ lâu, kiểm tra mạng và tải lại trang.',true);
    this.ready=true;this.restoreLetters();if(this.learner().talkDone?.length===2)state.complete.add('talk');renderProgress();this.renderWelcome();
    document.querySelector('#previousUnit').onclick=()=>this.moveUnit(-1);document.querySelector('#nextUnit').onclick=()=>this.moveUnit(1);
    let start=null;const carousel=document.querySelector('#unitCarousel');carousel.onpointerdown=e=>{start=e.clientX;};carousel.onpointerup=e=>{if(start!==null&&Math.abs(e.clientX-start)>45)this.moveUnit(e.clientX<start?1:-1);start=null;};carousel.onpointercancel=()=>start=null;
    document.querySelector('#saveProgressButton').onclick=()=>{if(state.wordMediaRecorder?.state==='recording')toggleWordRecording();if(state.mediaRecorder?.state==='recording')toggleRecording();saveWordProgress();saveTalkProgress();this.saveLetters();if(this.commit())this.status('Progress saved on this device. You can come back later.');};
    for(const id of ['teacherButton','parentButton'])document.querySelector('#'+id).onclick=()=>this.openTeacher();
    document.querySelector('#closeTeacher').onclick=()=>{this.cancel();document.querySelector('#teacherDialog').close();};
    for(const id of ['learnerButton','joinClassButton'])document.querySelector('#'+id).onclick=()=>this.openProfile();
    document.querySelector('#closeProfile').onclick=()=>document.querySelector('#profileDialog').close();document.querySelector('#profileForm').onsubmit=e=>this.changeProfile(e);
    document.querySelectorAll('[data-talk-frame]').forEach(b=>b.onclick=()=>this.selectTalkFrame(b.dataset.talkFrame));document.querySelector('#backToVideos').onclick=()=>this.showVideos();
    document.querySelector('#talkLessonVideo').onplay=()=>{this.epoch++;if(this.player){this.player.pause();this.player=null;}window.speechSynthesis?.cancel();for(const finish of this.timers)finish(false);this.timers.clear();};
    document.querySelector('#teacherDialog').addEventListener('close',()=>this.cancel());
    window.addEventListener('pagehide',()=>{saveWordProgress();saveTalkProgress();this.saveLetters();this.cancel();releaseTalkMicrophone();clearWordRecording();});
    const join=new URLSearchParams(location.hash.slice(1)).get('class');if(join){this.openProfile();document.querySelector('#learnerClassCode').value=join;}
  }
};
v2.initData();
