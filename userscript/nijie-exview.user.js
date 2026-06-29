// ==UserScript==
// @name         nijie-exview
// @namespace    https://github.com/kou003/
// @version      4.0.2
// @description  nijie-exview
// @author       kou003
// @match        https://sp.nijie.info/view.php?id=*
// @updateURL    https://github.com/kou003/nijie-util/raw/master/userscript/nijie-exview.user.js
// @downloadURL  https://github.com/kou003/nijie-util/raw/master/userscript/nijie-exview.user.js
// @grant        none
// @run-at       document-start
// ==/UserScript==

'use strict';

// ─── 型定義 ──────────────────────────────────────────────────────────────────

/**
 * ハッシュ経由でページ間を移動するときに使うナビゲーション状態。
 * URLハッシュを `new URLSearchParams(hash.slice(1))` で解析した結果に対応する。
 *
 * ハッシュ上のキー名と NavState のプロパティ名の対応:
 * - `_num`      ↔ `num`      (内部名と外部名が異なる唯一のキー)
 * - `p`         ↔ `p`
 * - `pathname`  ↔ `pathname`
 * - その他のキーはそのまま `extra` に格納される
 *
 * @typedef {Object} NavState
 * @property {string} pathname     - 遷移元リストページのパス名 (例: '/illust_list.php', '/okazu.php')
 * @property {number} num          - リストページ内でのイラストの位置 (0始まり)。ハッシュの `_num` に対応
 * @property {number} p            - リストページのページ番号 (1始まり)
 * @property {Object} extra        - ハッシュ内の追加パラメータ (id_list / type / start_time / end_time など)
 */

// ─── スタイル ────────────────────────────────────────────────────────────────

/**
 * スクリプトが使用するCSSをページに挿入する。
 */
const setStyle = () => {
  document.head.appendChild(document.createElement('style')).textContent = `
    #view-image-block #illust img {
      max-width: 100%;
    }

    #exView {
      display: none;
    }
    .ex-open {
      display: block;
    }
    .ex-close,
    .popup_illust {
      display: none;
    }
    #exView:checked ~ #illust .ex-close {
      display: block;
    }
    #exView:checked ~ #illust .popup_illust {
      display: inline;
    }
    #exView:checked ~ div:not(#illust),
    #exView:checked ~ #illust a,
    #exView:checked ~ #illust .ex-open {
      display: none;
    }

    #illust {
      counter-reset: num 0 total var(--total);
    }
    #illust .ex-open::after {
      content: " (" counter(total) ")";
    }
    #illust .ex-close::after {
      counter-increment: num;
      content: " (" counter(num) " / " counter(total) ")";
    }

    #manga, #filter { display: none !important; }
  `;
};

// ─── ユーティリティ ──────────────────────────────────────────────────────────

/**
 * HTML文字列から最初の要素を生成して返す。
 *
 * @param {string} html - 生成する要素のHTML文字列
 * @returns {Element}
 */
const createElement = (() => {
  const template = document.createElement('template');
  return (html) => {
    template.innerHTML = html;
    return template.content.firstElementChild;
  };
})();

/**
 * 指定URLのHTMLをsessionStorageにキャッシュしながら取得し、DOMとして返す。
 *
 * @param {string} url - 取得先URL
 * @returns {Promise<Document>}
 */
const fetchDom = async (url) => {
  const cached = sessionStorage.getItem(url);
  const html   = cached ?? await fetch(url).then((r) => r.text());
  if (!cached) sessionStorage.setItem(url, html);
  return new DOMParser().parseFromString(html, 'text/html');
};

// ─── URLハッシュによるナビゲーションリンクの書き換え ─────────────────────────

/**
 * NavState をURLハッシュ文字列（`#` なし）にシリアライズする。
 * `num` はハッシュ上のキー名 `_num` に変換する。
 *
 * @param {NavState} state
 * @returns {string} URLSearchParams形式のハッシュ文字列
 */
const serializeNavState = ({ pathname, num, p, extra }) => {
  return new URLSearchParams({ pathname, p, _num: num, ...extra }).toString();
};

/**
 * URLハッシュ文字列を解析して {@link NavState} を返す。
 * ハッシュが不正・情報不足の場合は `null` を返す。
 *
 * @param {string} hash - `location.hash` の値 (`#` を含む文字列)
 * @returns {NavState|null}
 */
const parseNavState = (hash) => {
  const params   = new URLSearchParams(hash.slice(1));
  const pathname = params.get('pathname');
  const _num     = params.get('_num');
  const p        = params.get('p');
  if (!pathname || _num == null) return null;

  // pathname / _num / p を除いた残りを extra に格納する
  const KNOWN_KEYS = new Set(['pathname', '_num', 'p']);
  const extra = Object.fromEntries([...params].filter(([k]) => !KNOWN_KEYS.has(k)));

  return { pathname, num: +_num, p: p != null ? +p : 1, extra };
};

