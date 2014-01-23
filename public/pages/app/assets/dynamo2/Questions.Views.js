// Questions.Views.js
// Depends on:
//  Dynamo.Core
//  Questions.Models
//  Questions.Collections

QuestionGroupView = Dynamo.BaseUnitaryXelementView.extend({
  initialize: function (argument) {

    _.bindAll(this);
    this.initializeAsUnitaryXelement();
    this.displayShow = !!this.options.displayShow;
    this.displayEdit = !!this.options.displayEdit;
    this.model.on('change', this.render);
    this.model.on('sync', this.completeRender);
    this.initializeAsSaveable(this.model);

    // Set the Question Group as having unsaved changes
    // when a question changes.
    // Currently, this makes sense b/c the view provides 1
    // save button to the user for saving the entire question group.
    // If any question is altered, then it qualifies as a save status
    // change event on the questionGroup even though
    // no data at the question-group level.
    // Perhaps something to optimize later.
    this.model.questions.on('change', this.setUnsavedChanges);

  },

  attributes: function() {
    return {
      id: "question_group-"+this.model.cid,
      class: "question_group"
    }
  },

  events: function() {
    switch(this.displayEdit) {
      case true:
        return {
          'keyup h1 > input.title.editable': "updateTitle",
          // 'click h1 > span.title.editable': "editTitleInPopup",
          'click button.btn.save': "saveSaveableModel"
        };
        break;
      default:
        return {}
    };
  },

  _template: function(data, settings) {
    if (!this.compiled_template) {
      if (!this.template) {
        if (this.displayEdit) {
          this.template = this.options.edit_template || DIT["dynamo/question_groups/edit"];
        }
        else {
          this.template = this.options.show_template || DIT["dynamo/question_groups/show"];
        };
      };
      this.compiled_template = _.template(this.template);
    };
    return this.compiled_template(data, settings);
  },

  initialRender: function (argument) {
    var self = this, view;
    this.$el.html( this._template({
        title: this.model.get_field_value('title'),
        directions: this.model.metadata.toJSON().directions,
        current_save_state: this.model.currentSaveState(),
        current_save_text: this.model.currentSaveText(),
        metadata: this.model.metadata.toJSON()
      })
    );

    view = new Dynamo.ManageCollectionView({
      collection: this.model.questions,
      display: {
        create : (true),
        show: (this.displayShow),
        edit: (this.displayEdit),
        del: (this.displayEdit)
      },

      enableAddExisting: true, //existing questions can be added to this collection.

      //instead of returning a collection of questions,
      //we return the entire set of QUESTION_GROUPS
      getExistingAddablesCollection: function() {
        return QUESTION_GROUPS
      },

      // Once the user picks a QuestionGroup,
      // this function handles picking a question from that group.
      // When a question is selected, it adds it to the view's collection.
      onChoosingModelToAdd: function(element, element_index, manageCollectionViewInstance) {

        //thisView should be instantiated ManageCollectionView;
        var thisView = manageCollectionViewInstance;

        var $popup = $('div#popup_container');

        if ( $popup.find('div#choose_question').length == 0 ) { //jQuery version of false
          $popup.append('<div id="choose_question"><div>');
        };
        var $chooseQcontainer = $popup.find('div#choose_question');


        chooseQuestionView = new Dynamo.ChooseOneXelementFromCollectionView({
          canCreateNew: false,
          xelement_type: null,
          element_pretty_name: null,
          collection_name: (element.get_field_value('title') + " Questions"),
          collection: element.questions
        });
        $chooseQcontainer.empty();
        $chooseQcontainer.append( chooseQuestionView.$el );
        chooseQuestionView.render();

        chooseQuestionView.on('element:chosen', function() {
          // Once the user picks a question, use ManageCollectionView's
          // addExistingAtIndex to add the question
          thisView.addExistingAtIndex(chooseQuestionView.chosen_element, element_index);
          $popup.wijdialog('close');
        });

        thisView.on("chooseExistingModelView:close", function() {
          if (chooseQuestionView) { chooseQuestionView.remove() };
          chooseQuestionView = null;
          $chooseQcontainer = null;
        });

      }

    });

    this.$el.find('div.questions:first').append(view.render().$el);
    // view.render();

  },

  updateTitle: function(keyupEvent) {
    // No doing anything - the models attribute is already saved here on keyup
    this.model.set_field_value("title", $(keyupEvent.currentTarget).val());
  },

  render: function (argument) {
    if (!this.initiallyRendered()) {
      console.log('INITIAL QUESTION_GROUP SHOW RENDER');
      this.initialRender();
      this.setInitialRender();
    } else {
      console.log('QUESTION_GROUP RE-RENDER');
      this.renderSaveStatus();
      this.$el.children('h1:first').find('span.title').html(this.model.get_field_value('title'));
      this.$el.find('.metadata').html(this.model.metadata.toJSON());
    };
    return this;
  }

});

