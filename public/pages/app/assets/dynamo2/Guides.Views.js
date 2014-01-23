// Guides.Views.js

// PlayGuideView = Dynamo.PlayGuideView = Dynamo.BaseUnitaryXelementView.extend({

//   events: function() {
//     return {
//       'click button.next-slide'         : "nextAndRender",
//       'click button.previous-slide'     : "previousAndRender",
//       'click button.jump-to-slide'      : "jumpAndRender",
//     };
//   },

//   render: function (argument) {

//     this.renderTemplate();
//     this.renderCurrentSlide();

//     return this;
//   }
// });


// launchInModal
// Following the decorator pattern, wraps a view instance
// so that it is properly rendered within a modal dialog
// currently relies on jQuery UI.
launchInModal = function(viewInstance, options) {
  
  var modalViewObj = {};

  _.extend(modalViewObj, Backbone.Events);
  modalViewObj.cid = _.uniqueId('c');
  modalViewObj.viewInstance = viewInstance;

  // Setup launch button
  if (options.$launchButton) {
    modalViewObj.$launchButton = options.$launchButton;
  }
  else if (options.$launchButtonContainer) {

    var buttonId = "launch-"+modalViewObj.cid

    options.$launchButtonContainer.prepend(
      t.button(options.launchButtonText, { 
        id: buttonId, 
        class: "btn btn-info", 
        style: (options.launchButtonStyle || "") 
      }));
    modalViewObj.$launchButton = $(options.$launchButtonContainer.find(("button#"+buttonId+":first")));

  }
  else {
    throw "requires a $launchButton or $launchButtonContainer option"
  }

  // Set view container.
  if (options.$viewContainer) {

    modalViewObj.$viewContainer = options.$viewContainer;

  }
  else {

    var dialogId = 'dialog-'+modalViewObj.cid;
    modalViewObj.$viewContainer = $('<div id="'+dialogId+'"></div>');
    $('body').append(modalViewObj.$viewContainer);

  }

  // Initalize view container as dialog
  var modalOpts = _.extend({
    autoOpen: false
  }, options.jqModalOptions);
  modalViewObj.$viewContainer.dialog( modalOpts );  
  
  modalViewObj.openModal = function() {
    modalViewObj.$viewContainer.dialog("open");
    if (!modalViewObj.viewRendered) {
      modalViewObj.$viewContainer.html(modalViewObj.viewInstance.render().$el);
      modalViewObj.viewInstance.delegateEvents();      
      modalViewObj.viewRendered = true;
    }
    modalViewObj.trigger('opened');
  };
  
  modalViewObj.closeModal = function() {
    modalViewObj.$viewContainer.dialog("close");
    modalViewObj.trigger('closed');
  };
  _.bindAll(modalViewObj, 'closeModal');

  modalViewObj.destroy = function() {
    modalViewObj.$viewContainer.dialog("close");
    modalViewObj.trigger('closed');
    modalViewObj.$viewContainer.remove();
    modalViewObj.viewInstance.remove();
    modalViewObj.viewInstance = null;
    modalViewObj.trigger('destroyed');
  };
  _.bindAll(modalViewObj, 'openModal', 'closeModal', 'destroy');


  // Set up the on-button-click trigger
  if (options.onLaunchButtonClick) {
    modalViewObj.onLaunchButtonClick = options.onLaunchButtonClick;
    _.bindAll(modalViewObj, 'onLaunchButtonClick');
    modalViewObj.$launchButton.on("click", modalViewObj.onLaunchButtonClick);
  }
  else {
    modalViewObj.$launchButton.on("click", modalViewObj.openModal);
  
  };


  return modalViewObj;
};


