(function () {
  var key = "referly_ref";
  var pattern = /^[A-HJ-NP-Z2-9]{6,12}$/;
  var params = new URLSearchParams(window.location.search);
  var fromUrl = (params.get("ref") || "").trim().toUpperCase();
  var cookie = document.cookie.match(new RegExp("(?:^|; )" + key + "=([^;]*)"));
  var code = pattern.test(fromUrl) ? fromUrl : cookie ? decodeURIComponent(cookie[1]) : "";
  if (!code) return;
  var days = 30;
  document.cookie = key + "=" + encodeURIComponent(code) + "; Path=/; SameSite=Lax; Max-Age=" + (days * 86400);
  if (fromUrl) {
    params.delete("ref");
    var next = window.location.pathname + (params.toString() ? "?" + params : "") + window.location.hash;
    try { history.replaceState({}, "", next); } catch (e) {}
  }
  function persist() {
    fetch("/cart/update.js", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ attributes: { referly_ref: code } })
    }).catch(function () {});
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", persist);
  } else {
    persist();
  }
  ["cart:refresh", "cart:updated", "product:added"].forEach(function (event) {
    document.addEventListener(event, persist);
  });
}());
