// ==UserScript==
// @name         nijie-exview-sub
// @namespace    https://github.com/kou003/
// @version      1.1.5
// @description  nijie-exview-sub
// @author       kou003
// @match        https://sp.nijie.info/illust_view.php.php*
// @match        https://sp.nijie.info/index_like_illust.php*
// @match        https://sp.nijie.info/bookmark.php*
// @match        https://sp.nijie.info/history_illust.php*
// @match        https://sp.nijie.info/history_nuita.php*
// @match        https://sp.nijie.info/search.php*
// @match        https://sp.nijie.info/illust.php*
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

  const main = async () => {
    setStyle();

    document.querySelector('#head-right').insertAdjacentHTML('afterbegin', `<label id="toggle-rev" class="float-left"><input type="checkbox"><div></div></label>`);
    const toggle = document.querySelector('#toggle-rev>input');
    toggle.checked = !!+localStorage['toggle-rev'];
    const toggleFunc = async e => {
      localStorage['toggle-rev'] = +toggle.checked;
      const params = new URLSearchParams(location.search);
      params.set('pathname', location.pathname);
      if (!params.has('p')) params.set('p', 1);
      document.querySelectorAll('#main-container a[itemprop]').forEach((a, i)=>{
        params.set('num', i);
        a.href = a.href.split('#')[0] + (toggle.checked ? '#' + params.toLocaleString() : '');
      });
    }
    toggle.addEventListener('change', toggleFunc);
    toggleFunc();

    activateNextPage();
  }
    
  if (document.readyState == 'loading') {
    document.addEventListener('DOMContentLoaded', main);
  } else {
    main();
  }
}