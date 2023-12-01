
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

async function send() {
    data = await getObjectFromLocalStorage(user)

}

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    console.log(sender.tab ?
        "from a content script:" + sender.tab.url :
        "from the extension");
    console.log(sender)
    console.log(request)

    if (request.action === "FINISH")
        sendResponse({ farewell: "goodbye" });
});