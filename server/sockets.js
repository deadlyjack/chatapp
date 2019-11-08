const fs = require('fs');
const path = require('path');
const sms = require('./utils/sms');
const account = require('./account');

module.exports = function (io) {
    const sockets = {};
    const map = {};
    const otp = {};

    io.on('connection', connect);

    /**
     * 
     * @param {SocketIO.Socket} socket 
     */
    function connect(socket) {
        socket.on('register', registerSocket);
        socket.on('update-contact', updateContact);
        socket.on('send-msg', sendMessage);
        socket.on('disconnect', ondisconnect);
        socket.on('otp', generateOtp);
        socket.on('register-newuser', registerNewUser);

        function updateContact(data) {
            sockets[socket.id].contacts.push(data.contact);
            if (map[data.contact]) {
                sockets[socket.id].socket.emit('online', {
                    user: data.contact
                });
            }
        }

        function registerSocket(data) {
            const id = socket.id;
            sockets[id] = data;
            sockets[id].socket = socket;
            map[data.user] = id;

            //informing all online users who has current user in contact
            for (let key in sockets) {
                if (Array.isArray(sockets[key].contacts) && sockets[key].contacts.indexOf(data.user) > -1) {
                    sockets[key].socket.emit('online', {
                        user: data.user
                    });
                }
            }
            //chekin all users are online in the conact list of current user
            if (data.contacts && Array.isArray(data.contacts)) {
                data.contacts.map(contact => {
                    for (let key in sockets) {
                        if (sockets[key].user === contact) {
                            sockets[id].socket.emit('online', {
                                user: contact
                            });
                        }
                    }
                });
            }

            const queueFile = path.join(__dirname, '..', 'queue', data.user);
            fs.readFile(queueFile, 'utf-8', (err, data) => {
                if (err) return;

                /**
                 * @type {Array<object>}
                 */
                const queuedMessages = JSON.parse(data);

                if (Array.isArray(queuedMessages)) {
                    queuedMessages.map(sendMessage);
                }

                fs.unlink(queueFile, err => {
                    if (err) console.log(err);
                });
            });
        }

        function ondisconnect() {
            if (Object.keys(sockets).length > 0) {
                const id = socket.id;
                const onlineUser = sockets[id];

                if (!onlineUser) return;

                for (let key in sockets) {
                    if (Array.isArray(sockets[key].contacts) && sockets[key].contacts.indexOf(onlineUser.user) > -1) {
                        sockets[key].socket.emit('offline', {
                            user: onlineUser.user
                        });
                    }
                }
                delete map[onlineUser.user];
                delete sockets[id];
            }
        }

        function sendMessage(data) {
            const id = map[data.to];

            if (id) {
                sockets[id].socket.emit('msg-receive', data);
            } else {
                const queueFile = path.join(__dirname, '..', 'queue', data.to);
                fs.readFile(queueFile, 'utf-8', (err, queuedMessages) => {
                    let queuedMsg = [];
                    if (!err) {
                        queuedMsg = JSON.parse(queuedMessages);
                    }

                    queuedMsg.push(data);

                    fs.writeFile(queueFile, JSON.stringify(queuedMsg), err => {
                        if (err) console.log(err);
                    });
                });
            }
        }

        function generateOtp(data) {
            if (!data.number) return;
            const value = Math.floor(1000 + Math.random() * 9000);
            otp[socket.id] = value;

            sms.send(`${value} is the OTP for your foxdebug account.`, data.number)
                .then(() => {
                    socket.emit('otp-sent');
                })
                .catch((err) => {
                    socket.emit('otp-error', err);
                    delete otp[socket.id];
                });
        }

        function registerNewUser(data) {
            if (parseInt(data.otp) !== otp[socket.id]) {
                return socket.emit('register-newuser', {
                    error: 'OTP not matched'
                });
            }

            const req = {
                body: data
            };

            const res = {
                send: function (data) {
                    socket.emit('register-newuser', data);
                },
                status: function () {
                    return res;
                }
            };

            account.signup(req, res);
        }
    }
};