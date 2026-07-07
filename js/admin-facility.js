(() => {
  "use strict";

  const CFG = window.KAIGO_AI_CONFIG || {};
  const $ = id => document.getElementById(id);
  const facilityByReceipt = new Map();
  let client = null;
  let refreshTimer = null;

  function configured(){
    return CFG.supabaseUrl && CFG.supabaseAnonKey && window.supabase;
  }

  function receiptFromCard(card){
    const blocks = [...card.querySelectorAll("dl > div")];
    const target = blocks.find(block => block.querySelector("dt")?.textContent.trim() === "受付番号");
    return target?.querySelector("dd")?.textContent.trim() || "";
  }

  function decorateCards(){
    document.querySelectorAll(".submission-card").forEach(card => {
      if(card.querySelector("[data-facility-code]")) return;
      const receipt = receiptFromCard(card);
      const code = facilityByReceipt.get(receipt) || "未設定";
      const block = document.createElement("div");
      block.dataset.facilityCode = "true";
      block.innerHTML = `<dt>施設コード</dt><dd>${escapeHtml(code)}</dd>`;
      card.querySelector("dl")?.prepend(block);
    });
  }

  function decorateDetail(){
    const meta = $("detail-content")?.querySelector(".detail-meta");
    if(!meta || meta.querySelector("[data-facility-code]")) return;
    const receipt = [...meta.querySelectorAll("span")]
      .map(span => span.textContent.trim())
      .find(text => text.startsWith("AX-"));
    if(!receipt) return;
    const code = facilityByReceipt.get(receipt) || "未設定";
    const span = document.createElement("span");
    span.dataset.facilityCode = "true";
    span.textContent = `施設コード：${code}`;
    meta.prepend(span);
  }

  function decorate(){
    decorateCards();
    decorateDetail();
  }

  function escapeHtml(value){
    return String(value ?? "").replace(/[&<>"']/g, char => ({
      "&":"&amp;",
      "<":"&lt;",
      ">":"&gt;",
      '"':"&quot;",
      "'":"&#39;"
    })[char]);
  }

  async function refreshMap(){
    if(!client) return;
    const {data, error} = await client
      .from(CFG.tableName || "ai_usecase_submissions")
      .select("receipt_number,answers");
    if(error) return;
    facilityByReceipt.clear();
    (data || []).forEach(row => {
      facilityByReceipt.set(row.receipt_number, row.answers?.facilityCode || "未設定");
    });
    decorate();
  }

  function scheduleRefresh(){
    clearTimeout(refreshTimer);
    refreshTimer = setTimeout(refreshMap, 80);
  }

  async function start(){
    if(!configured()) return;
    client = window.supabase.createClient(CFG.supabaseUrl, CFG.supabaseAnonKey);
    const {data:{session}} = await client.auth.getSession();
    if(session) refreshMap();
    client.auth.onAuthStateChange((_event, currentSession) => {
      if(currentSession) refreshMap();
      else facilityByReceipt.clear();
    });

    const list = $("submission-list");
    const detail = $("detail-content");
    if(list && detail){
      const observer = new MutationObserver(scheduleRefresh);
      observer.observe(list, {childList:true});
      observer.observe(detail, {childList:true});
    }
    $("refresh-button")?.addEventListener("click", () => setTimeout(refreshMap, 150));
  }

  if(document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", start);
  }else{
    start();
  }
})();
