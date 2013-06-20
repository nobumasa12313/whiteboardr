// each user hasd id and name



// class CommunicationObject 
WBR.UserController = Ember.ArrayController.create({
     content : [{name:"ajambrosino",id:"sda3", tx:true}],

     

     setTx: function(e) {
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
          $('.user-cell').removeClass('enabled-user');
          $(e).addClass('enabled-user');
          WBR.Room.loadAdminCanvas(true);
     },

     setClientCanvasMy: function(e) {
          $('.user-cell').removeClass('enabled-user');
          $(e).addClass('enabled-user');
          WBR.Room.loadAdminCanvas(false);
     }

})

WBR.ApplicationView = Ember.View.create({
      templateName: 'table',

 
});