// class Question
WBR.Room = Ember.Object.create({

	connectedStudents: [],
	connectedAdmins: [],
	currentQuestion: null,
	// create our webrtc connection

    webrtc: (typeof WebRTC == 'undefined' ? undefined : new WebRTC({
    // the id/element dom element that will hold "our" video
    localVideoEl: 'localVideo',
    // the id/element dom element that will hold remote videos
    remoteVideosEl: 'remotes',
    // immediately ask for camera access
    autoRequestMedia: false,
    log: true
    })),

	// The Orbiter object, which is the root of Union's JavaScript client framework
	orbiter:null,

	// The MessageManager object, for sending and receiving messages
	msgManager: null,

	//Who is transmitting
	tx: 0,

	clients: [],

	mentor: 0,

	adminID: 0,

	admincanvas: false,

	currentquestion: '',

	dbg: null,

	conn: null,

	clientID: 0,

	// A convenience reference to net.user1.orbiter.UPC, which provides a
	// list of valid client/server UPC messages. See: http://unionplatform.com/specs/upc/
	UPC : net.user1.orbiter.UPC,

	// A hash of client attribute names used in this application. Each client sets a
	// "thickness" attribute and a "color" attribute, specify the thickness and 
	// color of the current line being drawn.
	Attributes : { THICKNESS:"thickness", 
			   COLOR:"color",
				NAME: "name",
				HAND: "hand"},

	// A hash of room message names used in this application. MOVE means move the
	// drawing pen to the specified position. PATH supplies a list of points to be
	// drawn.
	Messages : { MOVE:"MOVE", 
			 	PATH:"PATH",
				SETTX: "SETTX",
                SERIAL: "SERIAL",
            	CLEAR: "CLEAR",
            	QUESTION: "QUESTION"},

	DrawingCommands : {LINE_TO:      "lineTo",
                       MOVE_TO:       "moveTo",
                       SET_THICKNESS: "setThickness",
                       SET_COLOR:     "setColor",
                       CLEAR: "CLEAR"},

	// The ID for a timer that sends the user's drawing path on a regular interval
	broadcastPathIntervalID: null,

	// The ID for a timer that executes drawing commands sent by remote users
	processDrawingCommandsIntervalID: null,

	showvideo: false,



	// Initialize Orbiter, which handles multiuser communications
	initialize: function() 
	{
		alert("joining");
		WBR.Room.conn = new WebSocket('ws://54.200.154.131:80/' + WBR.roomID);
    	WBR.Room.conn.onmessage = function(e) { WBR.Room.processMsg(e.data) };

	},

	processMsg: function(data) {
		alert(data);
		response = JSON.parse(data);
		opcode = response['opcode'];
		WBR.Room.dbg = response;
		if (opcode == "connect") {
			WBR.Room.connectListener(response);
		} else if (opcode == "join") {
			WBR.Room.joinListener(response);
		} else if (opcode == "roomupdate") {
			WBR.Room.roomUpdateListener(response);
		}
	},

	connectListener: function(response) {
		if (response['rescode'] == "success") {
			sessiondata = {};
			sessiondata.opcode = "sessiondata";
			sessiondata.sessid = WBR.Room.readCookie('PHPSESSID');
			sessiondata.nickname = WBR.nickname;
			WBR.Room.conn.send(JSON.stringify(sessiondata));
		} else {
			//exception: connect failed
		}
	},

	joinListener: function(response) {
		if (response['rescode'] == "success") {
			//room joined
			WBR.Room.clientID = parseInt(response['id']);
			//WBR.Room.processDrawingCommandsIntervalID = setInterval(WBR.Room.processDrawingCommands, 20);
		} else {
			//exception: join failed
		}
	},

	roomUpdateListener: function(response) {
		numOccupants = parseInt(response['numOccupants']);
		WBR.Room.set('numOccupants', numOccupants);
		if (numOccupants == 1) {
			WBR.setStatus("Now drawing on your own (no one else is here at the moment)");
				if (typeof WebRTC != 'undefined' && webRTCSupport == true) {
			WBR.Room.stopVideo();
		}
		} else if (numOccupants == 2) {
			WBR.setStatus("Now drawing with " + (numOccupants-1) + " other person");
				if (typeof WebRTC != 'undefined' && webRTCSupport == true) {
			setTimeout("WBR.Room.startVideo()", 1000);
		}
			
		} else {
			WBR.setStatus("Now drawing with " + (numOccupants-1) + " other people");
				if (typeof WebRTC != 'undefined' && webRTCSupport == true) {
			WBR.Room.stopVideo();
		}
		}

	},


	readCookie: function(name) {
		var nameEQ = name + "=";
		var ca = document.cookie.split(';');
		for(var i=0;i < ca.length;i++) {
			var c = ca[i];
			while (c.charAt(0)==' ') c = c.substring(1,c.length);
			if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length,c.length);
		}
		return null;
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
 		WBR.Room.msgManager.addMessageListener(WBR.Room.UPC.CREATE_ROOM_RESULT, this.croomResult, this);

		// Register for custom messages from other users
		WBR.Room.msgManager.addMessageListener(WBR.Room.Messages.MOVE, this.moveMessageListener, this, [WBR.roomID]);
		WBR.Room.msgManager.addMessageListener(WBR.Room.Messages.PATH, this.pathMessageListener, this, [WBR.roomID]);
  WBR.Room.msgManager.addMessageListener(WBR.Room.Messages.SETTX, this.settxMessageListener, this, [WBR.roomID]);
 WBR.Room.msgManager.addMessageListener(WBR.Room.Messages.SERIAL, this.serialMessageListener, this, [WBR.roomID]);
WBR.Room.msgManager.addMessageListener(WBR.Room.Messages.CLEAR, this.clearMessageListener, this, [WBR.roomID]);
WBR.Room.msgManager.addMessageListener(WBR.Room.Messages.QUESTION, this.sendQuestionListener, this, [WBR.roomID]);

		// Create a room for the drawing app, then join it
		WBR.Room.msgManager.sendUPC(WBR.Room.UPC.CREATE_ROOM, WBR.roomID);
		WBR.Room.msgManager.sendUPC(WBR.Room.UPC.JOIN_ROOM, WBR.roomID);

		  //Set user's name
    WBR.Room.msgManager.sendUPC(WBR.Room.UPC.SET_CLIENT_ATTR, 
                     WBR.Room.orbiter.getClientID(),
                     "",
                     WBR.Room.Attributes.NAME,
                     WBR.nickname,
                     WBR.roomID,
                     "4");
	    			      var newThickness = $('select#thickness').val();
	      WBR.Room.addCacheCommand(WBR.Room.DrawingCommands.SET_THICKNESS, newThickness);
		  var newColor = $('select#color').val();
		  WBR.Room.addCacheCommand(WBR.Room.DrawingCommands.SET_COLOR, newColor);
		  		WBR.Room.msgManager.sendUPC(WBR.Room.UPC.SET_CLIENT_ATTR, 
					WBR.Room.orbiter.getClientID(),
					"",
					WBR.Room.Attributes.THICKNESS,
					newThickness,
					WBR.roomID,
					"4");
		  		WBR.Room.msgManager.sendUPC(WBR.Room.UPC.SET_CLIENT_ATTR, 
					WBR.Room.orbiter.getClientID(),
					"",
					WBR.Room.Attributes.COLOR,
					newColor,
					WBR.roomID,
					"4");
	},

croomResult: function(roomID, status) {
  if (status=="SUCCESS") { 
  	WBR.Room.tx = parseInt(WBR.Room.orbiter.clientID);
  	WBR.Room.admincanvas  = true;
  	WBR.Room.adminView = WBR.Room.orbiter.clientID;
  	WBR.Room.mentor=true;
  	WBR.Room.adminID = WBR.Room.orbiter.clientID;
  	WBR.set('admin', true);
  	WBR.Room.showvideo = true;
  	document.title = document.title + " (admin)";
  	setTimeout("WBR.Room.initRTC()", 1000);
  		    			      var newThickness = $('select#thickness').val();
	      WBR.Room.addCacheCommand(WBR.Room.DrawingCommands.SET_THICKNESS, newThickness);
		  var newColor = $('select#color').val();
      		        		  WBR.Room.addCacheCommand(WBR.Room.DrawingCommands.SET_COLOR, newColor);
  } else {
    WBR.Room.mentor = false;
  }
},
initRTC: function() {
  	if (typeof WebRTC != 'undefined' && webRTCSupport == true) {
  	WBR.Room.webrtc.startLocalVideo();


    	if (!(WBR.Room.webrtc.localStream && WBR.Room.webrtc.sessionReady)) {
    		WBR.Room.webrtc.on('readyToCall', function () {
    		WBR.Room.webrtc.createRoom(WBR.roomID, function (err, name) {});
    		});
    	} else {
			WBR.Room.webrtc.createRoom(WBR.roomID, function (err, name) {});
    	}
  	        }
},


settxMessageListener: function(fromClientID, datastr) {
  //alert(datastr);
  WBR.Room.adminID = fromClientID;
    WBR.Room.tx = parseInt(datastr);
    if (WBR.Room.tx == WBR.Room.orbiter.clientID) {
      //We're the tx!
      WBR.Room.transmitSerial();
    }
},

serialMessageListener: function(fromClientID, datastr) {

  if (WBR.Room.tx == fromClientID && WBR.Room.adminID == WBR.Room.orbiter.clientID) {
  	WBR.Canvas.currentCanvas.getContext('2d').clearRect(0, 0, WBR.Canvas.currentCanvas.width, WBR.Canvas.currentCanvas.height);
    WBR.Room.loadCanvas(JSON.parse(datastr));
  }
  if (fromClientID == WBR.Room.adminID && WBR.Room.admincanvas == true) {
  	WBR.Canvas.currentCanvas.getContext('2d').clearRect(0, 0, WBR.Canvas.currentCanvas.width, WBR.Canvas.currentCanvas.height);
    WBR.Room.loadCanvas(JSON.parse(datastr));
    if (WBR.Canvas.adminCommandCache.length == 0) {
    	WBR.Canvas.adminCommandCache = JSON.parse(datastr);
    }
  } else if (fromClientID == WBR.Room.adminID) {
    //if (WBR.Canvas.adminCommandCache.length == 0) {
    	WBR.Canvas.adminCommandCache = JSON.parse(datastr);
    //}  	
  }
},
clearMessageListener: function(fromClientID, datastr) {
	WBR.Room.addDrawingCommand(fromClientID, WBR.Room.DrawingCommands.CLEAR, true);


	//var cid = parseInt(datastr);
	//if (WBR.Room.tx == WBR.Room.adminID) {
//		if (WBR.Room.admincanvas == true) {
//		WBR.Canvas.currentCanvas.getContext('2d').clearRect(0, 0, WBR.Canvas.currentCanvas.width, WBR.Canvas.currentCanvas.height);
//		}
//		WBR.Canvas.adminCommandCache = {};
//	} else 
},
setTx: function(txn) {
	if (txn == WBR.Room.tx) {
		return;
	}
	if (txn != WBR.Room.adminID) {
		WBR.Room.admincanvas = false;
	} else {
		WBR.Room.admincanvas = true;
	}
  WBR.Room.tx=txn;
  WBR.Canvas.currentCanvas.getContext('2d').clearRect(0, 0, WBR.Canvas.currentCanvas.width, WBR.Canvas.currentCanvas.height);
  if (txn == WBR.Room.orbiter.clientID) {
    WBR.Room.loadCanvas(WBR.Canvas.userCommandCache);
  }
  for (var j = 0; j < WBR.Room.clients.length; j++) {
  		if(WBR.Room.clients[j].id == txn) {
  			WBR.Room.clients[j].tx = true;
  		} else {
  			WBR.Room.clients[j].tx = false;
  		}
  }
        WBR.Room.msgManager.sendUPC(WBR.Room.UPC.SEND_MESSAGE_TO_ROOMS, 
                     WBR.Room.Messages.SETTX, 
                     WBR.roomID, 
                     "false", 
                     "", 
                     txn);
      
},

sendQuestion: function(qstr) {
	        WBR.Room.msgManager.sendUPC(WBR.Room.UPC.SEND_MESSAGE_TO_ROOMS, 
                     WBR.Room.Messages.QUESTION, 
                     WBR.roomID, 
                     "false", 
                     "", 
                     qstr);
	        WBR.displayQuestion(qstr);

},

sendQuestionListener: function(fromClientID, qstr) {
	WBR.displayQuestion(qstr);
	WBR.Room.currentquestion = qstr;
},
//

loadAdminCanvas: function(admincanvas) {
	if (admincanvas) {
		WBR.Room.loadCanvas(WBR.Canvas.adminCommandCache);
		WBR.Room.admincanvas  = true;
	} else {
		WBR.Room.loadCanvas(WBR.Canvas.userCommandCache);
		WBR.Room.admincanvas  = false;
	}
},
loadCanvas: function(canvasorig){
	var canvasdata = JSON.parse(JSON.stringify(canvasorig));
  //alert('recv:'+canvasdata.toString());

//  for (var i = 0; i < canvasdata.length; i+=1) {
//WBR.Room.pathMessageListener(WBR.Room.tx, canvasdata[i]);
WBR.Canvas.currentCanvas.getContext('2d').clearRect(0, 0, WBR.Canvas.currentCanvas.width, WBR.Canvas.currentCanvas.height);
var command;
		// Loop over all command stacks
		for (var clientID in canvasdata) {
			// Skip empty stacks
			if (canvasdata[clientID].length == 0) {
				continue;
			}
			while (canvasdata[clientID].length > 0) {
			// Execute the user's oldest command
			command = canvasdata[clientID].shift();
      if (WBR.Room.orbiter.clientID == WBR.Room.adminID && WBR.admincanvas == true) {
      WBR.Canvas.userCommandCache[clientID].push(command);
    }
			switch (command.commandName) {
				case WBR.Room.DrawingCommands.MOVE_TO:
					WBR.Canvas.userCurrentPositions[clientID] = {x:command.arg.x*WBR.Canvas.currentCanvas.width, y:command.arg.y*WBR.Canvas.currentCanvas.height};
					break;

				case WBR.Room.DrawingCommands.LINE_TO:
					if (WBR.Canvas.userCurrentPositions[clientID] == undefined) {
						WBR.Canvas.userCurrentPositions[clientID] = {x:command.arg.x*WBR.Canvas.currentCanvas.width, y:command.arg*WBR.Canvas.currentCanvas.height};
					} else {
						WBR.Canvas.drawLine(WBR.Canvas.userColors[clientID] || "black", 
						WBR.Canvas.userThicknesses[clientID] || "black", 
						WBR.Canvas.userCurrentPositions[clientID].x, 
						WBR.Canvas.userCurrentPositions[clientID].y,
						command.arg.x*WBR.Canvas.currentCanvas.width, 
						command.arg.y*WBR.Canvas.currentCanvas.height);
						WBR.Canvas.userCurrentPositions[clientID].x = command.arg.x*WBR.Canvas.currentCanvas.width; 
						WBR.Canvas.userCurrentPositions[clientID].y = command.arg.y*WBR.Canvas.currentCanvas.height; 
						}
					break;

				case WBR.Room.DrawingCommands.SET_THICKNESS:
					WBR.Canvas.userThicknesses[clientID] = command.arg;
					break;

				case WBR.Room.DrawingCommands.SET_COLOR:
					WBR.Canvas.userColors[clientID] = command.arg;
					break;
				case WBR.Room.DrawingCommands.CLEAR:
					WBR.Canvas.currentCanvas.getContext('2d').clearRect(0, 0, WBR.Canvas.currentCanvas.width, WBR.Canvas.currentCanvas.height);
					break;
			}
}
		}

//while (WBR.Canvas.userCommands.length > 0) {
//  WBR.Room.processDrawingCommands();
//}
},

raiseHand: function(handraised) {
    WBR.Room.msgManager.sendUPC(WBR.Room.UPC.SET_CLIENT_ATTR, 
                     WBR.Room.orbiter.getClientID(),
                     "",
                     WBR.Room.Attributes.HAND,
                     handraised,
                     WBR.roomID,
                     "4");
},

transmitSerial: function() {
//alert('tx:'+JSON.stringify(totalPath));
WBR.Room.msgManager.sendUPC(WBR.Room.UPC.SEND_MESSAGE_TO_ROOMS, 
                     WBR.Room.Messages.SERIAL, 
                     WBR.roomID, 
                     "false", 
                     "", 
                     JSON.stringify(WBR.Canvas.userCommandCache)); //totalPath
},
roomResult:function(roomID, attrName, status) {

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

	startVideo: function() {

    if (WBR.roomID && WBR.Room.orbiter.clientID != WBR.Room.adminID && WBR.Room.showvideo == false) { 
    	WBR.Room.webrtc.startLocalVideo();
    	if (!(WBR.Room.webrtc.localStream && WBR.Room.webrtc.sessionReady)) {
    		WBR.Room.webrtc.on('readyToCall', function () {
    		WBR.Room.webrtc.joinRoom(WBR.roomID);
    		});
    	} else {
			WBR.Room.webrtc.joinRoom(WBR.roomID);
    	}

    	WBR.Room.showvideo = true; 
    }

		WBR.startVideo();

	},
	stopVideo: function() {
		if (WBR.Room.showvideo == true && WBR.Room.adminID != WBR.Room.orbiter.clientID) {
			WBR.Room.webrtc.leaveRoom();
		}

		WBR.stopVideo();
	},

	// Triggered when this client is informed that number of users in the 
	// server-side drawing room has changed
	roomOccupantCountUpdateListener: function(roomID, numOccupants) {
		WBR.Room.set('numOccupants', parseInt(numOccupants));
		if (numOccupants == 1) {
			WBR.setStatus("Now drawing on your own (no one else is here at the moment)");
				if (typeof WebRTC != 'undefined' && webRTCSupport == true) {
			WBR.Room.stopVideo();
		}
		} else if (numOccupants == 2) {
			WBR.setStatus("Now drawing with " + (numOccupants-1) + " other person");
				if (typeof WebRTC != 'undefined' && webRTCSupport == true) {
			setTimeout("WBR.Room.startVideo()", 1000);
		}
			
		} else {
			WBR.setStatus("Now drawing with " + (numOccupants-1) + " other people");
				if (typeof WebRTC != 'undefined' && webRTCSupport == true) {
			WBR.Room.stopVideo();
		}
		}

		WBR.Room.msgManager.sendUPC(WBR.Room.UPC.GET_ROOM_SNAPSHOT, 1, WBR.roomID);
      if (WBR.Room.mentor) {
        //alert("setting to " + tx)
        	    			      var newThickness = $('select#thickness').val();
	      //WBR.Room.addCacheCommand(WBR.Room.DrawingCommands.SET_THICKNESS, newThickness);
		  var newColor = $('select#color').val();
      		//        		  WBR.Room.addCacheCommand(WBR.Room.DrawingCommands.SET_COLOR, newColor);

      WBR.Room.msgManager.sendUPC(WBR.Room.UPC.SEND_MESSAGE_TO_ROOMS, 
                     WBR.Room.Messages.SETTX, 
                     WBR.roomID, 
                     "false", 
                     "", 
                     WBR.Room.tx);
      	WBR.Room.transmitSerial();
      		        WBR.Room.msgManager.sendUPC(WBR.Room.UPC.SEND_MESSAGE_TO_ROOMS, 
                     WBR.Room.Messages.QUESTION, 
                     WBR.roomID, 
                     "false", 
                     "", 
                     WBR.Room.currentquestion);
      		        		  		WBR.Room.msgManager.sendUPC(WBR.Room.UPC.SET_CLIENT_ATTR, 
					WBR.Room.orbiter.getClientID(),
					"",
					WBR.Room.Attributes.THICKNESS,
					newThickness,
					WBR.roomID,
					"4");
		  		WBR.Room.msgManager.sendUPC(WBR.Room.UPC.SET_CLIENT_ATTR, 
					WBR.Room.orbiter.getClientID(),
					"",
					WBR.Room.Attributes.COLOR,
					newColor,
					WBR.roomID,
					"4");


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
  var clientID;
  var roomAttrString;
  var roomAttrs;
  var attrName;
  var attrVal;
  WBR.Room.clients = [];
  
  // Loop through the list of clients in the room to get each client's
  // "thickness" and "color" attributes.
  for (var i = 0; i < clientList.length; i+=5) {
    clientID = clientList[i];
    // Each client's room-scoped client attributes are passed as a 
    // pipe-delimited string. Split that string to get the attributes.
    clientAttrString = clientList[i+4];
    clientAttrs = clientAttrString == "" ? [] : clientAttrString.split("|");
    WBR.Room.clients[i/5] = {id: clientID, name: "unknown", tx:false, admin:false, raisedHand: false};
    // Pass each client attribute to processClientAttributeUpdate(), which will
    // check for the "thickness" and "color" attributes.
    for (var j = 0; j < clientAttrs.length; j++) {
      attrName = clientAttrs[j];
      attrVal  = clientAttrs[j+1];
      WBR.Room.processClientAttributeUpdate(clientID, attrName, attrVal);
      if (attrName == WBR.Room.Attributes.NAME) {
        WBR.Room.clients[i/5]['name'] = attrVal;
      }
      if (attrName == WBR.Room.Attributes.HAND) {
      	WBR.Room.clients[i/5]['raisedHand'] = attrVal;
      }
    }
    if (clientID == WBR.Room.orbiter.clientID) {
        WBR.Room.clients[i/5]['name'] = WBR.nickname;
    }
    if (clientID == WBR.Room.tx) {
    	WBR.Room.clients[i/5]['tx'] = true;
    }
    if (clientID == WBR.Room.adminID) {
    	WBR.Room.clients[i/5]['admin'] = true;
    	temp = JSON.parse(JSON.stringify(WBR.Room.clients[0]));
    	WBR.Room.clients[0] = WBR.Room.clients[i/5];
    	WBR.Room.clients[i/5] = temp;
    }
  }
  WBR.UserController.set('content', WBR.Room.clients);
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

clientAttributeUpdateListener: function(attrScope, 
                                        clientID,
                                        userID,
                                        attrName,
                                        attrVal,
                                        attrOptions) { 
  if (attrScope == WBR.roomID) {
    WBR.Room.processClientAttributeUpdate(clientID, attrName, attrVal);
  }
},


	// Checks for changes to the the "thickness" and "color" attributes.
	processClientAttributeUpdate: function(clientID, attrName, attrVal) 
	{
		if (attrName == WBR.Room.Attributes.THICKNESS) {
			// The "thickness" attribute changed, so push a "set thickness" command
			// onto the drawing command stack for the specified client. But first, 
			// bring the thickness into legal range if necessary (prevents thickness hacking).
			WBR.Room.addDrawingCommand(clientID, WBR.Room.DrawingCommands.SET_THICKNESS, attrVal);

			} else if (attrName == WBR.Room.Attributes.COLOR) {
			// The "color" attribute changed, so push a "set color" command
			// onto the drawing command stack for the specified client
			WBR.Room.addDrawingCommand(clientID, WBR.Room.DrawingCommands.SET_COLOR, attrVal);
		} else if (attrName == WBR.Room.Attributes.HAND) {
			temp = JSON.parse(JSON.stringify(WBR.Room.clients));
		for (var j = 0; j < WBR.Room.clients.length; j++) {
			if (temp[j]['id'] == clientID) {
      			temp[j].raisedHand = (attrVal == "true");
      	}
      }
      
      WBR.Room.clients = JSON.parse(JSON.stringify(temp));
      WBR.UserController.set('content', WBR.Room.clients);
        }
		
	},



	//==============================================================================
	// HANDLE INCOMING CLIENT MESSAGES
	//==============================================================================
	// Triggered when a remote client sends a "MOVE" message to this client
	
	moveMessageListener: function(fromClientID, coordsString) {
		// Parse the specified (x, y) coordinate
		var coords = coordsString.split(",");
		var position = {x:parseFloat(coords[0]), y:parseFloat(coords[1])};
  // Push a "moveTo" command onto the drawing-command stack for the sender
  if (fromClientID == WBR.Room.tx || fromClientID == WBR.Room.adminID) {
  WBR.Room.addDrawingCommand(fromClientID, WBR.Room.DrawingCommands.MOVE_TO, position); }
	},



	// Triggered when a remote client sends a "PATH" message to this client
	pathMessageListener: function(fromClientID, pathString) {
		// Parse the specified list of points
		var path = pathString.split(",");

		// For each point, push a "lineTo" command onto the drawing-command stack 
		// for the sender
  if (fromClientID == WBR.Room.tx || fromClientID == WBR.Room.adminID) {
  var position;
  for (var i = 0; i < path.length; i+=2) {
    position = {x:parseFloat(path[i]), y:parseFloat(path[i+1])};
    WBR.Room.addDrawingCommand(fromClientID, WBR.Room.DrawingCommands.LINE_TO, position);
  }
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
		 if (WBR.Room.tx == WBR.Room.orbiter.clientID || WBR.Room.orbiter.clientID == WBR.Room.adminID) {
		WBR.Room.msgManager.sendUPC(WBR.Room.UPC.SEND_MESSAGE_TO_ROOMS, 
					WBR.Room.Messages.PATH, 
					WBR.roomID, 
					"false", 
					"", 
					WBR.Canvas.bufferedPath.join(","));
		}
		var path = WBR.Canvas.bufferedPath.join(",").split(",");

		// For each point, push a "lineTo" command onto the drawing-command stack 
		// for the sender

  var position;
  for (var i = 0; i < path.length; i+=2) {
    position = {x:parseFloat(path[i]), y:parseFloat(path[i+1])};
    WBR.Room.addCacheCommand(WBR.Room.DrawingCommands.LINE_TO, position);
  
}

		// Clear the local user's outgoing path data
		WBR.Canvas.bufferedPath = [];
		// If the user is no longer drawing, stop broadcasting drawing information
		if (!WBR.Canvas.isPenDown) {
			clearInterval(WBR.Room.broadcastPathIntervalID);
		}
	},



	// Sends all users in the drawing room an instruction to reposition the local
	// user's pen.
	broadcastMove: function(ux, uy) {
	//	if (WBR.Room.tx == WBR.Room.orbiter.clientID || WBR.Room.orbiter.clientID == WBR.Room.orbiter.adminID) {
		WBR.Room.msgManager.sendUPC(WBR.Room.UPC.SEND_MESSAGE_TO_ROOMS, 
					WBR.Room.Messages.MOVE, 
					WBR.roomID, 
					"false", 
					"", 
					ux + "," + uy);
		var position = {x:ux, y:uy};
	//}
		WBR.Room.addCacheCommand(WBR.Room.DrawingCommands.MOVE_TO, position);
	},

	addCacheCommand: function(commandName, arg) {

		if (WBR.Canvas.userCommandCache[WBR.Room.orbiter.clientID] == undefined) {
			WBR.Canvas.userCommandCache[WBR.Room.orbiter.clientID] = [];
		}
		// Push the command onto the stack.
		var command = {};
		command["commandName"] = commandName;
		command["arg"] = arg;
		if (WBR.Room.orbiter.clientID == WBR.Room.adminID && WBR.Room.admincanvas == false) {

if ((commandName == WBR.Room.DrawingCommands.SET_COLOR || commandName == WBR.Room.DrawingCommands.SET_THICKNESS)) {
WBR.Canvas.userCommandCache[WBR.Room.orbiter.clientID].push(command);
}
		} else {
		WBR.Canvas.userCommandCache[WBR.Room.orbiter.clientID].push(command);
	}
	},

	//==============================================================================
	// PROCESS DRAWING COMMANDS FROM OTHER USERS
	//==============================================================================
	// Pushes a drawing command onto the command stack for the specified client.
	// At a regular interval, commands are pulled off the stack and executed,
	// causing remote user's drawings to appear on-screen. 
	addDrawingCommand: function(clientID, commandName, arg) {
		if (WBR.Room.adminID == 0) {
			WBR.Room.adminID = clientID;
		}
		// If this client does not yet have a command stack, make one. 
		if (WBR.Canvas.userCommands[clientID] == undefined) {
		WBR.Canvas.userCommands[clientID] = [];
		}
		if (WBR.Canvas.adminCommandCache[clientID] == undefined) {
		WBR.Canvas.adminCommandCache[clientID] = [];
		}
				if (WBR.Canvas.userCommandCache[clientID] == undefined) {
		WBR.Canvas.userCommandCache[clientID] = [];
		}
		// Push the command onto the stack.
		var command = {};
		command["commandName"] = commandName;
		command["arg"] = arg;
		if ((clientID == WBR.Room.adminID && WBR.Room.tx == WBR.Room.adminID)) {
			WBR.Canvas.adminCommandCache[clientID].push(command);
			if (WBR.Room.admincanvas == true) {
				WBR.Canvas.userCommands[clientID].push(command);
			}if ((commandName == WBR.Room.DrawingCommands.SET_COLOR || commandName == WBR.Room.DrawingCommands.SET_THICKNESS)) {
WBR.Canvas.userCommandCache[clientID].push(command);
if (WBR.Room.admincanvas == false) {
WBR.Canvas.userCommands[clientID].push(command);
}
}
		} else if (clientID == WBR.Room.adminID && WBR.Room.tx == WBR.Room.orbiter.clientID) {
				if (WBR.Room.admincanvas == false){
				WBR.Canvas.userCommands[clientID].push(command);
			}
			
WBR.Canvas.userCommandCache[clientID].push(command);	
if ((commandName == WBR.Room.DrawingCommands.SET_THICKNESS || commandName == WBR.Room.DrawingCommands.SET_COLOR)) {
WBR.Canvas.adminCommandCache[clientID].push(command);
			if (WBR.Room.admincanvas == true) {
				WBR.Canvas.userCommands[clientID].push(command);
			}
}

		} else if (WBR.Room.orbiter.clientID == WBR.Room.adminID && WBR.Room.tx == clientID) {
			WBR.Canvas.userCommands[clientID].push(command);
		} else  if (clientID == WBR.Room.adminID && WBR.Room.tx == WBR.Room.adminID) {
			if (WBR.Room.admincanvas == false) {
				WBR.Canvas.adminCommandCache[clientID].push(command);
			}
		} else if ((commandName == WBR.Room.DrawingCommands.SET_COLOR || commandName == WBR.Room.DrawingCommands.SET_THICKNESS)) {
			if(clientID == WBR.Room.adminID) {
WBR.Canvas.userCommandCache[clientID].push(command);
WBR.Canvas.adminCommandCache[clientID].push(command);
		}
		}
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
					WBR.Canvas.userCurrentPositions[clientID] = {x:command.arg.x*WBR.Canvas.currentCanvas.width, y:command.arg.y*WBR.Canvas.currentCanvas.height};
					break;

				case WBR.Room.DrawingCommands.LINE_TO:
					if (WBR.Canvas.userCurrentPositions[clientID] == undefined) {
						WBR.Canvas.userCurrentPositions[clientID] = {x:command.arg.x*WBR.Canvas.currentCanvas.width, y:command.arg*WBR.Canvas.currentCanvas.height};
					} else {
						WBR.Canvas.drawLine(WBR.Canvas.userColors[clientID] || "black", 
						WBR.Canvas.userThicknesses[clientID] || "black", 
						WBR.Canvas.userCurrentPositions[clientID].x, 
						WBR.Canvas.userCurrentPositions[clientID].y,
						command.arg.x*WBR.Canvas.currentCanvas.width, 
						command.arg.y*WBR.Canvas.currentCanvas.height);
						WBR.Canvas.userCurrentPositions[clientID].x = command.arg.x*WBR.Canvas.currentCanvas.width; 
						WBR.Canvas.userCurrentPositions[clientID].y = command.arg.y*WBR.Canvas.currentCanvas.height; 
						}
					break;

				case WBR.Room.DrawingCommands.SET_THICKNESS:
					WBR.Canvas.userThicknesses[clientID] = command.arg;
					break;

				case WBR.Room.DrawingCommands.SET_COLOR:
					WBR.Canvas.userColors[clientID] = command.arg;
					break;

				case WBR.Room.DrawingCommands.CLEAR:
					WBR.Canvas.currentCanvas.getContext('2d').clearRect(0, 0, WBR.Canvas.currentCanvas.width, WBR.Canvas.currentCanvas.height);
					break;
			}

		}
	}

});