editQuestionView = Dynamo.BaseUnitaryXelementView.extend({

  initialize: function() {
    _.bindAll(this);
    this.cid = _.uniqueId('editQuestionView-');
    this.position = this.options.position;
    this.model.on('change', this.renderSaveStatus);
    this.model.on('change', this.renderTitle);
    this.initializeAsSaveable(this.model);
  },

  events: {
    'click h3 > input.title.editable': "updateTitle"
    // 'click h3 > span.title.editable': "editTitleInPopup"
  },

  // editTitleInPopup: function(click_event) {
  //   this.editTextFieldInPopup('title', click_event);
  // },  

  updateTitle: function(keyupEvent) {
    // No doing anything - the models attribute is already saved here on keyup
    this.model.set_field_value("title", $(keyupEvent.currentTarget).val());
  },

  _template: function(data, settings) {
    if (!this.compiled_template) {
      if (!this.template) { 
        this.template = this.options.template || DIT["dynamo/questions/edit"]; 
      };
      this.compiled_template = _.template(this.template);
    };
    return this.compiled_template(data, settings);
  },

  render: function() {
    var self = this,
        element,
        view_class,
        view;

    this.$el.html( this._template({
      position: this.position,
      title: this.model.get_field_value('title'),

      display:{ del: false },

      current_save_state: this.model.currentSaveState(),
      current_save_text: this.model.currentSaveText()
    }));

    element = this.$el.find('div.instructions:first');
    view = new Dynamo.TextInputView({
      el: element,
      form_id: self.cid,
      responseType: 'area',
      updateOn: 'keypress',
      label: 'Instructions',
      getValue: function() {
        return self.model.metaContent.get('instructions');
      },
      setValue: function(new_value) {
        return self.model.metaContent.set('instructions', new_value);
      }
    });
    view.render();

    element = this.$el.find('div.content:first');
    view = new Dynamo.TextInputView({
      el: element,
      form_id: self.cid,
      responseType: 'area',
      updateOn: 'keypress',
      label: 'Content',
      getValue: function() {
        return self.model.get_field_value('content');
      },
      setValue: function(new_value) {
        return self.model.set_field_value('content', new_value);
      }
    });
    view.render();

    view = new Dynamo.ManageCollectionView({
      collection: self.model.responses,
      display:{ edit: true, del: true },
      enableAddExisting: true, //existing questions can be added to this collection.
      //return the entire set of responses:
      getExistingAddablesCollection: function() {
        return _.flatten( QUESTIONS.map(function(q) { return q.getResponses(); }) , true );
      },
      chooseExistingViewOptions: {
        collection_name: "Responses",
        modelHTML: function(response) {
          return "<div class='response'>" +
                    HTMLizeJSON(response) +
                  "<input type='hidden' name='responseStringified' value='"+JSON.stringify(response)+"'>"
                  "</div>";
        },
        onChoose: function(clickEvent) {
          var objString = $(clickEvent.currentTarget).find("input[name='responseStringified']").val();
          obj = JSON.parse(objString);
          self.model.responses.add(obj);
          this.trigger("element:chosen");
        }
      }
    });
    self.$el.find('div.responseGroup:first').append(view.$el);
    view.render();

    // this.startPeriodicModelSaving(10);

    return this;
  },

  renderTitle: function() {
    this.$el.children("h3:first").find('span.title').html(this.model.get_field_value('title'));
  }

});

editResponseView = Backbone.View.extend({
  initialize: function() {
    _.bindAll(this);
    this.cid = _.uniqueId('editResponseView-');
    this.form_id = this.options.form_id || this.cid;
    this.model.on('change:responseType', this.render);
  },

  _template: function(data, settings) {
    if (!this.compiled_template) {
      if (!this.template) { 
        this.template = this.options.template || DIT["dynamo/questions/responses/edit"] 
      };
      this.compiled_template = _.template(this.template);
    };
    return this.compiled_template(data, settings);
  },

  initialRender: function() {
    var self = this, view_class, view;
    this.$el.html( this._template(this.model.toJSON()) );

    // Set Label & Input View
    view = new Dynamo.TextInputView({
      el: (this.$el.find('div.name.attribute label.name_value:first')),
      form_id: self.form_id,
      responseType: 'line',
      updateOn: 'keypress',
      label: 'Response Name',
      getValue: function() {
        return self.model.get('name');
      },
      setValue: function(new_value) {
        return self.model.set('name', new_value);
      }
    });
    view.render();

    view = new Dynamo.InputGroupView({
      el: (this.$el.find('div.attribute.responseType')),
      form_id: self.form_id,
      label: 'Response Type',
      getValue: function() {
        return self.model.get('responseType');
      },
      setValue: function(new_value) {
        return self.model.set('responseType', new_value);
      },
      responseType: 'select',
      responseValues: [
                      {label: 'text field',     value: 'text'     },
                      {label: 'text area',      value: 'textarea' },
                      {label: 'radio buttons',  value: 'radio'    },
                      {label: 'dropdown box',   value: 'select'   },
                      {label: 'checkboxes',     value: 'checkbox' },
                      {label: 'range',          value: 'range' }]
    });
    view.render();
  },

  inputViewForEditableAttribute: function(view_class, attr) {
    var self = this,
        view,
        view_options = {
          tagName: 'div',
          className: 'attribute edit',
          form_id: self.cid,
          label: ("Respone "+attr.capitalize()),
          getValue: function() {
            return self.model.get(attr);
          },
          setValue: function(new_value) {
            // set name attribute as default 'tableized' label value
            if (self.model.attributes.name.length !== 0) { 
              self.model.set("name", new_value.toLowerCase().replace(/ /g,"_"));
            };
            return self.model.set(attr, new_value);
          }
        };

    // By default, the attribute of the response will be displayed as a text field.
    // Optionally, The view class can specify how the attribute should be displayed
    // through the view's "editableOptionsInputTypes" class property.
    //
    // The expected format for the editableOptionsInputTypes property is:
    // - Any attribute that should be displayed with an input other than a text field
    // will be a key in the property.
    // - The value will be a two-element array.
    //  - The 1st element will be the inputType as a string
    //  - The 2nd element will be any additional/override options to
    //    the view_options object desired to instantiate the view class
    //    for the inputType
    //
    // e.g., if you wish an editable attribute of a response type
    // to be editable not by filling in a text box,
    // but rather by the user choosing from a select drop-down box,
    // then the editableOptionsInputTypes object for that response type would be:
    // editableOptionsInputTypes: {
    //   "editable_attribute_name" : [ 'select',
    //       {
    //         responseType: 'select',
    //         responseValues: [ { label: 'label_for_option1',  value: 'label_for_option2'  },
    //                         { label: 'label_for_option2', value: 'label_for_option2' }]
    //       }
    //   ]
    // }
    if (!view_class.editableOptionsInputTypes ||
        !view_class.editableOptionsInputTypes[attr] ) {

      //The default format displays the attr field as a text input view,
      //updating the model's attribute on keypress
      _.extend(view_options, { responseType: 'line', updateOn: 'keypress' })
      view = new Dynamo.TextInputView(view_options);

    }
    else {

      //The view class does an alternate input class for the attribute.
      var attrInputOpts = view_class.editableOptionsInputTypes[attr];
      var attr_view_class = viewClassForInputType(attrInputOpts[0]);
      _.extend(view_options, attrInputOpts[1]);
      view = new attr_view_class(view_options);

    }

    return view;

  },

  render: function() {
    var self = this,
        view_class,
        view,
        $viewClassAttsContainer,
        $responseValuesContainer;

    if ( !this._initialRender ) {
      self.initialRender();
      this._initialRender = true;
    };

    //Fetch the ViewClass for the current type of response.
    view_class = viewClassForInputType( self.model.get('responseType') );

    //Empty the container for attributes of this type of response.
    $viewClassAttsContainer = self.$el.find('div.typeSpecificAttributesContainer:first');
    $viewClassAttsContainer.empty();

    // Create and render an InputView for each of the
    // user-specifiable, view-specific attributes.
    _.each(view_class.editableOptionsAttributes, function(editable_attr) {
      view = self.inputViewForEditableAttribute(view_class, editable_attr);
      $viewClassAttsContainer.append(view.$el);
      view.render();
    });

    // Empty the container for responseValues
    $responseValuesContainer = self.$el.find('div.responseValuesContainer:first');
    $responseValuesContainer.empty();

    // Create a collection of responseValues, if appropriate.
    if (view_class.canHaveResponseValues) {
      var h3Content = this.model.get('responseType')
      h3Content = h3Content.charAt(0).toUpperCase() + h3Content.slice(1);
      $responseValuesContainer.append('<h3>'+h3Content+' Values</h3>');

      view = new Dynamo.ManageCollectionView({
        collection: this.model.responseValues,
        display:{ edit: true, del: true}
      });

      $responseValuesContainer.append(view.$el);
      view.render();

    };

    return this;
  }

});

