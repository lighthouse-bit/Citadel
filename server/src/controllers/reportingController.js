const prisma = require('../config/database');
const { recordAudit } = require('../utils/auditService');

const range = query => {
  const end = query.to ? new Date(`${query.to}T23:59:59.999Z`) : new Date();
  const start = query.from ? new Date(`${query.from}T00:00:00.000Z`) : new Date(end.getTime() - 29 * 86400000);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) throw new Error('Invalid date range');
  if (end - start > 366 * 86400000) throw new Error('Date range cannot exceed 366 days');
  return { start, end };
};
const day = date => date.toISOString().slice(0,10);
const commissionReceipts = (item,start,end) => {
  const receipts=[];
  if(item.depositPaidAt&&item.depositPaidAt>=start&&item.depositPaidAt<=end)receipts.push({date:item.depositPaidAt,amount:Number(item.depositAmount||0),stage:'Deposit'});
  if(item.balancePaidAt&&item.balancePaidAt>=start&&item.balancePaidAt<=end)receipts.push({date:item.balancePaidAt,amount:Number(item.balanceAmount||0),stage:'Balance'});
  return receipts;
};

const buildReport = async (start,end) => {
  const [orders,commissions,topItems,customers,promotions,refundOrders] = await Promise.all([
    prisma.order.findMany({where:{paymentStatus:'FULLY_PAID',status:{not:'CANCELLED'},createdAt:{gte:start,lte:end}},include:{customer:{select:{id:true,firstName:true,lastName:true,email:true}},items:true},orderBy:{createdAt:'desc'}}),
    prisma.commission.findMany({where:{paymentStatus:{in:['DEPOSIT_PAID','FULLY_PAID']},status:{not:'CANCELLED'},OR:[{depositPaidAt:{gte:start,lte:end}},{balancePaidAt:{gte:start,lte:end}}]},include:{customer:{select:{id:true,firstName:true,lastName:true,email:true}}},orderBy:{updatedAt:'desc'}}),
    prisma.orderItem.groupBy({by:['artworkId','title'],where:{order:{paymentStatus:'FULLY_PAID',status:{not:'CANCELLED'},createdAt:{gte:start,lte:end}}},_count:{artworkId:true},_sum:{price:true},orderBy:{_sum:{price:'desc'}},take:10}),
    prisma.customer.findMany({where:{orders:{some:{paymentStatus:'FULLY_PAID',status:{not:'CANCELLED'},createdAt:{gte:start,lte:end}}}},select:{id:true,firstName:true,lastName:true,email:true,orders:{where:{paymentStatus:'FULLY_PAID',status:{not:'CANCELLED'},createdAt:{gte:start,lte:end}},select:{total:true}}},take:1000}),
    prisma.promotion.findMany({where:{usageCount:{gt:0}},orderBy:{usageCount:'desc'},take:20}),
    prisma.order.findMany({where:{paymentStatus:'REFUNDED',updatedAt:{gte:start,lte:end}},select:{id:true,orderNumber:true,total:true,updatedAt:true}}),
  ]);
  const orderRevenue=orders.reduce((sum,item)=>sum+Number(item.total),0);
  const commissionRevenue=commissions.reduce((sum,item)=>sum+commissionReceipts(item,start,end).reduce((receiptSum,receipt)=>receiptSum+receipt.amount,0),0);
  const discounts=orders.reduce((sum,item)=>sum+Number(item.discountAmount||0),0);
  const refunds=refundOrders.reduce((sum,item)=>sum+Number(item.total),0);
  const grossRevenue=orderRevenue+commissionRevenue;
  const byDay={};
  orders.forEach(item=>{const key=day(item.createdAt);byDay[key]??={orders:0,commissions:0,total:0};byDay[key].orders+=Number(item.total);byDay[key].total+=Number(item.total);});
  commissions.forEach(item=>commissionReceipts(item,start,end).forEach(receipt=>{const key=day(receipt.date);byDay[key]??={orders:0,commissions:0,total:0};byDay[key].commissions+=receipt.amount;byDay[key].total+=receipt.amount;}));
  const outstandingCommissions=await prisma.commission.findMany({where:{status:{notIn:['CANCELLED','COMPLETED']},paymentStatus:{in:['UNPAID','DEPOSIT_PAID']},finalPrice:{not:null}},include:{customer:{select:{firstName:true,lastName:true,email:true}}},orderBy:{deadline:'asc'},take:100});
  const receivables=outstandingCommissions.map(item=>({...item,amountDue:item.paymentStatus==='UNPAID'?Number(item.depositAmount||0):Number(item.balanceAmount||0)}));
  const topCustomers=customers.map(item=>({id:item.id,name:`${item.firstName} ${item.lastName}`.trim(),email:item.email,revenue:item.orders.reduce((sum,o)=>sum+Number(o.total),0),orders:item.orders.length})).sort((a,b)=>b.revenue-a.revenue).slice(0,10);
  return {range:{from:day(start),to:day(end)},summary:{grossRevenue,netRevenue:grossRevenue-refunds,orderRevenue,commissionRevenue,discounts,refunds,paidOrders:orders.length,averageOrderValue:orders.length?orderRevenue/orders.length:0,outstanding:receivables.reduce((sum,item)=>sum+item.amountDue,0)},revenueByDay:Object.entries(byDay).map(([date,value])=>({date,...value})).sort((a,b)=>a.date.localeCompare(b.date)),topArtworks:topItems.map(item=>({id:item.artworkId,title:item.title,sales:item._count.artworkId,revenue:Number(item._sum.price||0)})),topCustomers,promotions:promotions.map(item=>({id:item.id,code:item.code,name:item.name,usageCount:item.usageCount,type:item.discountType,value:Number(item.value),active:item.isActive})),receivables:receivables.map(item=>({id:item.id,commissionNumber:item.commissionNumber,customer:`${item.customer.firstName} ${item.customer.lastName}`.trim(),email:item.customer.email,paymentStatus:item.paymentStatus,deadline:item.deadline,amountDue:item.amountDue})),orders,commissions,refundOrders};
};

