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

const Response = require("./response"),
  TemplateBuilder = require("./builder"),
  GraphApi = require("./graph-api"),
  i18n = require("../i18n.config");
const Repository = require("./repository");

module.exports = class Receive {
  constructor(user, webhookEvent, isUserRef) {
    this.user = user;
    this.webhookEvent = webhookEvent;
    this.isUserRef = isUserRef;
    this.state = "";
    this.pillStatus = "";
  }

  // Check if the event is a message or postback and
  // call the appropriate handler function
  async handleMessage() {
    let event = this.webhookEvent;

    let responses;

    try {
      if (event.message) {
        let message = event.message;

        if (message.quick_reply) {
          responses = await this.handleQuickReply();
        } else if (message.attachments) {
          responses = await this.handleAttachmentMessage();
        } else if (message.text) {
          responses = await this.handleTextMessage();
        }
      } else if (event.postback) {
        responses = await this.handlePostback();
      } else if (event.referral) {
        responses = await this.handleReferral();
      } else if (event.optin) {
        responses = await this.handleOptIn();
      }
    } catch (error) {
      console.error(error);
      responses = {
        text: `An error has occured: '${error}'. We have been notified and will fix the issue shortly!`
      };
    }

    if (Array.isArray(responses)) {
      let delay = 0;
      for (let response of responses) {
        this.sendMessage(await response, delay * 2000, this.isUserRef);
        delay++;
      }
    } else {
      this.sendMessage(responses, this.isUserRef);
    }
  }

  // Handles messages events with text
  async handleTextMessage() {
    console.log(
      "Received text:",
      `${this.webhookEvent.message.text} for ${this.user.psid}`
    );

    let event = this.webhookEvent;
    let response = [];

    let userState = await Repository.getCustomerChatState(this.user);

    switch (userState) {
      case "SH_PREGNANCY_QUESTIONS":
        console.log("still inside SH_PREGNANCY_QUESTIONS");
        let message = event.message.text.toUpperCase();
        if(message == "CLOSE") {
          console.log("message == close");
          userState = "CLOSE"
          this.user.state = userState;
          Repository.updateCustomerChatState(this.user);
          return this.handlePayload(userState);
        }
        break;
    
      default:
        break;
    }

    return response;
  }

  // Handles mesage events with attachments
  async handleAttachmentMessage() {
    let response;

    // Get the attachment
    let attachment = this.webhookEvent.message.attachments[0];
    console.log("Received attachment:", `${attachment} for ${this.user.psid}`);

    // return response;
  }

  // Handles mesage events with quick replies
  async handleQuickReply() {
    // Get the payload of the quick reply
    let payload = this.webhookEvent.message.quick_reply.payload;

    return this.handlePayload(payload);
  }

  // Handles postbacks events
  async handlePostback() {
    let postback = this.webhookEvent.postback;
    let responses = [];
    // Check for the special Get Starded with referral
    let payload;
    if (postback.referral && postback.referral.type == "OPEN_THREAD") {
      payload = postback.referral.ref;

    } else if (postback.payload) {
      // Get the payload of the postback
      payload = postback.payload;
    }

    responses.push({"persona_id": "514547546794889"});
    responses.push(await this.handlePayload(payload.toUpperCase()));
    return responses;
  }

  // Handles referral events
  async handleReferral() {
    // Get the payload of the postback
    let payload = this.webhookEvent.referral.ref.toUpperCase();

    return await this.handlePayload(payload);
  }

  // Handles optins events
  async handleOptIn() {
    let optin = this.webhookEvent.optin;
    // Check for the special Get Starded with referral
    let payload;
    if (optin.type === "notification_messages") {
      payload = "RN_" + optin.notification_messages_frequency.toUpperCase();
      this.sendRecurringMessage(optin.notification_messages_token, 5000);
      return await this.handlePayload(payload);
    }
    return null;
  }

  async handlePayload(payload) {
    console.log("Received Payload:", `${payload} for ${this.user.psid}`);
    
    switch (payload) {
      case "Q_BREASTFEED_YES":
        this.user.pillStatus = "PROGESTIN";
        break;
      case "Q_BREASTFEED_NO":
        this.user.pillStatus = "";
        break;
      case "GENDER_MALE":
        this.user.gender = "male";
        break;
      case "GENDER_FEMALE":
        this.user.gender = "female";
        break;
      case "GENDER_NONBINARY":
        this.user.gender = "nonbinary";
        break;
      case "GENDER_TRANSGENDER":
        this.user.gender = "transgender";
        break;
      case "GENDER_NONE":
        this.user.gender = "";
        break;
      case "LOCATION_NORTHERNLUZON":
        this.user.location = "NORTHERN LUZON";
        break;
      case "LOCATION_CENTRALLUZON":
        this.user.location = "CENTRAL LUZON";
        break;
      case "LOCATION_NCR":
        this.user.location = "NCR";
        break;
      case "LOCATION_SOUTHERNLUZON":
        this.user.location = "SOUTHERN LUZON";
        break;
      case "LOCATION_EASTERNVISAYAS":
        this.user.location = "EASTERN VISAYAS";
        break;
      case "LOCATION_WESTERNVISAYAS":
        this.user.location = "WESTERN VISAYAS";
        break;
      case "LOCATION_NORTHERNMINDANAO":
        this.user.location = "NORTHERN MINDANAO";
        break;
      case "LOCATION_CENTRALMINDANAO":
        this.user.location = "CENTRAL MINDANAO";
        break;
      case "LOCATION_SOUTHERNMINDANAO":
        this.user.location = "SOUTHERN MINDANAO";
        break;
      case "LOCATION_OUTSIDETHEPHILIPPINES":
        this.user.location = "OUTSIDE THE PHILIPPINES";
        break;
      case "LOCATION_NONE":
        this.user.location = "";
        break;
      case "AGE_12":
        this.user.age = "0-12";
        break;
      case "AGE_15":
        this.user.age = "13-15";
        break;
      case "AGE_18":
        this.user.age = "15-18";
        break;
      case "AGE_19":
        this.user.age = "19+";
        break;
      case "GU_P_REGULAR_19":
        this.user.age = "15-18";
        break;
      case "GU_P_REGULAR_20":
        this.user.age = "19-29";
        break;
      case "GU_P_REGULAR_30":
        this.user.age = "30+";
        break;
      case "ASK_SEXUAL_HEALTH":
        this.user.topic = "Sexual Health";
        this.user.subtopic = "";
        break;
      case "ASK_GROWING_UP":
        this.user.topic = "Growing Up";
        this.user.subtopic = "";
        break;
      case "GU_PERIOD":
        this.user.subtopic = "Menstruation";
        break;
      case "GU_PUBERTY":
        this.user.subtopic = "Puberty";
        break;
      case "SH_CONTRACEPTIVES":
        this.user.subtopic = "Contraceptives";
        break;
      case "SH_PREGNANCY":
        this.user.subtopic = "Pregnancy";
        break;
      case "SH_STI":
        this.user.subtopic = "Sexually Transmitted Diseases";
        break;
      case "SH_PREGNANCY_QUESTIONS":
        console.log("User is asking a customized question.");
        this.user.state = "SH_PREGNANCY_QUESTIONS";
        break;
    
      default:
        this.user.state = payload;
    }

    
    Repository.updateCustomerChatState(this.user);

    return await Response.genResponseMessageSequence(payload, this.user);
  }

  handlePrivateReply(type, object_id) {
    let welcomeMessage =
      i18n.__("get_started.welcome") +
      " " +
      i18n.__("get_started.guidance") +
      ". " +
      i18n.__("get_started.help");

    let response = TemplateBuilder.genQuickReply(welcomeMessage, [
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

    let requestBody = {
      recipient: {
        [type]: object_id
      },
      message: response
    };
    GraphApi.callSendApi(requestBody);
  }

  sendMessage(response, delay = 0, isUserRef) {
    // Check if there is delay in the response
    if (response === undefined) {
      return;
    }
    if ("delay" in response) {
      delay = response["delay"];
      delete response["delay"];
    }
    // Construct the message body
    let requestBody = {};
    if (isUserRef) {
      // For chat plugin
      requestBody = {
        recipient: {
          user_ref: this.user.psid
        },
        message: response
      };
    } else {
      requestBody = {
        recipient: {
          id: this.user.psid
        },
        message: response
      };
    }

    // Check if there is persona id in the response
    if ("persona_id" in response) {
      let persona_id = response["persona_id"];
      delete response["persona_id"];
      if (isUserRef) {
        // For chat plugin
        requestBody = {
          recipient: {
            user_ref: this.user.psid
          },
          message: response,
          persona_id: persona_id
        };
      } else {
        requestBody = {
          recipient: {
            id: this.user.psid
          },
          message: response,
          persona_id: persona_id
        };
      }
    }

    setTimeout(() => GraphApi.callSendApi(requestBody), delay);
  }

  sendRecurringMessage(notificationMessageToken, delay) {
    console.log("Received Recurring Message token");
    let requestBody = {},
      response,
      curation;
    //This example will send summer collection
    curation = new Curation(this.user, this.webhookEvent);
    response = curation.handlePayload("CURATION_BUDGET_50_DINNER");
    // Check if there is delay in the response
    if (response === undefined) {
      return;
    }
    requestBody = {
      recipient: {
        notification_messages_token: notificationMessageToken
      },
      message: response
    };

    setTimeout(() => GraphApi.callSendApi(requestBody), delay);
  }
  firstEntity(nlp, name) {
    return nlp && nlp.entities && nlp.entities[name] && nlp.entities[name][0];
  }
};
