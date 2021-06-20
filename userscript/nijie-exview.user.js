// ==UserScript==
// @name         nijie-exview
// @namespace    https://github.com/kou003/
// @version      3.3
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
    
    #view-image-block #_illust img {
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
    #exView:checked~#_illust .ex-close {
      display: block;
    }
    #exView:checked ~ #_illust .popup_illust {
      display: inline;
    }
    #exView:checked ~ div:not(#_illust),
    #exView:checked ~ #_illust a,
    #exView:checked ~ #_illust .ex-open {
      display: none;
    }

    #_illust {
      counter-reset: num 0 total var(--total);
    }
    #_illust .ex-open::after {
      content: " (" counter(total) ")";
    }
    #_illust .ex-close::after {
      counter-increment: num;
      content: " (" counter(num) " / " counter(total) ")";
    }
    `
  }

  const element = {
    template: document.createElement('template'),
    create: function (string) {
      this.template.innerHTML = string;
      return this.template.content.firstElementChild;
    }
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
    const old = document.querySelector('#illust');
    if (!old) return;
    const illust = element.create('<div id="_illust" />');
    const label = element.create('<label for="exView" />');
    const img = old.querySelector('a img');
    img.replaceWith(label);
    label.appendChild(img);
    illust.replaceChildren(...old.children);
    old.replaceWith(illust);
    illust.addEventListener("touchstart", event => {
      startX = event.touches[0].clientX;
      startY = event.touches[0].clientY;
      startT = event.timeStamp;
    });
    illust.addEventListener("touchmove", event => {
      moveX = event.changedTouches[0].clientX;
      moveY = event.changedTouches[0].clientY;
      moveT = event.timeStamp;
    });
    illust.addEventListener("touchend", event => {
      let diffX = moveX - startX;
      let diffY = moveY - startY;
      let diffT = moveT - startT;
      let slope = Math.abs(diffY / diffX);
      let speed = Math.abs(diffX / diffT);
      console.log(diffX, diffY, slope, speed);
      if (Math.abs(diffX) > dist && slope < maxSlope && speed > minSpeed) {
        console.log('SWIPED!');
        window.document.querySelector(diffX > 0 ? "#next_illust" : "#prev_illust").click();
      }
    });
  }

  const dom = url => fetch(url).then(r => r.text()).then(t => {
    let d = new DOMParser().parseFromString(t, 'text/html');
    d.body.dataset.title = d.title;
    d.body.dataset.href = url;
    return d;
  });

  const exBookmark = (document) => {
    const bmwin = document.body.appendChild(element.create('<div id="bmWindow"><i class="fa fa-window-close"></i><iframe/></div>'));
    const bmframe = bmwin.querySelector('iframe');
    bmwin.querySelector('i').addEventListener('click', e => {
      bmwin.classList.remove('open');
      bmframe.src = '';
      changePage(document.body.dataset.href, 'reload');
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

  const loadScript = document => {
    let g = Object.assign(e => $(e, document.body), $);
    window.scriptFunc.forEach(f => f(document, g));
  }

  const exView = async (document) => {
    if (document.body.dataset.extend) return;
    document.body.dataset.extend = true;
    setSwipe(document);
    loadScript(document);
    exBookmark(document);
    document.querySelectorAll('#sub_button a').forEach(a => a.target = '_new');
    const viewCenter = document.body.querySelector('#view-center-block');
    const illust = viewCenter.querySelector('#_illust');
    const exView = element.create('<input id="exView" type="checkbox" disabled>');
    viewCenter.insertAdjacentElement('afterbegin', exView);
    const exOpen = element.create('<label class="ex-open" for="exView"><i class="fa fa-angle-down"></i><label>');
    const exClose = element.create('<label class="ex-close" for="exView"><i class="fa fa-angle-up"></i><label>');
    illust.appendChild(exOpen);
    const url = document.body.dataset.href.replace('view.php', 'view_popup.php');
    dom(url).then(doc => {
      const imgs = doc.querySelectorAll('.popup_illust');
      illust.style.setProperty('--total', imgs.length);
      imgs.forEach((img, i) => {
        illust.appendChild(img);
        img.addEventListener('click', e => imgs[(i + 1) % imgs.length].scrollIntoView());
        illust.appendChild(exClose.cloneNode(true));
      });
      exView.onchange = e => exView.checked ? illust.scrollIntoView() : scroll(0, 0);
      exView.disabled = false;
    });
    return document;
  }

  const exbody = url => dom(url).then(exView).then(d => doctmp.appendChild(d.body));
  
  async function changePage(href, mode='push') {
    /**mode: [push, pop, reload] */
    scroll(0,0);
    console.log('changePage: ', href);
    console.log('mode:', mode);
    if (!docMap.has(href) || mode == 'reload') docMap.set(href, await exbody(href));
    document.body = docMap.get(href);
    document.title = document.body.dataset.title;
    if (mode == 'push') {
      history.pushState({}, document.title, document.body.dataset.href);
    } else {
      history.replaceState({}, document.title, document.body.dataset.href);
    }
    console.log(document.location.href);
    document.querySelectorAll('#prev_illust,#next_illust').forEach(a => {
      a.onclick = e => {
        console.log('CLICKED!');
        changePage(e.currentTarget.href);
        return !!e.preventDefault();
      };
      if (!docMap.has(a.href)) exbody(a.href).then(d => docMap.set(a.href, d));
    });
  }
  const main = async () => {
    if (window.parent != window) return;
    setStyle();
    window.doctmp = document.createDocumentFragment();
    window.scriptFunc = await Promise.all([...document.querySelectorAll('script[src^="/"],script[src^="https://sp.nijie.info/"]')]
      .map(s => fetch(s.src).then(r => r.text()).then(t => new Function('document', '$', t))));
    window.docMap = new Map();
    changePage(document.location.href, 'reload');
    window.onpopstate = e => {
      changePage(document.location.href, 'pop');
    }
  }
  if (document.readyState == 'loading') {
    document.addEventListener('DOMContentLoaded', main);
  } else {
    main();
  }
}