GuidePlayerView = Dynamo.GuidePlayerView = Dynamo.ChooseOneXelementFromCollectionView.extend({

  // _launchButton: "<button id='guide_launcher' class='btn btn-info'>Launch Guides</button>",

  initialize: function() {
    _.extend(this, Backbone.Events);

    this.cid = _.uniqueId('c');
    
    this.guideData = this.options.guideData;

    this.collection_name = this.options.collection_name || "Guides";

    this.guideSelect = new Dynamo.ChooseOneXelementFromCollectionView({
      template: DIT["dynamo/guides/index"],
      collection_name: this.collection_name,
      collection: this.collection
    });

    this.guideSelect.on("element:chosen", function() {
      this.setAsCurrentGuide(this.guideSelect.chosen_element);
    }, this);

    if (this.options.$launchButtonContainer) {
      this.asModal = true;
      this.$launchButtonContainer = this.options.$launchButtonContainer;

      this.$launchButtonContainer.prepend(
        t.button("<i class='icon-book'></i> Launch "+this.collection_name, { 
          id: "guide_launcher", 
          class: "btn btn-info", 
          style: (this.options.launchButtonStyle || "") 
        }));

      var self = this;
      this.$launchButtonContainer.find('button#guide_launcher').click(function() { 
        self.openInModal();
      });

      this.$guideContainer = $("<div id='guide_player_container-"+this.cid+"'></div>");
      $('body').append(this.$guideContainer);
      this.$guideContainer.dialog({
        autoOpen: false,
        width: 610,
        height: 540
      });
    }
    else {
      this.asModal = false;
    };

    this.collection.on("all", this.render);
  },

  events: {
    "click .next"         : "moveForward",
    "click .previous"     : "moveBack",
    "click .finished"     : "displayGuideIndex",
    "click .lesson-index" : "displayGuideIndex",
    "click .guide-action" : "performAction"
  },

  currentSlideIndex: function() {
    return this._currentSlideIndex;
  },    

  displayGuideIndex: function() {
    this.$el.html(this.guideSelect.render().$el);
    this.guideSelect.render();
    // Set height so the buttons stay in the same place! #Matches guide 'show' view
    if (!this.asModal) {
      this.$el.find('.guide-view').css('height', (window.innerHeight * .25 + 53) ) //53 is height of footer      
    };
    
    this.guideSelect.delegateEvents()
    // remove comments etcs
  },

  moveBack: function() {
    try {
      this._currentSlideIndex = this._currentSlideIndex - 1;
      if (this._currentSlideIndex < 0) { this._currentSlideIndex = 0 };
      this.renderSlide();     
    } 
    catch (e) {
      console.warn("Error when clicking back: ", e);
    }
  },

  moveForward: function() {
    try {
      this._currentSlideIndex = this._currentSlideIndex + 1;
      if (this._currentSlideIndex > this.currentGuide.slides.length) { 
        this._currentSlideIndex = this.currentGuide.slides.length;
      };
      this.renderSlide();
    }
    catch (e) {
      console.warn("Error when clicking next: ", e);
    }
  },

  openInModal: function() {
    this.$guideContainer.dialog("open");
    this.$guideContainer.html(this.render().$el);
    this.delegateEvents();
    this.displayGuideIndex();
  },

  resetCurrentSlide: function() {
    this._currentSlideIndex = 0;
  },

  performAction: function(clickEvent) {
    var ckID = $(clickEvent.currentTarget).data("ckeditor_id");
    var action = this.currentSlide.actions.find(function(a) { return (a.get("ckeditor_id") == ckID) });
    action.execute();
  },

  setAsCurrentGuide: function(guide) {
    this.currentGuide = guide;
    this.currentGuideData = this.guideData.filter(function(g) { return g.xelement_id == guide.id });
    this.resetCurrentSlide();
    this.renderSlide();
    this.trigger("guide:selected");
  },

  render: function() {
    this.$el.html( this._template({
      collection_name: this.collection_name
    }) );
    return this;
  },    

  renderNavigationButtons: function() {
    var navButtons = this.$el.find('ul#current-guide-navigation-buttons')
    if (this.currentSlideIndex() === (this.currentGuide.slides.length - 1)) {
      navButtons.find('button.next').removeClass("next").addClass('finished').html("Finished <i class='icon-flag-checkered'></i>")        
    } else {
      // This occurs if the user gets to the end and wants to go backwards
      navButtons.find('button.finished').removeClass("finished").addClass('next').html("Next &rarr;")
    }
    // if on first slide
    if (this.currentSlideIndex() === 0) {
      navButtons.find('button').first().removeClass("previous").addClass('lesson-index').html("<i class='icon-list'></i> "+this.collection_name);;
    } else {
      navButtons.find('button').first().removeClass("lesson-index").addClass('previous').html("&larr; Previous");
    }
  },

  renderSlide: function() {
    this.trigger("guide:slide:render", this.currentSlideIndex());
    
    if (this.currentSlideIndex() === (this.currentGuide.slides.length - 1)) {
      this.trigger("guide:finished");
    }    

    if (this.$el.find("div#current-guide-slide-content").length == 0 ) {
      this.$el.html( this._template({}) );
    }
    
    if (!this.asModal) {
      // Set height so the buttons stay in the same place!
      this.$el.find('.guide-view').css('height', (window.innerHeight * .25) )      
    }

    var $slide_content = this.$el.find("div#current-guide-slide-content");

    //  Place current Guide title into correct spot in the title bar.
    this.$el.find("#current-guide-title").html(this.currentGuide.get_field_value("title"));

    $slide_content.empty();

    this.renderNavigationButtons();
    //render the current slide normally
    this.currentSlide = this.currentGuide.slides.at( this.currentSlideIndex() );  
    $slide_content.html( this.currentSlide.get_field_value("content") );
    return this;
  },

  renderComments: function(app, guide) {
    lessonComments = app.Comments.where(function(comment) {
      return ( comment.get_field_value("commented_on_id") == guide.id )
    }, { 
     comparator: function(c) { return (new Date(c.get("created_at") )); }
    });

    lessonComments.storyRoute = this.options.storyRoute;
    // lessonComments.comparator = reverseSortBy(lessonComments.comparator);
    lessonComments.sort();

    lessonCommentsView = new CommentsView({
      el: "div#lesson-comments",
      collection: lessonComments,
      collectionAtts: {
        xelement_id: guide.id
      }
    });
    lessonCommentsView.render();
  },

  renderLikes: function(app, guide) {
    guideLikes = app.Likes.where(function(like) {
      return (like.get_field_value("item_liked_id") == guide.id )
    });
    guideLikes.storyRoute = this.options.storyRoute;

    guideLikesView = new LikesView({
      el: "div#guide-likes",
      collection: guideLikes,
      collectionAtts: {
        xelement_id: guide.id
      },
      knockoutTemplate: app.templates["partial/likes"]
    });
    guideLikesView.render();
  },

  renderLikesAndComments: function(app, guide) {
    LogSessionEvent("page_view", { 
      page_id: ["string", "lesson_selected"], 
      lesson_selected_id: ["string", guide.id] 
    });
    //Once a guide is selected we can load comments and likes for the guide.
    if ( app.Likes ) { this.renderLikes(app, guide) };
    if ( app.Comments ) { this.renderComments(app, guide) };
  }

});

