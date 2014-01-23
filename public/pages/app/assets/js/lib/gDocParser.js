define([], function() {

  gDocParser = {
    /**
     * Gets all the "gsx$" keys.
     * @param  {[type]} entry)   {            return _.filter(_.keys(entry) [description]
     * @param  {[type]} function (k)           {     return                 k.indexOf('gsx$') == 0; } [description]
     * @return {[type]}          [description]
     */
    gsxKeys: function(entry) { return _.filter(_.keys(entry), function (k) { return k.indexOf('gsx$') == 0; }); },

    /**
     * Gets all the non-"gsx$" keys.
     * @param  {[type]} entry)   {            return _.reject(_.keys(entry) [description]
     * @param  {[type]} function (k)           {     return                 k.indexOf('gsx$') == 0; } [description]
     * @return {[type]}          [description]
     */
    nonGsxKeys: function(entry) { return _.reject(_.keys(entry), function (k) { return k.indexOf('gsx$') == 0; }); },

    /**
     * Replaces all the entry keys beginning with "gsx$" with the substring after that string, and deletes all the keys from an entry that do not match "gsx$".
     * @param  {[type]} entry [description]
     * @return {[type]}       [description]
     */
    reformatEntry: function(entry) {
      _.each(gDocParser.nonGsxKeys(entry), function(k) { delete entry[k]; });
      _.each(gDocParser.gsxKeys(entry), function(k) { 
        var v = entry[k];
        delete entry[k];
        var newKey = k.substring(4, k.length);
        entry[newKey] = (v["$t"]).trim();
      });
      return entry;
    },

    /**
     * Removes the "$t" from a Google Spreadsheet's entry values.
     * @param  {[type]} entry         [description]
     * @param  {[type]} keysToInclude [description]
     * @return {[type]}               [description]
     */
    sanitizeKeyNames: function(entry, keysToInclude) {
      var newEntry = {};
      _.each(keysToInclude, function(k) {
        newEntry[k] = (entry[k]["$t"]).trim();
      });
      return newEntry;
    },

    // takes a googleDoc json file and returns the entries w/in the document,
    // w/ the sensical attributes, as a good ol' straightforward set of key-value pairs
    // ahh, now isn't that refreshing??
    parseEntries: function (gDoc) {
      return _.map(gDoc.feed.entry, gDocParser.reformatEntry);
    }

  }

  return gDocParser;

});