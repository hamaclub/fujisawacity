// State and storage
const STORAGE_KEY = "fujisawa_bousai_state_v1";
const state = loadState() || {
  points: 0,
  level: 1,
  streak: 0,
  lastStudyDate: null,
  badges: [],
  weaknesses: {},
};
function loadState() { try { return JSON.parse(localStorage.getItem(STORAGE_KEY)); } catch { return null; } }
function saveState() { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }

// Utils
function $(sel, root=document) { return root.querySelector(sel); }
function $all(sel, root=document) { return Array.from(root.querySelectorAll(sel)); }
function showToast(text) { const t = $("#toast"); t.textContent = text; t.hidden = false; setTimeout(()=>{ t.hidden = true; }, 1600); }
function setTab(targetId) {
  $all(".page").forEach(p => p.hidden = p.id !== targetId);
  $all(".tablink").forEach(btn => {
    const active = btn.dataset.target === targetId;
    btn.classList.toggle("is-active", active);
    btn.setAttribute("aria-current", active ? "page" : "false");
  });
}

// Bottom tabs
$all(".tablink").forEach(b => b.addEventListener("click", (e) => setTab(e.currentTarget.dataset.target)));

// Missions / Quick access
$all(".mission-btn, .quick-item").forEach(b => b.addEventListener("click", (e) => {
  const target = e.currentTarget.dataset.openTab || e.currentTarget.dataset.open-tab;
  setTab(target);
}));

// Home lists
const news = [
  "防災訓練が今週末に実施されます（鵠沼海岸）",
  "津波避難ビルの案内板を更新しました",
  "防災教育ウィーク：市内小中で特別授業",
];
const events = [
  "10/10(土) 津波避難訓練 9:00〜",
  "10/15(木) 家庭の備蓄チェックデー",
];
function renderList(id, items) { const ul = $(id); ul.innerHTML = items.map(li => `<li>${li}</li>`).join(""); }
renderList("#newsList", news);
renderList("#eventList", events);

// Progress + streak
function syncHUD() {
  $("#points").textContent = `${state.points} pt`;
  $("#level").textContent = `${state.level}`;
  $("#streak").textContent = state.streak;
  $("#pointsHUD").textContent = `${state.points} pt`;
  $("#levelHUD").textContent = `${state.level}`;
  $("#streakMy").textContent = state.streak;
}
(function updateStreak() {
  const today = new Date().toISOString().slice(0,10);
  if (state.lastStudyDate !== today) {
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0,10);
    state.streak = state.lastStudyDate === yesterday ? (state.streak + 1) : 1;
    state.lastStudyDate = today;
    saveState();
  }
  syncHUD();
})();

// Quiz
const QUIZ_BANK = {
  earthquake: [
    { q: "地震のとき まず大事なのは？", choices: ["にげる","あわてる","身を守る","窓を開ける"], a: 2, why: "まずは落下物から身を守る(ドロップ・カバー・ホールドオン)" },
    { q: "家具の転倒を防ぐには？", choices: ["重ねる","L字金具で固定","壁から離す","ロープでゆるく縛る"], a: 1, why: "L字金具や突っ張り棒でしっかり固定" },
  ],
  tsunami: [
    { q: "津波警報が出たら？", choices: ["ようすを見る","高い所へ避難","写真を撮る","海を見に行く"], a: 1, why: "ただちに高台や避難ビルへ" },
  ],
  typhoon: [
    { q: "台風前の備えで大切なのは？", choices: ["ベランダの物を固定","窓を開ける","海へ行く","傘をさす練習"], a: 0, why: "飛散物をなくし窓ガラス保護" },
  ],
  evac: [
    { q: "避難するときの持ち物は？", choices: ["ゲーム機","重い本","非常用持ち出し袋","大きいテレビ"], a: 2, why: "最低限の水・食料・ライトなど" },
  ],
  local: [
    { q: "藤沢市の津波避難ビルは？", choices: ["駅のホーム","指定された建物","公園のベンチ","海の家"], a: 1, why: "市が指定する避難ビルを確認" },
  ],
};
let currentCategory = "earthquake";
let currentIndex = 0;
let currentQuiz = QUIZ_BANK[currentCategory];

