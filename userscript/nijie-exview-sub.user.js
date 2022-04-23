// ==UserScript==
// @name         nijie-exview
// @namespace    https://github.com/kou003/
// @version      1.0.0
// @description  nijie-exview
// @author       kou003
// @match        https://sp.nijie.info/illust_view.php.php*
// @match        https://sp.nijie.info/index_like_illust.php*
// @match        https://sp.nijie.info/bookmark.php*
// @match        https://sp.nijie.info/history_illust.php*
// @match        https://sp.nijie.info/history_nuita.php*
// @updateURL    https://github.com/kou003/nijie-util/raw/master/userscript/nijie-exview.user.js
// @downloadURL  https://github.com/kou003/nijie-util/raw/master/userscript/nijie-exview.user.js
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
    `;
  }

  const main = async () => {
    setStyle();
    document.querySelector('#head-right').insertAdjacentHTML('afterbegin', `<label id="toggle-rev" class="float-left"><input type="checkbox"><div></div></label>`);
    const toggle = document.querySelector('#toggle-rev>input');
    toggle.checked = !!+localStorage['toggle-rev'];
    const func = e => {
      localStorage['toggle-rev'] = +toggle.checked;
      const params = new URLSearchParams(location.search);
      params.set('pathname', location.pathname);
      if (!params.has('p')) params.set('p', 1);
      document.querySelectorAll('#illust-list>a[itemprop]').forEach((a, i)=>{
        params.set('num', i);
        a.href = a.href.split('#')[0] + (toggle.checked ? '#' + params.toLocaleString() : '');
      });
    }
    toggle.addEventListener('change', func);
    func();
  }
    
  if (document.readyState == 'loading') {
    document.addEventListener('DOMContentLoaded', main);
  } else {
    main();
  }
}