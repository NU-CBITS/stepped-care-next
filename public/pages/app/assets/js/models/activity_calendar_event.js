define([], function() { 

  var ActivityCalEvent = Dynamo.Data.extend({

    defaultDataAtts: function() {
      var now = new Date(),
          y = now.getFullYear(),
          m = now.getMonth(),
          d = now.getDate(),
          h = now.getHours(),
          min = now.getMinutes();
      return {
        // id: 1,
        title: ["string", ""],
        allDay: ["boolean", false],
        start: ["datetime", (new Date(y, m, d, h+1, 00)).toString() ],
        end: ["datetime", (new Date(y, m, d, h+2, 00)).toString() ],
        tags: ["string", ""],
        predicted_pleasure: ["number", null],
        predicted_accomplishment: ["number", null],
        actual_pleasure: ["number", null],
        actual_accomplishment: ["number", null],  
        emotion: ["string", ""],
        emotion_intensity: ["number", null],
        motivation: ["string", ""],
        eventCompleted: ["boolean", null],
        savedInState: ["string", ""],
        shared: ["boolean", true]
      }
    }

  });

  return ActivityCalEvent;

});