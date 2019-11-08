const sass = require('node-sass');
const postcss = require('postcss');
const autoprefixer = require('autoprefixer');

module.exports = function (url, res) {

    sass.render({
        file: url
    }, (err, result) => {

        if (err) {
            console.log(err);
            return reject(500);
        }

        const css = result.css.toString('utf-8');

        postcss([autoprefixer])
            .process(css, {
                from: undefined
            })
            .then(result => {
                result.warnings().map(waring => {
                    console.log(waring.toString());
                });
                resolve(result.css);
            })
            .catch(err => {
                console.log(err);
                reject(500);
            });
    });

    function reject(code) {
        res.status(code).send("could not get template");
    }

    function resolve(data) {
        res.type('text/css').send(data);
    }
};