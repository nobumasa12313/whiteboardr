

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

(function(i,s,o,g,r,a,m){i['GoogleAnalyticsObject']=r;i[r]=i[r]||function(){
  (i[r].q=i[r].q||[]).push(arguments)},i[r].l=1*new Date();a=s.createElement(o),
  m=s.getElementsByTagName(o)[0];a.async=1;a.src=g;m.parentNode.insertBefore(a,m)
  })(window,document,'script','//www.google-analytics.com/analytics.js','ga');

  ga('create', 'UA-41957345-1', 'whiteboardr.org');
  ga('send', 'pageview');