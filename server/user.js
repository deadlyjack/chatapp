const fs = require('fs');
const path = require('path');
const account = require('./account');

module.exports = {
    update,
    addContact
};


function update(req, res) {
    account.validate(req, success, error);

    function success(user) {
        const {
            name,
            avatar
        } = req.body;

        if (avatar) {
            const data = avatar.split('base64,')[1];
            const url = path.join(__dirname, '..', 'user-files', user.phone);
            const img = '/img/' + user.phone + '?' + new Date().getTime();
            fs.writeFile(url, data, 'base64', (err) => {
                if (err) {
                    console.log(err);
                    return res.status(500).send('unable to save file');
                }
                if (name) {
                    queryDB('update users set name=?, avatar=? where phone=?', [name, img, user.phone]);
                } else {
                    queryDB('update users set avatar=? where phone=?', [img, user.phone]);
                }
            });
        } else if (name) {
            queryDB('update users set name=? where phone=?', [name, user.phone]);
        }

        function queryDB(q, values) {
            con.query(q, values, (err, result) => {
                if (err) {
                    console.log(err);
                    return res.status(500).send('unable to update user');
                }

                if (result.affectedRows === 0) return res.send({
                    status: 'error',
                    error: 'no rows updated'
                });
                res.send({
                    status: 'ok'
                });
            });
        }
    }

    function error(err) {
        res.send({
            status: 'error',
            error: err
        });
    }
}

function addContact(req, res) {
    account.validate(req, success, error);

    function success(user) {
        const {
            phone
        } = req.body;

        let query = 'select phone, name, avatar from users where phone=?';
        con.query(query, [phone], (err, result) => {
            if (err) {
                console.log(err);
                return res.status(500).send('unable to process request, please try again later');
            }
            if (result.length === 0) return res.send({
                status: 'error',
                error: 'contact is not registered',
                errorCode: 'CONTACT_NOT_REGISTERED'
            });

            res.send(result[0]);
        });
    }

    function error(err) {

    }
}