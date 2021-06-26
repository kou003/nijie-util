// ==UserScript==
// @name         nijie-adblock
// @namespace    https://github.com/kou003/
// @version      1.3
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
    document.head.appendChild(document.createElement('style')).textContent = '#inter_background,#header_ad,#center_ad,#footer_ad,#view_header_ad,#sp_view_popup_header{display:none}#illust-list{width:100%;}.illust-layout div.illust-image{width:100% !important;height:100% !important;position:absolute;top:0;top:0;z-index:1;}div[class^="thumbnail-"]{z-index:2;}.illust-layout{width:calc(100%/3);padding-top:calc(100%/3);overflow:hidden;}';
  }
  if (document.readyState == 'loading') {
    document.addEventListener('DOMContentLoaded', main);
  } else {
    main();
  }
}
