define(
    ["views/roadmap_week", "views/over_time_graph", "views/review_activities", "views/coach_panel_conversation"], 
function(RoadmapWeek, OverTimeGraph, ReviewActivitiesView, CoachPanel) {

  var appViews = {};

  appViews["RoadmapWeek"]       = RoadmapWeek;
  appViews["ReviewActivities"]  = ReviewActivitiesView;
  appViews["CoachPanel"]        = CoachPanel;
  appViews["OverTimeGraph"]     = OverTimeGraph;

  return appViews;

});