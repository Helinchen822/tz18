/* 天竺按摩打卡 · 离线缓存 Service Worker (v4)
   策略: 页面文档网络优先(更新即时生效, 断网回退缓存); 其余资源缓存优先 */
"use strict";
var CACHE = "tz18-v5";
var ASSETS = ["./", "./index.html", "./manifest.webmanifest", "./icon-192.png", "./icon-512.png"];

self.addEventListener("install", function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (c) { return c.addAll(ASSETS); })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k !== CACHE; })
        .map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener("fetch", function (e) {
  if (e.request.method !== "GET") return;
  var url = new URL(e.request.url);
  if (url.origin !== location.origin) return;

  var isDoc = e.request.mode === "navigate" || url.pathname.endsWith("/") || url.pathname.indexOf("index.html") > -1;
  if (isDoc) {
    /* 文档: 网络优先, 保证更新尽快生效; 断网时用缓存 */
    e.respondWith(
      fetch(e.request).then(function (resp) {
        if (resp && resp.ok) {
          var cp = resp.clone();
          caches.open(CACHE).then(function (c) { c.put("./index.html", cp); });
        }
        return resp;
      }).catch(function () {
        return caches.match("./index.html").then(function (hit) {
          return hit || caches.match("./");
        });
      })
    );
  } else {
    /* 资源: 缓存优先, 未命中则取网络并回填 */
    e.respondWith(
      caches.match(e.request, { ignoreSearch: true }).then(function (hit) {
        if (hit) return hit;
        return fetch(e.request).then(function (resp) {
          if (resp && resp.ok) {
            var cp2 = resp.clone();
            caches.open(CACHE).then(function (c) { c.put(e.request, cp2); });
          }
          return resp;
        });
      })
    );
  }
});
