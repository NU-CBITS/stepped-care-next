//  Questions.Collections.js
//
//  Before this Dynamo Mantle File can be used, the following must be defined:
//    Core.Collections.js
//    Questions.Models.js

  QuestionGroupCollection = Dynamo.Collection.extend({

    model: QuestionGroupModel,
    codeCollectionName: "question_groups",
    prettyCollectionName: "Question Groups",

    comparator: function(qgroup) {
      return qgroup.get_field_value("title");
    },

    url: function() { return Dynamo.TriremeURL+'/xelements?filter={"latest.xelement_type":"question_group"}' }

  });

  QuestionCollection = Dynamo.QuestionCollection = Dynamo.Collection.extend({

    model: QuestionModel,
    codeCollectionName: "questions",
    prettyCollectionName: "Questions",

    url: function() { return Dynamo.TriremeURL+'/xelements?filter={"latest.xelement_type":"question"}' }

  });

  QuestionAboutDataCollection = Dynamo.Collection.extend({

    model: QuestionAboutDataModel,
    codeCollectionName: "questions_about_data",
    prettyCollectionName: "Questions",

    url: function() { return Dynamo.TriremeURL+'/xelements?filter={"latest.xelement_type":"question_about_data"}' }

  });  

  ResponseCollection = Dynamo.Collection.extend({

    model: ResponseModel,
    codeCollectionName: "responses",
    prettyCollectionName: "Responses"

  });

  ResponseValueCollection = Dynamo.Collection.extend({

    model: ResponseValueModel,
    codeCollectionName: "response_values",
    prettyCollectionName: "Response Values"

  });