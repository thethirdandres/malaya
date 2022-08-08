"use strict";

const TemplateBuilder = require("./builder"),
    Composer = require("./compose"),
    StoreRepository = require("./repository");

module.exports = class Response {
    static async genResponseMessageSequence(payload, user){
        let response = [];
  
        let message_sequence = await StoreRepository.getDbDefinedPayload(payload);
  
        if(message_sequence){
          let msgParam = Composer.composeMsgParam(payload, user);
          console.log("PARAM MSG IS:", msgParam[0]);
          message_sequence.forEach(sequence =>{
            response.push(TemplateBuilder.genMessageResponseSequence(sequence, msgParam));
          }) 
  
          return response;
        }
  
        return response;
  
      }
}