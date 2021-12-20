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


/*------------Init scripts on pageload--------------*/
/*--------------------------------------------------*/
document.addEventListener('DOMContentLoaded', function() {
    initNavToggler();
})
