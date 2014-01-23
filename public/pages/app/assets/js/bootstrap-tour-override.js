window.Tour = (function() {

  Tour.prototype._showPopover = function(step, i) {
    var content, nav, options, tip,
      _this = this;
    content = "" + step.content + "<br /><p>";
    options = $.extend({}, this._options);
    if (step.options) {
      $.extend(options, step.options);
    }
    options.labels = _.extend({ prev: "Previous", next: "Next", end: "End Tour" }, (options.labels || {}) );
    if (step.reflex) {
      $(step.element).css("cursor", "pointer").on("click.bootstrap-tour", function(e) {
        return _this.next();
      });
    }
    nav = [];
    if (step.prev >= 0) {
      nav.push("<a href='#" + step.prev + "' class='prev' data-role='prev'>" + options.labels.prev + "</a>");
    }
    if (step.next >= 0) {
      nav.push("<a href='#" + step.next + "' class='next' data-role='next'>" + options.labels.next + "</a>");
    }
    content += nav.join(" | ");
    var closeButton = "<button type='button' class='pull-right close' data-role='end'>&times;</button>";
    if (step.next === -1) {
      content += "<a href='#' class='pull-right' data-role='end'>" + options.labels.end + "</a>";
    }
    $(step.element).popover('destroy').popover({
      placement: step.placement,
      trigger: "manual",
      title: (step.title + closeButton),
      content: content,
      html: true,
      animation: step.animation,
      container: "body"
    }).popover("show");
    tip = $(step.element).data("popover").tip();
    this._reposition(tip, step);
    return this._scrollIntoView(tip);
  };

  return Tour;

})();