// Guides.Models.js

GuideModel = Dynamo.GuideModel = Dynamo.XelementClass.extend({

  // Values:
  codeName: "guide",
  prettyName: "Guide",

  // Functions:
  initialize: function () {
    _.bindAll(this);

    this.initAsXelement();
    this.set_field_value('xelement_type', 'guide');

    // Metacontent Attributes:
    this.guided_page_url = this.getPageURL();

    this.buildSlides(); //instantiates dependent slide xelements
    //rebuild slides if something changes "required_xelement_ids"
    this.on("change:xel_data_values:required_xelement_ids", function() {
      this.buildSlides();
    }, this);

    this._originalSave = this.save;
    this.save = this._updateAndSave;

    // NO LONGER SAVING SLIDES WHEN THE GUIDE IS SAVED...
    
  },

  // _updateAndSave
  // updates the Guides own attributes before issuing 
  // an original save call back to the server.
  // Called internally by 'save' or by '_delayedSave' as appopriate
  _updateAndSave: function() {
    console.log("IN _updateAndSave");
    this.updatePageURL();
    this.updateSlides();
    this.once('sync', function() { 
      console.log("IN _updateAndSave SYNC CALLBACK");
      this._currentlySaving = false;
      this._currentlySavingGuide = false;
      this.trigger('save_status_change');
    }, this);
    this._originalSave();
  },

  _delayedSave: _.debounce(function() { 
    console.log("IN _delayedSave");
    this._updateAndSave() 
  }, 2000),

  _CompleteSlidesCollection: function() {
    return Dynamo.ALL_SLIDES || SLIDES
  },

  buildSlides: function() {
    var slideIds, 
        fromCollectionSlideModels,
        AllSlides = this._CompleteSlidesCollection();

    // Ensure some collection of slides exists.
    if (!AllSlides) {
      console.warn("No existing SLIDES collection on Guide instantion. Setting slides to empty.")
      this.slides = new SlideCollection(); 
      return;
    };

    // Get array of slide ids from 'required_xelement_ids' attribute.
    try {
      slideIds =  JSON.parse( this.get_field_value("required_xelement_ids") )
    }
    catch (e) {
      slideIds = this.get_field_value("required_xelement_ids");
    };
    console.log("Slide IDs: ", slideIds);

    // If any of the ids in required_xelement_ids does not return as a valid
    // slide in the universe of known slides, then we have an inconsistency problem.
    // Choose to resolve it by assuming we must sync our collection of slides with the server
    // and then retry building the slides collection.
    // (This assumption could be wrong if there were a more grievous inconsistency 
    // such as a non-slide is within this guide's required_xelement_ids).
    if ( !(_.all(slideIds, function(slideId) { 
      return AllSlides.get(slideId)
      })) ) {

      // Allows the developer to ignore this scenario.
      // This became useful on the Guide Index Page of the guide editor,
      // When the guides didn't need their slide collections to be accurate
      // --gs, 9/11/2013
      if (AllSlides._ignoreSlideInconsistency) {
        this.slides = new SlideCollection(); 
        return;        
      };

      AllSlides.once("sync", function() {
        console.log("Universal Slides Collection Synced, triggering slides rebuild.");
        this.buildSlides();
      }, this);
      AllSlides.fetch();

      return;
    };

    //
    // Other possibilities exhausted, can now update this guide's collection of slides.
    //

    // Fetch the Slide models as they are seen in the universal collection of slides.
    fromCollectionSlideModels = _.map( slideIds, function(id) { return AllSlides.get(id) }) || [];
    console.log("Slide Models:", _.map(fromCollectionSlideModels, function(sm) { 
        return sm.get_field_value("title") 
      }) 
    );

    // Merge together content from what is in the collection, and the
    // collection of slides currently already a part of this guide,
    // assuming superiority of content from slides that are part of this guide (must be more recently edited by the user).

    if (this.slides) {
      _.each(fromCollectionSlideModels, function(fromCollectionSlide, arrayIndex) {
        if (this.slides.get(fromCollectionSlide.id)) { fromCollectionSlideModels[arrayIndex] = this.slides.get(fromCollectionSlide.id); }
      }, this);      
    }

    // Update slide collection & sort.
    this.slides = new SlideCollection(fromCollectionSlideModels);
    this.slides.comparator = function(slide) {
      return _.indexOf(slideIds, slide.id);
    };
    this.slides.sort();

    this.trigger("change:slides");
    this.initSlideObserver();

  },

  initSlideObserver: function() {
    this.slideObserver = null;
    this.slideObserver = _.extend({}, Backbone.Events);
    this.slideObserver.stopListening();
    this.slideObserver.listenTo(this.slides, "add",    this.initSlideObserver);
    this.slideObserver.listenTo(this.slides, "remove", this.initSlideObserver);
    this.setUnsavedChanges();
  },

  defaults: function() { 
    return this.defaultsFor('guide');
  },

  //  defaultSelectNext
  //  When progressing through a Guide it will be possible that a Guide specify some sort of algorithm
  //  (probably as part of its metadata) to calculate what slide should be shown next.
  //
  //  To allow for this, we define the following such method as a default and
  //  possible first attempt at specifying the function signature 
  //  for such methods in general.
  //  In the general case, the selectNext method would expect:
  //
  //  1) a guide, 
  //  2) an array, listing (in-order) the ids of slides already visited up til now
  //  3) a DataModel object which stores a set of user-given answers to those answered slides.
  //  
  //  It should return: The id of the next slide that the user should be presented.
  //  
  //  This default implementation simply selects the next slide (based upon index) 
  //  in the array of a Guide's 'slides' attribute.
  defaultSelectNext: function(guide, visitedSlideIds, responseData) {
    console.log("In defaultSelectNext. (guide, visitedSlideIds, responseData):", guide, visitedSlideIds, responseData);
    if (guide.slides.length == 0) {
      // alert("It seems that guide '"+guide.id+"' has no slides.");
      return 0;
    };
    var next_q = guide.slides.at(visitedSlideIds.length);
    return next_q.id;
  },

  getPageURL: function () {
    return this.metacontent().guided_page_url;
  },

  updatePageURL: function () {
    var mc = this.metacontent();
    mc.guided_page_url = this.guided_page_url;
    return this.set_field_value('metacontent_external', mc);
  },

  updateSlides: function() {
    this.set_field_value('required_xelement_ids', (_.compact(this.slides.pluck("guid"))) );
  },

  urlRoot: function() { return Dynamo.TriremeURL+'/xelements' },

  viewClass: function() { return showGuideView; },

  editViewClass: function() { return Dynamo.editGuideView; }

});