editResponseValueView = Backbone.View.extend({
  initialize: function() {
    _.bindAll(this);
  },

  _template: function(data, settings) {
    if (!this.compiled_template) {
      if (!this.template) { 
        this.template = this.options.template || DIT["dynamo/questions/responses/response_values/edit"]; 
      }
      this.compiled_template = _.template(this.template);
    }
    return this.compiled_template(data, settings);
  },

  render: function() {
    var self = this, view;

    this.$el.html(this._template(this.model.toJSON()));

    view = new Dynamo.TextInputView({
      el: (this.$el.find('span.response-value-label:first')),
      form_id: self.options.form_id,
      responseType: 'line',
      updateOn: 'keypress',
      label: 'Label',
      getValue: function() {
        return self.model.get('label');
      },
      setValue: function(new_value) {
        return self.model.set('label', new_value);
      }
    });
    view.render();

    view = new Dynamo.TextInputView({
      el: (this.$el.find('span.response-value-value:first')),
      form_id: self.options.form_id,
      responseType: 'line',
      updateOn: 'keypress',
      label: 'Value when selected',
      getValue: function() {
        return self.model.get('value');
      },
      setValue: function(new_value) {
        return self.model.set('value', new_value);
      }
    });
    view.render();

    return this;
  }
});

// CompleteAssessmentAsSingleton
// Allows a question group to be viewed and responded to by a user,
// storing all the questions as part of a single data object.
// 
// Expects:
// 1) a QuestionGroup as its model.
// 2) userResponseData - 
//      A Dynamo.Data object representing the user's already existing answers;
//      if passed in, then the view will edit this set of answers as opposed to
//      creating a new Data object to store.
Dynamo.CompleteAssessmentAsSingleton = Dynamo.SaveableModelView.extend({
  
  initialize: function() {

    _.bindAll(this);
    this.template = this.options.template || DIT["dynamo/question_groups/show_as_singleton"];
    this.userResponseData = this.options.userResponseData;
    this.initializeAsSaveable(this.userResponseData);

  },
  

  events: {

    "click div.navigation button#finish" : "finish"

  },

  finish: function() {

    this.saveSaveableModel();

    if (this.options.responsesRequired) {

      if (this.userResponseData.get("names").length < this.model.questions.length ) {
        alert('Please respond to all questions before continuing.');
      }
      else {
        this.trigger('finished');
      };

    };

  },

  saveIfChanges: function() {

    if  ( this.userResponseData.hasUnsavedChanges() ) {
      this.saveSaveableModel();
    }

  },

  _template: function(data, settings) {

    if (!this.compiled_template) {
      if (!this.template) { throw new Error("No valid template found") };
      this.compiled_template = _.template(this.template);
    };
    return this.compiled_template(data, settings)

  },  

  initialRender: function() {

    // render initial template
    this.$el.html(
      this._template({
        title: this.model.get_field_value('title'),
        start_content: null,
        no_navigation: false,
        next_button: { text : false },
        previous_button: { text : false },
        current_save_state: this.userResponseData.currentSaveState(),
        current_save_text: this.userResponseData.currentSaveText(),
        end_content: null
      })
    );

    // render questions
    var $questions = this.$el.children('div#questions');
    $questions.empty();
    this.questionViews = [];
    var self = this;
    this.model.questions.each(function(question) {
      var qView = new Dynamo.showQuestionView({
        model: question,
        userResponseModel: self.userResponseData,
        template: '<span class="content content-condensed"></span> <div class="responseGroup"></div>'
      });
      $questions.append(qView.render().$el);
      qView.on("response:chosen", self.saveIfChanges );
      self.questionViews.push(qView);
    });

    this._initialRender = true;

  },

  render: function() {
    var self = this;
    if (!this._initialRender) { this.initialRender() };

    return this;
  }  

});

