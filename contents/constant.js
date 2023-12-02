const base_url = document.URL.split("/")[2]
const recent_play_classname = "recently_playeList flex wrap"
const my_best_score_classname = "my_best_scoreList flex wrap"
const is_title_page = document.URL.split("/").slice(-1)[0] == "title.php"
const is_best_score_page = document.URL.split("/").slice(-1)[0].split("?")[0] == "my_best_score.php"
const is_playdata_page = document.URL.split("/").slice(-1)[0].split("?")[0] == "play_data.php"
const lazy_values = {}

const IMG_API_URL = "https://piu.minolee.xyz/image/chart"

const PLATE_LIST = ["pg", "ug", "eg", "sg", "mg", "tg", "fg", "rg"]
const RANK_LIST = ["sss_p", "sss", "ss_p", "ss", "s_p", "s", "aaa_p", "aaa", "aa_p", "aa", "a_p", "a", "b"]
const G_IMAGES = (game) => {
    return `/l_img/plate/s_${game}.png`
}

const RANK_IMAGES = (rank, clear) => {
    if (clear) {
        return `/l_img/grade/${rank}.png`
    }
    else {
        return `/l_img/grade/x_${rank}.png`
    }
}

const img_wrapper = (img) => {
    return `<div class="img"><img src="${img}" alt></div>`
}

const createElement = (tag, className, innerHTML = "") => {
    const element = document.createElement(tag)
    for (const _className of className.split(" ")) {
        element.classList.add(_className)
    }
    element.innerHTML = innerHTML
    return element
}
const createHierarchy = (...elements) => {
    for (let i = 0; i < elements.length - 1; i++) {
        elements[i].appendChild(elements[i + 1])
    }
    return elements[0]
}