// Backout is a small library that lets you marry together Backone.js and 
// Knockout.js.
// It provides two views, Backout.ModelView and Backout.CollectionView
// which allow to pass in a Backbone.model (or collection) and a Knockout template
// (for an individual model, in the case of a collection).
// the views take care of seemlessly wiring together the backbone's
// model attributes with knockout's in-html binding.
// they should be close to the last two backbone views you'll ever need :).
var Backout = {};

// The purpose of this view is to allow programming that still
// uses backbone for what it is good at:
// separating concerns related to collections, models, views, and events. 
//
// But to then allow you to seemlessly use Knockout 
// at what it is good at: declarative binding of 
// dom elements to model attributes, with integrated dom manipulation.
Backout.ModelView = Backbone.View.extend({

  // A knockout Template is required to 
  // be either passed into the view, 
  // a property of the model, 
  // or defined on the view class itself.
  _knockoutTemplate: function() {

    var templateOrFn = this.options.knockoutTemplate ||
                       this.knockoutTemplate         || 
                       this.model.knockoutTemplate;
    if (templateOrFn) {
      if ( _.isFunction(templateOrFn) ) {
        return templateOrFn(this.model)
      }      
      return templateOrFn;
    } else {
      throw new Error("No knockout template provided to Backout Model View.");
    };
  },

  _onSaveCb: function() {
    var cb = this.options.onSaveCb || this.onSaveCb || function(modelToSave) { 
      console.log("Saving Model...", modelToSave);
      modelToSave.save();
    }
    return cb
  },

  _onDestroyCb: function() {
    var cb = this.options.onDestroyCb || this.onDestroyCb || this.model.destroy;
    return cb
  },

  initialize: function() {
    _.bindAll(this);
    _.extend(this, Backbone.Events);
    this.createKnockoutModel();

    // Because Knockout will sync model values and dom elements, 
    // there is no need to re-render on model change.
  },

  createKnockoutModel: function() {
    this.knockoutModel = Backout.createKnockoutModel(this.model, this.options);
    this.model.on( "backout:save",    this._onSaveCb(), this );
    this.model.on( "backout:destroy", this._onDestroyCb(), this );
  },

  delegateEvents: function() {}, //overwrite in order to use knockout and not backbone

  updateKnockoutModel: function() {
    Backout.updateKnockoutModel(this.model, this.knockoutModel)
  },

  // The render function is greatly simplified, as Knockout & 
  // the supplied template will do all the heavy lifting.
  render: function() {

    this.createKnockoutModel();
    
    this.$el.html( this._knockoutTemplate() );    
    var domEl = this.$el.get(0); //this.$el.children(":first").get(0) ||
    ko.applyBindings(this.knockoutModel, domEl);
    
    this.trigger("rendered");
    return this;
  }

});

Backout.CollectionView = Backbone.View.extend({ 

  // A collection template is required to be either passed into the view, 
  // defined on the view class itself, or be a property of the collection.  
  _template: function() {
    var template = _.result(this.options, "template") || 
                   _.result(this, "template")         ||
                   _.result(this.collection, "template");
                   
    if (template) {
      return template;
    } else {
      throw new Error("No template provided to Backout.CollectionView.");
    };
  },

  // A knockout Template is required to be either passed into the view, 
  // a property of the model, or defined on the view class itself.
  _elementKoTemplate: function() {
    var template = _.result(this.options, "elementKoTemplate")   ||
                   _.result(this,         "elementKoTemplate")   || 
                   _.result(this.model,   "elementKoTemplate");
    if (template) {
      return template;
    } else {
      throw new Error("No element template provided to NewBackoutCollectionView.");
    };
  }, 

  // A knockout Template is required to be either passed into the view, 
  // defined on the view class itself, or be a property of the collection.  
  _emptyCollectionTemplate: function() {
    var template = _.result(this.options, "emptyCollectionTemplate") || 
                   _.result(this, "emptyCollectionTemplate")         ||
                   _.result(this.collection, "emptyCollectionTemplate");
                   
    if (template) {
      return template;
    } else {
      throw new Error("No emptyCollectionTemplate provided to Backout.CollectionView.");
    };
  },

  _setCollectionEvents: function() {

    this.collection.on("add", this.initialRender, this);
    this.collection.on("remove", this.initialRender, this);
    this.collection.on("reset", this.initialRender, this);
    this.collection.on("sort", this.initialRender, this);
    // this.collection.on("sync", this.render, this);

  },

  initialize: function() {
    var self = this;
    this.renderOrder = this.options.renderOrder || this.renderOrder;
    this._setCollectionEvents();
    _.result(this, 'afterInitialize');
  },

  forEachModelView: function(fntoExecute) {
    _.each(this.modelViews, fntoExecute);
  },   

  initialRender: function() {
    var self = this;

    if (self.collection.length === 0) {
      self.$el.html(   self._emptyCollectionTemplate() );
      // Do not set initiallyRendered to true, so that the next render call will also
      // run initial render if required.
      return true;
    };
    
    self.modelViews = null;
    self.modelViews = [];

    var viewInstanceOptions;
    self.collection.each(function(model) {
      viewInstanceOptions = _.extend({}, self.options, {
        tagName: "tr",
        id: model.cid,
        model: model,
        knockoutTemplate: self._elementKoTemplate()
      });
      self.modelViews.push( (new Backout.ModelView(viewInstanceOptions)) );
      model.on("backout:save", function(savedModel) { self.collection.trigger("collection:model:saved", savedModel) });
    });

    self.$el.empty();
    self.$el.html( self._template() );
    var $subEl = self.$el.find(".items:first");
    _.each(self.modelViews, function(mView) {
      if (self.renderOrder === 'reverse') {
        $subEl.prepend(mView.render().$el);
      }
      else {
        $subEl.append(mView.render().$el);  
      };
    });
    self.initiallyRendered = true;

  }, 

  render: function() {

    if (!this.initiallyRendered || (this.collection.length === 0)) {
      this.initialRender();
      return this;
    }  
    
    //else 
    _.invoke(this.modelViews, 'render');
    return this;
  }

});