exports.getFinancialReport=async(req,res)=>{try{const{start,end}=range(req.query);const report=await buildReport(start,end);const{orders,commissions,refundOrders,...safe}=report;res.json(safe);}catch(error){console.error(error);res.status(400).json({error:error.message||'Failed to build financial report'});}};
exports.exportFinancialReport=async(req,res)=>{
  try{
    const{start,end}=range(req.query);const report=await buildReport(start,end);
    const escape=value=>`"${String(value??'').replace(/"/g,'""')}"`;
    const commissionRows=report.commissions.flatMap(item=>commissionReceipts(item,start,end).map(receipt=>[`Commission ${receipt.stage}`,item.commissionNumber,`${item.customer.firstName} ${item.customer.lastName}`,item.customer.email,receipt.amount,0,receipt.amount,receipt.date.toISOString()]));
    const rows=[['Type','Reference','Customer','Email','Gross amount','Discount','Net amount','Payment date'],...report.orders.map(item=>['Order',item.orderNumber,`${item.customer.firstName} ${item.customer.lastName}`,item.customer.email,Number(item.total)+Number(item.discountAmount||0),item.discountAmount,item.total,item.createdAt.toISOString()]),...commissionRows,...report.refundOrders.map(item=>['Refund',item.orderNumber,'','',item.total,0,-Number(item.total),item.updatedAt.toISOString()])];
    await recordAudit(req,'EXPORT_FINANCIAL_REPORT','Report',null,{from:day(start),to:day(end),rows:rows.length-1});
    res.setHeader('Content-Type','text/csv; charset=utf-8');res.setHeader('Content-Disposition',`attachment; filename="financial-report-${day(start)}-${day(end)}.csv"`);res.send(rows.map(row=>row.map(escape).join(',')).join('\n'));
  }catch(error){res.status(400).json({error:error.message||'Failed to export report'});}
};
