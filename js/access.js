(() => {
  "use strict";

  // 限定提供サービスであることを確認するための簡易入口です。
  // 本格的な利用者認証を目的とするものではありません。
  const COMMON_ID = atob("YmFuc28=");
  const COMMON_PASSWORD = atob("c3VwcG9ydDIwMjY=");
  const STORAGE_KEY = "kaigoAiFacilityCode";
  const $ = (id) => document.getElementById(id);

  sessionStorage.removeItem(STORAGE_KEY);

  function updateButton(){
    const hasId = $("access-id").value.trim().length > 0;
    const hasPassword = $("access-password").value.length > 0;
    const hasFacilityCode = $("facility-code").value.trim().length > 0;
    $("access-button").disabled = !(hasId && hasPassword && hasFacilityCode);
  }

  function enter(e){
    e.preventDefault();
    const enteredId = $("access-id").value.trim();
    const enteredPassword = $("access-password").value;
    const facilityCode = $("facility-code").value.trim();
    const message = $("access-message");

    if (!facilityCode) {
      message.textContent = "施設コードを入力してください。";
      return;
    }

    if (enteredId !== COMMON_ID || enteredPassword !== COMMON_PASSWORD) {
      message.textContent = "共通IDまたは共通パスワードが正しくありません。";
      return;
    }

    sessionStorage.setItem(STORAGE_KEY, facilityCode);
    message.textContent = "";
    $("access-password").value = "";
    $("access-screen").hidden = true;
    $("intro-screen").hidden = false;
    window.scrollTo({top: 0, behavior: "smooth"});
  }

  document.addEventListener("DOMContentLoaded", () => {
    $("access-form").addEventListener("submit", enter);
    ["access-id", "access-password", "facility-code"].forEach(id => {
      $(id).addEventListener("input", updateButton);
    });
    updateButton();
  });
})();
