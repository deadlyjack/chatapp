import tag from 'html-tag-js';
import ajax from './utils/ajax';
import dialogs from './utils/dialogs';

window.addEventListener('load', login);

function login() {
    const socket = io(`wss://` + location.host, {
        transports: ['websocket']
    });
    const $login = tag.get('#login');
    const $signup = tag.get('#signup');
    const $errorLog = tag.get('#error-log');
    const $successLog = tag.get('#success-log');
    const $phone = tag.get('#phone');
    const $password = tag.get('#password');
    const $name = tag('input', {
        name: 'name',
        id: 'name',
        placeholder: 'name'
    });
    const $inputContainer = $phone.parentElement;

    socket.on('connect', () => {
        $login.onclick = handleSubmit;
        $signup.onclick = activate;
    });

    $name.addEventListener('keydown', function () {
        if (this.value.length > 25) {
            $errorLog.textContent = 'Name can only contain 25 letters';
            return;
        }
    });

    $phone.oninput = $password.oninput = $name.oninput = function () {
        $errorLog.textContent = '';
    };

    /**
     * @this HTMLButtonElement
     * @param {Event} e 
     */
    function handleSubmit(e) {
        const phone = $phone.value;
        const password = $password.value;
        const action = this.textContent;
        if (!phone || !password) {
            $errorLog.textContent = 'Please fill all required fields';
            return;
        }

        if (!/^[6-9]\d{9}$/.test(phone)) {
            $errorLog.textContent = 'Invalid phone number';
            return;
        }

        let data = {
            phone,
            password
        };

        if (action === 'signup') {
            const name = $name.value;
            if (!name) {
                $errorLog.textContent = 'Please enter your name';
                return;
            }
            if (name.length > 25) {
                $errorLog.textContent = 'Name can only contain 25 letters';
                return;
            }
            data.name = name;
            register();

        } else {
            login();
        }

        function register() {
            $successLog.textContent = 'Waiting for OTP...';
            socket.emit('otp', {
                number: phone
            });

            socket.on('otp-sent', () => {
                $successLog.textContent = '';
                dialogs.prompt('Enter OTP sent to your number: ' + phone)
                    .then(res => {
                        socket.emit('register-newuser', {
                            otp: res,
                            ...data
                        });
                    });
            });

            socket.on('register-newuser', function (res) {
                if (res.status === 'ok') {
                    activate.bind($login)();
                    $errorLog.textContent = '';
                    $successLog.textContent = 'Your account is created, now login';
                } else {
                    $successLog.textContent = '';
                    $errorLog.textContent = res.error || 'Some thing not right, please try again later';
                }
            });

            socket.on('otp-error', (err) => {
                $successLog.textContent = '';
                $errorLog.textContent = (err.warnings[0] || err.errors[0]).message || 'unable to send OTP to your given number';
            });
        }

        function login() {
            ajax({
                    url: '/' + action,
                    method: 'post',
                    contentType: 'application/json',
                    data
                })
                .then(res => {
                    if (res.status === 'error') {
                        $errorLog.textContent = res.error;
                        return;
                    }

                    if (action === 'signup') {
                        activate.bind($login)();
                        $successLog.textContent = 'Your account is created, now login';
                    } else {
                        location.reload();
                    }
                })
                .catch(err => {
                    console.log(err);
                });
        }
    }

    /**
     * @this HTMLButtonElement
     * @param {Event} e 
     */
    function activate(e) {
        $errorLog.textContent = '';
        this.textContent = this.textContent.slice(0, -1);

        if (this.textContent === 'signup') {
            $inputContainer.insertBefore($name, $inputContainer.firstChild);
            $name.focus();
            $login.textContent = $login.textContent + '?';
            $login.onclick = activate;
        } else if ($name.parentElement) {
            $name.remove();
            $phone.focus();
            $signup.textContent = $signup.textContent + '?';
            $signup.onclick = activate;
        }

        this.onclick = handleSubmit;
    }
}