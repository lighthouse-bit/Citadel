const prisma=require('../config/database');
const recordOperationalEvent=(type,message,metadata=null,severity='ERROR')=>prisma.operationalEvent.create({data:{type,severity,message:String(message).slice(0,1000),metadata}}).catch(error=>console.error('Operational event logging failed:',error.message));
module.exports={recordOperationalEvent};
