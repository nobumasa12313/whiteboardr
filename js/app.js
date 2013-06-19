// WHITEBOARDR
// using jQuery
// using Ember
// using Bootstrap



// class Applicatiom
WBR = Ember.Application.create({
roomID:"",
      nickname:"anonymous",
      admin:"true",


      // Initialize the application
      init: function() {
            $('.question').hide();
            $('.modal').modal('hide');
            $('#login-modal').modal('show');
            
      },


      // Join the room
      joinRoom: function() {
            if (document.getElementById('input-room-id').value == "")
                  WBR.roomID = "whiteboardr.default";
            else
                  WBR.roomID = document.getElementById('input-room-id').value;

            this.nickname = document.getElementById('input-nickname').value;

            this.Canvas.initialize();
            this.Room.initialize();
            this.iPhoneToTop();

            this.setStatus("connecting to whiteboardr...");
            $('#login-modal').modal("hide");
            $('.question').hide().fadeIn(1000);
      },


      launchQuestionWindow: function() {
            $('#question-modal').modal('show');
      },


      // Leave the room
      leaveRoom: function() {
            location.reload()
      },


      // Do something to make iPhone look better
      iPhoneToTop: function() {
            if (navigator.userAgent.indexOf("iPhone") != -1) {
                  setTimeout (function () {
                        window.scroll(0, 0);
                  }, 100);
            }
      },


      // Set status/message information
      setStatus: function(message) {
            document.getElementById("status").innerHTML = message;
      },

});







