import template from '../templates/chat.hbs';
import bubble from '../templates/bubble.hbs';

import mustache from 'mustache';
import tag from 'html-tag-js';
import dialogs from './utils/dialogs';
import Toast from './utils/toast';

export default Chat;
/**
 * @typedef {object} User
 * @property {string} name
 * @property {string} avatar
 * @property {string} phone
 */


/**
 * 
 * @param {User} user 
 * @param {User} contact 
 * @param {SocketIOClient.Socket} socket 
 */
function Chat(user, contact, socket) {
    const $main = tag.parse(template);
    const $content = $main.get('#chats');
    const $sendBtn = $main.get('#send-msg');
    const $input = $main.get('#msg-input');
    const $navToggler = tag.get('#nav-toggler');
    const $notification = tag.get('#notification-new_message');
    const $pop = tag.get('#sound-pop');
    const $pop2 = tag.get('#sound-pop2');
    const $unread = tag.get('#c' + contact.phone + ' .unread');
    const session = {
        expire: new Date().getTime() + 3600000 * 24 * 7,
        data: []
    };
    let scroll;
    let unreadMsg = 0;
    let init = false;

    $sendBtn.onclick = sendMessage;
    session.data = getData();

    const restorePoint = JSON.parse(JSON.stringify(session.data)).reverse();

    function show() {
        tag.get('main').remove();

        const $avatar = tag('span', {
            className: 'avatar',
            style: {
                backgroundImage: `url(${contact.avatar})`
            }
        });
        const $h2 = tag('h2', {
            textContent: contact.name
        });
        const $title = tag.get('#app-title');

        $unread.textContent = '';
        $title.textContent = '';
        $title.append($avatar, $h2);

        const $allUnread = tag.getAll('.unread');
        let sum = 0;
        $allUnread.map($unread => {
            const unread = $unread.textContent;
            if (unread) {
                sum += parseInt(unread);
            }

            if (!sum) {
                $navToggler.classList.remove('notice');
            }
        });

        tag.get('#app').appendChild($main);

        if (!init) {
            restoreChat();
            init = true;
        }
    }

    function sendMessage() {
        $input.focus();
        const msg = $input.innerText || $input.textContent;
        if (!msg) return;
        $input.textContent = '';
        const time = new Date().getTime();
        socket.emit('send-msg', {
            from: user.phone,
            to: contact.phone,
            msg: msg,
            time,
            type: 'text'
        });
        const $bubble = render('U', msg, time);
        $bubble.classList.add('pop');
        setTimeout(() => {
            $bubble.classList.remove('pop');
        }, 100);
        session.data.push({
            type: 'U',
            msg,
            time
        });
        $pop.play();
        update();
    }

    function gotMessage(msg, time) {
        if (!$main.isConnected) {
            ++unreadMsg;
            $unread.textContent = unreadMsg > 9 ? '9+' : unreadMsg;
            $navToggler.classList.add('notice');
            const play = $notification.play();

            if (play) {
                play.catch(() => {
                    if (window.warned) return;
                    Toast('New message from ' + contact.name);
                    window.warned = true;
                });
            }
        } else {
            $pop2.play();
        }
        const $bubble = render('D', msg, time);
        $bubble.classList.add('pop');
        setTimeout(() => {
            $bubble.classList.remove('pop');
        }, 100);
        session.data.push({
            type: 'D',
            msg,
            time
        });
        update();
    }

    function render(type, msg, time, prepend) {
        const date = new Date(time);
        const $bubble = tag.parse(mustache.render(bubble, {
            text: msg,
            type: type === 'U' ? 'sent' : 'received',
            stamp: date.toDateString() + ' ' + formatAMPM(date)
        }));
        updateScroll($bubble);
        if (prepend)
            $content.insertBefore($bubble, $content.firstElementChild);
        else
            $content.append($bubble);
        if (scroll || scroll === undefined) {
            $content.scrollTop = $content.scrollHeight - $content.offsetHeight;
        }

        return $bubble;
    }

    function update() {
        store('chat' + contact.phone, session);
    }

    function updateScroll() {
        if (!$main.isConnected) return scroll;
        scroll = ($content.scrollTop === $content.scrollHeight - $content.offsetHeight);
    }

    function formatAMPM(date) {
        var hours = date.getHours();
        var minutes = date.getMinutes();
        var ampm = hours >= 12 ? 'pm' : 'am';
        hours = hours % 12;
        hours = hours ? hours : 12; // the hour '0' should be '12'
        minutes = minutes < 10 ? '0' + minutes : minutes;
        var strTime = hours + ':' + minutes + ' ' + ampm;
        return strTime;
    }

    function restoreChat() {
        if (restorePoint && Array.isArray(restorePoint)) {
            restorePoint.map(chat => {
                render(chat.type, chat.msg, chat.time, true);
            });

            $content.scrollTop = $content.scrollHeight - $content.offsetHeight;
        }
    }

    function getData() {
        const key = 'chat' + contact.phone;
        const data = store.get(key, true);
        if (data && data.expire > new Date().getTime())
            return data.data;
        return [];
    }

    return {
        show,
        gotMessage
    };
}