const urlencode = require('urlencode');
const request = require('request');

module.exports = {
    send
};

function send(msg, to, sender) {
    msg = urlencode(msg);
    sender = sender || 'FOXDBG';

    const url = `http://api.textlocal.in/send?username=${username}&hash=${hash}&sender=${sender}&numbers=${to}&message=${msg}`;

    return new Promise((resolve, reject) => {
        request.get({
            url,
            json: true,
            headers: {
                'User-Agent': 'request'
            }
        }, (err, res, body) => {
            if (err) {
                console.log(err);
                reject();
            }
            if (body.status === 'success') {
                resolve();
            } else {
                reject(body);
            }
        });
    });
}