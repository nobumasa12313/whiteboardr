// WHITEBOARDR
// using jQuery
// using Ember
// using Bootstrap



// class Applicatiom
WBR = Ember.Application.create({

      roomID:"",
      nickname:"",
      admin:false,
      handRaised:false,
      

      // Initialize the application
      init: function() {
            $('.question').hide();
            $('.modal').modal('hide');
            $('#login-modal').modal('show');    
      },

      setDraw: function() {
            if (WBR.Canvas.draw) return;
            WBR.Canvas.draw = true;

            $('#thickness').val(WBR.Canvas.lastThickness).trigger('onchange');
            $('#color').val(WBR.Canvas.lastColor).trigger('onchange');
      },

      setErase: function() {
            if (!WBR.Canvas.draw) return;
            WBR.Canvas.draw = false;

            WBR.Canvas.lastColor = $('#color').val();
            WBR.Canvas.lastThickness = $('#thickness').val();

            $('#thickness').val('20').trigger('onchange');
            $('#color').val('white').trigger('onchange');
      },

      // Join the room
      joinRoom: function() {
            if (document.getElementById('input-room-id').value == "")
                  this.set('roomID', "whiteboardr.default");
            else
                  this.set('roomID', document.getElementById('input-room-id').value);

            this.set('nickname', document.getElementById('input-nickname').value);

            this.Canvas.initialize();
            this.Room.initialize();
            this.iPhoneToTop();

            this.setStatus("connecting to whiteboardr...");
            $('#login-modal').modal("hide");
            $('.question').hide().fadeIn(1000);

            $(window).resize(function() {
                  console.log('window resized');
            });

            document.title = "W | " + this.roomID;

      },


      launchQuestionWindow: function() {
            $('#question-modal').modal('show');
      },


      // Leave the room
      leaveRoom: function() {
            location.reload()
      },


      raiseHand: function() {
            if (WBR.handRaised) {
                  WBR.set('handRaised',false);
                  $('#raise-hand-text').text('Raise Hand');

            }

            else {
                  WBR.set('handRaised',true);
                  $('#raise-hand-text').text('Hand is Raised');
            }

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






