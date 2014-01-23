define([  
  "users",
  "groups",
  "xelements",
  "app_xelement",
  "roadmap",
  "lib/globals", "lib/gDocParser", "lib/idleTimer", "lib/appHelper", "lib/appRouter",
  ], 
  function(
    USERS_IN_FILE,
    USER_GROUPS_IN_FILE,
    XELEMENTS_IN_FILE,
    APPLICATION_XELEMENT,
    ROADMAP_SPREADSHEET,
  globalsDummy,     gDocParser,      idleTimer,        appHelper,       appRouter  ) {

  function queryParam(name) {
      name = name.replace(/[\[]/, "\\\[").replace(/[\]]/, "\\\]");
      var regex = new RegExp("[\\?&]" + name + "=([^&#]*)"),
          results = regex.exec(location.search);
      return results == null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
  }

  app = {

    loadContentAssetsAndThen: function(callback) {

      // Global vars that store all of the specific type of objects fetched from the server.
      
      // If you are Fetching Base the base xelement from the Server instead of a file:
      // XEL_BASE_REQ = $.get( Dynamo.addSessionVarsToUrl(Dynamo.TriremeURL+'/xelements/xelement_base') );
      // $.when( XEL_BASE_REQ ).done(function() {

      // // if on document ready is not working, you may want to try 
      // // on window load event:
      // $(window).load(function() {
      $(function() { 

        // If you are fetching Xelements from AJAX server calls:
        // XELEMENT_BASE = new Backbone.Model(convertFalses(JSON.parse(JSON.parse(XEL_BASE_REQ.responseText).xel_data_values.content)));
        // USERS = new Dynamo.UserCollection();
        // USER_GROUPS = new Dynamo.GroupCollection();
        // XELEMENTS = new Dynamo.XelementCollection();
        // Fetch order matters!
        // users_fetched = USERS.fetch({ async: false });
        // user_groups_fetched = USER_GROUPS.fetch({ async: false });
        // xelements_fetched = XELEMENTS.fetch({async: false});

        // If you are fetching Xelements from files, it is assumed these files are loaded
          msgWithLoadTime("fetching XELEMENT_BASE...");
          XELEMENT_BASE = new Backbone.Model(convertFalses(JSON.parse(XELEMENTS_IN_FILE[0].xel_data_values.content)));
          msgWithLoadTime("done with xel_base.");

          msgWithLoadTime("fetching XELEMENTS... ");
          XELEMENTS = new Dynamo.XelementCollection(XELEMENTS_IN_FILE);
          msgWithLoadTime("done with xels.");
          
          msgWithLoadTime("fetching USERS... ");
          USERS = new Dynamo.UserCollection(USERS_IN_FILE);
          msgWithLoadTime("done with users.");
          
          msgWithLoadTime("fetching USER_GROUPS...");
          USER_GROUPS = new Dynamo.GroupCollection(USER_GROUPS_IN_FILE);
          msgWithLoadTime("done with groups.");

          users_fetched = user_groups_fetched = xelements_fetched = true;

          msgWithLoadTime("initializing App Authorization...");
          app.appXel = new Dynamo.ApplicationModel(convertFalses(APPLICATION_XELEMENT));
          Dynamo.initializeApplicationAuthorization(app.appXel);
          msgWithLoadTime("done with app auth.");


        msgWithLoadTime("Parsing Roadmap entries...");
        app.RoadMapEntries = gDocParser.parseEntries(ROADMAP_SPREADSHEET);
        msgWithLoadTime("done with roadmap entries.");


        // Bit of a hack -- 
        //   Fetching Xelements from AJAX server calls, even with passing { async:false },
        //   has *seemed* to be intermittently unreliable with serious wierdness as the consquence.
        //   using 'done' callbacks seemed to fix this issue.
        //
        //   when not fetching from the server, the 'done' calls don't hurt anything,
        //   they just end up being just cruft and you have to set the values of these
        //   variables to true.
        $.when( users_fetched  ).done(function() {

          $.when( user_groups_fetched ).done(function() {

            $.when( xelements_fetched ).done(function() {

                msgWithLoadTime("building QUESTIONS...");
                QUESTIONS = new QuestionCollection( XELEMENTS.chain().map(function(xel) {
                  if (xel.get_field_value("xelement_type") == "question") {
                    return (new QuestionModel(xel.attributes));
                  }
                }).compact().value());
                msgWithLoadTime("done with QUESTIONS.");

                msgWithLoadTime("building QUESTION_GROUPS...");
                QUESTION_GROUPS = new QuestionGroupCollection(
                  XELEMENTS.chain()
                  .map(function(xel) {
                        if (xel.get_field_value("xelement_type") == "question_group") {
                          return (new QuestionGroupModel(xel.attributes))
                        };
                  }).compact().value());
                msgWithLoadTime("done with QUESTION_GROUPS.");

                msgWithLoadTime("building SLIDES...");
                SLIDES = new SlideCollection(XELEMENTS.chain().map(function(xel) {
                  if (xel.get_field_value("xelement_type") == "static_html") {
                    return (new SlideModel(xel.attributes))
                  };
                }).compact().value());
                msgWithLoadTime("done with SLIDES.");              

                msgWithLoadTime("building GUIDES...");
                GUIDES = new GuideCollection(XELEMENTS.chain().map(function(xel) {
                  if (xel.get_field_value("xelement_type") == "guide") {
                    return (new GuideModel(xel.attributes))
                  };
                }).compact().value());
                msgWithLoadTime("done with GUIDES.");
                
                if (typeof(userSelect) !== "undefined") {
                  userSelect.on('value:set', callback);  
                };

                callback();

            }); // xelements

          }); //groups

        }); //users

      }); // XEL_BASE_REQ

    },

    incompletePHQ: function(phq) { 
      return (phq.get("names").length < 9 ) 
    },

    _getPHQ9responses: function() {
      this.PHQ9responses = appHelper.phq9Responses( Dynamo.CurrentUser() );
      this.PHQ9responses.fetch({ async : false });
    },

    _mostRecentPHQ9: function() {
      
      if (!this.PHQ9responses) {

        this._getPHQ9responses()

      };

      var lastPHQ;
      lastPHQ = this.PHQ9responses.last();
      while( typeof(lastPHQ) !== "undefined" && this.incompletePHQ(lastPHQ) ) {
        lastPHQ.destroy();
        lastPHQ = this.PHQ9responses.last();
      }

      return lastPHQ;
    },    

    //function that starts the application  
    start: function () {

      _.bindAll(app, "_getPHQ9responses", "_mostRecentPHQ9" )

      Dynamo.initialize({ load_app_templates: true});

      // The application's templates, found in app_templates.html, 
      // have been at this point loaded through dynamo
      if (APPLICATION_TEMPLATES) {
        app.templates = APPLICATION_TEMPLATES;
      } else {
        app.templates = JSON.parse(localStorage.getItem("APPLICATION_TEMPLATES"));  
      }

      image_cdn = "./img/"

      // For testing, add a userSelect to the page.
      // userSelect.$el.prependTo('body');
      // userSelect.render();

      app.loadContentAssetsAndThen(function() {

        msgWithLoadTime("loadFromServer CALLBACK Start");

        msgWithLoadTime("Requiring user login...");
        Dynamo.requireLogin();  // Demand user must be logged in.
        Dynamo.CurrentUser();   // Will check if user is logged in.
        msgWithLoadTime("done Requiring user login.");
        

        // must keep in sync with expectations of mohrlab_utility.js
        var windowOpened =  new Dynamo.Data({
                              user_id: Dynamo.CurrentUser().id,
                              group_id: Dynamo.CurrentGroup().id,
                              xelement_id: SESSION_DATA_GUID,
                              session_id: Dynamo.session.get('SessionId')
                            });

        windowOpened.set_field("session_id", "string", Dynamo.session.get('SessionId'));
        windowOpened.set_field("action", "string", "window_opened");
        windowOpened.save();


        $(window).on("unload", function() {

          // Dynamo.setCookie('CurrentUser', JSON.stringify(data.user));
          var sessionId = Dynamo.session.get("session_id");

          if (sessionId) {

            // must keep in sync with expectations of mohrlab_utility.js
            var windowClose =  new Dynamo.Data({
                                  user_id: Dynamo.CurrentUser().id,
                                  group_id: Dynamo.CurrentGroup().id,
                                  xelement_id: SESSION_DATA_GUID,
                                  session_id: localStorage.getItem("session_id")
                                });

            windowClose.set_field("session_id", "string", sessionId);
            windowClose.set_field("action", "string", "window_closed");

            windowClose.save(null, {async:false});

            return "You have not logged out; Are you sure you want to stay logged in on this computer?"

          }

        });


        //Easier if it's a global.
        trackUserIdle = new idleTimer({
          // For Testing/Debugging; by default these values are 20 mins & 1 min:
          // idleTimeAllowed: 2*1000,
          // checkInterval: 1000,
          onTimeExceeded: function() {
            appHelper.logSessionEvent("inactivity_for_twenty_minutes", {}, {async: false});
            appHelper.logSessionEvent("logout", {}, {async: false});
            localStorage.removeItem("CurrentUser");
            localStorage.removeItem("session_id");
            Dynamo.redirectTo("login.html");
          },
          onNewActivity: function() {
            appHelper.logSessionEvent("new_activity_in_session");
          }
        });
        trackUserIdle.start();

        // in lib/globals;
        initializeSiteDataCollections(app);

        // First week = no PHQ9
        // PT Story #62804852
        if (appHelper.numWeeksIntoStudy() < 2) {
          app.startRegularInterface();
          msgWithLoadTime("loadFromServer CALLBACK Finish");
          return true;
        }

        // Ensure that a user has taken the PHQ9 this week before doing anything else.
        var lastPHQ9 = app._mostRecentPHQ9();
        if  (
              // Has not taken phq9 yet
              !lastPHQ9  ||
              // Most recent phq9 is not in current study week
              (appHelper.numWeeksInOf(lastPHQ9) < appHelper.numWeeksIntoStudy()) ||

              (queryParam("phq9") == "1")

            ) {

            app.startPHQ9Survey();

        }
        else {

            // The most recent phq9 is current, continue on to the normal app interface.
            app.startRegularInterface();

        };

        msgWithLoadTime("loadFromServer CALLBACK Finish");
        return true;    
      });
    }, //start

    startPHQ9Survey: function() {
      $('div#loading-data-message').remove();
      
      var newResponse = new Dynamo.Data({
        xelement_id: app.PHQ9.id,
        user_id     : Dynamo.CurrentUser().id, 
        group_id    : Dynamo.CurrentUser().get("group_id"),
      });

      newResponse.save(null, { async : false });

      $('div#main').append(''+
        '<h3 class="intro-text">'+
          'We&apos;re interested in how you&apos;re doing this week, give us a brief update before using other parts of ThinkFeelDo.'+
        '</h3>'+
        '<h4 class="directions">'+
          'Over the last 2 weeks, how often have you been bothered by any of the following problems?'+
        '</h4>'+
        '<div class="widget" id="phq"></div>'
        );

      $('a#logout').on("click", function() {

        appHelper.logSessionEvent("logout", {}, {async: false});
        localStorage.removeItem("CurrentUser");
        localStorage.removeItem("session_id");
        Dynamo.redirectTo("login.html");

      });
      
      var takePHQ = new Dynamo.CompleteAssessmentAsSingleton({
        el                : 'div#phq',
        model             : app.PHQ9,
        userResponseData  : newResponse, 
        responsesRequired  : true
      });

      takePHQ.on('finished', function() {
        this.remove();
        app.startRegularInterface();
      }, takePHQ);

      takePHQ.render();

    },

    startRegularInterface: function() {

      $('a#logout').off("click");

        periodicCheckForEvents = setTimeout(appHelper.checkForNewEvents, 10*1000, app, ["conversationPosts", "CoachConvoComments"]);

        //Create Router
        app.router = new appRouter();

        // To use Push-state API 
        // Backbone.history = Backbone.history || new Backbone.History({});
        Backbone.history.start(); //Uses Anchor-tags to route.

    }

  }; //app

  return app;

});