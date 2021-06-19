// ==UserScript==
// @name         nijie-exview
// @namespace    https://github.com/kou003/
// @version      2.0
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
  const setStyle = () => {
    document.head.appendChild(document.createElement('style')).textContent = `
    #bmWindow {
      position: fixed;
      left: 0;
      bottom: 0;
      border: none;
      width: 100%;
      height: 0;
      z-index: 10;
      text-align: right;
      font-size: 2rem;
      color: white;
      background-color: #D7712D;
      transition: all 300ms;
    }
    #bmWindow.open {
      height: 80%;
    }
    #bmWindow i {
      margin: 0.1em;
    }
    #bmWindow iframe {
      width: 100%;
      height: 100%;
      border: solid 2px #D7712D;
      box-sizing: border-box;
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
    }
    `
  }
  const setSwipe = (document) => {
    let startX;
    let startY;
    let moveX;
    let moveY;
    let startT;
    let moveT;
    const dist = 100;
    const maxSlope = 0.5;
    const minSpeed = 0.5;
    let element = document.querySelector('#illust');
    element.outerHTML = element.outerHTML;
    element = document.querySelector('#illust');
    if (element) {
      element.addEventListener("touchstart", function (event) {
        startX = event.touches[0].clientX;
        startY = event.touches[0].clientY;
        startT = event.timeStamp;
      });

      element.addEventListener("touchmove", function (event) {
        moveX = event.changedTouches[0].clientX;
        moveY = event.changedTouches[0].clientY;
        moveT = event.timeStamp;
      });

      element.addEventListener("touchend", function () {
        let diffX = moveX - startX;
        let diffY = moveY - startY;
        let diffT = moveT - startT;
        let slope = Math.abs(diffY / diffX);
        let speed = Math.abs(diffX / diffT);
        console.log(diffX, diffY, slope, speed);
        if (Math.abs(diffX) > dist && slope < maxSlope && speed > minSpeed) {
          document.querySelector(diffX > 0 ? "#next_illust" : "#prev_illust").click();
        }
      });
    }
  }
  const element = {
    template: document.createElement('template'),
    create: function (string) {
      this.template.innerHTML = string;
      return this.template.content.firstElementChild;
    }
  }
  const dom = url => fetch(url).then(r => r.text()).then(t => new DOMParser().parseFromString(t, 'text/html'));
  const exBookmark = (document) => {
    const bmwin = document.body.appendChild(element.create('<div id="bmWindow"><i class="fa fa-window-close"></i><iframe/></div>'));
    const bmframe = bmwin.querySelector('iframe');
    bmwin.querySelector('i').addEventListener('click', e => {
      bmwin.classList.remove('open');
      bmframe.src = '';
      changePage(document.location.href, true);
    });
    const bmButton = document.querySelector('#bookmark_button a');
    bmButton.removeAttribute('onclick');
    bmButton.addEventListener('click', e => {
      const p = bmButton.querySelector('p');
      if (p.id == 'bookmark') {
        if (confirm('ブックマークに追加してもよろしいですか？')) {
          bmframe.src = bmButton.href;
          bmwin.classList.add('open');
        }
      } else {
        bmframe.src = bmButton.href;
        bmwin.classList.add('open');
      }
      e.preventDefault();
    });
  }
  const exView = async (document) => {
    if (document.body.dataset.extend) return;
    document.body.dataset.extend = true;
    setSwipe(document);
    exBookmark(document);
    const viewCenter = document.body.querySelector('#view-center-block');
    const illust = viewCenter.querySelector('#illust');
    illust.querySelector('a').onclick = e => false;
    const exView = element.create('<input id="exView" type="checkbox" disabled>');
    viewCenter.insertAdjacentElement('afterbegin', exView);
    const exOpen = element.create('<label class="ex-open" for="exView"><i class="fa fa-angle-down"></i><label>');
    const exClose = element.create('<label class="ex-close" for="exView"><i class="fa fa-angle-up"></i><label>');
    illust.append(exOpen);
    const url = document.URL.replace('view.php', 'view_popup.php');
    const doc = await dom(url);
    const imgs = doc.querySelectorAll('.popup_illust');
    imgs.forEach((img, i) => {
      illust.appendChild(img);
      img.addEventListener('click', e => imgs[(i + 1) % imgs.length].scrollIntoView());
      illust.appendChild(exClose.cloneNode(true));
    });
    exView.onchange = e => exView.checked ? illust.scrollIntoView() : scroll(0,0);
    exView.disabled = false;
  }

  async function changePage(href, reload = false) {
    if (!docMap.has(href) || reload) docMap.set(href, await dom(href));
    if (document.location.href != href || reload) {
      const olddoc = document;
      const newdoc = docMap.get(href);
      [olddoc.body, newdoc.body] = [newdoc.body, olddoc.body];
      document.title = newdoc.title;
      history.pushState({}, document.title, href);
    } else {
      history.replaceState({}, document.title, href);
    }
    exView(document);
    console.log(document.location, document.URL, document.body);
    document.querySelectorAll('#prev_illust,#next_illust').forEach(a => {
      console.log(a);
      a.addEventListener('click', e => {
        changePage(a.href);
        e.preventDefault();
      });
      if (!docMap.has(a.href)) {
        dom(a.href).then(d => {
          docMap.set(a.href, d);
          exView(d);
        });
      }
    });
  }
  const main = () => {
    setStyle();
    window.docMap = new Map([
      [document.location.href, document.cloneNode(deep = true)]
    ]);
    changePage(document.location.href);
    window.onpopstate=e=>changePage(document.location.href);
  }
  if (document.readyState == 'loading') {
    document.addEventListener('DOMContentLoaded', main);
  } else {
    main();
  }
}