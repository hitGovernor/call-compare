/* Lightweight tracker shim */
window.dataLayer = window.dataLayer || [];
window.tracker = window.tracker || {
  push: function(obj) {
    try { window.dataLayer.push(obj); } catch (e) { /* ignore */ }
    try { console.log('tracker.push', obj); } catch (e) { /* ignore */ }
  }
};
