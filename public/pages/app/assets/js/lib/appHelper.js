define(["views/widget_view", ], 
  function(     WidgetView) {

	var appHelper = {};

  appHelper.addWidgetToElement = function(model, selector) {
    var view = new WidgetView({ 
      el: selector,
      model: model,
      router: app.router,
      widgetAvailableToday: appHelper.widgetAvailableToday
    });
    // view.on("beforeNavigation", function() {
    //   app.trigger("beforeNavigation");
    // });
    view.render();
    return view;
  };

	appHelper.checkForNewEvents = function(container, dataSets) {
	  console.log("checkForNewEvents");

	  var numBefore = {};

    // Find out how many of each collection exist before an update
	  _.each(dataSets, function(gwd) {
	    numBefore[gwd] = (container[gwd]).all().length
	  });

    // Fetch each collection
    _.each(dataSets, function(ds) {
      if ( _.isFunction(container[ds].fetchAll) ) {
        container[ds].fetchAll({async : false});
      }
      else {
        container[ds].fetch({ async:false });
      }
    });
    
    // Compare previous to now.  
    // If there have been new events, trigger an event on the collection.
	  _.each(dataSets, function(gwd) {
	    if (numBefore[gwd] !== (container[gwd]).all().length) {
	      console.log("New ", gwd);
	      (container[gwd]).trigger("change:from_server");
	    }
	  });
	  
	  setTimeout(appHelper.checkForNewEvents, 10*1000, container, dataSets);
	};

  appHelper.createFeedEvent = function(atts) {
    var feedEvent = new Dynamo.Data({
      user_id: Dynamo.CurrentUser().id,
      group_id: Dynamo.CurrentUser().get("group_id"),
      xelement_id: SITE_EVENTS_GUID
    });

    feedEvent.set_field( "username", "string",  atts.username);
    feedEvent.set_field( "action", "string", atts.action);
    feedEvent.set_field( "category", "string", atts.category);
    feedEvent.set_field( "direct_object_id", "string", atts.direct_object_id );
    feedEvent.set_field( "message", "string", atts.message);
    if (atts.story_route) {
      feedEvent.set_field( "story_route", "string", atts.story_route);
    };

    feedEvent.save(null, { async: false });
      
  };

  appHelper.flashMessageTemplate = _.template(""+
    "<div class='flash-message well (%= kind %)'>"   +
      "<button class='btn btn-mini pull-right close-message'>Close</button>" +
      "<div>(%= message %)</div>" +
    "</div>");

  appHelper.flashMessage = function(atts) {

    $("div#coach-flash-container").append( appHelper.flashMessageTemplate(atts) );

    $("div#coach-flash-container button.close-message").on("click", function(clickEvent) {
      $(clickEvent.currentTarget).parent().remove();
    });

  };

  appHelper.mainFlashMessage = function(atts) {

    $("div#main-flash-container").append( appHelper.flashMessageTemplate(atts) );

    $("div#main-flash-container button.close-message").on("click", function(clickEvent) {
      $(clickEvent.currentTarget).parent().remove();
    });

  };

  appHelper.phq9Responses = function(user) {

    var dataCollection = new Dynamo.DataCollection([], {
      xelement_id : app.PHQ9.id,
      user_id     : user.id, 
      group_id    : user.get("group_id"),     
      comparator  : function(c) { return (new Date(c.get("created_at") )); }
    });

    return dataCollection;
    
  };

  appHelper.fetchGroupWideData = function (gwdArray) {
    _.each(gwdArray, function(gwd) {
      gwd.fetchAll({async : false});
    });    
  };

  appHelper.userStartDate = function(user) {

    user = user || Dynamo.CurrentUser();

    return user.startDate() || Dynamo.CurrentGroup().startDate()

  };

  appHelper.isXelementAuthorized = function(model, options) {

    var authorized = ( model.usableNumDaysIn(options) <= appHelper.numDaysIntoStudy() );
    // console.log("Xelement Authorized (id, t/f): ", model.id, authorized);
    return (authorized);

  };

  appHelper.logSessionEvent = function(action, extra_atts, save_opts) {

    var sessionEvent =  new Dynamo.Data({
                          user_id: Dynamo.CurrentUser().id,
                          group_id: Dynamo.CurrentGroup().id,
                          xelement_id: SESSION_DATA_GUID,
                          session_id: localStorage.getItem("session_id")
                        });
    sessionEvent.set_field("session_id", "string", localStorage.getItem("session_id"));
    sessionEvent.set_field("action", "string", action);

    _.each(extra_atts, function(value, key) {
      sessionEvent.set_field(key, value[0], value[1]); 
    });

    save_opts = save_opts || {};
    sessionEvent.save(null, save_opts);

  };

  // returns the number of days into the study 
  // a particular piece of data was created
  // can be used for anything with a 'created_at' field.
  appHelper.numDaysInOf = function(data, user) {
    return Math.ceil( ( ( new Date(data.get('created_at'))  - appHelper.userStartDate(user) ) / 1000 / 3600 / 24) ); 
  };

  // returns the number of weeks into the study 
  // a particular piece of data was created
  // can be used for anything with a 'created_at' field.
  appHelper.numWeeksInOf = function(data, user) {
    return Math.floor( appHelper.numDaysInOf(data, user) / 7.0 ) + 1;
  };

  // returns the number of days into the study a particular user is today.
  // if no user is specified, will default to the current user.
  // used primarily for time-based content-release rules.
  appHelper.numDaysIntoStudy = function(user) {
    return Math.ceil( ( (Date.today() - appHelper.userStartDate(user) ) / 1000 / 3600 / 24) ); 
  };

  // returns the number of days weeks the study a particular user is today.
  // if no user is specified, will default to the current user.
  // used primarily for time-based content-release rules.
  appHelper.numWeeksIntoStudy = function(user) {
    return Math.floor( appHelper.numDaysIntoStudy(user) / 7.0 ) + 1;
  };

  appHelper.roadMapEntriesByWeek = function() {
    if (typeof(appHelper._RMentriesByWeek) == "undefined") {
      appHelper._RMentriesByWeek = _.groupBy((new XelementCollection(app.RoadMapEntries, { 
          comparator: function(el) {
            return parseInt(el.get("day"))
          } 
      })).toJSON(), 'week');
    };

    return appHelper._RMentriesByWeek;
  };

  appHelper.pulse = function(selector) {
    (function _pulse(){
      $(selector).delay(700).fadeTo(700, 0.01).delay(200).fadeTo(700, 1.0, _pulse);
    })();
  };

  appHelper.pulseWhile = function(selector, condition) {
    var s = selector, c = condition;
    (function _pulseWhile(){
      if (c()) {
        $(s).delay(700).fadeTo(700, 0.01).delay(200).fadeTo(700, 1.0, _pulseWhile);  
      }
    })();
  };  

  appHelper.RenewView = function(selector) {
   
    this.using = function(view) {
      
      if (this.currentView){
        this.currentView.remove(); //as of 1.0, this also calls stopListening. Backbone 
      }
   
      this.currentView = view;
      $(selector).empty()
      $(selector).append(this.currentView.$el);
      this.currentView.render();

    };

    return this;
  };


  appHelper.passesTimeFilters = function(event, timeFilters) {

    if ( _.isEmpty(timeFilters) ) { return true };

    //if not empty, gotta figure out if event fits filters;
    var eventStart = event.get_field_value('start'),
        eventEnd = event.get_field_value('end');

    var earliestAcceptableStartTime = null, 
        latestAcceptableEndTime = null;

    if ( _.contains(timeFilters, "Mornings") ) {
      earliestAcceptableStartTime = 5;
      latestAcceptableEndTime = 12
    }

    if ( _.contains(timeFilters, "Afternoons") ) { 
      if (earliestAcceptableStartTime == null) {
        earliestAcceptableStartTime = 12;
      };
      latestAcceptableEndTime = 12 + 6;
    };

    if ( _.contains(timeFilters, "Evenings") ) { 
      if (earliestAcceptableStartTime == null) {
        earliestAcceptableStartTime = 12+6;
      };
      latestAcceptableEndTime = 23;
    };

    if (eventStart.getHours() < earliestAcceptableStartTime) { return false }
    if ( (eventEnd.getHours() < 5) || (eventEnd.getHours() > latestAcceptableEndTime) ) { return false }

    return true;
  };


  appHelper.passesTopicFilters = function(event, topicFilters) {

    if ( _.isEmpty(topicFilters) ) { return true };

    return ( !_.isEmpty( _.intersection(event.get_field_value("tags").split(","), topicFilters) ) );
  };

  appHelper.passesThoughtDistortionFilters = function(event, distortionFilters) {

    if ( _.isEmpty(distortionFilters) ) { return true };

    return ( !_.isEmpty( _.intersection(event.get_field_value("tags").split(","), distortionFilters) ) );

  };

  appHelper.passesEmotionFilters = function(event, emotionFilters) {

    if ( _.isEmpty(emotionFilters) ) { return true };

    emotionFilters = _.map(emotionFilters, function(s) { return s.toLowerCase() });
    return _.contains(emotionFilters, event.get_field_value("emotion") );
  };


  appHelper.relativeTimeOfStudyWeekToNow = function(weekNumber) {
    var numDaysIn = appHelper.numDaysIntoStudy();
    if ((weekNumber-1)*7 > numDaysIn) { return "future" };
    if (((weekNumber - 1)*7 < numDaysIn) && (weekNumber*7 > numDaysIn)) { return "current" };
    return "past"; 
  };


  appHelper.sendMessageNotification = function(data_fields, ajaxOpts) {
     var aOpts = _.extend({ 
      url: "http://mohrlab.northwestern.edu/staging/stepped_care/dev/utility/mail/sendNewMessageNotification.cfm", 
      type: "POST", 
      data: data_fields
    }, ajaxOpts);
    $.ajax(aOpts); 
  };

  appHelper.isCoach = function(user) {
    return (user.get("study_role") == "Coach")
  };

  appHelper.groupCoach = function() {
    return Dynamo.CurrentGroup().users.find(function(u) { return appHelper.isCoach(u) })
  };

  // pass in a selector that has checkboxes within it;
  // returns the values of those checkboxes that are checked.
  appHelper.selectedValues = function(selector) {
      var r = [];
      _.map($('input:checked', selector), function(selected){ 
        r.push( ($(selected).val()) ); 
      });
      return r;
  };

  appHelper.widgetAvailableToday = function(asset_key) {

    if (TOOL_AVAILABILITY[asset_key]) {
      if ( TOOL_AVAILABILITY[asset_key] > appHelper.numDaysIntoStudy() ) {
        return false;
      }
    }
    
    return true;
  };  


	return appHelper;

})