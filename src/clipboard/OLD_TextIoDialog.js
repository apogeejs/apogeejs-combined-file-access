import ace from "/apogeejs-releases/releases/ext/ace/v1.4.12/ace.es.js";
import {uiutil, dialogMgr}  from "/apogeejs-ui-lib/src/apogeeUiLib.js";

/** This method shows a dialog that inputs or outputs a text area.
 * The onSubmitFunction should return true if the dialog should close and false if it should stay open. 
 * This dialog uses a text area that allows for better cut/paste speed with very large input/output. */
export function showTextIoDialog(options,onSubmitFunction) {
    
    var dialog = dialogMgr.createDialog({"minimizable":true,"maximizable":true,"movable":true});
            
    //add a scroll container
    var contentContainer = uiutil.createElement("div",null,
        {
			"display":"block",
            "position":"relative",
            "top":"0px",
            "height":"100%",
            "overflow": "auto"
        });
	dialog.setContent(contentContainer,uiutil.SIZE_WINDOW_TO_CONTENT);
    
	var content = uiutil.createElement("div",null,
			{
				"display":"table",
				"overflow":"hidden"
			});
	contentContainer.appendChild(content);
    
    var line;
    
    //title
    if(options.title) {
        line = uiutil.createElement("div",{"className":"dialogLine"});
        line.appendChild(uiutil.createElement("div",{"className":"dialogTitle"}));
        line.innerHTML = options.title;
        content.appendChild(line);
    }
    
    //instructions
    if(options.instructions) {
        line = uiutil.createElement("div",{"className":"dialogLine"});
        line.appendChild(uiutil.createElement("div",/*{"className":"xxx"}*/));
        line.innerHTML = options.instructions;
        content.appendChild(line);
    }
    
    //text area
    line = uiutil.createElement("div",{"className":"dialogLine"});
    var editorDiv = uiutil.createElement("div",null,
        {
            "position":"relative",
            "width":"500px",
            "height":"300px",
            "border":"1px solid darkgray"
        });
    line.appendChild(editorDiv);
    content.appendChild(line);
        
//    var jsLinksEditorDiv = uiutil.createElement("div",null,{
//        "position":"absolute",
//        "top":"0px",
//        "bottom":"0px",
//        "right":"0px",
//        "left":"0px"
//    });
//    editorDiv.appendChild(jsLinksEditorDiv);
    
    var textEditor = ace.edit(editorDiv);
//this stops an error message
textEditor.$blockScrolling = Infinity;
    textEditor.setTheme("ace/theme/eclipse");
    textEditor.getSession().setMode("ace/mode/text");
    //set the value
    if(options.initialText) {
        textEditor.getSession().setValue(options.initialText);
    }
    
    //save and cancel buttons
    //buttons and handler
    line = uiutil.createElement("div",{"className":"dialogLine"});
    var onCancel = function() {
        closeDialog();
    }
    
    var onSave = function() {
        var outputText = textEditor.getSession().getValue();
        var doClose = onSubmitFunction(outputText);
        if(doClose) closeDialog();
    }
    
    var closeDialog = function() {
        dialogMgr.closeDialog(dialog);
        
        //clean up the editor
        if(textEditor) { 
            textEditor.destroy();
            textEditor = null;
        }
    }
    
    var submitLabel = options.submitLabel ? options.submitLabel : "Submit";
    line.appendChild(uiutil.createElement("button",{"className":"dialogButton","innerHTML":submitLabel,"onclick":onSave}));
    line.appendChild(uiutil.createElement("button",{"className":"dialogButton","innerHTML":"Cancel","onclick":onCancel}));
    content.appendChild(line);
    
    dialog.setContent(content,uiutil.SIZE_WINDOW_TO_CONTENT);
    
    //show dialog
    dialogMgr.showDialog(dialog);
}