// Depends on https://github.com/jakesgordon/javascript-state-machine
EditGuideView = Dynamo.EditGuideView = Dynamo.BaseUnitaryXelementView.extend({
  initialize: function (options) {

    this.guidedPageSM = StateMachine.create({
      initial: 'blank',
      events: [
        { name: 'skip',   from: ['blank', 'none', 'loaded'], to: 'none'   },
        { name: 'load',   from: ['blank', 'loaded'], to: 'loaded' },
        { name: 'clear',  from: ['blank', 'loaded'], to: 'blank'  }
      ]
    });

    this.slideEditing = StateMachine.create({
      initial: 'forbidden',
      events: [
        { name: 'allow', from: ['forbidden', 'allowed'], to: 'allowed' },
        { name: 'stop', from: ['forbidden', 'allowed'], to: 'forbidden' }
      ]
    });

    _.bindAll(this);
    this.initializeAsUnitaryXelement();

    this.model.on('change', this.render, this);
    this.model.slides.on('add',     this.renderSlides,this);
    this.model.slides.on('remove',  this.renderSlides,this);
    this.model.on('sync', this.completeRender, this); //  completeRender = inherited method

    this.initializeAsSaveable(this.model);

    //update view w/ most recent save-status information
    this.model.on('sync', function(model, response, options) {
      console.log("GUIDE SAVED:", model, response, options);
      this.$el.find("div#last-save").text( "Last Saved at: "+(new Date().toLocaleTimeString()) );
    }, this)

    this.model.on('error', function(model, xhr, options) {
      console.warn("FAILED_GUIDE_SAVE:", model, xhr, options);
      this.$el.find("div#last-save").html(
        "<p style='color:red;'>Last Save FAILED at: "+(new Date().toLocaleTimeString())+"</p>"+
        "<p> You may want to try again or check the log.</p>" 
      );
    }, this);
    
    this.model.on('save_status_change', this.renderSaveStatus, this);

    this._GPOnLoadFnIsDefined = false;
    this._additionalRender = false;

  },

  attributes: function() {
    return {
      id: "guide-"+this.model.cid,
      class: "guide"
    }
  },

  events: function() {
    return {
      'keyup input#guide_title'             : "updateTitle",
      'keyup input#guide_description'       : "updateDescription",
      'click button.skip-guided-page'       : "skipGuidedPage",
      'click button.load-guided-page'       : "updateGuidedPage",
      'click button.clear-guided-page'      : "clearGuidedPage",  
      'click button.save'                   : "saveGuide",
      'click button.delete'                 : "destroyGuide"
    };
  },

  destroyGuide: function() {
    this.model.destroy();
    this.slidesView.remove();
    this.slidesView = null;
    this.$el.remove();
  },

  clearGuidedPage: function() {
    this.model.guided_page_url = "";
    this.slideEditing.stop();
    this.guidedPageSM.clear();
    this.clearInitialRender();
    this.render();
  },

  updateGuidedPage: function() {
    this.model.guided_page_url = $('input#guided_page_url').val();
    this.loadGuidedPage();
    this.guidedPageSM.load();
    this.initialRender(); 
    this.render();
  },

  initSlideReordering: function() {

    //avoid mem leak
    if (this.reorderSlidesModal) { 
      this.reorderSlidesModal.destroy(); 
      this.reorderSlidesModal = null; 
    };

    this.reorderSlidesModal = launchInModal( (new Dynamo.ReorderChildrenView({ model : this.model })), {
      $launchButton : (this.$el.find('button.sort-slides'))
    });

    this.reorderSlidesModal.viewInstance.on("reorder:finished", this.reorderSlidesModal.closeModal);

  },

  skipGuidedPage: function() {
    this.model.guided_page_url = "[None]";
    this.guidedPageSM.skip();
    this.initialRender();
    this.render();
  },

  // If we are guiding another page, then we would like to know the elements on that page.
  // this defines an on-iframe-loaded function that takes care of defining the elements of the
  // guided page on that page.
  onGuidedPageLoad: function() {
    var self = this;

    if (!this._GPOnLoadFnIsDefined) {
      
      $(this.options.iframe_selector).load(function() {

        console.log("IFRAME LOADED", this.contentWindow.Backbone);

        // We must ensure that the guided page's Backbone has finished populating the page with templates,
        // in order to get an accurate set of usable elements that exist on the guided page.
        // Hence, we wait for an event from the guided page's Backbone instance.
        //
        // This requires that the guided page be aware that it will be used by the guide editor
        // and include the line 'Backbone.trigger("PageLoad:Complete")'
        // at the end of it's page loading function(s)
        this.contentWindow.Backbone.on("PageLoad:Complete", function() {

          window.console.log("In On Backbone Page-Loaded Callback");

          // Once the iframe is loaded...
          self.usableElements = [];
          $(self.options.iframe_selector).contents().find("[id]").each(function() {
            self.usableElements.push({tagName: this.tagName.toLowerCase(), "idName": this.id, "className": this.className});
          });


          self.usableElements.sort(function(a,b) {
            // Put all elements w/ id's first
            if (a.idName && !b.idName) { return -1 }
            if (!a.idName && b.idName) { return 1  }

            // If they both have id's, sort by tag first
            if ( a.tagName < b.tagName ) {
              return -1
            }
            if ( a.tagName > b.tagName ) {
              return 1
            } 

            // Then by ID name
            if ( a.idName < b.idName ) {
              return -1
            }
            if ( a.idName > b.idName ) {
              return 1
            }

            // If we've gotten here, both id's were ""
            // if ( a.className < b.className ) {
            //   return -1
            // }
            // if ( a.className > b.className ) {
            //   return 1
            // }

            return 0;
          }); // sort

          // This line is necessary for when: 
          // someone creates a new guide, and they start creating slides before they specify a 
          // page to guide;
          // once the guided page is loaded, you must reload the slides in order to be able to 
          // get the selectors of the elements selectable in the edit-slide dialog.
          self.renderSlides();

          console.log("Usable Elements in Guided Page", self.usableElements);
          $("#iframe-container").show();
          self.trigger("guided_page:loaded");

          self = null; //Prevent a mem leak?

        }); // BB load complete

      }); //load

    }; // if
    this._GPOnLoadFnIsDefined = true;

  },

  loadGuidedPage: function() {
    $(this.options.iframe_selector).prop("src", this.model.guided_page_url);
    this.onGuidedPageLoad();
  },

  saveGuide: function() {
    this.model.save();
  },

  _template: function(data, settings) {
    if (!this.compiled_template) {
      if (!this.template) {
        this.template = this.options.template || DIT["dynamo/guides/edit"];
      };
      this.compiled_template = _.template(this.template)
    };

    return this.compiled_template(data, settings);
  },

  updateTitle: function(clickEvent) {
    var val = $(clickEvent.currentTarget).val();
    this.model.set({ 'title' : val });
    this.model.set_field_value('title', val );
  },

  updateDescription: function(clickEvent) {
    var val = $(clickEvent.currentTarget).val();
    this.model.set_field_value('content_description', val );
  },  

  initialRender: function (argument) {
    //more of a 'state-based' render when it comes to guides...

    var atts;

    if (this.model.guided_page_url === "[None]" || 
        this.model.guided_page_url === ""       || 
        this.model.guided_page_url === " ") {
      this.guidedPageSM.skip();
      // this.renderSlides();
    };

    atts = { 
      guide: this.model.fieldsToJSON(),
      guidedPageState: this.guidedPageSM.current
    };
    atts.guide.guided_page_url = this.model.guided_page_url;

    this.$el.html( this._template(atts) );

  },

  renderSlides: function() {
    var $slides_container = this.$el.find('div#slides');
    
    if (this.slidesView) {
      this.slidesView.remove();
    }

    this.slidesView = new Dynamo.ChooseOneXelementFromCollectionView({
      collection: this.model.slides,
      canCreateNew: true,
      xelement_type: 'static_html',
      checkedInputs: $slides_container.find('input:checked').data('cid')
    });

    this.model.slides.on("add", this.slidesView.render);
    this.model.slides.on("remove", this.slidesView.render);

    this.slidesView.on("element:chosen", function() {
      
      //Update Current Slide
      this.current_slide = null;
      this.current_slide = this.slidesView.chosen_element;

      //Add to collection once saved;
      if (  this.current_slide.isNew() && 
            !_.contains(this.model.slides, this.current_slide) ) {
        
        this.model.slides.add(this.current_slide);
        this.slidesView.render();
        
      };

      this.current_slide.on('change:title', this.slidesView.render, this);
      // Trigger Current Slide Change
      this.trigger("slide:chosen");

    }, this);

    $slides_container.empty();
    $slides_container.html(this.slidesView.render().$el);

    this.slideEditing.allow();

  },

  render: function (argument) {

    if (!this.initiallyRendered()) { 
      this.initialRender(); 
      this.initSlideReordering();
      this.setInitialRender();
    };

    if ( this.guidedPageSM.is('blank') && this.model.guided_page_url ) {
      this.loadGuidedPage();
      this.guidedPageSM.load();
    };

    if (!this.guidedPageSM.is('blank') && this.slideEditing.is("allowed")) {
      //refresh direct attributes (i.e., non-slides) with model values:
    _.each({ 
        title: 'input#guide_title',
        guided_page_url: "input#guided_page_url"
      }, function(value, key) {
        this.$el.children('div#guide_attributes').find(value).val( this.model.get_field_value(key) );  
      }, this);

    };

    this.renderSlides();
    this.renderSaveStatus();

    return this;
  },

  remove: function() {
    this.slidesView.remove();
    delete(this.slidesView);
    this.stopListening();
    this.$el.remove();
  }

});

