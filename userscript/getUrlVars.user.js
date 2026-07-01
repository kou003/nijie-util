// ==UserScript==
// @name         getUrlVars
// @namespace    https://github.com/kou003/
// @version      1.0.1
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
  set: function (value) { },
  configurable: false,
  enumerable: true
});

window.addEventListener('DOMContentLoaded', () => {
  $(function () {

    // イラストサムネ ハートブックマーク
    $(document).on('click', '.illust-bookmark-btn', function (e) {
      e.preventDefault();
      e.stopPropagation();
      var $btn = $(this);
      if ($btn.hasClass('done')) return;
      var illust_id = parseInt($btn.attr('illust_id'), 10);
      if (!illust_id) return;
      $btn.addClass('done pop');
      setTimeout(function () { $btn.removeClass('pop'); }, 260);
      $.post('/php/ajax/bookmark/add_illust.php',
        { illust_id: illust_id },
        function (data) {
          if (data && data.login === 0) {
            $btn.removeClass('done');
            location.href = '/login.php';
          }
        }, 'json');
    });

    // ブックマーク済み判定: 指定スコープ内のハートに done を付与
    window.nijieApplyBookmarkStatus = function (scope) {
      var $scope = scope ? $(scope) : $(document);
      var $btns = $scope.find('.illust-bookmark-btn').not('.done');
      if (!$scope.is(document)) {
        $btns = $btns.add($scope.filter('.illust-bookmark-btn').not('.done'));
      }
      if ($btns.length === 0) return;
      var idSet = {}, ids = [];
      $btns.each(function () {
        var id = parseInt($(this).attr('illust_id'), 10);
        if (id && !idSet[id]) { idSet[id] = true; ids.push(id); }
      });
      if (ids.length === 0) return;
      $.post('/php/ajax/bookmark/check_list.php',
        { 'illust_ids[]': ids },
        function (data) {
          if (!data || !data.result || data.result.length === 0) return;
          var done = {};
          $.each(data.result, function (_, id) { done[id] = true; });
          $btns.each(function () {
            var id = parseInt($(this).attr('illust_id'), 10);
            if (done[id]) $(this).addClass('done');
          });
        }, 'json');
    };
    window.nijieApplyBookmarkStatus(document);

    //検索メニュー部分
    $("#search").on('click', function () {
      $("#search-display").toggle();
    });
    $("#search-close").on('click', function () {
      $("#search-display").hide();
    });
    //スライドボタン部分
    $("p#open").on('click', function () {
      $("#slideBox").slideToggle("fast");
    });


    //setImageSize();

    setTimeout(function () {
      window.scrollTo(0, 1);
    }, 1);

    // トップページ抜いたレコメンドのjs
    $('#nuita_recommend_list p#load').on('click', function () {
      $("#nuita_recommend_list #illust-list").css({
        "height": "auto",
        "overflow": "hidden"
      });

      $('#nuita_recommend_list p#load').hide();
    });

    //menuの検索補完
    $("#search_form").autocomplete({
      source: function (req, res) {
        var listId = (req.term.charCodeAt(0) + req.term.charCodeAt(1)) % 40;
        $.get('php/ajax/tag_complete.php?limit=300&list_id=' + listId, function (data) {
          res($.grep(data, function (e, i) {
            return e.indexOf(req.term) != -1;
          }).slice(0, 10));
        });
      },
      autoFocus: true,
      delay: 10,
      minLength: 2
    });

    // サイドメニューの表示
    var burger = $('#menu-display'),
      burgerBtn = $('#head-left #menu'),
      body = $(document.body),
      menuWidth = burger.outerWidth();

    burgerBtn.on('click', function () {
      body.toggleClass('open');

      if (body.hasClass('open')) {
        body.animate({ 'left': menuWidth }, 300);
        burger.animate({ 'left': 0 }, 300);
      } else {
        burger.animate({ 'left': -menuWidth }, 300);
        body.animate({ 'left': 0 }, 300);
      }
    });

    // 画像エラーの場合はノーイメージ表示
    $("img").error(function () {
      $(this).attr('src', '//nijie.info/members_picture/nijie_noimage.jpg');
      return true;
    });
  });
});
