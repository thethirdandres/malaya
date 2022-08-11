"use strict";
require("dotenv").config();

// The Firebase Admin SDK to access Cloud Firestore.
const admin = require('firebase-admin'),
config = require("./config"),
request = require('request');

admin.initializeApp({
  credential: admin.credential.cert(
      JSON.parse(Buffer.from(process.env.FIREBASE_CONFIG, 'base64').toString('ascii'))
  ),
});

let db = admin.firestore();  

module.exports = class Repository {
    static updateCustomerChatState(user){
        console.log("state passed to updateCustomerChatState", user.state);
        console.log("senderPsid passed to updateCustomerChatsenderState", user.psid);

        try {
            const customerRef = db.collection(`Tenant/Malaya/Customers`).doc(user.psid);
            customerRef.get().then((customerSnapshot)=>{
                if(customerSnapshot.exists){
                    customerRef.update({
                        state: user.state
                    });
                } 
            })
        } catch (error) {
            console.log(error);
            return;
        }
    }

    static async getCustomerChatState(user){
        console.log("state passed to getCustomerChatState", user.state);
        console.log("senderPsid passed to getCustomerChatState", user.psid);

        try {
            const customerRef = await db.collection(`Tenant/Malaya/Customers`).doc(`5289986177691056`).get();
            if (!customerRef.exists) {
              console.log('No such document!');
            } else {
              console.log('Document data:', customerRef.data());
              return customerRef.data()['state'];
            }
        } catch (error) {
            console.log(error);
            return;
        }
    }

    static async getDbDefinedPayload(payload){
        try {
            let messagesData = await db.doc(`MalayaPayload/${payload}`).get();
            
            if (!messagesData.exists) {
                console.log('No such message payload!');
                return null;
            } 
            
            console.log('Document data:', messagesData.data());

            return messagesData.data()['is_active'] ?
                   messagesData.data()['message_sequence']
                                    .sort(function(a, b) {
                                        var x = a['order']; var y = b['order'];
                                        return ((x < y) ? -1 : ((x > y) ? 1 : 0));
                                    })
                                    .filter( seq =>{
                                        return seq['is_active'];
                                    }) 
                    : null;
            

        } catch (error) {
            return null;
        }
        
    }


    static async addCustomerMainPsid(user, webhookEvent, fbPageToken){
        let textMsg = "";
        let attachmentsPayload = [];
        let mid;
        let receivedType = "";
        let lastMessage = "";
        if(webhookEvent.message){
            textMsg = webhookEvent.message.text ? webhookEvent.message.text : "";
            attachmentsPayload = webhookEvent.message.attachments ? webhookEvent.message.attachments : [];
            mid = webhookEvent.message.mid
        } else if(webhookEvent.postback){
            textMsg = webhookEvent.postback.title ? webhookEvent.postback.title : "";
            mid = webhookEvent.postback.mid
        } else if(webhookEvent.referral) {
            textMsg = webhookEvent.referral.ref ? webhookEvent.referral.ref : "";
            receivedType = "referral";
        }
        
        let attachments = {};
        try {
            if(mid && mid !== "") {
                attachments = await this.getAttachmentsFromMessage(mid, fbPageToken);
            }
        } catch (error) {
            console.log(error);
        } finally{
            
            lastMessage = textMsg == "" ? `Received ${receivedType}` : textMsg;

            try {
                const customerRef = db.collection(`Tenant/Malaya/Customers`).doc(user.psid);
                customerRef.get().then((customerSnapshot)=>{
                    if(customerSnapshot.exists){
                        customerRef.update({
                            age_range: user.age,
                            gender: user.gender,
                            lastMessageDate: admin.firestore.Timestamp.fromDate(new Date()),
                            location: user.location,
                            updateDate: admin.firestore.Timestamp.fromDate(new Date()),
                        });
                    } else{
                        customerRef.set({
                            age_range: user.age,
                            customerName: `${user.firstName} ${user.lastName}`,
                            docId: user.psid,
                            gender: user.gender,
                            lastMessageDate: admin.firestore.Timestamp.fromDate(new Date()),
                            location: user.location,
                            updateDate: admin.firestore.Timestamp.fromDate(new Date()),
                        });
                    }
                })

                if(mid && mid !== "") {
                    const customerConvoRef = db.collection(`Tenant/Malaya/Customers/${user.psid}/Conversations`).doc(mid);
                    customerConvoRef.get().then((convoSnap)=>{
                        if(!convoSnap.exists){
                            customerConvoRef.set({
                                attachments: attachments,
                                date: admin.firestore.Timestamp.fromDate(new Date()),
                                docId: mid,
                                from: "user",
                                message: textMsg,
                            });
                        } 
                    })
                }

                if(user.subtopic !== "") {
                    let customerTopicRef = db.collection(`Tenant/Malaya/Topics`).where("psid", "==", user.psid).where("subtopic", "==", user.subtopic);
                    let customerDoc = await customerTopicRef.get();
                    if(customerDoc.empty) {
                        await db.collection(`Tenant/Malaya/Topics`).add({
                            firstName: user.firstName,
                            lastName: user.lastName,
                            psid: user.psid,
                            createDate: admin.firestore.Timestamp.fromDate(new Date()),
                            updateDate: admin.firestore.Timestamp.fromDate(new Date()),
                            topic: user.topic,
                            subtopic: user.subtopic
                        }).then(doc => {
                            doc.update({
                                docId: doc.id,
                            })
                        })
                    } else {
                        customerDoc.forEach(async doc => {
                          await db.collection(`Tenant/Malaya/Topics`).doc(doc.data().docId).update({
                            updateDate: admin.firestore.Timestamp.fromDate(new Date()),
                          })
                        })
                      }
                }
                
            } catch (error) {
                console.log(error);
                return "ok"
            }
        }

        return "ok";
    }

    static getAttachmentsFromMessage(messageId, accessToken){
        return new Promise(function(resolve, reject) {
          let body = [];
    
          // Send the HTTP request to the Graph API
          request({
            uri: `${config.mPlatfom}/${messageId}/attachments`,
            qs: {
              access_token: accessToken,
            },
            method: "GET"
          })
            .on("response", function(response) {
              if (response.statusCode !== 200) {
                reject(Error(response.statusCode));
              }
            })
            .on("data", function(chunk) {
              body.push(chunk);
            })
            .on("error", function(error) {
              console.error("Unable to fetch profile:" + error);
              reject(Error("Network Error"));
            })
            .on("end", () => {
              body = Buffer.concat(body).toString();
              resolve(JSON.parse(body));
            });
        });
    }
}