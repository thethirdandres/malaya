/**
 * Copyright 2021-present, Facebook, Inc. All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * Messenger For Original Coast Clothing
 * https://developers.facebook.com/docs/messenger-platform/getting-started/sample-apps/original-coast-clothing
 */

"use strict";

const i18n = require("../i18n.config");

module.exports = class Builder {
  static genQuickReply(text, quickReplies) {
    let response = {
      text: text,
      quick_replies: []
    };

    for (let quickReply of quickReplies) {
      response["quick_replies"].push({
        content_type: "text",
        title: quickReply["title"],
        payload: quickReply["payload"]
      });
    }

    return response;
  }

  static async genGenericTemplate(elementList) {
    let response = {
      attachment: {
        type: "template",
        payload: {
          template_type: "generic",
          image_aspect_ratio: "square",
          elements: elementList
        }      
      }
    };

    return response;
}

  static genRecurringNotificationsTemplate(
    image_url,
    title,
    notification_messages_frequency,
    payload
  ) {
    let response = {
      attachment: {
        type: "template",
        payload: {
          template_type: "notification_messages",
          title: title,
          image_url: image_url,
          notification_messages_frequency: notification_messages_frequency,
          payload: payload
        }
      }
    };
    return response;
  }

  static genImageTemplate(image_url, title, subtitle = "") {
    let response = {
      attachment: {
        type: "template",
        payload: {
          template_type: "generic",
          elements: [
            {
              title: title,
              subtitle: subtitle,
              image_url: image_url
            }
          ]
        }
      }
    };

    return response;
  }

  static genButtonTemplate(title, buttons) {
    let response = {
      attachment: {
        type: "template",
        payload: {
          template_type: "button",
          text: title,
          buttons: buttons
        },
      }
    };

    return response;
  }

  static genGenericMenuItem(title, image_url, buttons, subtitle){
    let genericMenuItem = {
        title: title,
        subtitle: subtitle,
        image_url: image_url,
        buttons: buttons
    }

    return genericMenuItem;
}

  static genText(text) {
    let response = {
      text: text
    };

    return response;
  }

  static genTextWithPersona(text, persona_id) {
    let response = {
      text: text,
      persona_id: persona_id
    };

    return response;
  }

  static genPostbackButton(title, payload) {
    let response = {
      type: "postback",
      title: title,
      payload: payload
    };

    return response;
  }

  static genWebUrlButton(title, url) {
    let response = {
      type: "web_url",
      title: title,
      url: url,
      messenger_extensions: true
    };

    return response;
  }

  static genNuxMessage(user) {
    let welcome = this.genText(
      i18n.__("get_started.welcome", {
        userFirstName: user.firstName
      })
    );

    let guide = this.genText(i18n.__("get_started.guidance"));

    let curation = this.genQuickReply(i18n.__("get_started.help"), [
      {
        title: i18n.__("menu.suggestion"),
        payload: "CURATION"
      },
      {
        title: i18n.__("menu.help"),
        payload: "CARE_HELP"
      },
      {
        title: i18n.__("menu.product_launch"),
        payload: "PRODUCT_LAUNCH"
      }
    ]);

    return [welcome, guide, curation];
  }

  static genMessageResponseSequence(sequence, msgParam){
    let message = sequence['message'] ? sequence['message'].replace("\\n","\n") : "";
    if(msgParam.length > 0){
      for(var i=0; i < msgParam.length; i++){
        message = message.replace(`{{${i}}}`,msgParam[i]);
      }
    }
    message = message.replace(" !","!");
    let buttons = [];
    switch (sequence['message_type']) {
      case "SIMPLE_TEXT":
        // return this.genText(message);
        return this.genTextWithPersona(message, 514547546794889);

      case "BUTTON_PAYLOAD":

        let sequenceButtons = sequence['buttons'].sort(function(a, b) {
                                                    var x = a['order']; var y = b['order'];
                                                    return ((x < y) ? -1 : ((x > y) ? 1 : 0));
                                                }).filter( seq =>{
                                                    return seq['is_active'];
                                                }); 
        
        sequenceButtons.forEach(sequenceButton => {
          buttons.push(this.genPostbackButton(
            sequenceButton['title'],
            sequenceButton['payload']
          ))
        });

        return this.genButtonTemplate(message, buttons);

      case "GENERIC":
        let elementList = sequence['elements'].sort(function(a, b) {
                                                    var x = a['order']; var y = b['order'];
                                                    return ((x < y) ? -1 : ((x > y) ? 1 : 0));
                                              }).filter( seq =>{
                                                    return seq['is_active'];
                                              });

        let elementGenericTemplateResponse = [];


        elementList.forEach(element=>{
          let elementButtonList = [];
          element['buttons'].sort(function(a, b) {
                                var x = a['order']; var y = b['order'];
                                return ((x < y) ? -1 : ((x > y) ? 1 : 0));
                            }).filter( seq =>{
                                return seq['is_active'];
                            }).forEach(elementButton => {
                                elementButtonList.push(this.genPostbackButton(
                                  elementButton['title'],
                                  elementButton['payload']
                                ))
                            });

          elementGenericTemplateResponse.push(
            this.genGenericMenuItem(element['title'], element['img_url'], elementButtonList, element['subtitle'])
          );
        });

        return this.genGenericTemplate(elementGenericTemplateResponse);

      case "QUICK_REPLIES":
        let repliesElementList = sequence['elements'].sort(function(a, b) {
          var x = a['order']; var y = b['order'];
          return ((x < y) ? -1 : ((x > y) ? 1 : 0));
        }).filter( seq =>{
              return seq['is_active'];
        });
        console.log(sequence['message']);
        console.log(repliesElementList);

        return this.genQuickReply(message, repliesElementList);

      default:
        return;
    } 
  }

};
