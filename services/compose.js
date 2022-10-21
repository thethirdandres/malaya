"use strict";

const TemplateBuilder = require("./builder");

module.exports = class {
    static composeMsgParam(payload, user){
        let msgParamList = [];
        let genderBasedAddress = user.gender == "male" ? "pre" : user.gender == "female" ? "sis" : user.gender == "nonbinary" ? "lods" : user.gender == "transgender" ? "beshie" : "friend"; 
        switch (payload) {
            case "CLOSE_MH_SELF":
            case "CLOSE_MH_PROBLEMS":
            case "CLOSE_RELATIONSHIPS":
            case "CLOSE_GROWING_UP":
            case "CLOSE_PUBERTY":
            case "CLOSE":
            case "CLOSE_STI":
            case "CLOSE_PERIOD":
            case "CLOSE_PILLS":
            case "CLOSE_DMPA":
            case "CLOSE_IUD":
            case "CLOSE_IMPLANT":
            case "CLOSE_CONDOM":
            case "CLOSE_PREGNANCY":
            case "BC_QUIZ":
                msgParamList.push(user.firstName);
                break;

            
            case "GENDER_MALE":
            case "GENDER_FEMALE":
            case "GENDER_NONBINARY":
            case "GENDER_TRANSGENDER":
            case "GENDER_NONE":
                console.log("genderBasedAddress", genderBasedAddress);
                console.log("user.gender", user.gender);
                msgParamList.push(genderBasedAddress);
                break;
            
            case "GU_P_REGULAR":
            case "GU_P_REGULAR_19":
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