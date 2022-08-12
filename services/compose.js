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
            case "CLOSE":
            case "CLOSE_PERIOD":
            case "CLOSE_PILLS":
            case "CLOSE_IUD":
            case "CLOSE_DMPA":
            case "CLOSE_CONDOM":
            case "CLOSE_IMPLANT":
            case "CLOSE_PREGNANCY":
            case "CLOSE_PUBERTY":
                msgParamList.push(user.firstName);
                break;
            
            case "GU_P_REGULAR":
            case "GU_P_REGULAR_20":
            case "GU_P_REGULAR_30":
                msgParamList.push(user.age);
                break;
             
            case "Q_FAMILY_PLANNING_NO":
            case "Q_FAMILY_PLANNING_NO_EXTENDED":
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