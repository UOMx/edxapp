window.isExternal=function(url){var match=url.match(/^([^:\/?#]+:)?(?:\/\/([^\/?#]*))?([^?#]+)?(\?[^#]*)?(#.*)?/);if(typeof match[1]==="string"&&match[1].length>0&&match[1].toLowerCase()!==location.protocol)return true;if(typeof match[2]==="string"&&match[2].length>0&&match[2].replace(new RegExp(":("+{"http:":80,"https:":443}[location.protocol]+")?$"),"")!==location.host)return true;return false};window.rewriteStaticLinks=function(content,from,to){if(from===null||to===null){return content}function replacer(match){if(match===from){return to}else{return match}}fromRe=from.replace(/[-\/\\^$*+?.()|[\]{}]/g,"\\$&");var regex=new RegExp("(https?://(www.)?[-a-zA-Z0-9@:%._+~#=]{2,256}.[a-z]{2,6}([-a-zA-Z0-9@:%_+.~#?&//=]*))?"+fromRe,"g");return content.replace(regex,replacer)};(function(){"use strict";var Logger=function(){var listeners={},sendRequest,has;sendRequest=function(data,options){var request=$.ajaxWithPrefix?$.ajaxWithPrefix:$.ajax;options=$.extend(true,{url:"/event",type:"POST",data:data,async:true},options);return request(options)};has=function(object,propertyName){return{}.hasOwnProperty.call(object,propertyName)};return{log:function(eventType,data,element,requestOptions){var callbacks;if(!element){element=null}if(has(listeners,eventType)){if(has(listeners[eventType],element)){callbacks=listeners[eventType][element];$.each(callbacks,function(index,callback){try{callback(eventType,data,element)}catch(err){console.error({eventType:eventType,data:data,element:element,error:err})}})}}return sendRequest({event_type:eventType,event:JSON.stringify(data),page:window.location.href},requestOptions)},listen:function(eventType,element,callback){listeners[eventType]=listeners[eventType]||{};listeners[eventType][element]=listeners[eventType][element]||[];listeners[eventType][element].push(callback)},bind:function(){window.onunload=function(){sendRequest({event_type:"page_close",event:"",page:window.location.href},{type:"GET",async:false})}}}}();this.Logger=Logger;this.log_event=Logger.log}).call(this);$(document).ready(function(){"use strict";var dropdownMenuToggle=$(".dropdown");var dropdownMenu=$(".dropdown-menu");var menuItems=dropdownMenu.find("a");dropdownMenuToggle.toggle(function(){dropdownMenu.addClass("expanded").find("a").first().focus();dropdownMenuToggle.addClass("active").attr("aria-expanded","true")},function(){dropdownMenu.removeClass("expanded");dropdownMenuToggle.removeClass("active").attr("aria-expanded","false").focus()});dropdownMenuToggle.on("keydown",function(event){if(event.which==32){dropdownMenuToggle.click();event.preventDefault()}});dropdownMenu.on("keydown",function(event){catchKeyPress($(this),event)});function catchKeyPress(object,event){var focusedItem=jQuery(":focus");var numberOfMenuItems=menuItems.length;var focusedItemIndex=menuItems.index(focusedItem);var itemToFocusIndex;if(event.which==32){dropdownMenuToggle.click();event.preventDefault()}if(event.which==27){dropdownMenuToggle.click();event.preventDefault()}if(event.which==38||event.which==9&&event.shiftKey){if(focusedItemIndex===0){menuItems.last().focus()}else{itemToFocusIndex=focusedItemIndex-1;menuItems.get(itemToFocusIndex).focus()}event.preventDefault()}if(event.which==40||event.which==9){if(focusedItemIndex==numberOfMenuItems-1){menuItems.first().focus()}else{itemToFocusIndex=focusedItemIndex+1;menuItems.get(itemToFocusIndex).focus()}event.preventDefault()}}});(function(_){var interpolate_ntext=function(singular,plural,count,values){var text=count===1?singular:plural;return _.template(text,{interpolate:/\{(.+?)\}/g})(values)};this.interpolate_ntext=interpolate_ntext;var interpolate_text=function(text,values){return _.template(text,{interpolate:/\{(.+?)\}/g})(values)};this.interpolate_text=interpolate_text}).call(this,_);(function($,undefined){var form_ext;$.form_ext=form_ext={ajax:function(options){return $.ajax(options)},handleRemote:function(element){var method=element.attr("method");var url=element.attr("action");var data=element.serializeArray();var options={type:method||"GET",data:data,dataType:"text json",success:function(data,status,xhr){element.trigger("ajax:success",[data,status,xhr])},complete:function(xhr,status){element.trigger("ajax:complete",[xhr,status])},error:function(xhr,status,error){element.trigger("ajax:error",[xhr,status,error])}};if(url){options.url=url}return form_ext.ajax(options)},CSRFProtection:function(xhr){var token=$.cookie("csrftoken");if(token)xhr.setRequestHeader("X-CSRFToken",token)}};$.ajaxPrefilter(function(options,originalOptions,xhr){if(!options.crossDomain){form_ext.CSRFProtection(xhr)}});$(document).delegate("form","submit",function(e){var form=$(this),remote=form.data("remote")!==undefined;if(remote){form_ext.handleRemote(form);return false}})})(jQuery);if(!window.location.origin){window.location.origin=window.location.protocol+"//"+window.location.hostname+(window.location.port?":"+window.location.port:"")}var focusedElementBeforeModal;var accessible_modal=function(trigger,closeButtonId,modalId,mainPageId){var focusableElementsString="a[href], area[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), iframe, object, embed, *[tabindex], *[contenteditable]";$(trigger).click(function(){focusedElementBeforeModal=$(trigger);$(mainPageId).attr("aria-hidden","true");$(modalId).attr("aria-hidden","false");var focusableItems=$(modalId).find("*").filter(focusableElementsString).filter(":visible");focusableItems.attr("tabindex","2");$(closeButtonId).attr("tabindex","1");$(closeButtonId).focus();var last;if(focusableItems.length!==0){last=focusableItems.last()}else{last=$(closeButtonId)}last.on("keydown",function(e){var keyCode=e.keyCode||e.which;if(!e.shiftKey&&keyCode===9){e.preventDefault();$(closeButtonId).focus()}});$(closeButtonId).on("keydown",function(e){var keyCode=e.keyCode||e.which;if(e.shiftKey&&keyCode==9){e.preventDefault();last.focus()}});$("#lean_overlay, "+closeButtonId).click(function(){$(mainPageId).attr("aria-hidden","false");$(modalId).attr("aria-hidden","true");focusedElementBeforeModal.focus()});$(".modal").on("keydown",function(e){var keyCode=e.keyCode||e.which;if(keyCode===27){e.preventDefault();$(closeButtonId).click()}});var initialFocus=true;$(modalId).find("iframe").on("focus",function(){if(initialFocus){$(closeButtonId).focus();initialFocus=false}})})};$(".nav-skip").click(function(){var href=$(this).attr("href");if(href){$(href).attr("tabIndex",-1).focus()}});$(".nav-skip").keypress(function(e){if(e.which==13){var href=$(this).attr("href");if(href){$(href).attr("tabIndex",-1).focus()}}});$(function(){var SRAlert;SRAlert=function(){function SRAlert(){$("body").append('<div id="reader-feedback" class="sr" style="display:none" aria-hidden="false" aria-atomic="true" aria-live="assertive"></div>');this.el=$("#reader-feedback")}SRAlert.prototype.clear=function(){return this.el.html(" ")};SRAlert.prototype.readElts=function(elts){var feedback="";$.each(elts,function(idx,value){return feedback+="<p>"+$(value).html()+"</p>\n"});return this.el.html(feedback)};SRAlert.prototype.readText=function(text){return this.el.text(text)};return SRAlert}();window.SR=new SRAlert});(function($){$.fn.extend({leanModal:function(options){var defaults={top:100,overlay:.5,closeButton:null,position:"fixed"};if($("#lean_overlay").length==0){var overlay=$("<div id='lean_overlay'></div>");$("body").append(overlay)}options=$.extend(defaults,options);return this.each(function(){var o=options;$(this).click(function(e){$(".modal").hide();var modal_id=$(this).attr("href");if($(modal_id).hasClass("video-modal")){var modal_clone=$(modal_id).clone(true,true);modal_clone.attr("id","modal_clone");$(modal_id).after(modal_clone);modal_id="#modal_clone"}$("#lean_overlay").click(function(e){close_modal(modal_id,e)});$(o.closeButton).click(function(e){close_modal(modal_id,e)});$(o.copyEmailButton).click(function(e){close_modal(modal_id,e)});var modal_height=$(modal_id).outerHeight();var modal_width=$(modal_id).outerWidth();$("#lean_overlay").css({display:"block",opacity:0});$("#lean_overlay").fadeTo(200,o.overlay);$("iframe",modal_id).attr("src",$("iframe",modal_id).data("src"));if($(modal_id).hasClass("email-modal")){$(modal_id).css({width:80+"%",height:80+"%",position:o.position,opacity:0,"z-index":11e3,left:10+"%",top:10+"%"})}else{$(modal_id).css({position:o.position,opacity:0,"z-index":11e3,left:50+"%","margin-left":-(modal_width/2)+"px",top:o.top+"px"})}$(modal_id).show().fadeTo(200,1);$(modal_id).find(".notice").hide().html("");var notice=$(this).data("notice");if(notice!==undefined){$notice=$(modal_id).find(".notice");$notice.show().html(notice);$notice.find("a[rel*=leanModal]").leanModal({top:120,overlay:1,closeButton:".close-modal",position:"absolute"})}window.scrollTo(0,0);e.preventDefault()})});function close_modal(modal_id,e){$("#lean_overlay").fadeOut(200);$("iframe",modal_id).attr("src","");$(modal_id).css({display:"none"});if(modal_id=="#modal_clone"){$(modal_id).remove()}e.preventDefault()}}});$(document).ready(function($){$("a[rel*=leanModal]").each(function(){$(this).leanModal({top:120,overlay:1,closeButton:".close-modal",position:"absolute"});embed=$($(this).attr("href")).find("iframe");if(embed.length>0&&embed.attr("src")){var sep=embed.attr("src").indexOf("?")>0?"&":"?";embed.data("src",embed.attr("src")+sep+"autoplay=1&rel=0");embed.attr("src","")}})})})(jQuery);var Language=function(){"use strict";var settings_language_selector,self=null;return{init:function(){settings_language_selector=$("#settings-language-value");self=this;this.listenForLanguagePreferenceChange()},listenForLanguagePreferenceChange:function(){settings_language_selector.change(function(event){var language=this.value,url=$(".url-endpoint").val(),is_user_authenticated=JSON.parse($(".url-endpoint").data("user-is-authenticated"));event.preventDefault();self.submitAjaxRequest(language,url,function(){if(is_user_authenticated){$("#language-settings-form").submit()}else{self.refresh()}})})},submitAjaxRequest:function(language,url,callback){$.ajax({type:"PATCH",data:JSON.stringify({"pref-lang":language}),url:url,dataType:"json",contentType:"application/merge-patch+json",notifyOnError:false,beforeSend:function(xhr){xhr.setRequestHeader("X-CSRFToken",$.cookie("csrftoken"))}}).done(function(){callback()}).fail(function(){self.refresh()})},refresh:function(){location.reload()}}}();$(document).ready(function(){"use strict";Language.init()});
