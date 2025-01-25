
window.dataLayer = window.dataLayer || [];
let tracker = {
  push: function (event) {
    console.log(event);
    dataLayer.push(event);
  }
}