define(["lib/appHelper"], function(appHelper) {

  // app.trObserver
  // The app's Thought Record Observer.
  // takes actions on the tr's lifecycle.
  trObserver = _.extend({}, Backbone.Events, {

    afterCreate: function(trModel, resp, options)  {

      appHelper.createFeedEvent({
        username: Dynamo.CurrentUser().get("username"),
        action: "recorded a thought",
        category: "thoughts",
        direct_object_id: trModel.id,
        story_route: "thoughts",
        message:  "Completed a Thought Record: <br />"  +
                  "Situation: "               +  trModel.get_field_value("situation")           + "<br />"  +
                  "Emotion: "                 +  trModel.get_field_value("emotion")             + "<br />"  +
                  "Intensity: "               +  trModel.get_field_value("emotion_intensity")   + "<br />"  +
                  "Thought: "                 +  trModel.get_field_value("thought")             + "<br />"  +
                  "Cognitive Distortion: "    +  trModel.get_field_value("distortion")          + "<br />"  +
                  "Alternative Thought: "     +  trModel.get_field_value("alternative_thought") + "<br />"  +
                  "Outcome Intensity: "       +  trModel.get_field_value("outcome_intensity")

      });  

      _.result(this, "reRenderFunction");

    }

  });

  _.bindAll(trObserver, 'afterCreate');

  return trObserver;

});