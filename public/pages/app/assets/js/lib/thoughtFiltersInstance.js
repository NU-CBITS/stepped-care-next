// thoughtFilters
// FilterSet instance for The Thought Tracker
define([
  "lib/appHelper",
  "lib/filter_set", 
  "lib/timeframeFilter"], 
  function(appHelper, FilterSet, timeframeFilter) {

  var eventFilters = new FilterSet();

  eventFilters.add(timeframeFilter);

  eventFilters.add({
    attribute:"tags",
    attrAccessorFn:"get_field_value",
    type: "inclusive",
    currentFilterValuesFn: function() { return appHelper.selectedValues("#topic-filters") }
  });

  eventFilters.add({
    attribute:"emotion",
    attrAccessorFn:"get_field_value",
    type: "inclusive",
    currentFilterValuesFn: function() { return appHelper.selectedValues("#emotion-filters") }
  });

  eventFilters.add({
    attribute:"distortion",
    attrAccessorFn:"get_field_value",
    type: "inclusive",
    currentFilterValuesFn: function() { return appHelper.selectedValues("#distortion-filters") }
  });

  return eventFilters;

});