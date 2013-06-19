// each user hasd id and name



// class CommunicationObject 
WBR.UserController = Ember.ArrayController.create({
     content : [{name:"ajambrosino",id:"sda3", tx:true}],
})



WBR.ApplicationView = Ember.View.create({
      templateName: 'table'
})
