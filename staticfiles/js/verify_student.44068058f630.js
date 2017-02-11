$(function(){if($(".filter nav").length>0){var offset=$(".filter nav").offset().top;$(window).scroll(function(){if(offset<=window.pageYOffset){return $(".filter nav").addClass("fixed-top")}else if(offset>=window.pageYOffset){return $(".filter nav").removeClass("fixed-top")}})}});function getParameterByName(name){var match=RegExp("[?&]"+name+"=([^&]*)").exec(window.location.search);return match?decodeURIComponent(match[1].replace(/\+/g," ")):null}var edx=edx||{};(function($,Backbone){"use strict";edx.verify_student=edx.verify_student||{};edx.verify_student.VerificationModel=Backbone.Model.extend({defaults:{fullName:null,faceImage:"",identificationImage:null,courseKey:null,checkpoint:null},sync:function(method,model){var headers={"X-CSRFToken":$.cookie("csrftoken")},data={};data.face_image=model.get("faceImage");if(model.has("identificationImage")){data.photo_id_image=model.get("identificationImage")}if(model.has("fullName")){data.full_name=model.get("fullName");window.analytics.track("edx.bi.user.full_name.changed",{category:"verification"})}if(model.has("courseKey")&&model.has("checkpoint")){data.course_key=model.get("courseKey");data.checkpoint=model.get("checkpoint")}$.ajax({url:"/verify_student/submit-photos/",type:"POST",data:data,headers:headers,success:function(response){model.trigger("sync",response.url)},error:function(error){model.trigger("error",error)}})}})})(jQuery,Backbone);var edx=edx||{};(function($,_,Backbone){"use strict";edx.verify_student=edx.verify_student||{};edx.verify_student.ErrorView=Backbone.View.extend({initialize:function(obj){var ErrorModel=Backbone.Model.extend({});this.model=obj.model||new ErrorModel({errorTitle:"",errorMsg:"",shown:false});this.listenTo(this.model,"change",this.render)},render:function(){var renderedHtml=_.template($("#error-tpl").html())({errorTitle:this.model.get("errorTitle"),errorMsg:this.model.get("errorMsg")});$(this.el).html(renderedHtml);if(this.model.get("shown")){$(this.el).show();$("html, body").animate({scrollTop:0})}else{$(this.el).hide()}}})})($,_,Backbone);var edx=edx||{};(function($,_,Backbone,gettext){"use strict";edx.verify_student=edx.verify_student||{};edx.verify_student.ImageInputView=Backbone.View.extend({template:"#image_input-tpl",initialize:function(obj){this.$submitButton=obj.submitButton?$(obj.submitButton):"";this.modelAttribute=obj.modelAttribute||"";this.errorModel=obj.errorModel||null},render:function(){var renderedHtml=_.template($(this.template).html())({});$(this.el).html(renderedHtml);this.setSubmitButtonEnabled(false);this.$input=$("input.image-upload");this.$preview=$("img.preview");this.$input.on("change",_.bind(this.handleInputChange,this));this.displayImage(false);return this},handleInputChange:function(event){var files=event.target.files,reader=new FileReader;if(files[0]&&files[0].type.match("image.[png|jpg|jpeg]")){reader.onload=_.bind(this.handleImageUpload,this);reader.onerror=_.bind(this.handleUploadError,this);reader.readAsDataURL(files[0])}else if(files.length===0){this.handleUploadError(false)}else{this.handleUploadError(true)}},handleImageUpload:function(event){var imageData=event.target.result;this.model.set(this.modelAttribute,imageData);this.displayImage(imageData);this.setSubmitButtonEnabled(true);if(this.errorModel){this.errorModel.set({shown:false})}this.trigger("imageCaptured")},displayImage:function(imageData){if(imageData){this.$preview.attr("src",imageData).removeClass("is-hidden").attr("aria-hidden","false")}else{this.$preview.attr("src","").addClass("is-hidden").attr("aria-hidden","true")}},handleUploadError:function(displayError){this.displayImage(null);this.setSubmitButtonEnabled(false);if(this.errorModel){if(displayError){this.errorModel.set({errorTitle:gettext("Image Upload Error"),errorMsg:gettext("Please verify that you have uploaded a valid image (PNG and JPEG)."),shown:true})}else{this.errorModel.set({shown:false})}}this.trigger("error")},setSubmitButtonEnabled:function(isEnabled){this.$submitButton.toggleClass("is-disabled",!isEnabled).prop("disabled",!isEnabled).attr("aria-disabled",!isEnabled)}})})(jQuery,_,Backbone,gettext);var edx=edx||{},key={enter:13};(function($,_,Backbone,gettext){"use strict";edx.verify_student=edx.verify_student||{};edx.verify_student.WebcamPhotoView=Backbone.View.extend({template:"#webcam_photo-tpl",el:"#webcam",backends:{html5:{name:"html5",initialize:function(obj){this.URL=window.URL||window.webkitURL;this.video=obj.video||"";this.canvas=obj.canvas||"";this.stream=null;var getUserMedia=this.getUserMediaFunc();if(getUserMedia){getUserMedia({video:true,fake:window.location.hostname==="localhost"},_.bind(this.getUserMediaCallback,this),_.bind(this.handleVideoFailure,this))}},isSupported:function(){return this.getUserMediaFunc()!==undefined},snapshot:function(){var video;if(this.stream){video=this.getVideo();this.getCanvas().getContext("2d").drawImage(video,0,0);video.pause();return true}return false},getImageData:function(){return this.getCanvas().toDataURL("image/png")},reset:function(){this.getVideo().play()},getUserMediaFunc:function(){var userMedia=navigator.getUserMedia||navigator.webkitGetUserMedia||navigator.mozGetUserMedia||navigator.msGetUserMedia;if(userMedia){return _.bind(userMedia,navigator)}},getUserMediaCallback:function(stream){var video=this.getVideo();this.stream=stream;video.src=this.URL.createObjectURL(stream);video.play();this.trigger("webcam-loaded")},getVideo:function(){return $(this.video).first()[0]},getCanvas:function(){return $(this.canvas).first()[0]},handleVideoFailure:function(){this.trigger("error",gettext("Video Capture Error"),gettext("Please verify that your webcam is connected and that you have allowed your browser to access it."))}},flash:{name:"flash",initialize:function(obj){this.wrapper=obj.wrapper||"";this.imageData="";this.checkCameraSupported()},isSupported:function(){try{var flashObj=new ActiveXObject("ShockwaveFlash.ShockwaveFlash");if(flashObj){return true}}catch(ex){if(navigator.mimeTypes["application/x-shockwave-flash"]!==undefined){return true}}return false},snapshot:function(){var flashObj=this.getFlashObject();if(flashObj.cameraAuthorized()){this.imageData=flashObj.snap();return true}return false},reset:function(){this.getFlashObject().reset()},getImageData:function(){return this.imageData},flashObjectTag:function(){return'<object type="application/x-shockwave-flash" '+'id="flash_video" '+'name="flash_video" '+'data="/static/js/verify_student/CameraCapture.swf" '+'width="500" '+'height="375">'+'<param name="quality" value="high">'+'<param name="allowscriptaccess" value="sameDomain">'+"</object>"},getFlashObject:function(){return $("#flash_video")[0]},checkCameraSupported:function(){var flashObj=this.getFlashObject(),isLoaded=false,hasCamera=false;isLoaded=flashObj&&flashObj.hasOwnProperty("percentLoaded")&&flashObj.percentLoaded()===100;hasCamera=flashObj&&flashObj.hasOwnProperty("hasCamera")&&flashObj.hasCamera();if(isLoaded&&!hasCamera){this.trigger("error",gettext("No Webcam Detected"),gettext("You don't seem to have a webcam connected.")+"  "+gettext("Double-check that your webcam is connected and working to continue."))}else if(!isLoaded&&!hasCamera){setTimeout(_.bind(this.checkCameraSupported,this),50)}}}},initialize:function(obj){this.submitButton=obj.submitButton||"";this.modelAttribute=obj.modelAttribute||"";this.errorModel=obj.errorModel||null;this.backend=this.backends[obj.backendName]||obj.backend;this.captureSoundPath=obj.captureSoundPath||"";this.backend.initialize({wrapper:"#camera",video:"#photo_id_video",canvas:"#photo_id_canvas"});_.extend(this.backend,Backbone.Events);this.listenTo(this.backend,"error",this.handleError);this.listenTo(this.backend,"webcam-loaded",this.handleWebcamLoaded)},isSupported:function(){return this.backend.isSupported()},render:function(){var renderedHtml,$resetBtn,$captureBtn;this.setSubmitButtonEnabled(false);renderedHtml=_.template($(this.template).html())({backendName:this.backend.name});$(this.el).html(renderedHtml);$resetBtn=this.$el.find("#webcam_reset_button");$captureBtn=this.$el.find("#webcam_capture_button");$resetBtn.on("click",_.bind(this.reset,this));$captureBtn.on("click",_.bind(this.capture,this));$resetBtn.on("keyup",_.bind(this.resetByEnter,this));$captureBtn.removeClass("is-hidden");$("#webcam_capture_button",this.el).removeClass("is-hidden");$("#webcam_capture_sound",this.el).attr("src",this.captureSoundPath);return this},reset:function(){this.setSubmitButtonEnabled(false);this.backend.reset();this.model.set(this.modelAttribute,"");$("#webcam_reset_button",this.el).addClass("is-hidden");$("#webcam_capture_button",this.el).removeClass("is-hidden");$(this.submitButton).attr("title","")},resetByEnter:function(event){if(event.keyCode==key.enter){this.reset()}},capture:function(){var success=this.backend.snapshot();if(success){this.trigger("imageCaptured");$("#webcam_capture_button",this.el).addClass("is-hidden");$("#webcam_reset_button",this.el).removeClass("is-hidden");this.model.set(this.modelAttribute,this.backend.getImageData());this.setSubmitButtonEnabled(true);this.setSubmitButtonFocused();this.captureSound()}},handleWebcamLoaded:function(errorTitle,errorMsg){$("#camera .placeholder-art",this.el).hide()},handleError:function(errorTitle,errorMsg){$("#webcam_capture_button",this.el).addClass("is-hidden");$("#webcam_reset_button",this.el).addClass("is-hidden");if(this.errorModel){this.errorModel.set({errorTitle:errorTitle,errorMsg:errorMsg,shown:true})}},setSubmitButtonEnabled:function(isEnabled){$(this.submitButton).toggleClass("is-disabled",!isEnabled).prop("disabled",!isEnabled).attr("aria-disabled",!isEnabled)},captureSound:function(){$("#webcam_capture_sound")[0].play()},setSubmitButtonFocused:function(){$(this.submitButton).trigger("focus").attr("title",gettext("Photo Captured successfully."))},isMobileDevice:function(){return navigator.userAgent.match(/(Android|iPad|iPhone|iPod)/g)?true:false}});edx.verify_student.getSupportedWebcamView=function(obj){var view=null;obj.backendName="html5";view=new edx.verify_student.WebcamPhotoView(obj);if(view.isSupported()){return view}obj.backendName="flash";view=new edx.verify_student.WebcamPhotoView(obj);if(view.isSupported()){return view}if(!view.isMobileDevice()&&!view.isSupported()){view.backend.trigger("error",gettext("No Flash Detected"),gettext("You don't seem to have Flash installed. Get Flash to continue your verification."));return view}return new edx.verify_student.ImageInputView(obj)}})(jQuery,_,Backbone,gettext);var edx=edx||{};(function($,_,Backbone,gettext){"use strict";edx.verify_student=edx.verify_student||{};edx.verify_student.StepView=Backbone.View.extend({initialize:function(obj){_.extend(this,obj);_.mixin(_.str.exports())},render:function(){var templateHtml=$("#"+this.templateName+"-tpl").html();this.updateContext(this.templateContext()).done(function(templateContext){edx.HtmlUtils.setHtml($(this.el),edx.HtmlUtils.template(templateHtml)(templateContext));this.postRender()}).fail(_.bind(this.handleError,this));return this},handleError:function(errorTitle,errorMsg){this.errorModel.set({errorTitle:errorTitle||gettext("Error"),errorMsg:errorMsg||gettext("An error has occurred. Please try reloading the page."),shown:true})},templateContext:function(){var context={nextStepTitle:this.nextStepTitle};return _.extend(context,this.defaultContext(),this.stepData)},defaultContext:function(){return{}},updateContext:function(templateContext){var view=this;return $.Deferred(function(defer){defer.resolveWith(view,[templateContext])}).promise()},postRender:function(){},nextStep:function(){this.trigger("next-step")},goToStep:function(stepName){this.trigger("go-to-step",stepName)}})})(jQuery,_,Backbone,gettext);var edx=edx||{};(function($){"use strict";edx.verify_student=edx.verify_student||{};edx.verify_student.IntroStepView=edx.verify_student.StepView.extend({templateName:"intro_step",defaultContext:function(){return{introTitle:"",introMsg:"",isActive:false,hasPaid:false,platformName:"",requirements:{}}},postRender:function(){window.analytics.page("verification",this.templateName)}})})(jQuery);var edx=edx||{};(function($,_,gettext,interpolate_text){"use strict";edx.verify_student=edx.verify_student||{};edx.verify_student.MakePaymentStepView=edx.verify_student.StepView.extend({templateName:"make_payment_step",btnClass:"action-primary",initialize:function(obj){_.extend(this,obj);if(this.templateContext().isABTesting){this.templateName="make_payment_step_ab_testing";this.btnClass="action-primary-blue"}},defaultContext:function(){return{isActive:true,suggestedPrices:[],minPrice:0,sku:"",currency:"usd",upgrade:false,verificationDeadline:"",courseName:"",requirements:{},hasVisibleReqs:false,platformName:"",alreadyVerified:false,courseModeSlug:"audit",verificationGoodUntil:"",isABTesting:false}},_getProductText:function(modeSlug,isUpgrade){switch(modeSlug){case"professional":return gettext("Professional Education Verified Certificate");case"no-id-professional":return gettext("Professional Education");default:if(isUpgrade){return gettext("Verified Certificate upgrade")}else{return gettext("Verified Certificate")}}},_getPaymentButtonText:function(processorName){if(processorName.toLowerCase().substr(0,11)=="cybersource"){return gettext("Checkout")}else if(processorName.toLowerCase()=="paypal"){return gettext("Checkout with PayPal")}else{return interpolate_text(gettext("Checkout with {processor}"),{processor:processorName})}},_getPaymentButtonHtml:function(processorName){var self=this;return _.template('<button class="next <%- btnClass %> payment-button" id="<%- name %>" ><%- text %></button> ')({name:processorName,text:self._getPaymentButtonText(processorName),btnClass:this.btnClass})},postRender:function(){var templateContext=this.templateContext(),hasVisibleReqs=_.some(templateContext.requirements,function(isVisible){return isVisible}),processors=templateContext.processors||[],self=this;window.analytics.page("payment",this.templateName);if(templateContext.upgrade||!templateContext.contributionAmount||!hasVisibleReqs){$(".wrapper-task").removeClass("hidden").removeAttr("aria-hidden")}if(templateContext.suggestedPrices.length>0){$('input[name="contribution"]').on("click",_.bind(this.setPaymentEnabled,this))}else{this.setPaymentEnabled(true)}$("div.payment-buttons span.product-name").append(self._getProductText(templateContext.courseModeSlug,templateContext.upgrade));if(processors.length===0){this.errorModel.set({errorTitle:gettext("All payment options are currently unavailable."),errorMsg:gettext("Try the transaction again in a few minutes."),shown:true})}else{_.each(processors.reverse(),function(processorName){$("div.payment-buttons").append(self._getPaymentButtonHtml(processorName))})}$(".payment-button").on("click",_.bind(this.createOrder,this))},setPaymentEnabled:function(isEnabled){if(_.isUndefined(isEnabled)){isEnabled=true}$(".payment-button").toggleClass("is-disabled",!isEnabled).prop("disabled",!isEnabled).attr("aria-disabled",!isEnabled)},createOrder:function(event){var paymentAmount=this.getPaymentAmount(),postData={processor:event.target.id,contribution:paymentAmount,course_id:this.stepData.courseKey,sku:this.templateContext().sku};this.setPaymentEnabled(false);$(event.target).toggleClass("is-selected");$.ajax({url:"/verify_student/create_order/",type:"POST",headers:{"X-CSRFToken":$.cookie("csrftoken")},data:postData,context:this,success:this.handleCreateOrderResponse,error:this.handleCreateOrderError})},handleCreateOrderResponse:function(paymentData){var form=$("#payment-processor-form");$("input",form).remove();form.attr("action",paymentData.payment_page_url);form.attr("method","POST");_.each(paymentData.payment_form_data,function(value,key){$("<input>").attr({type:"hidden",name:key,value:value}).appendTo(form)});window.analytics.page("payment","payment_processor_step");this.submitForm(form)},handleCreateOrderError:function(xhr){var errorMsg=gettext("An error has occurred. Please try again.");if(xhr.status===400){errorMsg=xhr.responseText}this.errorModel.set({errorTitle:gettext("Could not submit order"),errorMsg:errorMsg,shown:true});this.setPaymentEnabled(true);$(".payment-button").toggleClass("is-selected",false)},getPaymentAmount:function(){var contributionInput=$('input[name="contribution"]:checked',this.el),amount=null;if(contributionInput.attr("id")==="contribution-other"){amount=$('input[name="contribution-other-amt"]',this.el).val()}else{amount=contributionInput.val()}if(!amount){amount=this.templateContext().minPrice}return amount},selectPaymentAmount:function(amount){var amountFloat=parseFloat(amount),foundPrice,sel;foundPrice=_.find(this.stepData.suggestedPrices,function(price){return parseFloat(price)===amountFloat});if(foundPrice){sel=_.sprintf('input[name="contribution"][value="%s"]',foundPrice);$(sel).prop("checked",true)}else{$("#contribution-other-amt",this.el).val(amount);$("#contribution-other",this.el).prop("checked",true)}this.setPaymentEnabled();return amount},submitForm:function(form){form.submit()}})})(jQuery,_,gettext,interpolate_text);var edx=edx||{};(function($,_,gettext){"use strict";edx.verify_student=edx.verify_student||{};edx.verify_student.PaymentConfirmationStepView=edx.verify_student.StepView.extend({templateName:"payment_confirmation_step",defaultContext:function(){return{courseKey:"",courseName:"",courseStartDate:"",coursewareUrl:"",platformName:"",requirements:[]}},updateContext:function(templateContext){var view=this;return $.Deferred(function(defer){var paymentOrderNum=$.url("?payment-order-num");if(paymentOrderNum){view.getReceiptData(paymentOrderNum).done(function(data){_.extend(templateContext,{receipt:this.receiptContext(data)});defer.resolveWith(view,[templateContext])}).fail(function(){defer.rejectWith(this,[gettext("Error"),gettext("Could not retrieve payment information")])})}else{_.extend(templateContext,{receipt:null});defer.resolveWith(view,[templateContext])}}).promise()},postRender:function(){var $verifyNowButton=$("#verify_now_button"),$verifyLaterButton=$("#verify_later_button");window.analytics.page("payment",this.templateName);window.analytics.trackLink($verifyNowButton,"edx.bi.user.verification.immediate",{category:"verification"});window.analytics.trackLink($verifyLaterButton,"edx.bi.user.verification.deferred",{category:"verification"})},getReceiptData:function(paymentOrderNum){return $.ajax({url:_.sprintf("/shoppingcart/receipt/%s/",paymentOrderNum),type:"GET",dataType:"json",context:this})},receiptContext:function(data){var view=this,receiptContext;receiptContext={orderNum:data.orderNum,currency:data.currency,purchasedDatetime:data.purchase_datetime,totalCost:view.formatMoney(data.total_cost),isRefunded:data.status==="refunded",billedTo:{firstName:data.billed_to.first_name,lastName:data.billed_to.last_name,city:data.billed_to.city,state:data.billed_to.state,postalCode:data.billed_to.postal_code,country:data.billed_to.country},items:[]};receiptContext.items=_.map(data.items,function(item){return{lineDescription:item.line_desc,cost:view.formatMoney(item.line_cost)}});return receiptContext},formatMoney:function(moneyStr){return Number(moneyStr).toFixed(2)}})})(jQuery,_,gettext);var edx=edx||{};(function($){"use strict";edx.verify_student=edx.verify_student||{};edx.verify_student.FacePhotoStepView=edx.verify_student.StepView.extend({templateName:"face_photo_step",defaultContext:function(){return{platformName:""}},postRender:function(){var webcam=edx.verify_student.getSupportedWebcamView({el:$("#facecam"),model:this.model,modelAttribute:"faceImage",submitButton:"#next_step_button",errorModel:this.errorModel,captureSoundPath:this.stepData.captureSoundPath}).render();window.analytics.page("verification",this.templateName);this.listenTo(webcam,"imageCaptured",function(){window.analytics.track("edx.bi.user.face_image.captured",{category:"verification"})});$("#next_step_button").on("click",_.bind(this.nextStep,this))}})})(jQuery);var edx=edx||{};(function($){"use strict";edx.verify_student=edx.verify_student||{};edx.verify_student.IDPhotoStepView=edx.verify_student.StepView.extend({templateName:"id_photo_step",defaultContext:function(){return{platformName:""}},postRender:function(){var webcam=edx.verify_student.getSupportedWebcamView({el:$("#idcam"),model:this.model,modelAttribute:"identificationImage",submitButton:"#next_step_button",errorModel:this.errorModel,captureSoundPath:this.stepData.captureSoundPath}).render();window.analytics.page("verification",this.templateName);this.listenTo(webcam,"imageCaptured",function(){window.analytics.track("edx.bi.user.identification_image.captured",{category:"verification"})});$("#next_step_button").on("click",_.bind(this.nextStep,this))}})})(jQuery);var edx=edx||{};(function($,gettext){"use strict";edx.verify_student=edx.verify_student||{};edx.verify_student.ReviewPhotosStepView=edx.verify_student.StepView.extend({templateName:"review_photos_step",defaultContext:function(){return{platformName:"",fullName:""}},postRender:function(){$("#face_image")[0].src=this.model.get("faceImage");$("#photo_id_image")[0].src=this.model.get("identificationImage");$(".expandable-area").slideUp();$(".is-expandable").addClass("is-ready");$(".is-expandable .title-expand").on("click",this.expandCallback);$("#retake_photos_button").on("click",_.bind(this.retakePhotos,this));$("#next_step_button").on("click",_.bind(this.submitPhotos,this));window.analytics.page("verification",this.templateName)},retakePhotos:function(){window.analytics.track("edx.bi.user.images.retaken",{category:"verification"});this.goToStep("face-photo-step")},submitPhotos:function(){var fullName=$("#new-name").val();this.setSubmitButtonEnabled(false);this.listenToOnce(this.model,"sync",_.bind(this.nextStep,this));this.listenToOnce(this.model,"error",_.bind(this.handleSubmissionError,this));if(fullName){this.model.set("fullName",fullName)}this.model.save()},handleSubmissionError:function(xhr){var errorMsg=gettext("An error has occurred. Please try again later.");this.setSubmitButtonEnabled(true);if(xhr.status===400){errorMsg=xhr.responseText}this.errorModel.set({errorTitle:gettext("Could not submit photos"),errorMsg:errorMsg,shown:true})},expandCallback:function(event){var $link=$(this),$title=$link.closest(".help-tip"),expanded=$title.hasClass("is-expanded");event.preventDefault();$link.attr("aria-expanded",!expanded);$title.toggleClass("is-expanded").find(".expandable-area").slideToggle()},setSubmitButtonEnabled:function(isEnabled){$("#next_step_button").toggleClass("is-disabled",!isEnabled).prop("disabled",!isEnabled).attr("aria-disabled",!isEnabled)}})})(jQuery,gettext);var edx=edx||{};(function(){"use strict";edx.verify_student=edx.verify_student||{};edx.verify_student.EnrollmentConfirmationStepView=edx.verify_student.StepView.extend({templateName:"enrollment_confirmation_step",postRender:function(){window.analytics.page("verification",this.templateName)},defaultContext:function(){return{courseName:"",courseStartDate:"",coursewareUrl:"",platformName:""}}})})();var edx=edx||{};(function($,_,Backbone,gettext){"use strict";edx.verify_student=edx.verify_student||{};edx.verify_student.PayAndVerifyView=Backbone.View.extend({el:"#pay-and-verify-container",subviews:{},VERIFICATION_VIEW_NAMES:["face-photo-step","id-photo-step","review-photos-step"],initialize:function(obj){this.errorModel=obj.errorModel||null;this.displaySteps=obj.displaySteps||[];this.courseKey=obj.courseKey||null;this.checkpointLocation=obj.checkpointLocation||null;this.initializeStepViews(obj.stepInfo||{});this.currentStepIndex=_.indexOf(_.pluck(this.displaySteps,"name"),obj.currentStep)},initializeStepViews:function(stepInfo){var i,stepName,stepData,subview,subviewConfig,nextStepTitle,subviewConstructors,verificationModel;subviewConstructors={"intro-step":edx.verify_student.IntroStepView,"make-payment-step":edx.verify_student.MakePaymentStepView,"payment-confirmation-step":edx.verify_student.PaymentConfirmationStepView,"face-photo-step":edx.verify_student.FacePhotoStepView,"id-photo-step":edx.verify_student.IDPhotoStepView,"review-photos-step":edx.verify_student.ReviewPhotosStepView,"enrollment-confirmation-step":edx.verify_student.EnrollmentConfirmationStepView};verificationModel=new edx.verify_student.VerificationModel({courseKey:this.courseKey,checkpoint:this.checkpointLocation});for(i=0;i<this.displaySteps.length;i++){stepName=this.displaySteps[i].name;subview=null;if(i<this.displaySteps.length-1){nextStepTitle=this.displaySteps[i+1].title}else{nextStepTitle=""}if(subviewConstructors.hasOwnProperty(stepName)){stepData={};if(stepInfo.hasOwnProperty(stepName)){_.extend(stepData,stepInfo[stepName])}subviewConfig={errorModel:this.errorModel,nextStepTitle:nextStepTitle,stepData:stepData};if(this.VERIFICATION_VIEW_NAMES.indexOf(stepName)>=0){_.extend(subviewConfig,{model:verificationModel})}this.subviews[stepName]=new subviewConstructors[stepName](subviewConfig);this.listenTo(this.subviews[stepName],"next-step",this.nextStep);this.listenTo(this.subviews[stepName],"go-to-step",this.goToStep)}}},render:function(){this.renderCurrentStep();return this},renderCurrentStep:function(){var stepName,stepView,stepEl;stepEl=$("#current-step-container");if(!stepEl.length){stepEl=$('<div id="current-step-container"></div>').appendTo(this.el)}stepName=this.displaySteps[this.currentStepIndex].name;stepView=this.subviews[stepName];stepView.el=stepEl;stepView.render()},nextStep:function(){this.currentStepIndex=Math.min(this.currentStepIndex+1,this.displaySteps.length-1);this.render()},goToStep:function(stepName){var stepIndex=_.indexOf(_.pluck(this.displaySteps,"name"),stepName);if(stepIndex>=0){this.currentStepIndex=stepIndex}this.render()}})})(jQuery,_,Backbone,gettext);var edx=edx||{};(function($,_){"use strict";var errorView,el=$("#pay-and-verify-container");edx.verify_student=edx.verify_student||{};errorView=new edx.verify_student.ErrorView({el:$("#error-container")});return new edx.verify_student.PayAndVerifyView({errorModel:errorView.model,displaySteps:el.data("display-steps"),currentStep:el.data("current-step"),courseKey:el.data("course-key"),checkpointLocation:el.data("checkpoint-location"),stepInfo:{"intro-step":{courseName:el.data("course-name"),hasPaid:el.data("msg-key")==="verify-now"||el.data("msg-key")==="verify-later",isActive:el.data("is-active"),platformName:el.data("platform-name"),requirements:el.data("requirements")},"make-payment-step":{isActive:el.data("is-active"),requirements:el.data("requirements"),courseKey:el.data("course-key"),courseName:el.data("course-name"),hasVisibleReqs:_.some(el.data("requirements"),function(isVisible){return isVisible}),upgrade:el.data("msg-key")==="upgrade",minPrice:el.data("course-mode-min-price"),sku:el.data("course-mode-sku"),contributionAmount:el.data("contribution-amount"),suggestedPrices:_.filter(el.data("course-mode-suggested-prices").toString().split(","),function(price){return Boolean(price)}),currency:el.data("course-mode-currency"),processors:el.data("processors"),verificationDeadline:el.data("verification-deadline"),courseModeSlug:el.data("course-mode-slug"),alreadyVerified:el.data("already-verified"),verificationGoodUntil:el.data("verification-good-until"),isABTesting:el.data("is-ab-testing")},"payment-confirmation-step":{courseKey:el.data("course-key"),courseName:el.data("course-name"),courseStartDate:el.data("course-start-date"),coursewareUrl:el.data("courseware-url"),platformName:el.data("platform-name"),requirements:el.data("requirements")},"face-photo-step":{platformName:el.data("platform-name"),captureSoundPath:el.data("capture-sound")},"id-photo-step":{platformName:el.data("platform-name"),captureSoundPath:el.data("capture-sound")},"review-photos-step":{fullName:el.data("full-name"),platformName:el.data("platform-name")},"enrollment-confirmation-step":{courseName:el.data("course-name"),courseStartDate:el.data("course-start-date"),coursewareUrl:el.data("courseware-url"),platformName:el.data("platform-name")}}}).render()})(jQuery,_);
