define([], function() {

  var overTimeGraph = function(options) {

      var opts = options;

      var graphData = opts.dataCollection.map(function(datum) { 

        var datumTime = (new Date((datum.get("created_at"))));

        return [ 
          (datumTime.getTime() - 1000*60*datumTime.getTimezoneOffset()) , 
          parseInt(datum.get_field_value(opts.field)) 
        ] 
        
      });

      this.render = function() {

        var min = opts.min || 0;
        var max = opts.max || 10;

        $(opts.el).highcharts({
          chart: { type: 'spline' },
          title: { text: 'My '+opts.fieldName+' Over Time' },
          // subtitle: {
          //     text: 'An example of irregular time data in Highcharts JS'
          // },
          xAxis: {
              type: 'datetime',
              dateTimeLabelFormats: { // don't display the dummy year
                  month: '%e. %b',
                  year: '%b'
              }
          },
          yAxis: {
              title: {
                  text: opts.fieldName
              },
              min: min,
              max: max
          },
          tooltip: {
            formatter: function() {
              return Highcharts.dateFormat('%a %b. %e, %l:%M %P', this.x) +': <strong>'+this.y+'</strong>';
            }
          },
          
          series: [{
              name: opts.fieldName,
              // expected format for data:
              // [
              //  [Date, 0   ],
              //  [Date, 0.6 ],...
              // ]
              data: graphData

          }]
        });        
      };
  };

  return overTimeGraph;

});