EditSlideView = Dynamo.EditSlideView = Dynamo.BaseUnitaryXelementView.extend({
  
  initialize: function (options) {

    _.bindAll(this);
    this.initializeAsUnitaryXelement();
    
    this.currentTitle   = this.model.get_field_value("title");
    this.currentContent = this.model.get_field_value("content");

    this.model.on('change', this.render, this);
    // this.model.on('sync', this.completeRender, this);

    this.model.saveOnChange();

    this.initializeAsSaveable(this.model);
    this.instantiateEditorFn = this.options.instantiateEditorFn || function(options, thisView) {
      console.error("no instantiateEditorFn!")
    };
    this.instantiateEditorOptions = _.extend({ 
        selector: this.model.cid+"-slide-content"
        },( _.result(this.options, 'instantiateEditorOptions') || {}) );

  },

  attributes: function() {
    return {
      id: "slide-"+this.model.cid,
      class: "slide"
    }
  },

  destroySlide: function() {

    //b/c CKEditor has a bug:
    this.actionsView.remove();
    this.actionsView = null;
    this.model.destroy({async: false});
    this.$el.remove();

  },

  events: function() {
    var e = {};
    change_title_key                = "keyup input#"+this.model.cid+"-slide-title";
    change_content_key              = "keyup textarea#"+this.model.cid+"-slide-content";
    e[change_title_key]             = "updateTitle";
    e[change_content_key]           = "updateContent";
    e['click button.save']          = "saveSlide",
    e["click button.delete-slide"]  = "destroySlide";
    return e;
  },

  _template: function(data, settings) {
    if (!this.compiled_template) {
      if (!this.template) {
        this.template = this.options.template || DIT["dynamo/guides/slides/edit"];
      };
      this.compiled_template = _.template(this.template)
    };

    return this.compiled_template(data, settings);
  },

  consolidateActions: function(model, slideContent) {
    var actions = $(slideContent).find('button.guide-action'),
    ck_action_ids = _.map(actions, function(action) { return $(action).data("ckeditor_id") }),
    model_action_ids = model.actions.pluck("ckeditor_id");

    //Treat what is in the HTML as canonical:
    
    //If the current model action does not exist in html; destroy it
    model.actions.each(function(action) {
      if (!_.contains(ck_action_ids, action.get("ckeditor_id"))) {
        model.actions.remove(action);
        action.destroy();
      };
    });

    //If ckAction does not exist in model.actions; create it;
    _.each(ck_action_ids, function(ckActionID) {
      if (!_.contains(model_action_ids, ckActionID)) {
    
        action = _.find(actions, function(a) { return $(a).data("ckeditor_id") == ckActionID });
        $action = $(action);
        model.actions.add({
          ckeditor_id: ckActionID,
          label: $action.data("label"),
          effect: $action.data("effect"),
          duration: $action.data("duration"),
          target: null,
          actionOptions: []
        });
      }
    });

  },

  recordContent: function() {

    this.updateContent(this.$el.find('textarea.slide-content:first').val());

  },

  saveSlide: function() {
    this.model.save();
  },  

  updateTitle: _.debounce(function(clickEvent) {
    var newTitle = $(clickEvent.currentTarget).val();
    if (this.currentTitle != newTitle) { 
      this.model.set_field_value('title',  newTitle)
      this.currentTitle = newTitle;
      this.model.trigger('change');
      this.model.trigger('change:title');
    }
  }, 1000),

  updateContent: _.throttle(function(newContent) {
    if (this.currentContent != newContent) {
      this.currentContent = newContent;
      this.model.set_field_value('content', newContent );
      this.consolidateActions(this.model, newContent);
      
      this.model.trigger('change');
      this.model.trigger('change:content');          
    }
  }, 500),

  initialRender: function (argument) {
    var atts,
        actionsView;

    atts = {
      slide: this.model.fieldsToJSON()
    };
    this.$el.html( this._template( atts ) );

    if (this.editor) {
      delete(this.editor);
    }
    this.editor = this.instantiateEditorFn(this.instantiateEditorOptions, this);

    this.actionsView = new Dynamo.ManageCollectionView({
      collection: this.model.actions,
      display: { create: false, edit: true, show: false },
      guidedPageSelector: this.options.guidedPageSelector,
      enableAddExisting: false,
      editViewOpts: { 
        template: this.options.actionTemplate, 
        actionTargets: this.options.actionTargets,
        guidedPageSelector: this.options.guidedPageSelector,        
      },
      editViewClass: editActionView
    });
    
    this.$el.find('.slide-actions:first').html(this.actionsView.render().$el);

    //Set focus to title @ end of input
    var $title = this.$el.find('input.title:first');
    $title.on("focus", function() {
      this.selectionStart = this.selectionEnd = this.value.length;
    });
    $title[0].focus();

  },

  remove: function() {

    this.$el.remove();
    this.stopListening();
    delete(this.editor);

  },

  render: function (argument) {
    this.renderSaveStatus();
    if (!this.initiallyRendered()) {
      this.initialRender();
      this.setInitialRender();
    } 
    return this;
  }

});


