define([], function() {

  var ThoughtsToolEvent = Dynamo.Data.extend({

    defaultDataAtts: function() {
      var now = new Date(),
          y = now.getFullYear(),
          m = now.getMonth(),
          d = now.getDate(),
          h = now.getHours(),
          min = now.getMinutes();
      return {
        situation: ["string", ""],
        tags: ["string", ""],
        start: ["datetime", (new Date(y, m, d, h+1, 00)).toString()],
        end: ["datetime", (new Date(y, m, d, h+2, 00)).toString()],
        thought: ["string", ""],
        emotion: ["string", ""],
        emotion_intensity: ["number", null],
        alternative_thought: ["string", ""],
        outcome: ["string", ""],  
        outcome_intensity: ["number", null],
        distortion: ["string", ""],
        shared: ["boolean", true]
      }
    }

  });

  return ThoughtsToolEvent;

});