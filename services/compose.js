"use strict";

const TemplateBuilder = require("./builder");

module.exports = class {
    static composeMsgParam(payload, user){
        let msgParamList = [];
        switch (payload) {
            case "PRE_GET_STARTED":
            case "MENU_INITIAL_12":
            case "MENU_INITIAL_16":
            case "MENU_INITIAL_19":
            case "MENU":
            case "BC_QUIZ":
                msgParamList.push(user.firstName);
                break;
             
            case "Q_FAMILY_PLANNING_NO":
                if(user.pillStatus === "PROGESTIN"){
                    msgParamList.push("PROGESTIN-ONLY PILLS!");
                } else {
                    msgParamList.push("PILLS!");

                }
                break;

            default:
                break;
        }
  
        return msgParamList;
      }
}