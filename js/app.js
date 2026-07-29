(() => {
  "use strict";

  const Q = window.KAIGO_AI_QUESTIONS;
  const CFG = window.KAIGO_AI_CONFIG || {};
  const $ = (id) => document.getElementById(id);
  const screens = ["intro", "wizard", "result", "complete"];

  if (!document.querySelector('link[href="assets/plan-guard.css"]')) {
    const guardStyle = document.createElement("link");
    guardStyle.rel = "stylesheet";
    guardStyle.href = "assets/plan-guard.css";
    document.head.appendChild(guardStyle);
  }

  const QUICK_WIN_OPTIONS = [
    "一つの業務に絞られている",
    "少人数で試せる",
    "1～2週間程度で試せる",
    "高額な費用がかからない",
    "うまくいかなければ元に戻せる",
    "試した後の変化を確認できる"
  ];

  const ROLE_FIELDS = [
    ["trialMembers", "試行する職員", "例：事務職員2名、サービス提供責任者1名"],
    ["aiReviewer", "AIの回答を確認する職員", "例：管理者、主任、記録担当者"],
    ["decisionMaker", "継続・修正・中止を判断する人", "例：管理者、施設長、委員会"],
    ["consultationContact", "困ったときの相談先", "例：今村、ICT担当、法人本部"]
  ];

  const SCHEDULE_FIELDS = [
    ["trialStartDate", "試行開始日"],
    ["trialEndDate", "試行終了日"],
    ["reviewDate", "振り返り日"]
  ];

  const RECOMMENDED_METRICS = {
    "同じ内容を何度も入力・転記している": ["同じ入力や転記をした回数", "かかった時間", "修正した回数"],
    "文章や資料を作るのに時間がかかる": ["かかった時間", "修正した回数", "職員の負担感"],
    "確認や聞き直しが何度も発生する": ["確認や聞き直しの回数", "伝え漏れや確認漏れの件数", "職員が迷わず使えたか"],
    "必要な情報や書類を探すのに時間がかかる": ["かかった時間", "職員が迷わず使えたか"],
    "連絡や申し送りが長く、重要なことが埋もれる": ["かかった時間", "伝え漏れや確認漏れの件数", "職員が迷わず使えたか"],
    "会議をしても意見や次の行動がまとまらない": ["かかった時間", "修正した回数", "職員が迷わず使えたか"]
  };

  const blank = () => ({
    serviceType:"", serviceTypeOther:"",
    roleType:"", roleTypeOther:"",
    workCategory:"", workCategoryOther:"", specificWork:"",
    problems:[], problemDetail:"",
    currentFlow:"", currentFlowStatus:"known", pendingWho:"", pendingBy:"", pendingUpdater:"",
    desired:[], desiredDetail:"",
    aiHelp:[], aiHelpDetail:"",
    humanChecks:[],
    metrics:[], baselineTime:"", baselineMeasurePlan:false, baselineNotes:"",
    trialScope:"", trialPeriod:"",
    quickWinChecks:[],
    trialMembers:"", aiReviewer:"", decisionMaker:"", consultationContact:"",
    trialStartDate:"", trialEndDate:"", reviewDate:"",
    planState:{isDraft:true,reasons:[],unresolvedItems:[],quickWinMissing:[],recommendedMetrics:[],recommendedMissing:[],dateWarning:false}
  });

  let data = blank();
  let step = 0;
  let output = {prompt:"", plan:""};
  let copied = {prompt:false,plan:false};

  const steps = [
    {key:"serviceType", title:"どのような事業所・部署で使いますか", type:"single", opts:Q.serviceTypes, otherKey:"serviceTypeOther"},
    {key:"roleType", title:"あなたの主な立場を教えてください", type:"single", opts:Q.roleTypes, otherKey:"roleTypeOther"},
    {key:"workCategory", title:"見直したい仕事はどれですか", type:"cards", opts:Q.workCategories, otherKey:"workCategoryOther"},
    {key:"specificWork", title:"具体的には、どの記録・書類・文章・業務場面を対象にしますか", type:"specificWork"},
    {key:"problems", title:"今、どのようなことが起きていますか", type:"multiText", opts:Q.problemOptions, textKey:"problemDetail"},
    {key:"currentFlow", title:"今は、どのような流れで仕事を進めていますか", type:"flow"},
    {key:"desired", title:"どう変わったら良いと思いますか", type:"multiText", opts:Q.desiredOptions, textKey:"desiredDetail"},
    {key:"aiHelp", title:"AIにどのような手伝いをしてほしいですか", type:"multiText", opts:Q.aiHelpOptions, textKey:"aiHelpDetail"},
    {key:"humanChecks", title:"AIの回答について職員が確認・判断することは何ですか", type:"multi", opts:Q.humanChecks},
    {key:"metrics", title:"試した後、どのような変化を確認しますか", type:"metrics"},
    {key:"trial", title:"まず、どの範囲と期間で小さく試しますか", type:"trial"},
    {key:"quickWinChecks", title:"クイックウィンとして無理なく試せる内容ですか", type:"quickWin"},
    {key:"roles", title:"誰が試し、誰が確認・判断しますか", type:"roles"},
    {key:"baseline", title:"試行前の状態を確認します", type:"baseline"},
    {key:"schedule", title:"試行開始日・終了日・振り返り日を決めます", type:"schedule"}
  ];

  function show(name){
    screens.forEach(n => $(n+"-screen").hidden = n !== name);
    scrollTo({top:0,behavior:"smooth"});
  }

  function esc(v){
    return String(v ?? "").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[c]);
  }

  function optionValue(o){ return typeof o === "string" ? o : o.value; }
  function optionDesc(o){ return typeof o === "string" ? "" : o.description; }
  function includesOther(key){ return Array.isArray(data[key]) ? data[key].includes("その他") : data[key] === "その他"; }

  function choice(key,o,type){
    const v=optionValue(o);
    const sel=type==="radio" ? data[key]===v : (data[key]||[]).includes(v);
    return `<label class="${type==='radio'?'choice-card':'choice-row'} ${sel?'is-selected':''}"><input type="${type}" name="${key}" value="${esc(v)}" ${sel?'checked':''}><strong>${esc(v)}</strong>${optionDesc(o)?`<span>${esc(optionDesc(o))}</span>`:""}</label>`;
  }

  function otherField(key, otherKey){
    if(!otherKey || !includesOther(key)) return "";
    return `<label class="text-field required-detail"><span>具体的に、どの仕事・困りごと・目指したい状態ですか。</span><textarea id="${otherKey}" rows="3" placeholder="今回扱う内容を具体的に入力してください。個人名は入力しないでください。">${esc(data[otherKey])}</textarea></label>`;
  }

  function recommendedMetrics(){
    const set=new Set();
    (data.problems||[]).forEach(problem => (RECOMMENDED_METRICS[problem]||[]).forEach(metric=>set.add(metric)));
    return [...set];
  }

  function render(){
    const def=steps[step];
    const state=computePlanState();
    $("progress-text").textContent=`${step+1} / ${steps.length}`;
    $("progress-bar").style.width=`${(step+1)/steps.length*100}%`;
    $("back-button").disabled=step===0;
    $("next-button").textContent=step===steps.length-1
      ? (state.isDraft ? "計画書の下書きを作る" : "計画書を作る")
      : "次へ進む";

    let body="";
    if(def.type==="single"||def.type==="cards"){
      body=`<div class="choice-grid">${def.opts.map(o=>choice(def.key,o,"radio")).join("")}</div>${otherField(def.key, def.otherKey)}`;
    }
    if(def.type==="specificWork") body=renderSpecificWork();
    if(def.type==="multi") body=`<div class="choice-list">${def.opts.map(o=>choice(def.key,o,"checkbox")).join("")}</div>`;
    if(def.type==="multiText"){
      const otherSelected=includesOther(def.key);
      body=`<div class="choice-list">${def.opts.map(o=>choice(def.key,o,"checkbox")).join("")}</div><label class="text-field ${otherSelected?'required-detail':''}"><span>${otherSelected?'具体的に、どの仕事・困りごと・目指したい状態ですか。':'補足（任意）'}</span><textarea id="${def.textKey}" rows="4" placeholder="個人名や個別ケースの詳しい内容は入力しないでください">${esc(data[def.textKey])}</textarea></label>`;
    }
    if(def.type==="flow") body=renderFlow();
    if(def.type==="metrics") body=renderMetrics();
    if(def.type==="trial") body=renderTrial();
    if(def.type==="quickWin") body=renderQuickWin();
    if(def.type==="roles") body=renderRoles();
    if(def.type==="baseline") body=renderBaseline();
    if(def.type==="schedule") body=renderSchedule();

    $("question-container").innerHTML=`<div class="question-head"><p class="question-number">質問 ${step+1}</p><h1 id="wizard-title">${esc(def.title)}</h1><p>近いものを選んでください。正解を選ぶ必要はありません。</p></div>${[4,5,6].includes(step)?'<div class="inline-warning"><strong>個人情報は入力しないでください</strong><span>利用者名・職員名は「利用者A」「職員B」などに置き換えてください。</span></div>':''}${body}<p class="validation-message" id="validation-message"></p>`;

    $("question-container").querySelectorAll("input, textarea").forEach(i=>i.addEventListener("input",()=>{capture(); updateFinalButtonLabel();}));
    $("question-container").querySelectorAll("input[type='radio'], input[type='checkbox']").forEach(i=>i.addEventListener("change",()=>{capture();render();}));
  }

  function updateFinalButtonLabel(){
    if(step===steps.length-1){
      $("next-button").textContent=computePlanState().isDraft ? "計画書の下書きを作る" : "計画書を作る";
    }
  }

  function renderSpecificWork(){
    return `<label class="text-field required-detail"><span>具体的な対象業務</span><textarea id="specificWork" rows="5" placeholder="例：ユニット会議後の申し送りメモを分かりやすく整える&#10;例：日々の記録メモから家族向け説明文の下書きを作る&#10;例：サービス担当者会議のメモから議事録の下書きを作る">${esc(data.specificWork)}</textarea></label><p class="field-note">「記録や書類の作成」だけでは広すぎるため、どの記録・書類・文章を対象にするかを具体化します。</p>`;
  }

  function renderFlow(){
    const mode=data.currentFlowStatus||"known";
    return `<div class="choice-list">
      <label class="choice-row ${mode==='known'?'is-selected':''}"><input type="radio" name="currentFlowStatus" value="known" ${mode==='known'?'checked':''}><strong>今の仕事の流れを入力する</strong><span>分かる範囲で構いません。</span></label>
      <label class="choice-row ${mode==='unknown'?'is-selected':''}"><input type="radio" name="currentFlowStatus" value="unknown" ${mode==='unknown'?'checked':''}><strong>後で職員に確認する</strong><span>この項目は未確定として扱います。</span></label>
    </div>
    ${mode==='unknown' ? renderPendingFields() : `<label class="text-field"><span>現在の仕事の進め方</span><textarea id="currentFlow" rows="8" placeholder="例：記録を確認してから、申し送りノートへ転記し、口頭でも説明しています。個人名は入力しないでください">${esc(data.currentFlow)}</textarea></label>`}`;
  }

  function renderPendingFields(){
    return `<div class="draft-panel"><p><strong>この項目は未確定です。</strong>試行開始前に関係職員へ確認してください。</p>
      <label class="text-field"><span>誰に確認するか</span><input type="text" id="pendingWho" value="${esc(data.pendingWho)}" placeholder="例：記録担当職員、主任、事務職員"></label>
      <label class="text-field"><span>いつまでに確認するか</span><input type="date" id="pendingBy" value="${esc(data.pendingBy)}"></label>
      <label class="text-field"><span>確認後に誰が計画書を更新するか</span><input type="text" id="pendingUpdater" value="${esc(data.pendingUpdater)}" placeholder="例：推進リーダー、管理者"></label>
    </div>`;
  }

  function renderMetrics(){
    const rec=recommendedMetrics();
    const missing=rec.filter(x=>!(data.metrics||[]).includes(x));
    const recBox=rec.length ? `<div class="draft-panel"><strong>現在の困りごとに対する推奨指標</strong><p>${rec.map(x=>`・${esc(x)}`).join("<br>")}</p>${missing.length?`<p>推奨指標が未選択の場合、業務改善効果の確認が弱くなる可能性があります。</p>`:""}</div>` : "";
    return `${recBox}<div class="choice-list">${Q.metrics.map(o=>choice("metrics",o,"checkbox")).join("")}</div>`;
  }

  function renderTrial(){
    return `<div class="trial-grid"><fieldset><legend>試す範囲</legend>${Q.trialScopes.map(o=>choice("trialScope",o,"radio")).join("")}</fieldset><fieldset><legend>試す期間</legend>${Q.trialPeriods.map(o=>choice("trialPeriod",o,"radio")).join("")}</fieldset></div>`;
  }

  function renderQuickWin(){
    const missing=QUICK_WIN_OPTIONS.filter(x=>!(data.quickWinChecks||[]).includes(x));
    return `<div class="inline-warning"><strong>小さく試せるテーマか確認します</strong><span>条件に合わない項目がある場合は、下書きとして作成されます。</span></div>
      <div class="choice-list">${QUICK_WIN_OPTIONS.map(o=>choice("quickWinChecks",o,"checkbox")).join("")}</div>
      ${missing.length?`<div class="draft-panel"><strong>対象が広すぎる可能性があります。</strong><p>もう少し小さな業務に絞ってください。</p></div>`:""}`;
  }

  function renderRoles(){
    return `<div class="field-grid">${ROLE_FIELDS.map(([key,label,placeholder])=>`<label class="text-field"><span>${label}</span><input type="text" id="${key}" value="${esc(data[key])}" placeholder="${esc(placeholder)}"></label>`).join("")}</div><p class="field-note">未入力でも下書きは作れますが、試行開始前に必ず決めてください。</p>`;
  }

  function renderBaseline(){
    const timeSelected=(data.metrics||[]).includes("かかった時間");
    return `<div class="draft-panel"><p>試行後の変化を見るために、試行前の状態を残します。正確な数値が分からない場合は、測定予定を選んでください。</p></div>
      ${timeSelected?`<label class="text-field"><span>現在、1回当たり何分程度かかっていますか。</span><input type="number" id="baselineTime" min="0" step="1" value="${esc(data.baselineTime)}" placeholder="例：15"></label>`:""}
      <label class="choice-row ${data.baselineMeasurePlan?'is-selected':''}"><input type="checkbox" name="baselineMeasurePlan" value="yes" ${data.baselineMeasurePlan?'checked':''}><strong>正確な数値が分からないため、試行開始前に3回程度測定する</strong></label>
      <label class="text-field"><span>試行前の状態メモ</span><textarea id="baselineNotes" rows="5" placeholder="例：会議録の下書き作成に毎回30分程度かかっている。修正回数は2回程度。">${esc(data.baselineNotes)}</textarea></label>`;
  }

  function renderSchedule(){
    const dateProblem=(data.currentFlowStatus==="unknown" && data.pendingBy && data.trialStartDate && data.pendingBy>data.trialStartDate);
    return `<div class="field-grid">${SCHEDULE_FIELDS.map(([key,label])=>`<label class="text-field"><span>${label}</span><input type="date" id="${key}" value="${esc(data[key])}"></label>`).join("")}</div><p class="field-note">未入力でも下書きは作れますが、振り返り日が決まるまでは試行を開始しないでください。</p>${dateProblem?`<div class="draft-panel"><strong>未確定事項の確認期限が試行開始日より後になっています。</strong><p>試行開始前に確認できる日付へ修正してください。</p></div>`:""}`;
  }

  function capture(){
    const def=steps[step];
    const root=$("question-container");
    if(!root) return;
    if(["single","cards"].includes(def.type)){
      data[def.key]=root.querySelector(`input[name="${def.key}"]:checked`)?.value||data[def.key];
      if(def.otherKey) data[def.otherKey]=root.querySelector(`#${def.otherKey}`)?.value.trim()||"";
    }
    if(def.type==="specificWork") data.specificWork=root.querySelector("#specificWork")?.value.trim()||"";
    if(def.type==="multi"||def.type==="multiText"){
      data[def.key]=[...root.querySelectorAll(`input[name="${def.key}"]:checked`)].map(i=>i.value);
      if(def.textKey) data[def.textKey]=root.querySelector(`#${def.textKey}`)?.value.trim()||"";
    }
    if(def.type==="metrics") data.metrics=[...root.querySelectorAll('input[name="metrics"]:checked')].map(i=>i.value);
    if(def.type==="flow"){
      data.currentFlowStatus=root.querySelector('input[name="currentFlowStatus"]:checked')?.value||data.currentFlowStatus||"known";
      if(data.currentFlowStatus==="unknown"){
        data.currentFlow="【後で職員に確認する】";
        data.pendingWho=root.querySelector("#pendingWho")?.value.trim()||data.pendingWho||"";
        data.pendingBy=root.querySelector("#pendingBy")?.value||data.pendingBy||"";
        data.pendingUpdater=root.querySelector("#pendingUpdater")?.value.trim()||data.pendingUpdater||"";
      }else{
        data.currentFlow=root.querySelector("#currentFlow")?.value.trim()||data.currentFlow||"";
      }
    }
    if(def.type==="trial"){
      data.trialScope=root.querySelector('input[name="trialScope"]:checked')?.value||data.trialScope;
      data.trialPeriod=root.querySelector('input[name="trialPeriod"]:checked')?.value||data.trialPeriod;
    }
    if(def.type==="quickWin") data.quickWinChecks=[...root.querySelectorAll('input[name="quickWinChecks"]:checked')].map(i=>i.value);
    if(def.type==="roles") ROLE_FIELDS.forEach(([key])=>{data[key]=root.querySelector(`#${key}`)?.value.trim()||"";});
    if(def.type==="baseline"){
      data.baselineTime=root.querySelector("#baselineTime")?.value||data.baselineTime||"";
      data.baselineMeasurePlan=!!root.querySelector('input[name="baselineMeasurePlan"]:checked');
      data.baselineNotes=root.querySelector("#baselineNotes")?.value.trim()||"";
    }
    if(def.type==="schedule") SCHEDULE_FIELDS.forEach(([key])=>{data[key]=root.querySelector(`#${key}`)?.value||"";});
  }

  function valid(){
    capture();
    const def=steps[step];
    let ok=true;
    let message="選択または入力してから、次へ進んでください。";
    if(["single","cards"].includes(def.type)) ok=!!data[def.key];
    if(def.type==="specificWork"){ ok=!!data.specificWork; message="具体的な対象業務を入力してください。"; }
    if(["multi","multiText","metrics"].includes(def.type)) ok=(data[def.key]||[]).length>0;
    if(def.type==="trial") ok=!!data.trialScope&&!!data.trialPeriod;
    if(def.type==="flow"){
      if(data.currentFlowStatus==="unknown"){
        ok=!!data.pendingWho&&!!data.pendingBy&&!!data.pendingUpdater;
        message="後で確認する場合は、誰に・いつまでに・誰が更新するかを入力してください。";
      }else ok=!!data.currentFlow;
    }
    if(def.otherKey && includesOther(def.key) && !data[def.otherKey]){ ok=false; message="「その他」を選んだ場合は、具体的な内容を入力してください。"; }
    if(def.type==="multiText" && includesOther(def.key) && !data[def.textKey]){ ok=false; message="「その他」を選んだ場合は、具体的な内容を入力してください。"; }
    if(!ok) $("validation-message").textContent=message;
    return ok;
  }

  function computePlanState(){
    const reasons=[];
    const unresolvedItems=[];
    const quickWinMissing=QUICK_WIN_OPTIONS.filter(x=>!(data.quickWinChecks||[]).includes(x));
    const rec=recommendedMetrics();
    const recMissing=rec.filter(x=>!(data.metrics||[]).includes(x));
    const dateWarning=data.currentFlowStatus==="unknown" && data.pendingBy && data.trialStartDate && data.pendingBy>data.trialStartDate;

    if(!data.specificWork) reasons.push("具体的な対象業務が未入力です");
    if(data.currentFlowStatus==="unknown"){
      reasons.push("現在の仕事の進め方が未確定です");
      unresolvedItems.push({item:"現在の仕事の進め方",message:"この項目は未確定です。試行開始前に関係職員へ確認してください。",who:data.pendingWho,by:data.pendingBy,updater:data.pendingUpdater});
    }
    if(dateWarning) reasons.push("未確定事項の確認期限が試行開始日より後になっています");
    ROLE_FIELDS.forEach(([key,label])=>{ if(!data[key]) reasons.push(`${label}が未入力です`); });

    const hasBaseline=!!data.baselineNotes||!!data.baselineTime||data.baselineMeasurePlan;
    if(!hasBaseline) reasons.push("試行前の状態が未入力です");
    if((data.metrics||[]).includes("かかった時間") && !data.baselineTime && !data.baselineMeasurePlan) reasons.push("かかった時間の試行前状態が未入力です");
    SCHEDULE_FIELDS.forEach(([key,label])=>{ if(!data[key]) reasons.push(`${label}が未入力です`); });
    if(quickWinMissing.length) reasons.push("クイックウィン適合チェックに未確認の項目があります");
    if(rec.length && recMissing.length===rec.length) reasons.push("確認する変化が、現在の困りごとに対してやや弱い可能性があります");

    return {isDraft:reasons.length>0,reasons,unresolvedItems,quickWinMissing,quickWinChecked:data.quickWinChecks||[],quickWinAll:quickWinMissing.length===0,recommendedMetrics:rec,recommendedMissing:recMissing,dateWarning};
  }

  function ensureDraftWarning(){
    let warning=$("draft-warning");
    if(!warning){
      warning=document.createElement("div");
      warning.id="draft-warning";
      warning.className="notice notice-warning";
      warning.hidden=true;
      const important=document.querySelector(".result-card .notice-important");
      important?.after(warning);
    }
    return warning;
  }

  function makeOutput(){
    capture();
    data.planState=computePlanState();
    output=window.KAIGO_AI_GENERATOR.buildOutputs(data);
    $("ai-prompt").textContent=output.prompt;
    $("action-plan").textContent=output.plan;
    $("result-title").textContent=data.planState.isDraft ? "AIに相談する準備の下書きができました" : "AIに相談する準備ができました";
    const warning=ensureDraftWarning();
    warning.hidden=!data.planState.isDraft;
    warning.innerHTML=`<h2>この計画書には未確定事項があります</h2><p>まだ試行を開始しないでください。関係職員と支援者に確認し、必要な項目を更新してから開始してください。</p>${data.planState.reasons.length?`<ul>${data.planState.reasons.map(r=>`<li>${esc(r)}</li>`).join("")}</ul>`:""}`;
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
    } else $("submit-status").textContent="もう一方の文書もコピーしてください。";
    toast("コピーしました。ご自身の文書やメモへ保存してください。");
    updateSubmit();
  }
  function updateSubmit(){ const ok=copied.prompt&&copied.plan&&$("privacy-confirmation")?.checked; $("submit-button").disabled=!ok; }
  function toast(msg){ let t=$("toast"); if(!t){t=document.createElement("div");t.id="toast";t.className="toast";document.body.append(t);} t.textContent=msg;t.classList.add("is-visible");setTimeout(()=>t.classList.remove("is-visible"),2200); }
  function receipt(){const d=new Date(), y=`${d.getFullYear()}${String(d.getMonth()+1).padStart(2,"0")}${String(d.getDate()).padStart(2,"0")}`;return `AX-${y}-${crypto.getRandomValues(new Uint32Array(1))[0].toString(36).slice(0,6).toUpperCase()}`;}
  async function submit(){
    const status=$("submit-status");
    if(!CFG.supabaseUrl||!CFG.supabaseAnonKey){status.textContent="Supabaseの接続設定がありません。入力内容は消去していません。";return;}
    $("submit-button").disabled=true;
    status.textContent="送信しています…";
    try{
      const client=window.supabase.createClient(CFG.supabaseUrl,CFG.supabaseAnonKey,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
      data.planState=computePlanState();
      output=window.KAIGO_AI_GENERATOR.buildOutputs(data);
      const no=receipt();
      const facilityCode=sessionStorage.getItem("kaigoAiFacilityCode")||"";
      const answers={...data,facilityCode};
      const {error}=await client.from(CFG.tableName||"ai_usecase_submissions").insert({receipt_number:no,app_version:CFG.appVersion||"0.1.0",service_type:data.serviceType,role_type:data.roleType,work_category:data.workCategory,ai_prompt:output.prompt,action_plan:output.plan,answers,status:"new"});
      if(error) throw error;
      data=blank();
      output={prompt:"",plan:""};
      $("receipt-number").textContent=no;
      show("complete");
    }catch(e){
      console.error(e);
      const code=e?.code ? `（エラーコード：${e.code}）` : "";
      status.textContent=`送信できませんでした${code}。入力内容は残っています。時間をおいて再送してください。`;
      updateSubmit();
    }
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
