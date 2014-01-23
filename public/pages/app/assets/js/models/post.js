define([], function() { 

  var Post = Dynamo.Data.extend({

    defaultDataAtts: function() {
      var now = new Date(),
          y = now.getFullYear(),
          m = now.getMonth(),
          d = now.getDate(),
          h = now.getHours(),
          min = now.getMinutes();
      return {
        text: ["string", ""],
        // sent_at: ["datetime", (new Date(y, m, d, h+1, 00)).toString() ],
        // tags: ["string", ""],
      }
    },

    setText: function(newText) {
      return this.set_field("text", "string", newText);
    },

    setAsCoachMessage: function(user_id) {
      this.set_field("from_coach", "boolean", true);
      this.set_field("coach_id", "string", user_id);
    },    

    getText: function() {
      return this.get_field_value("text")
    }

  });

  return Post;

});