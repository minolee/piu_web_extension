
(async () => {
    const mode = "reset"
    // https://gist.github.com/sumitpore/47439fcd86696a71bf083ede8bbd5466
    /**
     * Retrieve object from Chrome's Local StorageArea
     * @param {string} key 
     */
    const getObjectFromLocalStorage = async function (key) {
        return new Promise((resolve, reject) => {
            try {
                chrome.storage.local.get(key, function (value) {
                    resolve(value[key]);
                });
            } catch (ex) {
                reject(ex);
            }
        });
    };

    /**
     * Save Object in Chrome's Local StorageArea
     * @param {*} obj 
     */
    const saveObjectInLocalStorage = async function (obj) {
        return new Promise((resolve, reject) => {
            try {
                chrome.storage.local.set(obj, function () {
                    resolve();
                });
            } catch (ex) {
                reject(ex);
            }
        });
    };

    /**
     * Removes Object from Chrome Local StorageArea.
     *
     * @param {string or array of string keys} keys
     */
    const removeObjectFromLocalStorage = async function (keys) {
        return new Promise((resolve, reject) => {
            try {
                chrome.storage.local.remove(keys, function () {
                    resolve();
                });
            } catch (ex) {
                reject(ex);
            }
        });
    };
    // https://stackoverflow.com/questions/494143/creating-a-new-dom-element-from-an-html-string-using-built-in-dom-methods-or-pro/35385518#35385518
    function htmlToElement(html) {
        var template = document.createElement('template');
        html = html.trim(); // Never return a text node of whitespace as the result
        template.innerHTML = html;
        return template.content.firstChild;
    }

    const base_url = document.URL.split("/")[2]
    const recent_play_classname = "recently_playeList flex wrap"
    const my_best_score_classname = "my_best_scoreList flex wrap"
    const is_title_page = document.URL.split("/").slice(-1)[0] == "title.php"
    const is_best_score_page = document.URL.split("/").slice(-1)[0].split("?")[0] == "my_best_score.php"


    const coop_rating = await fetch(`https://${base_url}/my_page/play_data.php?lv=coop`).then
        (resp => resp.text()).then
        (html => (new DOMParser()).parseFromString(html, "text/html")).then
        (doc => parseInt(doc.getElementsByClassName("num fontSt")[0].innerHTML.replaceAll(",", "")))
    const title_progresses = new Map()

    console.log(base_url)
    // await removeObjectFromLocalStorage("BALL #4818")

    async function init() {
        const my_data_doc = await fetch(`https://${base_url}/my_page/play_data.php`).then
            (resp => resp.text()).then
            (html => (new DOMParser()).parseFromString(html, "text/html"))
        const play_count = parseInt(my_data_doc.getElementsByClassName("total")[0].children[1].innerHTML)
        const user = my_data_doc.getElementsByClassName("t2 en")[0].innerHTML
        if (mode == "reset" || mode == "gain") {
            console.log("RESET DB")
            await chrome.storage.local.clear()
        }

        if (mode == "gain") {
            console.log("GAIN MODE")
            await saveObjectInLocalStorage({ [user]: sample_obj })
        }


        await saveObjectInLocalStorage({ current_user: user, score_dom: [] })
        await init_user(user)
        const user_info = await getObjectFromLocalStorage(user)
        console.log(user_info)
        if (user_info["play_count"] != play_count) {
            await saveObjectInLocalStorage({ [user]: { ...user_info, play_count: play_count } })
            await read_playdata(user)
        }
        console.log(await getObjectFromLocalStorage(user))

        console.log("Finished initialization")

    }

    async function init_user(user) {
        const user_data = await getObjectFromLocalStorage(user)
        console.log(user_data)

        if (user_data === undefined) {
            console.log(`Initializing user ${user}`)
            await saveObjectInLocalStorage({ [user]: { play_count: 0, best_scores: [], best_scores_dom: [], link_info: [], recent_play_data: [] } })
        }
    }


    async function read_playdata(user) {
        // 페이지 미리 읽어오기
        console.log(`Loading playdata of ${user}`)
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

        console.log("New play info: " + `${recent_scores.length}`)
        const recent_scores_updated = [...recent_scores, ...original_data["recent_play_data"]]
        // console.log(best_scores_dom)
        const link_info = await link_song_all(best_scores, recent_scores_updated)
        await saveObjectInLocalStorage({
            [user]: {
                ...original_data,
                best_scores: best_scores,
                best_scores_dom: best_scores_dom,
                link_info: link_info,
                recent_play_data: recent_scores_updated
            }
        })
    }

    function parse_level_info(elem) {
        // 사진에서 레벨 정보 뽑아오기

        const ds = {
            "s": "single",
            "d": "double",
            "c": "co-op"
        }[elem.querySelector(".tw").children[0].src.split("/").slice(-1)[0][0]]
        // const ds = elem.querySelector(".tw").innerHTML.includes("s_text.png") ? "single" : "double" // double or single
        if (ds == "co-op") {
            return [ds, 0]
        }
        const level = elem.querySelectorAll(".imG")
        let level_value = ""
        for (let lv = 0; lv < level.length; lv++) {
            level_value += (level[lv].children[0].src.slice(-5, -4))
        }
        level_value = parseInt(level_value)
        return [ds, level_value]
    }

    /* 
    *******************
    * fetch functions *
    ******************* 
    */
    async function read_best_score(page_num) {
        // best score 페이지 정보 긁어오기
        let doc = fetch(`https://${base_url}/my_page/my_best_score.php?&&page=${page_num}`)
        const redirected = await doc.then(response => !(response.url.endsWith(page_num)))
        if (redirected) return []
        let html = doc.then(response => response.text()).then(html => (new DOMParser()).parseFromString(html, "text/html"))

        const doc_1 = await html
        const best_scores = parse_best_score_html(doc_1)
        return best_scores
    }

    function parse_best_score_html(doc) {
        // 단일 score parsing
        const target = doc.getElementsByClassName(my_best_score_classname)
        const scores = []
        const doms = []
        for (let i = 0; i < target[0].children.length; i++) {
            const score = target[0].children[i]
            const [ds, level_value] = parse_level_info(score)
            const song_name = score.querySelector(".song_name").innerText
            const score_text = parseInt(score.querySelector(".num").innerText.replaceAll(",", ""))
            const plate = score.getElementsByClassName("img st1")[0].children[0].src.slice(-6, -4)
            doms.push(score)
            scores.push({
                "type": ds,
                "level": level_value,
                "song_name": song_name,
                "score": score_text,
                "plate": plate,
            })
        }
        return [scores, doms]
    }

    async function read_recent_score(page_num) {
        // recent score 페이지 정보 긁어오기
        let doc = fetch(`https://${base_url}/my_page/recently_played.php?&&page=${page_num}`)
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
        // 단일 score parsing
        let scores = []
        const target = doc.getElementsByClassName(recent_play_classname)
        for (let i = 0; i < target[0].children.length; i++) {
            const data = target[0].children[i]
            const song_name = data.querySelector(".song_name").innerText // 잘됨
            const level_dom = data.getElementsByClassName("stepBall_img_wrap")[0]
            const [ds, level_value] = parse_level_info(level_dom)
            const score_text = parseInt(data.querySelector(".tx").innerText.replaceAll(",", ""))
            const miss_count = parseInt(data.getElementsByClassName("fontCol fontCol5")[0].children[0].innerHTML)

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
                "time": time,
                "miss_count": miss_count
            })
        }
        return scores
    }


    function link_song_all(best_scores, recent_scores) {
        return best_scores.map(score => link_best_score_info(recent_scores, score))
    }
    function link_best_score_info(recent_play_data, best_score) {
        // 해당 노래에 대한 정보 update
        let play_count = 0
        let clear_count = 0
        let miss_count = []
        let scores = []

        recent_play_data.filter(
            score => score.song_name == best_score.song_name && score.type == best_score.type && score.level == best_score.level
        ).forEach(
            score => {
                play_count++
                if (score.plate != "failed") clear_count++
                miss_count.push(score.miss_count)
                scores.push(score.score)
            }
        )
        // if (best_score.song_name == "벡터") {
        //     console.log(best_score.song_name, best_score.type, best_score.level, play_count, clear_count, miss_count, scores)
        // }

        return {
            play_count: play_count,
            clear_count: clear_count,
            miss_count: miss_count,
            scores: scores
        }
    }


    /* 
    *******************
    * title functions *
    ******************* 
    */
    // member functions
    function member(data, target) {
        const requirement = {
            "vvip": 10000,
            "vip": 5000,
            "diamond": 1000,
            "platinum": 500,
            "gold": 100
        }
        return [data.play_count, requirement[target]]
    }


    // gamer functions
    function gamer(data, target, level) {
        // 다행히도 조건이 모두 같다. level은 역순으로 넣음 (플레티넘이 1, 동색이 4임)
        const target_play_count = [3000, 1000, 500, 100][level]
        const res = data.recent_play_data.filter(d => d.plate[0] == target[0]).length
        return [res, target_play_count]
    }

    // ratings
    function ratings(data, target, level) {
        /**
         * rating 관련 타이틀의 진행도 계산
         * target: intermediate, advanced, expert
         * level: 1~10 사이
         * TODO: co-op 대응해야 함
         */


        const requirement = {
            "intermediate": [2000, 2200, 2600, 3200, 4000, 5000, 6200, 7600, 9200, 11000],
            "advanced": [13000, 26000, 39000, 15000, 30000, 45000, 17500, 35000, 52500, 70000],
            "expert": [40000, 80000, 30000, 60000, 20000, 40000, 13000, 26000, 3500, 7000],
            "[co-op]": [...Array(13).keys()].map(x => (x + 1) * 30000)
        }[target][level]
        const level_target = {
            "intermediate": [10, 11, 12, 13, 14, 15, 16, 17, 18, 19],
            "advanced": [20, 20, 20, 21, 21, 21, 22, 22, 22, 22],
            "expert": [23, 23, 24, 24, 25, 25, 26, 26, 27, 27],
            "[co-op]": [...Array(13).keys()].map(_ => 0)
        }[target][level]

        if (target == "[co-op]") {
            return [coop_rating, requirement]
        }

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
        for (let i = 0; i < data.best_scores.length; i++) {
            const info = data.best_scores[i]
            if (info.level != level_target) continue
            if (info.plate == "failed") continue
            const rank = get_rank(info.score)
            if (rank == -1) continue
            const rating = rating_base * rating_modifier[rank]
            const query = `${info.song_name}-${info.type}`
            calculated_ratings[query] = calculated_ratings[query] ? Math.max(rating, calculated_ratings[query]) : rating
        }

        return [Object.values(calculated_ratings).reduce((a, b) => a + b, 0), requirement]
    }

    function specific_song_target(data, song_name, type, level, target_score) {
        for (let i = 0; i < data.best_scores.length; i++) {
            const score = data.best_scores[i]
            if (
                score.song_name == song_name &&
                score.type == type &&
                score.level == level
                // plate는 필요없음 - 어차피 best score에 fail은 없음
            ) {
                return [score.score, target_score]
            }
        }
        return [0, target_score]
    }

    function parse_require_song(doc) {
        // 필요 곡 이름 및 채보 파싱
        const target = doc.getElementsByClassName("t3 tx")[0].children[1].innerText.split("]")[0].slice(1)
        const song_name = target.split(" ").slice(0, -1).join(" ")
        const type_level = target.split(" ")[target.split(" ").length - 1]
        const type = type_level[0] == "S" ? "single" : "double"
        const level = parseInt(type_level.slice(1))
        return [song_name, type, level]

    }

    async function get_progress(doc) {
        // 하 드 코 딩
        const keywords = {
            "lovers": "count",
            "[co-op]": "rating",
            "member": "member",
            "gamer": "gamer",
            "intermediate": "rating",
            "advanced": "rating",
            "expert": "rating",
            "scrooge": "scrooge",
        }
        const data = await getObjectFromLocalStorage(await getObjectFromLocalStorage("current_user"))
        console.log(data)
        let name = doc.getAttribute("data-name").toLowerCase()
        const skills = ["BRACKET", "HALF", "GIMMICK", "DRILL", "RUN", "TWIST"].map(x => x.toLowerCase())
        // 하드코딩 먼저

        if (name == "no skills no pump") {
            return specific_song_target(data, "월광", "double", 21, 995000)
        }
        if (name == "specialist") {
            let done = 0
            const titles = document.getElementsByClassName("data_titleList2 flex wrap")[0]

            for (let i = 0; i < titles.children.length; i++) {
                const child = titles.children[i]
                const _name = child.getAttribute("data-name")
                const skill_target = _name.split(" ")[0].slice(1, -1).toLowerCase()
                if (
                    skills.includes(skill_target)
                    && child.getAttribute("class") == "have"
                    && _name.split(" ")[1] != "expert"
                ) done++
            }
            return [done, 60]
        }

        // 본격적 파싱
        name = name.split(" ")
        // skill 관련

        if (skills.includes(name[0].slice(1, name[0].length - 1))) {
            const skill_target = name[0].slice(1, name[0].length - 1)
            const lv_target = name[1] == "expert" ? -1 : parseInt(name[1].split(".")[1]) - 1
            if (lv_target != -1) {
                // 필요 곡 파싱
                const song_info = parse_require_song(doc)
                // 설마 곡 조건이랑 베스트 플레이 곡 이름정도는 통일되어있겠지??
                return specific_song_target(data, ...song_info, 990000)
            }
            else {
                // expert - 같은것 10개 다 깼는지 체크
                let done = 0
                const titles = document.getElementsByClassName("data_titleList2 flex wrap")[0]
                for (let i = 0; i < titles.children.length; i++) {
                    const child = titles.children[i]
                    if (child.getAttribute("data-name").slice(1, 1 + skill_target.length).toLowerCase() == skill_target && child.getAttribute("class") == "have") done++
                }
                return [done, 10]
            }
        }

        if (name.slice(-2).join(" ") == "boss breaker") {
            return doc.getAttribute("class") == "have" ? [1, 1] : [0, 1]
        }

        // hard code for coop master / coop expert
        if (name[0] == "[co-op]" && name[1] == "master") {
            name[1] = "Lv.13"
        }
        if (name[0] == "[co-op]" && name[1] == "expert") {
            name[1] = "Lv.12"
        }
        if (name[0] == "[co-op]" && name[1] == "advanced") {
            name[1] = "Lv.11"
        }
        let keyword = ""

        // if (name[0][0] == "[" && name[0][name[0].length - 1] == "]") {
        //     // 어차피 괄호로 시작하는 애들은 다 0 아님 1임
        //     // TODO coop은 빼기
        //     return doc.getAttribute("class") == "have" ? [1, 1] : [0, 1]
        // }


        for (const key in keywords) {
            if (name.includes(key)) {
                keyword = keywords[key]
                break
            }
        }
        let level;
        switch (keyword) {
            case "":
                return doc.getAttribute("class") == "have" ? [1, 1] : [0, 1]
            case "gamer":
                level = parseInt(doc.getElementsByClassName("txt_w")[0].children[0].classList[2][3]) - 1
                return gamer(data, name[0], level)
            case "rating":
                level = parseInt(name[1].split(".")[1]) - 1
                return ratings(data, name[0], level)
            case "member":
                return member(data, name[0])
            case "scrooge":
                return [parseInt(document.getElementsByClassName("tt en")[0].innerHTML.replace(",", "")), 10000]
            default:
                return doc.getAttribute("class") == "have" ? [1, 1] : [0, 1]
        }
    }

    async function run(doc) {
        // progress 계산 후 텍스트 추가
        const _p = await get_progress(doc)
        const current = _p[0]
        const target = _p[1]
        const progress = current / target
        // https://stackoverflow.com/questions/44080526/javascript-map-use-htmlelement-as-key
        title_progresses.set(doc, progress)
        const new_elem = document.createElement("p")
        new_elem.classList.add("t3")
        new_elem.classList.add("tx")
        new_elem.innerHTML = `진행도: ${Math.min(100, Math.round(progress * 100))}% (${current} / ${target})`

        doc.getElementsByClassName("txt_w2")[0]?.appendChild(new_elem)
    }

    async function modify_title_dom() {
        // 모든 칭호에 대해 progress 달기
        const titles = document.getElementsByClassName("data_titleList2 flex wrap")[0]
        const promises = []
        for (let i = 0; i < titles.children.length; i++) {
            promises.push(run(titles.children[i]))
        }
        await Promise.all(promises)

    }

    function sort_title_dom() {
        // 클릭 시 실행되는 함수
        // https://stackoverflow.com/questions/37982476/how-to-sort-a-map-by-value-in-javascript
        const sorted = new Map([...title_progresses.entries()].sort((a, b) => b[1] - a[1]));

        const titles = document.getElementsByClassName("data_titleList2 flex wrap")[0]
        while (titles.firstChild) {
            titles.removeChild(titles.firstChild)
        }
        [...sorted.keys()].forEach(e => titles.appendChild(e))
        // titles.children = HTMLCollection([...sorted_progress])
    }

    function add_title_sort_btn() {
        const search_area = document.getElementsByClassName("search row flex vc wrap")[0]
        const new_btn = document.createElement("button")
        new_btn.classList.add("stateBox")
        new_btn.classList.add("bg2")
        new_btn.innerHTML = "진행도 순 정렬"
        new_btn.addEventListener("click", sort_title_dom)
        search_area.insertBefore(new_btn, search_area.children[0])
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

        const clear_info = div_factory(`클리어율\n${detail.clear_count}/${detail.play_count}`)
        const average_score = div_factory(`평균 점수\n${(detail.scores.reduce((a, b) => a + b, 0) / detail.scores.length).toFixed(0)}`)
        const average_miss_count = div_factory(`평균 미스 수\n${(detail.miss_count.reduce((a, b) => a + b, 0) / detail.miss_count.length).toFixed(0)}`)
        new_ul.appendChild(clear_info)
        new_ul.appendChild(average_score)
        new_ul.appendChild(average_miss_count)
        new_div.appendChild(new_ul)
        new_dom.children[0].appendChild(new_div)

        return new_dom
    }

    async function sort_best_score_dom(best_scores, details) {
        console.log(best_score_sort_key)
        const temp = []
        for (let i = 0; i < best_scores.length; i++) {
            temp.push({
                index: i,
                ...best_scores[i],
                ...details[i],
                clear_rate: details[i].clear_count / details[i].play_count,
                average_score: details[i].scores.reduce((a, b) => a + b, 0) / details[i].scores.length,
                average_miss_count: details[i].miss_count.reduce((a, b) => a + b, 0) / details[i].miss_count.length
            })
        }
        console.log(temp)

        const compare_fn_factory = (val1, val2) => val1 > val2 ? 1 : (val1 < val2 ? -1 : 0)

        const sort_by_index = (a, b) => a.index - b.index
        const sort_by_best_score = (a, b) => compare_fn_factory(b.score, a.score)
        const sort_by_average_score = (a, b) => compare_fn_factory(b.average_score, a.average_score)
        const sort_by_max_miss_count = (a, b) => compare_fn_factory(a.miss_count, b.miss_count)
        const sort_by_avg_miss_count = (a, b) => compare_fn_factory(a.average_miss_count, b.average_miss_count)
        const sort_by_play_count = (a, b) => compare_fn_factory(b.play_count, a.play_count)
        const sort_by_clear_rate = (a, b) => compare_fn_factory(b.clear_rate, a.clear_rate)
        const sort_by_level = (a, b) => compare_fn_factory(b.level, a.level)

        const sort_keys = {
            "기본": sort_by_index,
            "최고 점수": sort_by_best_score,
            "평균 점수": sort_by_average_score,
            "최저 미스 수": sort_by_max_miss_count,
            "평균 미스 수": sort_by_avg_miss_count,
            "플레이 수": sort_by_play_count,
            "클리어율": sort_by_clear_rate,
            "레벨": sort_by_level
        }




        return [...temp.sort((a, b) => sort_keys[best_score_sort_key[0]](a, b) * 1000 + sort_keys[best_score_sort_key[1]](a, b)).map(e => e.index)]
    }


    async function modify_best_score_dom() {
        const parent = document.getElementsByClassName("my_best_scoreList flex wrap")[0]

        while (parent.firstChild) {
            parent.removeChild(parent.firstChild)
        }

        const info = await getObjectFromLocalStorage(await getObjectFromLocalStorage("current_user"))
        console.log(info.best_scores_dom.length)
        const sorted_index = await sort_best_score_dom(info.best_scores, info.link_info)
        console.log(sorted_index)
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
            "싱글", "더블"
        ]

        const create_options = (node, options) => {
            options.forEach(s => {
                const new_child = document.createElement("option")
                new_child.setAttribute("value", s)
                new_child.innerHTML = s
                node.appendChild(new_child)
            })
        }

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
        add_div.appendChild(first)
        add_div.appendChild(second)


        const add_div2 = document.createElement("div")
        add_div2.classList.add("board_search")
        add_div2.appendChild(filter_rank_dom)
        add_div2.appendChild(filter_plate_dom)
        add_div2.appendChild(filter_level_dom)
        add_div2.appendChild(filter_sg_dom)

        const target_insert_parent = document.getElementsByClassName("pageWrap box1")[0]
        target_insert_parent.insertBefore(add_div, document.getElementsByClassName("my_best_score_wrap")[0])
        // target_insert_parent.insertBefore(add_div2, document.getElementsByClassName("my_best_score_wrap")[0]) //나중에 추가
        console.log("Added best score sort info")
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

})()