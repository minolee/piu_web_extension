/* 
*******************
* title functions *
******************* 
*/


const title_progresses = new Map()

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
        return [lazy_values["coop_rating"], requirement]
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
    // console.log(data)
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