SlideModel = Dynamo.SlideModel = Dynamo.XelementClass.extend({
  //values:
  codeName: "slide",
  prettyName: "Slide",
  //functions:
  initialize: function () {

    _.bindAll(this);
    this.initAsXelement();
    this.set_field_value('xelement_type', 'static_html');
    
    this.contentModel = new Backbone.Model({ content: this.getContent() });
    this.contentModel.on('all', this.updateContent);

    this.actions = new Dynamo.SlideActionCollection(this.getActions());
    this.actionObserver = {};
    _.extend(this.actionObserver, Backbone.Events);
    this.initActionObserver();

  },

  defaults: function() { 
    var d = this.defaultsFor('static_html');
    d.title = d.xel_data_values.title = "Slide ";
    if (this.collection) { 
      d.title = d.xel_data_values.title = d.title + (this.collection.length + 1);
    }
    return d;
  },
  
  getActions: function () {
    return this.metacontent().actions;
  },

  getContent: function () {
    return this.get_field_value('content');
  },

  updateActions: function () {
    var mc = this.metacontent();
    mc.actions = this.actions.toJSON();
    this.set_field_value('metacontent_external', mc);
    this.trigger('change');
    this.trigger('change:actions');
  },

  updateContent: _.throttle(function(new_content) {
    return this.set_field_value('content', this.contentModel.get('content') );
  }, 500),

  initActionObserver: function() {
    this.actionObserver.stopListening();
    this.actionObserver.listenTo(this.actions, "add", this.initActionObserver);
    this.actionObserver.listenTo(this.actions, "remove", this.initActionObserver);
    this.actions.each(function(action) {
      this.actionObserver.listenTo(action, "change", this.updateActions)
    }, this);
    this.updateActions();
  },

  urlRoot: function() { return Dynamo.TriremeURL+'/xelements' },

  viewClass: function() { return showSlideView; },

  editViewClass: function() { return editSlideView; }

});

