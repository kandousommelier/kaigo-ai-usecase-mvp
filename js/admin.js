(() => {
  "use strict";
  const CFG=window.KAIGO_AI_CONFIG||{}, $=id=>document.getElementById(id);
  let client=null, rows=[], filter="all", selected=null;
  const configured=()=>CFG.supabaseUrl&&CFG.supabaseAnonKey&&window.supabase;
  function esc(v){return String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[c]);}
  function fmt(v){return new Intl.DateTimeFormat("ja-JP",{dateStyle:"medium",timeStyle:"short"}).format(new Date(v));}
  function showLoggedIn(on){$("login-screen").hidden=on;$("admin-screen").hidden=!on;}
  async function init(){
    if(!configured()){ $("admin-config-notice").hidden=false; return; }
    client=window.supabase.createClient(CFG.supabaseUrl,CFG.supabaseAnonKey);
    const {data:{session}}=await client.auth.getSession();
    if(session){showLoggedIn(true);load();} else showLoggedIn(false);
    client.auth.onAuthStateChange((_e,s)=>{if(!s){showLoggedIn(false);rows=[];render();}});
  }
  async function login(e){e.preventDefault();const form=e.currentTarget,msg=$("login-message");msg.textContent="ログインしています…";const email=form.email.value.trim(),password=form.password.value;
    const {error}=await client.auth.signInWithPassword({email,password}); if(error){msg.textContent="ログインできませんでした。メールアドレスとパスワードを確認してください。";return;} msg.textContent="";showLoggedIn(true);load();
  }
  async function load(){const status=$("admin-status");status.textContent="読み込んでいます…";const {data,error}=await client.from(CFG.tableName||"ai_usecase_submissions").select("*").order("created_at",{ascending:false});if(error){status.textContent=`取得できませんでした：${error.message}`;return;}rows=data||[];status.textContent=`最終更新：${new Date().toLocaleTimeString("ja-JP")}`;render();}
  function render(){const shown=rows.filter(r=>filter==="all"||r.status===filter);$("new-count").textContent=rows.filter(r=>r.status==="new").length;$("reviewed-count").textContent=rows.filter(r=>r.status==="reviewed").length;$("total-count").textContent=rows.length;$("submission-empty").hidden=shown.length>0;
    $("submission-list").innerHTML=shown.map(r=>`<article class="submission-card ${r.status==='new'?'is-new':''}"><div class="submission-top"><div><span class="status-badge">${r.status==='new'?'未確認':'確認済み'}</span><strong>${esc(r.work_category)}</strong></div><time>${fmt(r.created_at)}</time></div><dl><div><dt>サービス</dt><dd>${esc(r.service_type)}</dd></div><div><dt>回答者</dt><dd>${esc(r.role_type)}</dd></div><div><dt>受付番号</dt><dd>${esc(r.receipt_number)}</dd></div></dl><button type="button" class="primary-button small" data-open="${r.id}">内容を確認する</button></article>`).join("");
    document.querySelectorAll("[data-open]").forEach(b=>b.onclick=()=>openDetail(b.dataset.open));
  }
  function openDetail(id){selected=rows.find(r=>r.id===id);if(!selected)return;$("detail-content").innerHTML=`<p class="eyebrow">${selected.status==='new'?'NEW PLAN':'REVIEWED PLAN'}</p><h2 id="detail-title">${esc(selected.work_category)}</h2><div class="detail-meta"><span>${esc(selected.receipt_number)}</span><span>${fmt(selected.created_at)}</span><span>${esc(selected.service_type)}／${esc(selected.role_type)}</span></div><section><div class="output-card-head"><h3>AIへの依頼文</h3><button class="copy-button" data-copy="prompt">コピー</button></div><pre class="output-text">${esc(selected.ai_prompt)}</pre></section><section><div class="output-card-head"><h3>AI活用計画書</h3><button class="copy-button" data-copy="plan">コピー</button></div><pre class="output-text">${esc(selected.action_plan)}</pre></section><div class="detail-actions"><button class="secondary-button" data-copy="all">全文コピー</button><button class="primary-button" id="toggle-status">${selected.status==='new'?'確認済みにする':'未確認へ戻す'}</button><button class="danger-button" id="delete-one">削除する</button></div>`;
    $("detail-content").querySelectorAll("[data-copy]").forEach(b=>b.onclick=()=>copySelected(b.dataset.copy));$("toggle-status").onclick=toggleStatus;$("delete-one").onclick=deleteOne;$("detail-dialog").showModal();
  }
  async function copySelected(kind){let text=kind==="prompt"?selected.ai_prompt:kind==="plan"?selected.action_plan:`【AIへの依頼文】\n${selected.ai_prompt}\n\n【AI活用計画書】\n${selected.action_plan}`;await navigator.clipboard.writeText(text);$("admin-status").textContent="コピーしました。";}
  async function toggleStatus(){const next=selected.status==="new"?"reviewed":"new";const {error}=await client.from(CFG.tableName||"ai_usecase_submissions").update({status:next,reviewed_at:next==="reviewed"?new Date().toISOString():null}).eq("id",selected.id);if(error){alert(error.message);return;}$("detail-dialog").close();load();}
  async function deleteOne(){if(!confirm("この計画書を削除します。削除後は復元できません。"))return;const {error}=await client.from(CFG.tableName||"ai_usecase_submissions").delete().eq("id",selected.id);if(error){alert(error.message);return;}$("detail-dialog").close();load();}
  async function deleteReviewed(){const targets=rows.filter(r=>r.status==="reviewed");if(!targets.length){alert("確認済みの計画書はありません。");return;}if(!confirm(`確認済み${targets.length}件を削除します。復元できません。`))return;const {error}=await client.from(CFG.tableName||"ai_usecase_submissions").delete().eq("status","reviewed");if(error){alert(error.message);return;}load();}
  document.addEventListener("DOMContentLoaded",()=>{
    $("login-form").addEventListener("submit",login);$("refresh-button").onclick=load;$("logout-button").onclick=()=>client.auth.signOut();$("delete-reviewed-button").onclick=deleteReviewed;$("detail-close").onclick=()=>$("detail-dialog").close();
    document.querySelectorAll("[data-filter]").forEach(b=>b.onclick=()=>{filter=b.dataset.filter;document.querySelectorAll("[data-filter]").forEach(x=>x.classList.toggle("is-active",x===b));render();});init();
  });
})();
