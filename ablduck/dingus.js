"use strict";

var commonmark = window.commonmark;
var writer = new commonmark.HtmlRenderer({ sourcepos: true });
var htmlwriter = new commonmark.HtmlRenderer({ sourcepos: false });
var xmlwriter = new commonmark.XmlRenderer({ sourcepos: false });
var reader = new commonmark.Parser();
var isInternal = false;
var deprecated = null;

var tagTemplate = "( *?[TOKEN]\\s*?([\\s\\S]*?))(?:\\n\\s*?@author|\\n\\s*?@internal|\\n\\s*?@deprecated|\\n\\s*?@param|\\n\\s*?@return|$)";
var tags        = ["@author", "@internal", "@deprecated", "@param", "@return"];
var tagRegex    = {};

var linkTag = new RegExp("{@link +(\\S+) *([\\s\\S]*?)}", "g");
var deprecatedTag = new RegExp("@deprecated\\s+?(\\S+?)\\s+?([\\s\\S]*)");

var commentLeadingAstrix = new RegExp("^\\s*\\*(?: |)(\\n?|[\\s\\S]+?)", "mg");
var commentTagsAdd = new RegExp("^", "mg");

function getQueryVariable(variable) {
    var query = window.location.search.substring(1);
    var vars = query.split("&");
    for (var i = 0; i < vars.length; i++) {
        var pair = vars[i].split("=");
        if (pair[0] === variable){
            return decodeURIComponent(pair[1]);
        }
    }
    return null;
}

var trimCommentLines = function(comment) {

    var start = comment.indexOf('\n'),
        end   = comment.lastIndexOf('\n');

    if (start === end)
        return "";

    if (start != -1 && end != -1)
        comment = comment.substring(start + 1, end);

    comment = comment.replace(commentLeadingAstrix, "$1");

    return comment;
}

var addCommentLines = function(comment) {
    var padding = "".padStart(parseInt($("#indent").val(), " "));

    
    comment = padding + "/**\n" + comment.replace(commentTagsAdd, padding + " * ") + "\n" + padding + " */";

    return comment;
}

var render = function(parsed) {
    if (parsed === undefined) {
        return;
    }
    var startTime = new Date().getTime();
    var result = writer.render(parsed);
    var endTime = new Date().getTime();
    var renderTime = endTime - startTime;
    var preview = $("#preview iframe").contents().find('.doc-contents');

    if (isInternal)
        result = '<div class="rounded-box private-box"><p><strong>NOTE:</strong>This is a private [method,property,class,constructor,event] for internal use by the framework. Don\'t rely on its existence.</p></div>' + result;
    if (deprecated)
        result = '<div class="rounded-box deprecated-box deprecated-tag-box"><p>This [method,property,class,constructor,event] has been <strong>deprected</strong> since [VERSION]</p><p>[MESSAGE]</p></div><br>'.replace("[VERSION]", deprecated[0]).replace("[MESSAGE]", deprecated[1]) + result;


    preview.get(0).innerHTML = result;
    $("#rendertime").text(renderTime);
};

var parseAndRender = function() {
    var textarea = $("#text");
    var startTime = new Date().getTime();

    if ($("#commentTags").prop('checked')) 
        var comment = trimCommentLines(textarea.val());
    else 
        var comment = textarea.val();

    comment = comment.replace(linkTag, function(complete_match, cls, link_text) {
        return "<a href='#'>" + (link_text || cls) + "</a>";
    });

    isInternal = false;
    deprecated = null;

    for (var i = tags.length - 1; i >= 0; i--) {
        var match = comment.match(tagRegex[tags[i]]);
        if (match) {
            switch (tags[i]) {
                case '@internal':
                    isInternal = true;
                    break;
                case '@deprecated':
                    var dep = match[0].match(deprecatedTag);
                    deprecated = [];
                    deprecated.push(dep[1]);
                    deprecated.push(dep[2]);
                    break;
            }
        }
        comment = comment.replace(tagRegex[tags[i]], "");   
    }

    var parsed = reader.parse(comment);
    var endTime = new Date().getTime();
    var parseTime = endTime - startTime;
    $("#parsetime").text(parseTime);
    $(".timing").css('visibility', 'visible');
    render(parsed);
};

$(document).ready(function() {
  $('iframe').on('load', function() {
    var textarea = $("#text");
    var initial_text = getQueryVariable("text");
    
    if (initial_text) {
        textarea.val(initial_text);
    }

    for (var i = tags.length - 1; i >= 0; i--) {
        
        tagRegex[tags[i]] = new RegExp(tagTemplate.replace("[TOKEN]",  tags[i]), "g");
   
    }

    parseAndRender();

    $("#clear-text-box").click(function() {
        textarea.val('');
        parseAndRender();
    });

    $("#indent").change(function() {
        if ($("#commentTags").prop('checked')) {
            var textarea = $("#text");
            textarea.val(trimCommentLines(textarea.val()));
            textarea.val(addCommentLines(textarea.val()));
            parseAndRender();
        }
    });

    $("#commentTags").click(function() {
        var textarea = $("#text");
        var commentTags = $("#commentTags").prop('checked');
        if (commentTags) {
            textarea.val(addCommentLines(textarea.val()));
        } else {
            textarea.val(trimCommentLines(textarea.val()));
        }

        parseAndRender();

    });

    textarea.bind('input propertychange',
                  _.debounce(parseAndRender, 50, { maxWait: 100 }));
    

  });
});