// TakeAssessmentView
// Allows the question group to be viewed and responded to by a user, actually storing data.
// to a Trireme endpoint.
// 
// Expects:
// 1) Expects a QuestionGroup as its model.
// 2) Expects a User model to be passed in as the 'responder' option.
//
// Optionally:
// userResponseData - a Dynamo.Data object representing the user's already existing answers;
//                    if passed in, then the view will edit this set of answers as opposed to
//                    creating a new Data object to store.
//
//
// Implementation currently has laid groundwork for a Computer Adaptive Testing (CAT) algorithm
// to be defined in a Question Group's metacontent.  Without any sort of algo present, it simply defaults 
// to a method which simply shows the next question based upon the order of the questions as they are 
// in the Question Group's 'questions' collection.
TakeAssessmentView = Dynamo.TakeAssessmentView = Dynamo.SaveableModelView.extend({
  
  initialize: function() {
    _.bindAll(this);

    this.template = this.options.template || DIT["dynamo/question_groups/show"];

    // The user taking the assessment:
    this.responder = this.options.responder;

    // Organize questions, laying groundwork for CAT:
    this.maximumNumberOfQuestions = this.model.questions.length
    this.unpresentedQuestions = new QuestionCollection(this.model.questions.models);
    this.presentedQuestions = new QuestionCollection();
    this.numResponsesSaved = null;

    // We will store data both at the whole assessment level
    // and at the individual question level.
    // yes, that means redundant and possibly prone to data inconsistency,
    // but the probability is small enough, and the risk outweighed by future Data Mining needs
    // 'this.userResponseData' model is set and stores the complete assessment's responses
    // and
    // 'this.questionResponses' collection is set and stores invidiual questions' user responses:
    this.initializeResponseData();
    // this.questionResponses.on('add',    this.updateUserResponseData );
    this.questionResponses.on('add',    this.saveSaveableModel);
    // this.questionResponses.on('remove', this.updateUserResponseData );
    this.questionResponses.on('remove', this.saveSaveableModel);

    this.initializeAsSaveable(this.userResponseData);

    // Default Starting Values
    this.current_index = 0;
    this.current_question = null;

    // CAT groundwork related:
    // define the function by which we will decide the next question shown;
    // and choose an initial question to be presented.
    // defaults to a function which simply shows the next question.
    this.setSelectNextFunction();
    this.addToPresentedQuestions();

  },

  initializeResponseData: function() {

    // You can pass in a data object,
    if (this.options.userResponseData) {
      this.userResponseData = this.options.userResponseData;
            
      this.questionResponses = new Dynamo.DataCollection(null, {
        server_url: this.userResponseData.get('server_url'),
        user_id: this.userResponseData.get('user_id'),
        group_id: this.userResponseData.get('group_id')
      });

      return;

    }

    // or pass in sufficient options to define a new data object,
    if ( this.options.server_url && ( this.options.group_id ) ) {

      this.userResponseData = new Dynamo.Data ({
        server_url: this.options.server_url,
        xelement_id: this.model.id,
        user_id: this.responder.id,
        group_id: this.options.group_id
      });

      this.questionResponses = new DataCollection(null, {
        server_url: this.options.server_url,
        user_id: this.responder.id,
        group_id: this.options.group_id
      });

      return;
    };

    //or do neither and not actually store data
    console.warn("TakeAssessmentView: Insufficient options passed to actually save data");
    alert("Warning: Entered data is not being saved!");

    this.userResponseData = new Dynamo.TempData();
    this.questionResponses = new TempDataCollection();
  },

  addToPresentedQuestions: function() {
    if (this.current_index > this.presentedQuestions.length) {
      throw new Error("current_index should be at equal to the length of presentedQuestions");
    };
    var q, next_q_id;
    if (this.current_index == this.presentedQuestions.length ) {
      next_q_id = this.selectNext(this.model, this.questionResponses.pluck("xelement_id"), this.userResponseData);
      q = this.unpresentedQuestions.get(next_q_id);
      this.unpresentedQuestions.remove(q);
      this.presentedQuestions.add(q);
      this.questionResponses.add({
        xelement_id: q.id,
        user_id: this.questionResponses.user_id(),
        group_id: this.questionResponses.group_id()
      });
    };
  },

  attributes: { class: "Assessment" },

  events: {

    "click div.assessment.navigation button.previous" : "showPrevious",
    "click div.assessment.navigation button.next"     : "showNext",
    "click div.assessment.navigation button.finish"   : "finishAssessment"
    
  },

  finishAssessment: function() {

    this.current_index = 0;
    this.$el.empty();
    this.saveSaveableModel();
    this.trigger('finished');

  },

  remove: function() {
    this.currentQuestionView.remove();
    this.currentQuestionView = null;
    this.$el.remove();
  },

  saveIfChanges: function() {
    if  ( this.userResponseData.hasUnsavedChanges() ||
          ( this.questionResponses.any(function(qr) { return qr.hasUnsavedChanges() }) )
        )
      { this.saveSaveableModel(); };
  },

  saveSaveableModel: function(callback) {
    var self = this;
    this.saveResponses(function() {
      self.updateUserResponseData();
      // Required b/c sometimes callback will be the click event,
      // and in that case, it will cause an error.
      if ( _.isFunction(callback) ) {
        self.userResponseData.save(null, { success: callback, remote: true });
      }
      else {
        self.userResponseData.save();
      };
      self = null; // avoid Mem leak?
    });
  },

  onResponseSaved: function(onAllSavedCallback) {

    //Once the first response in a set is saved,
    //must complete saving all responses w/in 10 seconds.
    var nullifyNumResponsesSaved;
    var self = this;
    if (this.numResponsesSaved === 0) {
      console.log("AssesmentSaveCycle - onResponseSaved: this.numResponsesSaved === 0 ");
      nullifyNumResponsesSaved = setTimeout(function(backbone_view) {
        backbone_view.numResponsesSaved = null;
        console.log("AssesmentSaveCycle - END onResponseSaved CYCLE - nullifyNumResponsesSaved called ", backbone_view);
      }, 10*1000, self);
    };
    if ( typeof(this.numResponsesSaved) == "number") {
      console.log("AssesmentSaveCycle - onResponseSaved: numResponsesSaved++ ");
      this.numResponsesSaved++;
    };
    console.log("numResponsesSaved: ", this.numResponsesSaved);
    if (this.numResponsesSaved === this.questionResponses.length) {
      console.log("AssesmentSaveCycle - onResponseSaved: this.numResponsesSaved === this.questionResponses.length ");
      //all responses have been saved, end the save cycle:
      this.numResponsesSaved = null;
      console.log("AssesmentSaveCycle - END onResponseSaved CYCLE - normal end");

      if (nullifyNumResponsesSaved) {

        console.log("AssesmentSaveCycle - onResponseSaved: clearTimeout(nullifyNumResponsesSaved);");
        clearTimeout(nullifyNumResponsesSaved);
        nullifyNumResponsesSaved = null;

      };

      console.log("AssesmentSaveCycle - onResponseSaved: Attempting after-all callback...");

      if ( _.isFunction(onAllSavedCallback) ) {
        try {
          onAllSavedCallback()
        } catch (error) {
          console.warn("AssesmentSaveCycle - onResponseSaved - ERROR in after-all callback: ", error);
        };
      }
      else {
        console.log("AssesmentSaveCycle - onResponseSaved: after-all callback was not a function");
      };

    };

  },

  saveResponses: function(callback) {
    var self = this;

    //  only begin saving all responses
    //  if we're not in the process of doing so already...
    if (self.numResponsesSaved === null) {
      console.log("AssesmentSaveCycle - saveResponses: BEGIN CYCLE ");
      self.numResponsesSaved = 0;
      this.questionResponses.invoke('save', null, { success: function() { self.onResponseSaved(callback) }, remote: true });
    }
    else {
      console.log("AssesmentSaveCycle - saveResponses: numResponsesSaved !== null ");
    };

  },

  // sets the value of the view's 'selectNext' attribute to
  // a function which accepts  of the question to show the user next
  setSelectNextFunction: function() {
    if ( this.model.metadata.get("selectNextFunction") ) {
      this.selectNext = eval(this.model.metadata.get("selectNextFunction"));
    }
    else {
      this.selectNext = this.model.defaultSelectNext
    };
  },

  showNext: function() {
    this.current_index++;
    if ( this.current_index < this.maximumNumberOfQuestions ) {
      this.addToPresentedQuestions();
      if ( this.userResponseData.hasUnsavedChanges() ) { this.saveSaveableModel(); };
      return this.render();
    } else {
      this.current_index = this.maximumNumberOfQuestions
      if ( this.userResponseData.hasUnsavedChanges() ) { this.saveSaveableModel(); };
      // return this.showFinishDialog();
      return this.finishAssessment();
    };
  },

  showPrevious: function() {
    if (this.current_index > 0) {
      this.current_index--;
      this.initialRender();
      return this.render();
    };
  },

  _template: function(data, settings) {

    if (!this.compiled_template) {
      if (!this.template) { throw new Error("No valid template found") };
      this.compiled_template = _.template(this.template);
    };
    return this.compiled_template(data, settings)

  },  

  updateUserResponseData: function() {
    var self = this;
    this.questionResponses.each(function (qUserResponse, index) {
      self.userResponseData.set_field( "Question-"+(index+1), "json", qUserResponse.get_fields() );
    });
    // if (_.isFunction(after_callback)) { after_callback() };
  },

  showFinishDialog: function() {
    this.$el.html("" +
      "<div><p>" +
        "This is the end of this Questionnaire." +
      "</p></div>" +
      "<div class='assessment navigation'>" +
        "<button class='previous'>Previous</button>" +
        "<button class='finish'>Finish</button>" +
      "</div>");
  },

  initialRender: function() {
    var self = this;
    this.$el.html(
      this._template({
        title: self.model.get_field_value('title'),
        start_content: null,
        no_navigation: false,
        next_button: { text : false },
        previous_button: { text : false },
        current_save_state: this.userResponseData.currentSaveState(),
        current_save_text: this.userResponseData.currentSaveText(),
        end_content: null
      })
    );
    this._initialRender = true;
  },

  render: function() {
    var self = this;
    this.current_question = this.presentedQuestions.at(this.current_index);
    this.current_response = this.questionResponses.at(this.current_index);

    this.current_response.on('change', this.updateUserResponseData);

    if (!this._initialRender) { this.initialRender() };

    if (this.currentQuestionView) { this.currentQuestionView.remove() }; //Avoid zombies -gs;
    this.currentQuestionView = new Dynamo.showQuestionView({
      model: this.current_question,
      userResponseModel: this.current_response
    });
    this.currentQuestionView.on("rendered", function() { self.trigger("current_question:rendered") });

    var $questions = this.$el.children('div#current-question:first');
    $questions.empty().append(this.currentQuestionView.render().$el);
    this.currentQuestionView.render();

    this.currentQuestionView.on("response:chosen", this.saveSaveableModel );

    return this;
  }

});


