// ==UserScript==
// @name         nijie-error-cache
// @namespace    https://github.com/kou003/
// @version      1.0.2
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
  const setErrorParam = media => {
    const url = new URL(media.src);
    url.searchParams.set('error', true);
    media.src = url.href;
  }
  const setHandler = () => {
    document.querySelectorAll('[src^="//pic.nijie.net"]:not([data-have-handler])')
      .forEach(media => {
        media.dataset.haveHandler = true;
        if (!media.error) setErrorParam(media);
        media.addEventListener('error', () => setErrorParam(media), { once: true });
      });
  }
  new MutationObserver(setHandler).observe(document, { childList: true, subtree: true });
  setHandler();
}
