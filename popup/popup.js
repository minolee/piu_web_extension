document.getElementById("form").addEventListener("submit", (event) => {
    event.preventDefault()
    const level = document.getElementById("level").value
    const type = document.getElementById("type").value
    chrome.runtime.sendMessage({ level: level, type: type })
})