ActionDictionary = {
  "blind" : {
    attributes: [],
    datatypes: [],
    units: []
  },
  "bounce" : {
    attributes: [],
    datatypes: [],
    units: []
  },
  "clip" : {
    attributes: [],
    datatypes: [],
    units: []
  },
  "drop" : {
    attributes: [],
    datatypes: [],
    units: []
  },
  "explode" : {
    attributes: [],
    datatypes: [],
    units: []
  },
  "fade" : {
    attributes: [],
    datatypes: [],
    units: []
  },
  "fold" : {
    attributes: [],
    datatypes: [],
    units: []
  },
  "highlight" : {
    attributes: [],
    datatypes: [],
    units: []
  },
  "puff" : {
    attributes: [],
    datatypes: [],
    units: []
  },
  "pulsate" : {
    attributes: [],
    datatypes: [],
    units: []
  },
  "scale" : {
    attributes: [],
    datatypes: [],
    units: []
  },
  "shake" : {
    attributes: [],
    datatypes: [],
    units: []
  },
  "size" : {
    attributes: [],
    datatypes: [],
    units: []
  },
  "slide" : {
    attributes: [],
    datatypes: [],
    units: []
  },
  "transfer" : {
    attributes: [],
    datatypes: [],
    units: []
  }  
};

SlideActionModel = Dynamo.SlideActionModel = Backbone.Model.extend({
  
  defaults: {
    label: "ButtonText",
    effect: "pulsate",
    target: "", //a css-style/jquery selector
    duration: 400,
    actionOptions: [],
    actionOptionValues: {}
  },

  effectOptions: function() {
    return {}
  },

  execute: function(iframeSelector) {
    var duration;

    var $targets = this.get("target");
    if ($targets == "") {
      alert("The action does not have a valid target; please try selecting a switching the target selected in the select box.");
      return false;
    }

    try { 
      duration = parseInt(this.get("duration")) 
    } 
    catch (e) { 
      console.warn("Duration is not parse-able as a number!", this.get("duration"), "; instead, setting to 400ms");
      this.set({"duration": 400});
      duration = 400;
    }

    var self = this;
    if (iframeSelector) {
      
      $(iframeSelector).contents().find($targets).each(function() {
        // if target is not currently viewable, show it.
        if ( $(this).is(":hidden") )  {
          $(this).parents().andSelf().each(function() {
            $(this).show();
          })
        };

        $(this).effect(self.get("effect"), self.effectOptions(), duration);

      });

    } else {
    
      $targets.each(function() {
        if ( $(this).is(":hidden") )  {
          $(this).parents().andSelf().each(function() {
            $(this).show();
          });
        };
        $(this).effect(self.get("effect"), self.effectOptions(), duration);
      });

    }

    self = null; //prevent a mem leak?
    
  }

});

SlideActionCollection = Dynamo.SlideActionCollection = Backbone.Collection.extend({
  codeModelName: function() { return "action" },
  prettyModelName: function() { return "Action" },
  model: Dynamo.SlideActionModel,
});