// The following methods are used internally in the views above;
// 


// Takes a Backbone Model, Creates and Returns a corresponding Knockout Model,
// with events between corresponding attributes already correctly bound.
Backout.createKnockoutModel = function(BackboneModel, options) {

  var KnockoutModel = {};

  //  Fetching the desired set of attributes from the Backbone model,
  //  could conceivably be more complicated than a 'model.attributes' call.
  //  So, you can pass in an option 'getAttributes', which should be a function
  //  that accepts the BackboneModel as it's only parameter and returns the attributes object.
  var attributes;
  if (options.getAttributes) {
    attributes = options.getAttributes(BackboneModel)
  }
  else {
    attributes = BackboneModel.attributes
  }

  // Take each Backbone model attribute and build the corresponding knockout attribute.
  _.each(attributes, function(value, attr_name) {
    
    // Exclude Computed Attributes, if they exist; They are handled differently below.
    if (  !options.computedAttributes || 
          (options.computedAttributes && !options.computedAttributes[attr_name])  ) {

        Backout.createKnockoutModelAttribute(KnockoutModel, attr_name, value, options);

        // After the Knockout Model has been created, we bind together the Backbone Model Attribute
        // and the Knockout Model Attribute, so that we have symbiotic attribute value updates.
        Backout.bindTogetherBackboneAndKnockoutAttribute(BackboneModel, KnockoutModel, attr_name, options);

    };
    
  });

  // Handle Computed Attributes.
  _.each(options.computedAttributes, function(fnThatReturnsComputeFn, attr_name) {

      fnThatReturnsComputeFn.owner = KnockoutModel;
      KnockoutModel[attr_name] = ko.computed( fnThatReturnsComputeFn(BackboneModel) , KnockoutModel);

    // if the computed attribute is also an attribute in 
    // the backbone model, bind the two together.
    if (attributes[attr_name]) {
      Backout.bindTogetherBackboneAndKnockoutAttribute(BackboneModel, KnockoutModel, attr_name, options);      
    }

  });

  // Define two useful standard methods on the Knockout model, 
  // save and destory, which trigger an event on the backbone model.
  // these methods can then be called in your knockout template,
  // and any application-specific saving / destroying behavior can 
  // listen for these events on the backbone model.
  KnockoutModel.save = function() {
    BackboneModel.trigger("backout:save", BackboneModel);
  };

  KnockoutModel.destroy = function() {
    BackboneModel.trigger("backout:destroy", BackboneModel);
  };    

  // Outside of the Backbone Model's standard attributes, 
  // You can define arbitrary functions on the view model by passing 
  // them in options under the array key viewModelFunctions
  if (options.viewModelFunctions) {
    _.each(options.viewModelFunctions, function(fn, fnName) {
      KnockoutModel[fnName] = fn;
    });            
  }; 

  if (options.onSync) { BackboneModel.on('sync', options.onSync) };

  BackboneModel.on('sync', function(syncArg1, syncArg2, syncArg3) {
    console.log("sync callback is passed:", syncArg1, syncArg2, syncArg3);
  });

  return KnockoutModel;

},

