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
        this.sendMessage(response, delay * 2000, this.isUserRef);
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

    // check greeting is here and is confident
    let greeting = this.firstEntity(event.message.nlp, "greetings");
    let message = event.message.text.trim().toLowerCase();

    let response = [];

    if((greeting && greeting.confidence > 0.8) || message.includes("get started")) {
      let link = "https://www.robinsonsdepartmentstore.com.ph/privacy-policy";
      
      response.push(TemplateBuilder.genText(`Hi ${this.user.firstName}! Salamat sa iyong pag-contact sa I Choose! Isa akong interactive bot.`));
      response.push(TemplateBuilder.genText(`Nandito ako para tulungan kang alamin ang iba't ibang bagay tungkol sa pagiging teenager!`));
      response.push(TemplateBuilder.genText(`Bago tayo magpatuloy, nais kong hingin ang iyong permiso para kolektahin, gamitin at i-proseso ang iyong personal na impormasyon.`));
      response.push(TemplateBuilder.genText(`Ang I Choose ay sumusunod sa Data Privacy Act of 2012. Kaya nais kong ipaalam sa'yo na ang makokolekta naming personal na impormasyon mula sa'yo ay para makapagbigay ng mas mataas na kaledad ng serbisyo at impormasyon. Huwag ka mag-alala. Atin-atin lang ito, at sa limitadong panahon lang maiimbak ang impormasyon mo. Pwede rin namin itong burahin kung iyong nanaisin.`));
      
      response.push(TemplateBuilder.genText(`Maaari mong basahin ang aming Data Privacy Agreement sa link na ito: ${link}`));
      response.push(TemplateBuilder.genText(`Nabasa, naintindihan mo nang lubos at ikaw ay sumasang-ayon sa ating Privacy Agreement, at nais mo na magpatuloy`));
      response.push(TemplateBuilder.genQuickReply("Sang-ayon ka ba dito?", [
        {
          title: "Oo, sang-ayon ako.",
          payload: "PRIVACY_POLICY_AGREE"
        },
        {
          title: "Hindi ako sang-ayon",
          payload: "PRIVACY_POLICY_DISAGREE"
        }
      ]))

    } 
    return response;
  }

  // Handles mesage events with attachments
  async handleAttachmentMessage() {
    let response;

    // Get the attachment
    let attachment = this.webhookEvent.message.attachments[0];
    console.log("Received attachment:", `${attachment} for ${this.user.psid}`);

    response = TemplateBuilder.genQuickReply(i18n.__("fallback.attachment"), [
      {
        title: i18n.__("menu.help"),
        payload: "CARE_HELP"
      },
      {
        title: i18n.__("menu.start_over"),
        payload: "GET_STARTED"
      }
    ]);

    return response;
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
    // Check for the special Get Starded with referral
    let payload;
    if (postback.referral && postback.referral.type == "OPEN_THREAD") {
      payload = postback.referral.ref;

    } else if (postback.payload) {
      // Get the payload of the postback
      payload = postback.payload;
    }

    return await this.handlePayload(payload.toUpperCase());
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

    let response = [];
    /* if(payload == "GET_STARTED") {
      let link = "https://www.robinsonsdepartmentstore.com.ph/privacy-policy";
        
      response.push(TemplateBuilder.genText(`Hi ${this.user.firstName}! Salamat sa iyong pag-contact sa I Choose! Isa akong interactive bot.`));
      response.push(TemplateBuilder.genText(`Nandito ako para tulungan kang alamin ang iba't ibang bagay tungkol sa pagiging teenager!`));
      response.push(TemplateBuilder.genText(`Bago tayo magpatuloy, nais kong hingin ang iyong permiso para kolektahin, gamitin at i-proseso ang iyong personal na impormasyon.`));
      response.push(TemplateBuilder.genText(`Ang I Choose ay sumusunod sa Data Privacy Act of 2012. Kaya nais kong ipaalam sa'yo na ang makokolekta naming personal na impormasyon mula sa'yo ay para makapagbigay ng mas mataas na kaledad ng serbisyo at impormasyon. Huwag ka mag-alala. Atin-atin lang ito, at sa limitadong panahon lang maiimbak ang impormasyon mo. Pwede rin namin itong burahin kung iyong nanaisin.`));
      
      response.push(TemplateBuilder.genText(`Maaari mong basahin ang aming Data Privacy Agreement sa link na ito: ${link}`));
      response.push(TemplateBuilder.genText(`Nabasa, naintindihan mo nang lubos at ikaw ay sumasang-ayon sa ating Privacy Agreement, at nais mo na magpatuloy`));
      response.push(TemplateBuilder.genQuickReply("Sang-ayon ka ba dito?", [
        {
          title: "Oo, sang-ayon ako.",
          payload: "PRIVACY_POLICY_AGREE"
        },
        {
          title: "Hindi ako sang-ayon",
          payload: "PRIVACY_POLICY_DISAGREE"
        }
      ]))

    } else if(payload === "PRIVACY_POLICY_AGREE") {
      response.push(TemplateBuilder.genQuickReply("Ilang taon ka na?", [
        {
          title: "12 pababa",
          payload: "MENU_INITIAL"
        },
        {
          title: "13 - 16",
          payload: "MENU_INITIAL"
        },
        {
          title: "17 - 19",
          payload: "MENU_INITIAL"
        },
      ]))
    } else if(payload === "PRIVACY_POLICY_DISAGREE") {
      response.push(TemplateBuilder.genQuickReply("Naiintidihan ko ang desisyon mo. Kung sakaling magbago ang isip mo, puwede kang bumalik sa Main Menu upang makipag-usap sa amin muli.", [
        {
          title: "Sumasang-ayon ako.",
          payload: "PRIVACY_POLICY_AGREE"
        },
        {
          title: "END CHAT",
          payload: "CLOSE"
        }
      ]))
    } else if(payload === "MENU_INITIAL") {
      response.push(TemplateBuilder.genText(`Salamat! Anong maitutulong namin sa'yo ${this.user.firstName}?`));
      let button1 = TemplateBuilder.genPostbackButton("MAGTANONG", "MENU_ASK");
      let button2 = TemplateBuilder.genPostbackButton("SERBISYO", "MENU_SERVICES");
      let buttons = TemplateBuilder.genButtonTemplate("Gusto kong... \nA. MAGTANONG tungkol sa reproductive health. \nB. Mag-avail ng SERBISYO. Pindutin ang tamang option sa ibaba.", [button1, button2]);
      response.push(buttons);
    }
    else if (payload === "MENU") {
      let button1 = TemplateBuilder.genPostbackButton("SELECT", "MENU_ASK");
      let button2 = TemplateBuilder.genPostbackButton("SELECT", "MENU_SERVICES");
      let button3 = TemplateBuilder.genPostbackButton("SELECT", "MENU_PROFESSIONAL"); //TODO
      let button4 = TemplateBuilder.genPostbackButton("SELECT", "MENU_ORGANIZATION"); //TODO
      let item1 = TemplateBuilder.genGenericMenuItem("MAGTANONG", "image.com", [button1]);
      let item2 = TemplateBuilder.genGenericMenuItem("SERBISYO", "image.com", [button2]);
      let item3 = TemplateBuilder.genGenericMenuItem("MAKIPAG-USAP", "image.com", [button3]);
      let item4 = TemplateBuilder.genGenericMenuItem("ORGANISASYON", "image.com", [button4]);
      response.push(TemplateBuilder.genText("Gusto kong... \nA. MAGTANONG tungkol sa reproductive health.\nB. Mag-avail ng SERBISYO.\nC. MAKIPAG-USAP sa isang health professional.\nD. Magtanong tungkol sa inyong ORGANISASYON\n\nPindutin ang tamang option sa ibaba."));
      let buttons = await TemplateBuilder.genGenericTemplate([item1, item2, item3, item4]);
      response.push(buttons);
    } else if(payload === "MENU_SERVICES") {
      let button1 = TemplateBuilder.genPostbackButton("Select", "SERVICE");
      let button2 = TemplateBuilder.genPostbackButton("Select", "SERVICE");
      let button3 = TemplateBuilder.genPostbackButton("Select", "SERVICE");
      let item1 = TemplateBuilder.genGenericMenuItem("Service Provider", "https://www.image.com/",[button1]);
      let item3 = TemplateBuilder.genGenericMenuItem("This is a service provider", "https://www.image.com/",[button3]);
      let item2 = TemplateBuilder.genGenericMenuItem("Service Provider", "https://www.image.com/",[button2]);
      let nav = await TemplateBuilder.genGenericTemplate([item1, item2, item3]);
      response.push(nav);
    } else if(payload === "MENU_ASK") {
      response.push(TemplateBuilder.genText(`Naks, curious!`));
      response.push(TemplateBuilder.genText(`Normal lang 'yan, dahil maraming changes na nangyayari sa buhay mo bilang teenager`));
      response.push(TemplateBuilder.genText(`Nandito ako para sagutin ang mga tanong mo tungkol sa Sexual Health, Growing Up, Relationships, at Mental Health`));
      response.push(TemplateBuilder.genText(`Paalala lang po, nagbabahagi lang po kami ng impormasyon.`));
      response.push(TemplateBuilder.genText(`Anumang impormasyong maibibigay namin ay hindi katumbas ng medical advice mula sa isang doctor.`));
      response.push(TemplateBuilder.genQuickReply("Tungkol saan ang gusto mong alamin?", [
        {
          title: "SEXUAL HEALTH",
          payload: "ASK_SEXUAL_HEALTH"
        },
        {
          title: "MENTAL HEALTH",
          payload: "ASK_MENTAL_HEALTH" //TODO
        },
        {
          title: "GROWING UP",
          payload: "ASK_GROWING_UP" //TODO
        },
        {
          title: "RELATIONSHIPS",
          payload: "ASK_RELATIONSHIPS" //TODO
        },
      ]))

    } else if(payload === "ASK_SEXUAL_HEALTH") {
      let button1 = TemplateBuilder.genPostbackButton("CONTRACEPTIVES", "SH_CONTRACEPTIVES");
      let button2 = TemplateBuilder.genPostbackButton("PAGBUBUNTIS", "SH_PREGNANCY");
      let button3 = TemplateBuilder.genPostbackButton("HIV AT IBA PANG STI", "SH_STI");

      response.push(TemplateBuilder.genButtonTemplate("Magtanong tungkol sa:", [button1, button2, button3]));

    } else if(payload === "SH_CONTRACEPTIVES") {
      response.push(TemplateBuilder.genText("Ang modern contraceptives ay mga ligtas at epektibong paraan upang maiwasan ang pagbubuntis."));
      response.push(TemplateBuilder.genText("Pinipigilan nito ang pagtatagpo ng egg cell at sperm cell upang hindi humantong sa pagbubuntis ang pakikipagtalik"));
      let button1 = TemplateBuilder.genPostbackButton("Select", "BC_QUIZ");
      let button2 = TemplateBuilder.genPostbackButton("Select", "SH_C_METHODS");
      let item1 = TemplateBuilder.genGenericMenuItem("Ano ang tamang contraceptive para sa akin?", "www.image.com", [button1])
      let item2 = TemplateBuilder.genGenericMenuItem("Ano ang iba't ibang contraceptive methods?", "www.image.com", [button2])
      response.push(await TemplateBuilder.genGenericTemplate([item1, item2]));
    
    }
    
    else if(payload === "SH_PREGNANCY") {
      response.push(TemplateBuilder.genText(`Ano ang gusto mong malaman tungkol sa pagbubuntis?`));
      let button1 = TemplateBuilder.genPostbackButton("Select", "SH_CONTRACEPTIVES"); 
      let button2 = TemplateBuilder.genPostbackButton("Select", "SH_PREGNANCY_HOW"); 
      let button3 = TemplateBuilder.genPostbackButton("Select", "SH_PREGNANCY_INDICATION");
      let button4 = TemplateBuilder.genPostbackButton("MORE", "SH_PREGNANCY_MORE");
      let item1 = TemplateBuilder.genGenericMenuItem("Paano umiwas sa pagbubuntis??", "www.image.com", [button1]);
      let item2 = TemplateBuilder.genGenericMenuItem("Paano nangyayari ang pagbubuntis?", "www.image.com", [button2]);
      let item3 = TemplateBuilder.genGenericMenuItem("Paano ko malalaman kung buntis ako?", "www.image.com", [button3]);
      let item4 = TemplateBuilder.genGenericMenuItem("Iba pang tanong.", "www.image.com", [button4]);
      response.push(await TemplateBuilder.genGenericTemplate([item1, item2, item3, item4]));
    }
    else if(payload === "SH_PREGNANCY_MORE") {
      let button1 = TemplateBuilder.genPostbackButton("Select", "SH_PREGNANCY_PREGNANCY"); 
      let button2 = TemplateBuilder.genPostbackButton("Select", "SH_PREGNANCY_QUESTIONS"); //TODO
      let item1 = TemplateBuilder.genGenericMenuItem("Nakipagtalik ako kailang lang nang walang ginagamit na contraceptives.", "www.image.com", [button1], "Mabubuntis po ba ako?");
      let item2 = TemplateBuilder.genGenericMenuItem("May sarili akong tanong.", "www.image.com", [button2]);
      response.push(await TemplateBuilder.genGenericTemplate([item1, item2]));
    }

    else if(payload === "SH_PREGNANCY_HOW") {
      response.push(TemplateBuilder.genText(`Basta't may naganap na pakikipagtalik sa pagitan ng babae at lalaki, tandaan na laging may posibilidad na mabuntis!`));
      response.push(TemplateBuilder.genText(`Pero! May tatlong proseso muna na dapat mangyari.`));
      response.push(TemplateBuilder.genText(`Ito ang: \n1. Ovulation o paglabas ng itlog mula sa obaryo.`));
      response.push(TemplateBuilder.genText(`2. Fertilization o pagtatagpo ng egg cell at sperm cell.`));
      response.push(TemplateBuilder.genText(`3. Implantation o pagkapit ng na-pertilisang itlog sa dingding ng matres`));
      response.push(TemplateBuilder.genText(`Gusto mo bang makita kung paano ito nangyayari? Panoorin ang video na ito: http://bit.ly/pagbubuntis`));
      response.push(TemplateBuilder.genQuickReply("May iba ka pa bang gustong malaman tungkol sa pagbubuntis?", [
        {
          title: "Oo.",
          payload: "SH_PREGNANCY" 
        },
        {
          title: "Wala na.",
          payload: "SH_PREGNANCY_EXIT"
        },
      ]));
    }
    else if(payload === "SH_PREGNANCY_INDICATION") {
      response.push(TemplateBuilder.genText(`Madaling sagot: Mag pregnancy test!`));
      response.push(TemplateBuilder.genText(`Pero tandaan, hindi pa agad makikita sa pregnancy test kung buntis ka o hindi.`));
      response.push(TemplateBuilder.genQuickReply("Kailan ang unang araw ng huling regla? Anim na linggo na ba ang nakalipas mula sa araw na ito?", [
        {
          title: "Oo.", //shortcut
          payload: "SH_P_PERIOD_6W_YES" 
        },
        {
          title: "Hindi pa.", //shortcut
          payload: "SH_P_PERIOD_6W_NO" 
        },
      ]));
    }
    else if(payload === "SH_P_PERIOD_6W_NO") {
      response.push(TemplateBuilder.genText(`Relax ka muna. Baka stress lang 'yan.`));
      response.push(TemplateBuilder.genText(`Magiging tama lang ang resulta ng pregnancy test kung anim na linggo na ang nakalipas mula sa unang araw ng huling regla.`));
      response.push(TemplateBuilder.genQuickReply("May iba ka pa bang gustong malaman tungkol sa pagbubuntis?", [
        {
          title: "Oo.",
          payload: "SH_PREGNANCY" 
        },
        {
          title: "Wala na.",
          payload: "SH_PREGNANCY_EXIT"
        }
      ]));
    }
    else if(payload === "SH_P_PERIOD_6W_YES") {
      response.push(TemplateBuilder.genText(`Maaari ka nang magpa-pregnancy test.`));
      response.push(TemplateBuilder.genQuickReply("Nais mo bang magpa-pregnancy test?", [
        {
          title: "Oo.", //shortcut
          payload: "SH_PREGNANCY_TEST_YES"
        },
        {
          title: "Hindi", //shortcut
          payload: "SH_PREGNANCY_TEST_NO"
        },
      ]));
    }
    else if(payload === "SH_PREGNANCY_TEST_YES") {
      response.push(TemplateBuilder.genQuickReply("Ikaw ba ay nasa Puerto Princesa, Palawan?", [
        {
          title: "Oo.",
          payload: "MENU_SERVICES" 
        },
        {
          title: "Hindi.",
          payload: "SH_PREGNANCY_TEST_NO_EXTENDED"
        },
      ]));
    }
    else if(payload.startsWith("SH_PREGNANCY_TEST_NO")) {
      if(payload === "SH_PREGNANCY_TEST_NO_EXTENDED") {
        response.push(TemplateBuilder.genText(`Maaari po kayong makakuha sa inyong Barangay Health Center ng pregnancy test. Nabibili rin ito sa mga botika at supermarket.`));
      }
      response.push(TemplateBuilder.genQuickReply("May iba ka pa bang gustong malaman tungkol sa pagbubuntis?", [
        {
          title: "Oo.",
          payload: "SH_PREGNANCY" 
        },
        {
          title: "Wala na.",
          payload: "SH_PREGNANCY_EXIT"
        }
      ]));
    }
    else if(payload === "SH_PREGNANCY_PREGNANCY") {
      response.push(TemplateBuilder.genText(`Laging may posibilidad na mabuntis, maliit man o malaki, basta't nakipagtalik nang walang gamit na kahit anong contraceptive.`));
      response.push(TemplateBuilder.genText(`Kumunsulta agad sa isang OB-Gyne upang malaman ang mga susunod na hakbang na puwede mong gawin.`));
      response.push(TemplateBuilder.genQuickReply("May iba ka pa bang gustong malaman tungkol sa pagbubuntis?", [
        {
          title: "Oo.",
          payload: "SH_PREGNANCY" 
        },
        {
          title: "Wala na.",
          payload: "SH_PREGNANCY_EXIT"
        },
      ]));
    }
    else if(payload === "SH_PREGNANCY_EXIT") {
      response.push(TemplateBuilder.genQuickReply("May iba ka pa bang gustong itanong?", [
        {
          title: "Mayroon pa",
          payload: "ASK_SEXUAL_HEALTH" 
        },
        {
          title: "Wala na.",
          payload: "CLOSE_PREGNANCY"
        },
      ]));
    }
    



    else if(payload.startsWith("BC_QUIZ")) {
      if(payload === "BC_QUIZ") {
        response.push(TemplateBuilder.genText(`Thank you for that wonderful question, ${this.user.firstName}!`));
      }
      response.push(TemplateBuilder.genText(`Sagutin lang mga susunod na tanong para malaman kung ano ang tamang contraceptive para sa'yo!`));
      response.push(TemplateBuilder.genText(`Paalala lang, hindi ito katumbas ng payo ng doktor o medical professional. Nandito lang kami para magbigay ng impormasyon.`));
      response.push(TemplateBuilder.genQuickReply("Handa ka na ba?", [
        {
          title: "Oo naman!",
          payload: "QUIZ_START"
        }
      ]));
    } 
    else if(payload === "QUIZ_START") {
      response.push(TemplateBuilder.genQuickReply("Kasalukuyan ka bang nagpapasuso?", [
        {
          title: "Oo.",
          payload: "Q_BREASTFEED_YES"
        },
        {
          title: "Hindi.",
          payload: "Q_BREASTFEED_NO"
        },
      ]));
    }
    else if(payload.startsWith("Q_BREASTFEED")) {
      if(payload === "Q_BREASTFEED_YES") {
        this.user.state = "";
        response.push(TemplateBuilder.genText(`Halos lahat ngcontraceptives katuladng DMPA, Implant, IUD at condom ay pwede sa mga nagpapasuso. Puwede rin ang pills, pero kailangan ito ay Progestin-Only Pill.`));
      } else {
        this.user.state = "PILLS";
      }
      response.push(TemplateBuilder.genQuickReply("Ikaw ba ay may sakit sa puso, nakaranas ng blood clots, cancer, sakit sa puso, bukol sa suso, uminom ng maintenance na gamot, o iba pang malubhang sakit?", [
        {
          title: "Mayroon.",
          payload: "Q_ILLNESS_YES"
        },
        {
          title: "Hindi sigurado.",
          payload: "Q_ILLNESS_MAYBE" 
        },
        {
          title: "Wala.",
          payload: "Q_ILLNESS_NO" 
        },
      ]));
    }
    else if(payload === "Q_ILLNESS_YES" || payload === "Q_ILLNESS_MAYBE") {
      response.push(TemplateBuilder.genText(`Hindi pwedeng gumamit ng hormonal contraceptives tulad ng pills, DMPA o implant ang may mga kundisyong nabanggit.`));
      if(payload === "Q_ILLNESS_MAYBE") {
        response.push(TemplateBuilder.genText("Para makasigurado, magpatingin muna at alamin kung mayroon kang sakit na maaaring makasama sa pag gamit ng hormonal contraceptives."));
      }
      response.push(TemplateBuilder.genText(`Pero huwag mag-alala! May iba ka pang pwedeng pagpilian!`));
      response.push(TemplateBuilder.genQuickReply("Nais mo ba ng pangmatagalang proteksyon?", [
        {
          title: "Oo.",
          payload: "Q_IUD_EXTENDED"
        },
        {
          title: "Hindi naman kailangan ng pangmatagalan.",
          payload: "Q_PROTECTION_NO"
        },
      ]));
    }
    else if(payload === "Q_ILLNESS_NO") {
      response.push(TemplateBuilder.genQuickReply("Madali lang ba sa'yo na pumunta sa doktor o clinic na may family planning services?", [
        {
          title: "Oo.",
          payload: "Q_FAMILY_PLANNING_YES" 
        },
        {
          title: "Hindi",
          payload: "Q_FAMILY_PLANNING_NO"
        },
      ]));
    }
    else if(payload === "Q_FAMILY_PLANNING_YES") {
      response.push(TemplateBuilder.genQuickReply("Ayaw mo bang malaman ng iyong mga kasama sa bahay ang iyong paggamit ng contraceptive?", [
        {
          title: "Okay lang naman na malaman sa bahay.",
          payload: "Q_HOUSEHOLD_KNOW_YES" 
        },
        {
          title: "Ayaw ko.",
          payload: "Q_HOUSEHOLD_KNOW_NO"
        },
      ]));
    }
    else if(payload === "Q_HOUSEHOLD_KNOW_YES") {
      response.push(TemplateBuilder.genQuickReply("Matatandaan mo ba ang tama at palagiang paggamit ng kontraseptibo araw-araw?", [
        {
          title: "Oo naman.",
          payload: "Q_REMEMBER_DAILY_YES" 
        },
        {
          title: "Hindi sigurado/hindi",
          payload: "Q_HOUSEHOLD_KNOW_NO"
        },
      ]));
    }
    else if(payload === "Q_REMEMBER_DAILY_YES") {
      response.push(TemplateBuilder.genQuickReply("Mahalaga ba sa iyo ang pangmatagalang proteksyon?", [
        {
          title: "Hindi/Hindi masyado",
          payload: "Q_FAMILY_PLANNING_NO_EXTENDED" 
        },
        {
          title: "Oo.",
          payload: "Q_HOUSEHOLD_KNOW_NO"
        },
      ]));
    }
    else if(payload === "Q_HOUSEHOLD_KNOW_NO") { 
      response.push(TemplateBuilder.genQuickReply("Gaano katagal mo nais makaiwas sa pagbubuntis?", [
        {
          title: "3 buwan - 2 taon",
          payload: "Q_AVOID_PREGNANCY_3M_2Y" 
        },
        {
          title: "2-3 taon",
          payload: "Q_AVOID_PREGNANCY_2Y_3Y"
        },
        {
          title: "Higit pa sa 3 taon",
          payload: "Q_IUD"
        }
      ]));
    }

    else if(payload === "Q_AVOID_PREGNANCY_3M_2Y") {
      response.push(TemplateBuilder.genQuickReply("Kaya mo bang bumalik sa doktor o clinic kada tatlong buwan?", [
        {
          title: "Oo, walang problema.",
          payload: "Q_DMPA" 
        },
        {
          title: "Mahirap ito para sa akin.",
          payload: "Q_AVOID_PREGNANCY_2Y_3Y"
        }
      ]));
    }
    else if(payload.startsWith("Q_DMPA")) {
      if(payload === "Q_DMPA") {
        response.push(TemplateBuilder.genText(`Ang iyong perfect match na contraceptive ay...`));
      }
      response.push(TemplateBuilder.genText(`DMPA!`));
      response.push(TemplateBuilder.genText(`Ang DMPA o depo ay isang hormonal injectable na iinuturok kada tatlong buwan. Ito ay 99.7% na epektibo sa tamang paggamit.`));
      response.push(TemplateBuilder.genText(`Tandaan na hindi nito mapipigilan ang paghawa ng mga sakit na naihahawa sa pakikipagtalik, tulad ng HIV at iba pa.`)); 
      response.push(TemplateBuilder.genText(`Kaya kung hindi sigurado kung ikaw o ang iyong partner ay walang HIV o ibang sakit na naihahawa sa pakikipagtalik, gumamit din ng CONDOM!`));
      response.push(TemplateBuilder.genText(`Condom ang tanging contraceptive na two in one!`));
      response.push(TemplateBuilder.genText(`Kaya nitong pigilan ang hindi planadong pagbubuntis AT mga sakit na naihahawa sa pakikipagtalik tulad ng HIV.`));
      response.push(TemplateBuilder.genQuickReply("May iba ka pa bang gustong malaman tungkol sa DMPA?", [
        {
          title: "Oo.",
          payload: "SH_C_DMPA_EXTENDED" 
        },
        {
          title: "Wala na.",
          payload: "Q_HELP_NO"
        },
      ]));

    }

    else if(payload === "Q_AVOID_PREGNANCY_2Y_3Y") {
      response.push(TemplateBuilder.genQuickReply("Okay lang ba sa'yo na bumalik sa doktor o clinic kada tatlong taon?", [
        {
          title: "Oo, walang problema.",
          payload: "Q_IMPLANT" 
        },
        {
          title: "Mahirap ito para sa akin.",
          payload: "Q_UID"
        }
      ]));
    }

    else if(payload.startsWith("Q_IMPLANT")) {
      if(payload === "Q_IMPLANT") {
        response.push(TemplateBuilder.genText(`Ang iyong perfect match na contraceptive ay...`));
      }
      response.push(TemplateBuilder.genText(`IMPLANT!`));
      response.push(TemplateBuilder.genText(`Ang implant ay isang maliit at malambot na tubong gawa sa plastic na naglalaman ng hormones!`)); 
      response.push(TemplateBuilder.genText(`Sa tamang paggamit, hanggang tatlong taon itong 99.5% na mabisa laban sa pagbubuntis.`)); 
      response.push(TemplateBuilder.genText(`Tandaan na hindi nito mapipigilan ang paghawa ng mga sakit na naihahawa sa pakikipagtalik, tulad ng HIV at iba pa.`)); 
      response.push(TemplateBuilder.genText(`Kaya kung hindi sigurado kung ikaw o ang iyong partner ay walang HIV o ibang sakit na naihahawa sa pakikipagtalik, gumamit din ng CONDOM!`));
      response.push(TemplateBuilder.genText(`Condom ang tanging contraceptive na two in one!`));
      response.push(TemplateBuilder.genText(`Kaya nitong pigilan ang hindi planadong pagbubuntis AT mga sakit na naihahawa sa pakikipagtalik tulad ng HIV.`));
      response.push(TemplateBuilder.genQuickReply("May iba ka pa bang gustong malaman tungkol sa Implant?", [
        {
          title: "Oo.",
          payload: "SH_C_IMPLANT_EXTENDED"
        },
        {
          title: "Wala na.",
          payload: "Q_HELP_NO"
        },
      ]));
    }
    else if(payload.startsWith("Q_IUD")) {
      if(payload === "Q_IUD") {
        response.push(TemplateBuilder.genText(`Ang iyong perfect match na contraceptive ay...`));
      } else {
        response.push(TemplateBuilder.genText(`Congrats ang iyong winning contraceptive ay...`));
      }
      response.push(TemplateBuilder.genText(`IUD!`));
      response.push(TemplateBuilder.genText(`Ang IUD ay maliit na plastik na na hugis \"T\" may nakapalibot na tanso at nakalawit na nylong string.`));
      response.push(TemplateBuilder.genText(`Inilalagay ito sa loob ng matres upang maiwasan ang pagbubuntis.`));
      response.push(TemplateBuilder.genText(`Ito ay mabisa hanggang sampung taon, at sa tamang paggamit, ito ay 99.2 hanggang 99.4% na epektibo.`));
      response.push(TemplateBuilder.genText(`Tandaan na hindi nito mapipigilan ang paghawa ng mga sakit na naihahawa sa pakikipagtalik, tulad ng HIV at iba pa.`));
      response.push(TemplateBuilder.genText(`Kaya kung hindi sigurado kung ikaw o ang iyong partner ay walang HIV o ibang sakit na naihahawa sa pakikipagtalik, gumamit din ng CONDOM!`));
      response.push(TemplateBuilder.genText(`Condom ang tanging contraceptive na two in one!`));
      response.push(TemplateBuilder.genText(`Kaya nitong pigilan ang hindi planadong pagbubuntis AT mga sakit na naihahawa sa pakikipagtalik tulad ng HIV.`));
      response.push(TemplateBuilder.genQuickReply("May iba ka pa bang gustong malaman tungkol sa IUD?", [
        {
          title: "Oo.",
          payload: "SH_C_IUD_EXTENDED"
        },
        {
          title: "Wala na.",
          payload: "Q_HELP_NO"
        },
      ]));

    }

    else if(payload.startsWith("Q_FAMILY_PLANNING_NO")) {
      if(payload === "Q_FAMILY_PLANNING_NO") {
        response.push(TemplateBuilder.genText(`Ang iyong perfect match na contraceptive ay...`));
      } else {
        response.push(TemplateBuilder.genText(`Congrats Maari kang gumamit ng...`));
      }

      if(this.user.state == "PILLS") {
        response.push(TemplateBuilder.genText(`PILLS`));
      } else {
        response.push(TemplateBuilder.genText(`PROGESTIN-ONLY PILLS`));
      } 
      response.push(TemplateBuilder.genText(`Ang pills ay mabisang gamot na iniinom araw-araw sa pare-parehong oras, upang maiwasan ang pagbubuntis. Sa tamang paggamit, ito ay 92 hanggang 99.7% effective.`));
      response.push(TemplateBuilder.genText(`Available ito sa karamihang botika, tindahan at health center.`));
      response.push(TemplateBuilder.genText(`Tandaan na hindi nito mapipigilan ang paghawa ng mga sakit na naihahawa sa pakikipagtalik, tulad ng HIV at iba pa.`));
      response.push(TemplateBuilder.genText(`Kaya kung hindi sigurado kung ikaw o ang iyong partner ay walang HIV o ibang sakit na naihahawa sa pakikipagtalik, gumamit din ng CONDOM!`));
      response.push(TemplateBuilder.genText(`Condom ang tanging contraceptive na two in one!`));
      response.push(TemplateBuilder.genText(`Kaya nitong pigilan ang hindi planadong pagbubuntis AT mga sakit na naihahawa sa pakikipagtalik, tulad ng HIV`));
      response.push(TemplateBuilder.genQuickReply("May iba ka pa bang gustong malaman tungkol sa PILLS?", [
        {
          title: "Oo.",
          payload: "SH_C_PILLS_EXTENDED" 
        },
        {
          title: "Wala na.",
          payload: "Q_HELP_NO"
        },
      ]));

    }

    else if(payload === "Q_HELP_NO") {
      response.push(TemplateBuilder.genQuickReply("May iba pa ba kaming maitutulong sa'yo?", [
        {
          title: "Ulitin ang Quiz.",
          payload: "BC_QUIZ_EXTENDED" 
        },
        {
          title: "Bumalik sa main menu.",
          payload: "MENU"
        },
        {
          title: "Wala na.",
          payload: "CLOSE" 
        },
      ]));
    }
    else if(payload === "Q_PROTECTION_NO") {
      response.push(TemplateBuilder.genText(`Congrats ang iyong winning contraceptive ay...`));
      response.push(TemplateBuilder.genText(`CONDOM!`));
      response.push(TemplateBuilder.genText(`Condom ang tanging contraceptive na two in one!`));
      response.push(TemplateBuilder.genText(`Kaya nitong pigilan ang hindi planadong pagbubuntis AT mga sakit na naihahawa sa pakikipagtalik tulad ng HIV.`));
      response.push(TemplateBuilder.genQuickReply("May iba ka pa bang gustong malaman tungkol sa condom?", [
        {
          title: "Oo.",
          payload: "SH_C_CONDOM_EXTENDED" 
        },
        {
          title: "Wala na.",
          payload: "Q_HELP_NO"
        },
      ]));
    } 


    else if(payload.startsWith("SH_C_METHODS")) {
      if(payload === "SH_C_METHODS") {
        response.push(TemplateBuilder.genText(`Maari iba't ibang uri ng contraceptive methods ang available sa Pilipinas.`));
        response.push(TemplateBuilder.genText(`Pinaka-karaniwan dito ay ang condom, pills, DMPA o depo, IUD, at implant.`));
      }
      response.push(TemplateBuilder.genQuickReply("Alin sa mga ito ang gusto mong matutunan?", [
        {
          title: "Pills",
          payload: "SH_C_PILLS" 
        },
        {
          title: "DMPA",
          payload: "SH_C_DMPA"
        },
        {
          title: "IUD",
          payload: "SH_C_IUD"
        },
        {
          title: "Implant",
          payload: "SH_C_IMPLANT" 
        },
        {
          title: "Condom",
          payload: "SH_C_CONDOM" 
        },
      ]));
    }

    else if(payload.startsWith("SH_C_CONDOM")) {
      if(payload === "SH_C_CONDOM") {
        response.push(TemplateBuilder.genText(`Condom ang tanging contraceptive na two in one!`));
        response.push(TemplateBuilder.genText(`Kaya nitong pigilan ang hindi planadong pagbubuntis AT mga sakit na naihahawa sa pakikipagtalik, tulad ng HIV at iba pa.`));
      }
      response.push(TemplateBuilder.genText(`Ano ang gusto mong malaman tungkol sa condom?`));
      let button1 = TemplateBuilder.genPostbackButton("Select", "CONDOM_WORK"); 
      let button2 = TemplateBuilder.genPostbackButton("Select", "CONDOM_USAGE"); 
      let button3 = TemplateBuilder.genPostbackButton("Select", "CONDOM_SOURCE"); 
      let button4 = TemplateBuilder.genPostbackButton("MORE", "CONDOM_MORE");
      let item1 = TemplateBuilder.genGenericMenuItem("Paano gumagana ang condom?", "www.image.com", [button1]);
      let item2 = TemplateBuilder.genGenericMenuItem("Paano gamitin ang condom?", "www.image.com", [button2]);
      let item3 = TemplateBuilder.genGenericMenuItem("Saan ako pwedeng makakuha ng condom?", "www.image.com", [button3]);
      let item4 = TemplateBuilder.genGenericMenuItem("Iba pang tanong.", "www.image.com", [button4]);
      response.push(await TemplateBuilder.genGenericTemplate([item1, item2, item3, item4]));
    }
    else if(payload === "CONDOM_MORE") {
      let button1 = TemplateBuilder.genPostbackButton("Select", "CONDOM_WHO"); 
      let button2 = TemplateBuilder.genPostbackButton("Select", "CONDOM_SIDE_EFFECTS");
      let item1 = TemplateBuilder.genGenericMenuItem("Sino ang pwedeng gumamit ng condom?", "www.image.com", [button1]);
      let item2 = TemplateBuilder.genGenericMenuItem("Ano ang mga pwedeng side effects ng condom?", "www.image.com", [button2]);
      response.push(await TemplateBuilder.genGenericTemplate([item1, item2]));
    }
    else if(payload === "CONDOM_WHO") {
      response.push(TemplateBuilder.genText(`Kahit sino, basta aktibo sa pakikipagtalik at hindi allergic sa latex.`));
      response.push(TemplateBuilder.genQuickReply("May gusto ka pa bang malaman tungkol sa implant?", [
        {
          title: "Oo.",
          payload: "SH_C_CONDOM_EXTENDED" 
        },
        {
          title: "Ibang contraceptives naman",
          payload: "SH_C_METHODS_EXTENDED"
        },
        {
          title: "Wala na po.",
          payload: "CLOSE_CONDOM"
        },
        {
          title: "Makipag-usap sa professional", //shortcut
          payload: "MENU_PROFESSIONAL" //TODO
        }
      ]));
    }
    else if(payload === "CONDOM_SIDE_EFFECTS") {
      response.push(TemplateBuilder.genText(`Basta walang allergies sa latex (at sobrang bihira ng mga taong ganito!), wala itong side effects.`));
      response.push(TemplateBuilder.genQuickReply("May gusto ka pa bang malaman tungkol sa implant?", [
        {
          title: "Oo.",
          payload: "SH_C_CONDOM_EXTENDED" 
        },
        {
          title: "Ibang contraceptives naman",
          payload: "SH_C_METHODS_EXTENDED"
        },
        {
          title: "Wala na po.",
          payload: "CLOSE_CONDOM"
        },
        {
          title: "Makipag-usap sa professional", //shortcut
          payload: "MENU_PROFESSIONAL" //TODO
        }
      ]));
    }
    else if(payload === "CONDOM_WORK") {
      response.push(TemplateBuilder.genText(`Hinaharangan ng condom ang pagpasok ng semilya sa katawan ng katalik.`));
      response.push(TemplateBuilder.genText(`Dahil dito, hindi hahantong sa pagbubuntis ang  pakikipagtalik habang may suot na condom.`));
      response.push(TemplateBuilder.genText(`Pinipigilan din nito ang paghawa ng mga sakit na naihahawa sa pakikipagtalik, tulad ng HIV at tulo.`));
      response.push(TemplateBuilder.genQuickReply("May gusto ka pa bang malaman tungkol sa implant?", [
        {
          title: "Oo.",
          payload: "SH_C_CONDOM_EXTENDED" 
        },
        {
          title: "Ibang contraceptives naman",
          payload: "SH_C_METHODS_EXTENDED"
        },
        {
          title: "Wala na po.",
          payload: "CLOSE_CONDOM"
        },
        {
          title: "Makipag-usap sa professional", //shortcut
          payload: "MENU_PROFESSIONAL" //TODO
        }
      ]));
    }
    else if(payload.startsWith("CONDOM_USAGE")) {
      if(payload === "CONDOM_USAGE") {
        response.push(TemplateBuilder.genText(`Step 1: I-check ang expiration date. Kung paso na, huwag na itong gamitin.`));
        response.push(TemplateBuilder.genText(`Step 2: Pisil-pisilin ang pakete ng condom upang malaman kung may hangin pa.`));
        response.push(TemplateBuilder.genText(`Step 3: Buksan lamang ito sa may ridges. Huwag gumamit ng gunting o ngipin dahil baka masira ang condom.`));
        response.push(TemplateBuilder.genQuickReply("Kaya mo bang sundin ito?", [
          {
            title: "Kayang kaya!",
            payload: "CONDOM_USAGE_1" 
          }])
        ) 
      } else if(payload === "CONDOM_USAGE_1") {
        response.push(TemplateBuilder.genText(`Step 4: Pisilin ang dulo ng condom bago isuot upang maiwasan ang pagputok nito.`));
        response.push(TemplateBuilder.genText(`Step 5: Isuot ang condom hanggang sa puno ng ari. Pwedeng lagyan ng water-based lubricant ang loob at labas ng condom.`));
        response.push(TemplateBuilder.genText(`Step 6: ENJOY! Pero wait lang...`));
        response.push(TemplateBuilder.genText(`Paano tatanggalin ang condom?`));
        response.push(TemplateBuilder.genText(`Step 7: Pagkatapos labasan, hawakan ang bukana o labi ng condom at hubarin ang condom malayo sa katawan ng katalik habang ang titi ay matigas pa.`));
        response.push(TemplateBuilder.genText(`Step 8: Ibuhol ang condom at itapon nang maayos sa basurahan.`));
      
        response.push(TemplateBuilder.genQuickReply("May gusto ka pa bang malaman tungkol sa implant?", [
          {
            title: "Oo.",
            payload: "SH_C_CONDOM_EXTENDED" 
          },
          {
            title: "Ibang contraceptives naman",
            payload: "SH_C_METHODS_EXTENDED"
          },
          {
            title: "Wala na po.",
            payload: "CLOSE_CONDOM"
          },
          {
            title: "Makipag-usap sa professional", //shortcut
            payload: "MENU_PROFESSIONAL" //TODO
          }
        ]));
      }
    }
    else if(payload === "CONDOM_SOURCE") {
      response.push(TemplateBuilder.genText(`May nabibiling condom sa mga botika, ospital, malls at pati na rin sa malalaking supermarket.`));
      response.push(TemplateBuilder.genText(`Maari rin kayong makakuha ng libreng condom sa inyong Barangay Health Center, kung mayroon silang sapat na supply.`));
      response.push(TemplateBuilder.genQuickReply("May gusto ka pa bang malaman tungkol sa implant?", [
        {
          title: "Oo.",
          payload: "SH_C_CONDOM_EXTENDED" 
        },
        {
          title: "Ibang contraceptives naman",
          payload: "SH_C_METHODS_EXTENDED"
        },
        {
          title: "Wala na po.",
          payload: "CLOSE_CONDOM"
        },
        {
          title: "Makipag-usap sa professional", //shortcut
          payload: "MENU_PROFESSIONAL" //TODO
        }
      ]));
    }

    

    else if(payload.startsWith("SH_C_IMPLANT")) {
      if(payload === "SH_C_IMPLANT") {
        response.push(TemplateBuilder.genText(`Ang implant ay isang maliit at malambot na tubong gawa sa plastic na naglalaman ng hormones.`));
        response.push(TemplateBuilder.genText(`Sa tamang paggamit, hanggang tatlong taon itong 99.5% na mabisa laban sa pagbubuntis. `));
        response.push(TemplateBuilder.genText(`Tandaan na hindi nito mapipigilan ang paghawa ng mga sakit na naihahawa sa pakikipagtalik, tulad ng HIV at iba pa.`));
      }
      response.push(TemplateBuilder.genText(`Ano ang gusto mong malaman tungkol sa implant?`));
      let button1 = TemplateBuilder.genPostbackButton("Select", "IMPLANT_WORK"); 
      let button2 = TemplateBuilder.genPostbackButton("Select", "IMPLANT_USAGE");
      let button3 = TemplateBuilder.genPostbackButton("Select", "IMPLANT_SIDE_EFFECTS");
      let button4 = TemplateBuilder.genPostbackButton("Select", "IMPLANT_SOURCE"); 
      let button5 = TemplateBuilder.genPostbackButton("MORE", "IMPLANT_MORE"); 
      let item1 = TemplateBuilder.genGenericMenuItem("Paano gumagana ang implant?", "www.image.com", [button1]);
      let item2 = TemplateBuilder.genGenericMenuItem("Paano gamitin ang implant?", "www.image.com", [button2]);
      let item3 = TemplateBuilder.genGenericMenuItem("Ano ang pwedeng side effects ng implant?", "www.image.com", [button3]);
      let item4 = TemplateBuilder.genGenericMenuItem("Saan ako pwedeng makakuha ng libreng implant?", "www.image.com", [button4]);
      let item5 = TemplateBuilder.genGenericMenuItem("Iba pang tanong.", "www.image.com", [button5]);
      response.push(await TemplateBuilder.genGenericTemplate([item1, item2, item3, item4, item5]));
    }
    else if(payload === "IMPLANT_MORE") {
      let button1 = TemplateBuilder.genPostbackButton("Select", "IMPLANT_EFFECTIVITY"); 
      let button2 = TemplateBuilder.genPostbackButton("Select", "IMPLANT_PREGNANCY");
      let item1 = TemplateBuilder.genGenericMenuItem("Kailan nagsisimula ang bisa ng implant?", "www.image.com", [button1]);
      let item2 = TemplateBuilder.genGenericMenuItem("Nakipagtalik ako kailan lang nang walang ginagamit na contraceptives.", "www.image.com", [button2], "Mabubuntis po ba ako?");
      response.push(await TemplateBuilder.genGenericTemplate([item1, item2]));
    }

    else if(payload === "IMPLANT_EFFECTIVITY") {
      response.push(TemplateBuilder.genText(`Magsisimula lang ang bisa nito pitong araw pagkatapos ilagay. `));
      response.push(TemplateBuilder.genText(`Tandaan na hindi pa ito gagana agad sa unang pitong araw kaya mag condom muna kung nais makipagtalik`));
      response.push(TemplateBuilder.genQuickReply("May gusto ka pa bang malaman tungkol sa implant?", [
        {
          title: "Oo.",
          payload: "SH_C_IMPLANT_EXTENDED" 
        },
        {
          title: "Ibang contraceptives naman",
          payload: "SH_C_METHODS_EXTENDED"
        },
        {
          title: "Wala na po.",
          payload: "CLOSE_IMPLANT"
        },
        {
          title: "Makipag-usap sa professional", //shortcut
          payload: "MENU_PROFESSIONAL" //TODO
        }
      ]));
    }
    else if(payload === "IMPLANT_PREGNANCY") {
      response.push(TemplateBuilder.genText(`Laging may posibilidad na mabuntis, maliit man o malaki, basta't nakipagtalik nang walang gamit na kahit anong contraceptive.`));
      response.push(TemplateBuilder.genText(`Kumunsulta agad sa isang OB-Gyne upang malaman ang mga susunod na hakbang na puwede mong gawin.`));
      response.push(TemplateBuilder.genQuickReply("May gusto ka pa bang malaman tungkol sa implant?", [
        {
          title: "Oo.",
          payload: "SH_C_IMPLANT_EXTENDED" 
        },
        {
          title: "Ibang contraceptives naman",
          payload: "SH_C_METHODS_EXTENDED"
        },
        {
          title: "Wala na po.",
          payload: "CLOSE_IMPLANT"
        },
        {
          title: "Makipag-usap sa professional", //shortcut
          payload: "MENU_PROFESSIONAL" //TODO
        }
      ]));
    }
    else if(payload === "IMPLANT_WORK") {
      response.push(TemplateBuilder.genText(`Ang implant ay naglalaman ng hormones. May dalawang ginagawa ang hormones na ito: `));
      response.push(TemplateBuilder.genText(`Una, Pinipigil nito ang proseso na tinatawag na "ovulation" - ang paglabas ng hinog na itlog.`));
      response.push(TemplateBuilder.genText(`Pangalawa, Pinapalapot rin ng pills ang mucus na nakabalot sa bukana ng matris (ang 'cervix'), para mapigilan rin ang pagpasok ng semilya.`));
      response.push(TemplateBuilder.genText(`At dahil walang magaganap na pagtatagpo ng itlog at semilya, walang mangyayaring pagbubuntis.`));
      response.push(TemplateBuilder.genQuickReply("May gusto ka pa bang malaman tungkol sa implant?", [
        {
          title: "Oo.",
          payload: "SH_C_IMPLANT_EXTENDED" 
        },
        {
          title: "Ibang contraceptives naman",
          payload: "SH_C_METHODS_EXTENDED"
        },
        {
          title: "Wala na po.",
          payload: "CLOSE_IMPLANT"
        },
        {
          title: "Makipag-usap sa professional", //shortcut
          payload: "MENU_PROFESSIONAL" //TODO
        }
      ]));
    }
    else if(payload === "IMPLANT_USAGE") {
      response.push(TemplateBuilder.genText(`Kailangan itong ipalagay sa isang health care provide.`));
      response.push(TemplateBuilder.genText(`Puwede rin itong ipatanggal sa isang health care provider kung nais nang magbuntis o gumamit ng ibang paraan upang maiwasan ang pagbubuntis.`));
      response.push(TemplateBuilder.genQuickReply("May gusto ka pa bang malaman tungkol sa implant?", [
        {
          title: "Oo.",
          payload: "SH_C_IMPLANT_EXTENDED" 
        },
        {
          title: "Ibang contraceptives naman",
          payload: "SH_C_METHODS_EXTENDED"
        },
        {
          title: "Wala na po.",
          payload: "CLOSE_IMPLANT"
        },
        {
          title: "Makipag-usap sa professional", //shortcut
          payload: "MENU_PROFESSIONAL" //TODO
        }
      ]));
    }
    else if(payload === "IMPLANT_SIDE_EFFECTS") {
      response.push(TemplateBuilder.genText(`Depende 'yan sa katawan mo!`));
      response.push(TemplateBuilder.genText(`May ibang nakararanas ng ibang side effects, at yung iba naman ay hindi.`));
      response.push(TemplateBuilder.genText(`Maaaring makaranas ng hindi regular o hindi inaasahang pagdurugo.`));
      response.push(TemplateBuilder.genText(`Maaari rin huminto ang regla.`));
      response.push(TemplateBuilder.genText(`Normal lang na hindi reglahin kapag gumagamit nito, at walang masamang epekto ito sa katawan.`));
      response.push(TemplateBuilder.genQuickReply("May gusto ka pa bang malaman tungkol sa implant?", [
        {
          title: "Oo.",
          payload: "SH_C_IMPLANT_EXTENDED" 
        },
        {
          title: "Ibang contraceptives naman",
          payload: "SH_C_METHODS_EXTENDED"
        },
        {
          title: "Wala na po.",
          payload: "CLOSE_IMPLANT"
        },
        {
          title: "Makipag-usap sa professional", //shortcut
          payload: "MENU_PROFESSIONAL" //TODO
        }
      ]));
    }
    else if(payload === "IMPLANT_SOURCE") {
      response.push(TemplateBuilder.genText(`Hindi ito nabibili sa botika. Health care provider lang ang pwedeng maglagay nito.`));
      response.push(TemplateBuilder.genText(`Maaari kang makakuha nito sa inyong Barangay Health Center, kung mayroon silang sapat na supply.`));
      response.push(TemplateBuilder.genText(`Pwede rin kayong kumunsulta sa alinman sa mga facilitiessa directory na ito https://rh-care.info/providers/`));
      response.push(TemplateBuilder.genQuickReply("May gusto ka pa bang malaman tungkol sa implant?", [
        {
          title: "Oo.",
          payload: "SH_C_IMPLANT_EXTENDED" 
        },
        {
          title: "Ibang contraceptives naman",
          payload: "SH_C_METHODS_EXTENDED"
        },
        {
          title: "Wala na po.",
          payload: "CLOSE_IMPLANT"
        },
        {
          title: "Makipag-usap sa professional", //shortcut
          payload: "MENU_PROFESSIONAL" //TODO
        }
      ]));
    }



    
    else if(payload.startsWith("SH_C_IUD")) {
      if(payload === "SH_C_IUD") {
        response.push(TemplateBuilder.genText(`Ang IUD ay maliit na plastik na na hugis "T" may nakapalibot na tanso at nakalawit na nylong string. `));
        response.push(TemplateBuilder.genText(`Inilalagay ito sa loob ng matres upang maiwasan ang pagbubuntis`));
        response.push(TemplateBuilder.genText(`Tandaan na hindi nito mapipigilan ang paghawa ng mga sakit na naihahawa sa pakikipagtalik, tulad ng HIV at iba pa.`));
        response.push(TemplateBuilder.genText(`Ito ay mabisa hanggang sampung taon, at sa tamang paggamit, ito ay 99.2 hanggang 99.4% na epektibo.`));
      }
      response.push(TemplateBuilder.genText(`Ano ang gusto mong malaman tungkol sa IUD?`));
      let button1 = TemplateBuilder.genPostbackButton("Select", "IUD_WORK"); 
      let button2 = TemplateBuilder.genPostbackButton("Select", "IUD_USAGE"); 
      let button3 = TemplateBuilder.genPostbackButton("Select", "IUD_SIDE_EFFECTS");
      let button4 = TemplateBuilder.genPostbackButton("Select", "IUD_SOURCE");
      let button5 = TemplateBuilder.genPostbackButton("MORE", "IUD_MORE"); 
      let item1 = TemplateBuilder.genGenericMenuItem("Paano gumagana ang IUD?", "www.image.com", [button1]);
      let item2 = TemplateBuilder.genGenericMenuItem("Paano gamitin ang IUD?", "www.image.com", [button2]);
      let item3 = TemplateBuilder.genGenericMenuItem("Ano ang pwedeng side effects ng IUD?", "www.image.com", [button3]);
      let item4 = TemplateBuilder.genGenericMenuItem("Saan ako pwedeng makakuha ng libreng IUD?", "www.image.com", [button4]);
      let item5 = TemplateBuilder.genGenericMenuItem("Iba pang tanong.", "www.image.com", [button5]);
      response.push(await TemplateBuilder.genGenericTemplate([item1, item2, item3, item4, item5]));
    }
    else if(payload === "IUD_MORE" ) {
      response.push(TemplateBuilder.genText(`Ano ang gusto mong malaman tungkol sa IUD?`));
      let button1 = TemplateBuilder.genPostbackButton("Select", "IUD_EFFECTIVITY"); 
      let button2 = TemplateBuilder.genPostbackButton("Select", "IUD_PREGNANCY");
      let item1 = TemplateBuilder.genGenericMenuItem("Kailan nagsisimula ang bisa ng IUD?", "www.image.com", [button1]);
      let item2 = TemplateBuilder.genGenericMenuItem("Nakipagtalik ako kailan lang nang walang ginagamit na contraceptives.", "www.image.com", [button2], "Mabubuntis po ba ako?");
      response.push(await TemplateBuilder.genGenericTemplate([item1, item2]));
    }
    else if(payload === "IUD_EFFECTIVITY") {
      response.push(TemplateBuilder.genText(`Agad-agad na itong nagiging mabisa sa pag-iwas sa pagbubuntis.`));
      response.push(TemplateBuilder.genQuickReply("May gusto ka pa bang malaman tungkol sa IUD?", [
        {
          title: "Oo.",
          payload: "SH_C_IUD_EXTENDED" 
        },
        {
          title: "Ibang contraceptives naman",
          payload: "SH_C_METHODS_EXTENDED"
        },
        {
          title: "Wala na po.",
          payload: "CLOSE_IUD"
        },
        {
          title: "Makipag-usap sa professional", //shortcut
          payload: "MENU_PROFESSIONAL" //TODO
        }
      ]));
    }
    else if(payload === "IUD_PREGNANCY") {
      response.push(TemplateBuilder.genText(`Laging may posibilidad na mabuntis, maliit man o malaki, basta't nakipagtalik nang walang gamit na kahit anong contraceptive.`));
      response.push(TemplateBuilder.genText(`Kumunsulta agad sa isang OB-Gyne upang malaman ang mga susunod na hakbang na puwede mong gawin.`));
      response.push(TemplateBuilder.genQuickReply("May gusto ka pa bang malaman tungkol sa IUD?", [
        {
          title: "Oo.",
          payload: "SH_C_IUD_EXTENDED" 
        },
        {
          title: "Ibang contraceptives naman",
          payload: "SH_C_METHODS_EXTENDED"
        },
        {
          title: "Wala na po.",
          payload: "CLOSE_IUD"
        },
        {
          title: "Makipag-usap sa professional", //shortcut
          payload: "MENU_PROFESSIONAL" //TODO
        }
      ]));
    }
    else if(payload === "IUD_WORK") {
      response.push(TemplateBuilder.genText(`Pinapatay ng tanso o copper ang mga sperm cells o semilya na pumapasok sa katawan ng gumagamit nito.`));
      response.push(TemplateBuilder.genText(`Kung patay na ang semilya, walang mangyayaring pagbubuntis.`));
      response.push(TemplateBuilder.genText(`Agad-agad na itong nagiging mabisa sa pag-iwas sa pagbubuntis.`));
      response.push(TemplateBuilder.genQuickReply("May gusto ka pa bang malaman tungkol sa IUD?", [
        {
          title: "Oo.",
          payload: "SH_C_IUD_EXTENDED" 
        },
        {
          title: "Ibang contraceptives naman",
          payload: "SH_C_METHODS_EXTENDED"
        },
        {
          title: "Wala na po.",
          payload: "CLOSE_IUD"
        },
        {
          title: "Makipag-usap sa professional", //shortcut
          payload: "MENU_PROFESSIONAL" //TODO
        }
      ]));
    }
    else if(payload === "IUD_USAGE") {
      response.push(TemplateBuilder.genText(`Kailangan itong ipalagay sa isang health care provider. `));
      response.push(TemplateBuilder.genText(`Pwede rin itong ipatanggal sa isang health care provider kung nais nang magbuntis o gumamit ng ibang paraan sa pag-iwas sa pagbubuntis.`));
      response.push(TemplateBuilder.genQuickReply("May gusto ka pa bang malaman tungkol sa IUD?", [
        {
          title: "Oo.",
          payload: "SH_C_IUD_EXTENDED" 
        },
        {
          title: "Ibang contraceptives naman",
          payload: "SH_C_METHODS_EXTENDED"
        },
        {
          title: "Wala na po.",
          payload: "CLOSE_IUD"
        },
        {
          title: "Makipag-usap sa professional", //shortcut
          payload: "MENU_PROFESSIONAL" //TODO
        }
      ]));
    }
    else if(payload === "IUD_SIDE_EFFECTS") {
      response.push(TemplateBuilder.genText(`Depende 'yan sa katawan mo!`));
      response.push(TemplateBuilder.genText(`May ibang nakararanas ng ibang side effects, at yung iba naman ay hindi.`));
      response.push(TemplateBuilder.genText(`Maaaring makaranas ng pananakit ng puson o masmalakas na pagregla.`));
      response.push(TemplateBuilder.genText(`Normal lang ito! Kumunsulta agad sa doctor o health care provider kung sobra-sobra ang pananakit at hindi nawawala sa pag-inom ng over-the-counter na painkillers.`));
      response.push(TemplateBuilder.genQuickReply("May gusto ka pa bang malaman tungkol sa IUD?", [
        {
          title: "Oo.",
          payload: "SH_C_IUD_EXTENDED" 
        },
        {
          title: "Ibang contraceptives naman",
          payload: "SH_C_METHODS_EXTENDED"
        },
        {
          title: "Wala na po.",
          payload: "CLOSE_IUD"
        },
        {
          title: "Makipag-usap sa professional", //shortcut
          payload: "MENU_PROFESSIONAL" //TODO
        }
      ]));
    }
    else if(payload === "IUD_SOURCE") {
      response.push(TemplateBuilder.genText(`Kumunsulta sa isang OB_GYNE para makakuha nito.`));
      response.push(TemplateBuilder.genText(`Hindi ito nabibili sa botika. Health care provider lang ang pwedeng maglagay nito.`));
      response.push(TemplateBuilder.genText(`Maaari kang makakuha nito sa inyong Barangay Health Center, kung mayroon silang sapat na supply.`));
      response.push(TemplateBuilder.genText(`Pwede rin kayong kumunsulta sa alinman sa mga facilitiessa directory na ito https://rh-care.info/providers/`));
      response.push(TemplateBuilder.genQuickReply("May gusto ka pa bang malaman tungkol sa IUD?", [
        {
          title: "Oo.",
          payload: "SH_C_IUD_EXTENDED" 
        },
        {
          title: "Ibang contraceptives naman",
          payload: "SH_C_METHODS_EXTENDED"
        },
        {
          title: "Wala na po.",
          payload: "CLOSE_IUD"
        },
        {
          title: "Makipag-usap sa professional", //shortcut
          payload: "MENU_PROFESSIONAL" //TODO
        }
      ]));
    }
    


    else if(payload.startsWith("SH_C_DMPA")) {
      if(payload === "SH_C_DMPA") {
        response.push(TemplateBuilder.genText(`Ang DMPA o depo ay isang hormonal injectable na iinuturok kada tatlong buwan. Ito ay 99.7% na epektibo sa tamang paggamit.`));
        response.push(TemplateBuilder.genText(`Tandaan na hindi nito mapipigilan ang paghawa ng mga sakit na naihahawa sa pakikipagtalik, tulad ng HIV at iba pa. `));
      }
      response.push(TemplateBuilder.genText(`Ano ang gusto mong malaman tungkol sa DMPA?`));
      let button1 = TemplateBuilder.genPostbackButton("Select", "DMPA_WORK"); 
      let button2 = TemplateBuilder.genPostbackButton("Select", "DMPA_USAGE"); 
      let button3 = TemplateBuilder.genPostbackButton("Select", "DMPA_BREAST_FEEDING");
      let button4 = TemplateBuilder.genPostbackButton("Select", "DMPA_SIDE_EFFECTS");
      let button5 = TemplateBuilder.genPostbackButton("Select", "DMPA_SOURCE"); 
      let button6 = TemplateBuilder.genPostbackButton("MORE", "DMPA_MORE");
      let item1 = TemplateBuilder.genGenericMenuItem("Paano gumagana ang DMPA?", "www.image.com", [button1]);
      let item2 = TemplateBuilder.genGenericMenuItem("Paano gamitin ang DMPA?", "www.image.com", [button2]);
      let item3 = TemplateBuilder.genGenericMenuItem("Pwede ba ang DMPA sa nagpapasuso?", "www.image.com", [button3]);
      let item4 = TemplateBuilder.genGenericMenuItem("Ano ang pwedeng side effects ng DMPA?", "www.image.com", [button4]);
      let item5 = TemplateBuilder.genGenericMenuItem("Saan ako pwedeng makakuha ng DMPA?", "www.image.com", [button5]);
      let item6 = TemplateBuilder.genGenericMenuItem("Iba pang tanong.", "www.image.com", [button6]);
      response.push(await TemplateBuilder.genGenericTemplate([item1, item2, item3, item4, item5, item6]));
    }
    else if(payload === "DMPA_MORE") {
      response.push(TemplateBuilder.genText(`Ano ang gusto mong malaman tungkol sa DMPA?`));
      let button1 = TemplateBuilder.genPostbackButton("Select", "DMPA_EFFECTIVITY");
      let button2 = TemplateBuilder.genPostbackButton("Select", "DMPA_FORGET"); 
      let button3 = TemplateBuilder.genPostbackButton("Select", "DMPA_PREGNANCY");
      let item1 = TemplateBuilder.genGenericMenuItem("Kailan nagsisimula ang bisa ng DMPA?", "www.image.com", [button1]);
      let item2 = TemplateBuilder.genGenericMenuItem("Paano kung nakalimutan kong bumalik sa araw ng schedule ko?", "www.image.com", [button2]);
      let item3 = TemplateBuilder.genGenericMenuItem("Nakipagtalik ako kailan lang nang walang ginagamit na contraceptives.", "www.image.com", [button3], "Mabubuntis po ba ako?");
      response.push(await TemplateBuilder.genGenericTemplate([item1, item2, item3]));
    }
    else if(payload === "DMPA_WORK") {
      response.push(TemplateBuilder.genText(`Ang DMPA ay naglalaman ng hormones. May dalawang ginagawa ang hormones na ito:`));
      response.push(TemplateBuilder.genText(`Una, Pinipigil nito ang proseso na tinatawag na "ovulation" - ang paglabas ng hinog na itlog.`));
      response.push(TemplateBuilder.genText(`Pangalawa, Pinapalapot rin ng pills ang mucus na nakabalot sa bukana ng matris (ang ?cervix?), para mapigilan rin ang pagpasok ng semilya.`));
      response.push(TemplateBuilder.genQuickReply("May gusto ka pa bang malaman tungkol sa DMPA?", [
        {
          title: "Oo.",
          payload: "SH_C_DMPA_EXTENDED" 
        },
        {
          title: "Ibang contraceptives naman",
          payload: "SH_C_METHODS_EXTENDED"
        },
        {
          title: "Wala na po.",
          payload: "CLOSE_DMPA"
        },
        {
          title: "Makipag-usap sa professional", //shortcut
          payload: "MENU_PROFESSIONAL" //TODO
        }
      ]));
    }
    else if(payload === "DMPA_USAGE") {
      response.push(TemplateBuilder.genText(`Tinuturok ito ng isang healthcare provider sa braso, hita, o pigi ng taong nais umiwas sa pagbubuntis.`));
      response.push(TemplateBuilder.genText(`Magsisimula lang ang bisa nito pitong araw pagkatapos iturok. `));
      response.push(TemplateBuilder.genText(`Tandaan na hindi pa ito gagana agad sa unang pitong araw kaya mag condom muna kung nais makipagtalik!`));
      response.push(TemplateBuilder.genQuickReply("May gusto ka pa bang malaman tungkol sa DMPA?", [
        {
          title: "Oo.",
          payload: "SH_C_DMPA_EXTENDED" 
        },
        {
          title: "Ibang contraceptives naman",
          payload: "SH_C_METHODS_EXTENDED"
        },
        {
          title: "Wala na po.",
          payload: "CLOSE_DMPA"
        },
        {
          title: "Makipag-usap sa professional", //shortcut
          payload: "MENU_PROFESSIONAL" //TODO
        }
      ]));
    }
    else if(payload === "DMPA_BREAST_FEEDING") {
      response.push(TemplateBuilder.genText(`Pwedeng pwede!`));
      response.push(TemplateBuilder.genText(`Basta't anim na linggo na ang nakalipas mula sa panganganak. `));
      response.push(TemplateBuilder.genQuickReply("May gusto ka pa bang malaman tungkol sa DMPA?", [
        {
          title: "Oo.",
          payload: "SH_C_DMPA_EXTENDED" 
        },
        {
          title: "Ibang contraceptives naman",
          payload: "SH_C_METHODS_EXTENDED"
        },
        {
          title: "Wala na po.",
          payload: "CLOSE_DMPA"
        },
        {
          title: "Makipag-usap sa professional", //shortcut
          payload: "MENU_PROFESSIONAL" //TODO
        }
      ]));
    }
    else if(payload === "DMPA_SIDE_EFFECTS") {
      response.push(TemplateBuilder.genText(`Depende 'yan sa katawan mo!`));
      response.push(TemplateBuilder.genText(`May ibang nakararanas ng ibang side effects, at yung iba naman ay hindi.`));
      response.push(TemplateBuilder.genText(`May ibang nakararanas ng irregular na regla o pagdurugo. Posible rin na huminto ang regla.`));
      response.push(TemplateBuilder.genText(`Normal lang ito!`));
      response.push(TemplateBuilder.genText(`Kumunsulta lang agad sa doktor kung sobra-sobra naman ang pagdurugo.`));
      response.push(TemplateBuilder.genQuickReply("May gusto ka pa bang malaman tungkol sa DMPA?", [
        {
          title: "Oo.",
          payload: "SH_C_DMPA_EXTENDED" 
        },
        {
          title: "Ibang contraceptives naman",
          payload: "SH_C_METHODS_EXTENDED"
        },
        {
          title: "Wala na po.",
          payload: "CLOSE_DMPA"
        },
        {
          title: "Makipag-usap sa professional", //shortcut
          payload: "MENU_PROFESSIONAL" //TODO
        }
      ]));
    }
    else if(payload === "DMPA_SOURCE") {
      response.push(TemplateBuilder.genText(`Hindi ito nabibili sa botika. Health care provider lang ang pwedeng magturok nito.`));
      response.push(TemplateBuilder.genText(`Maari kang makakuha nito sa inyong Barangay Health Center, kung mayroon silang sapat na supply.`));
      response.push(TemplateBuilder.genText(`Pwede rin kayong kumunsulta sa alinman sa mga facilitiessa directory na ito https://rh-care.info/providers/`));
      response.push(TemplateBuilder.genQuickReply("May gusto ka pa bang malaman tungkol sa DMPA?", [
        {
          title: "Oo.",
          payload: "SH_C_DMPA_EXTENDED" 
        },
        {
          title: "Ibang contraceptives naman",
          payload: "SH_C_METHODS_EXTENDED"
        },
        {
          title: "Wala na po.",
          payload: "CLOSE_DMPA"
        },
        {
          title: "Makipag-usap sa professional", //shortcut
          payload: "MENU_PROFESSIONAL" //TODO
        }
      ]));
    }
    else if(payload === "DMPA_EFFECTIVITY") {
      response.push(TemplateBuilder.genText(`Magsisimula lang ang bisa nito pitong araw pagkatapos iturok.`));
      response.push(TemplateBuilder.genText(`Tandaan na hindi pa ito gagana agad sa unang pitong araw kaya mag condom muna kung nais makipagtalik!`));
      response.push(TemplateBuilder.genQuickReply("May gusto ka pa bang malaman tungkol sa DMPA?", [
        {
          title: "Oo.",
          payload: "SH_C_DMPA_EXTENDED" 
        },
        {
          title: "Ibang contraceptives naman",
          payload: "SH_C_METHODS_EXTENDED"
        },
        {
          title: "Wala na po.",
          payload: "CLOSE_DMPA"
        },
        {
          title: "Makipag-usap sa professional", //shortcut
          payload: "MENU_PROFESSIONAL" //TODO
        }
      ]));
    }
    else if(payload === "DMPA_FORGET") {
      response.push(TemplateBuilder.genText(`Magpa-schedule agad ng follow-up shot at gumamit muna ng back-up contraceptive tulad ng condom.`));
      response.push(TemplateBuilder.genText(`Para sa karagdagang impormasyon, basahin ang article na ito: www.link.com`));
      response.push(TemplateBuilder.genQuickReply("May gusto ka pa bang malaman tungkol sa DMPA?", [
        {
          title: "Oo.",
          payload: "SH_C_DMPA_EXTENDED" 
        },
        {
          title: "Ibang contraceptives naman",
          payload: "SH_C_METHODS_EXTENDED"
        },
        {
          title: "Wala na po.",
          payload: "CLOSE_DMPA"
        },
        {
          title: "Makipag-usap sa professional", //shortcut
          payload: "MENU_PROFESSIONAL" //TODO
        }
      ]));
    }
    else if(payload === "DMPA_PREGNANCY") {
      response.push(TemplateBuilder.genText(`Laging may posibilidad na mabuntis, maliit man o malaki, basta't nakipagtalik nang walang gamit na kahit anong contraceptive.`));
      response.push(TemplateBuilder.genText(`Kumunsulta agad sa isang OB-Gyne upang malaman ang mga susunod na hakbang na puwede mong gawin.`));
      response.push(TemplateBuilder.genQuickReply("May gusto ka pa bang malaman tungkol sa DMPA?", [
        {
          title: "Oo.",
          payload: "SH_C_DMPA_EXTENDED" 
        },
        {
          title: "Ibang contraceptives naman",
          payload: "SH_C_METHODS_EXTENDED"
        },
        {
          title: "Wala na po.",
          payload: "CLOSE_DMPA"
        },
        {
          title: "Makipag-usap sa professional", //shortcut
          payload: "MENU_PROFESSIONAL" //TODO
        }
      ]));
    }




    else if(payload.startsWith("SH_C_PILLS")) {
      if(payload === "SH_C_PILLS") {
        response.push(TemplateBuilder.genText(`Ang pills ay mabisang gamot na iniinom araw-araw sa pare-parehong oras, upang maiwasan ang pagbubuntis. Sa tamang paggamit, ito ay 92 hanggang 99.7% effective.`));
        response.push(TemplateBuilder.genText(`Tandaan na hindi nito mapipigilan ang paghawa ng mga sakit na naihahawa sa pakikipagtalik, tulad ng HIV at iba pa`));
      }
      response.push(TemplateBuilder.genText(`Ano ang gusto mong malaman tungkol sa pills?`));
      let button1 = TemplateBuilder.genPostbackButton("Select", "PILLS_WORK"); 
      let button2 = TemplateBuilder.genPostbackButton("Select", "PILLS_USAGE"); 
      let button3 = TemplateBuilder.genPostbackButton("Select", "PILLS_SIDE_EFFECTS");
      let button4 = TemplateBuilder.genPostbackButton("Select", "PILLS_SOURCE"); 
      let button5 = TemplateBuilder.genPostbackButton("MORE", "PILLS_MORE");
      let item1 = TemplateBuilder.genGenericMenuItem("Paano gumagana ang pills?", "www.image.com", [button1]);
      let item2 = TemplateBuilder.genGenericMenuItem("Paano gamitin ang pills?", "www.image.com", [button2]);
      let item3 = TemplateBuilder.genGenericMenuItem("Ano ang mga pwedeng side effects ng pills?", "www.image.com", [button3]);
      let item4 = TemplateBuilder.genGenericMenuItem("Saan ako puwedeng makakuha pills?", "www.image.com", [button4]);
      let item5 = TemplateBuilder.genGenericMenuItem("Iba pang tanong.", "www.image.com", [button5]);
      response.push(await TemplateBuilder.genGenericTemplate([item1, item2, item3, item4, item5]));
    }
    else if(payload === "PILLS_WORK") {
      response.push(TemplateBuilder.genText(`Ang pills ay naglalaman ng hormones. May dalawang ginagawa ang hormones na ito: `));
      response.push(TemplateBuilder.genText(`Una, Pinipigil nito ang proseso na tinatawag na "ovulation" - ang paglabas ng hinog na itlog`));
      response.push(TemplateBuilder.genText(`Pangalawa, Pinapalapot rin ng pills ang mucus na nakabalot sa bukana ng matris (ang 'cervix'), para mapigilan rin ang pagpasok ng semilya`));
      response.push(TemplateBuilder.genQuickReply("May gusto ka pa bang malaman tungkol sa pills?", [
        {
          title: "Oo.",
          payload: "SH_C_PILLS_EXTENDED" 
        },
        {
          title: "Ibang contraceptives naman",
          payload: "SH_C_METHODS_EXTENDED"
        },
        {
          title: "Wala na po.",
          payload: "CLOSE_PILLS"
        },
      ]));
    }
    else if(payload === "PILLS_USAGE") {
      response.push(TemplateBuilder.genText(`Kung first time mo gumamit ng pills, simulan mong uminom ng isang pill sa unang araw ng regla.`));
      response.push(TemplateBuilder.genText(`Pagkatapos ay inumin lang ito araw-araw sa pare-parehong oras.`));
      response.push(TemplateBuilder.genText(`Tandaan na hindi pa ito gagana agad sa unang 7 araw!`));
      response.push(TemplateBuilder.genText(`Kung 21 ang laman ng pakete, tumigil ng 7 days kapag naubos na ito, at tsaka magsimula ulit uminom mula sa bagong pakete.`));
      response.push(TemplateBuilder.genText(`Kung 28 ang laman ng pakete, araw-araw itong inumin nang tuloy-tuloy. Hindi na kailangan magpahinga ng 7 araw. `));
      response.push(TemplateBuilder.genQuickReply("May gusto ka pa bang malaman tungkol sa pills?", [
        {
          title: "Oo.",
          payload: "SH_C_PILLS_EXTENDED" 
        },
        {
          title: "Ibang contraceptives naman",
          payload: "SH_C_METHODS_EXTENDED"
        },
        {
          title: "Wala na po.",
          payload: "CLOSE_PILLS"
        },
      ]));
    }
    else if(payload === "PILLS_SIDE_EFFECTS") {
      response.push(TemplateBuilder.genText(`Depende 'yan sa katawan mo!`));
      response.push(TemplateBuilder.genText(`May ibang nakararanas ng ibang side effects, at yung iba naman ay hindi.`));
      response.push(TemplateBuilder.genText(`Normal lang na makaranas ng kaunting sakit sa ulo, pagbabago sa timbang, at pagkawala o pagdami ng tigyawat.`));
      response.push(TemplateBuilder.genText(`May ibang nireregla habang gumagamit ng pills, at may ibang hindi. Normal lang po ito pareho.`));
      response.push(TemplateBuilder.genQuickReply("May gusto ka pa bang malaman tungkol sa pills?", [
        {
          title: "Oo.",
          payload: "SH_C_PILLS_EXTENDED" 
        },
        {
          title: "Ibang contraceptives naman",
          payload: "SH_C_METHODS_EXTENDED"
        },
        {
          title: "Wala na po.",
          payload: "CLOSE_PILLS"
        },
      ]));
    }
    else if(payload === "PILLS_SOURCE") {
      response.push(TemplateBuilder.genText(`May mga nabibiling pills sa mga botika.`));
      response.push(TemplateBuilder.genText(`Maaari rin po kayong makakuha ng libreng pills sa inyong Barangay Health Center, kung mayroon silang sapat na supply.`));
      response.push(TemplateBuilder.genText(`Pwede rin kayong kumunsulta sa alinman sa mga facilities sa directory na ito:\nhttps://rh-care.info/providers/`));
      response.push(TemplateBuilder.genQuickReply("May gusto ka pa bang malaman tungkol sa pills?", [
        {
          title: "Oo.",
          payload: "SH_C_PILLS_EXTENDED" 
        },
        {
          title: "Ibang contraceptives naman",
          payload: "SH_C_METHODS_EXTENDED"
        },
        {
          title: "Wala na po.",
          payload: "CLOSE_PILLS"
        },
      ]));
    }
    else if(payload === "PILLS_MORE") {
      let button1 = TemplateBuilder.genPostbackButton("Select", "PILLS_FORBID"); 
      let button2 = TemplateBuilder.genPostbackButton("Select", "PILLS_FORGET");  
      let button3 = TemplateBuilder.genPostbackButton("Select", "PILLS_STOP"); 
      let button4 = TemplateBuilder.genPostbackButton("Select", "PILLS_PREGNANCY"); 
      let item1 = TemplateBuilder.genGenericMenuItem("Sino ang hindi pwedeng gumamit ng pills?", "www.image.com", [button1]);
      let item2 = TemplateBuilder.genGenericMenuItem("Paano kung nakalimutan kong uminom ng pills?", "www.image.com", [button2]);
      let item3 = TemplateBuilder.genGenericMenuItem("Ayaw ko na uminom ng pills. Paano ako titigil?", "www.image.com", [button3]);
      let item4 = TemplateBuilder.genGenericMenuItem("Nakipagtalik ako kailan lang nang walang ginagamit na contraceptives.", "www.image.com", [button4], "Mabubuntis po ba ako?");
      response.push(await TemplateBuilder.genGenericTemplate([item1, item2, item3, item4]));

    }

    else if(payload === "PILLS_FORBID") {
      response.push(TemplateBuilder.genText(`Bago gumamit ng pills, kumunsulta muna sa isang health care provider...`));
      response.push(TemplateBuilder.genText(`Lalo na kung ikaw ay may sakit sa puso, nakaranas ng blood clots, cancer, sakit sa puso, bukol sa suso, umiinom ng maintenance na gamot, o iba pang malubhang sakit.`));
      response.push(TemplateBuilder.genText(`Hindi rin ito advisable sa mga naninigarilyo na nasa edad 35 pataas. `));
      response.push(TemplateBuilder.genQuickReply("May gusto ka pa bang malaman tungkol sa pills?", [
        {
          title: "Oo.",
          payload: "SH_C_PILLS_EXTENDED" 
        },
        {
          title: "Ibang contraceptives naman",
          payload: "SH_C_METHODS_EXTENDED"
        },
        {
          title: "Wala na po.",
          payload: "CLOSE_PILLS"
        },
      ]));
    }
    else if(payload === "PILLS_FORGET") {
      response.push(TemplateBuilder.genText(`Maaring mabawasan ang bisa nito.`));
      response.push(TemplateBuilder.genQuickReply("Ilan ba ang nakalimutan mong inumin?", [
        {
          title: "Isa lang.",
          payload: "PILLS_FORGET_1" 
        },
        {
          title: "Dalawa.",
          payload: "PILLS_FORGET_2" 
        },
        {
          title: "Tato o higit pa",
          payload: "PILLS_FORGET_3" 
        },
      ]));

    }
    
    else if(payload === "PILLS_FORGET_1") {
      response.push(TemplateBuilder.genText(`Okay lang 'yan! Inumin agad ang nakalimutang pill sa oras na maalala ito!`));
      response.push(TemplateBuilder.genText(`Tapos, inumin naman ang isang pill sa oras na nakatakda para sa araw na yun.`));
      response.push(TemplateBuilder.genText(`Para sa karagdagang impormasyon, bisitahin ang link na ito: www.link.com`));
      response.push(TemplateBuilder.genQuickReply("May gusto ka pa bang malaman tungkol sa pills?", [
        {
          title: "Oo.",
          payload: "SH_C_PILLS_EXTENDED" 
        },
        {
          title: "Ibang contraceptives naman",
          payload: "SH_C_METHODS_EXTENDED"
        },
        {
          title: "Wala na po.",
          payload: "CLOSE_PILLS"
        },
      ]));
    }
    else if(payload === "PILLS_FORGET_2") {
      response.push(TemplateBuilder.genText(`Huwag nang inumin ang unang pill na nakalimutan!`));
      response.push(TemplateBuilder.genText(`Inumin agad ang nakalimutang pangalawang pill sa oras na maalala ito.`));
      response.push(TemplateBuilder.genText(`Tapos, Inumin naman ang isang pill sa oras na nakatakda para sa araw na yun.`));
      response.push(TemplateBuilder.genText(`Gumamit na ng back up method gaya ng condom sa loob ng 7 araw.`));
      response.push(TemplateBuilder.genText(`Para sa karagdagang impormasyon, bisitahin ang link na ito: www.link.com`));
      response.push(TemplateBuilder.genQuickReply("May gusto ka pa bang malaman tungkol sa pills?", [
        {
          title: "Oo.",
          payload: "SH_C_PILLS_EXTENDED" 
        },
        {
          title: "Ibang contraceptives naman",
          payload: "SH_C_METHODS_EXTENDED"
        },
        {
          title: "Wala na po.",
          payload: "CLOSE_PILLS"
        },
      ]));
    }
    else if(payload === "PILLS_FORGET_3") {
      response.push(TemplateBuilder.genText(`Naku, paso na yan besh. Itigil muna ang pag-inom ng pills.`));
      response.push(TemplateBuilder.genText(`Hintayin muna ang regla at gumamit ng condom upang maiwasan ang pagbuntis.`));
      response.push(TemplateBuilder.genText(`Pagdating ng unang araw ng regla, magsimula ulit uminom ng pills mula sa bagong pakete.`));
      response.push(TemplateBuilder.genText(`Sa unang pitong araw ng muling pag-inom, hindi pa ito epektibo kaya ipagpatuloy muna ang paggamit ng condom.`));
      response.push(TemplateBuilder.genText(`Para sa karagdagang impormasyon, bisitahin ang link na ito: www.link.com`));
      response.push(TemplateBuilder.genQuickReply("May gusto ka pa bang malaman tungkol sa pills?", [
        {
          title: "Oo.",
          payload: "SH_C_PILLS_EXTENDED" 
        },
        {
          title: "Ibang contraceptives naman",
          payload: "SH_C_METHODS_EXTENDED"
        },
        {
          title: "Wala na po.",
          payload: "CLOSE_PILLS"
        },
      ]));
    }

    else if(payload === "PILLS_STOP") {
      response.push(TemplateBuilder.genText(`Yes, okay lang po ito itigil kung kailan niyo gusto.`));
      response.push(TemplateBuilder.genText(`Pero tandaan na kapag tumigil kang uminom ng pills, pwede kang mabuntis anumang oras, kung ikaw ay makikipagtalik nang wala kang ibang ginagamit na contraceptive.`));
      response.push(TemplateBuilder.genQuickReply("May gusto ka pa bang malaman tungkol sa pills?", [
        {
          title: "Oo.",
          payload: "SH_C_PILLS_EXTENDED" 
        },
        {
          title: "Ibang contraceptives naman",
          payload: "SH_C_METHODS_EXTENDED"
        },
        {
          title: "Wala na po.",
          payload: "CLOSE_PILLS"
        },
      ]));
    }
    else if(payload === "PILLS_PREGNANCY") {
      response.push(TemplateBuilder.genText(`Laging may posibilidad na mabuntis, maliit man o malaki, basta't nakipagtalik nang walang gamit na kahit anong contraceptive.`));
      response.push(TemplateBuilder.genText(`Kumunsulta agad sa isang OB-Gyne upang malaman ang mga susunod na hakbang na puwede mong gawin.`));
      response.push(TemplateBuilder.genQuickReply("May gusto ka pa bang malaman tungkol sa pills?", [
        {
          title: "Oo.",
          payload: "SH_C_PILLS_EXTENDED" 
        },
        {
          title: "Ibang contraceptives naman",
          payload: "SH_C_METHODS_EXTENDED"
        },
        {
          title: "Wala na po.",
          payload: "CLOSE_PILLS"
        },
      ]));
    }




    else if(payload.startsWith("CLOSE")) {
      if(payload === "CLOSE_PILLS") {
        response.push(TemplateBuilder.genText(`Para sa karagdagang impormasyon, bisitahin ang malayaako.ph. `));
      } else if(payload === "CLOSE_DMPA") {
        response.push(TemplateBuilder.genText(`Para sa karagdagang impormasyon, magtungo sa link na ito: https://www.facebook.com/UNKClinic/posts/3071736796270534`));
      } else if(payload === "CLOSE_IUD") {
        response.push(TemplateBuilder.genText(`Para sa karagdagang impormasyon, magtungo sa link na ito: https://malayaako.ph/ligtas/iud-birth-control-mga-dapat-mong-malaman-bago-at-pagkatapos-magpalagay-nito/`));
      } else if(payload === "CLOSE_IMPLANT") {
        response.push(TemplateBuilder.genText(`Para sa karagdagang impormasyon, magtungo sa link na ito: https://www.facebook.com/UNKClinic/posts/3071736796270534`));
      } else if(payload === "CLOSE_CONDOM") {
        response.push(TemplateBuilder.genText(`Para sa karagdagang impormasyon, magtungo sa link na ito: Para sa karagdagang impormasyon, magtungo sa link na ito: https://www.facebook.com/UNKClinic/posts/3071736796270534`));
      } else if(payload === "CLOSE_PREGNANCY") {
        response.push(TemplateBuilder.genText(`Para sa karagdagang impormasyon, tumungo sa aming website: https://malayaako.ph/?s=PREGNANCY`));
      }
      response.push(TemplateBuilder.genText(`O siya, babay na muna.`));
      response.push(TemplateBuilder.genText(`Paalala lang po, nagbabahagi lang po kami ng impormasyon.`));
      response.push(TemplateBuilder.genText(`Ano mang impormasyong naibigay namin ay hindi katumbas ng medical advice mula sa isang doctor.`));
      response.push(TemplateBuilder.genText(`Maraming salamat sa pakikipag-usap sa amin!`));
      response.push(TemplateBuilder.genText(`Kung may gusto pa kayong malaman o itanong, mag message lang sa amin anytime.`));
    }
 */
    console.log("Received Payload:", `${payload} for ${this.user.psid}`);

    switch (payload) {
      
      case "GET_STARTED":
          this.user.state = "GET_STARTED";
          break;

      default:
        break;
    }
    
    Repository.updateCustomerChatState(this.user.psid, this.user.state);

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
