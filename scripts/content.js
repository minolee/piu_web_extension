
// score fetcher //
(async () => {

    const recent_scores = []
    const best_scores = []

    const recent_play_classname = "recently_playeList flex wrap"
    const my_best_score_classname = "my_best_scoreList flex wrap"
    const title_progresses = new Map()

    async function read_best_score(page_num) {
        let doc = fetch(`https://phoenix.piugame.com/my_page/my_best_score.php?&&page=${page_num}`)
        const redirected = await doc.then(response => !(response.url.endsWith(page_num)))
        if (redirected) return []
        let html = doc.then(response => response.text()).then(html => (new DOMParser()).parseFromString(html, "text/html"))

        const doc_1 = await html

        return parse_best_score_html(doc_1)
    }

    function parse_level_info(elem) {
        const ds = elem.querySelector(".tw").innerHTML.includes("s_text.png") ? "single" : "double" // double or single

        const level = elem.querySelectorAll(".imG")
        let level_value = ""
        for (let lv = 0; lv < level.length; lv++) {
            level_value += (level[lv].children[0].src.slice(-5, -4))
        }
        level_value = parseInt(level_value)
        return [ds, level_value]
    }

    function parse_best_score_html(doc) {
        const target = doc.getElementsByClassName(my_best_score_classname)

        let scores = []
        for (let i = 0; i < target[0].children.length; i++) {
            const score = target[0].children[i]
            const [ds, level_value] = parse_level_info(score)
            const song_name = score.querySelector(".song_name").innerText
            const score_text = parseInt(score.querySelector(".num").innerText.replace(",", ""))
            const plate = score.getElementsByClassName("img st1")[0].children[0].src.slice(-6, -4)

            scores.push({
                "type": ds,
                "level": level_value,
                "song_name": song_name,
                "score": score_text,
                "plate": plate
            })
            // console.log([ds, level_value, song_name, score_text, plate]) // works well
        }
        return scores
    }

    async function read_recent_score(page_num) {
        let doc = fetch(`https://phoenix.piugame.com/my_page/recently_played.php?&&page=${page_num}`)
        const redirected = await doc.then(response => !(response.url.endsWith(page_num)))
        if (redirected) return []
        let html = doc.then(response => response.text()).then(html => (new DOMParser()).parseFromString(html, "text/html"))

        const doc_1 = await html
        try {
            return parse_recent_score_html(doc_1)
        } catch (error) {
            console.log(page_num)
            console.log(error)
            return []
        }
    }

    function parse_recent_score_html(doc) {
        let scores = []
        const target = doc.getElementsByClassName(recent_play_classname)
        for (let i = 0; i < target[0].children.length; i++) {
            const data = target[0].children[i]
            const song_name = data.querySelector(".song_name").innerText // 잘됨
            const level_dom = data.getElementsByClassName("stepBall_img_wrap")[0]
            const [ds, level_value] = parse_level_info(level_dom)
            const score_text = parseInt(data.querySelector(".tx").innerText.replace(",", ""))
            let plate = "failed"
            try {
                plate = data.getElementsByClassName("li_in st1")[0].children[0].src.slice(-6, -4)
            } catch (error) {
                plate = "failed"
            }
            const time = data.getElementsByClassName("recently_date_tt")[0].innerText
            // console.log([ds, level_value, title, score_text, plate])
            scores.push({
                "type": ds,
                "level": level_value,
                "song_name": song_name,
                "score": score_text,
                "plate": plate,
                "time": time
            })
        }
        return scores
    }


    // title functions //

    // count
    const lovers = (data, level) => 0

    // member functions
    const vvip_member = (data, level) => 0
    const vip_member = (data, level) => 0
    const diamond_member = (data, level) => 0
    const platinum_member = (data, level) => 0
    const gold_member = (data, level) => 0


    // gamer functions
    function gamer(target, level) {
        const target_play_count = [3000, 1000, 500, 100][level]
        const res = recent_scores.filter(d => d.plate[0] == target[0]).length
        return Math.round(res / target_play_count * 100)
    }

    // ratings
    function ratings(target, level) {
        const requirement = {
            "intermediate": [2000, 2200, 2600, 3200, 4000, 5000, 6200, 7600, 9200, 11000],
            "advanced": [13000, 26000, 39000, 15000, 30000, 45000, 17500, 35000, 52500, 70000],
            "expert": [40000, 80000, 30000, 60000, 20000, 40000, 13000, 26000, 3500, 7000]
        }[target][level]
        const level_target = {
            "intermediate": [10, 11, 12, 13, 14, 15, 16, 17, 18, 19],
            "advanced": [20, 20, 20, 21, 21, 21, 22, 22, 22, 22],
            "expert": [23, 23, 24, 24, 25, 25, 26, 26, 27, 27]
        }[target][level]
        // ref: https://gall.dcinside.com/mini/board/view/?id=pumpitup&no=16029
        const rating_base = ((level) => (100 + (level - 10) * (level - 9) * 10 / 2))(level_target)
        // ref: https://docs.google.com/spreadsheets/d/1oNq2sE49QMQRP-CLVSswsZ-rlVvSHi-0_GyFgJXE7bo/edit#gid=0
        const rating_modifier = [
            0.7, // B
            0.8, // A
            0.9, // A+
            1.0, // AA
            1.05, // AA+
            1.1, // AAA
            1.15, // AAA+
            1.2, // S
            1.26, // S+
            1.32, // SS
            1.38, // SS+
            1.44, // SSS
            1.5, // SSS+
        ]

        const score_range = [
            [700000, 749999], // B
            [750000, 799999], // A
            [800000, 899999], // A+
            [900000, 924999], // AA
            [925000, 949999], // AA+
            [950000, 959999], // AAA
            [960000, 969999], // AAA+
            [970000, 974999], // S
            [975000, 979999], // S+
            [980000, 984999], // SS
            [985000, 989999], // SS+
            [990000, 994999], // SSS
            [995000, 1000000], // SSS+
        ]

        function get_rank(score) {
            for (let i = 0; i < score_range.length; i++) {
                if (score >= score_range[i][0] && score <= score_range[i][1]) {
                    return i
                }
            }
            return -1
        }
        let calculated_ratings = {}
        for (let i = 0; i < best_scores.length; i++) {
            const info = best_scores[i]
            if (info.level != level_target) continue
            if (info.plate == "failed") continue
            const rank = get_rank(info.score)
            if (rank == -1) continue
            const rating = rating_base * rating_modifier[rank]
            const query = `${info.song_name}-${info.type}`
            calculated_ratings[query] = calculated_ratings[query] ? Math.max(rating, calculated_ratings[query]) : rating
        }

        return Math.round((Object.values(calculated_ratings).reduce((a, b) => a + b, 0) / requirement) * 100)
    }



    function get_progress(doc) {
        const keywords = {
            "lovers": "count",
            "[co-op]": "",
            "member": "count",
            "gamer": "gamer",
            "intermediate": "rating",
            "advanced": "rating",
            "expert": "rating",
        }
        let name = doc.getAttribute("data-name").toLowerCase().split(" ")

        // hard code for coop master / coop expert
        if (name[0] == "[co-op]" && name[1] == "master") {
            name[1] = "Lv.12"
        }
        if (name[0] == "[co-op]" && name[1] == "expert") {
            name[1] = "Lv.11"
        }
        let keyword = ""

        if (name[0][0] == "[" && name[0][name[0].length - 1] == "]") {
            // 어차피 괄호로 시작하는 애들은 다 0 아님 1임
            return 0
        }



        for (let key in keywords) {
            if (name.includes(key)) {
                keyword = keywords[key]
                break
            }
        }
        if (keyword == "") {
            return 0
        }
        if (keyword == "gamer") {
            const level = parseInt(doc.getElementsByClassName("txt_w")[0].children[0].classList[2][3]) - 1
            return gamer(name[0], level)
        }

        if (keyword == "rating") {
            const target = name[0]
            const level = parseInt(name[1].split(".")[1]) - 1
            return ratings(target, level)
        }

        return 0
    }

    function run(doc) {
        const progress = get_progress(doc)
        // https://stackoverflow.com/questions/44080526/javascript-map-use-htmlelement-as-key
        title_progresses.set(doc, progress)
        const new_elem = document.createElement("p")
        new_elem.classList.add("t3")
        new_elem.classList.add("tx")
        new_elem.innerHTML = `진행도: ${progress}%`

        doc.getElementsByClassName("txt_w2")[0]?.appendChild(new_elem)

    }

    function modify_title_dom() {
        // modify dom of title page
        const titles = document.getElementsByClassName("data_titleList2 flex wrap")[0]
        // let frag = document.createDocumentFragment()

        // Array.from(titles.children).slice(0, 200).forEach(dom => frag.appendChild(dom))
        // console.log(frag)
        // titles.removeChild(titles.children[0])
        // titles.children = HTMLCollection([...titles.children].slice(0, 5))
        for (let i = 0; i < titles.children.length; i++) {
            run(titles.children[i])
        }

    }

    function sort_title_dom() {
        // https://stackoverflow.com/questions/37982476/how-to-sort-a-map-by-value-in-javascript
        // console.log(title_progresses) // work well

        const sorted = new Map([...title_progresses.entries()].sort((a, b) => b[1] - a[1]));

        const titles = document.getElementsByClassName("data_titleList2 flex wrap")[0]
        while (titles.firstChild) {
            titles.removeChild(titles.firstChild)
        }
        [...sorted.keys()].forEach(e => titles.appendChild(e))
        // titles.children = HTMLCollection([...sorted_progress])
    }



    async function init() {

        let finished = false
        let x = 0
        const step = 10
        while (!finished) {
            const best_score_promises = []
            for (let i = x; i < x + step; i++) {
                best_score_promises.push(read_best_score(i))
            }

            const result = await Promise.all([...best_score_promises])
            result.forEach(res => best_scores.push(...res))
            finished = result[result.length - 1].length == 0
            x += step
        }
        finished = false
        x = 0

        while (!finished) {
            const recent_score_promises = []
            for (let i = x; i < x + step; i++) {
                recent_score_promises.push(read_recent_score(i))
            }
            const result = await Promise.all([...recent_score_promises])

            result.forEach(res => recent_scores.push(...res))
            finished = result[result.length - 1].length == 0
            x += step
        }

        // console.log(recent_scores)
    }

    function add_sort_btn() {
        const search_area = document.getElementsByClassName("search row flex vc wrap")[0]
        const new_btn = document.createElement("button")
        new_btn.classList.add("stateBox")
        new_btn.classList.add("bg2")
        new_btn.innerHTML = "진행도 순 정렬"
        new_btn.addEventListener("click", sort_title_dom)
        search_area.insertBefore(new_btn, search_area.children[0])
    }
    await init()
    modify_title_dom()
    add_sort_btn()
})()