// Correctly handle the creation of an individual 
// knockout model attribute based upon its datatype .
Backout.createKnockoutModelAttribute = function(KnockoutModel, attr, value, options) {

  // Object Attribute
  //
  // No foreseen way of handling an individual attribute that is also an object.
  // This case can be handled by treating the object as 
  // its own Knockout Model composed of many attributes.
  if ( !_.isArray(value) && 
       !_.isDate(value) &&
        _.isObject(value) ) { 
    console.warn("Unhandled case: attribute '"+attr+"'\'s value is an object.");
    return "";
  };

  // Date Attribute
  // 
  // a Date attribute is split up into 5 component attributes, [attr_name]_year ->  [attr_name]_minute
  if ( _.isDate(value) ) {
    var y = value.getFullYear(),
        m = value.getMonth(),
        d = value.getDate(),
        h = value.getHours(),
        min = value.getMinutes();
    KnockoutModel[attr+"_year"] = ko.observable(y)
    KnockoutModel[attr+"_month"] = ko.observable(m)
    KnockoutModel[attr+"_date"] = ko.observable(d)
    KnockoutModel[attr+"_hour"] = ko.observable(h)
    KnockoutModel[attr+"_minute"] = ko.observable(min)
    KnockoutModel[attr] = ko.computed(function() {
      var s = this;
      return new Date(  s[attr+"_year"](), 
                        s[attr+"_month"](), 
                        s[attr+"_date"](), 
                        s[attr+"_hour"](), 
                        s[attr+"_minute"]() );
    }, KnockoutModel);
  }

  // Array Attributes.
  // A method for removing an element of the array is defined on each element
  // the element's value is treated as it's own observable.
  if ( _.isArray(value) ) {

    // If you have an array attribute, 
    // you must define what the default value for an element of the array
    // should be in the options  object key 'arrayDefaults'
    var defaultElValue = options.arrayDefaults[attr], 
        elementConstructor = function(element_value) {
          return {
            value: ko.observable(element_value),
            remove: function() { 
              KnockoutModel[attr].remove(this)
            }
          }
        };

    //Define the observable array, using the defined elementConstructor.
    KnockoutModel[attr] = ko.observableArray(
      _.map(value, function(el) { return new elementConstructor(el) })
    );

    // Any array will benefit from having an available add function.
    // So, this defines a method on the knockout model 
    // for adding an element to this attribute array
    KnockoutModel[attr+"_addElement"] = function() {
      KnockoutModel[attr].push( new elementConstructor(defaultElValue) );
    };

  };

  // The easy cases: attributes that are Strings, Numbers, and Booleans.
  if (  _.isString(value) || 
        _.isFinite(value) ||  
        _.isBoolean(value) 
     ) {
    // console.log("setting "+attr+" to "+value);
    KnockoutModel[attr] = ko.observable(value);
  };

  // A null or undefined value is handled as a boolean.
  if ( _.isNull(value) || 
       _.isUndefined(value)
     ) {
    KnockoutModel[attr] = ko.observable(false);
  };

  // Unhandled: Function(not possible in Backone?),
  // NaN, Infinity - what to do in this case?

  return KnockoutModel
},

// Tie together updates to attribute values between knockout and backbone, 
// so that they communicate (hopefully) seamlessly on a per-attribute level.
Backout.bindTogetherBackboneAndKnockoutAttribute = function(BackboneModel, KnockoutModel, attr_name, options) {

  // If any change is made to a Backbone Model attribute 
  // (i.e., that comes from Backbone), then the  Knockout Model needs to be updated accordingly.
  BackboneModel.on('change:'+attr_name, function(value) { 
    Backout.updateKnockoutModelAttribute(BackboneModel, KnockoutModel, attr_name, value) 
  });

  // Any changes that knockout will make to the view, should be made in the Backbone Model.
  // HOWEVER, we cannot trigger a normal change event on the backbone model, or 
  // we will enter an infinite loop considering the needed on-change event above.
  // So, instead, we call set with {silent:true}, 
  // and trigger a different event on the backbone model: 'change:fromKnockout';
  KnockoutModel[attr_name].subscribe(function(newValueFromKnockout) {
    var set_obj = {};
    console.log("Updating "+attr_name, "To new value from KO:", newValueFromKnockout);
    if (options.setAttribute) {
      options.setAttribute(BackboneModel, attr_name, newValueFromKnockout)
    } else {
      set_obj[attr_name] = newValueFromKnockout;
      BackboneModel.set(set_obj, { silent:true });      
    }
    BackboneModel.trigger("change:fromKnockout");
    BackboneModel.trigger("change:fromKnockout:"+attr_name);
  });
};

Backout.updateKnockoutModel =  function(BackboneModel, KnockoutModel) {
  _.each(BackboneModel.attributes, function(val, attr) {
    Backout.updateKnockoutModelAttribute(BackboneModel, KnockoutModel, key, val);
  });
};

// Use the Knockout Model Attribute's observable to update its value.
Backout.updateKnockoutModelAttribute = function(BackboneModel, KnockoutModel, attr, value) {
  if (typeof(value) == void 0) {  value = BackboneModel.get(attr)  };
  var observable = KnockoutModel[attr]; // returns the observale function.
  observable(value); // set the new value.
};