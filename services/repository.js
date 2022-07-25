"use strict";
require("dotenv").config();

// The Firebase Admin SDK to access Cloud Firestore.
const admin = require('firebase-admin');

admin.initializeApp({
  credential: admin.credential.cert(
      JSON.parse(Buffer.from(process.env.FIREBASE_CONFIG, 'base64').toString('ascii'))
  ),
});

let db = admin.firestore();

module.exports = class Repository {
    static updateCustomerChatState(senderPsid, state){
        console.log("state passed to updateCustomerChatState", state);
        console.log("senderPsid passed to updateCustomerChatsenderState", senderPsid);
        try {
            const customerRef = db.collection("Customers").doc(senderPsid)
            customerRef.get().then((customerSnapshot)=>{
                if(customerSnapshot.exists){
                    customerRef.update({
                        "state": state,
                        "updateDate": admin.firestore.Timestamp.fromDate(new Date()),
                    });
                    console.log("Updated Customers document for", senderPsid);
                } else{
                    customerRef.set({
                        "state": state,
                        "updateDate": admin.firestore.Timestamp.fromDate(new Date()),
                    });
                    console.log("Added Customers document for", senderPsid);

                }
            })
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
}