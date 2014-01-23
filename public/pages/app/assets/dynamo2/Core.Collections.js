// Dynamo.Collections.js

Dynamo.Collection = Backbone.Collection.extend({
  initialize: function() {
    _.bindAll(this)
  },
  storeName: function() { return (_.result(this, "codeModelName") + "_store") },
  codeCollectionName: "dynamo_collection",
  codeModelName: function() { var m = new this.model(); return m.codeName },
  prettyModelName: function() { var m = new this.model(); return m.prettyName }
});

XelementCollection = Dynamo.XelementCollection = Dynamo.Collection.extend({

  model: Dynamo.XelementClass,
  codeCollectionName: "xelements",
  prettyCollectionName: "Xelements",

  url: function() { return Dynamo.TriremeURL+'/xelements' }

});

UserCollection = Dynamo.UserCollection = Dynamo.Collection.extend({

  model: Dynamo.User,
  codeCollectionName: "users",
  url: function() { return Dynamo.TriremeURL+'/users' }

});

GroupCollection = Dynamo.GroupCollection = Dynamo.Collection.extend({

  model: Dynamo.Group,
  codeCollectionName: "groups",
  url: function() { return Dynamo.TriremeURL+'/groups' }

});

DataCollection = Dynamo.DataCollection = Dynamo.Collection.extend({

  codeCollectionName: "data_store",
  model: Dynamo.Data,

  initialize: function(models, options) {
    _.bindAll(this);
    this.models = models || [];
    this.options = options || {};
  },

  group_id: function() {
    return _.result(this.options, 'group_id')
  },

  server_url: function() {
    return _.result(this.options, 'server_url') || Dynamo.TriremeURL
  },

  user_id: function() {
    return _.result(this.options, 'user_id')
  },

  url: function() {
    return  this.server_url() +
            "/data/groups/"   + this.group_id()   +
            "/users/"         + this.user_id()    +
            "/xelements/"     + this.xelement_id();
  },

  xelement_id: function() {
    return _.result(this.options, 'xelement_id')
  }

});