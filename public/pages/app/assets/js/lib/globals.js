define([], function() {

  // Global Variables
  COACH_CONVO_POSTS_GUID      = "STEPPED-CARE-COACH-CONVO-POSTS-GUID";
  COACH_CONVO_COMMENTS_GUID   = "STEPPED-CARE-COACH-CONVO-COMMENTS-GUID";
  SITE_EVENTS_GUID            = "STEPPED-CARE-EVENTS-GUID";
  SESSION_DATA_GUID           = "STEPPED-CARE-SESSIONS-GUID";
  LESSON_PROGRESS_GUID        = "STEPPED-CARE-LESSON-PROGRESS-GUID";    
  MOOD_RATINGS_GUID           = "STEPPED-CARE-MOOD-RATINGS-GUID";
  ACTIVITIES_GUID             = "ACTIVITY-CALENDAR-EVENTS-GUID";
  SHARED_ACTIVITIES_GUID      = "STEPPED-CARE-ACTIVITIES-GUID";
  SHARED_THOUGHT_RECORDS_GUID = "STEPPED-CARE-THOUGHT-RECORDS-GUID";

  ACTIVITY_GUIDES_GUID        = "STEPPED-CARE-ACTIVITY-TRACKER-GUIDES-GUID";
  THOUGHT_TRACKER_GUIDES_GUID = "STEPPED-CARE-THOUGHTS-TRACKER-GUIDES-GUID";  

  TOOL_AVAILABILITY = {
    activityTracker: 1,
    thoughtsTool: 8
  };

  // Expects the application variable to be passed in,
  // so that it can define the data collections as part of
  // of the application object.
  initializeSiteDataCollections = function(container) {

    container.PHQ9 = QUESTION_GROUPS.find(function(qg) { return (qg.get_field_value('title') == "PHQ 9") });

    container.conversationPosts = new Dynamo.DataCollection([], {
      xelement_id : COACH_CONVO_POSTS_GUID,
      user_id     : Dynamo.CurrentUser().id, 
      group_id    : Dynamo.CurrentUser().get("group_id"),     
      comparator: function(c) { return (new Date(c.get("created_at") )); }
    });

    msgWithLoadTime("Initializing Posts...");
    container.groupWideCoachPosts = new Dynamo.GroupWideData({
      xelement_id           : COACH_CONVO_POSTS_GUID,
      group_id              : Dynamo.CurrentUser().get("group_id"),
      collectionProperties  : {
        comparator: function(c) { return (new Date(c.get("created_at") )); }
      }
    });
    msgWithLoadTime("After Posts.");    

    msgWithLoadTime("GroupWideData definitions - start ");

    msgWithLoadTime("Initializing Comments...");
    container.CoachConvoComments = new Dynamo.GroupWideData({
      xelement_id           : COACH_CONVO_COMMENTS_GUID,
      group_id              : Dynamo.CurrentUser().get("group_id"),
      collectionProperties  : {
        comparator: function(c) { return (new Date(c.get("created_at") )); }
      }
    });
    msgWithLoadTime("After Comments.");

    msgWithLoadTime("Initializing FeedEvents...");
    container.FeedEvents = new Dynamo.GroupWideData({
      xelement_id: SITE_EVENTS_GUID,
      group_id: Dynamo.CurrentUser().get("group_id"),
      collectionProperties: {
        comparator: function(c) { return (new Date(c.get("created_at") )); }
      }
    });
    msgWithLoadTime("After FeedEvents.");

    msgWithLoadTime("Initializing SessionsData...");
    container.SessionsData = new Dynamo.GroupWideData({
      xelement_id: SESSION_DATA_GUID,
      group_id: Dynamo.CurrentUser().get("group_id"),
      collectionProperties: {
        comparator: function(c) { return (new Date(c.get("created_at") )); }
      }
    });
    msgWithLoadTime("After SessionsData.");
    
    msgWithLoadTime("Loading GroupWideData - DONE");

  };

  return void 0;

})