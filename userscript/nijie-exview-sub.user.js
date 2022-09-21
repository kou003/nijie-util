// ==UserScript==
// @name         nijie-exview-sub
// @namespace    https://github.com/kou003/
// @version      1.6.0
// @description  nijie-exview-sub
// @author       kou003
// @match        https://sp.nijie.info
// @match        https://sp.nijie.info/
// @match        https://sp.nijie.info/index.php*
// @match        https://sp.nijie.info/illust_view.php*
// @match        https://sp.nijie.info/index_like_illust.php*
// @match        https://sp.nijie.info/index_tag.php*
// @match        https://sp.nijie.info/bookmark.php*
// @match        https://sp.nijie.info/history_illust.php*
// @match        https://sp.nijie.info/history_nuita.php*
// @match        https://sp.nijie.info/search.php*
// @match        https://sp.nijie.info/search_all.php*
// @match        https://sp.nijie.info/illust.php*
// @match        https://sp.nijie.info/members_bookmark.php*
// @match        https://sp.nijie.info/okazu.php*
// @match        https://sp.nijie.info/dojin.php*
// @updateURL    https://github.com/kou003/nijie-util/raw/master/userscript/nijie-exview-sub.user.js
// @downloadURL  https://github.com/kou003/nijie-util/raw/master/userscript/nijie-exview-sub.user.js
// @grant        none
// @run-at       document-start
// ==/UserScript==

