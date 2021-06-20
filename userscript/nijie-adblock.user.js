// ==UserScript==
// @name         nijie-adblock
// @namespace    https://github.com/kou003/
// @version      1.1
// @description  nijie-adblock
// @author       kou003
// @match        https://sp.nijie.info/*
// @updateURL    https://github.com/kou003/nijie-util/raw/master/userscript/nijie-adblock.user.js
// @downloadURL  https://github.com/kou003/nijie-util/raw/master/userscript/nijie-adblock.user.js
// @grant        none
// @run-at       document-start
// ==/UserScript==
{
  'use strict';
  const main = () => {
    document.head.appendChild(document.createElement('style')).textContent = '#inter_background,#header_ad,#center_ad,#footer_ad,#view_header_ad,#sp_view_popup_header{display:none} .illust-layout div.illust-image{width: calc(100vw/3) !important;height: calc(100vw/3) !important;}';
  }
  if (document.readyState == 'loading') {
    document.addEventListener('DOMContentLoaded', main);
  } else {
    main();
  }
}