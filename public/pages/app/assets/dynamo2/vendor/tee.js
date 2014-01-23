// **********************************************************
// 
// tee - A small html-snippet helper library!
// 
// Adds a single global object, t, 
// which provides a small html-snippet helper library.
// 
// Created for use in client-side javascript, 
// t writes small snippets of sugary, no-mistakes HTML.
// 
// Dependencies:
// - underscore.js
// 
// **********************************************************

_.templateSettings = {
  interpolate : /\(\%\=(.+?)\%\)/g,
  evaluate    : /\(\%(.+?)\%\)/g,
  escape      : /\(\%\-(.+?)\%\)/g //interpolate with first escaping HTML
};

//internal var for storing all html-creating functions :).
window.t = {};

// MUST BE KEPT ALPHABETICAL TO BE PROPERLY USED WITH UNDERSCORE BINARY-SEARCH ALGOS
t.SELF_CLOSING_TAGS = [
  "area", "base", "br", "col", "command", 
  "embed", "hr", "img", "input", "keygen", 
  "link", "meta", "param", "source", "track", "wbr"
];

// two underscore templates,
// one for self closing tags
// one for closing tags.
// used internally by 't'.
t.sc_template = 
  "<(%= tag %)(% _.each(atts, function(value, key) { %) (%= key %)='(%= value %)'(% }); %) />";
t.ct_template = 
  "<(%= tag %)(% _.each(atts, function(value, key) { %) (%= key %)='(%= value %)'(% }); %)>" +
    "(%= content %)" + 
  "</(%= tag %)>";


// tag(_tag [, content] [, attributes])
// OR
// tag(_tag [, attributes] [, content])
//  
// _tag (string): the html tag to construct.
// content (content): what is output within the tag.
// attributes (object): the html attributes of the tag as an object.
// 
// returns the html string for the html tag as specified by '_tag', 
// with the passed in set of attributes and content.
t.tag = function(_tag) { //, atts, content

  if ( (arguments[1] !== undefined) && typeof(arguments[1]) === 'string' ) {
    content = arguments[1];
    atts = arguments[2] || {};
  } else {
    content = arguments[2] || '';
    atts = arguments[1] || {};
  };

  if (_tag) {
 
    // Not a self-closing tag 
    if (_.indexOf(t.SELF_CLOSING_TAGS, _tag, true) == -1 ) {
      return _.template(t.ct_template, { tag: _tag, atts: atts, content: content }); 
    };

    // A self-closing tag
    return _.template(t.sc_template, { tag: _tag, atts: atts });

  } else {
  
    return '';
  
  };

};

defineConvenienceMethod = function(_tag) {

  window.t[_tag] = function(atts, content) {
    return t.tag(_tag, atts, content)
  } 

};


// *************************
// 
// Tag Convenience methods
// delegate to t.tag
// 
// *************************
_.each(
  ["html","head","title","base","link","meta","style","script","noscript","body","section","nav","article","aside","h1","h2","h3","h4","h5","h6","hgroup","header","footer","address","main","p","hr","pre","blockquote","ol","ul","li","dl","dt","dd","figure","figcaption","div","a","em","strong","small","s","cite","q","dfn","abbr","data","time","code","var","samp","kbd","sub","sup","i","b","u","mark","ruby","rt","rp","bdi","bdo","span","br","wbr","ins","del","img","iframe","embed","object","param","video","audio","source","track","canvas","map","area","svg","math","table","caption","colgroup","col","tbody","thead","tfoot","tr","td","th","form","fieldset","legend","label","input","button","select","datalist","optgroup","option","textarea","keygen","output","progress","meter","details","summary","command","menu"],
  function(html_tag) {
    defineConvenienceMethod(html_tag)
  }
);





// // button
// t.button = function(content, attributes) {
//   return t.tag('button', attributes, content);
// };

// // div
// t.div = function(content, attributes) {
//   return t.tag('div', attributes, content);
// };

// //link
// t.link = function(label, href, attributes) {
//   attributes = attributes || {};
//   attributes.href = href;
//   t.tag('a', attributes, label);
// }

// // label
// // l (string): content of the label
// // _for  (string): id or name of the DOM element for which this is the label. 
// // returns the html for a label tag;
// t.label = function(l, _for) {
//   return t.tag('label', l, { for: _for });
// };

// // input
// // convenience method which returns the html for an input tag;
// // The first parameter being the label 
// // for the input tag and the second parameter 
// // being the complete set of html attributes for the input tag.
// // Internally, hands off to the tag method.
// t.input = function(attributes) {
//   return t.tag('input', attributes);
// };

// // tr
// // convenience method 
// // Internally, hands off to the tag method.
// t.tr = function(attributes, content) {
//   return t.tag('tr', attributes, content);
// };

// // td
// // convenience method 
// // Internally, hands off to the tag method.
// t.td = function(attributes, content) {
//   return t.tag('td', attributes, content);
// };


// // span
// // convenience method which returns the html for a span tag;
// // Internally, hands off to the tag method.
// t.span = function(content, attributes) {
//   return t.tag('span', content, attributes);
// };


// *************************
// 
// Functions that abstract html slightly in return for syntactic sugar
// 
// *************************


//formInput
//returns the html string for:
//a single form field of type 'type';
//with an optional label tag, 'label', 
//appropriately placed before or after the input based upon its type;
t.formInput = function(type, label, atts) {
  var content;
  atts.type = type;
  switch (type) {
    case "text":
    case "password":
      return t.label(label+" "+t.input(atts), atts.name) ;
      break;
    case "radio":
    case "checkbox":
      // return t.input(atts) + t.label(label, atts.id);
      if (atts.class == undefined) {
        atts.class = type 
      } else {
        atts.class = atts.class + " " + type
      }
      // return t.label(t.input(atts)+" "+label, atts.id);
      return t.label(t.input(atts)+" "+label, atts);
      break;
    case "option":
      return t.tag('option', atts, label);
      break;
    case "textarea":
      content = atts.value;
      delete atts.value;
      return t.label(label, atts.name) + t.div(t.tag('textarea', atts, content));
      break;
    default:
      return t.span("UNIMPLEMENTED FORM INPUT TYPE '" + type + "'", atts);
  };
};


// arguments = ???
t.formInputGroup = function() {
  var name, id, value, checked;
  name = atts.name || "";
  id = atts.id || atts.name || "";
  value = atts.value || "";
  checked = atts.checked || "";
  numberOfOptions = atts.numberOfOptions;
  // 'for' attribute in lable is actually unnecessary!
  // 'name' needs to be the same for the group
  return '<label class="'+type+'" for="'+id+'_'+numberOfOptions+'">'+
    '<input type="'+type+'" name="'+name+'" id="'+id+'_'+numberOfOptions+'" value="'+value+'" '+checked+'>'+label+
  '</label>'
///
}