{
  'use strict';
  const setStyle = async () => {
    document.head.appendChild(document.createElement('style')).textContent = `
    #head-right {
      padding-left: 0;
    }
    #toggle-rev input {
      display: none;
    }
    #toggle-rev div {
      padding-top: 5px;
    }
    #toggle-rev div::before {
      content: "";
      display: inline-block;
      width: 20px;
      height: 20px;
      border: 2px solid gray;
      border-radius: 50%;
      background-color: white;
      box-sizing: border-box;
    }
    #toggle-rev input:checked ~ div::before {
      content: "";
      border: 2px solid white;
      background-color: gray;
    }
    .paging-container .left, .paging-container .right {
      float: none;
      width: auto;
    }

    .loading-over {
      display: none;
      position: fixed;
      z-index: 100;
      width: 100vw;
      height: 100vh;
      background-color: rgba(0,0,0,0.7);
    }
    .section-header.bookmark-header {
      grid-template-columns: 1fr 15%;
    }
    .loading-over.enable {
      display: inline-block;
      color: white;
    }
    .loading-over .loading-counter {
      position: absolute;
      width: 100vw;
      height: 100vh;
      text-align: center;
      line-height: 100vh;
    }
    .spinner {
      position: absolute;
      margin: auto;
      inset: 0;
      width: 100px;
      height: 100px;
      border: 10px #ddd solid;
      border-top-color: #2e93e6;
      border-radius: 50%;
      animation: sp-anime 1.0s infinite linear;
    }
    
    @keyframes sp-anime {
      100% { 
        transform: rotate(360deg); 
      }
    }

    .ex-btn {
      margin: 0 1em;
    }

    .bookmark-header .index aside {
      display: inline-block;
      text-align: left;
      padding: 8px 15px;
      font-size: 15px;
      clear: both;
      line-height: 1.1em;
    }
    .bookmark-header a.bm-link-btn {
      display: inline-block;
      border-style: solid;
      border-radius: 0.5em;
      padding: 0 0.3em;
      margin-left: 5px;
      font-size: 0.7em;
    }
    .bookmark-header a.bm-link-btn.icon {
      display: inline-block;
      border: none;
      padding: 0;
      font-size: 1.2rem;
    }
    `;
  }

  const activateNextPage = () => {
    const pageContainer = document.querySelector('.paging-container');
    if (!pageContainer) return;
    const right = pageContainer.querySelector('.right');
    if (!right.querySelector('.page_button_none')) return;

    const params = new URLSearchParams(location.search);
    const p = +params.get('p') || 1;
    const path = location.pathname;
    
    params.set('p', p+1);
    const rUrl = `${path}?${params.toLocaleString()}`;
    right.innerHTML = `<p class="page_button"><a href="${rUrl}" class="next">&gt;</a></p>`;

    const center = pageContainer.querySelector('.center ul');
    center.innerHTML = '';
    for (let i=Math.max(1, p-3); i<p+2; i++) {
      params.set('p', i);
      const cUrl = `${path}?${params.toLocaleString()}`;
      const d = (i == p) ? 'class="do"' : '';
      center.insertAdjacentHTML('beforeend', `<li><a href="${cUrl}" ${d}>${i}</a></li>`);
    }

    const left = pageContainer.querySelector('.left');
    if (left.querySelector('.page_button_none')) return;
    params.set('p', p-1);
    const lUrl = `${path}?${params.toLocaleString()}`;
    left.innerHTML = `<p class="page_button"><a href="${lUrl}" class="back">&lt;</a></p>`;
  }

  const addHash = async (params, container) => {
    const toggle = document.querySelector('#toggle-rev>input');
    if (!params.has('p')) params.set('p', 1);
    [...container.querySelectorAll('.illust-layout')]
      .map(layout=>layout.parentElement)
      .filter(a=>a.tagName=='A')
      .forEach((a, i)=>{
        if (a.tagName != 'A') return;
        params.set('_num', i);
        a.href = a.href.split('#')[0] + (toggle.checked ? '#' + params.toLocaleString() : '');
        a.target = '_new';
    });
    container.querySelectorAll('#okazu .okazu-layout').forEach((block, i)=>{
      block.querySelectorAll('a[href*="/view.php?id="]').forEach(a => {
        params.set('_num', i % 10);
        params.set('p', 1 + Math.floor(i / 10));
        a.href = a.href.split('#')[0] + (toggle.checked ? '#' + params.toLocaleString() : '');
        a.target = '_new';
      });
    });
  }

  const toggleFunc = async e => {
    const toggle = document.querySelector('#toggle-rev>input');
    localStorage['toggle-rev'] = +toggle.checked;
    if (['/','/index.php'].includes(location.pathname)) {
      for (const illustList of document.querySelectorAll('#illust-list')) {
        const params = new URLSearchParams(location.search);
        const a = illustList.nextElementSibling.querySelector('a');
        if (a != null) {
          const url = new URL(a.href);
          params.set('pathname', url.pathname);
          if (url.pathname == '/okazu.php') params.set('type','day');
        } else {
          params.set('pathname', location.pathname);
          const illustLayout = illustList.querySelectorAll('.illust-layout');
          const idList = [...illustLayout].map(el=>el.getAttribute('illust_id'));
          params.set('id_list', idList);
        }
        addHash(params, illustList);
      }
    } else {
      const params = new URLSearchParams(location.search);
      params.set('pathname', location.pathname);
      addHash(params, document.querySelector('#main-container'));
    }
  }

  class Random {
    constructor(seed = 88675123) {
      this.x = 123456789;
      this.y = 362436069;
      this.z = 521288629;
      this.w = seed;
    }
    
    next() {
      let t;
   
      t = this.x ^ (this.x << 11);
      this.x = this.y; this.y = this.z; this.z = this.w;
      return this.w = (this.w ^ (this.w >>> 19)) ^ (t ^ (t >>> 8)); 
    }
  }

  const bookmarkUpdate = async (id=0) => {
    const over = document.querySelector(".loading-over");
    const counter = over.querySelector('.loading-counter');
    try {
      over?.classList.add('enable');
      const div = document.createElement('div');
      const endId = await fetch(`/bookmark.php?p=1&id=${id}&sort=1`)
        .then(r=>r.text()).then(t=>new DOMParser().parseFromString(t, 'text/html'))
        .then(d=>d.querySelector('#illust-list .illust-layout')?.getAttribute('illust_id') ?? null);
      let idxId = null;
      for (let p=1; idxId != endId; p++) {
        const doc = await fetch(`/bookmark.php?p=${p}&id=${id}&sort=0`)
          .then(r=>r.text()).then(t=>new DOMParser().parseFromString(t, 'text/html'));
        doc.querySelectorAll('#illust-list>a').forEach(a=>{
          div.appendChild(a);
          const layout = a.querySelector('.illust-layout');
          idxId = layout.getAttribute('illust_id');
          a.querySelector('img[illust_id]').loading = 'lazy';
          if (counter) counter.textContent = 1+(+counter.textContent);
        });
      }
      localStorage['bookmark/'+id] = div.innerHTML;
      console.log(localStorage['bookmark/'+id]);
    }
    finally {
      over?.classList.remove('enable');
    }
  }

  const bookmarkAll = async () => {
    window.addEventListener('beforeunload', e=>history.replaceState({left: scrollX, top: scrollY}, ''));
    const aside = document.querySelector('.section-header .index aside');
    const params = new URLSearchParams(location.search);
    const id = params.get('id') ?? 0;
    const bp = `?p=-1&id=${id}&sort=`;
    aside.insertAdjacentHTML('beforeend', `<a id="bmUpdate" class="bm-link-btn icon" href><i class="fa-solid fa-rotate-right"></i></a><a id="bmNewer" class="bm-link-btn icon" href="${bp+0}"><i class="fa-solid fa-arrow-down"></i></a><a id="bmOlder" class="bm-link-btn icon" href="${bp+1}"><i class="fa-solid fa-arrow-up"></i></a><a id="bmShuffle" class="bm-link-btn icon" href="${bp+(+new Date()+2)}"><i class="fa-solid fa-shuffle"></i></a>`);
    document.querySelector('#bmUpdate').addEventListener('click', e=>{
      e.preventDefault();
      confirm('LocalStorageを更新しますか?') && bookmarkUpdate(id).then(()=>location.reload());
    });
    document.body.insertAdjacentHTML('afterbegin','<div class="loading-over"><div class="spinner"></div><div class="loading-counter"></div></div>');
    document.querySelector('.paging-wrapper')?.remove();
    const illustList = document.querySelector('#illust-list');
    illustList.innerHTML = localStorage['bookmark/'+id] ?? '';
    scrollTo(history.state);

    const isTwoColumns = !!$.cookie("expansion-layout");
    illustList.querySelectorAll('.illust-layout').forEach(il=>{
      il.classList.toggle('two-lines', isTwoColumns);
      il.classList.toggle('three-lines', !isTwoColumns);
    });

    const sort_num = params.get('sort') ?? 0;
    const ill = [...illustList.querySelectorAll(':scope>a')];
    if (sort_num == 1) illustList.replaceChildren(...ill.reverse());
    if (sort_num > 1) {
      const rand = new Random(sort_num);
      const n = ill.length;
      for (let i=0; i<n; i++) {
        const a = Math.abs(rand.next()) % n;
        const b = Math.abs(rand.next()) % n;
        [ill[a], ill[b]] = [ill[b], ill[a]];
      }
      illustList.replaceChildren(...ill); 
    }

    params.set('pathname', location.pathname);
    const idList = [...illustList.querySelectorAll('.illust-layout')].map(el=>el.getAttribute('illust_id'));
    params.set('id_list', idList);
    addHash(params, illustList);
  }

  const bookmarkMod = async () => {
    const aside = document.querySelector('#main-container>aside');
    aside.insertAdjacentHTML('afterend', `<div class="section-header bookmark-header"><div class="index"></div><ul class="layout-switch"><li class="header-button two-lines"><i id="two-cell" class="fa-solid fa-border-all"></i></li><li class="header-button three-lines"><i id="three-cell" class="fa-solid fa-table-cells"></i></li></ul></div>`);
    const sectionIndex = document.querySelector('.section-header .index');
    sectionIndex.appendChild(aside);
    const params = new URLSearchParams(location.search);
    const p = +params.get('p');
    params.set('p', (p < 0) ? 1 : -1);
    aside.insertAdjacentHTML('beforeend', `<a id="toggleAll" class="bm-link-btn" href="${'?'+params.toLocaleString()}">${(p < 0) ? 'TOP' : 'ALL'}</a>`);
    $($.cookie("expansion-layout") ? "#two-cell" : "#three-cell").addClass('do');
    $('.header-button.two-lines').on('click', function() {
      $('.illust-layout').removeClass('three-lines');
      $('.illust-layout').addClass('two-lines');
      $("#three-cell").removeClass('do');
      $("#two-cell").addClass('do');
      $.cookie("expansion-layout", "true");
    });
    $('.header-button.three-lines').on('click', function() {
      $('.illust-layout').addClass('three-lines');
      $('.illust-layout').removeClass('two-lines');
      $("#three-cell").addClass('do');
      $("#two-cell").removeClass('do');
      $.removeCookie("expansion-layout");
    });
    if (p < 0) await bookmarkAll();
  }

  const main = async () => {
    if (!location.pathname.match(/^\/((index|illust_view|index_like_illust|index_tag|bookmark|history_illust|history_nuita|search|search_all|illust|members_bookmark|okazu|dojin)\.php)?$/)) return;

    setStyle();

    document.querySelector('#head-right').insertAdjacentHTML('afterbegin', `<label id="toggle-rev" class="float-left"><input type="checkbox"><div></div></label>`);
    const toggle = document.querySelector('#toggle-rev>input');
    toggle.checked = !!+localStorage['toggle-rev'];
    
    toggle.addEventListener('change', toggleFunc);
    if (location.pathname == '/okazu.php') {
      document.querySelector('#more-button').addEventListener('click', toggleFunc);
    }
    toggleFunc();

    if (location.pathname == '/bookmark.php') await bookmarkMod();

    activateNextPage();
  }
    
  if (document.readyState == 'loading') {
    document.addEventListener('DOMContentLoaded', main);
  } else {
    main();
  }
}