function catLabel(cat) { return {earthquake:"地震",tsunami:"津波",typhoon:"台風",evac:"避難",local:"地域"}[cat] || cat; }
function loadQuizCard() {
  currentQuiz = QUIZ_BANK[currentCategory];
  const item = currentQuiz[currentIndex % currentQuiz.length];
  $("#quizCounter").textContent = `${(currentIndex % currentQuiz.length) + 1}/${currentQuiz.length}`;
  $("#quizCategoryLabel").textContent = catLabel(currentCategory);
  $("#quizQuestion").textContent = item.q;
  const choiceButtons = $all(".choice");
  choiceButtons.forEach((btn, i) => { btn.textContent = item.choices[i]; btn.disabled = false; btn.classList.remove("correct","wrong"); });
  $("#quizFeedback").textContent = "";
  $("#nextQuestionBtn").disabled = true;
}
$all(".chip").forEach(ch => ch.addEventListener("click", (e) => {
  $all(".chip").forEach(c => { c.classList.remove("is-active"); c.setAttribute("aria-selected","false"); });
  const el = e.currentTarget; el.classList.add("is-active"); el.setAttribute("aria-selected","true");
  currentCategory = el.dataset.category; currentIndex = 0; loadQuizCard();
}));
$all(".choice").forEach(btn => btn.addEventListener("click", (e) => {
  const i = Number(e.currentTarget.dataset.index);
  const item = currentQuiz[currentIndex % currentQuiz.length];
  const isCorrect = i === item.a;
  e.currentTarget.classList.add(isCorrect ? "correct" : "wrong");
  $all(".choice").forEach(b => b.disabled = true);
  $("#quizFeedback").textContent = isCorrect ? "やったね！ 正解！" : `ざんねん… 正解は「${item.choices[item.a]}」`;
  if (isCorrect) {
    state.points += 1;
    if (state.points % 10 === 0) { state.level += 1; showToast("レベルアップ！"); }
    maybeAddBadge("first_correct", "はじめての正解");
    saveState(); syncHUD();
  } else {
    incWeakness(currentCategory);
  }
  $("#nextQuestionBtn").disabled = false;
}));
$("#nextQuestionBtn").addEventListener("click", () => { currentIndex += 1; loadQuizCard(); });

function incWeakness(cat) { state.weaknesses[cat] = (state.weaknesses[cat]||0) + 1; renderWeakness(); saveState(); }
function renderWeakness() {
  const ul = $("#weaknessList");
  const entries = Object.entries(state.weaknesses);
  ul.innerHTML = entries.length ? entries.map(([k,v]) => `<li>${catLabel(k)}: × ${v}</li>`).join("") : "<li>データなし</li>";
}
function maybeAddBadge(id, label) { if (!state.badges.find(b => b.id===id)) { state.badges.push({id,label}); renderBadges(); } }
function renderBadges() { const shelf = $("#badgeShelf"); shelf.innerHTML = state.badges.map(b => `<span class="badge">${b.label}</span>`).join(""); }
renderWeakness(); renderBadges();

// Learn
$all(".tab").forEach(t => t.addEventListener("click", (e) => {
  const tab = e.currentTarget.dataset.tab;
  $all(".tab").forEach(x => { x.classList.toggle("is-active", x.dataset.tab===tab); x.setAttribute("aria-selected", String(x.dataset.tab===tab)); });
  $("#videosTab").hidden = tab !== "videos";
  $("#initiativesTab").hidden = tab !== "initiatives";
}));
$all(".play-btn").forEach(() => {
  // デモ用：同一動画
  $("#videoSrc").src = "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4";
  // クリック時に再生
});
$all(".play-btn").forEach(b => b.addEventListener("click", () => {
  $("#videoPlayer").hidden = false;
  $("#videoEl").load(); $("#videoEl").play();
}));
$("#playbackRate").addEventListener("change", (e) => { $("#videoEl").playbackRate = Number(e.target.value); });
$("#miniQuizBtn").addEventListener("click", () => { setTab("quiz"); showToast("理解度クイズを開始"); });

// Initiatives
const initiatives = [
  { title: "津波避難ビル紹介", desc: "場所/安全ポイント/動画", area: "片瀬" },
  { title: "防災教育の学校連携", desc: "市内小中の取組レポート", area: "全域" },
  { title: "ハザードマップの使い方", desc: "1分でわかる動画", area: "全域" },
];
(function renderInitiatives(){ const ul = $("#initiativeList"); ul.innerHTML = initiatives.map(i => `<li><strong>${i.title}</strong> — ${i.desc}（${i.area}）</li>`).join(""); })();

// My
$("#shareBtn").addEventListener("click", () => { $("#shareCode").hidden = !$("#shareCode").hidden; });

// Kit checklist
const KIT_PRESETS = {
  elementary: ["水(500ml)", "ライト", "ホイッスル", "ばんそうこう"],
  junior: ["水(1L)", "モバイルバッテリー", "ライト", "簡易食"],
  family: ["水(家族分)", "食料(3日分)", "救急セット", "トイレ袋"],
};
function renderKit(preset="elementary") {
  const items = KIT_PRESETS[preset];
  const ul = $("#kitList");
  ul.innerHTML = items.map((label,i) => `<li><input type="checkbox" id="kit_${i}"><label for="kit_${i}">${label}</label></li>`).join("");
}
renderKit();
$("#kitPreset").addEventListener("change", (e) => renderKit(e.target.value));

// Calendar
renderList("#calendarList", ["11/3(祝) 総合防災訓練", "11/10(日) 津波避難訓練"]);

// AR placeholder
$("#arStartBtn").addEventListener("click", () => {
  const scene = $("#arScene").value;
  const text = {
    furniture: "家具の転倒を防ぐ: L字金具で固定/ストッパー",
    tsunami: "津波の高さ: 指定の避難ビルや高台へ",
    liquefaction: "液状化: でこぼこに注意・足元確認",
    route: "避難経路: 最寄りの避難所までのルートを確認",
  }[scene];
  $("#arOverlay").textContent = text;
  showToast("ARヒントを表示しました");
});
$("#arSnapBtn").addEventListener("click", () => { maybeAddBadge("ar_first","AR体験したよ"); showToast("スクショを保存しました（擬似）"); });

// Init
loadQuizCard();
setTab("home");
