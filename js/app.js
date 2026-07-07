(() => {
  "use strict";
  const Q = window.KAIGO_AI_QUESTIONS;
  const CFG = window.KAIGO_AI_CONFIG || {};
  const $ = (id) => document.getElementById(id);
  const screens = ["intro", "wizard", "result", "complete"];
  const blank = () => ({serviceType:"",roleType:"",workCategory:"",problems:[],problemDetail:"",currentFlow:"",desired:[],desiredDetail:"",aiHelp:[],humanChecks:[],trialScope:"",trialPeriod:"",metrics:[]});
  let data = blank(), step = 0, output = {prompt:"", plan:""}, copied = {prompt:false,plan:false};
  const steps = [
    ["serviceType","どのような事業所・部署で使いますか","single",Q.serviceTypes],
    ["roleType","あなたの主な立場を教えてください","single",Q.roleTypes],
    ["workCategory","見直したい仕事はどれですか","cards",Q.workCategories],
    ["problems","今、どのようなことが起きていますか","multiText",Q.problemOptions,"problemDetail"],
    ["currentFlow","今は、どのような流れで仕事を進めていますか","textarea"],
    ["desired","どう変わったら良いと思いますか","multiText",Q.desiredOptions,"desiredDetail"],
    ["aiHelp","AIにどのような手伝いをしてほしいですか","multi",Q.aiHelpOptions],
    ["humanChecks","AIの回答について職員が確認・判断することは何ですか","multi",Q.humanChecks],
    ["trial","まず、どの範囲と期間で小さく試しますか","trial"],
    ["metrics","試した後、どのような変化を確認しますか","multi",Q.metrics]
  ];
  function show(name){ screens.forEach(n => $(n+"-screen").hidden = n !== name); scrollTo({top:0,behavior:"smooth"}); }
  function esc(v){ return String(v ?? "").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[c]); }
  function optionValue(o){ return typeof o === "string" ? o : o.value; }
  function optionDesc(o){ return typeof o === "string" ? "" : o.description; }
  function choice(key,o,type){ const v=optionValue(o), sel=type==="radio" ? data[key]===v : (data[key]||[]).includes(v); return `<label class="${type==='radio'?'choice-card':'choice-row'} ${sel?'is-selected':''}"><input type="${type}" name="${key}" value="${esc(v)}" ${sel?'checked':''}><strong>${esc(v)}</strong>${optionDesc(o)?`<span>${esc(optionDesc(o))}</span>`:""}</label>`; }
  function render(){
    const [key,title,type,opts,textKey]=steps[step];
    $("progress-text").textContent=`${step+1} / ${steps.length}`; $("progress-bar").style.width=`${(step+1)/steps.length*100}%`; $("back-button").disabled=step===0; $("next-button").textContent=step===steps.length-1?"計画書を作る":"次へ進む";
    let body="";
    if(type==="single"||type==="cards") body=`<div class="choice-grid">${opts.map(o=>choice(key,o,"radio")).join("")}</div>`;
    if(type==="multi") body=`<div class="choice-list">${opts.map(o=>choice(key,o,"checkbox")).join("")}</div>`;
    if(type==="multiText") body=`<div class="choice-list">${opts.map(o=>choice(key,o,"checkbox")).join("")}</div><label class="text-field"><span>補足（任意）</span><textarea id="${textKey}" rows="4" placeholder="個人名や個別ケースの詳しい内容は入力しないでください">${esc(data[textKey])}</textarea></label>`;
    if(type==="textarea") body=`<label class="text-field"><textarea id="${key}" rows="8" placeholder="例：記録を確認してから、申し送りノートへ転記し、口頭でも説明しています。個人名は入力しないでください">${esc(data[key])}</textarea></label><button type="button" class="skip-button" id="skip-flow">分からない・後で職員に確認する</button>`;
    if(type==="trial") body=`<div class="trial-grid"><fieldset><legend>試す範囲</legend>${Q.trialScopes.map(o=>choice("trialScope",o,"radio")).join("")}</fieldset><fieldset><legend>試す期間</legend>${Q.trialPeriods.map(o=>choice("trialPeriod",o,"radio")).join("")}</fieldset></div>`;
    $("question-container").innerHTML=`<div class="question-head"><p class="question-number">質問 ${step+1}</p><h1 id="wizard-title">${esc(title)}</h1><p>近いものを選んでください。正解を選ぶ必要はありません。</p></div>${[3,4,5].includes(step)?'<div class="inline-warning"><strong>個人情報は入力しないでください</strong><span>利用者名・職員名は「利用者A」「職員B」などに置き換えてください。</span></div>':''}${body}<p class="validation-message" id="validation-message"></p>`;
    $("question-container").querySelectorAll("input").forEach(i=>i.addEventListener("change",()=>{capture();render();}));
    $("skip-flow")?.addEventListener("click",()=>{data.currentFlow="【後で職員に確認する】";render();});
  }
  function capture(){
    const [key,,type,,,] = steps[step]; const root=$("question-container");
    if(["single","cards"].includes(type)) data[key]=root.querySelector(`input[name="${key}"]:checked`)?.value||data[key];
    if(type==="multi"||type==="multiText") data[key]=[...root.querySelectorAll(`input[name="${key}"]:checked`)].map(i=>i.value);
    if(type==="multiText") data[steps[step][4]]=root.querySelector("textarea")?.value.trim()||"";
    if(type==="textarea") data[key]=root.querySelector("textarea")?.value.trim()||data[key];
    if(type==="trial"){ data.trialScope=root.querySelector('input[name="trialScope"]:checked')?.value||data.trialScope; data.trialPeriod=root.querySelector('input[name="trialPeriod"]:checked')?.value||data.trialPeriod; }
  }
  function valid(){ capture(); const [key,,type]=steps[step]; let ok=true;
    if(["single","cards","textarea"].includes(type)) ok=!!data[key];
    if(["multi","multiText"].includes(type)) ok=(data[key]||[]).length>0;
    if(type==="trial") ok=!!data.trialScope&&!!data.trialPeriod;
    if(!ok) $("validation-message").textContent="選択または入力してから、次へ進んでください。"; return ok;
  }
  function makeOutput(){
    output=window.KAIGO_AI_GENERATOR.buildOutputs(data);
    $("ai-prompt").textContent=output.prompt;
    $("action-plan").textContent=output.plan;
    copied={prompt:false,plan:false};
    $("copied-confirmation").checked=false;
    $("copied-confirmation").disabled=true;
    $("privacy-confirmation").checked=false;
    $("submit-status").textContent="送信するには、依頼文と計画書をコピーしてください。";
    updateSubmit();
    show("result");
  }
  async function copy(text,kind){
    try{await navigator.clipboard.writeText(text);}catch{const t=document.createElement("textarea");t.value=text;document.body.append(t);t.select();document.execCommand("copy");t.remove();}
    if(kind==="all") copied={prompt:true,plan:true}; else copied[kind]=true;
    const allCopied=copied.prompt&&copied.plan;
    if(allCopied){
      $("copied-confirmation").checked=true;
      $("copied-confirmation").disabled=true;
      $("submit-status").textContent="コピーが完了しました。個人情報が含まれていないことを確認してください。";
    } else {
      $("submit-status").textContent="もう一方の文書もコピーしてください。";
    }
    toast("コピーしました。ご自身の文書やメモへ保存してください。");
    updateSubmit();
  }
  function updateSubmit(){ const ok=copied.prompt&&copied.plan&&$("privacy-confirmation")?.checked; $("submit-button").disabled=!ok; }
  function toast(msg){ let t=$("toast"); if(!t){t=document.createElement("div");t.id="toast";t.className="toast";document.body.append(t);} t.textContent=msg;t.classList.add("is-visible");setTimeout(()=>t.classList.remove("is-visible"),2200); }
  function receipt(){const d=new Date(), y=`${d.getFullYear()}${String(d.getMonth()+1).padStart(2,"0")}${String(d.getDate()).padStart(2,"0")}`;return `AX-${y}-${crypto.getRandomValues(new Uint32Array(1))[0].toString(36).slice(0,6).toUpperCase()}`;}
  async function submit(){ const status=$("submit-status"); if(!CFG.supabaseUrl||!CFG.supabaseAnonKey){status.textContent="Supabaseの接続設定がありません。入力内容は消去していません。";return;} $("submit-button").disabled=true;status.textContent="送信しています…";
    try{const client=window.supabase.createClient(CFG.supabaseUrl,CFG.supabaseAnonKey), no=receipt(); const {error}=await client.from(CFG.tableName||"ai_usecase_submissions").insert({receipt_number:no,app_version:CFG.appVersion||"0.1.0",service_type:data.serviceType,role_type:data.roleType,work_category:data.workCategory,ai_prompt:output.prompt,action_plan:output.plan,answers:data,status:"new"}); if(error) throw error; data=blank();output={prompt:"",plan:""};$("receipt-number").textContent=no;show("complete");}
    catch(e){console.error(e);status.textContent="送信できませんでした。入力内容は残っています。時間をおいて再送してください。";updateSubmit();}
  }
  $("start-button").onclick=()=>{step=0;render();show("wizard")};
  $("back-button").onclick=()=>{capture();if(step>0){step--;render();}};
  $("next-button").onclick=()=>{if(!valid())return;if(step<steps.length-1){step++;render();}else makeOutput();};
  $("edit-button").onclick=()=>{step=0;render();show("wizard")};
  document.querySelectorAll("[data-copy-target]").forEach(b=>b.onclick=()=>copy($(b.dataset.copyTarget).textContent,b.dataset.copyTarget==="ai-prompt"?"prompt":"plan"));
  $("copy-all-button").onclick=()=>copy(`【AIへの依頼文】\n${output.prompt}\n\n【AI活用計画書】\n${output.plan}`,"all");
  $("print-button").onclick=()=>print();
  $("privacy-confirmation").onchange=updateSubmit;
  $("submit-button").onclick=submit;
  $("clear-button").onclick=()=>{if(confirm("入力内容を消去します。コピーして保存したことを確認してください。")){data=blank();output={prompt:"",plan:""};show("intro");}};
  $("restart-button").onclick=()=>{data=blank();step=0;show("intro")};
})();