protoQuestionView = Dynamo.protoQuestionView = Dynamo.BaseUnitaryXelementView.extend({

  setUserResponseModel: function () {

    //could be passed in on instantiation
    if (this.options.userResponseModel) {
      this.userResponseModel = this.options.userResponseModel;
      return;
    };

    //Could be defined by object/class extension
    if (this.userResponseModel) { return; };

    //Or it could maybe be created
    if (  (!this.options.xelement_id && (!this.model || (this.model && !this.model.id)) ) || 
          !this.options.user_id || 
          !this.options.group_id ) {
          
          console.warn("(xelement_id or model.id), user_id, and group_id are required to actually save data to the server!/n We will be returning a TempData object instead");

          this.userResponseModel = new Dynamo.TempData({
            xelement_id: this.options.xelement_id || this.model.id,
            user_id: this.options.user_id,
            group_id: this.options.group_id,
          })


    }
    else {
      this.userResponseModel = new Dynamo.Data({
        server_url: this.options.server_url,
        xelement_id: this.options.xelement_id || this.model.id,
        user_id: this.options.user_id,
        group_id: this.options.group_id
      });
    };

  },

  triggerAnswered: function() {
    this.trigger("answered");
  },

  triggerResponseChosen: function() {
    var self = this;
    this.userResponseModel.save(null, {success: function() {
      self.trigger("response:chosen");
    }});
  }  

});


