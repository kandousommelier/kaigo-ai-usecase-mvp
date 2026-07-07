/**
 * Supabase接続設定（GitHub Pages向け公開設定）
 * Publishable Keyはブラウザで利用する公開キーです。
 * Secret Key / service_role Keyは絶対に設定しないでください。
 */
window.KAIGO_AI_CONFIG = {
  supabaseUrl: "https://evnbyzfnmsiqnbshnwai.supabase.co",
  supabaseAnonKey: "sb_publishable_yFdc56FmZnIe3okUppUmrg__X2TWvUi",
  tableName: "ai_usecase_submissions",
  appVersion: "0.1.0"
};

if (window.location.pathname.endsWith("/admin.html")) {
  const facilityScript = document.createElement("script");
  facilityScript.src = "js/admin-facility.js";
  facilityScript.defer = true;
  document.head.appendChild(facilityScript);
}
