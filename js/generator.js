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

  function displayOther(value, detail) {
    return value === "その他" && detail ? `その他：${detail}` : (value || "【確認が必要】");
  }

  function formatDate(value) {
    return value || "【未入力】";
  }

  function yesNoList(checked, missing) {
    const ok = (checked || []).map(item => `・○ ${item}`);
    const ng = (missing || []).map(item => `・△ ${item}（未確認）`);
    return [...ok, ...ng].join("\n") || "・【確認が必要】";
  }

  function unresolvedText(state) {
    const items = state.planState?.unresolvedItems || [];
    if (!items.length) return "・未確定事項はありません。";
    return items.map(item => {
      return `・${item.item}：${item.message}\n  - 誰に確認するか：${item.who || "【未入力】"}\n  - いつまでに確認するか：${formatDate(item.by)}\n  - 誰が更新するか：${item.updater || "【未入力】"}`;
    }).join("\n");
  }

  function draftReasons(state) {
    const reasons = state.planState?.reasons || [];
    return reasons.length ? bullets(reasons) : "・下書きではありません。";
  }

  function baselineText(state) {
    const lines = [];
    if ((state.metrics || []).includes("かかった時間")) {
      lines.push(`・現在、1回当たりかかっている時間：${state.baselineTime ? `${state.baselineTime}分程度` : "【未入力】"}`);
    }
    if (state.baselineMeasurePlan) lines.push("・正確な数値が分からないため、試行開始前に3回程度測定する。");
    if (state.baselineNotes) lines.push(`・試行前の状態メモ：${state.baselineNotes}`);
    return lines.join("\n") || "・【未入力】試行開始前に現在の状態を確認する。";
  }

  function roleText(state) {
    return [
      `・試行する職員：${state.trialMembers || "【未入力】"}`,
      `・AIの回答を確認する職員：${state.aiReviewer || "【未入力】"}`,
      `・継続・修正・中止を判断する人：${state.decisionMaker || "【未入力】"}`,
      `・困ったときの相談先：${state.consultationContact || "【未入力】"}`
    ].join("\n");
  }

  function scheduleText(state) {
    return [
      `・試行開始日：${formatDate(state.trialStartDate)}`,
      `・試行終了日：${formatDate(state.trialEndDate)}`,
      `・振り返り日：${formatDate(state.reviewDate)}`
    ].join("\n");
  }

  function buildOutputs(state) {
    if (!state) throw new TypeError("state is required");
    const serviceType = displayOther(state.serviceType, state.serviceTypeOther);
    const roleType = displayOther(state.roleType, state.roleTypeOther);
    const workCategory = displayOther(state.workCategory, state.workCategoryOther);
    const problemText = joinWithDetail(state.problems, state.problemDetail);
    const desiredText = joinWithDetail(state.desired, state.desiredDetail);
    const aiHelpText = joinWithDetail(state.aiHelp, state.aiHelpDetail);
    const currentFlow = state.currentFlowStatus === "unknown"
      ? "【未確定】この項目は未確定です。試行開始前に関係職員へ確認してください。"
      : (state.currentFlow || "【確認が必要】関係する職員へ確認します。");
    const planLabel = state.planState?.isDraft ? "下書き" : "計画案";
    const caution = state.planState?.isDraft
      ? "この計画書には未確定事項があります。まだ試行を開始しないでください。関係職員と支援者に確認し、必要な項目を更新してから開始してください。"
      : "試行開始前に、関係職員と支援者で内容を確認してください。";

    const prompt = `あなたは、介護現場の生産性向上を支援する相談役です。職員を責めず、現場で無理なく試せる改善案を提案してください。\n\n【この相談の状態】\n・区分：${planLabel}\n・注意：${caution}\n\n【相談する事業所・立場】\n・サービス種別：${serviceType}\n・相談者の立場：${roleType}\n\n【良くしたい仕事】\n${workCategory}\n\n【現在の困りごと】\n${bullets(problemText)}\n\n【現在の仕事の進め方】\n${currentFlow}\n\n【未確定事項】\n${unresolvedText(state)}\n\n【目指したい状態】\n${bullets(desiredText)}\n\n【AIに手伝ってほしいこと】\n${bullets(aiHelpText)}\n\n【職員が必ず確認・判断すること】\n${bullets(state.humanChecks)}\n\n【クイックウィン適合チェック】\n${yesNoList(state.planState?.quickWinChecked, state.planState?.quickWinMissing)}\n\n【役割分担】\n${roleText(state)}\n\n【試行前の状態】\n${baselineText(state)}\n\n【最初に試す範囲・期間】\n・範囲：${state.trialScope}\n・期間：${state.trialPeriod}\n\n【試行日程】\n${scheduleText(state)}\n\n【確認したい変化】\n${bullets(state.metrics)}\n\n【回答時のお願い】\n1. 相談内容を短く整理してください。\n2. 背景にありそうな原因は、事実と分けて【仮説】と表示してください。\n3. 今の仕事の流れと、改善後の仕事の流れを比較してください。\n4. AIに任せることと、職員が確認・判断することを分けてください。\n5. まず${state.trialPeriod}、${state.trialScope}で試せる具体的な方法を提案してください。\n6. 個人情報を使わずに試す方法にしてください。\n7. 試した結果を確認する方法と、継続・修正を判断する基準を示してください。\n8. 未確定事項がある場合は、試行開始前に確認すべきことを先頭に整理してください。\n9. 介護現場の職員が理解しやすい言葉で回答してください。`;

    const plan = `AI活用計画書（${planLabel}）\n\n【重要】\n${caution}\n\n【下書きとなっている理由】\n${draftReasons(state)}\n\n1．良くしたい仕事\n${workCategory}\n\n2．現在の困りごと\n${bullets(problemText)}\n\n3．現在の仕事の進め方\n${currentFlow}\n\n4．未確定事項\n${unresolvedText(state)}\n\n5．目指したい状態\n${bullets(desiredText)}\n\n6．AIに相談・依頼すること\n${bullets(aiHelpText)}\n\n7．職員が確認・判断すること\n${bullets(state.humanChecks)}\n\n8．クイックウィン適合チェック\n${yesNoList(state.planState?.quickWinChecked, state.planState?.quickWinMissing)}\n\n9．役割分担\n${roleText(state)}\n\n10．試行前の状態\n${baselineText(state)}\n\n11．安全に試すための注意\n・利用者様や職員の個人を特定できる情報は入力しない。\n・AIの回答をそのまま採用せず、事実と合っているか職員が確認する。\n・介護、医療、人事等の最終判断は職員・管理者が行う。\n・制度や施設ルールに関する内容は、正式な資料で確認する。\n\n12．最初の試行\n・試す範囲：${state.trialScope}\n・試す期間：${state.trialPeriod}\n${scheduleText(state)}\n・開始前にすること：関係する職員へ目的と注意事項を説明する。\n・試行中にすること：AIへの依頼文を使い、出力内容を職員が確認・修正する。\n\n13．確認する変化\n${bullets(state.metrics)}\n\n14．振り返り\n・振り返り日：${formatDate(state.reviewDate)}\n・良かった点、困った点、続けるために変える点を整理する。\n・AIの回答だけで決めず、現場職員と管理者で継続・修正・中止を判断する。\n・利用者様と向き合う時間や、職員の余白時間につながったかを確認する。`;

    return { prompt, plan };
  }

  return { buildOutputs, bullets, joinWithDetail };
});