//showQuestionView
//On instantiation, this view expects:
//1) a model of class Question from which it renders
//2) an optional key 'userResponseModel' whose value is
//   a model onto which it saves
//   a user's response to this question's responses.
//   if this key is ommitted, it will create it's own.
showQuestionView = Dynamo.showQuestionView = protoQuestionView.extend({

  initialize: function() {

    _.bindAll(this);
    _.extend(this, Backbone.Events);
    this.cid = _.uniqueId('showQ-');
    this.subViews = [];
    this.position = this.options.position;

    this.template = this.options.template || this.model.show_template || DIT["dynamo/questions/show"];

    this.model.responses.on("add", this.initialRender);
    this.model.responses.on("add", this.render);
    this.model.responses.on("remove", this.initialRender);
    this.model.responses.on("remove", this.render);
    this.model.on("change",   this.render);
    this.model.on("destroy",  this.removeSubViews);
    this.model.on("destroy",  this.remove);

    this.setUserResponseModel();
    this.initializeAsSaveable( this.userResponseModel );

    if (this.options.events) {
      _.isFunction( this.options.events ) ? this.delegateEvents(this.options.events()) : this.delegateEvents(this.options.events);
    };

  },

  addSubView: function(view) {
    this.subViews.push(view);
  },

  attributes: function() {
    return {
      id: "question-"+this.model.cid,
      class: "question"
    }
  },

  remove: function() {
    this.$el.remove();
    this.removeSubViews();
  },

  removeSubViews: function() {
    _.each(this.subViews, function(sub_view) {
      sub_view.remove();
      sub_view = null;
    });
    this.subViews = [];
  },

  _template: function(data, settings) {

    if (!this.compiled_template) {
      if (!this.template) { throw new Error("No valid template found") };
      this.compiled_template = _.template(this.template);
    };
    return this.compiled_template(data, settings)

  },

  initialRender: function() {
    //render template
    var self, view_class, view;

    self = this;
    self.$el.html( self._template({ 
      position: self.position,
      content: self.model.getContent()
    }) );

    //Add response views as sub views of this one.
    this.removeSubViews(); //BSTS: Avoid memory leak (i think) -gs;
    self.model.responses.each(function(r) {
      view_class = r.viewClass();
      view = new view_class({
        model: r,
        userResponseModel: self.userResponseModel,
        form_id: self.cid
      });
      self.$el.find('div.responseGroup:first').append(view.$el);
      self.addSubView(view)
      view.render();
      view.on('response:chosen', self.triggerResponseChosen)
    });
    return this;
  },

  render: function() {
    if (!this.initiallyRendered()) {
      console.log('INITIAL QUESTION SHOW RENDER');
      this.initialRender();
      this.setInitialRender();
    } else {
      console.log('RE-RENDERING QUESTION');
    };
    this.$el.find('div.instructions:first').html(this.model.metaContent.get('instructions'));
    this.$el.find('.content:first').html(this.model.get_field_value('content'));
    // Do not worry about subView rendering; they can re-render themselves as necessary.
    this.trigger("rendered");
    return this;
  }

});


//  showResponseView
//    On instantiation, this view expects:
//      1) a model of class Response from which it renders
//      2) a userResponseModel key whose value is
//         expected to be a model onto which it will save
//         a user's response as the value of
//         the-attribute-of-that-model-with-the-name-of-
//         the-name-of-this-response-object.
//         (if not passed, it throws an error).

