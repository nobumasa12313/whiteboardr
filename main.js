chrome.app.runtime.onLaunched.addListener(function() {
	//what to launch and how
	chrome.app.window.create('index.html', {
		bounds: {
			width:800,
			height:600,
			left:100,
			top:100
		},
		minWidth: 320,
		minHeight:600,
		frame:"none",
		transparentBackground: true
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

function closeWindow() {
  window.close();
}