/**
 * 通常リストページからイラストページのURL一覧を取得する。
 *
 * @param {string} listPageUrl - リストページの完全URL
 * @returns {Promise<string[]>} イラストページURLの配列
 */
const fetchListHrefs = async (listPageUrl) => {
  const doc = await fetchDom(listPageUrl);
  return [...doc.querySelectorAll('.illust-layout')]
    .map((layout) => layout.parentElement)
    .filter((a) => a.tagName === 'A')
    .map((a) => a.href);
};

/**
 * okazuページからイラストページのURL一覧をAjaxで取得する。
 *
 * @param {string} postBody - `application/x-www-form-urlencoded` 形式のリクエストボディ
 * @returns {Promise<string[]>} イラストページURLの配列
 */
const fetchOkazuHrefs = async (postBody) => {
  const response = await fetch('https://sp.nijie.info/php/ajax/get_okazu.php', {
    method: 'POST',
    headers: {
      'content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
      'x-requested-with': 'XMLHttpRequest',
    },
    body: postBody,
  });
  const json = await response.json();
  const doc  = new DOMParser().parseFromString(json.data, 'text/html');
  return [...doc.querySelectorAll('.okazu-layout .title a[href*="/view.php?id="]')]
    .map((a) => a.href);
};

/**
 * ナビゲーション状態と移動方向から遷移先URLを解決する。
 * ページ末尾/先頭を超えた場合は隣のリストページへ折り返す。
 *
 * 動作モードは `extra` の内容で自動判別する:
 * - `extra.id_list` あり         → id_listモード（リスト取得不要）
 * - `pathname === '/okazu.php'`  → okazuモード（Ajax取得）
 * - それ以外                     → 通常リストページモード
 *
 * @param {NavState} state     - 解決したい位置のナビゲーション状態 (`num` は移動後の値を渡す)
 * @param {number}   direction - 移動方向 (+1: 次, -1: 前)
 * @param {boolean}  [isClamped=false]
 *   `true` のとき、`num` が範囲外でも前後ページへの再帰を行わず、
 *   そのページの末尾要素へクランプする。
 *   ページ境界をまたぐ再帰呼び出し時に内部で使用する。
 * @returns {Promise<string|undefined>} 遷移先URL。存在しない場合は `undefined`
 */
const resolveUrl = async ({ pathname, num, p, extra }, direction, isClamped = false) => {

  /** 指定 num で確定したURLを組み立てて返す。extra は変更せず引き継ぐ */
  const buildUrl = (illustUrl, resolvedNum, resolvedP) =>
    illustUrl + '#' + serializeNavState({ pathname, num: resolvedNum, p: resolvedP, extra });

  /** num / p を更新して再帰する */
  const recurse = (nextNum, nextP, nextClamped = false) =>
    resolveUrl({ pathname, num: nextNum, p: nextP, extra }, direction, nextClamped);

  // ── id_list モード ──────────────────────────────────────────────────────
  if (extra.id_list != null) {
    const ids = extra.id_list.split(',');
    if (num < 0)           return direction > 0 ? recurse(0,            1) : undefined;
    if (num >= ids.length) return direction < 0 ? recurse(ids.length-1, 1) : undefined;
    return `https://sp.nijie.info/view.php?id=${ids[num]}#` + serializeNavState({ pathname, num, p, extra });
  }

  // ── ページ境界チェック ──────────────────────────────────────────────────
  if (p < 1)                     return direction > 0 ? recurse(0, 1) : undefined;
  if (!isClamped && num < 0)     return recurse(num, p - 1, true);

  // ── okazu モード ────────────────────────────────────────────────────────
  if (pathname === '/okazu.php') {
    if (num >= 10) return recurse(0, p + 1);

    const postParams = new URLSearchParams({
      type: extra.type ?? 'recent_now',
      num:  Math.max(p - 1, 0) * 10,
    });
    if (extra.start_time && extra.end_time) {
      postParams.set('start_time', extra.start_time);
      postParams.set('end_time',   extra.end_time);
    }

    const hrefs = await fetchOkazuHrefs(postParams.toString());
    if (hrefs.length === 0)  return direction < 0 ? recurse(9, p - 1, true) : undefined;
    if (isClamped)           num = hrefs.length - 1;
    if (num >= hrefs.length) return recurse(0, p + 1);

    return buildUrl(hrefs[num], num, p);
  }

  // ── 通常リストページモード ──────────────────────────────────────────────
  const listParams = new URLSearchParams({ p, ...extra });
  const listUrl    = pathname + '?' + listParams.toString();
  const hrefs      = await fetchListHrefs(listUrl);
  if (hrefs.length === 0)  return direction < 0 ? recurse(num, p - 1, true) : undefined;
  if (isClamped)           num = hrefs.length - 1;
  if (num >= hrefs.length) return recurse(0, p + 1);

  return buildUrl(hrefs[num], num, p);
};

