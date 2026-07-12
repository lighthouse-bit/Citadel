const crypto=require('crypto');
const signPaystackPayload=(payload,secret)=>crypto.createHmac('sha512',secret).update(payload).digest('hex');
const verifyPaystackSignature=(payload,signature,secret)=>{if(!payload||!signature||!secret)return false;const expected=signPaystackPayload(payload,secret);const a=Buffer.from(expected,'hex'),b=Buffer.from(signature,'hex');return a.length===b.length&&crypto.timingSafeEqual(a,b);};
module.exports={signPaystackPayload,verifyPaystackSignature};
