requirejs.config({
    //Remember: only use shim config for non-AMD scripts,
    //scripts that do not already call define(). The shim
    //config will not work correctly if used on AMD scripts,
    //in particular, the exports and init config will not
    //be triggered, and the deps config will be confusing
    //for those cases.
    paths: {
      //People
      "groups"        : "../../../authentication_assets/groups",
      "users"         : "../../../authentication_assets/users",

      //Site-content
      "app_xelement"  : "../../../content_assets/app_xelement",
      "roadmap"       : "../../../content_assets/roadmap_gsheet",
      "xelements"     : "../../../content_assets/xelements"
    }//,
    //urlArgs: "cacheBust=" +  (new Date()).getTime()
});

require([ "app" ], function( app ) { 
	$(function() {
    
    START = new Date();

    msgWithLoadTime = function(msg) {
      var now = new Date();
      console.log(msg, (now.getTime() - START.getTime()) );
    };

    msgWithLoadTime("Before app.start");
    app.start();
    msgWithLoadTime("After app.start");

  });
});
