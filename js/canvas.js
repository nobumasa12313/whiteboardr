// class Canvas
WBR.Canvas = Ember.Object.create({

	// Private Canvas
	privateCanvasID: "private-canvas",
	privateCanvas: null,
	privateContext: null,

	currentCanvas: null,
	currentContext: null,
	userCommands: {},
	userCommandCache: {},
	adminCommandCache: {},

	lineThickness: 1,
	lineColor: "black",
	maxLineThickness: 30,

	isDrawMode: true,
	isPenDown: false,
	hasTouch: false,

		draw:true,
      lastColor:'black',
      lastThickness:'1',


	// Tracks the current location of the user's drawing pen
	localPen: {},
	localLineColor: "black",
	localLineThickness: 1,

	// A list of points in a path to send to other connected users
	bufferedPath: [],
	totalPath: [],

	// A timestamp indicating the last time a point was added to the bufferedPath
	lastBufferTime: new Date().getTime(),

	// A hash of pen positions for remote users, in the following 
	// format ("2345" is an example client ID):
	//  {"2345": {x:10, y:10}}
	userCurrentPositions: {},

	// A hash of pending drawing commands sent by remote users, the following format: 
	//  {"2345": [{commandName:moveTo, arg:{x:10, y:10}}, {commandName:lineTo, arg:{x:55, y:35}}]};
	

	// A hash of line colors for remote users, in the following format:
	//  {"2345": "#CCCCCC"};
	userColors: {},

	// A hash of line thicknesses for remote users, in the following format:
	//  {"2345": 5};
	userThicknesses: {},

	
	// Constructor
	initialize: function() 
	{
	      // Initialize Private Canvas
	      this.privateCanvas = document.getElementById(this.privateCanvasID);
	      this.privateCanvas.width  = window.innerWidth;
	      this.privateCanvas.height = window.innerHeight;
	      this.privateContext = this.privateCanvas.getContext('2d');
	      this.privateContext.lineCap = "round";

	      // Show the private, hide the public
	     	this.currentContext = this.privateContext;
	     	this.currentCanvas  = this.privateCanvas;

	      this.lineThickness  = document.getElementById("thickness").selectedIndex = 0;
	      this.lineColor      = document.getElementById("color").selectedIndex = 0;

	      this.registerEventListeners();

	

	},


	// Clear everything on the canvas
	clear: function() 
	{
		if ((WBR.Room.admincanvas == false && WBR.Room.orbiter.clientID != WBR.Room.adminID) || (WBR.Room.admincanvas == true && WBR.Room.orbiter.clientID == WBR.Room.adminID)) {
		this.currentContext.clearRect(0, 0, this.currentCanvas.width, this.currentCanvas.height);
		        WBR.Room.msgManager.sendUPC(WBR.Room.UPC.SEND_MESSAGE_TO_ROOMS, 
                     WBR.Room.Messages.CLEAR, 
                     WBR.roomID, 
                     "false", 
                     "", 
                     WBR.Room.orbiter.clientID);

		WBR.Canvas.userCommandCache = {};

	}
	},


	// Resize handler
	resize: function() 
	{

	},


	// Open the pubic canvas and transfer
	openPublic: function() 
	{

	},


	// Switch back to the private canvas
	closePublic: function() 
	{

	},
	resizeCanvas: function() {
		if ((new Date().getTime() - WBR.Canvas.lastBufferTime) > 100) {

				
		WBR.Canvas.privateCanvas.width  = window.innerWidth;
	    WBR.Canvas.privateCanvas.height = window.innerHeight;
		if (WBR.Room.admincanvas == true && WBR.Room.adminID != WBR.Room.orbiter.clientID) {
			WBR.Room.loadCanvas(WBR.Canvas.adminCommandCache);
		} else {
			WBR.Room.loadCanvas(WBR.Canvas.userCommandCache);
		}
		WBR.Canvas.lastBufferTime = new Date().getTime();
	}
	},
		saveCanvas: function() {
		Canvas2Image.saveAsPNG(WBR.Canvas.currentCanvas,true);
	},

	drawToCoordinate: function(x, y) 
	{

	},


	// REGISTER ALL LISTENERS
	registerEventListeners: function()
	{
		this.privateCanvas.onmousedown 	= this.pointerDownListener;
		document.onmousemove 	= this.pointerMoveListener;
		document.onmouseup 	= this.pointerUpListener;
		document.ontouchstart 	= this.touchDownListener;
		document.ontouchmove 	= this.touchMoveListener;
		document.ontouchend 	= this.touchUpListener;
		document.getElementById("thickness").onchange = this.thicknessSelectListener;
		document.getElementById("color").onchange = this.colorSelectListener;
	},




	// TOUCH LISTENERS

	touchDownListener: function(e) 
	{
		if (WBR.Room.admincanvas && WBR.Room.orbiter.clientID != WBR.Room.adminID) {
			return;
		}
		WBR.Canvas.hasTouch = true;

		if (event.target.nodeName != "SELECT") {
			e.preventDefault();
		}

		// Determine where the user touched screen.
		var touchX = e.changedTouches[0].clientX - WBR.Canvas.currentCanvas.offsetLeft;
		var touchY = e.changedTouches[0].clientY - WBR.Canvas.currentCanvas.offsetTop;

		if (!WBR.Canvas.isPenDown) {
			// Move the drawing pen to the position that was touched
			WBR.Canvas.penDown(touchX/WBR.Canvas.currentCanvas.width, touchY/WBR.Canvas.currentCanvas.height);
		}
	},

	touchMoveListener: function(e) 
	{
		WBR.Canvas.hasTouch = true;
		e.preventDefault();
		var touchX = e.changedTouches[0].clientX - WBR.Canvas.currentCanvas.offsetLeft;
		var touchY = e.changedTouches[0].clientY - WBR.Canvas.currentCanvas.offsetTop;
		// Draw a line to the position being touched.
		WBR.Canvas.penMove(touchX/WBR.Canvas.currentCanvas.width, touchY/WBR.Canvas.currentCanvas.height);
	},

	touchUpListener: function() 
	{
		WBR.Canvas.penUp();
	},




	// POINTER LISTENERS

	pointerDownListener: function(e) 
	{
		if (WBR.Room.admincanvas && WBR.Room.orbiter.clientID != WBR.Room.adminID) {
			return;
		}
		if (WBR.Canvas.hasTouch) {
			return;
		}

		// Retrieve a reference to the Event object for this mousedown event.
		// Internet Explorer uses window.event; other browsers use the event parameter
		var event = e || window.event; 

		// Determine where the user clicked the mouse.
		var mouseX = event.clientX - WBR.Canvas.currentCanvas.offsetLeft;
		var mouseY = event.clientY - WBR.Canvas.currentCanvas.offsetTop;

		// Move the drawing pen to the position that was clicked
		WBR.Canvas.penDown(mouseX/WBR.Canvas.currentCanvas.width, mouseY/WBR.Canvas.currentCanvas.height);

		// We want mouse input to be used for drawing only, so we need to stop the 
		// browser from/ performing default mouse actions, such as text selection. 
		// In Internet Explorer, we "prevent default actions" by returning false. In 
		// other browsers, we invoke event.preventDefault().
		if (event.preventDefault) {
			if (event.target.nodeName != "SELECT") {
				event.preventDefault();
			}
		} 
		else {
			return false;  // IE
		}
	},



	// Triggered when the mouse moves
	pointerMoveListener: function(e) 
	{
		if (WBR.Canvas.hasTouch) {
			return;
		}

		var event = e || window.event; // IE uses window.event, not e
		var mouseX = event.clientX - WBR.Canvas.currentCanvas.offsetLeft;
		var mouseY = event.clientY - WBR.Canvas.currentCanvas.offsetTop;

		// Draw a line if the pen is down
		WBR.Canvas.penMove(mouseX/WBR.Canvas.currentCanvas.width, mouseY/WBR.Canvas.currentCanvas.height);

		if (event.preventDefault) {
			event.preventDefault();
		} 
		else {
			return false;  // IE
		}
	},



	// Triggered when the mouse button is released
	pointerUpListener: function(e) 
	{
		if (WBR.Canvas.hasTouch) {
			return;
		}
		
		WBR.Canvas.penUp();
	},



	thicknessSelectListener: function(e) 
	{
		// Determine which option was selected
		var newThickness = $('select#thickness').val();
		// Locally, set the line thickness to the selected value
		WBR.Canvas.localLineThickness = newThickness;
		// Share the selected thickness with other users by setting the client
		// attribute named "thickness". Attributes are automatically shared with other 
		// clients in the room, triggering clientAttributeUpdateListener(). 
		// Arguments for SET_CLIENT_ATTR are:
		//   clientID 
		//   userID (None in this case)
		//   attrName 
		//   escapedAttrValue
		//   attrScope (The room) 
		//   attrOptions (An integer whose bits specify options. "4" means 
		//                the attribute should be shared).
		WBR.Room.msgManager.sendUPC(WBR.Room.UPC.SET_CLIENT_ATTR, 
					WBR.Room.orbiter.getClientID(),
					"",
					WBR.Room.Attributes.THICKNESS,
					newThickness,
					WBR.roomID,
					"4");
		WBR.Room.addCacheCommand(WBR.Room.DrawingCommands.SET_THICKNESS, newThickness);
		// After the user selects a value in the drop-down menu, the iPhone
		// automatically scrolls the page, so scroll back to the top-left. 
		WBR.iPhoneToTop();
	},



	// Triggered when an option in the "line color" menu is selected
	colorSelectListener: function(e) 
	{
		// Determine which option was selected
		var newColor = $('select#color').val();
		// Locally, set the line color to the selected value
		WBR.Canvas.localLineColor = newColor;
		// Share selected color with other users
		WBR.Room.msgManager.sendUPC(WBR.Room.UPC.SET_CLIENT_ATTR, 
					WBR.Room.orbiter.getClientID(),
					"",
					WBR.Room.Attributes.COLOR,
					newColor,
					WBR.roomID,
					"4");
		WBR.Room.addCacheCommand(WBR.Room.DrawingCommands.SET_COLOR, newColor);
		// Scroll the iPhone back to the top-left. 
		WBR.iPhoneToTop();
	},


	drawLine: function(color, thickness, x1, y1, x2, y2) 
	{
		this.currentContext.strokeStyle = color;
		this.currentContext.lineWidth   = thickness;
		this.currentContext.beginPath();
		this.currentContext.moveTo(x1, y1)
		this.currentContext.lineTo(x2, y2);
		this.currentContext.stroke();
	},


	getValidThickness: function(value) 
	{
		value = parseInt(value);
		var thickness = isNaN(value) ? WBR.Canvas.defaultLineThickness : value;
		return Math.max(1, Math.min(thickness, WBR.Canvas.maxLineThickness));
	},


	penUp: function() {
		WBR.Canvas.isPenDown = false;
	},


	penDown: function(x, y) 
	{
		WBR.Canvas.isPenDown = true;
		WBR.Canvas.localPen.x = x*WBR.Canvas.currentCanvas.width;
		WBR.Canvas.localPen.y = y*WBR.Canvas.currentCanvas.height;

		// Send this user's new pen position to other users.
		WBR.Room.broadcastMove(x, y);

		// Begin sending this user's drawing path to other users every 500 milliseconds.
		WBR.Room.broadcastPathIntervalID = setInterval(WBR.Room.broadcastPath, 500);
	},


	// Draws a line if the pen is down.
	penMove: function(x, y) 
	{ 
		if (WBR.Canvas.isPenDown) {
			// Buffer the new position for broadcast to other users. Buffer a maximum
			// of 100 points per second.
			//if ((new Date().getTime() - WBR.Canvas.lastBufferTime) > 5) {
				WBR.Canvas.bufferedPath.push(x + "," + y);
				WBR.Canvas.totalPath.push(x+","+y);
				//WBR.Canvas.lastBufferTime = new Date().getTime();
			//}

			// Draw the line locally.
			WBR.Canvas.drawLine(WBR.Canvas.localLineColor, 
				WBR.Canvas.localLineThickness, 
				WBR.Canvas.localPen.x, 
				WBR.Canvas.localPen.y, x*WBR.Canvas.currentCanvas.width, y*WBR.Canvas.currentCanvas.height);

			// Move the pen to the end of the line that was just drawn.
			WBR.Canvas.localPen.x = x*WBR.Canvas.currentCanvas.width;
			WBR.Canvas.localPen.y = y*WBR.Canvas.currentCanvas.height;
		}
	},



})