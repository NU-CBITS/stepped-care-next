define([], function() {

  RoadmapWeek = function(options) {

    var weekView = new Dynamo.ShowArrayView({
          container         : options.container,
          el                : _.template(app.templates["partial/roadmap_week"], { week : options.week }),
          elementTemplate   : app.templates["partial/roadmap_item"],
          getArrayFn        : options.entries
        });

    return weekView;

  };

  return RoadmapWeek;

});