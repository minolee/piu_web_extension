
function generate_mod_rating(user_data) {
    // TODO
}

async function get_checklist_img(sd, lv) {
    const user_data = await getObjectFromLocalStorage(lazy_values["user"])
    console.log(user_data)
    console.log(sd, lv)
    console.log(lazy_values)
    if (lv == -1) {
        alert("레벨을 선택해주세요!")
        return
    }
    if (lv < 19 || lv > 24) {
        alert("준비중입니다.")
        return
    }
    let x = lazy_values["user"].split(" ")
    const user_name = x[0]
    const user_tag = x[1]
    const request_form = {
        "user_name": user_name + user_tag,
        "type": sd,
        "level": lv,
        "best_scores": user_data.best_scores
    }
    // console.log(request_form)
    // console.log(request_form)
    const response = await fetch(IMG_API_URL, {
        method: "POST",
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(request_form)
    }).then(response => response.blob())
    // console.log(response)
    const handle = await showSaveFilePicker({
        suggestedName: `${user_name}${user_tag}_${sd}_${lv}.png`,
        types: [{
            description: 'PNG Image',
            accept: {
                'image/png': ['.png'],
            },
        }]
    })
    const writable = await handle.createWritable();
    await writable.write(response);
    await writable.close();
}


async function modify_playdata_dom() {
    let all = document.URL.split("?").length == 1

    const lv = all ? -1 : Number(document.URL.split("=").slice(-1)[0])
    all = all || lv == 0
    const target = document.getElementsByClassName("plate_w")[0].getElementsByClassName("list flex vc wrap")[0]
    // console.log(target)
    const user_data = await getObjectFromLocalStorage(lazy_values["user"])
    // console.log(user_data)
    const rank_counts = {}


    const gen_menu_container = createElement("ul", "dp2 flex")
    const checklist_gen_menu = [
        [createElement("li", "single_checklist_gen"), createElement("span", "tt", "싱글 체크리스트 작성")],
        [createElement("li", "double_checklist_gen"), createElement("span", "tt", "더블 체크리스트 작성")]
    ]
    checklist_gen_menu[0][0].addEventListener("click", async () => {
        await get_checklist_img("single", lv)
    })
    checklist_gen_menu[1][0].addEventListener("click", async () => {
        await get_checklist_img("double", lv)
    })
    gen_menu_container.appendChild(createHierarchy(...checklist_gen_menu[0]))
    gen_menu_container.appendChild(createHierarchy(...checklist_gen_menu[1]))

    const checklist_gen_container = createHierarchy(
        createElement("div", "subMenu_wrap"),
        createElement("div", "box1"),
        createElement("ul", "gnb flex"),
        createElement("li", "m_my_page on"),
        gen_menu_container
    )

    const parent = document.getElementsByClassName("pageWrap box1")[0]
    parent.insertBefore(checklist_gen_container, parent.childNodes[2])



    RANK_LIST.forEach(rank => {
        rank_counts[rank] = 0
    })
    user_data.best_scores.forEach(score => {
        if (all || score.level == lv) {
            // console.log(score)
            // console.log(get_rank(score.score))
            // console.log(Object.keys(rank_counts).length - get_rank(score.score))
            // console.log(RANK_LIST[Object.keys(rank_counts).length - get_rank(score.score) - 1])
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