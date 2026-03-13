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

            button.classList.toggle('bg-indigo-500', isActive);
            button.classList.toggle('border-indigo-500', isActive);
            button.classList.toggle('text-white', isActive);
            button.classList.toggle('bg-gray-800', !isActive);
            button.classList.toggle('border-gray-700', !isActive);
            button.classList.toggle('text-gray-300', !isActive);
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

    var frames = [
        'Connect to customer services without a VPN.',
        'Expose local endpoints with full control.'
    ];

    var prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion) {
        var index = 0;
        window.setInterval(function() {
            index = (index + 1) % frames.length;
            headline.textContent = frames[index];
        }, 3500);
        return;
    }

    var frameIndex = 0;
    var charIndex = 0;
    var deleting = false;
    var pause = false;
    var currentText = frames[0];

    headline.textContent = currentText;

    function tick() {
        if (pause) {
            window.setTimeout(function() {
                pause = false;
                deleting = true;
                tick();
            }, 1800);
            return;
        }

        if (!deleting) {
            charIndex += 1;

            headline.textContent = currentText.slice(0, charIndex);

            if (charIndex >= currentText.length) {
                pause = true;
            }

            window.setTimeout(tick, 36);
            return;
        }

        charIndex -= 1;
        headline.textContent = currentText.slice(0, Math.max(charIndex, 0));

        if (charIndex <= 0) {
            deleting = false;
            frameIndex = (frameIndex + 1) % frames.length;
            currentText = frames[frameIndex];
        }

        window.setTimeout(tick, 18);
    }

    tick();
}


/*------------Init scripts on pageload--------------*/
/*--------------------------------------------------*/
document.addEventListener('DOMContentLoaded', function() {
    initNavToggler();
    initCliTabs();
    initHeroHeadline();
})
