// class Question
WBR.Question = Ember.Object.extend({
      name: "",
      type: "",
      options: "",
});



// class MultipleChoiceQuestion extends Question
WBR.MultipleChoiceQuestion = WBR.Question.extend({
      type: "multiple-choice"
});



// class OpenResponseQuestion extends Question
WBR.OpenResponseQuestion = WBR.Question.extend({
      type: "open-response"
});