//  Guides.Collections.js
//
//  Before this Dynamo Mantle File can be used, the following must be defined:
//    Core.Collections.js
//    Guides.Models.js

GuideCollection = Dynamo.Collection.extend({

  model: Dynamo.GuideModel,
  codeCollectionName: "guides",
  prettyCollectionName: "Guides",

  comparator: function(qgroup) {
    return qgroup.get_field_value("title");
  },

  url: function() { return Dynamo.TriremeURL+'/xelements?filter={"latest.xelement_type":"guide"}' }

});

SlideCollection= Dynamo.SlideCollection = Dynamo.Collection.extend({

  model: Dynamo.SlideModel,
  codeCollectionName: "slides",
  prettyCollectionName: "Slides",

  // comparator: function(slide) {
  //   return slide.get_field_value("position");
  // },

  url: function() { return Dynamo.TriremeURL+'/xelements?filter={"latest.xelement_type":"static_html"}' }

});


// SlideActionCollection = Dynamo.Collection.extend({

//   model: SlideActionModel,
//   codeCollectionName: "slide_actions",
//   prettyCollectionName: "SlideActions"

// });