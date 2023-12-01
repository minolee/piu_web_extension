
function generate_mod_rating(user_data) {
    // TODO
}

async function modify_playdata_dom() {
    let all = document.URL.split("?").length == 1

    const lv = all ? -1 : Number(document.URL.split("=").slice(-1)[0])
    all = all || lv == 0
    const target = document.getElementsByClassName("plate_w")[0].getElementsByClassName("list flex vc wrap")[0]
    console.log(target)
    const user_data = await getObjectFromLocalStorage(lazy_values["user"])
    console.log(user_data)
    const rank_counts = {}
    RANK_LIST.forEach(rank => {
        rank_counts[rank] = 0
    })
    user_data.best_scores.forEach(score => {
        if (all || score.level == lv) {
            console.log(score)
            console.log(get_rank(score.score))
            console.log(Object.keys(rank_counts).length - get_rank(score.score))
            console.log(RANK_LIST[Object.keys(rank_counts).length - get_rank(score.score) - 1])
            rank_counts[RANK_LIST[Object.keys(rank_counts).length - get_rank(score.score) - 1]]++
        }
    })
    function div_factory(img, text) {
        const li = document.createElement("li")
        const outmost = document.createElement("div")
        outmost.classList.add("list_in")
        const inner = document.createElement("div")
        inner.classList.add("img")
        const _img = document.createElement("img")
        _img.setAttribute("src", img)
        const i = document.createElement("span")
        i.classList.add("txt")
        const i2 = document.createElement("i")
        i2.classList.add("t_num")
        i2.innerHTML = text
        i.appendChild(i2)
        inner.appendChild(_img)
        inner.appendChild(i)

        outmost.appendChild(inner)
        li.appendChild(outmost)
        return li
    }
    RANK_LIST.forEach(rank => {
        target.appendChild(div_factory(RANK_IMAGES(rank, true), rank_counts[rank]))
    })
}