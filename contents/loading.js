function show_loading_dom() {
    let parent, dom
    dom = document.createElement("p")
    dom.setAttribute("style", "font-size: 1.5rem; font-weight: bold; color: white; text-align: center;")
    dom.innerHTML = "확장 프로그램 로딩중..."
    if (is_title_page) {
        parent = document.getElementsByClassName("search row flex vc wrap")[0]
        parent.insertBefore(dom, parent.children[0])
    }
    else if (is_best_score_page) {
        parent = document.getElementsByClassName("pageWrap box1")[0]
        parent.insertBefore(dom, document.getElementsByClassName("my_best_score_wrap")[0])
    }
    else if (is_playdata_page) {
        parent = document.getElementsByClassName("pageWrap box1")[0]
        parent.insertBefore(dom, parent.childNodes[2])
    }

    return [parent, dom]
}

function hide_loading_dom(parent, dom) {
    parent.removeChild(dom)
}