/**
 * ページ内のナビゲーションボタン（前/次）のhrefをハッシュ情報に基づいて書き換える。
 * ハッシュが存在しない場合は元のリンクをフォールバックとして使用する。
 * リンクは通常の `<a>` として機能し、クリックで普通にページ遷移する。
 */
const rewriteNavLinks = async () => {
  const viewNav = document.querySelector('.view-nav ul');
  if (!viewNav) return;

  const state = parseNavState(location.hash);

  /** @type {{ direction: number, selector: string, iconDir: string, id: string }[]} */
  const navDefs = [
    { direction: -1, selector: 'li:first-of-type', iconDir: 'left',  id: 'next_illust' },
    { direction: +1, selector: 'li:last-of-type',  iconDir: 'right', id: 'prev_illust' },
  ];

  await Promise.all(navDefs.map(async ({ direction, selector, iconDir, id }) => {
    const btn       = viewNav.querySelector(selector);
    const existingA = btn.querySelector('a:not(.do)');
    const fallback  = existingA?.href ?? null;

    btn.innerHTML = '\u00a0';

    const url = state
      ? await resolveUrl({ ...state, num: state.num + direction }, direction)
      : fallback;
    console.log(`rewriteNavLinks: ${id} -> ${url ?? 'undefined'}`);
    if (!url) return;

    btn.innerHTML = `<a id="${id}" href="${url}"><i class="fa-solid fa-chevron-${iconDir}"></i></a>`;
  }));
};

// ─── view_popup 展開 ──────────────────────────────────────────────────────────

/**
 * view_popup.php を読み込み、全画像をインラインに展開表示できるようにする。
 *
 * - サムネイルをクリックすると全画像が展開される（CSSチェックボックストリック）
 * - 各画像をクリックすると次の画像へスクロールする
 * - トップ画像の読み込み完了後に popup_illust の src を設定する
 * - 6枚目以降は `loading="lazy"` を付与する
 */
const expandViewPopup = async () => {
  const viewCenter = document.querySelector('#view-center-block');
  const illust     = viewCenter.querySelector('#illust');
  const topIllust  = illust.querySelector('[illust_id]') ?? illust.querySelector('a>img');

  /** popup_illust の src を dataset.src から復元して読み込みを開始する */
  const loadPopupImages = () => {
    illust.querySelectorAll('.popup_illust').forEach((img) => {
      if (img.dataset.src) img.src = img.dataset.src;
    });
  };

  topIllust.addEventListener('load',           loadPopupImages);
  topIllust.addEventListener('loadedmetadata', loadPopupImages);

  // サムネイルクリックで展開できるようラベルで包む
  const exLabel   = createElement('<label for="exView" />');
  const illustAnk = illust.querySelector(':scope>p>a');
  illustAnk.onclick = (e) => { exLabel.click(); e.preventDefault(); };
  exLabel.appendChild(illustAnk);
  exLabel.addEventListener('click', loadPopupImages);
  illust.querySelector(':scope>p').appendChild(exLabel);

  // チェックボックスと「開く」ラベルを挿入する
  const exViewCheck = createElement('<input id="exView" type="checkbox" disabled>');
  viewCenter.insertAdjacentElement('afterbegin', exViewCheck);
  illust.appendChild(createElement('<label class="ex-open" for="exView"><i class="fa fa-angle-down"></i></label>'));

  // view_popup.php から全画像を取得して追加する
  const popupUrl = location.origin
    + location.pathname.replace('view.php', 'view_popup.php')
    + location.search;
  const popupDoc = await fetchDom(popupUrl);
  const imgs     = [...popupDoc.querySelectorAll('.popup_illust')];

  illust.style.setProperty('--total', imgs.length);

  imgs.forEach((img, i) => {
    if (i > 5) img.loading = 'lazy';
    // トップ画像の読み込みが終わるまで popup_illust は src を空にしておく
    img.dataset.src = img.src;
    if (!topIllust.complete && !topIllust.readyState) img.src = '';

    illust.appendChild(img);
    img.addEventListener('click', () => imgs[(i + 1) % imgs.length].scrollIntoView());
    illust.appendChild(createElement('<label class="ex-close" for="exView"><i class="fa fa-angle-up"></i></label>'));
  });

  exViewCheck.addEventListener('change', () => {
    exViewCheck.checked ? illust.scrollIntoView() : scroll(0, 0);
  });
  exViewCheck.disabled = false;
};

// ─── エントリポイント ─────────────────────────────────────────────────────────

/**
 * スクリプトのメイン処理。iframe内では動作しない。
 */
const main = () => {
  if (window.parent !== window) return;
  setStyle();
  expandViewPopup();
  rewriteNavLinks();
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', main);
} else {
  main();
}
