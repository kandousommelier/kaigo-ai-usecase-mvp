(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.KAIGO_AI_GENERATOR = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";

  function bullets(items) {
    const list = Array.isArray(items) ? items : [items];
    return list.filter(Boolean).map(item => `・${item}`).join("\n") || "・【確認が必要】";
  }

  function joinWithDetail(items, detail) {
    return detail ? [...(items || []), `補足：${detail}`] : (items || []);
  }

  function buildOutputs(state) {
    if (!state) throw new TypeError("state is required");
    const problemText = joinWithDetail(state.problems, state.problemDetail);
    const desiredText = joinWithDetail(state.desired, state.desiredDetail);
    const currentFlow = state.currentFlow || "【確認が必要】関係する職員へ確認します。";

    const prompt = `あなたは、介護現場の生産性向上を支援する相談役です。職員を責めず、現場で無理なく試せる改善案を提案してください。\n\n【相談する事業所・立場】\n・サービス種別：${state.serviceType}\n・相談者の立場：${state.roleType}\n\n【良くしたい仕事】\n${state.workCategory}\n\n【現在の困りごと】\n${bullets(problemText)}\n\n【現在の仕事の進め方】\n${currentFlow}\n\n【目指したい状態】\n${bullets(desiredText)}\n\n【AIに手伝ってほしいこと】\n${bullets(state.aiHelp)}\n\n【職員が必ず確認・判断すること】\n${bullets(state.humanChecks)}\n\n【最初に試す範囲】\n・範囲：${state.trialScope}\n・期間：${state.trialPeriod}\n\n【確認したい変化】\n${bullets(state.metrics)}\n\n【回答時のお願い】\n1. 相談内容を短く整理してください。\n2. 背景にありそうな原因は、事実と分けて【仮説】と表示してください。\n3. 今の仕事の流れと、改善後の仕事の流れを比較してください。\n4. AIに任せることと、職員が確認・判断することを分けてください。\n5. まず${state.trialPeriod}、${state.trialScope}で試せる具体的な方法を提案してください。\n6. 個人情報を使わずに試す方法にしてください。\n7. 試した結果を確認する方法と、継続・修正を判断する基準を示してください。\n8. 介護現場の職員が理解しやすい言葉で回答してください。`;

    const plan = `AI活用計画書（たたき台）\n\n1．良くしたい仕事\n${state.workCategory}\n\n2．現在の困りごと\n${bullets(problemText)}\n\n3．現在の仕事の進め方\n${currentFlow}\n\n4．目指したい状態\n${bullets(desiredText)}\n\n5．AIに相談・依頼すること\n${bullets(state.aiHelp)}\n\n6．職員が確認・判断すること\n${bullets(state.humanChecks)}\n\n7．安全に試すための注意\n・利用者様や職員の個人を特定できる情報は入力しない。\n・AIの回答をそのまま採用せず、事実と合っているか職員が確認する。\n・介護、医療、人事等の最終判断は職員・管理者が行う。\n・制度や施設ルールに関する内容は、正式な資料で確認する。\n\n8．最初の試行\n・試す範囲：${state.trialScope}\n・試す期間：${state.trialPeriod}\n・開始前にすること：関係する職員へ目的と注意事項を説明する。\n・試行中にすること：AIへの依頼文を使い、出力内容を職員が確認・修正する。\n\n9．確認する変化\n${bullets(state.metrics)}\n\n10．振り返り\n・良かった点、困った点、続けるために変える点を整理する。\n・AIの回答だけで決めず、現場職員と管理者で継続・修正・中止を判断する。\n・利用者様と向き合う時間や、職員の余白時間につながったかを確認する。`;

    return { prompt, plan };
  }

  return { buildOutputs, bullets, joinWithDetail };
});
