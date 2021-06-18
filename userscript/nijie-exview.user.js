// ==UserScript==
// @name         nijie-exview
// @namespace    https://github.com/kou003/
// @version      1.0
// @description  nijie-exview
// @author       kou003
// @match        https://sp.nijie.info/view.php?id=*
// @updateURL    https://github.com/kou003/nijie-util/raw/master/userscript/nijie-exview.user.js
// @downloadURL  https://github.com/kou003/nijie-util/raw/master/userscript/nijie-exview.user.js
// @grant        none
// @run-at       document-start
// ==/UserScript==

{
  'use strict';
  const main = async () => {
    const style = document.head.appendChild(document.createElement('style'));
    style.textContent=`
    #exView {
      display: none;
    }
    .ex-open, #exView:checked~.ex-close {
      display: block;
    }
    #exView:checked~.popup_illust {
      display: inline;
    }
    #exView:checked~.ex-open, .ex-close, .popup_illust {
      display: none;
    }`;
    const illust = document.querySelector('#illust');
    illust.insertAdjacentHTML('beforeend', '<input id="exView" type="checkbox">');
    illust.insertAdjacentHTML('beforeend', '<label class="ex-open" for="exView"><i class="fa fa-angle-down"></i><label>');
    illust.insertAdjacentHTML('beforeend', '<label class="ex-close" for="exView"><i class="fa fa-angle-up"></i><label>');
    const exView = illust.querySelector('#exView');
    const exClose = illust.querySelector('.ex-close');
    exView.onchange = async e => {
      exView.onchange=e=>(exView.checked ? illust.querySelector('.popup_illust') : illust).scrollIntoView();
      const url = location.href.replace('view.php', 'view_popup.php');
      const text = await fetch(url).then(r=>r.text());
      const doc = new DOMParser().parseFromString(text, 'text/html');
      const imgs = doc.querySelectorAll('.popup_illust');
      imgs.forEach(img => {
        illust.appendChild(img);
        img.addEventListener('click', (e,i)=>{
          imgs[(i+1)%imgs.length].scrollIntoView();
        }, false);
        illust.appendChild(exClose.cloneNode(true));
      });
      imgs[0].scrollIntoView();
    }
  }
  if (document.readyState == 'loading') {
    document.addEventListener('DOMContentLoaded', main);
  } else {
    main();
  }
}