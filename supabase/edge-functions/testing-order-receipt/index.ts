import { createClient } from "npm:@supabase/supabase-js@2";
const headers={"Access-Control-Allow-Origin":"https://screenings4u.com","Access-Control-Allow-Headers":"apikey,content-type,authorization,x-client-info","Access-Control-Allow-Methods":"POST,OPTIONS","Cache-Control":"no-store"};
const respond=(x:unknown,s=200)=>new Response(JSON.stringify(x),{status:s,headers:{...headers,"Content-Type":"application/json"}});
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
Deno.serve(async req=>{
 if(req.method==="OPTIONS")return new Response("",{headers});
 if(req.method!=="POST")return respond({error:"Method not allowed"},405);
 try{
  const b=await req.json();
  const id=String(b.order_id||""),tracking=String(b.tracking_number||""),pi=String(b.payment_intent||"");
  if(!uuid.test(id)||!/^TST-[0-9A-F]{8}$/.test(tracking)||!/^pi_[A-Za-z0-9]{12,}$/.test(pi))return respond({error:"Invalid order verification details"},400);
  const url=Deno.env.get("SUPABASE_URL")||"",key=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||"";
  if(!url||!key)throw Error("Receipt service not configured");
  const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
  const q=await db.from("orders").select("id,order_number,tracking_number,created_at,customer_first_name,customer_last_name,customer_email,subtotal,tax,total,discount_amount,currency,payment_status,stripe_payment_intent_id,source").eq("id",id).eq("tracking_number",tracking).eq("stripe_payment_intent_id",pi).eq("source","website").maybeSingle();
  if(q.error)throw q.error;
  if(!q.data)return respond({error:"Order not found or verification failed"},404);
  const items=await db.from("order_items").select("quantity,unit_price,service_id,metadata").eq("order_id",id);
  if(items.error)throw items.error;
  const list=(items.data||[]).map((i:any)=>({name:String(i.metadata?.service_name||"Testing service"),quantity:Number(i.quantity||1),unit_price:Number(i.unit_price||0)}));
  const o=q.data;
  return respond({order:{order_number:o.order_number,tracking_number:o.tracking_number,created_at:o.created_at,customer_first_name:o.customer_first_name,customer_last_name:o.customer_last_name,customer_email:o.customer_email,subtotal:o.subtotal,tax:o.tax,total:o.total,discount_amount:o.discount_amount,currency:o.currency,payment_status:o.payment_status},items:list});
 }catch(e){console.error("testing-order-receipt",e);return respond({error:"Unable to load order receipt"},500)}
});
