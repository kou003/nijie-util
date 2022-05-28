// ==UserScript==
// @name         nijie-exview
// @namespace    https://github.com/kou003/
// @version      3.11.5
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

    #manga,#filter{display:none}
    `
  }

  const RingBuffer = class {
    constructor(n=1, defaultFanc, beforeDelete) {
      this.buf = new Array(n);
      this.map = new Map();
      this.cur = 0;
      this.defaultFanc = defaultFanc;
      this.beforeDelete = beforeDelete;
    }

    get(key) {
      if (this.map.has(key)) {
        return this.map.get(key);
      }
      if (typeof this.defaultFanc == 'function') {
        const value = this.defaultFanc(key);
        if (value instanceof Promise) {
          return value.then(v=>this.set(key, v)).then(()=>this.get(key));
        } else {
          this.set(key, value);
          return this.get(key);
        }
      }
      return;
    }

    set(key, value) {
      if (this.map.has(key)) {
        this.map.set(key, value);
        return;
      }
      const old = this.buf[this.cur];
      if (typeof this.beforeDelete == 'function') {
        const res = this.beforeDelete(old, this.get(old));
        if (res instanceof Promise) return res.then(()=>this.overSet(key, value))
      }
      return this.#overSet(key, value);
    }

    #overSet(key, value) {
      const old = this.buf[this.cur];
      this.map.delete(old);
      this.buf[this.cur] = key;
      this.cur = (this.cur + 1) % this.buf.length;
      this.map.set(key, value);
    }

    has(key) {
      return this.map.has(key);
    }
    
  }

  Object.defineProperty(HTMLMediaElement.prototype, 'playing', {
    get: function(){
        return !!(this.currentTime > 0 && !this.paused && !this.ended && this.readyState > 2);
    }
  })

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
    const dist = 80;
    const maxSlope = 0.5;
    const minSpeed = 0.5;
    const illust = document.querySelector('#illust');
    if (!illust) return;
    illust.querySelectorAll('.lazy').forEach(e=>e.classList.remove('lazy'));
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
      console.log(`dx: ${diffX}, dy: ${diffY}, slope: ${slope}, speed: ${speed}`);
      if (Math.abs(diffX) > dist && slope < maxSlope && speed > minSpeed) {
        console.log('swiped');
        window.document.querySelector(diffX > 0 ? "#next_illust" : "#prev_illust").click();
      }
    });
  }

  const dom = url => fetch(url).then(r => r.text()).then(t => {
    t = t.replaceAll('http://pic01','https://pic01');
    let d = new DOMParser().parseFromString(t, 'text/html');
    d.body.dataset.title = d.title;
    d.body.dataset.href = url;
    d.body.dataset.scrollY = 105;
    return d;
  });

  const exBookmark = (document) => {
    const bmwin = document.body.appendChild(element.create('<div id="bmWindow"><i class="fa fa-window-close"></i><iframe/></div>'));
    const bmframe = bmwin.querySelector('iframe');
    bmwin.querySelector('i').addEventListener('click', e => {
      bmwin.classList.remove('open');
      bmframe.src = '';
      changePage(window.document.body.dataset.href, 'reload');
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
    let g = Object.assign((e, t) => (typeof e == 'function') ? e() : $(e, document.body), $);
    scriptFunc.forEach(f => f(document, g));
  }

  const reloadTriger = document => {
    const TIMEOUT = 1000;
    let tid = 0;
    const element = document.querySelector('#head-left>h1');
    if (!element) return;
    element.addEventListener('touchstart', e=>{
      clearTimeout(tid);
      tid = setTimeout(()=>confirm('リロードしますか?')&&changePage(location.href, 'reload'), TIMEOUT);
    });
    element.addEventListener('touchend', e=>clearTimeout(tid));
  }

  const resolveUrl = async (params, pathname, num, p, d, cd) => {
    if (p < 1) return (d > 0) ? resolveUrl(params, pathname, 1, 1, d) : void(0);
    if (!cd && num < 0) return resolveUrl(params, pathname, num, p-1, d, true);

    if (pathname == '/okazu.php') {
      if (num >= 10) return resolveUrl(params, pathname, 0, p+1, d);
      const okazuType = params.get('type') || 'recent_now';
      const okazuNum = Math.max(p - 1, 0) * 10;
      const startTime = params.get('start_time');
      const endTime = params.get('end_time');
      const pureParams = new URLSearchParams({
        type: okazuType,
        num: okazuNum
      });
      if (startTime && endTime) {
        pureParams.set('start_time', startTime);
        pureParams.set('end_time', endTime);
      }
      const query = pureParams.toLocaleString();
      const hrefs = await okazuBuffer.get(query);
      params.set('p', p);
      if (hrefs.length == 0) return (d < 0) ? resolveUrl(params, pathname, 9, p-1, d, true) : void(0);
      if (!!cd) num = hrefs.length - 1;
      if (num >= hrefs.length) return resolveUrl(params, pathname, 0, p+1, d);
      console.log(hrefs);
      params.set('_num', num);
      const href = hrefs[num] + '#' + params.toLocaleString();
      return href;
    }
    params.set('p', p);
    const pureParams = new URLSearchParams(params);
    pureParams.delete('pathname');
    pureParams.delete('_num');
    const url = pathname + '?' + pureParams.toLocaleString();
    const hrefs = await listBuffer.get(url);
    if (hrefs.length == 0) return (d < 0) ? resolveUrl(params, pathname, num, p-1, d, true) : void(0)
    if (!!cd) num = hrefs.length - 1;
    if (num >= hrefs.length) return resolveUrl(params, pathname, 0, p+1, d);
    params.set('_num', num);
    const href = hrefs[num] + '#' + params.toLocaleString();
    return href;
  }

  const revUrl = async (hash, d, url) => {
    const params = new URLSearchParams(hash.replace('#','?'));
    const pathname = params.get('pathname');
    const num = params.get('_num');
    const p = params.get('p') || 1;
    if (!pathname || num == null || p == null) return url;
    return resolveUrl(params, pathname, +num+d, +p, d);
  }

  const exView = async (document) => {
    if (document.body.dataset.extend) return;
    document.body.dataset.extend = true;
    setSwipe(document);
    loadScript(document);
    exBookmark(document);
    reloadTriger(document);
    document.querySelectorAll('#sub_button a').forEach(a => a.target = '_new');
    const location = new URL(document.body.dataset.href);
    location.hash = '';
    const viewCenter = document.body.querySelector('#view-center-block');

    const illust = viewCenter.querySelector('#illust');
    const topIllust = illust.querySelector('[illust_id]') || illust.querySelector('a>img');
    const loadPopups = async e=>{
      illust.querySelectorAll('.popup_illust').forEach(img=>{
        const src = img.dataset.src;
        if (src) {img.src = src; img.dataset.src='';}
      })
    }
    console.log(topIllust);
    topIllust.addEventListener('load', loadPopups);
    topIllust.addEventListener('loadedmetadata', loadPopups);
    const exLabel = element.create('<label for="exView" />');
    const illustAnk = illust.querySelector(':scope>p>a');
    illustAnk.onclick = e => {exLabel.click(); return e.preventDefault()};
    exLabel.appendChild(illustAnk);
    exLabel.addEventListener('click', e=>{
      const v=exLabel.querySelector('video');
      if (v && !v.playing()) v.play();
      loadPopups();
    });
    illust.querySelector(':scope>p').appendChild(exLabel);

    const viewTitle = document.querySelector('.view-title');
    const titleAnker = document.createElement('a');
    titleAnker.href = location.href;
    titleAnker.target = '_blank';
    titleAnker.appendChild(viewTitle.firstChild);
    viewTitle.appendChild(titleAnker);
    
    const exViewCheck = element.create('<input id="exView" type="checkbox" disabled>');
    viewCenter.insertAdjacentElement('afterbegin', exViewCheck);
    const exOpen = element.create('<label class="ex-open" for="exView"><i class="fa fa-angle-down"></i><label>');
    const exClose = element.create('<label class="ex-close" for="exView"><i class="fa fa-angle-up"></i><label>');
    illust.appendChild(exOpen);

    const popup_url = location.href.replace('view.php', 'view_popup.php');
    dom(popup_url).then(doc => {
      const imgs = doc.querySelectorAll('.popup_illust');
      illust.style.setProperty('--total', imgs.length);
      imgs.forEach((img, i) => {
        //img.loading='lazy';
        if (!topIllust.complete && !topIllust.readyState) {
          img.dataset.src = img.src;
          img.src = '';
        }
        illust.appendChild(img);
        img.addEventListener('click', e => imgs[(i + 1) % imgs.length].scrollIntoView());
        illust.appendChild(exClose.cloneNode(true));
      });
      exViewCheck.onchange = e => exViewCheck.checked ? illust.scrollIntoView() : scroll(0, 0);
      exViewCheck.disabled = false;
    });
    return document;
  }

  const exbody = async url => {
    const d = await dom(url).then(exView);
    const body = d.body;
    body.remove();
    return body;
  }

  const changePage = async (href, mode='push') => {
    /**mode: [push, pop, reload] */
    console.log('changePage: ', href);
    console.log('mode:', mode);
    if (mode == 'reload') bodyBuffer.set(href, await exbody(href));
    document.body = await bodyBuffer.get(href);
    illustBuffer.get(href);
    const dataset = document.body.dataset;
    document.title = dataset.title;
    if (mode == 'push') {
      history.pushState({}, dataset.title, dataset.href);
    } else {
      history.replaceState({}, dataset.title, dataset.href);
    }
    scroll(0, dataset.scrollY);
    const v = document.querySelector('#illust video');
    if (v) v.play();

    console.log(document.location.href);
    const viewNav = document.querySelector('.view-nav ul');
    const location = new URL(document.body.dataset.href);
    console.log(document.title);
    Promise.all([[-1, 'li:first-of-type', 'left', 'next'], [+1, 'li:last-of-type', 'right', 'prev']].map(async args=>{
      const [d, q, t, u] = args;
      const btn = viewNav.querySelector(q);
      const ank = btn.querySelector('a:not(.do)');
      const oriUrl = ank ? ank.href : null;
      btn.innerHTML = '\u00a0';
      const url = await revUrl(location.hash, d, oriUrl);
      if (url) {
        btn.innerHTML = `<a id="${u}_illust" href="${url}"><i class="fa-solid fa-chevron-${t}"></i></a>`;
        const a = btn.firstChild;
        a.onclick = e => {
            console.log('clicked');
            changePage(e.currentTarget.href);
            return !!e.preventDefault();
          };
        illustBuffer.get(url);
      }
      }));
  }

  const scriptFilter = (src, t) => {
    if (src.match('view_popup.js')) {
      t = '';
    } else if (src.match('common.js')) {
      t = t.replace(/setTimeout[\s\S]*?}, 1\);/, '');
      t = t.replace(/,\s*menuWidth = burger.outerWidth\(\)/, '');
      t = t.replaceAll('menuWidth', 'burger.outerWidth()');
      console.log(t);
    } else if (src.match('view.js')) {
      t = t.replace(/function setSwipe[\s\S]*setSwipe\(\);/, '');
      t = t.replace(/nuita_lock == true/, 'nuita_lock||!confirm("抜いた?")');
      t = t.replace('var query = getUrlVars();', '');
      t = t.replaceAll('query', 'getUrlVars()');
    }
    return t;
  }

  const main = async () => {
    if (window.parent != window) return;
    setStyle();
    window.scriptFunc = await Promise.all([...document.querySelectorAll('script[src]')]
      .filter(s=>s.src.startsWith('https://sp.nijie.info/')).map(async s => {
      const t = await fetch(s.src).then(r => r.text()).then(t=>scriptFilter(s.src, t));
      return new Function('document', '$', t);
    }));
    window.bodyBuffer = new RingBuffer(50, exbody);
    window.illustBuffer = new RingBuffer(10, async href => {
      const body = await bodyBuffer.get(href);
      const top = body.querySelector('#illust [illust_id]') || body.querySelector('#illust a>img');
      const ele = document.createElement(top?top.tagName:'img');
      ele.onload = e => console.log('illust loaded', href);
      ele.src = top.src;
      return ele;
    });
    window.listBuffer = new RingBuffer(3, async url => {
      const d = await dom(url);
      const hrefs = [...d.querySelectorAll('#main-container a[itemprop]')].map(a=>a.href);
      return hrefs;
    });
    window.okazuBuffer = new RingBuffer(3, async params => {
      const options = {
        "method": "POST",
        "headers": {
          "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
          "x-requested-with": "XMLHttpRequest"
        },
        "body": params
      }
      const json = await fetch('https://sp.nijie.info/php/ajax/get_okazu.php', options).then(r=>r.json());
      const d = new DOMParser().parseFromString(json.data, 'text/html');
      const hrefs = [...d.querySelectorAll('.okazu-layout .title a[href*="/view.php?id="]')].map(a=>a.href);
      return hrefs;
    });
    changePage(document.location.href, 'reload');
    window.onscroll = e => document.body.dataset.scrollY = window.scrollY;
    window.onpopstate = e => changePage(document.location.href, 'pop');
  }
  if (document.readyState == 'loading') {
    document.addEventListener('DOMContentLoaded', main);
  } else {
    main();
  }
}