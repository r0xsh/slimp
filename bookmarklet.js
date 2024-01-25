(function() {
    var script = document.createElement('script');
    script.async = 1;
    script.src = 'https://cdn.jsdelivr.net/gh/r0xsh/slimp/loader.js';
    script.onload = () => window.slimpDo();
    document.getElementsByTagName('body')[0].appendChild(script);
})();
