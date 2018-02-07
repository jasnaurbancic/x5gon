var x5gonActivityTracker = function() {

  function x5gonGetDomain() {
    domain = document.domain;
    domain_part = domain.split(".");
    domain_parts = domain_part.length;
    if (domain_parts > 2) { domain = domain_part[domain_parts - 2] + "." + domain_part[domain_parts - 1]; }
    return domain;
  }

  function x5gonGetCookie(a) {
    if(document.cookie.length > 0) {
      var CStart = document.cookie.indexOf(a + "=");
      if (CStart != -1) {
        CStart = CStart + a.toString().length + 1;
        var CEnd = document.cookie.indexOf("; ", CStart);
        if (CEnd == -1) { CEnd = document.cookie.length; }
        var StrLen = CEnd - CStart;
        if (StrLen > 20) { CEnd = CStart + 20; }
        if(CEnd <= document.cookie.length){
          return decodeURIComponent(document.cookie.substring(CStart, CEnd));
        }
      }
    }
    return"";
  }

  function x5gonSetCookie(b, a) {
    var c = new Date();
    c.setDate(c.getDate() + 256);
    document.cookie = b + "=" + encodeURIComponent(a) + "; expires=" + c.toGMTString() + "; path=/" + "; domain=" + x5gonGetDomain();
  }

  function x5gonCheckCookie() {
    var uuid = x5gonGetCookie("x5gonTrack");
    if (uuid !== null && uuid !== ""){
      return uuid;
    } else {
      uuid = Math.random().toString().substr(2);
      x5gonSetCookie("x5gonTrack", uuid);
      return uuid;
    }
  }

  function x5gonCheckTime(a) {
    if(a < 10) { a = "0" + a; }
    return a;
  }

  function x5gonGetReturnString(a, cid) {
    var Dat = new Date();
    var Dt = Dat.getFullYear() + "-" + x5gonCheckTime(Dat.getMonth() + 1) + "-" +
      x5gonCheckTime(Dat.getDate()) + " " + x5gonCheckTime(Dat.getHours()) + ":" +
      x5gonCheckTime(Dat.getMinutes()) + ":" + x5gonCheckTime(Dat.getSeconds()) +
      "." + Dat.getMilliseconds();
    var CURL = document.URL;
    var PURL = document.referrer;

    var b = 'http://log4.quintelligence.com/api/v1/log?uid=';
    b += encodeURIComponent(a);
    b += "&dt=" + encodeURIComponent(Dt);
    b += "&rq=" + encodeURIComponent(CURL);
    b += "&rf=" + encodeURIComponent(PURL);
    b += "&cid=" + encodeURIComponent(cid);
    return b;
  }

  return function(cid) {
    try {
      var img = document.createElement('img');
      img.setAttribute('src', x5gonGetReturnString(x5gonCheckCookie(), cid));
      document.body.appendChild(img);
    } catch(err) { }
  };

}();