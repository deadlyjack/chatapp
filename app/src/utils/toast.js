import tag from 'html-tag-js';

export default Toast;

/**
 * 
 * @param {string} text 
 * @param {object} options 
 * @param {number} [options.time] 
 * @param {'error'|'success'} [options.type] 
 * @param {boolean} [options.progressbar] 
 */
function Toast(text, options = {}) {
    const $closeBtn = tag('i', {
        className: 'icon clearclose',
        onclick: hide
    });
    const $text = tag('span', {
        className: 'text',
        textContent: text
    });
    const $toast = tag('div', {
        className: 'toast ' + (options.type || ''),
        children: [
            $text,
            $closeBtn
        ]
    });
    /**
     * @type {HTMLSpanElement}
     */
    let $progressbar;

    if (options.progressbar) {
        $toast.classList.add('progress');
        $progressbar = tag('span', {
            className: 'bar'
        });
        $toast.append($progressbar);
    }

    toastContainer.appendChild($toast);

    if (!options.progressbar) {
        const time = options.time || 3000;
        setTimeout(() => {
            hide();
        }, time);
    }

    function hide() {
        $toast.classList.add('hide');
        setTimeout(() => {
            $toast.remove();
        }, 300);
    }

    /**
     * 
     * @param {number} percentage 
     * @param {string} text 
     */
    function updateProgress(percentage, text) {
        $progressbar.style.width = Math.ceil(percentage) + '%';
        $text.textContent = text;
    }

    return {
        hide,
        updateProgress
    };
}