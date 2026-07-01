// ==UserScript==
// @name         getUrlVars
// @namespace    https://github.com/kou003/
// @version      1.0.0
// @description  Get URL variables
// @author       kou003
// @match        https://sp.nijie.info/*
// @updateURL    https://github.com/kou003/nijie-util/raw/master/userscript/getUrlVars.user.js
// @downloadURL  https://github.com/kou003/nijie-util/raw/master/userscript/getUrlVars.user.js
// @grant        none
// @run-at       document-start
// ==/UserScript==

Object.defineProperty(window, 'getUrlVars', {
  get: function () {
    return () => Object.fromEntries(new URLSearchParams(window.location.search).entries());
  },
  set: function (value) {},
  configurable: false,
  enumerable: true
});
