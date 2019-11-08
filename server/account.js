const bcrypt = require('bcrypt');

module.exports = {
    login,
    signup,
    validate,
    logout
};

/**
 * 
 * @param {Express.Request} req 
 * @param {Express.Response} res 
 */
function signup(req, res) {
    const {
        phone,
        name,
        password
    } = req.body;

    if (!phone || !name || !password) {
        return res.send({
            status: 'error',
            error: 'required data missing'
        });
    }

    bcrypt.hash(password, 10, (err, hash) => {
        if (err) {
            console.error(err);
            return res.status(500).send('unbale to process request');
        }

        let query = 'insert into users (phone, avatar, name, password) values (?, ?, ?, ?)';

        con.query(query, [phone, '/res/default-avatar.png', name.substr(0, 25), hash], (err, result) => {
            if (err) {
                if (err.errno === 1062) {
                    return res.send({
                        status: 'error',
                        error: 'phone number is already registered'
                    });
                }
                console.error(err);
                return res.status(500).send('unbale to process request');
            }

            if (result.affectedRows === 0) {
                console.error(err);
                return res.status(500).send('unbale to signup');
            }

            res.send({
                status: 'ok'
            });
        });
    });
}

/**
 * 
 * @param {Express.Request} req 
 * @param {Express.Response} res 
 */
function login(req, res) {
    const {
        phone,
        password
    } = req.body;

    if (!phone || !password) {
        return res.send({
            status: 'error',
            error: 'required data missing'
        });
    }

    let query = 'select * from users where phone=?';
    con.query(query, [phone], (err, result) => {
        if (err) {
            return error(err);
        }

        if (result.length === 0) {
            return res.send({
                status: 'error',
                error: 'user not found'
            });
        }

        const user = result[0];

        bcrypt.compare(password, user.password, (err, same) => {
            if (err) {
                return error(err);
            }

            if (!same) {
                return res.send({
                    status: 'error',
                    error: 'incorrect password'
                });
            }

            const crypto = require('crypto');

            crypto.randomBytes(50, (err, buffer) => {
                if (err) {
                    return error(err);
                }

                const token = buffer.toString('base64');
                const maxAge = 3600000 * 24 * 7;
                const expire = new Date().getTime() + maxAge;

                query = 'insert into logins (token, user, expire) values(?,?,?)';

                con.query(query, [token, user.phone, expire], (err, result) => {
                    if (err) {
                        return error(err);
                    }

                    if (result.affectedRows === 0) {
                        return res.status(500).send('unable to login');
                    }

                    res.cookie('token', token, {
                        maxAge
                    });
                    res.cookie('user', user.phone, {
                        maxAge
                    });

                    res.send({
                        status: 'ok'
                    });
                });
            });
        });
    });

    function error(err) {
        console.log(err);
        res.status(500).send('unbale to process request');
    }
}

/**
 * 
 * @param {Express.Request} req 
 */
function validate(req, success, error) {
    const {
        token,
        user
    } = req.cookies;

    if (!token || !user) return error('cookies not set');

    const time = new Date().getTime();

    const query = 'select u.phone, u.name, u.avatar from logins l, users u where l.token=? and l.user=? and l.expire > ? and l.user = u.phone';

    con.query(query, [token, user, time], (err, result) => {
        if (err) {
            console.log(err);
            return error(err);
        }

        if (result.length === 0) return error('not logged in');
        success(result[0]);
    });
}

/**
 * 
 * @param {Express.Request} req 
 * @param {Express.Response} res 
 */
function logout(req, res) {
    res.header('Cache-Control', 'private, no-cache, no-store, must-revalidate');
    res.header('Expires', '-1');
    res.header('Pragma', 'no-cache');

    validate(req, success, error);

    function success() {
        const {
            token,
            user
        } = req.cookies;

        const query = 'delete from logins where token=? and user=?';
        con.query(query, [token, user], (err, result) => {
            if (err) {
                console.log(err);
            }

            if (req.accepts('html')) {
                res.redirect(301, '/');
            } else {
                res.send({
                    status: 'ok'
                });
            }
        });
    }

    function error() {
        res.status(400).send('Invalid request');
    }
}