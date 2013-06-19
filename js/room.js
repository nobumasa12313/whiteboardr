// class Question
WBR.Room = Ember.Object.create({

	connectedStudents: [],
	connectedAdmins: [],
	currentQuestion: null,
	

	// The Orbiter object, which is the root of Union's JavaScript client framework
	orbiter:null,

	// The MessageManager object, for sending and receiving messages
	msgManager: null,

	// A convenience reference to net.user1.orbiter.UPC, which provides a
	// list of valid client/server UPC messages. See: http://unionplatform.com/specs/upc/
	UPC : net.user1.orbiter.UPC,

	// A hash of client attribute names used in this application. Each client sets a
	// "thickness" attribute and a "color" attribute, specify the thickness and 
	// color of the current line being drawn.
	Attributes : { THICKNESS:"thickness", 
			   COLOR:"color"},

	// A hash of room message names used in this application. MOVE means move the
	// drawing pen to the specified position. PATH supplies a list of points to be
	// drawn.
	Messages : { MOVE:"MOVE", 
			 PATH:"PATH" },

	DrawingCommands : {LINE_TO:      "lineTo",
                       MOVE_TO:       "moveTo",
                       SET_THICKNESS: "setThickness",
                       SET_COLOR:     "setColor"},

	// The ID for a timer that sends the user's drawing path on a regular interval
	broadcastPathIntervalID: null,

	// The ID for a timer that executes drawing commands sent by remote users
	processDrawingCommandsIntervalID: null,



	// Initialize Orbiter, which handles multiuser communications
	initialize: function() 
	{
		// Create the Orbiter instance, used to connect to and communicate with Union
		WBR.Room.orbiter = new net.user1.orbiter.Orbiter();

		// If required JavaScript capabilities are missing, abort
		if (!WBR.Room.orbiter.getSystem().isJavaScriptCompatible()) {
			this.setStatus("Your browser is not supported.")
			return;
		}

		// Register for Orbiter's connection events
		WBR.Room.orbiter.addEventListener(net.user1.orbiter.OrbiterEvent.READY, this.readyListener, this);
		WBR.Room.orbiter.addEventListener(net.user1.orbiter.OrbiterEvent.CLOSE, this.closeListener, this);

		// Retrieve a reference to the MessageManager, used for sending messages to
		// and receiving messages from Union Server
		WBR.Room.msgManager = this.orbiter.getMessageManager();

		// Connect to Union Server (at the public testing site)
		WBR.Room.orbiter.connect("johnamoore.com", 9100);
	},



	// Triggered when the connection to Union Server is ready
	readyListener: function(e) 
	{
		// Register for UPC messages from Union Server
		WBR.Room.msgManager.addMessageListener(WBR.Room.UPC.JOINED_ROOM, this.joinedRoomListener, this);
		WBR.Room.msgManager.addMessageListener(WBR.Room.UPC.ROOM_OCCUPANTCOUNT_UPDATE, 
		WBR.Room.roomOccupantCountUpdateListener, this);  
		WBR.Room.msgManager.addMessageListener(WBR.Room.UPC.ROOM_SNAPSHOT, this.roomSnapshotListener, this);
		WBR.Room.msgManager.addMessageListener(WBR.Room.UPC.CLIENT_ATTR_UPDATE, this.clientAttributeUpdateListener, this);
		WBR.Room.msgManager.addMessageListener(WBR.Room.UPC.CLIENT_REMOVED_FROM_ROOM, this.clientRemovedFromRoomListener, this);

		// Register for custom messages from other users
		WBR.Room.msgManager.addMessageListener(WBR.Room.Messages.MOVE, this.moveMessageListener, this, [WBR.roomID]);
		WBR.Room.msgManager.addMessageListener(WBR.Room.Messages.PATH, this.pathMessageListener, this, [WBR.roomID]);

		// Create a room for the drawing app, then join it
		WBR.Room.msgManager.sendUPC(WBR.Room.UPC.CREATE_ROOM, WBR.roomID);
		WBR.Room.msgManager.sendUPC(WBR.Room.UPC.JOIN_ROOM, WBR.roomID);
	},



	// Triggered when the connection to Union Server is closed
	closeListener: function(e) 
	{
		WBR.setStatus("Disconnected from UnionDraw.");
		// Stop drawing content sent by other users
		clearInterval(WBR.Room.processDrawingCommandsIntervalID);
	},



	// Triggered when this client has joined the server-side drawing room
	joinedRoomListener: function(roomID) 
	{
		// Periodically execute drawing commands sent by other users
		WBR.Room.processDrawingCommandsIntervalID = setInterval(WBR.Room.processDrawingCommands, 20);
	},



	// Triggered when this client is informed that number of users in the 
	// server-side drawing room has changed
	roomOccupantCountUpdateListener: function(roomID, numOccupants) {
		WBR.Room.numOccupants = parseInt(numOccupants);
		if (numOccupants == 1) {
			WBR.setStatus("Now drawing on your own (no one else is here at the moment)");
		} else if (numOccupants == 2) {
			WBR.setStatus("Now drawing with " + (numOccupants-1) + " other person");
		} else {
			WBR.setStatus("Now drawing with " + (numOccupants-1) + " other people");
		}
	},




	//==============================================================================
	// HANDLE INCOMING CLIENT ATTRIBUTES
	//==============================================================================
	// Triggered when Union Server sends a "snapshot" describing the drawing room,
	// including a list of users supplied as unnamed arguments after the 
	// roomAttributes parameter. For a description of roomSnapshotListener()'s 
	// parameters, see "u54" in the UPC specification, 
	// at: http://unionplatform.com/specs/upc/. This client receives the room 
	// snapshot automatically when it the joins the drawing room.
	roomSnapshotListener: function(requestID,
						roomID,
						occupantCount,
						observerCount,
						roomAttributes)
	{
		// The unnamed arguments following 'roomAttributes' is a list of 
		// clients in the room. Assign that list to clientList. 
		var clientList = Array.prototype.slice.call(arguments).slice(5);
		WBR.Room.users = clientList;
		var clientID;
		var roomAttrString;
		var roomAttrs;
		var attrName;
		var attrVal;

		// Loop through the list of clients in the room to get each client's
		// "thickness" and "color" attributes.
		for (var i = 0; i < clientList.length; i+=5) {
			clientID = clientList[i];
			// Each client's room-scoped client attributes are passed as a 
			// pipe-delimited string. Split that string to get the attributes.
			clientAttrString = clientList[i+4];
			clientAttrs = clientAttrString == "" ? [] : clientAttrString.split("|");

			// Pass each client attribute to processClientAttributeUpdate(), which will
			// check for the "thickness" and "color" attributes.
			for (var j = 0; j < clientAttrs.length; j++) {
				attrName = clientAttrs[j];
				attrVal  = clientAttrs[j+1];
				WBR.Room.processClientAttributeUpdate(clientID, attrName, attrVal);
			}
		}
	},



	// Triggered when one of the clients in the drawing room changes an attribute
	// value. When an attribute value changes, check to see whether it was either 
	// the "thickness" attribute or the "color" attribute.
	clientAttributeUpdateListener: function(attrScope, 
								clientID,
								userID,
								attrName,
								attrVal,
								attrOptions) 
	{ 
		if (attrScope == WBR.roomID) {
			WBR.Room.processClientAttributeUpdate(clientID, attrName, attrVal);
		}
	},




	// Triggered when a clients leaves the drawing room.
	clientRemovedFromRoomListener: function(roomID, clientID) 
	{
		// The client is gone now, so remove all information pertaining to that client
		delete WBR.Canvas.userThicknesses[clientID];
		delete WBR.Canvas.userColors[clientID];
		delete WBR.Canvas.userCommands[clientID];
		delete WBR.Canvas.userCurrentPositions[clientID];
	},




	// Checks for changes to the the "thickness" and "color" attributes.
	processClientAttributeUpdate: function(clientID, attrName, attrVal) 
	{
		if (attrName == WBR.Room.Attributes.THICKNESS) {
			// The "thickness" attribute changed, so push a "set thickness" command
			// onto the drawing command stack for the specified client. But first, 
			// bring the thickness into legal range if necessary (prevents thickness hacking).
			WBR.Room.addDrawingCommand(clientID, WBR.Room.DrawingCommands.SET_THICKNESS, WBR.Canvas.getValidThickness(attrVal));
			} else if (attrName == WBR.Room.Attributes.COLOR) {
			// The "color" attribute changed, so push a "set color" command
			// onto the drawing command stack for the specified client
			WBR.Room.addDrawingCommand(clientID, WBR.Room.DrawingCommands.SET_COLOR, attrVal);
		}
	},



	//==============================================================================
	// HANDLE INCOMING CLIENT MESSAGES
	//==============================================================================
	// Triggered when a remote client sends a "MOVE" message to this client
	
	moveMessageListener: function(fromClientID, coordsString) {
		// Parse the specified (x, y) coordinate
		var coords = coordsString.split(",");
		var position = {x:parseInt(coords[0]), y:parseInt(coords[1])};
		// Push a "moveTo" command onto the drawing-command stack for the sender
		WBR.Room.addDrawingCommand(fromClientID, WBR.Room.DrawingCommands.MOVE_TO, position);
	},



	// Triggered when a remote client sends a "PATH" message to this client
	pathMessageListener: function(fromClientID, pathString) {
		// Parse the specified list of points
		var path = pathString.split(",");

		// For each point, push a "lineTo" command onto the drawing-command stack 
		// for the sender
		var position;
		for (var i = 0; i < path.length; i+=2) {
			position = {x:parseInt(path[i]), y:parseInt(path[i+1])};
			WBR.Room.addDrawingCommand(fromClientID, WBR.Room.DrawingCommands.LINE_TO, position);
		}
	},




	//==============================================================================
	// BROADCAST DRAWING DATA TO OTHER USERS
	//==============================================================================
	// Sends the local user's drawing-path information to other users in the 
	// drawing room.

	broadcastPath: function() 
	{
		// If there aren't any points buffered (e.g., if the pen is down but not
		// moving), then don't send the PATH message.
		if (WBR.Canvas.bufferedPath.length == 0) {
		return;
		}
		// Use SEND_MESSAGE_TO_ROOMS to deliver the message to all users in the room
		// Parameters are: messageName, WBR.roomID, includeSelf, filters, ...args. For
		// details, see http://unionplatform.com/specs/upc/.
		WBR.Room.msgManager.sendUPC(WBR.Room.UPC.SEND_MESSAGE_TO_ROOMS, 
					WBR.Room.Messages.PATH, 
					WBR.roomID, 
					"false", 
					"", 
					WBR.Canvas.bufferedPath.join(","));

		// Clear the local user's outgoing path data
		WBR.Canvas.bufferedPath = [];
		// If the user is no longer drawing, stop broadcasting drawing information
		if (!WBR.Canvas.isPenDown) {
			clearInterval(WBR.Room.broadcastPathIntervalID);
		}
	},



	// Sends all users in the drawing room an instruction to reposition the local
	// user's pen.
	broadcastMove: function(x, y) {
		WBR.Room.msgManager.sendUPC(WBR.Room.UPC.SEND_MESSAGE_TO_ROOMS, 
					WBR.Room.Messages.MOVE, 
					WBR.roomID, 
					"false", 
					"", 
					x + "," + y);
	},



	//==============================================================================
	// PROCESS DRAWING COMMANDS FROM OTHER USERS
	//==============================================================================
	// Pushes a drawing command onto the command stack for the specified client.
	// At a regular interval, commands are pulled off the stack and executed,
	// causing remote user's drawings to appear on-screen. 
	addDrawingCommand: function(clientID, commandName, arg) {
		// If this client does not yet have a command stack, make one. 
		if (WBR.Canvas.userCommands[clientID] == undefined) {
		WBR.Canvas.userCommands[clientID] = [];
		}
		// Push the command onto the stack.
		var command = {};
		command["commandName"] = commandName;
		command["arg"] = arg;
		WBR.Canvas.userCommands[clientID].push(command);
	},



	// Executes the oldest command on all user's command stacks
	processDrawingCommands: function() {
		var command;
		// Loop over all command stacks
		for (var clientID in WBR.Canvas.userCommands) {
			// Skip empty stacks
			if (WBR.Canvas.userCommands[clientID].length == 0) {
				continue;
			}

			// Execute the user's oldest command
			command = WBR.Canvas.userCommands[clientID].shift();

			switch (command.commandName) {
				case WBR.Room.DrawingCommands.MOVE_TO:
					WBR.Canvas.userCurrentPositions[clientID] = {x:command.arg.x, y:command.arg.y};
					break;

				case WBR.Room.DrawingCommands.LINE_TO:
					if (WBR.Canvas.userCurrentPositions[clientID] == undefined) {
						WBR.Canvas.userCurrentPositions[clientID] = {x:command.arg.x, y:command.arg.y};
					} else {
						WBR.Canvas.drawLine(WBR.Canvas.userColors[clientID] || "black", 
						WBR.Canvas.userThicknesses[clientID] || "black", 
						WBR.Canvas.userCurrentPositions[clientID].x, 
						WBR.Canvas.userCurrentPositions[clientID].y,
						command.arg.x, 
						command.arg.y);
						WBR.Canvas.userCurrentPositions[clientID].x = command.arg.x; 
						WBR.Canvas.userCurrentPositions[clientID].y = command.arg.y; 
						}
					break;

				case WBR.Room.DrawingCommands.SET_THICKNESS:
					WBR.Canvas.userThicknesses[clientID] = command.arg;
					break;

				case WBR.Room.DrawingCommands.SET_COLOR:
					WBR.Canvas.userColors[clientID] = command.arg;
					break;
			}

		}
	}

});