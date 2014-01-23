define([], 
  function(   ) { 

  var WidgetView = Backbone.View.extend({

    initialize: function(options) {
      _.bindAll(this);
      _.extend(this, Backbone.Events);
      this.model.on("change", this.render);
      this.model.on("destroy", this.remove);
      
      if (options.widgetAvailableToday) {
        this.isAuthorized = options.widgetAvailableToday(this.model.get("authIdentifier"));
      }
      else {
        this.isAuthorized = true;
      };
      
      return true;
    },

    events: function() {

      if (this.isAuthorized) {
        return { "click .homepage-widget": "goToRoute" }
      }
      else {
        return {}
      }
      
    },

    buildImage: function(image_uri) {
      if (image_uri.indexOf("icon-") !== -1) {
        // icon
        return "<i class='"+image_uri+"'></i>"
      } else {
        // image
        var src;
        src = image_cdn + image_uri;
        return "<img src='"+src+" '/>"
      }
    },

    goToRoute: function() {
      $('.active').removeClass("active");
      this.$el.addClass("active");
      var destination = this.model.get("href"),
          fullPathPattern = /http\:/,
          relativePathPattern =/\.html/;

      this.trigger("beforeNavigation");

      if (fullPathPattern.test(destination)) {
       window.location = destination
      };
      if (relativePathPattern.test(destination)) {
        Dynamo.redirectTo( destination )
      }
      else {
        this.options.router.navigate(destination, { trigger: true } );  
      };

    },

    truncatedInfoText: function() {
      var text;
      if (this.isAuthorized) {
        text = this.model.get("information_text") || "";
        if (text.length > 50) { text =  text.substr(0, 50) + "..." }
      }
      else {
        text = "<i class='icon-info-sign'></i> Not Available Today.";
      }
      return text
    },

    disabledStatus: function() {
      var status;
      if (this.isAuthorized) {
        return status = '';
      } else {
        return status = 'disabled';
      };
    },

    // template: "<div class='homepage-widget panel-(%= cssClass %) (%= disabled_status %)'>"+
    //             "<div class='panel-heading'>(%= title %)(%= front_badge %)</div>"+
    //           "</div>",
    template: '<a href="(%= href %)" class="homepage-widget" (%= disabled_status %)>'+
                '<i class="(%= front_badge %)"></i> <span class="name">(%= title %)</span>'+
              '</a>',

    _template: function(data, settings) {
      if (!this.compiled_template) {
        this.template =  this.options.template || this.template;
        this.compiled_template = _.template(this.template);
      };
      return this.compiled_template(data, settings);
    }, 

    render: function() {
      if (!this.isAuthorized) {
        //For production, it is desired that the widget not be displayed at all.
        this.$el.remove();
      } else {
        this.$el.css("display", "block");
        var dict = {
              id                : this.model.cid || "",
              guid              : this.model.guid || "",
              cssClass          : this.model.get('cssClass') || "",
              title             : this.model.get("title"),
              front_badge       : this.model.get("front_badge"),
              href              : ("#"+this.model.get("href")),
              disabled_status   : this.disabledStatus(),
              information_text  : this.truncatedInfoText()
        };
        this.$el.html( this._template(dict) );
      }
      return this;
    }
  });

  return WidgetView;
});
