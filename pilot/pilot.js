import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js';
import { getAuth, GoogleAuthProvider, signInWithPopup, signInAnonymously, signOut, onAuthStateChanged, setPersistence, browserSessionPersistence, connectAuthEmulator, signInWithCredential } from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js';
import { getFirestore, doc, collection, getDoc, getDocs, setDoc, updateDoc, writeBatch, query, where, serverTimestamp, runTransaction, onSnapshot, connectFirestoreEmulator } from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js';
import { firebaseConfig } from './firebase-config.js';
import { ADMIN_EMAIL, teacherIdentity, parseRoster, newCode, cleanCode, displayCode, rosterCSV } from './pilot-core.mjs';

// Local-only QA targets the isolated demo project; never the live Firebase project.
const emulated = location.hostname==='localhost' && new URLSearchParams(location.search).get('testBackend')==='1';
const app = initializeApp(emulated?{projectId:'demo-spark-pilot',apiKey:'demo-key',authDomain:'localhost'}:firebaseConfig), auth = getAuth(app), db = getFirestore(app);
if(emulated){connectAuthEmulator(auth,'http://localhost:9098',{disableWarnings:true});connectFirestoreEmulator(db,'localhost',8089);}
function qaTeacherSignIn(){
  const admin=new URLSearchParams(location.search).get('testAdmin')==='1';
  const claims={sub:admin?'qa-admin':'qa-teacher',email:admin?ADMIN_EMAIL:'qa-teacher@dolenglish.vn',email_verified:true,name:'QA teacher',aud:'demo-spark-pilot',iss:'https://accounts.google.com',iat:Math.floor(Date.now()/1000),exp:Math.floor(Date.now()/1000)+3600};
  const encode=value=>btoa(JSON.stringify(value)).replaceAll('=','').replaceAll('+','-').replaceAll('/','_');
  return signInWithCredential(auth,GoogleAuthProvider.credential(encode({alg:'none',typ:'JWT'})+'.'+encode(claims)+'.'));
}
const $ = selector => document.querySelector(selector);
const escape = value => v2.esc(value);
const tally = (value,max) => Number.isInteger(value)?Math.max(0,Math.min(max,value)):0;
const baseURL = new URL('./', location.href).href;
const pilot = { user:null, session:null, profile:null, classroom:null, revision:0, dirty:false,
  saving:false, blocked:false, loading:true, unwatch:null, timer:null, selectedClass:null, classes:[], roster:[], generation:0 };
