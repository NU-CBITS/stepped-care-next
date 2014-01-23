Dynamo.EditApplication = Dynamo.BaseUnitaryXelementView.extend({

  events: {
    "click button.save": "saveModel"
  },

  template: _.template(''+
    '<h1><i class="icon-globe"></i>Project TECH</h1>'+
    '<div id="last-save"></div>'+
    '<div class="save_status"></div>'+
    '<div class="btn-toolbar">'+
      '<button class="btn btn-primary save">Save</button>'+
      '<a href="#assets" class="btn btn-success"><i class="icon-plus"></i> Add Application Asset</a>'+
    '</div>'+
    '<div id="xelements-list"></div>'
  ),

  initialize: function() {
    var self = this;
    _.bindAll(this);

    this.initializeAsUnitaryXelement();
    this.model.on('change', this.render);
    this.model.on('sync', this.completeRender);
    this.initializeAsSaveable(this.model);
    this.model.saveOnChange();

    //Update view w/ most recent save-status information
    this.model.on('sync', function(model, response, options) {
      console.log("SUCCESSFUL SAVE:", model, response, options);
      self.$el.find("div#last-save").text( "Last Saved at: "+(new Date().toLocaleTimeString()) );
    })

    this.model.on('error', function(model, xhr, options) {
      console.warn("FAILED SAVE:", model, xhr, options);
      self.$el.find("div#last-save").html(
        "<p style='color:red;'>Last Save FAILED at: "+(new Date().toLocaleTimeString())+"</p>"+
        "<p> You may want to try again or check the log.</p>" 
      );
    });

  },

  appendXelement: function(asset) {
    var view = new Dynamo.editAssetView({ model:asset });
    this.$el.find("#xelements-list").append(view.render().$el)
  },  

  render: function() {
    var self = this;
    this.$el.html(this.template());
    this.model.required_xelements().each(self.appendXelement);
    this.renderSaveStatus();
    return this;
  },

  saveModel: function() {
    this.model.save();
  }

});

editAssetView = Dynamo.editAssetView =  Backbone.View.extend({

  tagName: "div",
  className: "xelement as-edit-asset",

  initialize: function() {
    _.bindAll(this)
  },

  events: function() {
    var e = {}, key;
    
    key =  "change input."+this.model.cid;
    e[key] = "updateAttribute"; 

    return e;
  },

  template: _.template(""+
    "<div class='row-fluid'>"+
      "<h3 class='span4' style='margin-top:0px'>(%= title %)</h3>"+
      "<table>"+
        "<tr><th>Attribute</th><th>Value</th></tr>" +
        "(% _.each(authProperties, function(prop) { %)" +
          "<tr>"+
            "<td>(%= propertyLabels[prop] %)</td>" +
            "<td><input class='(%= cid %)' name='(%= prop %)' type='number' value='(%=  model[prop] %)' min='1' max='730' /></td>" +
          "</tr>"+
        "(% }); %)" +
      "</table>"+
    "</div>"+
    "(% if (hasSubElements) { %)" +
      "<div class='row-fluid'>"+
        "<div class='sub-xelements well' style='margin-left:20px'></div>"+
      "</div>" +
    "(% } %)"
  ),

  updateAttribute: function(changeEvent) {
    var $input = $(changeEvent.currentTarget);
    this.model[($input.attr('name'))] = $input.val();
    currentApplication.setUnsavedChanges();
  },

  render: function() {
    var self = this;

    var hasSubElements = (this.model.required_xelements().length > 0);

    var templateObj = {
      cid: this.model.cid,
      title:this.model.get_field_value("title"),
      authProperties: currentApplication.authorizingProperties,
      propertyLabels: currentApplication.authorizingPropertyLabels,
      model: {},
      hasSubElements: hasSubElements
    };
    _.each(currentApplication.authorizingProperties, function(authProp) {
      templateObj.model[authProp] = self.model[authProp] || 
                                    currentApplication.authorizingPropertyDefaults[authProp];
    });

    this.$el.html( this.template(templateObj) );

    if (hasSubElements) {

      this.model.required_xelements().each(function(model) {
        var subXelementsView = new Dynamo.editAssetView({ model: model });
        self.$el.find('div.sub-xelements:first').append(subXelementsView.render().$el);
      });  

    };

    return this;
  }

});
