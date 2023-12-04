(async () => {
    const mode = "normal"
    lazy_values["coop_rating"] = await fetch(`https://${base_url}/my_page/play_data.php?lv=coop`).then
        (resp => resp.text()).then
        (html => (new DOMParser()).parseFromString(html, "text/html")).then
        (doc => parseInt(doc.getElementsByClassName("num fontSt")[0].innerHTML.replaceAll(",", "")))
    // https://stackoverflow.com/questions/494143/creating-a-new-dom-element-from-an-html-string-using-built-in-dom-methods-or-pro/35385518#35385518
    function htmlToElement(html) {
        var template = document.createElement('template');
        html = html.trim(); // Never return a text node of whitespace as the result
        template.innerHTML = html;
        return template.content.firstChild;
    }
    console.log(base_url)
    // await removeObjectFromLocalStorage("BALL #4818")

    async function init() {
        const my_data_doc = await fetch(`https://${base_url}/my_page/play_data.php`).then
            (resp => resp.text()).then
            (html => (new DOMParser()).parseFromString(html, "text/html"))
        // console.log(my_data_doc.getElementsByClassName("total flex col"))
        const play_count = parseInt(my_data_doc.getElementsByClassName("total flex col")[0].children[0].children[1].innerHTML)
        const user = my_data_doc.getElementsByClassName("t2 en")[0].innerHTML
        lazy_values["user"] = user
        if (mode == "reset") {
            // console.log("RESET DB")
            await chrome.storage.local.clear()
        }

        // if (mode == "gain") {
        //     console.log("GAIN MODE")
        //     // await saveObjectInLocalStorage({ [user]: sample_obj })
        //     await saveObjectInLocalStorage({ [user]: { ...user_info, play_count: play_count } })
        //     await read_playdata(user)
        // }


        await saveObjectInLocalStorage({ current_user: user, score_dom: [] })
        await init_user(user)
        const user_info = await getObjectFromLocalStorage(user)
        // console.log(user_info)
        // console.log(user_info["play_count"])
        // console.log(play_count)
        if (user_info["play_count"] != play_count || mode == "gain") {
            await read_playdata(user)
        }
        // console.log(await getObjectFromLocalStorage(user))

        // console.log("Finished initialization")

    }

    async function init_user(user) {
        const user_data = await getObjectFromLocalStorage(user)
        // console.log(user_data)

        if (user_data === undefined) {
            console.log(`Initializing user ${user}`)
            await saveObjectInLocalStorage({ [user]: { play_count: 0, best_scores: [], best_scores_dom: [], link_info: [], recent_play_data: [] } })
        }
    }


    async function read_playdata(user) {
        // 페이지 미리 읽어오기
        // console.log(`Loading playdata of ${user}`)

        const my_data_doc = await fetch(`https://${base_url}/my_page/play_data.php`).then
            (resp => resp.text()).then
            (html => (new DOMParser()).parseFromString(html, "text/html"))
        const play_count = parseInt(my_data_doc.getElementsByClassName("total flex col")[0].children[0].children[1].innerHTML)
        let finished = false
        let x = 1
        const step = 10
        const best_scores = []
        const best_scores_dom = []
        const recent_scores = []
        while (!finished) {
            const best_score_promises = []
            for (let i = x; i < x + step; i++) {
                best_score_promises.push(read_best_score(i))
            }
            const result = await Promise.all(best_score_promises)
            result.forEach(res => {
                if (res.length == 2) {
                    best_scores.push(...res[0])
                    best_scores_dom.push(...(res[1].map(r => r.innerHTML)))
                }

            })
            finished = result[result.length - 1].length == 0
            x += step
        }
        finished = false
        x = 1
        const original_data = await getObjectFromLocalStorage(user)
        const original_play_data = original_data["recent_play_data"]
        const play_data_times = original_play_data.map(play_data => play_data.time)
        // console.log(play_data_times)
        while (!finished) {
            const recent_score_promises = []
            for (let i = x; i < x + step; i++) {
                recent_score_promises.push(read_recent_score(i))
            }
            const result = await Promise.all(recent_score_promises)
            result.forEach(res => {
                res.forEach(r => {
                    if (!play_data_times.includes(r.time))
                        recent_scores.push(r)
                })
            })
            finished = result[result.length - 1].length == 0
            x += step
        }

        // console.log("New play info: " + `${recent_scores.length}`)
        const recent_scores_updated = [...recent_scores, ...original_data["recent_play_data"]]
        // console.log(best_scores_dom)
        const link_info = await link_song_all(best_scores, recent_scores_updated)
        await saveObjectInLocalStorage({
            [user]: {
                ...original_data,
                best_scores: best_scores,
                best_scores_dom: best_scores_dom,
                link_info: link_info,
                recent_play_data: recent_scores_updated,
                play_count: play_count
            }
        })
    }

    /* 
    ************************
    * BEST SCORE MORE INFO *
    ************************
    */
    const best_score_sort_key = ["기본", "기본"]

    async function add_detailed_info(dom, best_score, detail) {
        // 각각의 score에 detail 추가. dom - best score - detail이 align되어 있는 것이 전제임.
        const new_dom = document.createElement("li")
        new_dom.appendChild(htmlToElement(dom))
        // console.log(dom)
        // console.log(best_score)
        // console.log(detail)
        function div_factory(text) {
            const li = document.createElement("li")
            const outmost = document.createElement("div")
            outmost.classList.add("li_in")
            const inner = document.createElement("div")
            inner.classList.add("txt_v")
            const span = document.createElement("span")
            span.classList.add("num")
            span.innerHTML = text
            inner.appendChild(span)
            outmost.appendChild(inner)
            li.appendChild(outmost)
            return li
        }
        const new_div = document.createElement("div")
        new_div.classList.add("etc_con")
        const new_ul = document.createElement("ul")
        new_ul.classList.add(...("list flex vc hc wrap".split(" ")))

        const clear_info = div_factory(`최근 클리어율\n${detail.clear_count}/${detail.play_count}`)
        const average_score = div_factory(`최근 평균 점수\n${(detail.scores.reduce((a, b) => a + b, 0) / detail.scores.length).toFixed(0)}`)
        const average_miss_count = div_factory(`최근 평균 미스 수\n${(detail.miss_count.reduce((a, b) => a + b, 0) / detail.miss_count.length).toFixed(0)}`)
        new_ul.appendChild(clear_info)
        new_ul.appendChild(average_score)
        new_ul.appendChild(average_miss_count)
        new_div.appendChild(new_ul)
        // new_dom.children[0].appendChild(new_div)

        return new_dom
    }

    async function sort_best_score_dom(best_scores, details) {
        let all = document.URL.split("?").length == 1

        const lv = all ? -1 : Number(document.URL.split("=").slice(-1)[0])
        all = all || lv == 0
        const sg = lazy_values["best_score_sg_filter"]
        const mapping = {
            "싱글": "single",
            "더블": "double"
        }
        let sg_filter = mapping[sg]
        // console.log(sg_filter)
        // console.log(best_score_sort_key)
        const temp = []
        for (let i = 0; i < best_scores.length; i++) {
            if ((all || best_scores[i].level == lv) && (sg_filter == undefined || best_scores[i].type == sg_filter)) {
                temp.push({
                    index: i,
                    ...best_scores[i],
                    ...details[i],
                    clear_rate: details[i].clear_count / details[i].play_count,
                    average_score: details[i].scores.reduce((a, b) => a + b, 0) / details[i].scores.length,
                    average_miss_count: details[i].miss_count.reduce((a, b) => a + b, 0) / details[i].miss_count.length
                })
            }

        }
        // console.log(temp)

        const compare_fn_factory = (val1, val2) => val1 > val2 ? 1 : (val1 < val2 ? -1 : 0)

        const sort_by_index = (a, b) => a.index - b.index
        const sort_by_best_score = (a, b) => compare_fn_factory(b.score, a.score)
        const sort_by_average_score = (a, b) => compare_fn_factory(b.average_score, a.average_score)
        const sort_by_max_miss_count = (a, b) => compare_fn_factory(a.miss_count, b.miss_count)
        const sort_by_avg_miss_count = (a, b) => compare_fn_factory(a.average_miss_count, b.average_miss_count)
        const sort_by_play_count = (a, b) => compare_fn_factory(b.play_count, a.play_count)
        const sort_by_clear_rate = (a, b) => compare_fn_factory(b.clear_rate, a.clear_rate)
        const sort_by_level = (a, b) => compare_fn_factory(b.level, a.level)
        const sort_by_plate = (a, b) => compare_fn_factory(PLATE_LIST.indexOf(a.plate), PLATE_LIST.indexOf(b.plate))
        const sort_keys = {
            "기본": sort_by_index,
            "최근 플레이": sort_by_index,
            "최고 점수": sort_by_best_score,
            "평균 점수": sort_by_average_score,
            "최저 미스 수": sort_by_max_miss_count,
            "평균 미스 수": sort_by_avg_miss_count,
            "플레이 수": sort_by_play_count,
            "클리어율": sort_by_clear_rate,
            "레벨": sort_by_level,
            "플레이트": sort_by_plate
        }




        return [...temp.sort((a, b) => sort_keys[best_score_sort_key[0]](a, b) * 1000 + sort_keys[best_score_sort_key[1]](a, b)).map(e => e.index)]
    }

    async function filter_best_score_dom(best_scores, details) {

    }


    async function modify_best_score_dom() {

        const parent = document.getElementsByClassName("my_best_scoreList flex wrap")[0]

        while (parent.firstChild) {
            parent.removeChild(parent.firstChild)
        }

        const info = await getObjectFromLocalStorage(await getObjectFromLocalStorage("current_user"))
        // console.log(info.best_scores_dom.length)
        const sorted_index = await sort_best_score_dom(info.best_scores, info.link_info)
        // console.log(sorted_index)
        for (let i = 0; i < sorted_index.length; i++) {
            const best_scores_dom = info.best_scores_dom[sorted_index[i]]
            const best_score = info.best_scores[sorted_index[i]]
            const detail = info.link_info[sorted_index[i]]
            parent.appendChild(await add_detailed_info(best_scores_dom, best_score, detail))
        }
        try {
            parent.parentNode.removeChild(document.getElementsByClassName("page_search")[0])
        } catch (error) { } // 없음 말구

    }



    async function add_best_score_control_dom() {
        lazy_values["best_score_sg_filter"] = "전체"

        const sort_basic = [
            "최근 플레이", "최고 점수", "플레이트"
        ]
        const sort_standard = [
            "기본", "최고 점수", "평균 점수", "최저 미스 수", "평균 미스 수", "플레이 수", "클리어율", "레벨"
        ]
        const filter_rank = [
            "All", "SSS+", "SSS", "SS+", "SS", "S+", "S", "AAA+", "AAA", "AA+", "AA", "A+", "A", "B 이하"
        ]
        const filter_plate = [
            "All", "PG", "UG", "EG", "SG", "MG", "TG", "FG", "RG"
        ]
        const filter_level = [
            "All", "~10", "11", "12", "13", "14", "15", "16", "17", "18", "19", "20", "21", "22", "23", "24", "25", "26~"
        ]
        const filter_sg = [
            "전체", "싱글", "더블"
        ]

        const create_options = (node, options) => {
            options.forEach(s => {
                const new_child = document.createElement("option")
                new_child.setAttribute("value", s)
                new_child.innerHTML = s
                node.appendChild(new_child)
            })
        }

        // add single / double filter
        // const default_select_dom = document.getElementsByClassName("board_search")[0]
        const new_select_dom = document.createElement("select")
        new_select_dom.classList.add("input_st", "white", "wd15")
        new_select_dom.addEventListener("change", async e => {
            lazy_values["best_score_sg_filter"] = e.target.value
            await modify_best_score_dom()
        })
        create_options(new_select_dom, filter_sg)
        // default_select_dom.parentNode.insertBefore(new_select_dom, default_select_dom.nextSibling)

        const main = document.createElement("select")
        main.classList.add("input_st", "white", "wd15")
        main.addEventListener("change", async e => {
            best_score_sort_key[0] = e.target.value
            await modify_best_score_dom()
        })
        create_options(main, sort_basic)
        // 얘네는 최근 플레이 정보를 계속 저장해야 의미가 있는데, 나중에 추가하자
        const first = document.createElement("select")
        first.classList.add("input_st", "white", "wd15")
        first.addEventListener("change", async e => {
            best_score_sort_key[0] = e.target.value
            await modify_best_score_dom()
        })
        create_options(first, sort_standard)

        const second = document.createElement("select")
        second.classList.add("input_st", "white", "wd15")
        second.addEventListener("change", async e => {
            best_score_sort_key[1] = e.target.value
            await modify_best_score_dom()
        })
        create_options(second, sort_standard)

        const filter_rank_dom = document.createElement("select")
        filter_rank_dom.classList.add("input_st", "white", "wd15")
        filter_rank_dom.setAttribute("multiple", true)
        create_options(filter_rank_dom, filter_rank)

        const filter_plate_dom = document.createElement("select")
        filter_plate_dom.classList.add("input_st", "white", "wd15")
        filter_plate_dom.setAttribute("multiple", true)
        create_options(filter_plate_dom, filter_plate)

        const filter_level_dom = document.createElement("select")
        filter_level_dom.classList.add("input_st", "white", "wd15")
        filter_level_dom.setAttribute("multiple", true)
        create_options(filter_level_dom, filter_level)

        const filter_sg_dom = document.createElement("select")
        filter_sg_dom.classList.add("input_st", "white", "wd15")
        filter_sg_dom.setAttribute("multiple", true)
        create_options(filter_sg_dom, filter_sg)

        const add_div = document.createElement("div")
        add_div.classList.add("board_search")
        add_div.setAttribute("style", "justify-content: space-evenly")
        add_div.appendChild(new_select_dom)
        add_div.appendChild(main)
        // add_div.appendChild(first)
        // add_div.appendChild(second)


        const add_div2 = document.createElement("div")
        add_div2.classList.add("board_search")
        add_div2.appendChild(filter_rank_dom)
        add_div2.appendChild(filter_plate_dom)
        add_div2.appendChild(filter_level_dom)
        add_div2.appendChild(filter_sg_dom)

        const target_insert_parent = document.getElementsByClassName("pageWrap box1")[0]
        target_insert_parent.insertBefore(add_div, document.getElementsByClassName("my_best_score_wrap")[0])
        // target_insert_parent.insertBefore(add_div2, document.getElementsByClassName("my_best_score_wrap")[0]) //나중에 추가
        // console.log("Added best score sort info")
    }


    // async function sync_playdata(data) {
    //     console.log(data.best_scores)
    //     console.log(data.recent_scores)
    //     const chart_type_enum = ["single", "double", "co-op"]
    //     const plate_enum = [
    //         "failed", "rg", "fg", "tg", "mg", "sg", "eg", "ug", "pg"
    //     ]
    //     const result = await fetch(
    //         "http://127.0.0.1:8080/api/commit_playdata",
    //         {
    //             method: "POST",
    //             headers: { "Content-Type": "application/json" },
    //             body: JSON.stringify([...storage.best_scores, ...storage.recent_scores].map(
    //                 x => ({
    //                     ...x,
    //                     sd_type: x["type"] == "single" ? 0 : 1,
    //                     plate: plate_enum.indexOf(x["plate"]),
    //                     user_name: user_name,
    //                     user_tag: user_tag
    //                 })
    //             ))
    //         }
    //     )
    //     console.log(result)
    // }

    // function add_send_btn() {
    //     const buttons = document.getElementsByClassName("bot")[0]
    //     const new_div = document.createElement("div")
    //     new_div.classList.add("profile_btn", "flex", "vc", "hr")
    //     const new_item = document.createElement("a")

    //     new_item.classList.add("btn", "flex", "vc")
    //     const new_i = document.createElement("i")
    //     new_i.classList.add("tt")
    //     new_i.innerHTML = "DB 동기화"
    //     new_i.addEventListener("click", async () => await sync_playdata())
    //     // new_a.appendChild(new_span)
    //     new_item.appendChild(new_i)
    //     new_div.appendChild(new_item)
    //     buttons.appendChild(new_div)
    //     const childs = []
    //     while (buttons.firstChild) {
    //         // console.log(buttons.firstChild)
    //         childs.push(buttons.firstChild)
    //         buttons.removeChild(buttons.firstChild)
    //     }
    //     // console.log(childs)
    //     childs.forEach(e => buttons.appendChild(e))

    // }

    /* 
    **************
    * MAIN LOGIC *
    ************** 
    */
    const loading_dom = show_loading_dom()
    await init()
    // add_send_btn()
    if (is_title_page) {
        console.log("Running title")
        await modify_title_dom()
        add_title_sort_btn()
    }
    if (is_best_score_page) {
        console.log("Running best score")
        await add_best_score_control_dom()
        await modify_best_score_dom()
    }
    if (is_playdata_page) {
        console.log("Running playdata")
        await modify_playdata_dom()
    }

    if (loading_dom[0] != null) {
        hide_loading_dom(...loading_dom)
    }

})()