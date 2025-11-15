(function () {
  window.dataLayer = window.dataLayer || [];
  window.tracker = window.tracker || {
    push: function (obj) {
      console.log('tracker.push', obj)
      var lsConsent = localStorage.getItem('CONSENT') || null;
      var allow = false;

      if (lsConsent) {
        var consent = JSON.parse(lsConsent);
        allow = (Number(consent.analytics) === 1);
      }
      if (allow) {
        window.dataLayer.push(obj);
      }
    }
  }
})();