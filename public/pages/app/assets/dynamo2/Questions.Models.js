//Before this Dynamo Mantle File can be used, the following must be defined:
//
// Dynamo.XelementClass (set by the developer before any mantle files)

QuestionGroupModel = Dynamo.QuestionGroupModel = Dynamo.XelementClass.extend({

  // Values:
  codeName: "question_group",
  prettyName: "Question Group",

  // Functions:
  initialize: function () {
    _.bindAll(this);
    var self = this, question_ids, question_models;

    this.initAsXelement();
    this.set_field_value('xelement_type', 'question_group');
    this.metadata = new Backbone.Model(this.getMetadata());
    this.metadata.on('all', this.setUnsavedChanges);

    // Create a collection of questions based on the
    // array of guids a question_group has in its metacontent.
    try {
      question_ids =  JSON.parse( this.get_field_value("required_xelement_ids") )
    }
    catch (e) {
      question_ids = this.get_field_value("required_xelement_ids");
    };

    question_models = _.map( question_ids, function(id) { return QUESTIONS.get(id) });

    self.questions = new QuestionCollection(question_models);
    this.questions.on('add',    this.setUnsavedChanges);
    this.questions.on('remove', this.setUnsavedChanges);

    //  Saving a question group should save both the QuestionGroup and
    //  All member questions;
    //  Achieve this by...
    //  Storing original save function, then defining a new one.
    //  new save function saves composite questions;
    //  On the sync of those questions w/ the server,
    //  then save this questionGroup.
    //  WARNING - The format of this override breaks the ability to pass variables to save
    //  i.e., save is expected to be called without any arguments for QuestionGroups
    this.saveQuestionGroup = this.save;

    this.save = function() {
      this.saveQuestions();
      if (this.questions.length == 0) {
        this.updateSelfAndSave();
      };
    };

    this.questions.on('sync', this.updateSelfAndSave);

  },

  //defaultSelectNext
  //When taking an assessment it will be possible that a
  //question group specify some sort of CAT-like algorithm
  //(probably as part of its metadata) to calculate what question
  //in the group the responder should be shown next.
  //
  //To allow for this, we define the following such method as a default and
  //possible first attempt at specifying the function signature
  //for such methods in general.
  //In the general case, the selectNext method would expect:
  //
  //  1) a question_group,
  //  2) an array of answered question_ids, and
  //  3) a DataModel object which stores a set of user-given answers to those answered questions.
  //
  //It should return:
  //  The id of the next question that the user should be presented.
  //
  //This default implementation simply selects the next question (based upon index)
  //in the array of a question group's 'questions' attribute.
  defaultSelectNext: function(qg, answered_question_ids, responseData) {
    console.log("In defaultSelectNext. (qg, answered_question_ids, responseData):");
    console.log(qg);
    console.log(answered_question_ids);
    console.log(responseData);
    if (qg.questions.length == 0) {
      // alert("it seems to be the case that assessment '"+qg.id+"' has no questions.");
      return 0;
    };
    var next_q = qg.questions.at(answered_question_ids.length);
    return next_q.id;
  },

  getMetadata: function() {
    return this.metacontent().metadata
  },

  defaults: function() {
    var d = this.defaultsFor('question_group');
    d.xel_data_values.title = "Assessment";
    return d;
  },

  // Should not have to call directly;
  // called when overridden save function is called.
  saveQuestions: function (argument) {
    this.questions.invoke('save');
  },

  updateMetadata: function() {
    var mc = this.metacontent();
    mc.metadata = this.metadata.toJSON();
    return this.set_field_value('metacontent_external', mc);
  },

  updateQuestions: function() {
    this.set_field_value('required_xelement_ids', (_.compact(this.questions.pluck("guid"))) );
  },

  // Shouldn't have to call this method directly,
  // Instead, called when the questions collection syncs.
  updateSelfAndSave: function() {
    this.updateMetadata();
    this.updateQuestions();
    this.saveQuestionGroup();
  },

  urlRoot: function() { return Dynamo.TriremeURL+'/xelements' }

});

