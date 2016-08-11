chrome.webRequest.onBeforeSendHeaders.addListener(function(details) {
    var requestHeaders = details.requestHeaders;
    for (var i=0; i<requestHeaders.length; ++i) {
        if (requestHeaders[i].name.toLowerCase() === 'referer') {
            // The request was certainly not initiated by a Chrome extension...
            return;
        }
    }
    // Set Referer
    requestHeaders.push({
        name: 'referer',
        // Host must match the domain in your Typekit kit settings
        value: 'https://fpjagaljndnekelimchojdakbnfalejm/'
    });
    return {
        requestHeaders: requestHeaders
    };
}, {
    urls: ['*://use.typekit.net/*'],
    types: ['stylesheet']
}, ['requestHeaders','blocking'])

chrome.browserAction.onClicked.addListener(function()
{
    chrome.tabs.create({ url: "index.html" });
});

