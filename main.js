const path = require('path');
const express = require('express');
const cookieParser = require('cookie-parser');
const http = require('http');
const socket = require('socket.io');
const mysql = require('mysql');

const account = require('./server/account');
const user = require('./server/user');
const scss = require('./server/utils/scss');

// require('./constants');

global.PORT = process.env.PORT || 8005;
global.con = mysql.createConnection({
    user: 'root',
    host: 'localhost',
    database: 'chatapp',
    charset: 'utf8mb4',
    password: password,
});

const dir = {
    styles: path.join(__dirname, 'app', 'styles')
};
const app = express();
const server = http.createServer(app);
const io = socket.listen(server);

con.connect((err) => {
    if (err) return console.error(err);

    console.log('DataBase connected');
});

//#region registring dependencies to app
app.set('view engine', 'hbs');

app.use(express.json({
    limit: '8mb'
}));
app.use(cookieParser());
app.use(express.static('public', {
    redirect: false
}));
//#endregion


//#region Routing

app.get('/styles/:filename', (req, res) => {
    scss(path.join(dir.styles, req.params.filename.replace('css', 'scss')), res);
});
app.get('/img/:filename', (req, res) => {
    res.sendFile(path.join(__dirname, 'user-files', req.params.filename));
});
app.get('/logout', account.logout);
app.post('/login', account.login);
app.post('/signup', account.signup);
app.post('/add-contact', user.addContact);
app.put('/user', user.update);
app.all('/*', (req, res) => {
    if (!req.params[0]) {
        return account.validate(req, success, error);
    }

    res.status(404);

    if (req.accepts('html')) {
        res.render('404', {
            url: req.url
        });
        return;
    }

    if (req.accepts('json')) {
        res.send({
            error: 'Not found'
        });
    }

    res.type('txt').send('Not found');

    function success(user) {
        const {
            name,
            phone,
            avatar
        } = user;

        res.render('index', {
            name,
            phone,
            avatar
        });
    }

    function error() {
        res.render('account');
    }
});

//#endregion

require('./server/sockets')(io);

// const sms = `%%OTP%% is the OTP for your foxdebug account.`;

//Start server

server.listen(PORT, (err) => {
    if (err) return console.log(err);
    else console.log('Server started at port: ', PORT);
});