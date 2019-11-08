import tag from "html-tag-js";
import autosize from 'autosize';
import tile from "./tile";

/**
 * 
 * @param {string} message 
 * @param {string} defaultValue 
 * @param {"text"|"numberic"|"tel"|"search"|"email", "url"} type 
 * @param {object} options
 * @param {RegExp} options.match
 * @param {boolean} options.required
 * @param {boolean} options.log
 * @param {string} options.errorMessage
 * @param {boolean} options.reject
 */
function prompt(message, defaultValue = '', type = 'text', options = {}) {
    if (type === 'number') {
        type = 'numeric';
    }

    if (!!!defaultValue) {
        defaultValue = '';
    }

    return new Promise((resolve, reject) => {

        const inputType = type === 'text' ? 'textarea' : 'input';
        type = type === 'filename' ? 'text' : type;

        const messageSpan = tag('span', {
            textContent: message,
            className: 'message'
        });
        const input = tag(inputType, {
            value: defaultValue,
            className: 'input',
        });
        const okBtn = tag('button', {
            type: "submit",
            textContent: 'ok',
            disabled: !defaultValue,
            onclick: function () {
                if (options.required && !input.value) {
                    errorMessage.textContent = 'This field is required';
                    return;
                }
                hidePrompt();
                resolve(input.value);
            }
        });
        const cancelBtn = tag('button', {
            textContent: 'cancel',
            type: 'button',
            onclick: function () {
                hidePrompt();
                if (options.reject) {
                    reject();
                }
            }
        });
        const errorMessage = tag("span", {
            className: 'error-msg'
        });
        const promptDiv = tag('form', {
            action: "#",
            className: 'prompt',
            onsubmit: (e) => {
                e.preventDefault();
                if (!okBtn.disabled)
                    resolve(input.value);
            },
            children: [
                messageSpan,
                input,
                errorMessage,
                tag('div', {
                    className: 'button-container',
                    children: [
                        cancelBtn,
                        okBtn
                    ]
                })
            ]
        });
        const mask = tag('span', {
            className: 'mask'
        });

        if (inputType === 'textarea') {
            input.rows = 1;
            input.inputMode = type;
        } else {
            input.type = type;
        }

        input.oninput = function () {
            if (options.match && !options.match.test(this.value)) {
                okBtn.disabled = true;
                if (options.log !== false) errorMessage.textContent = options.errorMessage || 'Not a valid input';
            } else {
                okBtn.disabled = false;
                errorMessage.textContent = '';
            }
        };

        input.onfocus = function () {
            this.select();
        };

        document.body.append(promptDiv, mask);
        input.focus();
        autosize(input);

        function hidePrompt() {
            promptDiv.classList.add('hide');
            setTimeout(() => {
                document.body.removeChild(promptDiv);
                document.body.removeChild(mask);
            }, 300);
        }
    });
}

/**
 * 
 * @param {string} titleText 
 * @param {string} message 
 */
function alert(titleText, message) {

    if (!message && titleText) {
        message = titleText;
        titleText = '';
    }

    const regex = /(https?:\/\/)?((www[^\.]?)\.)?([\w\d]+)\.([a-zA-Z]{2,8})(\/[^ ]*)?/;
    if (regex.test(message)) {
        const exec = regex.exec(message);
        message = message.replace(exec[0], `<a href='${exec[0]}'>${exec[0]}</a>`);
    }

    const titleSpan = tag('strong', {
        className: 'title',
        textContent: titleText
    });
    const messageSpan = tag('span', {
        className: 'message',
        innerHTML: message
    });
    const okBtn = tag('button', {
        textContent: 'ok',
        onclick: hideAlert
    });
    const alertDiv = tag('div', {
        className: 'prompt',
        children: [
            titleSpan,
            messageSpan,
            tag('div', {
                className: 'button-container',
                child: okBtn
            })
        ]
    });
    const mask = tag('span', {
        className: 'mask'
    });

    document.body.append(alertDiv, mask);

    function hideAlert() {
        alertDiv.classList.add('hide');
        setTimeout(() => {
            document.body.removeChild(alertDiv);
            document.body.removeChild(mask);
        }, 300);
    }
}

function confirm(titleText, message) {
    return new Promise((resolve) => {
        if (!message && titleText) {
            message = titleText;
            titleText = '';
        }

        const titleSpan = tag('strong', {
            className: 'title',
            textContent: titleText
        });
        const messageSpan = tag('span', {
            className: 'message',
            textContent: message
        });
        const okBtn = tag('button', {
            textContent: 'ok',
            onclick: function () {
                hideAlert();
                resolve();
            }
        });
        const cancelBtn = tag('button', {
            textContent: 'cancel',
            onclick: hideAlert
        });
        const confirmDiv = tag('div', {
            className: 'prompt',
            children: [
                titleSpan,
                messageSpan,
                tag('div', {
                    className: 'button-container',
                    children: [
                        cancelBtn,
                        okBtn
                    ]
                })
            ]
        });
        const mask = tag('span', {
            className: 'mask'
        });

        document.body.append(confirmDiv, mask);

        function hideAlert() {
            confirmDiv.classList.add('hide');
            setTimeout(() => {
                document.body.removeChild(confirmDiv);
                document.body.removeChild(mask);
            }, 300);
        }
    });
}

/**
 * 
 * @param {string} title 
 * @param {string[]} options 
 * @param {object} opts 
 * @param {string} opts.default 
 */
function select(title, options, opts = {}) {
    return new Promise(resolve => {
        const titleSpan = tag('strong', {
            className: 'title',
            textContent: title
        });
        const list = tag('ul');
        const selectDiv = tag('div', {
            className: 'prompt select',
            children: [
                titleSpan,
                list
            ]
        });
        const mask = tag('span', {
            className: 'mask',
            onclick: hideSelect
        });

        options.map(option => {

            let value = option;
            let text = option;
            let lead = null;
            if (Array.isArray(option)) {
                value = option[0];
                text = option[1];

                if (option.length > 2) {
                    lead = tag('i', {
                        className: `icon ${option[2]}`
                    });
                }
            }

            text = text.toString();

            const item = tile({
                lead,
                text
            });

            if (opts.default === value) {
                item.classList.add('selected');
                setTimeout(function () {
                    item.scrollIntoView();
                }, 10);
            }

            item.onclick = function () {
                hideSelect();
                resolve(value);
            };

            list.append(item);
        });

        document.body.append(selectDiv, mask);

        function hideSelect() {
            selectDiv.classList.add('hide');
            setTimeout(() => {
                document.body.removeChild(selectDiv);
                document.body.removeChild(mask);
            }, 300);
        }
    });
}

export default {
    prompt,
    alert,
    confirm,
    select
};