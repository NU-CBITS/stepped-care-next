// eventFilters
// FilterSet instance for the Activity Tracker
define([ "lib/appHelper",
         "lib/filter_set", 
         "lib/timeframeFilter",
         "lib/pleasureAccomplishmentFilter"], 
  function(appHelper, FilterSet, timeframeFilter, pleasureAccomplishmentFilter) {

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

  eventFilters.add(pleasureAccomplishmentFilter);

  return eventFilters;

});