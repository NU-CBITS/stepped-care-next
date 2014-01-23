define(["lib/appHelper"], function(appHelper) {

  // app.atObserver
  // The app's Activity Tracker Observer.
  // takes actions on the tr's lifecycle.
  var atObserver = _.extend({}, Backbone.Events, {

    afterSave: function(atModel, resp, options)  {

      this.createStandardFeedEvent(atModel);

      UsersActivities.add(atModel, { merge: true });

      _.result(this, "reRenderFunction");

    },

    createStandardFeedEvent: function(atModel) {
      
      var username = Dynamo.CurrentUser().get("username"),
          savedInState = atModel.get_field_value("savedInState");

      if (atModel.wasNew) {

        LogReviewableUserAction({
          event_type: "User Activity Tracker",
          readable_content: ""+username+
                            " saved activity '"+
                            atModel.get_field_value('title')+"'",
          content_object: atModel.fieldsToJSON()
        });      

        if (savedInState == "scheduling") {

          appHelper.createFeedEvent({
            username: Dynamo.CurrentUser().get("username"),
            action: "scheduled an activity",
            category: "activities",
            direct_object_id: atModel.id,
            story_route: "activity_tracker",
            message:  "Scheduled activity '"      +atModel.get_field_value("title")+"'<br />"+
                      "For: "                     +atModel.get_field_value("start")+"'<br />"+
                      "Predicted Accomplishment: "+atModel.get_field_value("predicted_accomplishment")+"<br />"+
                      "Predicted Pleasure: "      +atModel.get_field_value("predicted_pleasure")
          });

        }

        if (savedInState == "monitoring") {

          appHelper.createFeedEvent({
            username: Dynamo.CurrentUser().get("username"),
            action: "recorded an activity",
            category: "activities",
            direct_object_id: atModel.id,
            story_route: "activity_tracker",
            message: "Recorded activity '"    +atModel.get_field_value("title")+"'<br />"+
                     "Which Took Place On: "  +atModel.get_field_value("start")+"'<br />"+
                     "Actual Accomplishment: "+atModel.get_field_value("actual_accomplishment")+"<br />"+
                     "Actual Pleasure: "      +atModel.get_field_value("actual_pleasure")
          });
          
        }       

      } else {

        LogReviewableUserAction({
          event_type: "User Activity Tracker",
          readable_content: ""+username+
                            " edited activity '"+
                            atModel.get_field_value('title')+"'",
          content_object:   atModel.fieldsToJSON()
        });       

        if (  (atModel.wasSavedInState == "scheduling") && 
              (savedInState == "reviewing")
           ) {

          appHelper.createFeedEvent({
            username: Dynamo.CurrentUser().get("username"),
            action: "reviewed an activity",
            category: "activities",
            direct_object_id: atModel.id,
            story_route: "activity_tracker",
            message:  "Reviewed activity '"        +atModel.get_field_value("title")+"'<br />"+
                      "Which Was Scheduled For: "  +atModel.get_field_value("start")+"'<br />"+
                      "Predicted Accomplishment: " +atModel.get_field_value("predicted_accomplishment")+"<br />"+
                      "Predicted Pleasure: "       +atModel.get_field_value("predicted_pleasure") +"<br />"+
                      "Actual Accomplishment: "    +atModel.get_field_value("actual_accomplishment")+"<br />"+
                      "Actual Pleasure: "          +atModel.get_field_value("actual_pleasure")

          });

        } // scheduling -> reviewing

      } //wasNew 

    }

  }) //atObserver

  _.bindAll(atObserver, 'afterSave', 'createStandardFeedEvent');

  return atObserver;

});