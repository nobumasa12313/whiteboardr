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
      broadcast:false,
      

      // Initialize the application
      init: function() {
            $('.question').hide();
            

            $('.modal').modal('hide');
            $('#login-modal').modal('show');    
            $('#video-chat').hide();
      },

      setDraw: function(isTouch) {
            if (WBR.Canvas.draw) return;
            WBR.Canvas.draw = true;

            $('#thickness').val(WBR.Canvas.lastThickness).trigger('onchange');
            $('#color').val(WBR.Canvas.lastColor).trigger('onchange');

            if(isTouch) {
                  $("#setDraw").addClass('active');
                  $("#setErase").removeClass('active');
            }
      },

      setErase: function(isTouch) {
            if (!WBR.Canvas.draw) return;
            WBR.Canvas.draw = false;

            WBR.Canvas.lastColor = $('#color').val();
            WBR.Canvas.lastThickness = $('#thickness').val();

            $('#thickness').val('20').trigger('onchange');
            $('#color').val('white').trigger('onchange');

            if(isTouch) {
                  $("#setDraw").removeClass('active');
                  $("#setErase").addClass('active');
            }
      },

      // Join the room
      joinRoom: function() {
            if (document.getElementById('input-room-id').value == "")
                  this.set('roomID', "public");
            else
                  this.set('roomID', document.getElementById('input-room-id').value);


            if (document.getElementById('input-nickname').value == "")
                  this.set('nickname', "anonymous");
            else
                  this.set('nickname', document.getElementById('input-nickname').value);


            

            this.Canvas.initialize();
            this.Room.initialize();
            this.iPhoneToTop();

            this.setStatus("connecting to whiteboardr...");
            $('#login-modal').modal("hide");
            $('.question').hide().fadeIn(1000);

            $(window).resize(function() {
                  WBR.Canvas.resizeCanvas();
            });

            document.title = "W | " + this.roomID;

            $('body').removeClass('not-logged-in');

      },


      enterJoinRoom: function(e) {
            
            if (event.which == 13) {
        event.preventDefault();
        WBR.joinRoom();
    }

      },

      enterQuestion: function(e) {


            if (event.which == 13) {
        event.preventDefault();
        WBR.submitQuestion();
    }
      },

      startBroadcast: function() {
            WBR.Room.startBroadcast();
            if (WBR.broadcast == false) {
                  $('#broadcaster').text("");
                  $('#broadcast').addClass("active");
                  WBR.set('broadcast', true);
            }
            else {
                  $('#broadcaster').text("");
                  $('#broadcast').removeClass("active");
                  WBR.set('broadcast', false);
            }
      },

      launchQuestionWindow: function() {
            $('#question-modal').modal('show');
      },

      submitQuestion: function() {
            $('#question-modal').modal('hide');
            WBR.Room.sendQuestion($('#input-question').val());
      },

      displayQuestion: function(string) {
            $('#question-text').text(string);
      },


      // Leave the room
      leaveRoom: function() {
            location.reload()
      },


      raiseHand: function() {
            if (WBR.handRaised) {
                  WBR.set('handRaised',false);
                  $('#raise-hand-text').text('Raise Hand');
                  WBR.Room.raiseHand(false);

            }

            else {
                  WBR.set('handRaised',true);
                  $('#raise-hand-text').text('Hand is Raised');
                  WBR.Room.raiseHand(true);
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


      startVideo: function() {
            $('#video-chat').hide().fadeIn();
      },

      stopVideo: function() {
            $('#video-chat').show().fadeOut();
      }

});






