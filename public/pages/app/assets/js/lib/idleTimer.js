// idleTimer
// instantiable class, instance of which can be configured to take an action on a certain-amount-of-time-exceeded.
// instances accept an options object on instantiation for configuration.
// available OPTIONS:
//    interval: amount of time in milliseconds in between check for idleness; default = 1 min.
//    maxIdleTime: amount of time in milliseconds that can pass before someone is deemed idle; default = 20 min.
//    onTimeExceeded: callback run when allowed idle-time is exceeded; default = console.log message.
//    onNewActivity: callback run after a user has been idle and new activity is detected; default = console.log message.
define([], function() {

  idleTimer = function(options) {

    var idleTimerInstance = {

      initialize: function() {

        _.bindAll(idleTimerInstance, 'initialize', 'noteActivity', 'incrementTimer', 'start');

        options = options || {};

        this.timeSpentIdle = 0; //in milliseconds
        this.state = "tracking_idleness";
        //in milliseconds; default is 1 min:
        this.interval = options.interval            || 60*1000; 
        //in milliseconds; default is 20 min:
        this.maxIdleTime = options.maxIdleTime || 20*60*1000;
        this.onTimeExceeded = options.onTimeExceeded || function() { 
          console.log(  "idleTimer: You have been idle for more than " + 
                        (Math.floor((this.maxIdleTime / 1000 / 60)))+" minutes" )
        };
        this.onNewActivity = options.onNewActivity || function() { 
          console.log( "idleTimer: New Activity Recorded" );
        };
        
        _.bindAll(idleTimerInstance, "onTimeExceeded", "onNewActivity")

      },

      incrementTimer: function() {

        this.timeSpentIdle = this.timeSpentIdle + this.interval; 
     
        console.log("incrementTimer (interval, timeSpentIdle, maxIdleTime): ", this.interval,  this.timeSpentIdle, this.maxIdleTime );
        // If user has exceeded max amount of time, then call fn
        if (this.timeSpentIdle >= this.maxIdleTime) { 
          this.timeSpentIdle = 0;
          this.state = "watching_for_new_activity";
          this.onTimeExceeded();
          clearInterval(this.intervalId);
        };

      },

      noteActivity: function(e) {
        
        this.timeSpentIdle = 0;

        if (this.state == "watching_for_new_activity") {
          this.state = "tracking_idleness";
          this.intervalId = setInterval(this.incrementTimer, this.interval);
          this.onNewActivity();
        }

      },

      start: function () {
       
        $(document).mousemove(this.noteActivity);
        $(document).keypress(this.noteActivity);
        this.intervalId = setInterval(this.incrementTimer, this.interval);

      }    

    };

    idleTimerInstance.initialize();

    return idleTimerInstance;

  }; //end idleTimerInstance

  return idleTimer;
  
});