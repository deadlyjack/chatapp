import profileDialog from '../templates/profile.hbs';
import mustache from 'mustache';
import tag from 'html-tag-js';
import lz from 'lz-string';
import ajax from './utils/ajax';
import dialogs from './utils/dialogs';
import Toast from './utils/toast';
import contact from '../templates/contact.hbs';
import Chat from './chat';

main();

let user = {
    name: '',
    phone: '',
    avatar: '',
    contacts: [],
    mappedContacts: {},
    update: () => {}
};
/**
 * @type {HTMLUListElement}
 */
let $contacts;
/**
 * @type {object<string,Chat>}
 */
let chats = {};
/**
 * @type {SocketIOClient.Socket}
 */
let socket;
let lastActiveChat;
let hideSideNav;

function main() {
    window.store = store;
    window.addEventListener('load', run);
}


function run() {
    const $navToggler = tag.get('#nav-toggler');
    const $profile = tag.get('#profile');
    const $profileToggler = $profile.get('.avatar');
    const $nav = tag.get('#app>nav');
    const $addContact = $nav.get('#add-contact');
    const $logout = tag.get('#logout');

    socket = io(`wss://` + location.host, {
        transports: ['websocket']
    });

    $contacts = tag.get('#contacts');

    user = {
        name: $profile.getAttribute('data-name'),
        phone: $profile.getAttribute('data-phone'),
        avatar: $profile.getAttribute('data-avatar'),
        contacts: [],
    };

    const owned = store.get('owned');
    if (owned != user.phone) {
        localStorage.clear();
        store('owned', user.phone);
    }

    user.contacts = store.get('contacts', true) || [];
    user.mappedContacts = mapContacts();
    user.update = function () {
        $profileToggler.style.backgroundImage = `url(${user.avatar})`;
    };

    $navToggler.onclick = toggleSidenav.bind(this, $nav);
    $profileToggler.onclick = toggleProfile;
    $contacts.onclick = handleChat;
    $addContact.onclick = function () {
        dialogs.prompt('Enter phone of your friend: ', null, 'tel', {
                match: /^[6-9]\d{9}$/,
                log: false
            })
            .then(res => {
                if (res) {
                    addNewContact(res, update);
                }

                function update() {
                    socket.emit('update-contact', {
                        contact: res
                    });
                }
            });
    };
    $logout.onclick = function () {
        document.cookie = '';
        location.href = '/logout';
    };

    if (user.contacts && Array.isArray(user.contacts)) {
        user.contacts.map(contact => {
            printContact(contact);
        });
    }

    socket.on('connect', () => {
        socket.emit('register', {
            user: user.phone,
            contacts: getContacts()
        });

        socket.on('online', data => {
            const contact = user.mappedContacts[data.user];
            if (contact) tag.get('#c' + contact.phone).classList.add('online');
        });
        socket.on('offline', data => {
            const contact = user.mappedContacts[data.user];
            if (contact) tag.get('#c' + contact.phone).classList.remove('online');
        });
        socket.on('msg-receive', receiveMsg);
    });

    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js', {
                scope: '/'
            })
            .then(function (res) {
                console.log('Registration successful, scope is:', res.scope);
            })
            .catch(function (err) {
                console.log('Service worker registration failed, error:', err);
            });
    }
}

function toggleSidenav($nav) {
    if (!$nav.classList.contains('show')) {
        const $mask = tag('span', {
            className: 'mask',
            style: {
                zIndex: 99
            },
            onclick: hide
        });

        hideSideNav = hide.bind($mask);
        $nav.parentElement.insertBefore($mask, $nav);
    } else {
        hideSideNav = null;
    }
    $nav.classList.toggle('show');

    function hide() {
        $nav.classList.toggle('show');
        this.remove();
    }
}

/**
 * @this HTMLSpanElement
 * @param {MouseEvent} e 
 */
