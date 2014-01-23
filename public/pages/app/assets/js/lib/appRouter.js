define(
[   "lib/widgets", "lib/appHelper", "lib/appTours", "lib/eventFiltersInstance", "lib/thoughtFiltersInstance",
    "models/post",   "models/activity_calendar_event", "models/activity_observer", "models/thought_record",  "models/thoughts_observer",
    "lib/activity_calendar",
    "views/app_views"], 
function(
    navWidgets, appHelper,       appTours,                eventFilters,                   thoughtFilters,         
            Post,                 ActivityCalEvent,                 atObserver,              ThoughtRecord,                 trObserver,
      ActivityCalendar,
      appViews) {

  function finishedLoading() {
    $("#loading-data-message").hide();
  };

  //
  // Helpers for both Activity Calendar and Thoughts Tool
  //
    function renderVisualization() {
      currentVisualization.render();
      
      //Add Current Filters UI.
      var currentFilters = _.flatten([
          appHelper.selectedValues("#time-filters"),
          appHelper.selectedValues("#topic-filters"),        
          appHelper.selectedValues("#experience-filters"),
          appHelper.selectedValues("#emotion-filters"),
      ]);
      
      if (currentFilters.length > 0) {
        $('#current-filters').html( "<br />Current Filters: "+currentFilters.join(", ") );
      } else {
        $('#current-filters').html("");
      }

    };

    atObserver.reRenderFunction = renderVisualization;
    trObserver.reRenderFunction = renderVisualization;

  //
  // Helpers for Activity Tracker
  //

    function filteredActivities() {
      //eventFilters defined in 'filter_class_instance.js'
      return eventFilters.filter(UsersActivities);
    }

    function getIncompleteActivities() {
      return (new DataCollection(
            (
              UsersActivities.filter(function(activity) {
                  return ( 
                            // Started in the past,
                              activity.get_field_value("start") < (new Date()) && 
                            // And Not yet marked as completed.
                             (
                              activity.get_field_value("eventCompleted") === null   || 
                              activity.get_field_value("eventCompleted") === void 0 ||
                              (
                                activity.get_field_value("eventCompleted") !== "0"    &&
                                activity.get_field_value("eventCompleted") !==  0     &&
                                activity.get_field_value("eventCompleted") !== "1"    &&
                                activity.get_field_value("eventCompleted") !==  1 
                              )
                             ) 
                         )
              })
            )
            , 
            {
              xelement_id: ACTIVITIES_GUID,
              user_id: Dynamo.CurrentUser().id,
              group_id: Dynamo.CurrentUser().get("group_id")      
      }))
    }


  //
  // Helpers for Thoughts Journal
  //

    // function filteredThoughtRecords() {
    //   var timeFilters, topicFilters, expFilters, emotionFilters;
    //   timeFilters     =    appHelper.selectedValues("div#time-filters");
    //   topicFilters    =    appHelper.selectedValues("div#topic-filters");
    //   expFilters      =    appHelper.selectedValues("div#experience-filters");
    //   emotionFilters  =    appHelper.selectedValues("div#emotion-filters");

    //   var filteredEvents = UserThoughtRecords.chain().filter(function(event) { 
    //     return (  appHelper.passesTimeFilters(event, timeFilters) &&
    //               appHelper.passesTopicFilters(event, topicFilters) &&
    //               appHelper.passesThoughtDistortionFilters(event, expFilters) &&
    //               appHelper.passesEmotionFilters(event, emotionFilters)
    //             )
    //   }).compact().map(function(m) { return m.fieldsToJSON() }).value();


    //   return filteredEvents
    // };
    function filteredThoughtRecords() {
      return thoughtFilters.filter(UserThoughtRecords);
    }


  var AppRouter = Backbone.Router.extend({ // I want

    _alreadyRendered: {},

    _application_layout: function() {
      
      $('div#main').empty().html(_.template(app.templates["page/app_layout"]));
      
      //To make sure the coach's attributes are the latest attributes.
      var coach = appHelper.groupCoach();
      coach.fetch({ async: false });
      $("div#coach-contact-info").html(coach.get("contact_info"));
      
      //To make sure the current user's attributes are the latest attributes.
      Dynamo.CurrentUser().fetch({ async: false });
    },

    _beforeAllRoutes: function(route, name) { 
      
      _.each(["_application_layout", "_navigation", "_coach_panel"], this._preRenderOnce);
      
      this._resetTourHandler(route);
      appHelper.logSessionEvent("page_view", { page_id: ["string", route] });
    },

    _preRenderOnce: function(functionName) {

      if (!this._alreadyRendered[functionName]) {
        this[functionName].call();    
        this._alreadyRendered[functionName] = true;
      }

    },

    _resetTourHandler: function(route) {
      $tourButton = $("button.page_tour:first");

      $tourButton.off("click");
      $tourButton.hide();
      newHandler = this._tourHandlerForRoute[route];
      if(newHandler) {
        $tourButton.show();
        $tourButton.on("click", newHandler);
      };

    },

    _tourHandlerForRoute: {
      home : function() {
        // app.trigger("beforeNavigation");
        appTours.run("homePage", "restart")
      }
    },

    _navigation: function() {
      console.log("Rendering navigation...");

      var widgets = new Backbone.Collection(navWidgets);

      // Add homepage widgets
      widgets.each(function(widget) {
        appHelper.addWidgetToElement(widget, widget.get("selector"));
      });
      
      // Calculate appropriate bootstrap 'span' class to connect widgets based upon number:
      // var numConnectElements = $('div#main div#connect-row').children('div').length;
      // elWidthNum  = Math.floor(12 / numConnectElements);
      // $('div#main div#connect-row').children('div').each(function() {
      //   $(this).addClass(('span'+elWidthNum));
      // });

    },

    _coach_panel: function() {

      $("div#my-coach-panel").on("click", toggleCoachPanel);   

      conversation = new appViews.CoachPanel({
        el                  :  "div#coach-conversation",
        postModel           :  Post,
        postsCollection     :  app.conversationPosts,
        groupWideComments   :  app.CoachConvoComments,
        posts_key           :  COACH_CONVO_POSTS_GUID,
        comments_key        :  COACH_CONVO_COMMENTS_GUID,
        user_id             :  Dynamo.CurrentUser().id,
        group_id            :  Dynamo.CurrentGroup().id
      });
      conversation.on('messages:unread', addNewMessagesNotification);
      conversation.render();

      function toggleCoachPanel(e) {

        var $coachContainer = $("div#coach-container");

        // Panel is currently closed
        if ( $coachContainer.hasClass('closed') ) {
          // Open panel:
          if ( $coachContainer.hasClass('new-messages') ) {
            $coachContainer.popover('destroy');
          };
          $coachContainer.removeClass('closed new-messages').addClass('opened', 500);
          $("div#my-coach-panel").addClass('opened');
          $("div#my-coach-panel span").text("Close");
        }
        else { 
          // Panel is currently open
          // Close panel:
          $coachContainer.removeClass('opened').addClass('closed', 500);
          $("div#my-coach-panel").removeClass('opened');
          $("div#my-coach-panel span").text("My Coach");
        }

      };

      function addNewMessagesNotification(numUnread) {
        var $coachContainer = $("div#coach-container"), 
            $panelButton = $("div#my-coach-panel span");
        

        if (  $coachContainer.hasClass("closed") ) {
          $coachContainer.addClass("new-messages");
          $panelButton.text(""+numUnread+" new");
        };

        if (numUnread === 0) { $panelButton.text("My Coach"); }
      
        if ($coachContainer.hasClass("closed")) {
          $coachContainer.fadeOut(300).fadeIn(300).fadeOut(300).fadeIn(300);
        };

      };
      
    },

    initialize: function() {
      _.bindAll(this);
      this.on('before:all', this._beforeAllRoutes, this);
      this.renewView = new appHelper.RenewView("div#main-content");
    },

    // Add Before-Route Handling
    route: function(route, name, callback) {
      return Backbone.Router.prototype.route.call(this, route, name, function() {
          this.trigger.apply(this, ['before:all', route, name]);
          this.trigger.apply(this, ['before:' + name].concat(_.toArray(arguments)));
          callback = callback || this[name];
          callback.apply(this, arguments);
      });
    },    

    /* 
      routes
    */

    routes: {

      ""                      :  "home",
      "home"                  :  "home",
      "logout"                :  "logout",

      //  Tools
      "activity_tracker"      :  "activity_tracker",
      "learn"                 :  "learn",
      "mood_view"             :  "mood",
      "mood_graph"            :  "mood_graph",
      "roadmap_view"          :  "roadmap",
      "thoughts"              :  "thoughts",

      //  Activity
      "edit_profile"          :  "edit_profile"

    },

    home: function() {

      $('div#main-content').empty().html(_.template(app.templates["page/home"]));

      var weekNumber = appHelper.numWeeksIntoStudy();
      var entries = (appHelper.roadMapEntriesByWeek())[(weekNumber)] || [];

      // appHelper.fetchGroupWideData([]);
      var currentWeek = new appViews.RoadmapWeek({
        container : "div#current-week",
        week      : weekNumber,
        entries   : entries        
      });
      currentWeek.render();

      // Setup tour
      appTours.run("homePage", "start");

      // Handle tour end
      this.once("before:all", function() {
        if (!appTours.run("homePage", "ended")) { appTours.run("homePage", "end"); }
      });

      
      finishedLoading();
    }, 

    activity_tracker: function() {    

      // DailyTasks.complete("activity_tracker");
      $('div#main-content').empty().html(app.templates["page/activity_tracker"]);

      appHelper.fetchGroupWideData([ app.CoachConvoComments ]);

      setVisualizationOuterContainerHeight = function() {
        var newHeight, windowHeight = $(window).height();
        newHeight = windowHeight - 142;
        $("#visualizations-outer-container").css({
          height:newHeight
        });
      };
      setVisualizationOuterContainerHeight();
      $(window).resize(setVisualizationOuterContainerHeight); //however, it doesn't resize calendar

      //
      // Setup collection of Calendar Events
      //
      UsersActivities = new DataCollection(null, {
        xelement_id: ACTIVITIES_GUID,
        user_id: Dynamo.CurrentUser().id,
        group_id: Dynamo.CurrentUser().get("group_id")      
      });
      UsersActivities.fetch({ async: false});

      UsersActivities.on('remove', function() {
        renderVisualization();
      });

      //
      // Define editActivityView
      //
      editActivityView = new ModelBackoutView({
        model:  (         
                  new ActivityCalEvent({
                    xelement_id: ACTIVITIES_GUID,
                    user_id: Dynamo.CurrentUser().id,
                    group_id: Dynamo.CurrentUser().get("group_id")
                  })
        ),
        computedAtts: {
            currentState: {
            read: function() {
              var now = new Date(),
                  // Needs to exist so that knockout will pick up 
                  // on re-computing the read function when something changes. 
                  garbage = this.dummyObservable();
                  start = this.view.model.get_field_value('start');         
              if ( start > now ) { return "scheduling" };
              if ( this.view.model.id ) { 
                return "reviewing"; 
              } else {
                return "monitoring";
              };
            }
          },
          inScheduling: {
            read: function() {
              this.dummyObservable.notifySubscribers();
              var state = this.currentState();
              console.log("in 'inScheduling'; start, now, currentState =", this.start(), new Date(), state);
              if ( state == "scheduling") { return true; }
              return false;
            },
            deferEvaluation: true
          },
          inMonitoring: {
            read: function() {
              this.dummyObservable.notifySubscribers();
              var state = this.currentState();
              console.log("in 'inMonitoring'; start, now, currentState =", this.start(), new Date(), state);
              if (state == "monitoring") { return true; }
              return false;
            },
            deferEvaluation: true
          },
          inReviewing: {
            read: function() {
              this.dummyObservable.notifySubscribers();
              var state = this.currentState();
              console.log("in 'inReviewing'; start, now, currentState =", this.start(), new Date(), state);
              if (state == "reviewing") { return true; }
              return false;
            },
            deferEvaluation: true
          }         
        },
        modelAttsFn: function(model) {
          return model.fieldsToJSON();
        },
        lateAddAtts: {
          "savedInState" : "",
          "shared" : null
        },    
        knockoutTemplate: DIT["activity_tracker/edit_event"] 
      });  


      editActivityView.updateModel = function(newModelObj) {
        var self = this;
        self.model = null;
        self.model = newModelObj;
        self.model.on('change:fromKnockout', function() {
          var m = self.model
          // More validations needed?
          if (m.get('end') > m.get('start') ) {
            var calEventIds = _.map(calendarEvents, function(calEvent){ return calEvent.id; });
            var eventIndex = _.indexOf(calEventIds, m.cid);

            if (eventIndex != -1) {
              //updating existing event.
              calendarEvents[eventIndex] = _.extend( {}, m.fieldsToJSON(), { id: m.cid } );
            } else {
              //adding a new one.
              calendarEvents.push( _.extend({}, m.fieldsToJSON(), { id: m.cid } ) );  
            };

            renderVisualization();
          };
        });
        self.render();
        self.trigger("model:updated");
      };

      editActivityView.on('model:save', function() {
        console.log("ON MODEL SAVE");
        var model = editActivityView.model,
            KOmodel = editActivityView.knockoutModel;

        model.wasNew = model.isNew();
        model.wasSavedInState = model.get_field_value("savedInState");
        model.set_field("savedInState", "string", KOmodel.currentState());

        model.once("sync", atObserver.afterSave);
        model.save();

      });

      editActivityView.on('model:delete', function() {

        UsersActivities.remove(editActivityView.model);
        editActivityView.model.destroy({async:false, error: function() {
          alert('Your event could not be deleted; please try again later.');
        }});

      });

      var viewContainer = launchInModal(editActivityView, {
        $launchButtonContainer: $("div#main-content"),
        launchButtonStyle: "margin-left:20px;margin-bottom:20px;",
        launchButtonText: "<i class='icon-calendar'></i> New Activity",
        onLaunchButtonClick: function() {
          var newActivity = new ActivityCalEvent({
            xelement_id: ACTIVITIES_GUID,
            user_id: Dynamo.CurrentUser().id,
            group_id: Dynamo.CurrentUser().get("group_id")
          });
          editActivityView.updateModel( newActivity );
        },
        jqModalOptions: {
          dialogClass: "activity-editor",
          title: "Activity Editor",
          height: "auto",
          width: 530,
          maxHeight: ($(window).height()*0.95),
          position: [($(window).width() / 2) - (315), 100]
        }
      });

      // Whenever a new model is assigned, open the modal.
      // this will trigger both on new, and on editing previous records.
      editActivityView.on("model:updated", viewContainer.openModal);

      // Whenever the model is saved or deleted, close the modal:
      editActivityView.on('model:save', viewContainer.closeModal);
      editActivityView.on('model:delete', viewContainer.closeModal);


      // GUIDES
      // Filter & Sort Guides for the Appropriate Guides.
      ActivityCalGuides = new GuideCollection(GUIDES.filter(function(xel) {
        return ( (xel.get_field_value("content_description") === "Activity Tracker")  );
      }));

      ActivityCalGuides.comparator = function(m) {
        // This matches Predicting Pleasure and Accomplishment and Motivation
        var re = /^\d+/;
        var title = m.get_field_value("title");
        var orderOfTitle = re.exec(title);
        if (orderOfTitle) {
          return parseInt(orderOfTitle);
        } else {
          return title;
        };
      };

      ActivityCalGuides.sort();

      ActivityCalGuideData = new DataCollection(null);

      ActivityCalGuides.each(function(guide_xel) {

        var data;

        //  Fetch any existing data on the server for this user and goal.
        var dc = new DataCollection(null, {
          xelement_id: guide_xel.id,
          user_id: Dynamo.CurrentUser().id,
          group_id: Dynamo.CurrentUser().get("group_id")      
        });
        dc.fetch({async: false});

        if (dc.length > 0) {
          data = dc.first();
        }
        else {
          // If length is 0, then no data exists, create new object.
          data = new Dynamo.Data({
            server_url: Dynamo.TriremeURL,
            xelement_id: guide_xel.id,
            user_id: Dynamo.CurrentUser().id,
            group_id: Dynamo.CurrentUser().get("group_id")       
          });
        };
        
        ActivityCalGuideData.add(data);
        //  Either way, it gets added to the collection of user data about calendar guides.
      });


      //
      // RENDER EVERYTHING.
      //

      // Visualizations
      currentVisualization = new ActivityCalendar('div#activity-list-container', filteredActivities);
      renderVisualization();

      updateVisualization = function(vizKey) {
        currentVisualization.remove();
        switch(vizKey) {
          case "calendar":
            currentVisualization = new ActivityCalendar('div#activity-list-container', filteredActivities);
            break;
          case "list":
            currentVisualization = new ShowArrayView({
              title: "Events",
              container: 'div#activity-list-container', 
              getArrayFn:  filteredActivities,
              elementTemplate: DIT["activity_tracker/show_event"],
              onElementClick: function(clickEvent) {
                var event = UsersActivities.get($(clickEvent.currentTarget).data("cid"));
                editActivityView.updateModel( event );
                // $('div#edit-event-container').effect("highlight", {}, 2000);
              }
            });
            break;
        };
        renderVisualization();
      };

      // Filters
      $('div#filters input').change( function(changeEvent) {
        renderVisualization(); 
      });
      $("a#show-filter-container").on('click', function(e){
        e.preventDefault(); //Needed so router doensn't take it
        $("#filters").toggle();
        return false;
      });

      var reviewView = new appViews.ReviewActivities({
        getReviewableActivities: getIncompleteActivities,
        activitiesObserver: atObserver,
        collection: getIncompleteActivities(),
        // Since all View options are passed into each model-view constructor, specify these functions here.
        // Ideally, refactor Backout.CollectionView so they can be specified 
        // on the ReviewActivities view class, since they truly belong there as far as DRY/SoC goes...
        getAttributes: function(m) { 
          return m.fieldsToJSON() 
        },  
        setAttribute: function(BackboneModel, attr_name, newValueFromKnockout) {
          var set_obj = {};
          set_obj[attr_name] = newValueFromKnockout
          BackboneModel.set_field_values(set_obj , {silent: true});
        },
        computedAttributes: {
          formattedStart: function(model) {
            return function() {
              return ( (new Date(model.get_field_value("start"))).toString("dddd, MMMM d, yyyy") );
            };
          }
        }      
      });

      var reviewContainer = launchInModal(reviewView, {
        $launchButtonContainer: $("div#main-content"),
        launchButtonStyle: "margin-left:20px;margin-bottom:20px;",
        launchButtonText: "<i class='icon-reorder'></i> Review Past Activities",
        onLaunchButtonClick: function() {
          reviewView.rebuildCollection();
          reviewContainer.openModal();
        },
        jqModalOptions: {
          dialogClass: "activity-reviewer",
          title: "Review Past Activities",
          height: "auto",
          width: ($(window).width()*0.9),
          position: [($(window).width() / 2) - (315), 85]
        }
      });

      appHelper.pulseWhile(reviewContainer.$launchButton, function() { return (getIncompleteActivities().length > 0) })

      // Visualization list
      $('a#show-viz-list-container').on("click", function() {
        $("#filters").hide();
      });
      $('ul#viz-list li').click( function(clickEvent) {
        var radioVal = $(clickEvent.currentTarget).data("value");
        $("#show-viz-list-container").click();
        updateVisualization(radioVal); 
      });

      // Guides
      var guideViewer = new GuidePlayerView({
        $launchButtonContainer: $("div#main-content"),
        launchButtonStyle: "margin-left:20px;margin-bottom:20px;",
        template: DIT["dynamo/guides/show"],
        collection: ActivityCalGuides,
        guideData: ActivityCalGuideData,
        storyRoute: "activity_tracker"
      });


      // Track Events!
      guideViewer.on("guide:slide:render", function(slideNumber) {

        var d = new Dynamo.Data({
          server_url: Dynamo.TriremeURL,
          xelement_id: ACTIVITY_GUIDES_GUID,
          user_id: Dynamo.CurrentUser().id,
          group_id: Dynamo.CurrentUser().get("group_id")
        });

        d.set_field("guide_id", "string", guideViewer.currentGuide.id);
        d.set_field("action", "string", "visited slide");
        // Increase slide number by 1 to avoid 
        // 1st slide being 0 and last slide being 1 less than length:
        d.set_field("slide_number", "integer", (slideNumber+1)); 
        d.set_field("total_slides", "integer", guideViewer.currentGuide.slides.length);

        d.save(null, {});

      }, guideViewer);


      guideViewer.on("guide:selected", function() {

        appHelper.createFeedEvent({
          username: Dynamo.CurrentUser().get("username"),
          action: "Opened a guide",
          category: "activity_guides",
          direct_object_id: this.currentGuide,
          message: "Started '"+this.currentGuide.get_field_value("title")+"'",
        });

      }, guideViewer);

      guideViewer.on("guide:finished", function() {
        
        appHelper.createFeedEvent({
          username: Dynamo.CurrentUser().get("username"),
          action: "Finished a guide",
          category: "activity_guides",
          direct_object_id: this.currentGuide,
          message: "Finished '"+this.currentGuide.get_field_value("title")+"'",
        });

      }, guideViewer);


      // Close If 
      guideViewer.listenTo(app.router, "route",  function() { 
        guideViewer.$guideContainer.dialog( "close" );
      });

      reviewContainer.listenTo(app.router, "route", reviewContainer.closeModal)

      finishedLoading();
    },

    thoughts: function() {

      // DailyTasks.complete("thoughts");
      $('div#main-content').empty().html(app.templates["page/thoughts"]);

      appHelper.fetchGroupWideData([
        app.CoachConvoComments
      ]);

      // Set up & Get Existing Thought Records

      UserThoughtRecords = new DataCollection(null, {
        xelement_id: "THOUGHTS-TOOL-EVENTS-GUID",
        user_id: Dynamo.CurrentUser().id,
        group_id: Dynamo.CurrentUser().get("group_id")      
      });
      UserThoughtRecords.fetch({ async: false});
      
      UserThoughtRecords.on('add', function(atModel) {
        
        trObserver.listenToOnce(atModel, "sync", trObserver.afterCreate);
        renderVisualization();

      });

      UserThoughtRecords.on('remove', function() {

        renderVisualization();

      });

      // Setup Thought Tracker Guides
      // Filter & Sort Guides for the Appropriate Guides.
      ThoughtTrackerGuides = new GuideCollection(GUIDES.filter(function(xel) {
        return ( (xel.get_field_value("content_description") === "Thought Tracker") );
      }));

      ThoughtTrackerGuides.comparator = function(m) {
        // This matches 10. Predicting Pleasure and Accomplishment
        // and 6: Motivation
        var re = /^\d+/;
        var title = m.get_field_value("title");
        var orderOfTitle = re.exec(title);
        if (orderOfTitle) {
          return parseInt(orderOfTitle);
        } else {
          return title;
        };
      };

      ThoughtTrackerGuides.sort();

      ThoughtTrackerGuideData = new DataCollection(null);

      ThoughtTrackerGuides.each(function(guide_xel) {

        var data;

        //  Fetch any existing data on the server for this user and goal.
        var dc = new DataCollection(null, {
          xelement_id: guide_xel.id,
          user_id: Dynamo.CurrentUser().id,
          group_id: Dynamo.CurrentUser().get("group_id")      
        });
        dc.fetch({async: false});

        if (dc.length > 0) {
          data = dc.first();
        }
        else {
          // If length is 0, then no data exists, create new object.
          data = new Dynamo.Data({
            server_url: Dynamo.TriremeURL,
            xelement_id: guide_xel.id,
            user_id: Dynamo.CurrentUser().id,
            group_id: Dynamo.CurrentUser().get("group_id")       
          });
        };
        
        ThoughtTrackerGuideData.add(data);
        //  Either way, it gets added to the collection of user data about thought record guides.
      });        

      // Define editThoughtRecordView
      var editThoughtRecordView;
      editThoughtRecordView = null;
      editThoughtRecordView = new ModelBackoutView({
        computedAtts: {
          currentState: {
            read: function() {
              var now = new Date(),
                  garbage = this.dummyObservable(), //needs to exist so that knockout will pick up on re-computing the read function when something changes.
                  start = this.view.model.get_field_value('start');        
              if ( start > now ) { return "scheduling" };
              if ( this.view.model.id ) { 
                return "reviewing"; 
              } else {
                return "monitoring";
              };
            }
          },
          inScheduling: {
            read: function() {
              this.dummyObservable.notifySubscribers();
              var state = this.currentState();
              console.log("in 'inScheduling'; start, now, currentState =", this.start(), new Date(), state);

              if ( state == "scheduling") { return true; }
              return false;
            },
            deferEvaluation: true
          },
          inMonitoring: {
            read: function() {
              this.dummyObservable.notifySubscribers();
              var state = this.currentState();
              console.log("in 'inMonitoring'; start, now, currentState =", this.start(), new Date(), state);

              if (state == "monitoring") { return true; }
              return false;
            },
            deferEvaluation: true
          },
          inReviewing: {
            read: function() {
              this.dummyObservable.notifySubscribers();
              var state = this.currentState();
              console.log("in 'inReviewing'; start, now, currentState =", this.start(), new Date(), state);

              if (state == "reviewing") { return true; }
              return false;
            },
            deferEvaluation: true
          }                
        },
        modelAttsFn: function(model) {
          var atts = model.fieldsToJSON();
          return atts
        },
        lateAddAtts: {
          "distortion" : null,
          "shared" : null,
          "share_empathy" : false,
          "share_suggestions" : false,
          "share_pride" : false,
        },
        knockoutTemplate: DIT["thoughts_tracker/edit_record"]
      });

      editThoughtRecordView.on('model:save', function() {

        var username = Dynamo.CurrentUser().get("username");
        editThoughtRecordView.model.save({async:false});

        LogReviewableUserAction({
          event_type: "User Thought Record",
          readable_content: ""+username+" thought '"+editThoughtRecordView.model.get_field_value('thought')+"'",
          content_object: editThoughtRecordView.model.fieldsToJSON()
        });

        UserThoughtRecords.add(editThoughtRecordView.model, { merge: true });
      });

      editThoughtRecordView.on('model:delete', function() {
        UserThoughtRecords.remove(editThoughtRecordView.model);
        editThoughtRecordView.model.destroy({async:false, success: function() {
          alert('Your event was deleted.');
        }});
      });

      editThoughtRecordView.on('rendered', function() {
        editThoughtRecordView.$el.
          find('textarea#situation-field,textarea#thought-field,textarea#alt-thought-field').
          each(function() {
            $(this).popover({ 
              template: '<div class="popover double-wide"><div class="arrow"></div><div class="popover-inner"><h3 class="popover-title"></h3><div class="popover-content"><p></p></div></div></div>',
              trigger: "focus"          
            });
          });
      });

      editThoughtRecordView.updateModel = function(newModelObj) {
        var self = this;
        self.model = null;
        self.model = newModelObj;
        self.model.on('change:fromKnockout', function() {
          var m = self.model;
          // More validations needed?
          if (m.get('end') > m.get('start') ) {
            var ids = _.map(UserThoughtRecords, function(calEvent){ return calEvent.id; });
            var eventIndex = _.indexOf(ids, m.cid);

            if (eventIndex != -1) {
              //updating existing event.
              UserThoughtRecords[eventIndex] = _.extend( {}, m.fieldsToJSON(), { id: m.id} )
            } else {
              //adding a new one.
              UserThoughtRecords.push( _.extend({}, m.fieldsToJSON(), { cid: m.cid} ) );  
            };

            renderVisualization();
          
          };
        });
        self.render();
        this.trigger("model:updated");
      };

      // RENDER EVERYTHING.

      // render goals
      // $('div#log-tracking').html(goalsView.render().$el);

      var viewContainer = launchInModal(editThoughtRecordView, {
        $launchButtonContainer: $("div#main-content"),
        launchButtonStyle: "margin-left:20px;margin-bottom:20px;",
        launchButtonText: "<i class='icon-puzzle-piece'></i> New Thought Record",
        onLaunchButtonClick: function() {
          editThoughtRecordView.updateModel(
            new ThoughtRecord({
              xelement_id: "THOUGHTS-TOOL-EVENTS-GUID",
              user_id: Dynamo.CurrentUser().id,
              group_id: Dynamo.CurrentUser().get("group_id")
            })
          );
          // this.openModal();
        },
        jqModalOptions: {
          dialogClass: "thought-record-editor",
          title: "Thought Record Editor",
          height: "auto",
          width: 530,
          maxHeight: ($(window).height()*0.95),
          position: [($(window).width() / 2) - (315), 85]
        }
      });

      // Assign a new model to editThoughtRecordView
      editThoughtRecordView.updateModel(new ThoughtRecord({
        xelement_id: "THOUGHTS-TOOL-EVENTS-GUID",
        user_id: Dynamo.CurrentUser().id,
        group_id: Dynamo.CurrentUser().get("group_id")
      }));

      // in the future, whenever a new model is assigned, open the modal.
      // this will trigger both on new, and on editing previous records.
      editThoughtRecordView.on("model:updated", viewContainer.openModal);

      // whenever the model is saved or deleted, close the modal:
      editThoughtRecordView.on('model:save', viewContainer.closeModal);
      editThoughtRecordView.on('model:delete', viewContainer.closeModal);
      // whenever we navigate away from the page, close the modal:
      editThoughtRecordView.listenTo(app.router, "route", viewContainer.closeModal);

      // Setup and render current visualization

      currentVisualization = new ShowArrayView({
        container: 'div#thought-records-list-container',
        getArrayFn: function () { 
          return _.map(thoughtFilters.filter(UserThoughtRecords), function(el) {
            return el.fieldsToJSON()
          });
        },
        elementTemplate: DIT["thoughts_tracker/tr_as_list_item"],
        onElementClick:  function(clickEvent) {
          var event = UserThoughtRecords.get($(clickEvent.currentTarget).data("cid"));
          editThoughtRecordView.updateModel( event );
          $('div#edit-event-form').effect("highlight", {}, 2000);
        }
      });
      renderVisualization(); 

      // Filter Selection Handler
      $('div#filters input').change( function(changeEvent) {
        renderVisualization(); 
      });

      $("a#show-filter-container").on('click', function(e){
        e.preventDefault(); // need so router doesn't activate
        $("#filters").toggle();
        return false;
      });  

      //render Guides
      var guideViewer = new GuidePlayerView({
        $launchButtonContainer: $("div#main-content"),
        launchButtonStyle: "margin-left:20px;margin-bottom:20px;",
        launchButtonText: "Launch Guides",
        template: DIT["dynamo/guides/show"],
        collection: ThoughtTrackerGuides,
        guideData: ThoughtTrackerGuideData,
        storyRoute: "thoughts"
      });

      // Track Events!
      guideViewer.on("guide:slide:render", function(slideNumber) {

        var d = new Dynamo.Data({
          server_url: Dynamo.TriremeURL,
          xelement_id: THOUGHT_TRACKER_GUIDES_GUID,
          user_id: Dynamo.CurrentUser().id,
          group_id: Dynamo.CurrentUser().get("group_id")
        });

        d.set_field("guide_id", "string", guideViewer.currentGuide.id);
        d.set_field("action", "string", "visited slide");
        // Increase slide number by 1 to avoid 
        // 1st slide being 0 and last slide being 1 less than length:
        d.set_field("slide_number", "integer", (slideNumber+1)); 
        d.set_field("total_slides", "integer", guideViewer.currentGuide.slides.length);

        d.save(null, {});

      }, guideViewer);


      guideViewer.on("guide:selected", function() {

        appHelper.createFeedEvent({
          username: Dynamo.CurrentUser().get("username"),
          action: "Opened a guide",
          category: "thought_guides",
          direct_object_id: this.currentGuide,
          message: "Started '"+this.currentGuide.get_field_value("title")+"'",
        });

      }, guideViewer);

      guideViewer.on("guide:finished", function() {
        
        appHelper.createFeedEvent({
          username: Dynamo.CurrentUser().get("username"),
          action: "Finished a guide",
          category: "thought_guides",
          direct_object_id: this.currentGuide,
          message: "Finished '"+this.currentGuide.get_field_value("title")+"'",
        });

      }, guideViewer);


      guideViewer.listenTo(app.router, "route",  function() { 
        guideViewer.$guideContainer.dialog( "close" );
      });

      finishedLoading();

    }, //end 'thoughts' route

    learn: function() {

      // DailyTasks.complete("learn");

      $('div#main-content').empty().html(app.templates["page/lessons"]);

      // Filter & Sort Guides for the Appropriate Guides.
      Lessons = new GuideCollection(GUIDES.filter(function(xel) { 
        return ( (xel.get_field_value("content_description") === "lesson") && appHelper.isXelementAuthorized(xel) );
      }));
      Lessons.comparator = function(m) {
        console.log("In Lesson Comparator: ", m.get_field_value("title"), m.usableNumDaysIn())
        return parseInt(m.usableNumDaysIn());
      };
      Lessons.sort();
      Lessons.storyRoute = "learn"; //for likes and feed events.

      LessonData = new DataCollection(null);

      Lessons.each(function(guide_xel) {

        var data;

        //  Fetch any existing data on the server for this user and lesson.
        var dc = new DataCollection(null, {
          xelement_id: guide_xel.id,
          user_id: Dynamo.CurrentUser().id,
          group_id: Dynamo.CurrentUser().get("group_id")
        });
        dc.fetch({async: false});

        if (dc.length > 0) {
          data = dc.first();
        }
        else {
          // If length is 0, then no data exists, create new object.
          data = new Dynamo.Data({
            server_url: Dynamo.TriremeURL,
            xelement_id: guide_xel.id,
            user_id: Dynamo.CurrentUser().id,
            group_id: Dynamo.CurrentUser().get("group_id")
          });
        };

        // Either way, it gets added to the collection of user data
        LessonData.add(data);

      });

      // Define Lesson Selector
      var guideSelect = new Dynamo.ChooseOneXelementFromCollectionView({
        template: DIT["dynamo/guides/header"],
        collection: Lessons
      });
      
      guideSelect.on("element:chosen", function() {

        guideViewer.setAsCurrentGuide(guideSelect.chosen_element);
        console.log("Current Lesson ", guideSelect.chosen_element)

      });

      guideViewer = new GuidePlayerView({
        template: DIT["dynamo/guides/show_guide_container"],
        collection: Lessons,
        collection_name: "Lessons",
        guideData: LessonData,
        storyRoute: "learn"
      });

      guideViewer.on("guide:slide:render", function(slideNumber) {

        var d = new Dynamo.Data({
          server_url: Dynamo.TriremeURL,
          xelement_id: LESSON_PROGRESS_GUID,
          user_id: Dynamo.CurrentUser().id,
          group_id: Dynamo.CurrentUser().get("group_id")
        });

        d.set_field("guide_id", "string", guideViewer.currentGuide.id);
        d.set_field("action", "string", "visited slide");
        // Increase slide number by 1 to avoid 
        // 1st slide being 0 and last slide being 1 less than length:
        d.set_field("slide_number", "integer", (slideNumber+1)); 
        d.set_field("total_slides", "integer", guideViewer.currentGuide.slides.length);

        d.save(null, {});

      }, guideViewer);


      guideViewer.on("guide:selected", function() {

        appHelper.createFeedEvent({
          username: Dynamo.CurrentUser().get("username"),
          action: "started a lesson",
          category: "lessons",
          direct_object_id: this.currentGuide,
          message: "Started '"+this.currentGuide.get_field_value("title")+"'",
          story_route: "learn"
        });

      }, guideViewer);

      guideViewer.on("guide:finished", function() {
        
        appHelper.createFeedEvent({
          username: Dynamo.CurrentUser().get("username"),
          action: "finished a lesson",
          category: "lessons",
          direct_object_id: this.currentGuide,
          message: "Finished '"+this.currentGuide.get_field_value("title")+"'",
          story_route: "learn"
        });

      }, guideViewer);

      // Render Selector & Viewer
      $('div#main-content .panel-heading').append(guideSelect.render().$el);
      $('div#guides-container').html(guideViewer.render().$el);

      var currentLesson = Lessons.last();
      guideSelect.chosen_element = currentLesson;
      guideSelect.trigger("element:chosen")
      

      finishedLoading();

    },

    logout: function() {

      appHelper.logSessionEvent("logout", {}, {async: false});
      localStorage.removeItem("CurrentUser");
      localStorage.removeItem("session_id");
      Dynamo.redirectTo("login.html");
    
    },

    roadmap: function() {

      // Each Roadmap Entry looks like:
      // week: "1"
      // day: "1"
      // lessonname: "Tour of Project TECH"
      // summary: "Learn about how your activities impact your mood."
      // tool: "Activity Tracker"
      // activity1: "Share: 2 truths and a lie game"
      // activity2: "Discussion: Introduce yourself"

      var weekSeparator = _.template('<div id="roadmap-week-(%= week %)" class="(%= relativeTime %) list-group-item"></div>');

      $('div#main-content').empty().html(app.templates["page/roadmap"]);
      $("div#activity-feed-container").empty();

      _.each(appHelper.roadMapEntriesByWeek(), function(entries, week) {
        
        $('div#roadmap').append( weekSeparator({ 
          week : week, 
          relativeTime : appHelper.relativeTimeOfStudyWeekToNow(week) 
        }) );

        var weeksView = new appViews.RoadmapWeek({
          container : "div#roadmap-week-"+week,
          week      : week,
          entries   : entries
        });
        weeksView.render();

      });

      finishedLoading();
    },

    mood: function() {

      // DailyTasks.complete("mood");

      $('div#main-content').empty().html(app.templates["page/mood"]);

      // PT Story #: 47149001:
      // EVERY TIME YOU VISIT MOOD, IT SHOULD BE A NEW MOOD RATING
      var currentMoodRating = new Dynamo.Data({
        xelement_id: MOOD_RATINGS_GUID,
        user_id: Dynamo.CurrentUser().id,
        group_id: Dynamo.CurrentGroup().id
      });    

      debouncedSaveMood = _.debounce(currentMoodRating.save, 500);

      $( "#response1" ).slider({
          min: 0,
          max: 10,
          step: 1,
          value: (currentMoodRating.get_field_value("mood_rating") || 5),
          slide: function( event, ui ) {
            /* value from slider available in ui.value */
            currentMoodRating.set_field("mood_rating", "integer", ui.value);
            currentMoodRating.set_field("created_at", "datetime", new Date());
            debouncedSaveMood();
          }
      });

      //update view w/ most recent save-status information
      currentMoodRating.on('sync', function(model, response, options) {
        console.log("MOOD RATING SAVED:", model, response, options);
        $("div#last-save").text( "Last Saved at: "+(new Date().toLocaleTimeString()) );
        // DailyTasks.complete("MoodRating");
      });

      currentMoodRating.on('error', function(model, xhr, options) {
        console.warn("FAILED MOOD RATING SAVE:", model, xhr, options);
        $("div#last-save").html(
          "<p style='color:red;'>Last Save FAILED at: "+(new Date().toLocaleTimeString())+"</p>"+
          "<p> You may want to try again or check the log.</p>" 
        );
      });

      $('button#see-mood-graph').on("click", function() {
        var moodRating = currentMoodRating.get_field_value("mood_rating");
        if (!_.isUndefined(moodRating) && !_.isNull(moodRating) ) {
          appHelper.createFeedEvent({
            username: Dynamo.CurrentUser().get("username"),
            action: "rated their mood",
            category: "mood",
            direct_object_id: null,
            message: "Rated their mood.",
          });
        }      
        app.router.navigate("mood_graph", { trigger: true } );
      });

      finishedLoading();
    },

    mood_graph: function() {

      $('div#main-content').empty().height(600);

      // Currently, this allows users to change their mood rating on a daily basis.
      UserMoodData = new Dynamo.DataCollection(null, {
        group_id: Dynamo.CurrentGroup().id,
        user_id: Dynamo.CurrentUser().id,
        xelement_id: MOOD_RATINGS_GUID
      });

      UserMoodData.fetch({async: false});

      var graph = new appViews.OverTimeGraph({
        el              : "div#main-content",
        dataCollection  : UserMoodData,
        field           : "mood_rating",
        fieldName       : "Mood"
      });
      graph.render();

      finishedLoading();
      
    },

    edit_profile: function(id) {

      $('div#main-content').empty().html( _.template( app.templates["page/edit_contact_info"], Dynamo.CurrentUser().toJSON() ) );
      
      var foo = function(clickEvent) {
        Dynamo.CurrentUser().set({ contact_info: $('textarea#contact-info').val() });
        Dynamo.CurrentUser().save(null, {
          success: function() {
            $('div#main-content').empty().html( _.template( app.templates["page/edit_contact_info"], Dynamo.CurrentUser().toJSON() ) );
            $('div#main-content button.save').on('click', foo);
            appHelper.mainFlashMessage({ kind: "success", message: "Contact Info Saved"});
          },
          error: function() {
            appHelper.mainFlashMessage({ kind: "error", message: "There was an error saving your contact info."});
          }
        });
      };
      
      $('div#main-content button.save').on('click', foo);

      finishedLoading();

    }

  });  

  return AppRouter;

});