window.sparkPilot = pilot;
const note = (message, error=false) => { $('#cloudStatus').textContent=message; $('#cloudStatus').classList.toggle('is-error',error); };
const isTeacher = () => teacherIdentity(pilot.user);
const isAdmin = () => isTeacher() && pilot.user.email.toLowerCase()===ADMIN_EMAIL;
const progressRef = () => doc(db,'classes',pilot.session.classId,'learners',pilot.session.learnerId,'progress','unit-a');
const safeJSON = value => { try { return JSON.parse(value); } catch { return null; } };
const cacheKey = () => `spark-pilot-pending:${pilot.session.classId}:${pilot.session.learnerId}`;
const errText = error => {
  if(error?.message==='CONFLICT') return 'Có tiến độ mới từ thiết bị khác. Tải lại để tiếp tục; bản đang làm vẫn được giữ trên thiết bị này.';
  if(error?.code==='permission-denied') return 'Chưa được cấp quyền hoặc mã đã bị thu hồi. Hãy liên hệ GV.';
  if(error?.code==='auth/popup-closed-by-user') return 'Cửa sổ đăng nhập đã đóng. Bạn có thể thử lại.';
  if(error?.code==='auth/popup-blocked') return 'Trình duyệt chặn cửa sổ đăng nhập. Cho phép pop-up hoặc mở bằng Chrome.';
  if(error?.code==='auth/cancelled-popup-request') return 'Đã có yêu cầu đăng nhập. Chỉ mở một cửa sổ Google rồi chọn tài khoản.';
  if(error?.code==='auth/unauthorized-domain') return 'Địa chỉ web này chưa được bật đăng nhập. Liên hệ quản lý.';
  return 'Chưa kết nối được máy chủ. Kiểm tra mạng rồi thử lại.';
};
function emptyRuntime(){
  v2.ready=false; v2.cancel(); releaseTalkMicrophone(); clearWordRecording();
  v2.data={classes:[{id:'signed-out',name:'Chưa vào lớp',unlocked:false}],learners:[{id:'pilot-guest',name:'explorer',classId:'signed-out',work:[],snapshot:{}}],active:'pilot-guest'};
  v2.selectedFrame='what'; TALK_ITEMS=['book','pen','pencil','notebook','rubber','bag'].map(word=>WORD_ITEMS.find(x=>x.word===word));
  state.complete.clear();resetWord();resetTalk();v2.letter=null;v2.letterStep=0;v2.letterSolved=false;
  renderProgress();v2.renderWelcome();showView('welcome');v2.ready=true;
}
function capture(){
  const learner=v2.learner();
  const read=(base,frame='unit-a')=>safeJSON(localStorage.getItem(`pilot:${learner.id}:${base}:${frame}`));
  return {schema:1,learner:{lettersDone:learner.lettersDone||[],talkDone:learner.talkDone||[],letterSession:learner.letterSession||null,
    snapshot:learner.snapshot||{},work:(learner.work||[]).slice(-200).map(({clipId,...entry})=>entry)},
    word:read(WORD_SAVE_KEY),talkWhat:read(TALK_SAVE_KEY,'what'),talkNot:read(TALK_SAVE_KEY,'not')};
}
function applyPayload(payload){
  v2.ready=false;
  const learner={id:pilot.session.learnerId,name:pilot.profile.name,classId:pilot.session.classId,work:[],snapshot:{},...(payload?.learner||{})};
  // Cloud profile is authoritative for identity; progress may never rename a learner.
  learner.id=pilot.session.learnerId;learner.name=pilot.profile.name;learner.classId=pilot.session.classId;
  v2.data={classes:[{id:pilot.session.classId,...pilot.classroom}],learners:[learner],active:learner.id};
  const put=(base,frame,value)=>{const key=`pilot:${learner.id}:${base}:${frame}`; if(value)localStorage.setItem(key,JSON.stringify(value));else localStorage.removeItem(key);};
  put(WORD_SAVE_KEY,'unit-a',payload?.word);put(TALK_SAVE_KEY,'what',payload?.talkWhat);put(TALK_SAVE_KEY,'not',payload?.talkNot);
  state.complete.clear();v2.selectedFrame='what';TALK_ITEMS=['book','pen','pencil','notebook','rubber','bag'].map(word=>WORD_ITEMS.find(x=>x.word===word));
  resetWord();resetTalk();restoreWordProgress();restoreTalkProgress();v2.restoreLetters();
  if(learner.talkDone?.length===2)state.complete.add('talk');
  renderProgress();v2.renderWelcome();v2.ready=true;
}
function queueSave(){
  if(!pilot.session||pilot.loading||pilot.blocked||!v2.ready)return;
  pilot.dirty=true;pilot.generation++;
  try{localStorage.setItem(cacheKey(),JSON.stringify({revision:pilot.revision,payload:capture()}));}catch{note('Bộ nhớ thiết bị đầy. Giữ trang mở để lưu lên máy chủ.',true);}
  note(navigator.onLine?'Đang chờ đồng bộ…':'Mất mạng · tiến độ đang giữ trên thiết bị',!navigator.onLine);
  clearTimeout(pilot.timer);pilot.timer=setTimeout(()=>saveCloud(),1800);
}
async function saveCloud(){
  if(!pilot.dirty||pilot.saving||!pilot.session||pilot.blocked||pilot.loading)return;
  if(!navigator.onLine){note('Mất mạng · tiến độ đang giữ trên thiết bị',true);return;}
  pilot.saving=true; const generation=pilot.generation, session=pilot.session, ref=progressRef();
  const payload=JSON.stringify(capture()), expected=pilot.revision;
  note('Đang lưu lên máy chủ…');
  try{
    await runTransaction(db,async tx=>{const snap=await tx.get(ref);if((snap.data()?.revision||0)!==expected)throw new Error('CONFLICT');
      tx.set(ref,{payload,revision:expected+1,updatedAt:serverTimestamp(),sessionUid:pilot.user.uid});});
    if(pilot.session!==session)return;
    pilot.revision=expected+1;
    if(generation===pilot.generation){pilot.dirty=false;localStorage.removeItem(cacheKey());note('✓ Đã đồng bộ tiến độ');}
    else localStorage.setItem(cacheKey(),JSON.stringify({revision:pilot.revision,payload:capture()}));
  }catch(error){if(error.message==='CONFLICT'||error.code==='permission-denied')pilot.blocked=true;note(errText(error),true);}
  finally{pilot.saving=false;if(pilot.dirty&&!pilot.blocked) {clearTimeout(pilot.timer);pilot.timer=setTimeout(()=>saveCloud(),8000);}}
}
async function loadLearner(session){
  pilot.loading=true;pilot.session=session;
  const [profile,cls,progress]=await Promise.all([getDoc(doc(db,'classes',session.classId,'learners',session.learnerId)),getDoc(doc(db,'classes',session.classId)),getDoc(progressRef())]);
  if(!profile.exists()||!cls.exists())throw new Error('MISSING_PROFILE');
  pilot.profile=profile.data();pilot.classroom=cls.data();pilot.revision=progress.data()?.revision||0;
  let payload=safeJSON(progress.data()?.payload);const pending=safeJSON(localStorage.getItem(cacheKey()));
  pilot.blocked=false;pilot.dirty=false;
  if(pending?.revision===pilot.revision){payload=pending.payload;pilot.dirty=true;}
  else if(pending){pilot.blocked=true;note('Có bản đang làm trên thiết bị này khác bản máy chủ. Liên hệ GV trước khi tiếp tục.',true);}
  applyPayload(payload);pilot.loading=false;
  if(!pilot.blocked)note(pilot.dirty?'Đã khôi phục phần chưa đồng bộ. Bấm Save progress.':'✓ Đã tải tiến độ từ máy chủ');
  pilot.unwatch?.();pilot.unwatch=onSnapshot(doc(db,'classes',session.classId),snap=>{
    if(!snap.exists())return;pilot.classroom=snap.data();v2.data.classes[0]={id:session.classId,...pilot.classroom};v2.renderWelcome();
    if(!pilot.classroom.unlocked){showView('welcome');note('GV chưa mở Unit A cho lớp.');}
  },()=>{pilot.blocked=true;showView('welcome');note('Quyền truy cập đã thay đổi. Hãy vào lại bằng mã của GV.',true);});
  showView('welcome');
}
async function confirmCode(event){
  event?.preventDefault();const code=cleanCode($('#pilotCode').value);
  if(!/^[A-F0-9]{32}$/.test(code)){$('#pilotProfileStatus').textContent='Dán mã cá nhân đầy đủ do GV gửi nhé.';return;}
  const button=$('#checkLearnerCode');button.disabled=true;
  try{
    if(pilot.dirty){await saveCloud();if(pilot.dirty)throw new Error('UNSAVED');}
    if(!auth.currentUser)await signInAnonymously(auth);
    const invitation=await getDoc(doc(db,'invitations',code));if(!invitation.exists())throw new Error('INVALID_CODE');
    const data=invitation.data(),session={classId:data.classId,learnerId:data.learnerId,invite:code};
    await setDoc(doc(db,'sessions',auth.currentUser.uid),session);
    await loadLearner(session);
    $('#pilotNameConfirm').innerHTML=`<h3>Con là ${escape(pilot.profile.name)}?</h3><p>${escape(pilot.classroom.name)}</p><button class="primary-button" id="confirmMyName">Đúng rồi, vào học!</button>`;
    $('#confirmMyName').onclick=()=>{$('#profileDialog').close();history.replaceState(null,'',location.pathname+location.search);showView('welcome');};
    $('#pilotProfileStatus').textContent='Nếu không đúng tên, nhập lại mã hoặc hỏi GV. Không đổi tên hồ sơ của bạn khác.';
  }catch(error){$('#pilotProfileStatus').textContent=error.message==='UNSAVED'?'Chưa lưu xong tiến độ hiện tại. Kết nối lại rồi thử.':errText(error);}
  finally{button.disabled=false;}
}
function openProfile(code=''){
  v2.cancel();releaseTalkMicrophone();clearWordRecording();
  const dialog=$('#profileDialog');
  dialog.innerHTML=`<button type="button" class="dialog-close" id="pilotCloseProfile" aria-label="Close">×</button><p class="eyebrow">MY LEARNING PROFILE</p><h2>Vào lớp cùng Sparky</h2><form id="pilotJoinForm"><label>Mã cá nhân<input id="pilotCode" autocomplete="off" spellcheck="false" maxlength="64" placeholder="Dán mã GV gửi" value="${escape(code)}"></label><button id="checkLearnerCode" class="primary-button">Tìm tên của con</button></form><div id="pilotNameConfirm"></div><p id="pilotProfileStatus" role="status"></p><p class="subtle-note">Link/mã riêng chỉ dành cho con. Không chia sẻ lên nhóm công khai.</p>${pilot.user?'<button id="pilotProfileSignout" class="soft-button">Đăng xuất / đổi học viên</button>':''}`;
  $('#pilotJoinForm').onsubmit=confirmCode;$('#pilotCloseProfile').onclick=()=>dialog.close();$('#pilotProfileSignout')?.addEventListener('click',logout);
  if(!dialog.open)dialog.showModal();
}
async function logout(){
  await saveCloud();if(pilot.dirty){note('Chưa đồng bộ xong. Hãy kết nối mạng và Save progress trước khi đăng xuất.',true);return;}
  pilot.unwatch?.();pilot.unwatch=null;pilot.session=null;pilot.profile=null;pilot.classroom=null;clearTimeout(pilot.timer);
  await signOut(auth);for(const dialog of document.querySelectorAll('dialog[open]'))dialog.close();emptyRuntime();note('Đã đăng xuất.');
}
function resolveConflict(){
  if(!pilot.session){location.reload();return;}
  const dialog=$('#profileDialog');
  dialog.innerHTML='<h2>Có tiến độ mới trên thiết bị khác</h2><p>Bạn có thể giữ một bản sao phần đang làm, rồi tiếp tục từ bản mới trên máy chủ.</p><button id="downloadPending" class="soft-button">Tải bản sao đang làm</button><button id="useServerProgress" class="primary-button">Dùng tiến độ trên máy chủ</button><button id="cancelConflict" class="soft-button">Quay lại</button><p id="conflictStatus" role="status"></p>';
  $('#cancelConflict').onclick=()=>dialog.close();
  $('#downloadPending').onclick=()=>{const url=URL.createObjectURL(new Blob([localStorage.getItem(cacheKey())||'{}'],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='SPARK-progress-recovery.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
  $('#useServerProgress').onclick=async()=>{try{await getDoc(progressRef());const pending=localStorage.getItem(cacheKey());if(pending)localStorage.setItem(cacheKey()+':recovery',pending);localStorage.removeItem(cacheKey());await loadLearner(pilot.session);dialog.close();}catch(error){$('#conflictStatus').textContent=errText(error);}};
  if(!dialog.open)dialog.showModal();
}
async function openTeacher(){
  v2.cancel();releaseTalkMicrophone();clearWordRecording();
  const dialog=$('#teacherDialog');if(!dialog.open)dialog.showModal();
  const root=$('#teacherWorkspace');
  if(!isTeacher()){
    root.innerHTML='<p class="eyebrow">TEACHER PORTAL</p><h2>Lớp học của bạn</h2><p>Đăng nhập bằng tài khoản Google @dolenglish.vn.</p><button id="pilotGoogle" class="primary-button">Đăng nhập với Google</button><p id="teacherStatus" role="status"></p>';
    $('#pilotGoogle').onclick=async()=>{if(pilot.dirty){await saveCloud();$('#teacherStatus').textContent=pilot.dirty?'Hãy lưu tiến độ học viên trước khi đổi tài khoản.':'Đã lưu. Bấm Đăng nhập với Google để tiếp tục.';return;}
      const provider=new GoogleAuthProvider();provider.setCustomParameters({hd:'dolenglish.vn',prompt:'select_account'});
      try{const pending=emulated?qaTeacherSignIn():signInWithPopup(auth,provider);$('#pilotGoogle').disabled=true;await pending;if(!teacherIdentity(auth.currentUser)){$('#teacherStatus').textContent='Chỉ tài khoản Google đã xác minh @dolenglish.vn được vào cổng GV.';$('#pilotGoogle').disabled=false;return;}await openTeacher();}
      catch(error){$('#teacherStatus').textContent=errText(error)+(error.code?' ('+error.code+')':'');$('#pilotGoogle').disabled=false;}};
    return;
  }
  root.innerHTML='<p>Đang tải lớp…</p>';
  try{
    const ref=collection(db,'classes');const result=await getDocs(isAdmin()?ref:query(ref,where('ownerUid','==',pilot.user.uid)));
    pilot.classes=result.docs.map(item=>({id:item.id,...item.data()}));
    if(!pilot.classes.some(c=>c.id===pilot.selectedClass))pilot.selectedClass=pilot.classes[0]?.id||null;
    await renderTeacher();
  }catch(error){root.innerHTML=`<h2>Chưa tải được lớp</h2><p>${escape(errText(error))}</p><button id="retryTeacher" class="primary-button">Thử lại</button>`;$('#retryTeacher').onclick=openTeacher;}
}
async function renderTeacher(){
  const cls=pilot.classes.find(c=>c.id===pilot.selectedClass),root=$('#teacherWorkspace');
  root.innerHTML=`<p class="eyebrow">${isAdmin()?'ADMIN · QUẢN LÝ':'TEACHER PORTAL'}</p><h2>${isAdmin()?'Tổng quan các lớp':'Lớp học của bạn'}</h2><div class="teacher-toolbar"><span>${escape(pilot.user.email)}</span><button id="pilotSignout" class="soft-button">Đăng xuất</button></div>
    <div class="teacher-toolbar"><label>Lớp<select id="pilotClassSelect"><option value="">Chọn lớp</option>${pilot.classes.map(c=>`<option value="${c.id}" ${c.id===cls?.id?'selected':''}>${escape(c.name)}</option>`).join('')}</select></label>${!isAdmin()?'<button id="pilotNewClass" class="soft-button">＋ Tạo lớp</button>':''}<button id="pilotRefresh" class="soft-button">↻ Cập nhật</button><button id="pilotPreviewUnit" class="soft-button">Xem thử Unit A</button></div>
    <form id="pilotClassForm" class="is-hidden"><label>Tên lớp<input id="pilotClassName" required maxlength="60"></label><button class="primary-button">Tạo lớp</button></form><p id="teacherStatus" role="status"></p><div id="pilotClassContent"></div>`;
  $('#pilotSignout').onclick=logout;$('#pilotRefresh').onclick=openTeacher;
  $('#pilotPreviewUnit').onclick=async()=>{await saveCloud();if(pilot.dirty){$('#teacherStatus').textContent='Lưu tiến độ học viên trước khi xem thử.';return;}pilot.unwatch?.();pilot.unwatch=null;pilot.session=null;emptyRuntime();v2.data.classes[0].unlocked=true;v2.data.classes[0].name='GV xem thử · không lưu vào lớp';$('#teacherDialog').close();showView('home');note('GV xem thử Unit A · không ghi vào tiến độ học viên');};
  $('#pilotClassSelect').onchange=event=>{pilot.selectedClass=event.target.value;renderTeacher();};
  $('#pilotNewClass')?.addEventListener('click',()=>$('#pilotClassForm').classList.toggle('is-hidden'));
  $('#pilotClassForm').onsubmit=async event=>{event.preventDefault();const name=$('#pilotClassName').value.trim();if(!name)return;
    const submit=event.submitter;submit.disabled=true;
    try{const ref=doc(collection(db,'classes'));await setDoc(ref,{name,ownerUid:pilot.user.uid,ownerEmail:pilot.user.email,unlocked:false,createdAt:serverTimestamp(),latest:null});pilot.selectedClass=ref.id;await openTeacher();}
    catch(error){$('#teacherStatus').textContent=errText(error);submit.disabled=false;}};
  if(!cls){$('#pilotClassContent').textContent=isAdmin()?'Chưa có lớp. GV đăng nhập để tự tạo lớp và danh sách.':'Tạo lớp đầu tiên để thêm học viên.';return;}
  $('#pilotClassContent').innerHTML=`<p class="subtle-note">GV phụ trách: ${escape(cls.ownerEmail)}</p><details class="teacher-units"><summary>Unit A · ${cls.unlocked?'Đang mở':'Đang khóa'}</summary><label class="unlock-row"><input id="pilotUnlock" type="checkbox" ${cls.unlocked?'checked':''}> Mở Unit A — Hello School!</label></details><div class="teacher-toolbar"><h3>Học viên</h3><button id="pilotBulkButton" class="soft-button">＋ Dán danh sách</button><button id="pilotExport" class="soft-button">Tải mã / link</button></div><div id="pilotBulk" class="is-hidden"><label>Mỗi dòng một tên<textarea id="pilotNames" rows="6" placeholder="Nguyễn Minh An&#10;Trần Gia Bảo"></textarea></label><button id="pilotPreview" class="soft-button">Xem trước danh sách</button><div id="pilotRosterPreview"></div></div><div id="pilotLearners">Đang tải…</div><div id="pilotWork"></div><p class="subtle-note">Pilot có Vosk cho từ/câu: GV xem nội dung nhận diện và sao luyện tập; không nghe được file ghi âm từ thiết bị khác. Chưa chấm từng âm. Chỉ thử với GV trước khi xác nhận chính sách lưu audio.</p>`;
  $('#pilotUnlock').onchange=async event=>{const unlocked=event.target.checked;event.target.disabled=true;try{await updateDoc(doc(db,'classes',cls.id),{unlocked,latest:serverTimestamp()});cls.unlocked=unlocked;$('.teacher-units summary').textContent='Unit A · '+(unlocked?'Đang mở':'Đang khóa');$('#teacherStatus').textContent='Đã lưu quyền truy cập Unit A.';}catch(error){event.target.checked=!unlocked;$('#teacherStatus').textContent=errText(error);}finally{event.target.disabled=false;}};
  $('#pilotBulkButton').onclick=()=>$('#pilotBulk').classList.toggle('is-hidden');
  $('#pilotPreview').onclick=()=>previewRoster(cls);
  $('#pilotExport').onclick=()=>{const csv=rosterCSV(pilot.roster,baseURL);const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='SPARK-learner-links.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);$('#teacherStatus').textContent='Mỗi link là mã truy cập riêng. Chỉ gửi từng dòng cho đúng phụ huynh.';};
  try{
    const roster=await getDocs(collection(db,'classes',cls.id,'learners'));if(pilot.selectedClass!==cls.id)return;
    pilot.roster=roster.docs.map(row=>({id:row.id,...row.data()})).sort((a,b)=>a.name.localeCompare(b.name,'vi'));
    const rows=$('#pilotLearners');rows.replaceChildren();if(!pilot.roster.length)rows.textContent='Chưa có học viên. Dán danh sách để tạo mã hàng loạt.';
    for(const learner of pilot.roster){const row=document.createElement('button');row.className='learner-row';row.innerHTML=`<strong>${escape(learner.name)}</strong><span>Xem tiến độ & bài làm →</span>`;row.onclick=()=>viewWork(cls,learner);rows.append(row);}
  }catch(error){$('#pilotLearners').textContent=errText(error);}
}
function previewRoster(cls){
  const rows=parseRoster($('#pilotNames').value,pilot.roster.map(x=>x.name)),valid=rows.length>0&&rows.length<=40&&rows.every(x=>!x.error);
  $('#pilotRosterPreview').innerHTML=`<p>${rows.length} học viên · tối đa 40 mỗi lần</p><ol>${rows.map(row=>`<li>${escape(row.name)}${row.error?` <span class="is-error">— ${escape(row.error)}</span>`:''}</li>`).join('')}</ol><button id="pilotCreateRoster" class="primary-button" ${valid?'':'disabled'}>Tạo ${rows.length} mã cá nhân</button>`;
  $('#pilotCreateRoster').onclick=async event=>{event.target.disabled=true;$('#pilotNames').disabled=true;
    try{
      // Batches of five remain under security-rule document-access budgets.
      for(let start=0;start<rows.length;start+=5){const batch=writeBatch(db);
        for(const row of rows.slice(start,start+5)){const ref=doc(collection(db,'classes',cls.id,'learners')),code=newCode();
          batch.set(ref,{name:row.name,invite:code,createdAt:serverTimestamp()});batch.set(doc(db,'invitations',code),{classId:cls.id,learnerId:ref.id,active:true});}
        await batch.commit();}
      await renderTeacher();$('#teacherStatus').textContent='Đã tạo học viên và mã riêng. Bấm Tải mã / link để gửi cho phụ huynh.';
    }catch(error){await renderTeacher();$('#teacherStatus').textContent=`${errText(error)} Một phần danh sách có thể đã được lưu; kiểm tra danh sách trước khi thêm lại.`;}};
}
async function viewWork(cls,learner){
  const root=$('#pilotWork');root.innerHTML='<p>Đang tải bài làm…</p>';
  try{
    const snap=await getDoc(doc(db,'classes',cls.id,'learners',learner.id,'progress','unit-a'));const data=safeJSON(snap.data()?.payload);const p=data?.learner?.snapshot||{};
    const work=Array.isArray(data?.learner?.work)?data.learner.work.filter(entry=>entry&&typeof entry==='object'):[];
    root.innerHTML=`<h3>${escape(learner.name)}</h3><p>${tally(p.letters,7)}/7 letters · ${tally(p.words,11)}/11 words · ${tally(p.talkFrames,2)}/2 Talk lessons</p><p class="subtle-note">${snap.exists()?'Đồng bộ lần cuối: '+escape(snap.data().updatedAt?.toDate().toLocaleString('vi-VN')||''):'Chưa có bài làm đồng bộ.'}</p><details><summary>Link riêng & quyền truy cập</summary><input aria-label="Link riêng của học viên" readonly value="${escape(baseURL+'#learner='+learner.invite)}"><button id="copyLearnerLink" class="soft-button">Chép link</button><button id="revokeLearnerCode" class="soft-button">Thu hồi quyền truy cập mã này</button><p id="learnerCodeStatus" role="status"></p></details><div>${work.slice(-30).reverse().map(entry=>`<div class="work-row"><span>${escape(entry.kind)} · ${escape(entry.item)}</span><strong>${[1,2,3].includes(entry.stars)?'★'.repeat(entry.stars)+' · ':''}${entry.correct===true?'✓ Đúng':entry.correct===false?'↻ Thử lại':entry.verdict==='retry'?'Chưa chấm được':'Đã thực hành'}</strong><small>${escape(entry.response)} · ${escape(new Date(entry.at).toLocaleString('vi-VN'))}</small></div>`).join('')}</div>`;
    $('#copyLearnerLink').onclick=async()=>{try{await navigator.clipboard.writeText(baseURL+'#learner='+learner.invite);$('#learnerCodeStatus').textContent='Đã chép link riêng.';}catch{$('#learnerCodeStatus').textContent='Chọn ô link để chép thủ công.';}};
    $('#revokeLearnerCode').onclick=async()=>{const button=$('#revokeLearnerCode');button.disabled=true;try{await updateDoc(doc(db,'invitations',learner.invite),{active:false});$('#learnerCodeStatus').textContent='Đã thu hồi mã. Dữ liệu cũ vẫn còn; các thiết bị dùng mã này không còn quyền truy cập.';}catch(error){$('#learnerCodeStatus').textContent=errText(error);button.disabled=false;}};
  }catch(error){root.textContent=errText(error);}
}
// Replace the local-demo portal; no hidden local class/identity bypass in pilot.
v2.key=base=>`pilot:${v2.data.active}:${base}:${base.includes('talk')?v2.selectedFrame:'unit-a'}`;
v2.commit=()=>{queueSave();return true;};v2.openTeacher=openTeacher;v2.openProfile=openProfile;
v2.changeProfile=event=>event.preventDefault();
emptyRuntime();
$('#saveProgressButton').onclick=()=>{saveWordProgress();saveTalkProgress();v2.saveLetters();saveCloud();};
$('#cloudRetry').onclick=()=>pilot.blocked?resolveConflict():pilot.dirty?saveCloud():location.reload();
window.addEventListener('online',()=>saveCloud());
window.addEventListener('beforeunload',event=>{if(pilot.dirty){event.preventDefault();event.returnValue='';}});
await setPersistence(auth,browserSessionPersistence);
let offeredLink=false;
onAuthStateChanged(auth,async user=>{
  if(pilot.user?.uid!==user?.uid){pilot.unwatch?.();pilot.unwatch=null;pilot.session=null;pilot.profile=null;pilot.classroom=null;pilot.dirty=false;pilot.blocked=false;emptyRuntime();}
  pilot.user=user;pilot.loading=true;
  try{
    if(user){const session=await getDoc(doc(db,'sessions',user.uid));if(session.exists())await loadLearner(session.data());else {pilot.loading=false;note(isTeacher()?'Đã đăng nhập GV. Mở Teacher space để quản lý lớp.':'Nhập mã cá nhân do GV gửi.');}}
    else{pilot.loading=false;note('Vào bằng link/mã cá nhân, hoặc đăng nhập cổng GV.');}
  }catch(error){pilot.loading=false;note(errText(error),true);}
  const code=new URLSearchParams(location.hash.slice(1)).get('learner');if(code&&!offeredLink){offeredLink=true;openProfile(code);}
});
