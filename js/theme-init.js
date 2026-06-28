// Theme initialization - runs immediately to prevent flash of wrong theme
(function(){
  var t = localStorage.getItem('theme') || (matchMedia('(prefers-color-scheme:dark)').matches ? 'dark' : 'light');
  document.documentElement.setAttribute('data-theme', t);
})();