var opensAndClosesWithChevron = {

  events: {
    "click .accordion-header": "displayWidgetContent"
  },

  displayWidgetContent: function() {
    var body = this.$el.find(".accordion-body");
    if (body.is(":visible")) {
      body.hide();
      this.rotateArrowRight();
    } else {
      body.show();
      this.toggleChevronArrow();
    }
  },

  rotateArrowRight: function() {
    this.$el.find('i.icon-caret-down').removeClass('icon-caret-down').addClass('icon-caret-right');
  },

  rotateArrowDown: function() {
    this.$el.find('i.icon-caret-right').removeClass('icon-caret-right').addClass('icon-caret-down');
  },

  toggleChevronArrow: function() {
    if (this.$el.find('i.icon-caret-right').length === 1) {
      this.rotateArrowDown();
    } else {
      this.rotateArrowRight();
    }
  }

};

var srvWithChevrons = Backbone.View.extend(opensAndClosesWithChevron);

// showResponseView = Backbone.View.extend({
showResponseView = srvWithChevrons.extend({

  initialize: function() {
    _.bindAll(this);
    this.cid = _.uniqueId('showResponseView-');
    this.model.on('change', this.render);
    this.setUserResponseModel()
    // don't do this - inifinite render loop!
    // this.userResponseModel.on('change', this.triggerResponseChosen);
  },

  setUserResponseModel: function() {
    if ( this.options.userResponseModel ) {
      this.userResponseModel = this.options.userResponseModel;
      return this.userResponseModel;
    };
    if ( this.userResponseModel ) { return this.userResponseModel };    
    throw new Error("no userResponseModel for showResponseView!");
  },

  triggerResponseChosen: function() {
    console.log("triggerResponseChosen in showResponseView");
    this.trigger("response:chosen");
  },

  remove: function() {
    this.internal_view = null; //BSTS: Avoid circ-ref memory leak (i think) -gs;
    this.$el.remove();
  },

  render: function() {
    var self, view_class, view_options;
    self = this;

    //  Fetch the View Class for this type of response:
    view_class = viewClassForInputType( self.model.get('responseType') );

    //  Build the appropriate options to pass into this view on instantiation:
    view_options = this.model.pick( view_class.optionsAttributes ) //pick method in Dynamo core.
    view_options.getValue = function() {
      return self.userResponseModel.get_field_value(self.model.get('name'));
    };
    view_options.setValue = function(new_value) {
      self.userResponseModel.set_field(self.model.get('name'), "string", new_value);
      self.triggerResponseChosen() //bit of a hack to get rendering events to waterfall correctly.
      // return
    };
    view_options.form_id = this.cid;

    //  Instantiate and render
    this.internal_view = null; //BSTS: Avoid circ-ref memory leak (i think) -gs;
    this.internal_view = new view_class(view_options);
    this.$el.html(this.internal_view.$el);
    this.internal_view.render();

    return this;
  }

});

protoKnockoutView = Backbone.View.extend({

  buildViewModel: function() {
    throw new Error("You must define your own viewModel by overriding buildViewModel")
  },

  _template: function(data, settings) {

    if (!this.compiled_template) {
      if (this.options.template) { this.template = this.options.template };
      if (!this.template) { throw new Error("No valid template found") };
      this.compiled_template = _.template(this.template);
    };
    return this.compiled_template(data, settings)

  },


});


TwoTruthsLieDataView = protoKnockoutView.extend({

  initialize: function() {
    _.bindAll(this);
    this.QAD = QUESTIONS_ABOUT_DATA.get(this.model.get('xelement_id'));
    this.group = USER_GROUPS.get(this.model.get('group_id'));
    this.latestAnswersPerUser = this.model.perUser(function(c) { return c.last() });
    this.model.on('change', this.render);
  },

  buildViewModel: function() {
    var self = this;
    this.viewModel = {};

    this.group.users.each(function(member) {
        var uname = member.get("username");

        //When it came to roberto...
        self.viewModel[uname] = [];
        
        //Others thought that his RAD.label was
        _.each(self.QAD.getResponseAttributeDefinitions(), function(RAD) {
          
          self.viewModel[uname].push( {
            attr_name: [RAD.name],
            userGuesses: self.latestAnswersPerUser.map( function(ud) { 
              if (ud.get('user_id') != member.id ) {
                return {
                  value_guessed: ud.get_field_value(RAD.name+"_for_"+member.id),
                  user: USERS.get(ud.get('user_id')).attributes
                }
              };
            })
          });

        });
    });

    return this.viewModel;
  },

  render: function() {
    this.$el.html(  this._template({ user_results: this.buildViewModel() })  );
  }  

})



