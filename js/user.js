// each user hasd id and name



// class CommunicationObject 
WBR.UserController = Ember.ArrayController.create({
     content : [{name:"ajambrosino",id:"sda3", isSelected:true}],

})



WBR.ApplicationView = Ember.View.create({
      templateName: 'table'
})
