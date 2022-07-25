"use strict";

const TemplateBuilder = require("./builder");

module.exports = class {
    static composeMsgParam(payload, user){
        let msgParamList = [];
        switch (payload) {
          case "GET_STARTED":
            msgParamList.push(user.firstName);
            break;
        
          default:
            break;
        }
  
        return msgParamList;
      }
}