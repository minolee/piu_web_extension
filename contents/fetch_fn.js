/* 
*******************
* fetch functions *
******************* 
*/

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