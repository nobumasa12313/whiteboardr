// each user hasd id and name



// class CommunicationObject 
WBR.UserController = Ember.ArrayController.create({
     content : [{name:"",id:"", tx:true}],

     

     setTx: function(e) {
      if (WBR.broadcast) return;
     	var id = $(e).find(".user-cell-id").text();
  		WBR.Room.setTx(id);
      console.log(id)


  		for (i = 0; i < this.content.length; i++) {
  			if (this.content[i].id == id)
  				this.content[i].tx = true;
  			else
  				this.content[i].tx = false;
  		}

  		$('.user-cell').removeClass('enabled-user');
  		$(e).addClass('enabled-user');
     },


     setClientCanvasPublic: function(e) {
      if (WBR.broadcast) return;
          $('.user-cell').removeClass('enabled-user');
          $(e).addClass('enabled-user');
          WBR.Room.loadAdminCanvas(true);
     },

     setClientCanvasMy: function(e) {
      if (WBR.broadcast) return;
          $('.user-cell').removeClass('enabled-user');
          $(e).addClass('enabled-user');
          WBR.Room.loadAdminCanvas(false);
     }

})

WBR.ApplicationView = Ember.View.create({
      templateName: 'table',

 
});