editActionView = Backbone.View.extend({

  initialize: function(options) {
    _.bindAll(this);
    this.options = options;
    this.allActions = _.keys(ActionDictionary);
  },

  events: {
    "change select[name='effect']": "updateAction",
    "change select[name='target']" : "updateAttributes",
    "keydown input[name='action_attribute']" : "updateAttributes",
    "click .test-action": "testAction"
  },

  default_template: '<div class="action"> <span class="cell attribute"> (%= action.label %) </span> <span class="cell attribute effect"> <select name="effect" class="input-small"> (% var selected_clause; _.each(actionsAvailable, function(effect_name) { ; %) <option value="(%= effect_name %)" (% if (action.effect == effect_name) { %) selected="selected" (% } %)> (%= effect_name %) </option> (% }); %) </select> </span> <span class="cell attribute target"> <option (% if (!_.contains(actionTargets, action.target)) { %) selected="selected" (% }; %)> </option> <select name="target"> (% _.each(actionTargets, function(selector) { %) <option value="(%= selector %)" (% if (action.target == selector) { %) selected="selected" (% } %) > (%= selector %) </option> (% }); %) </select> </span> <span class="cell attribute duration"> <input class="input-small" type="text" name="duration" data-attribute-name="duration" value="(%= action.duration %)" /> ms </span> <span class="cell attribute action_attributes"> </span> <span class="cell test-action btn"> (%= action.label %) </span> </div>',
 
  _template: function(data, settings) {
    if (!this.compiled_template) {
      if (!this.template) {
        this.template = this.options.template || this.default_template;
      };
      this.compiled_template = _.template(this.template)
    };

    return this.compiled_template(data, settings);
  },

  updateAction: function(changeEvent) {
    this.model.set({ effect: $(changeEvent.currentTarget).val() });
    console.log("Action changed to: ", this.model.get('effect'));
  },

  updateAttributes: function(clickEvent) {
    var new_values = {
      label: this.$el.find("input[name='label']:first").val(), 
      effect: this.$el.find("select[name='effect']:first").val(),
      target: this.$el.find("select[name='target']:first").val(),
      duration: this.$el.find("input[name='duration']:first").val(),
      actionOptionsValues: {}
    };

    this.$el.find("input[name='action_attribute']").each(function(index, value) {
      new_values.actionOptionsValues( $(this).data('attribute-name') ) = $(this).val();
    });

    this.model.set(new_values);
  },

  updateLabel: function(changeEvent) {
    this.model.set({ label: $(changeEvent.currentTarget).val()})
    this.$el.find("button.test-action").text(this.model.get("label"));
  },

  testAction: function(clickEvent) {
    clickEvent.preventDefault();
    this.model.execute(this.options.guidedPageSelector);
  },

  render: function() {
    var viewAtts = {};
    viewAtts.actionsAvailable = this.allActions;
    viewAtts.actionTargets = this.options.actionTargets;
    viewAtts.action = this.model.toJSON();
    viewAtts.position = this.options.position;
    this.$el.html(this._template(viewAtts));
  }

});