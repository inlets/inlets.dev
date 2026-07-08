function initNavToggler() {
    var navbarOpen = document.querySelector('#open-button');
    var menu = document.querySelector('#mobile-menu');
    var navbarClose = document.querySelector('#close-button')
    // var linkClick = document.querySelector('.link-item')


    navbarOpen.addEventListener('click', function(evt) {
        if (menu.classList.contains("hidden")) {
            menu.classList.remove("hidden")
        } else {
            menu.classList.add("hidden")
        }
        evt.stopImmediatePropagation()
    });
    navbarClose.addEventListener('click', function(evt) {
        if (menu.classList.contains("hidden")) {
            menu.classList.remove("hidden")
        } else {
            menu.classList.add("hidden")
        }
        evt.stopImmediatePropagation()
    });

    // linkClick.addEventListener('click', function(evt) {
    //     if (menu.classList.contains("hidden")) {
    //         menu.classList.remove("hidden")
    //         console.log("show")
    //     } else {
    //         menu.classList.add("hidden")
    //         console.log("hide")
    //     }
    //     evt.stopImmediatePropagation()
    // });
}

function initCliTabs() {
    var buttons = document.querySelectorAll('[data-cli-tab]');
    var panels = document.querySelectorAll('[data-cli-panel]');

    if (!buttons.length || !panels.length) {
        return;
    }

    function setActive(name) {
        buttons.forEach(function(button) {
            var isActive = button.getAttribute('data-cli-tab') === name;

            button.classList.toggle('bg-gray-900', isActive);
            button.classList.toggle('border-gray-900', isActive);
            button.classList.toggle('text-white', isActive);
            button.classList.toggle('bg-white', !isActive);
            button.classList.toggle('border-gray-300', !isActive);
            button.classList.toggle('text-gray-700', !isActive);
        });

        panels.forEach(function(panel) {
            panel.classList.toggle('hidden', panel.getAttribute('data-cli-panel') !== name);
        });
    }

    buttons.forEach(function(button) {
        button.addEventListener('click', function() {
            setActive(button.getAttribute('data-cli-tab'));
        });
    });

    setActive(buttons[0].getAttribute('data-cli-tab'));
}

function initHeroHeadline() {
    var headline = document.querySelector('#hero-headline');

    if (!headline) {
        return;
    }

    var live = headline.closest('.hero-headline-live') || headline;

    var frames = [
        'Self-hosted tunnels with full control and privacy.',
        'Connect to customer services without a VPN.',
        'A public HTTPS endpoint in seconds, no rate limits.'
    ];

    var prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion) {
        return;
    }

    // Gentle crossfade between headlines so it does not compete with the
    // terminal animation next to it.
    var index = 0;
    window.setInterval(function() {
        live.style.opacity = '0';
        window.setTimeout(function() {
            index = (index + 1) % frames.length;
            headline.textContent = frames[index];
            live.style.opacity = '1';
        }, 500);
    }, 5500);
}


/*------------Init scripts on pageload--------------*/
/*--------------------------------------------------*/
document.addEventListener('DOMContentLoaded', function() {
    initNavToggler();
    initCliTabs();
    initHeroHeadline();
})
