chrome.app.runtime.onLaunched.addListener(function() {
	//what to launch and how
	chrome.app.window.create('webview.html', {
		bounds: {
			width:800,
			height:600,
			left:100,
			top:100
		},
		minWidth: 800,
		minHeight:600,
		frame: "none",
	});


});

chrome.runtime.onInstalled.addListener(function() {
	//database
	//chrome.storage.local.set(object items, function callback);
});

chrome.runtime.onSuspend.addListener(function() {
	//close open connections.
	//do cleanup tasks
})