//Expects a GroupData Model Object
PollResponseView = protoKnockoutView.extend({

  template: "" +
    '(% _.each(responses, function(r) { %)'+
      '(% if (r.label) { print( t.div(r.label+":") ) }; %)'+
      '(% _.each(r.responseValues, function(rv) { %)'+
        '<div>'+
          '<p class="title pull-left">(%= rv.value %)</p>'+
          '<p class="info response_percentage pull-right label label-info">'+
            '(%= rv.proportion %)'+
            '(% if (_.isNumber(rv.percentage) && !_.isNaN(rv.percentage)) { %)'+
              ' ( (%= rv.percentage * 100 %)% )'+
            '(% } %)'+
          '</p>'+
          '<div class="clearfix"></div>'+
          '<p class="response_choosers">'+
            '(% _.each(rv.choosers, function(user) { %)'+
              '<div>'+
                // Currently , no image_url exists -W
                // '<img src="(%= user.image_url %)" style="width:40px;"><br />'+
                '<span class="name">(%= user.username %)</span>'+
              '</div>'+
            '(% }); %)'+
          '</p>'+
        '</div>'+
        '<hr />'+
      '(% }); %)'+
    '(% }); %)',


  initialize: function() {
    _.bindAll(this);
    this.question = QUESTIONS.get(this.model.get('xelement_id'));
    this.responses = this.question.getResponses();
    // _.each(this.model.collections, function(c) {
    //   c.on('all', this.render);
    // });
    // this.model.on('change', this.render);
  },

  buildViewModel: function() {
    var self = this,
        pollResponsesModel = [];

    _.each(this.responses, function(response) {

      var pollResponseData = {
        label: response.label,
        responseValues: []
      };

      _.each(response.responseValues, function(rv) {
      
        var responseVal = {
          value: rv.value
        };
        
        // Fetch user_data that matches this response value.
        var userDataForResponseVal = self.model.where(function(ud) { 
          return (ud.get_field_value(response.name) == rv.value) 
        });

        // Pull the user_id out of the user_data and use it to get the
        // user object.
        responseVal.choosers = userDataForResponseVal.map(function(ud) {
          var u = USERS.get(ud.get('user_id'));
          return u.attributes;
        });

        // Calculate the percentage of users that have chosen this
        // option out of all of the users in the group.
        responseVal.proportion = ""+responseVal.choosers.length+" of "+self.model.collections.length;
        responseVal.percentage = (Math.floor( (responseVal.choosers.length/self.model.collections.length) * 100) / 100);

        pollResponseData.responseValues.push(responseVal);

      });

      pollResponsesModel.push(pollResponseData);

    });

    return pollResponsesModel;
  },

  render: function() {
    this.$el.html(  this._template({ responses: this.buildViewModel() })  );
  }  

});

/*
  showQuestionPerDatumInCollectionView

  Purpose:
  This view model allows you to construct a Question Xelement object (on the client) for the user to respond to.
  The Question can have multiple Response Xelement Objects.
  The Response objects have can have the type of 'radio', or 'textResponse'.
  If Response Values are required, as they are in 'radio', then these Response Values are expected to be 
  attributes of UserData objects.

  Thus, this view allows you to ask users questions about user data, 
  whether that data is their own data, or other user's data.
  
  Implementation:

  - The view expects a collection on instantiation, & it is expected to be a collection of UserData objects.
  - In addition, an array of objects is passed into the view option key, 'responseAttributeDefinitions'.
  - 'responseAttributeDefinitions' must hold to the following specific format:

  responseAttributeDefinitions: [{
    name: '[NameForTheAttribute-WhichHasTheUserChooseFromSomeCollectedData]',
    label: "Which of the following is three choices is the user lying about?"
    type: 'radio',
    options: ["UserDataAttribute1", "UserDataAttribute2", "UserDataAttribute3", ...]
  },{
    name: 'SomeOtherNameForADifferentAttribute-WhichIsATextResponseFromTheUserAboutSomeCollectedData',
    label: "Opinion on Favorite Drink"
    type: 'textResponse',
    dataToShow: ["UserDataAttribute4"],
    // promptBeforeData: "When we asked another user, 'what's your favorite drink', they said:",
    // promptAfterData: "What do you think of their choice?"
  }]

  If you're a little confused, I don't blame you.  Feel free to ask me questions.
  -Gabe
*/   
showQuestionPerDatumInCollectionView = protoQuestionView.extend({

  initialize: function() {
    
    _.bindAll(this);
    _.extend(this, Backbone.Events);

    this.template = this.options.template || this.template;
    this.collection.on('add', this.render);
    this.collection.on('remove', this.render);
    this.collection.on('reset', this.render);
    
    this.setUserResponseModel();
    this.initializeAsSaveable( this.userResponseModel );

  },

  events: {
    "click button.finished" : "triggerAnswered" //inherited from protoQuestionView
  },

  buildViewModel: function() {
    var self = this,
        viewModel = {};

    viewModel.title = this.model.get_field_value("title");
    viewModel.content = this.model.get_field_value("content");
    viewModel.responseAttrDefs = this.model.getResponseAttributeDefinitions();
    viewModel.userDataPoints = [];

    //A collection of UserData objects is expected
    this.collection.each(function(ud) {
      var userDataPoint;

      if (_.isEmpty(ud.attributes) || !ud.get('user_id') ) {
        userDataPoint = { empty: true };
      }
      else {
        
        var user = USERS.get(ud.get('user_id'));
        if (!user) { throw new Error("No User found for id:" + ud.user_id) };
      
        userDataPoint = {
          user_id: user.id,
          username: user.get('username'),
          id: ud.id,
          atts: ud.fieldsToJSON(),
          created_at: new Date(ud.get('created_at'))
        };

      };

      viewModel.userDataPoints.push(userDataPoint);

    });

    viewModel.userResponseModel = this.userResponseModel;

    return viewModel;
  },  

  isAnswered: function() { 
    return false 
  },

  template: "<div><h1>PROVIDE A TEMPLATE FOR showQuestionPerDatumInCollectionView</h1></div>",

  _template: function(data, settings) {

    if (!this.compiled_template) {
      if (!this.template) { throw new Error("No valid template found") };
      this.compiled_template = _.template(this.template);
    };
    return this.compiled_template(data, settings)

  },

  render: function() {
    if (this.viewModel().userDataPoints.length == 0) {
      this.$el.html(this.options.noDataTemplate);
    }
    else {
      this.$el.html(  this._template(  this.viewModel() )  );
    };
  },

  viewModel: function() {
    return this.buildViewModel();
  }
})