QuestionModel = Dynamo.QuestionModel = Dynamo.XelementClass.extend({
  //values:
  codeName: "question",
  prettyName: "Question",
  //functions:
  initialize: function () {
    _.bindAll(this);
    this.initAsXelement();
    this.set_field_value('xelement_type', 'question');
    this.contentModel = new Backbone.Model({ content: this.getContent() });
    this.contentModel.on('all', this.updateContent);
    this.metaContent = new Backbone.Model(this.getMetaContent());
    this.metaContent.on('all', this.updateMetaContent);
    this.responses = new ResponseCollection(this.getResponses());
    this.responses.on('all', this.updateResponses);
  },

  defaults: function() {
    return this.defaultsFor('question');
  },

  getContent: function () {
    return this.get_field_value('content');
  },

  updateContent: function(new_content) {
    return this.set_field_value('content', this.contentModel.get('content') );
  },

  getMetaContent: function () {
    return this.metacontent().metaContent
  },

  updateMetaContent: function () {
    var mc = this.metacontent();
    mc.metaContent = this.metaContent.toJSON();
    return this.set_field_value('metacontent_external', mc);
  },

  getResponses: function () {
    return this.metacontent().responseGroup;
  },

  updateResponses: function () {
    var mc = this.metacontent();
    mc.responseGroup = this.responses.toJSON();
    return this.set_field_value('metacontent_external', mc);
  },

  urlRoot: function() { return Dynamo.TriremeURL+'/xelements' },


  viewClass: function() { return showQuestionView; },

  editViewClass: function() { return editQuestionView; }

});

QuestionAboutDataModel = Dynamo.QuestionAboutDataModel = Dynamo.XelementClass.extend({
  //values:
  codeName: "question_about_data",
  prettyName: "Question",
  //functions:
  initialize: function () {
    _.bindAll(this);
    this.initAsXelement();
    this.set_field_value('xelement_type', 'question_about_data');
    this.contentModel = new Backbone.Model({ content: this.getContent() });
    this.contentModel.on('all', this.updateContent);
  },

  defaults: function() {
    return this.defaultsFor('question');
  },

  getContent: function () {
    return this.get_field_value('content');
  },

  updateContent: function(new_content) {
    return this.set_field_value('content', this.contentModel.get('content') );
  },

  getResponseAttributeDefinitions: function () {
    return this.metacontent().responseAttributeDefinitions;
  },

  updateResponseAttributeDefinitions: function () {
    var mc = this.metacontent();
    mc.responseAttributeDefinitions = this.responseAttributeDefinitions.toJSON();
    return this.set_field_value('metacontent_external', mc);
  },

  urlRoot: function() { return Dynamo.TriremeURL+'/xelements' },


  viewClass: function() { return showQuestionPerDatumInCollectionView; },

  editViewClass: function() { throw new Error("No edit class defined yet for QuestionAboutDataModel") }

});

ResponseModel = Dynamo.ResponseModel = Dynamo.Model.extend({
  // values:
  codeName: "response",
  prettyName: "Response",
  //functions:
  initialize: function() {
    _.bindAll(this);
    // this.initAsXelement();
    // this.set_field_value('xelement_type', 'question_response');
    var self = this;
    self.on('change', function() { console.log("Response '"+self.get('name')+"' changed "+self.cid)});
    self.responseValues = new ResponseValueCollection(self.get('responseValues'));
    self.responseValues.on('all', self.updateResponseValues);
  },
  defaults: function() {
    return {
      name: "name",
      label: "label",
      responseType: "text",
      responseValues: []
    }
  },
  updateResponseValues: function() {
    this.set('responseValues', this.responseValues.toJSON() );
  },
  viewClass: function() {
    return showResponseView
  },
  editViewClass: function() {
    // creates div with name, label, and ResponseType!
    // This is a backboneView
    return editResponseView
  }
});

ResponseValueModel = Dynamo.ResponseValueModel = Dynamo.Model.extend({
  // values:
  codeName: "response_value",
  prettyName: "Response Value",
  //functions:
  initialize: function() {
    var self = this;
    self.on('change', function() {
      console.log("ResponseValue changed: '"+self.get('label')+"'-'"+self.get('value')+"' - "+self.cid)
    });
  },
  defaults: function() {
    return {
      name: "name",
      label: "label"
    }
  },
  viewClass: function() { return showResponseValueView; },
  editViewClass: function() { return editResponseValueView; }
});
