// ==UserScript==
// @name         nijie-error-cache
// @namespace    https://github.com/kou003/
// @version      1.0.0
// @description  nijie-error-cache
// @author       kou003
// @match        https://sp.nijie.info/*
// @updateURL    https://github.com/kou003/nijie-util/raw/master/userscript/nijie-error-cache.user.js
// @downloadURL  https://github.com/kou003/nijie-util/raw/master/userscript/nijie-error-cache.user.js
// @grant        none
// @run-at       document-start
// ==/UserScript==

{
  'use strict';
  const setHandler = () => {
    documment.querySelectorAll('[src^="//pic.nijie.net"]:not(data-have-handler)')
      .forEach(img => img.addEventListener('error', () => {
        img.dataset.haveHandler = true;
        const url = new URL(img.src);
        url.searchParams.set('error', true);
        img.src = url.href;
      }, { once: true }));
  }
  new MutationObserver(setHandler).observe(document, { childList: true, subtree: true });
  setHandler();
}
