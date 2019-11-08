self.addEventListener('install', function (e) {
    console.log(e);
});

self.addEventListener('activate', function (e) {
    console.log(e);
});

this.addEventListener('fetch', function (event) {
    // it can be empty if you just want to get rid of that error
});