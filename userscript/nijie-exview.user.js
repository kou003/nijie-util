// ==UserScript==
// @name         nijie-exview
// @namespace    https://github.com/kou003/
// @version      1.4
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
    document.head.appendChild(document.createElement('style')).textContent = `
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
    #exView:checked~#illust .ex-close {
      display: block;
    }
    #exView:checked ~ #illust .popup_illust {
      display: inline;
    }
    #exView:checked ~ div:not(#illust),
    #exView:checked ~ #illust a,
    #exView:checked ~ #illust .ex-open {
      display: none;
    }`;
    const viewCenter = document.querySelector('#view-center-block');
    viewCenter.insertAdjacentHTML('afterbegin', '<input id="exView" type="checkbox">');
    const illust = viewCenter.querySelector('#illust');
    illust.insertAdjacentHTML('beforeend', '<label class="ex-open" for="exView"><i class="fa fa-angle-down"></i><label>');
    illust.insertAdjacentHTML('beforeend', '<label class="ex-close" for="exView"><i class="fa fa-angle-up"></i><label>');
    const exView = viewCenter.querySelector('#exView');
    const exClose = illust.querySelector('.ex-close');
    const url = location.href.replace('view.php', 'view_popup.php');
    const text = await fetch(url).then(r => r.text());
    const doc = new DOMParser().parseFromString(text, 'text/html');
    const imgs = doc.querySelectorAll('.popup_illust');
    imgs.forEach((img, i) => {
      illust.appendChild(img);
      img.addEventListener('click', e => {
        imgs[(i + 1) % imgs.length].scrollIntoView();
      }, false);
      illust.appendChild(exClose.cloneNode(true));
    });
    exView.onchange = async e => (exView.checked ? imgs[0] : illust).scrollIntoView();
  }
  if (document.readyState == 'loading') {
    document.addEventListener('DOMContentLoaded', main);
  } else {
    main();
  }
}