function toggleProfile(e) {
    const x = e.clientX;
    const y = e.clientY;
    let name = user.name,
        img = null;

    const html = mustache.render(profileDialog, {
        coords: {
            x,
            y
        },
        phone: user.phone,
        name: user.name,
        avatar: user.avatar
    });

    const $mask = tag('span', {
        className: 'mask',
        onclick: hide,
        style: {
            opacity: 0,
            zIndex: 99
        }
    });
    const $html = tag.parse(html);
    const $buttonContainer = $html.get('.button-container');
    const $avatar = $html.get('#avatar-input');
    const $name = $html.get('#user-name');

    $avatar.onchange = handleAvatar;
    $buttonContainer.onclick = handleClick;
    $name.onkeyup = function () {
        name = this.value;
    };

    document.body.append($mask, $html);
    setTimeout(() => {
        const client = $html.getBoundingClientRect();
        const x = (innerWidth / 2) - (client.width);
        const y = (innerHeight / 2) - (client.height);
        $html.style.cssText = `opacity: 1; transform: scale(1) translate3d(${x}px, ${y}px, 0)`;
    }, 0);

    function hide() {
        $html.style.opacity = 0;
        setTimeout(() => {
            $mask.remove();
            $html.remove();
        }, 100);
    }

    /**
     * 
     * @param {Event} e 
     */
    function handleClick(e) {
        const action = e.target.getAttribute('action');

        if (action === 'save') {
            if (!name || (user.name === name) && !img) {
                return;
            }
            const data = {
                name,
                avatar: img
            };

            if (user.name === name) {
                delete data.name;
            }

            if (!img) {
                delete data.avatar;
            }

            e.target.classList.add('loading');
            ajax({
                    url: '/user',
                    method: 'put',
                    contentType: 'application/json',
                    data,
                    onloadend: function () {
                        e.target.classList.remove('loading');
                    }
                })
                .then(res => {
                    if (res.error) {
                        return;
                    }

                    user.name = name;
                    user.avatar = '/img/' + user.phone + '?' + new Date().getTime();
                    user.update();
                })
                .catch(err => {

                });
        } else if (action === 'cancel') {
            hide();
        }
    }

    /**
     * @this HTMLInputElement
     * @param {Event} e 
     */
    function handleAvatar(e) {
        const $avatar = this.parentElement;
        const file = this.files[0];
        const fileReader = new FileReader();

        fileReader.onloadend = function (e) {
            const result = e.target.result;
            if (result) {
                const type = result.split(';')[0].split(':')[1].split('/')[0];
                if (type === 'image') {
                    $avatar.style.backgroundImage = `url(${result})`;
                    img = result;
                } else {

                }
            } else {
                console.log('File read error');
            }
        };

        fileReader.readAsDataURL(file);
    }
}

function addNewContact(phoneNumber, callback) {

    if (phoneNumber === user.phone) {
        return Toast('You cannot add your own number', {
            type: 'error'
        });
    }

    ajax({
            url: '/add-contact',
            method: 'post',
            contentType: 'application/json',
            data: {
                phone: phoneNumber
            }
        })
        .then(res => {
            if (res.error) {
                return Toast(res.error, {
                    type: 'error'
                });
            }
            Toast('Contact added', {
                type: 'success'
            });
            printContact(res);
            user.contacts.push(res);
            user.mappedContacts = mapContacts();
            store('contacts', user.contacts);
            if (callback) setTimeout(() => {
                callback();
            }, 100);
        })
        .catch(err => {
            console.log(err);
            if (typeof err !== 'string') err = 'Something went wrong, please try again later';
            Toast(err, {
                type: 'error'
            });
        });
}

/**
 * @this HTMLLIElement
 * @param {Event} e 
 */
function handleChat(e) {
    const action = e.target.getAttribute('action');
    if (action !== 'chat') return;

    if (lastActiveChat === e.target.id) return;

    const oldChat = $contacts.get('li.active');
    if (oldChat) oldChat.classList.remove('active');
    e.target.classList.add('active');

    const chat = chats[e.target.id];
    lastActiveChat = e.target.id;
    chat.show();

    if (hideSideNav) hideSideNav();
}

function printContact(newcontact) {
    const html = mustache.render(contact, {
        name: newcontact.name,
        avatar: newcontact.avatar,
        phone: newcontact.phone
    });
    $contacts.innerHTML = html + $contacts.innerHTML;
    setTimeout(() => {
        chats['c' + newcontact.phone] = Chat(user, newcontact, socket);
    }, 0);
}

function getContacts() {
    const contacts = [];
    if (user.contacts) {
        user.contacts.map(contact => {
            contacts.push(contact.phone);
        });
    }

    return contacts;
}

function mapContacts() {
    const contacts = {};
    if (user.contacts) {
        user.contacts.map(contact => {
            contacts[contact.phone] = contact;
        });
    }

    return contacts;
}

function receiveMsg(data) {
    const {
        from,
        time,
        msg,
        type
    } = data;
    const chat = chats['c' + from];

    if (chat) {
        return chat.gotMessage(msg, time, type);
    }

    addNewContact(from, callback);

    function callback() {
        $contacts.get('#c' + from).classList.add('online');
        receiveMsg(data);
    }
}

function store(key, value) {
    if (typeof value !== 'string') value = JSON.stringify(value);
    value = lz.compressToUTF16(value);
    localStorage.setItem(key, value);
}

store.get = function (key, parse) {
    const value = localStorage.getItem(key);
    if (value) return JSON.parse(lz.decompressFromUTF16(value));
};