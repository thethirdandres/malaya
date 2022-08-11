"use strict";

const TemplateBuilder = require("./builder");

module.exports = class {
    static composeMsgParam(payload, user){
        let msgParamList = [];
        switch (payload) {
            case "GET_STARTED":
            case "AGE_12":
            case "AGE_16":
            case "AGE_19":
            case "MENU_EXTENDED":
            case "BC_QUIZ":
                msgParamList.push(user.firstName);
                break;
             
            case "Q_FAMILY_PLANNING_NO":
                if(user.pillStatus === "PROGESTIN"){
                    msgParamList.push("PROGESTIN-ONLY PILLS");
                } else {
                    msgParamList.push("PILLS");

                }
                break;

            default:
                break;
        }
  
        return msgParamList;
      }
}