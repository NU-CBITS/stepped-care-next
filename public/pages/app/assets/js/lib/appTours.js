define([], function() {

  // TO DO: refactor out to elminate the global obj. at some point.
  var appTours = {}; 

  // HOME PAGE TOUR
  var tour = new Tour({
    useLocalStorage: true,
    name: 'home_page_tour'
  });

  tour.addStep({
    element: "#road-map .homepage-widget",
    title: "<strong><i class='icon-road' style='color:#00b1c0;'></i> Road Map</strong>",
    placement: "right",
    content: "Lets you see what site content will be released each week.",
    next: 1
  });

  tour.addStep({
    element: "#mood  .homepage-widget",
    title: "<strong><i class='icon-dashboard' style='color:#fa3031;'></i> Your Mood</strong>",
    placement: "right",
    content: "Track how you feel over time and notice patterns.",
    previous: 0,
    next: 2
  });

  tour.addStep({
    element: "#lessons .homepage-widget",
    title: "<strong><i class='icon-lightbulb' style='color:#00b1c0;'></i> Today's Lesson</strong>",
    placement: "right",
    content: "A short useful topic, released (almost) daily.",
    previous: 1,
    next: 3
  });

  tour.addStep({
    element: "#do .homepage-widget",
    title: "<strong><i class='icon-calendar' style='color:orange;'></i> The Activity Tracker</strong>",
    placement: "right",
    content: "Record activities you&#39;ve done and plan future activities.",
    previous: 2,
    next: 4
  });

  tour.addStep({
    element: "#think-and-feel .homepage-widget",
    title: "<strong><i class='icon-puzzle' style='color:orange;'></i> The Thoughts Journal</strong>",
    placement: "right",
    content: "Record thoughts you&#39;ve had and carefully examine them to change your outlook.",
    previous: 3,
    next: 5
  });

  tour.addStep({
    element: "#coach-container",
    title: "<strong><i class='icon-comment' style='color:orange;'></i> The Coach Panel</strong>",
    placement: "left",
    content: "At all times using the site, you can access the dialogue between you and your coach by using the coach&#39;s panel.",
    previous: 4
  });

  appTours.homePage = tour;

  // BUZZ EXPLAINED
  var tour = new Tour({
    useLocalStorage: true,
    name: 'explain_buzz'
  });

  tour.addStep({
    element: "div#user-status-widgets button.buzz:first",
    title: "<strong><i class='icon-bolt' style='color:black;'></i>The Buzz Button</strong>",
    template: "<div class='popover tour'><div class='arrow'></div><h3 class='popover-title'></h3><div class='popover-content'></div><div class='popover-navigation'><button class='btn btn-default' data-role='end'>Close</button></div></div>",
    content: "When you buzz a user, they receive an email letting them know that you want them to come back and participate; You can buzz someone at most once per day.",
    options: { labels: { end: "Close" } },
    prev: -1,
    next: -1
  });
  appTours.explainBuzz = tour;  
  

  // Additional Functions
  appTours.explainBuzzOnce = function() {

    if ($("div#user-status-widgets button.buzz:first").length > 0) {
      appTours.explainBuzz.start();
    }

  };

  appTours.run = function(tourName, fnName, argsArray) {
    var fn = appTours[tourName][fnName];
    return fn.apply(appTours[tourName], argsArray);
  };

  return appTours;

});