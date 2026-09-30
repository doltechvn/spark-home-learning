/* Pilot adapter. Vosk transport derives from doltechvn/spark-home-learning
 * 6ef3d12f0ec0fb2071709abf7be2643fdeb2f189. No phoneme scoring here.
 * Send the completed take so a slow connection cannot lose the first words. */
(function(root){
  'use strict';
  const WORDS=['pen','pencil','book','notebook','bag','rubber','desk','chair','board','clock','laptop'];
  const normalize=text=>String(text||'').toLowerCase().replace(/[’‘]/g,"'")
    .replace(/\bit'?s\b/g,'it is').replace(/\bisn't\b/g,'is not').replace(/\baren't\b/g,'are not')
    .replace(/\b7\b/g,'seven').replace(/[^a-z0-9\s]/g,' ').replace(/\s+/g,' ').trim();
  function grade(result,target,mode){
    if(!result || result.error || !['correct','wrong'].includes(result.verdict) || !normalize(result.transcript))
      return {verdict:'retry',stars:null,transcript:String(result?.transcript||''),message:"I couldn't check that. Please try again. No star lost."};
    const heard=normalize(result.transcript),expected=normalize(target);
    const exact=heard===expected;
    // Never accept a sentence with omitted articles, contractions or changed order.
    const correct=result.verdict==='correct' && (mode==='word'||exact);
    const content=WORDS.filter(word=>expected.split(' ').includes(word));
    const partial=mode==='sentence' && !correct && content.length>0 && content.every(word=>heard.split(' ').includes(word));
    const stars=correct?3:partial?2:1;
    return {verdict:correct?'correct':'wrong',stars,transcript:String(result.transcript),
      message:correct?'⭐⭐⭐ Great! You said it right.':partial?'⭐⭐ Good words! Try the whole sentence.':'⭐ Listen and try again.'};
  }
  async function check(blob,target,mode){
    try {
      if(!root.SparkVosk) return grade(null,target,mode);
      const result=await root.SparkVosk.checkBlob(blob,{target,level:mode==='sentence'?'strict':'normal',distractors:WORDS,env:'prod'});
      return grade(result,target,mode);
    } catch(_){return grade(null,target,mode);}
  }
  let consentFor=null,consentPending=null;
  function consent(learner){
    if(consentFor===learner)return Promise.resolve(true);
    if(consentPending)return consentPending;
    const dialog=document.querySelector('#speechConsent');
    consentPending=new Promise(resolve=>{
      dialog.returnValue='';
      dialog.addEventListener('close',()=>{const yes=dialog.returnValue==='allow';if(yes)consentFor=learner;consentPending=null;resolve(yes);},{once:true});
      dialog.showModal();
    });
    return consentPending;
  }
  function autoStop(stream,stop,mode){
    let context,timer,done=false;
    const cleanup=()=>{if(done)return;done=true;clearInterval(timer);if(context)context.close().catch(()=>{});};
    try{
      context=new (root.AudioContext||root.webkitAudioContext)();
      const analyser=context.createAnalyser();analyser.fftSize=1024;
      context.createMediaStreamSource(stream).connect(analyser);
      context.resume().catch(()=>{});
      const data=new Float32Array(analyser.fftSize);let spoke=false,lastVoice=Date.now();
      timer=setInterval(()=>{analyser.getFloatTimeDomainData(data);const rms=Math.sqrt(data.reduce((sum,x)=>sum+x*x,0)/data.length);
        if(rms>0.012){spoke=true;lastVoice=Date.now();}
        if(spoke&&Date.now()-lastVoice>(mode==='sentence'?2500:1400)){cleanup();stop();}
      },150);
    }catch(_){cleanup();}
    return cleanup;
  }
  root.SparkSpeech={check,grade,normalize,consent,autoStop};
})(typeof window==='undefined'?globalThis:window);
