// ==UserScript==
// @name         nijie-exview-sub
// @namespace    https://github.com/kou003/
// @version      1.4.4
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
    });
    container.querySelectorAll('#okazu .okazu-layout').forEach((block, i)=>{
      block.querySelectorAll('a[href*="/view.php?id="]').forEach(a => {
        params.set('_num', i % 10);
        params.set('p', 1 + Math.floor(i / 10));
        a.href = a.href.split('#')[0] + (toggle.checked ? '#' + params.toLocaleString() : '');
      });
    });
  }

  const toggleFunc = async e => {
    const toggle = document.querySelector('#toggle-rev>input');
    localStorage['toggle-rev'] = +toggle.checked;
    if (['/','/index.php'].includes(location.pathname)) {
      for (const illsutList of document.querySelectorAll('#illust-list')) {
        const params = new URLSearchParams(location.search);
        const a = illsutList.nextElementSibling.querySelector('a');
        if (a != null) {
          const url = new URL(a.href);
          params.set('pathname', url.pathname);
          if (url.pathname == '/okazu.php') params.set('type','day');
        } else {
          params.set('pathname', location.pathname);
          const illustLayout = illsutList.querySelectorAll('.illust-layout');
          const idList = [...illustLayout].map(el=>el.getAttribute('illust_id'));
          params.set('id_list', idList);
        }
        addHash(params, illsutList);
      }
    } else {
      const params = new URLSearchParams(location.search);
      params.set('pathname', location.pathname);
      addHash(params, document.querySelector('#main-container'));
    }
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

    activateNextPage();
  }
    
  if (document.readyState == 'loading') {
    document.addEventListener('DOMContentLoaded', main);
  } else {
    main();
  }
}