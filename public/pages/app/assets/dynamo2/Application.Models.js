// ApplicationModel
// The ApplicationModel defines the element that represents the entire bundled application.
// Since it is evolving, the meaning of each field within the context of the ApplicationModel
// as opposed to the meaning in other models is not yet completely defined.
// what follows are the fields defined thus far.
// - required_xelement_ids: 
//  It's required_xelement_ids should be the list of the various application assets 
//  which make up the applicaiton. For instance, one may be the id of the Activity Calendar, 
//  or a particular assessment.  The ids of the elements on which these other xelements depend
//  should not be included at this level, as they will already be specified in the 
//  required_xelement_ids of those xelements.  That is, if a particular assessment is part of 
//  the application, one should only include the id of the question_group, not the 
//  individual questions
// - metacontent keys:
//  - authorizingProperties: array of strings which signify the attributes used by this 
//      application for authorization.
//  - authorizingPropertyValues: an object which details the value of each authorizing Property 
//      for each required xelement (and their required xelements, if applicable). The object has
//      a nesting structure to accomodate the possibility for multiple nesting of assets.
//      The structure of the authorizingPropertyValues object should be as follows:
//  
//    "[id-of-required_xelement_1]" : {
//      "self" : { 
//        [authorizing_property_1] : [value_for_authorizing_property_1],
//        [authorizing_property_2] : [value_for_authorizing_property_2],
//      },
//      "sub-elements": {
//        "[id-of-xelement_required_by_required_xelement_1]" : {
//          "self": { 
//            [authorizing_property_1] : [value_for_authorizing_property_1],
//            [authorizing_property_2] : [value_for_authorizing_property_2],
//          },
//          "sub-elements": {
//            ....
//          }      
//        },
//        ...
//      }           
//    },
//    ...
//
// - content: (?) It might make sense to have this hold the router for the application, 
//                or the entire content of the application's homepage?
ApplicationModel = Dynamo.ApplicationModel = Dynamo.XelementClass.extend({

  authorizingProperties : ["firstAvailability", "lastHomepageDay"],

  authorizingPropertyTypes : {
    firstAvailability: "integer",
    lastHomepageDay: "integer"
  },

  authorizingPropertyDefaults : {
    firstAvailability : 1,
    lastHomepageDay : 1
  },

  authorizingPropertyLabels: {
    firstAvailability : "First Available on Day",
    lastHomepageDay : "On Homepage Until"
  },

  _toPropertyType : function(val, authProperty) {
    return Dynamo.strToType(this.authorizingPropertyTypes[authProperty], val);
  },

  // Values:
  codeName: "application",
  prettyName: "Application",

  // Functions:
  initialize: function (attributes, options) {
    _.bindAll(this);
    options = options || {};

    this.initAsXelement();
    this.set_field_value('xelement_type', 'application');
    this.listenTo(this.required_xelements(), 'all', this.recalculateXelementIds);

    this.originalSave = this.save;
    this.save = this.applicationSave;

    this.authorizingProperties =  this.metacontent().authorizingProperties || 
                                  options.authorizingProperties || 
                                  this.authorizingProperties;

    this.authorizingPropertyTypes =   this.metacontent().authorizingPropertyTypes || 
                                options.authorizingPropertyTypes || 
                                this.authorizingPropertyTypes;

    this.authorizingPropertyDefaults =  this.metacontent().authorizingPropertyDefaults || 
                                        options.authorizingPropertyDefaults || 
                                        this.authorizingPropertyDefaults;

    this.authorizingPropertyLabels =  this.metacontent().authorizingPropertyLabels || 
                                      options.authorizingPropertyLabels || 
                                      this.authorizingPropertyLabels;                                                                                                  


    this.loadAssetAuthorizingProps(this.required_xelements(), this.metacontent().authorizingPropertyValues);

  },

  applicationSave: function(key, value, options) {

    var authorizingPropertyValues = this.buildAllAssetsAuthPropValues( this.required_xelements(), {} );
    this.setMCKey("authorizingPropertyValues", authorizingPropertyValues);
    this.originalSave(key, value, options);

  },

  defaults: function() { 
    return this.defaultsFor('application');
  },  

  loadAssetAuthorizingProps: function(elements, authorizingObject) {
    var self = this;
    authorizingObject = authorizingObject || {};
    
    elements.each(function(xel) {

      if ( !_.isObject(authorizingObject[xel.id]) ) {
        authorizingObject[xel.id] = {
          self: {},
          sub_elements: {}
        };
      }

      var elAuthObj = authorizingObject[xel.id];

      _.each(self.authorizingProperties, function(authProperty) {

        if (  !elAuthObj ||
              !elAuthObj["self"] ||
              _.isUndefined(elAuthObj["self"][authProperty]) || 
              _.isNull(elAuthObj["self"][authProperty]) 
            ) {

            xel[authProperty] = null;

        } else {
          
          authPropVal = elAuthObj["self"][authProperty];

          try {

            xel[authProperty] = self._toPropertyType(authPropVal, authProperty);  

          }
          catch (error) {

            console.warn( 
              ( 
                "Strange value for authorizing property, '"+(authProperty)+
                "' found in application "+ (self.get_field_value('title')) + 
                "for asset "+ (xel.id) + " ("+authPropVal+")"+" setting it to null."
              )
            );

            xel[authProperty] = null;

          };

        } // else

      });

      if ( xel.required_xelements().length > 0 ) {

        self.loadAssetAuthorizingProps(xel.required_xelements(), authorizingObject[xel.id]["sub_elements"]);

      };

    });

    self = null;
    elements = null;
    availability = null;

  },

  // Building asset availability done in this two-method method in order to avoid
  // a previous stack overflow bug: more efficient b/c singleAsset method checks to see
  // if an element has already been done, and if so, skips that part of the tree.
  buildAllAssetsAuthPropValues: function (elements) {

    var self = this, 
        authorizingPropertyValues = {};

    this.required_xelements().each(function(xel) {

      authorizingPropertyValues = _.extend({}, self.singleAssetAuthPropValues(xel, authorizingPropertyValues));

    });

    self = null;
    elements = null;
    return authorizingPropertyValues;

  },

  // Building asset availability done split between these two methods in order to avoid
  // a previous stack overflow bug (actual stack overflow, not the .com). 
  // This method pair probably more efficient / avoids the stack overflow b/c 
  // the depth of the tree is kep significantly lower than 1 method which would recurse over all branches 
  // before returning & also in-between elements in buildAll, 
  // the garbage collector probably has a chance to recoup memory.
  singleAssetAuthPropValues: function(element, authPropValues) {
    var self = this;
    
    if ( !_.isObject(authPropValues[element.id]) ) {
      authPropValues[element.id] = { self : {} };
    };

    _.each(this.authorizingProperties, function (property) {
      
      if ( !_.isUndefined(element[property]) ) {

        authPropValues[element.id]["self"][property] = element[property];

      }

    });

    var subElement_AuthPropVals = {};
    element.required_xelements().each(function(xel) {
      if (!subElement_AuthPropVals[xel.id]) {
        _.extend(subElement_AuthPropVals, self.singleAssetAuthPropValues(xel, subElement_AuthPropVals) );
      };
    });

    authPropValues[element.id]["sub_elements"] = subElement_AuthPropVals;

    return _.extend({}, authPropValues);  

  }

});